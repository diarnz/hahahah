const { useState, useEffect, useCallback } = React;
const { ShieldIcon, PhoneIcon } = window.AmilyIcons;

function SafetyTab({ userId = 'demo-user', authToken = null }) {
    const [lastAction, setLastAction] = useState(null);
    const [signals, setSignals] = useState([]);
    const [careAlarm, setCareAlarm] = useState(null);
    const contacts = [
        {
            label: 'Emergency services',
            subtitle: 'Call local emergency number immediately.',
            color: 'from-[#ff9380] to-[#f46a56]',
            type: 'emergency',
        },
        {
            label: 'Family contact',
            subtitle: 'Call Dana (daughter)',
            color: 'from-[#f8c06e] to-[#f49f52]',
            type: 'family',
        },
        {
            label: 'Personal doctor',
            subtitle: 'Dr. Patel - (555) 011-200',
            color: 'from-[#8ad6b3] to-[#5bb187]',
            type: 'doctor',
        },
        {
            label: 'Neighbor buddy',
            subtitle: 'Elli next door - (555) 010-447',
            color: 'from-[#90b7f6] to-[#5b8fd8]',
            type: 'neighbor',
        },
    ];

    const sendEmergencyRequest = useCallback(
        async (payload = {}) => {
            try {
                await fetch('/api/safety/emergency', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                    },
                    body: JSON.stringify({
                        userId: userId || 'demo-user',
                        type: payload.type || 'voice_keywords',
                        level: payload.level || 'emergency',
                        detected: payload.detected || [],
                        transcript: payload.text,
                        source: payload.source || 'chat',
                        location: payload.location ?? { lat: 40.7128, lng: -74.006 },
                    }),
                });
            } catch (error) {
                console.warn('Safety notification failed', error);
            }
        },
        [authToken, userId]
    );

    useEffect(() => {
        const handleSignal = (event) => {
            const detail = event.detail || {};
            const timeLabel = detail.timestamp
                ? new Date(detail.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const signalEntry = {
                id: detail.id || `${Date.now()}`,
                level: detail.level || 'concern',
                detected: detail.detected || [],
                text: detail.text || 'Safety concern detected via chat',
                source: detail.source || 'chat',
                time: timeLabel,
            };
            setSignals((prev) => [signalEntry, ...prev].slice(0, 5));

            const severity = signalEntry.level;
            const isEmergency = severity === 'emergency';
            const requiresAlarm = severity && severity !== 'normal';

            if (isEmergency) {
                setLastAction({ type: 'voice emergency', time: timeLabel });
                if (!detail.notified) {
                    sendEmergencyRequest(detail);
                }
            }

            if (requiresAlarm) {
                const status =
                    detail.notified && isEmergency
                        ? 'Care circle alerted'
                        : isEmergency
                        ? 'Alerting care circle'
                        : 'Watching with care circle';

                setCareAlarm({
                    id: signalEntry.id,
                    status,
                    text: signalEntry.text,
                    detected: signalEntry.detected,
                    time: timeLabel,
                    source: signalEntry.source,
                    level: severity,
                });
            }
        };
        window.addEventListener('amily:safety:signal', handleSignal);
        return () => window.removeEventListener('amily:safety:signal', handleSignal);
    }, [sendEmergencyRequest]);

    const handlePress = async (type) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastAction({ type, time });

        sendEmergencyRequest({ type });
        setCareAlarm({
            id: `${Date.now()}`,
            status: 'Care circle alerted',
            text: `Manual ${type} alert sent from Safety tab`,
            detected: [],
            time,
            source: 'safety-tab',
            level: 'emergency',
        });
    };

    const dismissAlarm = () => setCareAlarm(null);

    return (
        <section className="relative px-4 py-16">
            <div className="mx-auto max-w-5xl space-y-10">
                <div className="rounded-[40px] border border-white/70 bg-white/85 p-8 shadow-[0_25px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                    <div className="flex flex-col gap-4 text-center">
                        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#f8d7cc] bg-[#fff4ef] px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#c05f46]">
                            <ShieldIcon />
                            Quick safety board
                        </div>
                        <h2 className="text-3xl font-semibold text-[#1f2330]">Help stays one tap away</h2>
                        <p className="text-sm text-[#5f6675]">
                            Emergency tiles mirror the mobile tab order so elders never have to re-learn where to press. Each alert quietly pings the care circle.
                        </p>
                    </div>
                </div>

                {careAlarm && (
                    <div className="rounded-[40px] border border-[#ffdacd] bg-gradient-to-br from-[#ffe4da] via-[#ffcfc7] to-[#ffb6a6] p-8 text-[#6b2414] shadow-[0_30px_90px_rgba(244,162,139,0.45)]">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.35em]">Care circle alarm</p>
                                <h3 className="mt-2 text-2xl font-semibold">Help is being notified right now</h3>
                                <p className="text-sm text-[#6b2414]/80">Stay nearby and keep your phone close. We already let your circle know.</p>
                            </div>
                            <span className="inline-flex rounded-full border border-white/60 bg-white/40 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.35em]">
                                {careAlarm.status}
                            </span>
                        </div>
                        <div className="mt-6 rounded-[28px] border border-white/70 bg-white/80 p-4 text-sm text-[#6b2414]">
                            <p className="font-semibold">{careAlarm.text}</p>
                            {careAlarm.detected?.length > 0 && <p className="text-xs">Keywords: {careAlarm.detected.join(', ')}</p>}
                            <p className="text-xs text-[#6b2414]/70">
                                Source: {careAlarm.source === 'safety-tab' ? 'Safety page' : 'Voice chat'} · {careAlarm.time}
                            </p>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => sendEmergencyRequest({ type: 'care-circle-follow-up' })}
                                className="rounded-2xl bg-[#6b2414] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#6b2414]/40 hover:-translate-y-0.5"
                            >
                                Send another alert
                            </button>
                            <button
                                type="button"
                                onClick={dismissAlarm}
                                className="rounded-2xl border border-white/70 px-5 py-3 text-sm font-semibold text-white/80 hover:text-white"
                            >
                                I am safe now
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[1.05fr_minmax(0,0.9fr)]">
                    <div className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            {contacts.map((contact) => (
                                <button
                                    key={contact.type}
                                    type="button"
                                    onClick={() => handlePress(contact.type)}
                                    className={`rounded-[32px] border border-white/50 bg-gradient-to-br ${contact.color} p-6 text-left text-white shadow-[0_25px_60px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5`}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-xl font-semibold">{contact.label}</p>
                                        <span className="rounded-2xl bg-white/25 p-2">
                                            <PhoneIcon />
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm text-white/80">{contact.subtitle}</p>
                                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.35em]">Tap to start call</p>
                                </button>
                            ))}
                        </div>
                        <div className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[#1f2330]">Last safety action</h3>
                                {lastAction && <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[#c05f46]">{lastAction.time}</span>}
                            </div>
                            {lastAction ? (
                                <div className="mt-4 rounded-2xl border border-[#ffe2d2] bg-[#fff5ef] p-4 text-sm text-[#5f6675]">
                                    Sent <span className="font-semibold text-[#1f2330]">{lastAction.type}</span> contact to the care circle.
                                </div>
                            ) : (
                                <p className="mt-4 text-sm text-[#5f6675]">No calls yet today. These tiles stay oversized for shaky hands or tired eyes.</p>
                            )}
                            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[#5f6675]">
                                <li>Emergency opens your native phone dialer immediately.</li>
                                <li>Family, doctor, and neighbor tiles attach a timestamped note.</li>
                                <li>Care circle receives a quiet email + webhook ping.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#c05f46]">Voice safety signal</p>
                                    <h3 className="text-xl font-semibold text-[#1f2330]">Amily heard a concern</h3>
                                </div>
                                {signals.length > 0 && (
                                    <span
                                        className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] ${
                                            signals[0].level === 'emergency'
                                                ? 'bg-[#ffe0da] text-[#b93823]'
                                                : 'bg-[#fff2d9] text-[#a46132]'
                                        }`}
                                    >
                                        {signals[0].level === 'emergency' ? 'Emergency keywords' : 'Concern keywords'}
                                    </span>
                                )}
                            </div>
                            {signals.length > 0 ? (
                                <div className="mt-4 space-y-3 rounded-2xl border border-[#ffe2d2] bg-[#fff9f4] p-4 text-sm text-[#5f6675]">
                                    <p className="text-[#1f2330]">"{signals[0].text}"</p>
                                    {signals[0].detected?.length > 0 && (
                                        <p className="text-xs text-[#a06149]">Detected phrases: {signals[0].detected.join(', ')}</p>
                                    )}
                                    <p className="text-xs text-[#5f6675]">
                                        Source: {signals[0].source === 'user' ? 'Microphone' : 'System'} · {signals[0].time}
                                    </p>
                                </div>
                            ) : (
                                <p className="mt-4 text-sm text-[#5f6675]">No concern phrases yet today.</p>
                            )}
                            {signals.length > 1 && (
                                <div className="mt-3 space-y-1 text-xs text-[#5f6675]">
                                    {signals.slice(1, 4).map((entry) => (
                                        <p key={entry.id}>
                                            {entry.level === 'emergency' ? '⚠️' : 'ℹ️'} {entry.time}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="rounded-[32px] border border-dashed border-[#f4d3b4] bg-[#fff9f3] p-6 text-sm text-[#5f6675]">
                            Safety stays mirrored inside the bottom tab bar. If elders minimize the app, the tile order persists so muscle memory never resets.
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

window.AmilyTabs = window.AmilyTabs || {};
window.AmilyTabs.SafetyTab = SafetyTab;
