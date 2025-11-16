import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { 
  PlanJSONSchema, 
  MemoryJSONSchema, 
  SummaryJSONSchema,
  type PlanJSON,
  type MemoryJSON,
  type SummaryJSON,
} from './schemas';
import {
  generateCheckInMessage,
  generateMemoryPrompt,
  generateSocialEncouragement,
  formatForTTS,
  detectEmotion,
  generateEmpatheticResponse,
} from './persona';
import {
  generateTTS,
  generateMemoryImage,
  saveToSupabase,
  triggerN8NWorkflow,
  getUserPreferences,
  signUpUser,
  signInUser,
  getChatHistory,
  generateChatReply,
  getBuddyProfiles,
  getMemories,
  getUserProfile,
  GEMINI_CHAT_MODEL,
  ELEVENLABS_TTS_MODEL,
  resolveUserIdFromToken,
  CARE_CIRCLE_EMAIL,
} from './services';
import {
  detectSafetyConcerns,
  analyzeVitals,
  handleEmergency,
  getEmergencyReassurance,
  getSafetyCheckInQuestions,
  type VitalsData,
} from './safety';
import {
  getWellnessNudges,
  getMedicationReminder,
  getHydrationNudge,
  getActivityGuidance,
  type MedicationSchedule,
  type HydrationGoal,
  type WeatherData,
} from './wellness';

// Lightweight in-memory chat "memory" per user for the ChatBox
type ChatMemory = {
  lastEmotion?: 'stressed' | 'confused' | 'lonely' | 'calm';
  reminderAsked?: boolean;
  avoidTopics?: Set<string>;
};

const chatMemory = new Map<string, ChatMemory>();

