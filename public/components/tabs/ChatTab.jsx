const { useState, useEffect, useRef } = React;
const { HeartIcon, SendIcon, ChatBubbleIcon, MicIcon } = window.AmilyIcons;

const getHistoryStorageKey = (userId) => `amily-chat-history-v1-${userId || 'anon'}`;
const getHighlightStorageKey = (userId) => `amily-chat-highlights-v1-${userId || 'anon'}`;

const HYDRATION_KEYWORDS = ['drink', 'drank', 'water', 'hydrate', 'hydrated', 'hydration', 'thirsty', 'tea', 'juice'];
const REMINDER_KEYWORDS = ['remind', 'reminder', 'remember to', 'should drink', 'need to drink'];
const SAFETY_EMERGENCY_PHRASES = [
    'i need help',
    'help me',
    'call for help',
    'get help',
    "i don't feel safe",
    'i feel unsafe',
    'not safe',
    'scared',
    'afraid',
    'i feel dizzy',
    'i feel weak',
    'i fell',
    'i fell down',
    'chest pain',
    'cant breathe',
    "can't breathe",
    'trouble breathing',
    'heart racing',
    'emergency',
    '911',
    'ambulance',
];
const SAFETY_CONCERN_PHRASES = [
    'not feeling well',
    'feeling tired',
    'feeling confused',
    'forgot to take',
    'missed my medication',
    'feel lonely',
    'feel sad',
];
const NUMBER_WORD_MAP = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
};
const QUANTITY_PATTERN = /(\d+(?:\.\d+)?)\s*(glass|glasses|cup|cups|bottle|bottles|drink|drinks|oz|ml|liter|litre|liters|litres)/;

const normalizeText = (text = '') => text.toLowerCase().replace(/\s+/g, ' ').trim();

const clampQuantity = (value) => Math.max(1, Math.min(4, Math.round(value || 1)));

const extractQuantityFromText = (normalizedText) => {
    const match = normalizedText.match(QUANTITY_PATTERN);
    if (match) {
        return clampQuantity(parseFloat(match[1]));
    }
    const numberWord = Object.keys(NUMBER_WORD_MAP).find((word) => normalizedText.includes(` ${word} `) || normalizedText.startsWith(`${word} `) || normalizedText.endsWith(` ${word}`) || normalizedText === word);
    if (numberWord) {
        return clampQuantity(NUMBER_WORD_MAP[numberWord]);
    }
    if (normalizedText.includes('couple')) {
        return 2;
    }
    return 1;
};

const detectHydrationIntent = (text) => {
    if (!text) return null;
    const normalized = normalizeText(text);
    if (!normalized) return null;

    const mentionsHydration = HYDRATION_KEYWORDS.some((keyword) => normalized.includes(keyword));
    if (!mentionsHydration) return null;

    const isReminderOnly = REMINDER_KEYWORDS.some((keyword) => normalized.includes(keyword));
    if (isReminderOnly && !normalized.includes('drank') && !normalized.includes('finished') && !normalized.includes('had ')) {
        return null;
    }

    return { quantity: extractQuantityFromText(normalized) };
};

const logHydrationFromChat = (quantity = 1) => {
    if (typeof window === 'undefined' || !quantity) return;
    const wellnessStore = window.AmilyWellness;
    if (wellnessStore && typeof wellnessStore.adjustHydration === 'function') {
        wellnessStore.adjustHydration(quantity);
    }
};

const detectLocalSafetyConcerns = (text = '') => {
    const lowerText = text.toLowerCase();
    const emergencyMatches = SAFETY_EMERGENCY_PHRASES.filter((phrase) => lowerText.includes(phrase));
    if (emergencyMatches.length > 0) {
        return { level: 'emergency', detected: emergencyMatches };
    }
    const concernMatches = SAFETY_CONCERN_PHRASES.filter((phrase) => lowerText.includes(phrase));
    if (concernMatches.length > 0) {
        return { level: 'concern', detected: concernMatches };
    }
    return { level: 'normal', detected: [] };
};

const broadcastSafetySignal = (payload) => {
    if (typeof window === 'undefined' || !payload) return;
    window.dispatchEvent(
        new CustomEvent('amily:safety:signal', {
            detail: payload,
        })
    );
};