const DISCOMFORT_PATTERNS: { regex: RegExp; capture?: 'before' | 'after' }[] = [
  {
    regex: /(.*?)\b(?:makes|make)s?\s+me\s+(?:uneasy|uncomfortable|nervous|anxious|upset|sad|scared)\b/gi,
    capture: 'before',
  },
  {
    regex: /\b(?:please\s+)?(?:don't|do not)\s+(?:talk|speak|go)\s+about\s+([^.!?]+)/gi,
    capture: 'after',
  },
  {
    regex: /\b(?:don't|do not)\s+mention\s+([^.!?]+)/gi,
    capture: 'after',
  },
  {
    regex: /\bi\s+don't\s+like\s+talking\s+about\s+([^.!?]+)/gi,
    capture: 'after',
  },
  {
    regex: /\b(?:avoid|stop)\s+talking\s+about\s+([^.!?]+)/gi,
    capture: 'after',
  },
];

const normalizeTopic = (raw?: string | null) => {
  if (!raw) return null;
  return raw
    .replace(/(?:about|on|of)\s+$/i, '')
    .replace(/[^a-z0-9\s'-]/gi, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 80) || null;
};

const extractDiscomfortTopics = (text: string): string[] => {
  if (!text) return [];
  const topics = new Set<string>();
  for (const pattern of DISCOMFORT_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.regex);
    while ((match = regex.exec(text)) !== null) {
      const captured =
        pattern.capture === 'before'
          ? match[1]
          : pattern.capture === 'after'
          ? match[1]
          : match[1] || match[0];
      const normalized = normalizeTopic(captured);
      if (normalized && normalized.length > 2) {
        topics.add(normalized);
      }
    }
  }
  return Array.from(topics).slice(0, 5);
};

const app = express();

const getAuthTokenFromRequest = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (Array.isArray(header)) {
    const first = header[0];
    if (!first) return null;
    return first.startsWith('Bearer ') ? first.slice(7).trim() : first.trim();
  }
  if (typeof header !== 'string') return null;
  const trimmed = header.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase().startsWith('bearer ') ? trimmed.slice(7).trim() : trimmed;
};

const resolveRequestUserId = (req: Request, fallback?: string | null) => {
  return resolveUserIdFromToken(getAuthTokenFromRequest(req)) || fallback || null;
};

const WEEKLY_REPORT_LOOKBACK_DAYS = 7;

const withinLastDays = (timestamp: string | null | undefined, days: number) => {
  if (!timestamp) return false;
  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return value.getTime() >= cutoff;
};

const formatDuration = (count: number, label: string) =>
  count === 1 ? `1 ${label}` : `${count} ${label}s`;

const buildWeeklyReport = (params: {
  userName: string;
  chats: any[];
  memories: any[];
}) => {
  const { userName, chats, memories } = params;
  const windowChats = chats.filter((chat) => withinLastDays(chat.timestamp, WEEKLY_REPORT_LOOKBACK_DAYS));
  const userMessages = windowChats.filter((chat) => chat.role === 'user');
  const amilyMessages = windowChats.filter((chat) => chat.role !== 'user');
  const lastThreeShares = userMessages
    .slice(-3)
    .map((msg) => `• "${msg.text?.slice(0, 160) ?? ''}"`)
    .join('\n') || '• No new notes shared this week.';

  const windowMemories = memories.filter((memory) => withinLastDays(memory.timestamp, WEEKLY_REPORT_LOOKBACK_DAYS));
  const memoryHighlights =
    windowMemories.length > 0
      ? windowMemories.slice(-3).map((memory) => `• ${memory.title} (${memory.era})`).join('\n')
      : '• No new memories were saved this week.';

  const summaryLines = [
    `${userName} had ${formatDuration(userMessages.length, 'chat message')} with Amily this week.`,
    `${formatDuration(amilyMessages.length, 'response')} sent back with calm encouragement.`,
    `${windowMemories.length > 0 ? `${userName} added ${formatDuration(windowMemories.length, 'new memory')}.` : 'No new memories were recorded.'}`,
  ];

  return [
    `Weekly Care Report for ${userName}`,
    '',
    summaryLines.join(' '),
    '',
    'Recent things they shared:',
    lastThreeShares,
    '',
    'Memory highlights:',
    memoryHighlights,
    '',
    'This report is automatically generated from Amily chats and saved memories.',
  ].join('\n');
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Request logging
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

/**
 * POST /api/checkin
 * Daily check-in with mood assessment and plan generation
 */
app.post('/api/checkin', async (req: Request, res: Response) => {
  try {
    const { userId, userInput, mood } = req.body;
    
    // Detect emotion if user provided input
    const detectedEmotion = userInput ? detectEmotion(userInput) : 'calm';
    
    // Map emotion to mood for plan
    const planMood: 'low' | 'ok' | 'good' = 
      detectedEmotion === 'stressed' || detectedEmotion === 'lonely' ? 'low' :
      detectedEmotion === 'confused' ? 'ok' : 'good';
    
    // Generate simple plan based on emotion (no AI model)
    const validatedPlan: PlanJSON = {
      summary: "Let's take the day slowly… a little movement, some rest, and maybe a chat.",
      next_step: "How about a short walk after breakfast?",
      mood: planMood,
      tags: ['routine', 'mobility'],
    };
    
    // Generate warm TTS text
    const checkInMsg = generateCheckInMessage(validatedPlan.mood);
    const ttsText = `${checkInMsg} ${validatedPlan.summary}`;
    
    // Generate audio URL using ElevenLabs
    const audioUrl = await generateTTS(ttsText);
    
    // Save to database
    await saveToSupabase('check_ins', {
      user_id: userId,
      plan: validatedPlan,
      timestamp: new Date().toISOString(),
    });
    
    // Notify care circle if mood is low
    if (validatedPlan.mood === 'low') {
      await triggerN8NWorkflow('mood_alert', {
        userId,
        mood: 'low',
        timestamp: new Date().toISOString(),
      });
    }
    
    res.json({
      success: true,
      data: validatedPlan,
      ttsText,
      audioUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      error: "Something went wrong... let's try again in a moment.",
    });
  }
});

/**
 * Auth: Sign up
 */
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, supportedPerson, name } = req.body;

    const providedFullName =
      typeof fullName === 'string' && fullName.trim().length > 0
        ? fullName.trim()
        : typeof name === 'string' && name.trim().length > 0
        ? name.trim()
        : undefined;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    const result = await signUpUser({ email, password, fullName: providedFullName, supportedPerson });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Could not create account.',
      });
    }

    res.json({
      success: true,
      userId: result.userId,
      token: result.token ?? null,
      fullName: result.fullName ?? null,
      message: 'Account created. Please check your email to confirm if required.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong while creating your account.',
    });
  }
});

/**
 * Auth: Log in
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    const result = await signInUser({ email, password });

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error || 'Invalid email or password.',
      });
    }

    res.json({
      success: true,
      userId: result.userId,
      token: result.token ?? null,
      fullName: result.fullName ?? null,
      message: 'Logged in successfully.',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Something went wrong while logging you in.',
    });
  }
});

/**
 * GET /api/chatbox/history/:userId
 * Return recent chat messages for a user
 */
app.get('/api/chatbox/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const history = await getChatHistory(userId, 50);

    const messages = history.map((row: any) => ({
      type: row.role === 'user' ? 'user' : 'amily',
      text: row.text,
      emotion: row.emotion || null,
      timestamp: row.timestamp,
    }));

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    // If history fetch fails (e.g., table doesn't exist), return empty array
    console.warn('ChatBox history error (returning empty):', error);
    res.json({
      success: true,
      data: [],
    });
  }
});

/**
 * POST /api/chatbox
 * Chat endpoint using AI-powered responses (ElevenLabs) + ElevenLabs TTS
 */
app.post('/api/chatbox', async (req: Request, res: Response) => {
  try {
    const { userId = 'anonymous', input } = req.body as { userId?: string; input?: string };

    if (!input || !input.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please share a little about how you are feeling.',
      });
    }

    const trimmedUserId = String(userId || 'anonymous');
    const memory = chatMemory.get(trimmedUserId) || {};
    const firstTurn = !memory.reminderAsked;

    memory.reminderAsked = true;

    const newDiscomfortTopics = extractDiscomfortTopics(input);
    if (newDiscomfortTopics.length) {
      memory.avoidTopics = memory.avoidTopics || new Set<string>();
      newDiscomfortTopics.forEach((topic) => memory.avoidTopics?.add(topic));
    }

    chatMemory.set(trimmedUserId, memory);

    const persistChatMessage = (role: 'user' | 'amily', text: string) => {
      if (!text) {
        return;
      }
      saveToSupabase('chat_messages', {
        user_id: trimmedUserId,
        role,
        text,
        emotion: null,
        timestamp: new Date().toISOString(),
      }).catch((err) => {
        console.warn(`Failed to save ${role} message (non-critical):`, err);
      });
    };

    persistChatMessage('user', input);

    const safetyAlert = detectSafetyConcerns(input);
    if (safetyAlert.level !== 'normal') {
      const isEmergency = safetyAlert.level === 'emergency' || safetyAlert.level === 'urgent';
      let alertId: string | undefined;

      try {
        if (isEmergency) {
          const emergencyResult = await handleEmergency(
            trimmedUserId,
            safetyAlert,
            undefined,
            input
          );
          alertId = emergencyResult.alertId;
        } else {
          await triggerN8NWorkflow('safety_concern', {
            userId: trimmedUserId,
            detected: safetyAlert.detected,
            level: safetyAlert.level,
            caregiverAlert: safetyAlert.caregiverAlert,
            actions: safetyAlert.actions,
            timestamp: new Date().toISOString(),
            source: 'chatbox',
          });
        }
      } catch (workflowError) {
        console.error('Safety workflow error (chatbox):', workflowError);
      }

      const responseText = formatForTTS(
        `Safety first. ${safetyAlert.message || getEmergencyReassurance(safetyAlert)}`.trim(),
        { includeReassurance: false }
      );
      const audioUrl = await generateTTS(responseText);

      persistChatMessage('amily', responseText);

      return res.json({
        success: true,
        emergency: isEmergency,
        alert: safetyAlert,
        alertId,
        data: {
          firstTurn,
          response: responseText,
          reasoningModel: isEmergency ? 'Safety protocol' : 'Safety check-in',
          voiceModel: ELEVENLABS_TTS_MODEL,
        },
        ttsText: responseText,
        audioUrl,
        timestamp: new Date().toISOString(),
      });
    }

    // Load recent chat history for AI context
    const historyRows = await getChatHistory(trimmedUserId, 20);
    const historyForAI =
      historyRows?.map((row: any) => ({
        role: row.role === 'user' ? ('user' as const) : ('amily' as const),
        text: row.text as string,
      })) ?? [];

    const avoidTopics = memory.avoidTopics ? Array.from(memory.avoidTopics).slice(-8) : [];

    // Generate AI-powered reply with conversation context
    const replyText = await generateChatReply(input, historyForAI, firstTurn, {
      avoidTopics,
    });
    const ttsText = formatForTTS(replyText, { includeReassurance: false });
    
    // Generate audio using ElevenLabs TTS
    const audioUrl = await generateTTS(ttsText);

    // Persist both user and Amily messages to Supabase (non-blocking, fails gracefully)
    persistChatMessage('amily', ttsText);

    res.json({
      success: true,
      data: {
        firstTurn,
        reasoningModel: GEMINI_CHAT_MODEL,
        voiceModel: ELEVENLABS_TTS_MODEL,
      },
      ttsText,
      audioUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('ChatBox error:', error);
    res.status(500).json({
      success: false,
      error: "I had trouble answering just now… can we try again in a moment?",
    });
  }
});