function ChatTab({ userId = 'voice-user', authToken = null }) {
    const [messages, setMessages] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [textInput, setTextInput] = useState('');
    const [pipelineStage, setPipelineStage] = useState('idle');
    const [lastResponseMeta, setLastResponseMeta] = useState(null);
    const [highlights, setHighlights] = useState([]);
    const recognitionRef = useRef(null);
    const notifyEmergencyServices = async (alertDetails, transcript) => {
        try {
            await fetch('/api/safety/emergency', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify({
                    userId: userId || 'voice-user',
                    type: 'voice_keywords',
                    level: alertDetails?.level || 'emergency',
                    detected: alertDetails?.detected || [],
                    transcript,
                    location: null,
                }),
            });
        } catch (serviceError) {
            console.warn('Unable to reach emergency service endpoint', serviceError);
        }
    };
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Voice input is not available in this browser. Please use Chrome on desktop.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
            setPipelineStage('listening');
        };
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event);
            setIsListening(false);
            setPipelineStage('idle');
            setError('I had trouble hearing you. Please try again.');
        };
        recognition.onend = () => {
            setIsListening(false);
            setPipelineStage((stage) => (stage === 'listening' ? 'idle' : stage));
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            handleSend(transcript);
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.abort();
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const historyKey = getHistoryStorageKey(userId);
            const storedMessages = window.localStorage.getItem(historyKey);
            if (storedMessages) {
                const parsedMessages = JSON.parse(storedMessages);
                if (Array.isArray(parsedMessages) && parsedMessages.length) {
                    setMessages(parsedMessages);
                } else {
                    setMessages([]);
                }
            } else {
                setMessages([]);
            }

            const highlightKey = getHighlightStorageKey(userId);
            const storedHighlights = window.localStorage.getItem(highlightKey);
            if (storedHighlights) {
                const parsedHighlights = JSON.parse(storedHighlights);
                if (Array.isArray(parsedHighlights) && parsedHighlights.length) {
                    setHighlights(parsedHighlights);
                } else {
                    setHighlights([]);
                }
            } else {
                setHighlights([]);
            }
        } catch (storageError) {
            console.warn('Unable to hydrate chat history', storageError);
            setMessages([]);
            setHighlights([]);
        }
    }, [userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const historyKey = getHistoryStorageKey(userId);
            if (messages.length) {
                window.localStorage.setItem(historyKey, JSON.stringify(messages.slice(-200)));
            } else {
                window.localStorage.removeItem(historyKey);
            }
        } catch (persistError) {
            console.warn('Unable to persist chat history', persistError);
        }
    }, [messages, userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const highlightKey = getHighlightStorageKey(userId);
            if (highlights.length) {
                window.localStorage.setItem(highlightKey, JSON.stringify(highlights.slice(0, 20)));
            } else {
                window.localStorage.removeItem(highlightKey);
            }
        } catch (persistError) {
            console.warn('Unable to persist chat highlights', persistError);
        }
    }, [highlights, userId]);

    const addHighlight = (userText, aiText) => {
        if (!userText || !aiText) return;
        const entry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            userText: userText.slice(0, 160),
            aiText: aiText.slice(0, 180),
        };
        setHighlights((prev) => [entry, ...prev].slice(0, 12));
    };

    const handleSend = async (rawText) => {
        const text = rawText?.trim();
        if (!text) return;

        const hydrationIntent = detectHydrationIntent(text);
        if (hydrationIntent) {
            logHydrationFromChat(hydrationIntent.quantity);
        }
        const safetyAlert = detectLocalSafetyConcerns(text);
        if (safetyAlert.level !== 'normal') {
            const signalPayload = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                level: safetyAlert.level,
                detected: safetyAlert.detected,
                text,
                source: 'user',
                timestamp: new Date().toISOString(),
                notified: false,
            };
            if (safetyAlert.level === 'emergency') {
                signalPayload.notified = true;
                notifyEmergencyServices(safetyAlert, text);
            }
            broadcastSafetySignal(signalPayload);
        }

        let pendingMessagesSnapshot = [];
        setMessages((prev) => {
            pendingMessagesSnapshot = [...prev, { type: 'user', text }];
            return pendingMessagesSnapshot;
        });
        setIsLoading(true);
        setError(null);
        setPipelineStage('thinking');
        setLastResponseMeta(null);

        try {
            const res = await fetch('/api/chatbox', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify({
                    userId: userId || 'voice-user',
                    input: text,
                    history: (pendingMessagesSnapshot.length ? pendingMessagesSnapshot : [...messages, { type: 'user', text }]).slice(-50),
                }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || 'Something went wrong while talking to Amily.');
                setPipelineStage('idle');
            } else {
                const aiText = data.ttsText || data.data?.response || 'I am here with you.';
                setMessages((prev) => [
                    ...prev,
                    {
                        type: 'amily',
                        text: aiText,
                        emotion: data.data?.emotion,
                        meta: {
                            reasoningModel: data.data?.reasoningModel || 'Gemini 1.5 Pro',
                            voiceModel: data.data?.voiceModel || 'ElevenLabs',
                        },
                    },
                ]);

                addHighlight(text, aiText);

                setLastResponseMeta({
                    firstTurn: data.data?.firstTurn,
                    reasoningModel: data.data?.reasoningModel,
                    voiceModel: data.data?.voiceModel,
                });

                if (data.audioUrl) {
                    try {
                        setPipelineStage('speaking');
                        const audio = new Audio(data.audioUrl);
                        audio.onended = () => setPipelineStage('idle');
                        audio.onerror = () => setPipelineStage('idle');
                        audio.play().catch((err) => {
                            console.warn('Could not play audio:', err);
                            setPipelineStage('idle');
                        });
                    } catch (err) {
                        console.warn('Audio element error:', err);
                        setPipelineStage('idle');
                    }
                } else {
                    setPipelineStage('idle');
                }
            }
        } catch (err) {
            console.error('ChatBox request error:', err);
            setError('Network error while talking to Amily.');
            setPipelineStage('idle');
        } finally {
            setIsLoading(false);
            setPipelineStage((stage) => (stage === 'speaking' ? stage : 'idle'));
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!textInput.trim()) return;
        handleSend(textInput);
        setTextInput('');
    };

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.warn('Unable to start recognition', error);
            }
        }
    };

    const statusCards = [
        {
            id: 'listening',
            title: 'Listening',
            subtitle: 'Waiting to hear you',
            active: pipelineStage === 'listening',
        },
        {
            id: 'thinking',
            title: 'Thinking',
            subtitle: 'Gemini 1.5 Pro',
            active: pipelineStage === 'thinking',
        },
        {
            id: 'speaking',
            title: 'Speaking',
            subtitle: 'ElevenLabs voice',
            active: pipelineStage === 'speaking',
        },
    ];

    const rippleLayers = [0, 1, 2];

    return (
        <section className="relative px-4 py-16 pb-36">
            <style>
                {`
                    @keyframes pulseRing {
                        0% {
                            transform: translate(-50%, -50%) scale(0.65);
                            opacity: 0.45;
                        }
                        70% {
                            opacity: 0.15;
                        }
                        100% {
                            transform: translate(-50%, -50%) scale(1.4);
                            opacity: 0;
                        }
                    }

                    @keyframes micGlow {
                        0% {
                            box-shadow: 0 25px 60px rgba(219, 119, 88, 0.35);
                        }
                        50% {
                            box-shadow: 0 35px 90px rgba(219, 119, 88, 0.55);
                        }
                        100% {
                            box-shadow: 0 25px 60px rgba(219, 119, 88, 0.35);
                        }
                    }

                    @keyframes gradientFloat {
                        0% {
                            transform: scale(1) translateY(0);
                        }
                        50% {
                            transform: scale(1.08) translateY(-10px);
                        }
                        100% {
                            transform: scale(1) translateY(0);
                        }
                    }
                    @keyframes listeningWave {
                        0% {
                            transform: translate(-50%, -50%) scale(0.9);
                            border-radius: 46% 54% 52% 48% / 48% 45% 55% 52%;
                            opacity: 0.9;
                        }
                        50% {
                            transform: translate(-50%, -50%) scale(1.05);
                            border-radius: 56% 44% 46% 54% / 52% 58% 42% 48%;
                            opacity: 0.55;
                        }
                        100% {
                            transform: translate(-50%, -50%) scale(0.9);
                            border-radius: 46% 54% 52% 48% / 48% 45% 55% 52%;
                            opacity: 0.9;
                        }
                    }
                `}
            </style>
            <div className="mx-auto max-w-5xl space-y-10">

                <div className="relative overflow-hidden rounded-[48px] border border-white/70 bg-white/85 px-6 py-14 shadow-[0_25px_80px_rgba(15,23,42,0.1)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#fef5ff] via-[#fbe8f2] to-[#ffe9db] opacity-80" aria-hidden="true" />
                    <div className="absolute -inset-x-24 -bottom-20 h-72 bg-gradient-to-r from-[#d7c0ff]/70 via-transparent to-[#ffd7d0]/70 blur-3xl opacity-70" aria-hidden="true" />
                    <div className="relative flex flex-col items-center gap-10 text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#8f63d8] shadow-sm">
                            <ChatBubbleIcon />
                            AMILY CHAT
                        </div>
                        <h3 className="text-2xl font-semibold text-[#1f2330]">Hold the glowing mic to check in with Amily</h3>
                        <div className="relative flex items-center justify-center w-full">
                            <div className="relative flex items-center justify-center w-[260px] h-[260px] md:w-[320px] md:h-[320px]">
                                <div
                                    className="absolute inset-2 rounded-full bg-gradient-to-br from-[#ffe6ff] via-[#ffd3e8] to-[#f6b7a0] blur-3xl opacity-90 animate-[gradientFloat_6s_ease-in-out_infinite]"
                                    aria-hidden="true"
                                />
                                {isListening &&
                                    rippleLayers.map((layer) => (
                                        <span
                                            key={layer}
                                            className="pointer-events-none absolute rounded-full bg-gradient-to-br from-[#ffe2f3] via-[#f7b7a0] to-[#b46cd8]"
                                            style={{
                                                width: `${220 + layer * 90}px`,
                                                height: `${220 + layer * 90}px`,
                                                opacity: 0.45 - layer * 0.12,
                                                top: '50%',
                                                left: '50%',
                                                animation: `pulseRing 2.8s ease-out ${layer * 0.45}s infinite`,
                                                transformOrigin: 'center',
                                            }}
                                        />
                                    ))}
                                <button
                                    type="button"
                                    onClick={startListening}
                                    disabled={isListening || isLoading}
                                    aria-label={isListening ? 'Listening...' : 'Start speaking'}
                                    className={`relative z-10 flex flex-col items-center justify-center rounded-full border-[6px] border-white bg-[#1f2330] text-white shadow-[0_25px_70px_rgba(15,23,42,0.35)] transition-transform duration-300 h-40 w-40 md:h-48 md:w-48 ${
                                        isListening ? 'scale-105 animate-[micGlow_1.8s_ease-in-out_infinite]' : 'hover:scale-105'
                                    } ${isListening || isLoading ? 'opacity-90 cursor-not-allowed' : ''}`}
                                >
                                    {isListening ? (
                                        <>
                                            <span
                                                className="absolute inset-4 rounded-full bg-gradient-to-br from-[#ffe7db] via-[#ffb99b] to-[#db7758] opacity-80 blur-2xl"
                                                aria-hidden="true"
                                            />
                                            <span
                                                className="pointer-events-none absolute left-1/2 top-1/2 w-32 h-32 md:w-36 md:h-36 bg-gradient-to-br from-[#fff3ec] via-[#ffc7af] to-[#f18d6a]"
                                                style={{
                                                    animation: 'listeningWave 2.4s ease-in-out infinite',
                                                }}
                                                aria-hidden="true"
                                            />
                                            <span className="relative text-xs font-semibold uppercase tracking-[0.35em]">
                                                Listening
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <MicIcon className="text-[2.9rem]" />
                                            <span className="text-[10px] uppercase tracking-[0.4em] font-semibold opacity-80">Speak</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-[#5f6675]">
                            {isListening
                                ? 'The animated ring means Amily hears you right now.'
                                : 'Tap the circle whenever it feels easier to speak than to type.'}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                            {statusCards.map((card) => (
                                <div
                                    key={card.id}
                                    className={`px-5 py-4 rounded-full border text-xs font-semibold uppercase tracking-[0.3em] transition ${
                                        card.active ? 'bg-[#db7758] text-white border-[#db7758] shadow-md' : 'bg-white/80 text-[#545454] border-[#f4d3b4]'
                                    }`}
                                >
                                    <div>{card.title}</div>
                                    <div className="text-[10px] tracking-[0.2em] mt-1">{card.active ? card.subtitle : 'Standing by'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] space-y-4">
                        <div className="flex items-center justify-between text-sm text-[#5f6675]">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f63d8]">Conversation timeline</p>
                            <span>{messages.length ? `${messages.length} exchanges today` : 'Awaiting first hello'}</span>
                        </div>
                        <div className="h-[26rem] rounded-3xl border border-white/70 bg-white/90 p-4 overflow-y-auto space-y-4">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-sm text-[#6b6b6b]">
                                    <HeartIcon className="w-10 h-10 text-[#db7758]" />
                                    <p className="mt-3">The log will appear here after your first chat bubble.</p>
                                    <p className="text-xs mt-1 opacity-70">Try tapping the glowing mic above.</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-sm rounded-3xl px-4 py-3 text-sm shadow-sm ${
                                                msg.type === 'user' ? 'bg-white border border-[#f4d3b4]' : 'bg-[#db7758] text-white'
                                            }`}
                                        >
                                            <div className="font-semibold text-xs mb-1 opacity-75">{msg.type === 'user' ? 'You' : 'Amily'}</div>
                                            <div className="leading-relaxed">{msg.text}</div>
                                            {msg.meta && (
                                                <div className="text-[10px] mt-1 opacity-80">
                                                    Reasoning: {msg.meta.reasoningModel} | Voice: {msg.meta.voiceModel}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] space-y-5">
                        <div className="rounded-3xl border border-[#e6d3ff] bg-[#f7f2ff] p-4 text-sm text-[#5f6675]">
                            <p>Prefer typing instead? Jot a gentle note and Amily responds with the same warm tone.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[#db7758]">Type a note</label>
                            <div className="flex flex-col gap-3">
                                <input
                                    type="text"
                                    value={textInput}
                                    onChange={(event) => setTextInput(event.target.value)}
                                    placeholder="For example: I feel a bit lonely tonight..."
                                    className="w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-base text-[#1f2330] placeholder:text-[#9b9fb2] focus:outline-none focus:ring-2 focus:ring-[#1f2330]"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1f2330] px-6 py-3 text-sm font-semibold text-white shadow disabled:opacity-60"
                                >
                                    <SendIcon />
                                    Send
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-[#5f6675]">
                                <button
                                    type="button"
                                    onClick={startListening}
                                    disabled={isListening || isLoading}
                                    className={`rounded-2xl border border-[#f4d3b4] px-5 py-3 font-semibold text-[#c05f46] ${
                                        isListening ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#fff4ef]'
                                    }`}
                                >
                                    {isListening ? 'Listening...' : 'Use microphone'}
                                </button>
                                {isLoading && <span>Amily is thinking about your words...</span>}
                            </div>
                        </form>

                        {error && (
                            <div className="rounded-2xl bg-[#ffe3dd] border border-[#f1bfb2] px-4 py-3 text-sm text-[#a6523b]">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                    <div className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#db7758]">Past conversations</p>
                            <p className="text-sm text-[#6b6b6b]">Amily keeps a short memory on this device so the calm tone carries from one visit to the next.</p>
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#db7758]/70">Stored locally</span>
                    </div>
                    {highlights.length ? (
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                            {highlights.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="rounded-2xl border border-[#f6dcca] bg-[#fffdf8] p-4 text-left shadow-sm space-y-2"
                                >
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#db7758]">{entry.timestamp}</div>
                                    <p className="text-sm text-[#545454]">
                                        <span className="font-semibold text-[#db7758]">You</span> — {entry.userText}
                                    </p>
                                    <p className="text-sm text-[#6b6b6b]">
                                        <span className="font-semibold text-[#db7758]">Amily</span> — {entry.aiText}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-[#f4d3b4] bg-[#fffaf0] p-4 text-sm text-[#6b6b6b]">
                            Once you share a few notes, we will keep gentle highlights here so Amily remembers the next time you open the app.
                        </div>
                    )}
                </div>

                {lastResponseMeta && (
                    <div className="rounded-[32px] border border-[#f4d3b4] bg-[#fff6ea] p-4 text-sm text-[#6b6b6b] shadow-sm">
                        <p>
                            Reasoning model: {lastResponseMeta.reasoningModel || 'Gemini 1.5 Pro'} - Voice model:{' '}
                            {lastResponseMeta.voiceModel || 'ElevenLabs'}
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}

window.AmilyTabs = window.AmilyTabs || {};
window.AmilyTabs.ChatTab = ChatTab;