/**
 * POST /api/memory
 * Record a memory for MemoryLane
 */
app.post('/api/memory', async (req: Request, res: Response) => {
  try {
    const { userId, storyInput } = req.body;
    
    if (!storyInput || storyInput.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please share a memory with me.',
      });
    }
    
    // Extract simple memory structure from story (no AI model)
    const sentences = storyInput.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).slice(0, 3);
    const story3Sentences = sentences.join('. ') + (sentences.length > 0 ? '.' : '');
    
    const validatedMemory: MemoryJSON = {
      title: storyInput.substring(0, 50).trim() || "A Special Memory",
      era: "Recent years",
      story_3_sentences: story3Sentences || storyInput.substring(0, 200),
      tags: ['personal'],
    };

    let imageUrl: string | null = null;
    try {
      imageUrl = await generateMemoryImage(validatedMemory.title, storyInput);
    } catch (imageError) {
      console.warn('Memory image generation error:', imageError);
    }

    const trimmedStory = storyInput.trim();
    const memoryRecord: MemoryJSON & { image_url?: string | null; story_full?: string } = {
      ...validatedMemory,
      image_url: imageUrl ?? undefined,
      story_full: trimmedStory || undefined,
    };
    
    // Generate encouraging TTS response
    const prompt = generateMemoryPrompt();
    const ttsText = formatForTTS(`${prompt} I've saved your story about "${validatedMemory.title}".`);
    
    // Generate audio using ElevenLabs
    const audioUrl = await generateTTS(ttsText);
    
    // Save memory to database
    await saveToSupabase('memories', {
      user_id: userId,
      memory: memoryRecord,
      timestamp: new Date().toISOString(),
    });
    
    res.json({
      success: true,
      data: {
        ...memoryRecord,
        imageUrl: imageUrl ?? null,
        storyFull: trimmedStory || null,
      },
      ttsText,
      audioUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Memory recording error:', error);
    res.status(500).json({
      success: false,
      error: "I had trouble saving that... can we try once more?",
    });
  }
});

/**
 * GET /api/memory/:userId
 * Retrieve memories for a given user
 */
app.get('/api/memory/:userId', async (req: Request, res: Response) => {
  try {
    const requestedUserId = req.params.userId;
    const resolvedUserId = requestedUserId;
    const limitParam = parseInt(String(req.query.limit ?? '25'), 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 25;

    if (!resolvedUserId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required.',
      });
    }

    const memories = await getMemories(resolvedUserId, limit);

    res.json({
      success: true,
      data: memories.map((memory: any) => ({
        ...memory,
        story: memory.story ?? memory.story_3_sentences,
        storyFull:
          memory.storyFull ??
          memory.story_full ??
          memory.story ??
          memory.story_3_sentences ??
          null,
        imageUrl: memory.imageUrl ?? memory.image_url ?? null,
      })),
    });
  } catch (error) {
    console.error('Memory fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not load memories.',
    });
  }
});

/**
 * POST /api/buddy
 * Process buddy messages with sentiment analysis
 */
app.post('/api/buddy', async (req: Request, res: Response) => {
  try {
    const { userId, messageFrom, messageText } = req.body;
    
    // Generate simple summary (no AI model)
    const validatedSummary: SummaryJSON = {
      summary: `Your friend ${messageFrom || 'someone'} sent a warm hello… they're thinking of you today.`,
      tone: 'warm' as const,
      suggestion: "Maybe send a little message back when you're ready?",
    };
    
    // Generate social encouragement
    const encouragement = generateSocialEncouragement();
    const ttsText = formatForTTS(`${validatedSummary.summary} ${encouragement}`);
    
    // Generate audio using ElevenLabs
    const audioUrl = await generateTTS(ttsText);
    
    // Save interaction
    await saveToSupabase(
      'buddy_messages',
      {
        user_id: userId,
        message_from: messageFrom,
        summary: validatedSummary,
        timestamp: new Date().toISOString(),
      },
      { silentMissingTable: true }
    );
    
    res.json({
      success: true,
      data: validatedSummary,
      ttsText,
      audioUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Buddy message error:', error);
    res.status(500).json({
      success: false,
      error: "I couldn't read that message... let's check again.",
    });
  }
});

/**
 * POST /api/report/weekly
 * Generate a weekly report from chats/memories and email it to the care circle
 */
app.post('/api/report/weekly', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId?: string };

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required.',
      });
    }

    const trimmedUserId = userId.trim();

    const [profile, chats, memories] = await Promise.all([
      getUserProfile(trimmedUserId).catch(() => null),
      getChatHistory(trimmedUserId, 200).catch(() => []),
      getMemories(trimmedUserId, 20).catch(() => []),
    ]);

    const userName = profile?.name || 'Companion friend';
    const formattedMemories = memories.map((memory: any) => ({
      ...memory,
      timestamp: memory?.timestamp ?? memory?.created_at ?? null,
    }));

    const report = buildWeeklyReport({
      userName,
      chats,
      memories: formattedMemories,
    });

    triggerN8NWorkflow('weekly_report_email', {
      userId: trimmedUserId,
      email: CARE_CIRCLE_EMAIL,
      subject: `Weekly report for ${userName}`,
      report,
    }).catch((emailError) => {
      console.warn('Weekly report email workflow failed:', emailError);
    });

    res.json({
      success: true,
      sentTo: CARE_CIRCLE_EMAIL,
      report,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Weekly report error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not generate weekly report.',
    });
  }
});

/**
 * GET /api/buddies
 * List buddy profiles (all other users)
 */
app.get('/api/buddies', async (req: Request, res: Response) => {
  try {
    const { limit, excludeUserId } = req.query;
    const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : NaN;
    const requestedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 8;
    const excludeId =
      typeof excludeUserId === 'string' && excludeUserId.trim().length ? excludeUserId.trim() : null;

    const buddies = await getBuddyProfiles(requestedLimit, excludeId);

    res.json({
      success: true,
      data: buddies,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Buddy list fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not load buddy list right now.',
    });
  }
});

/**
 * GET /api - JSON API info
 */
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    service: 'Amily Companion',
    version: '1.0.0',
    message: "Hello... I'm Amily. I'm here to help you feel calm, safe, and understood.",
    endpoints: {
      health: 'GET /api/health',
      checkin: 'POST /api/checkin',
      memory: 'POST /api/memory',
      buddy: 'POST /api/buddy',
      empathy: 'POST /api/empathy',
      preferences: 'GET /api/preferences/:userId',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'Amily Companion',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/preferences/:userId
 * Get user preferences
 */
app.get('/api/preferences/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const preferences = await getUserPreferences(userId);
    
    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Preferences fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not load your settings right now.',
    });
  }
});

/**
 * GET /api/profile
 * Fetch authenticated user's profile details
 */
app.get('/api/profile', async (req: Request, res: Response) => {
  try {
    const resolvedUserId = resolveRequestUserId(req);
    if (!resolvedUserId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    const profile = await getUserProfile(resolvedUserId);

    res.json({
      success: true,
      data: profile ?? { id: resolvedUserId, name: null },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not load profile.',
    });
  }
});

/**
 * POST /api/empathy
 * Generate empathetic response based on user emotion
 */
app.post('/api/empathy', async (req: Request, res: Response) => {
  try {
    const { userInput } = req.body;
    
    // Check for safety concerns first
    const safetyAlert = detectSafetyConcerns(userInput);
    
    if (safetyAlert.level === 'emergency' || safetyAlert.level === 'urgent') {
      // Handle emergency
      const emergencyResult = await handleEmergency(
        req.body.userId || 'unknown',
        safetyAlert,
        undefined,
        userInput
      );
      
      const reassurance = getEmergencyReassurance(safetyAlert);
      const audioUrl = await generateTTS(reassurance);
      
      return res.json({
        success: true,
        emergency: true,
        alert: safetyAlert,
        alertId: emergencyResult.alertId,
        data: {
          emotion: 'emergency',
          response: reassurance,
        },
        ttsText: reassurance,
        audioUrl,
        timestamp: new Date().toISOString(),
      });
    }
    
    const emotion = detectEmotion(userInput);
    const response = generateEmpatheticResponse(emotion);
    const audioUrl = await generateTTS(response);
    
    res.json({
      success: true,
      emergency: false,
      alert: safetyAlert.level === 'concern' ? safetyAlert : null,
      data: {
        emotion,
        response,
      },
      ttsText: response,
      audioUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Empathy response error:', error);
    res.status(500).json({
      success: false,
      error: "I'm here... let's take a breath together.",
    });
  }
});

/**
 * POST /api/safety/vitals
 * Monitor vitals and detect emergency situations
 */
app.post('/api/safety/vitals', async (req: Request, res: Response) => {
  try {
    const { userId, vitals }: { userId: string; vitals: VitalsData } = req.body;
    
    const safetyAlert = analyzeVitals(vitals);
    
    if (safetyAlert.level === 'emergency' || safetyAlert.level === 'urgent') {
      const emergencyResult = await handleEmergency(userId, safetyAlert, vitals);
      const reassurance = getEmergencyReassurance(safetyAlert);
      const audioUrl = await generateTTS(reassurance);
      
      return res.json({
        success: true,
        alert: safetyAlert,
        alertId: emergencyResult.alertId,
        ttsText: reassurance,
        audioUrl,
        timestamp: new Date().toISOString(),
      });
    }
    
    res.json({
      success: true,
      alert: safetyAlert,
      message: 'Vitals within normal range',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Vitals monitoring error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not process vitals data',
    });
  }
});

/**
 * POST /api/safety/emergency
 * Handle manual emergency trigger
 */
app.post('/api/safety/emergency', async (req: Request, res: Response) => {
  try {
    const { userId, type, location } = req.body;
    
    const safetyAlert = {
      level: 'emergency' as const,
      detected: [type || 'manual_trigger'],
      message: "Help is on the way... stay calm.",
      actions: ['emergency_protocol', 'alert_caregiver', 'location_share'],
      caregiverAlert: true,
    };
    
    const vitals: VitalsData = {
      location,
      timestamp: new Date().toISOString(),
    };
    
    const emergencyResult = await handleEmergency(userId, safetyAlert, vitals);
    const reassurance = getEmergencyReassurance(safetyAlert);
    const audioUrl = await generateTTS(reassurance);
    
    res.json({
      success: true,
      alert: safetyAlert,
      alertId: emergencyResult.alertId,
      ttsText: reassurance,
      audioUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Emergency trigger error:', error);
    res.status(500).json({
      success: false,
      error: 'Emergency alert sent, help is coming',
    });
  }
});

/**
 * GET /api/wellness/nudges
 * Get current wellness nudges and reminders (reads from database)
 */
app.get('/api/wellness/nudges', async (req: Request, res: Response) => {
  try {
    const { userId, timeOfDay = 'morning', mood = 'ok' } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required.',
      });
    }

    // Read medications from database (requires wellness_medications table)
    // TODO: Implement proper medication fetching from Supabase
    const medications: MedicationSchedule[] = [];
    
    // Read hydration from database (requires wellness_hydration table)
    // TODO: Implement proper hydration fetching from Supabase
    const hydration: HydrationGoal = {
      dailyGlasses: 0,
      currentGlasses: 0,
    };
    
    // Read weather from external API or database
    // TODO: Implement weather API integration
    const weather: WeatherData = {
      temp: 0,
      condition: 'unknown',
      humidity: 0,
    };
    
    const nudges = getWellnessNudges(
      timeOfDay as 'morning' | 'afternoon' | 'evening',
      medications,
      hydration,
      weather,
      mood as 'low' | 'ok' | 'good'
    );
    
    res.json({
      success: true,
      data: nudges,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Wellness nudges error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not get wellness nudges',
    });
  }
});

/**
 * POST /api/wellness/log
 * Log wellness activities (water, medication, etc.)
 */
app.post('/api/wellness/log', async (req: Request, res: Response) => {
  try {
    const { userId, type, value } = req.body;
    
    await saveToSupabase('wellness_log', {
      user_id: userId,
      type,
      value,
      timestamp: new Date().toISOString(),
    });
    
    let response = '';
    if (type === 'water') {
      response = "Good job staying hydrated! You're doing great.";
    } else if (type === 'medication') {
      response = "Thank you for taking your medication. Well done.";
    } else if (type === 'activity') {
      response = "Wonderful! Movement is so good for you.";
    }
    
    const audioUrl = await generateTTS(formatForTTS(response));
    
    res.json({
      success: true,
      ttsText: response,
      audioUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Wellness log error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not log activity',
    });
  }
});

/**
 * POST /api/tts
 * Generate TTS audio for arbitrary text (used by memories playback)
 */
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text?: string };

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text is required.',
      });
    }

    const trimmed = text.trim();
    const formatted = formatForTTS(trimmed, { includeReassurance: false });
    const audioUrl = await generateTTS(formatted);

    res.json({
      success: true,
      audioUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('TTS generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not generate audio.',
    });
  }
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`\n🌸 Amily Companion Server Running`);
  console.log(`   Port: ${PORT}`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`\n   Endpoints:`);
  console.log(`   POST /api/checkin    - Daily check-in`);
  console.log(`   POST /api/memory     - Record memory`);
  console.log(`   POST /api/buddy      - Process buddy message`);
  console.log(`   POST /api/empathy    - Empathetic response`);
  console.log(`   GET  /api/health     - Health check`);
  console.log(`   GET  /api/preferences/:userId - User preferences\n`);
});

export default app;
