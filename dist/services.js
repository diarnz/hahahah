"use strict";
/**
 * Service Integrations
 *
 * Handles all external API calls - requires real API keys and database
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeAuthToken = exports.resolveUserIdFromToken = exports.issueAuthToken = exports.CARE_CIRCLE_EMAIL = exports.ELEVENLABS_TTS_MODEL = exports.GEMINI_CHAT_MODEL = void 0;
exports.generateMemoryImage = generateMemoryImage;
exports.getBuddyProfiles = getBuddyProfiles;
exports.generateTTS = generateTTS;
exports.saveToSupabase = saveToSupabase;
exports.signUpUser = signUpUser;
exports.signInUser = signInUser;
exports.getUserProfile = getUserProfile;
exports.triggerN8NWorkflow = triggerN8NWorkflow;
exports.getUserPreferences = getUserPreferences;
exports.getChatHistory = getChatHistory;
exports.getMemories = getMemories;
exports.generateChatReply = generateChatReply;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("./config");
const supabase_js_1 = require("@supabase/supabase-js");
exports.GEMINI_CHAT_MODEL = 'gemini-2.0-flash';
exports.ELEVENLABS_TTS_MODEL = 'eleven_monolingual_v1';
exports.CARE_CIRCLE_EMAIL = 'neziridiar6@gmail.com';
const MEMORY_IMAGE_FALLBACKS = [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1482192505345-5655af888cc4?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80',
];
const getMemoryImageFallback = () => {
    return MEMORY_IMAGE_FALLBACKS[Math.floor(Math.random() * MEMORY_IMAGE_FALLBACKS.length)];
};
const buildMemoryImagePrompt = (title, story) => {
    const safeTitle = (title || 'Precious memory').trim();
    const safeStory = (story || '').replace(/\s+/g, ' ').trim();
    const snippet = safeStory.length > 260 ? `${safeStory.slice(0, 257)}…` : safeStory;
    return `Gentle watercolor illustration, warm nostalgic lighting, soft focus. Depict "${safeTitle}" memory. Scene inspiration: ${snippet || 'family gathering outdoors at sunset'}. Cozy, hopeful, caring.`;
};
async function generateMemoryImage(title, story) {
    try {
        const prompt = buildMemoryImagePrompt(title, story);
        const encodedPrompt = encodeURIComponent(prompt);
        const seed = Math.floor(Math.random() * 1_000_000);
        return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=512&seed=${seed}&n=1`;
    }
    catch (error) {
        console.warn('Memory image prompt failed, using fallback.', error);
        return getMemoryImageFallback();
    }
}
// Supabase client (only initialized in prod mode when keys are present)
let supabase = null;
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const activeTokens = new Map();
if (config_1.config.keys.supabaseUrl && config_1.config.keys.supabaseKey) {
    try {
        supabase = (0, supabase_js_1.createClient)(config_1.config.keys.supabaseUrl, config_1.config.keys.supabaseKey, {
            auth: { persistSession: false },
        });
        console.log('💾 Supabase client initialized');
    }
    catch (error) {
        console.error('Failed to initialize Supabase client:', error);
    }
}
else {
    console.warn('Supabase URL/key missing – database features will not be available.');
}
const normalizeEmail = (email) => email.trim().toLowerCase();
const hashPassword = (password, salt) => {
    return crypto_1.default.createHash('sha256').update(`${salt}:${password}`).digest('hex');
};
const generateSalt = () => crypto_1.default.randomBytes(16).toString('hex');
const generateUserId = () => crypto_1.default.randomUUID();
const encodePasscode = (password) => {
    const salt = generateSalt();
    const hash = hashPassword(password, salt);
    return `${salt}:${hash}`;
};
const verifyPasscode = (stored, inputPassword) => {
    if (!stored)
        return false;
    const [salt, hash] = stored.split(':');
    if (!salt || !hash)
        return false;
    return hashPassword(inputPassword, salt) === hash;
};
const issueAuthToken = (userId) => {
    const token = crypto_1.default.randomBytes(32).toString('hex');
    activeTokens.set(token, { userId, expiresAt: Date.now() + TOKEN_TTL_MS });
    return token;
};
exports.issueAuthToken = issueAuthToken;
const resolveUserIdFromToken = (token) => {
    if (!token)
        return null;
    const record = activeTokens.get(token);
    if (!record)
        return null;
    if (record.expiresAt < Date.now()) {
        activeTokens.delete(token);
        return null;
    }
    return record.userId;
};
exports.resolveUserIdFromToken = resolveUserIdFromToken;
const revokeAuthToken = (token) => {
    activeTokens.delete(token);
};
exports.revokeAuthToken = revokeAuthToken;
const FALLBACK_DISTANCES = ['Same building', '1 km away', '2 km away', '3 km away', 'Nearby park'];
const FALLBACK_AVAILABILITY = ['Most afternoons', 'Every morning', 'Evenings & weekends', 'Flexible schedule'];
const FALLBACK_INTERESTS = [
    'Tea tasting',
    'Radio stories',
    'Soft walks',
    'Crosswords',
    'Gardening tips',
    'Local news',
    'Choir songs',
    'Knitting',
    'Coffee chats',
];
const fallbackBuddyProfiles = [
    {
        id: 'buddy-leena',
        name: 'Leena H.',
        distance: '1 km away',
        availability: 'Most afternoons',
        interests: ['Knitting', 'Choir songs', 'Coffee walks'],
        note: 'Prefers slow afternoon walks.',
    },
    {
        id: 'buddy-mika',
        name: 'Mika P.',
        distance: '3 km away',
        availability: 'Evenings and weekends',
        interests: ['Fishing stories', 'Jazz radio', 'Gardening tips'],
        note: 'Enjoys sharing local jazz radio finds.',
    },
    {
        id: 'buddy-aada',
        name: 'Aada L.',
        distance: 'Same building',
        availability: 'Every morning',
        interests: ['Crosswords', 'Old films', 'Tea tasting'],
        note: 'Hosts tea tasting on Thursdays.',
    },
];
const deriveSeed = (input, fallbackSeed) => {
    if (!input)
        return fallbackSeed;
    return input.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
};
const pickFromList = (seed, list, offset = 0) => {
    const index = Math.abs(seed + offset) % list.length;
    return list[index];
};
const buildInterestTags = (seed) => {
    const first = pickFromList(seed, FALLBACK_INTERESTS, 1);
    const second = pickFromList(seed, FALLBACK_INTERESTS, 4);
    if (first === second) {
        const third = pickFromList(seed, FALLBACK_INTERESTS, 7);
        return Array.from(new Set([first, third]));
    }
    return [first, second];
};
const mapUserToBuddyProfile = (record = {}, index) => {
    const fallbackName = typeof record?.email === 'string'
        ? record.email.split('@')[0]?.replace(/[^a-z0-9]/gi, ' ') || 'Friendly neighbor'
        : 'Friendly neighbor';
    const name = (record?.name || '').trim() || fallbackName;
    const seed = deriveSeed(record?.id || record?.email || name, index * 13 + 7);
    return {
        id: record?.id || `buddy-${index}`,
        name,
        distance: record?.distance || pickFromList(seed, FALLBACK_DISTANCES),
        availability: record?.availability || pickFromList(seed, FALLBACK_AVAILABILITY, 3),
        interests: Array.isArray(record?.interests) && record.interests.length
            ? record.interests
            : buildInterestTags(seed),
        note: record?.note || (record?.email ? `Reachable via ${record.email}` : null),
    };
};
async function getBuddyProfiles(limit = 8, excludeUserId) {
    const fallback = fallbackBuddyProfiles
        .filter((profile) => !excludeUserId || profile.id !== excludeUserId)
        .slice(0, limit);
    if (!supabase) {
        return fallback;
    }
    try {
        let query = supabase
            .from('users')
            .select('id, name, email, created_at')
            .order('created_at', { ascending: true })
            .limit(limit + (excludeUserId ? 2 : 0));
        if (excludeUserId) {
            query = query.neq('id', excludeUserId);
        }
        const { data, error } = await query;
        if (error) {
            if (error.code === 'PGRST205') {
                console.warn('⚠️ Users table not available – falling back to demo buddies.');
                return fallback;
            }
            console.error('Failed to load buddy profiles:', error);
            return fallback;
        }
        if (!Array.isArray(data) || data.length === 0) {
            return fallback;
        }
        const mapped = data.map((record, index) => mapUserToBuddyProfile(record, index));
        return mapped.filter((profile) => Boolean(profile?.id)).slice(0, limit);
    }
    catch (error) {
        console.error('Unexpected buddy profile fetch error:', error);
        return fallback;
    }
}
/**
 * ElevenLabs TTS Integration
 * (single source of "generation" now – no demo audio)
 */
async function generateTTS(text) {
    if (!config_1.config.keys.elevenLabs) {
        throw new Error('ELEVENLABS_API_KEY is missing – cannot generate audio.');
    }
    try {
        const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Default "Rachel" voice from ElevenLabs docs
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': config_1.config.keys.elevenLabs,
                'Content-Type': 'application/json',
                Accept: 'audio/mpeg',
            },
            body: JSON.stringify({
                text,
                model_id: exports.ELEVENLABS_TTS_MODEL,
                voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
        });
        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error('ElevenLabs API error:', response.status, errText);
            throw new Error(`ElevenLabs API error: ${response.status} ${errText || ''}`.trim());
        }
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:audio/mpeg;base64,${base64}`;
        console.log(`🎵 [PROD] Generated TTS via ElevenLabs for: "${text.substring(0, 50)}..."`);
        return dataUrl;
    }
    catch (error) {
        console.error('ElevenLabs API error:', error);
        throw error;
    }
}
/**
 * Supabase Database Integration
 */
async function saveToSupabase(table, data, options = {}) {
    if (!supabase) {
        console.warn(`⚠️ Supabase not initialized – cannot save to "${table}"`);
        return false;
    }
    try {
        const { error } = await supabase.from(table).insert(data);
        if (error) {
            // Handle missing table gracefully (PGRST205 = table not found)
            if (error.code === 'PGRST205') {
                if (!options.silentMissingTable) {
                    console.warn(`⚠️ Table "${table}" does not exist in database. Skipping save.`);
                }
                return false;
            }
            console.error(`Supabase insert error on table "${table}":`, error);
            return false;
        }
        console.log(`💾 Saved record to Supabase table "${table}"`);
        return true;
    }
    catch (error) {
        console.error(`Supabase error saving to "${table}":`, error);
        return false;
    }
}
async function signUpUser(params) {
    if (!supabase) {
        throw new Error('Supabase client not initialized – cannot sign up user.');
    }
    try {
        const email = normalizeEmail(params.email);
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();
        if (existing?.id) {
            return { success: false, error: 'Account already exists for this email.' };
        }
        const passcodeHash = encodePasscode(params.password);
        const userId = generateUserId();
        const insertPayload = {
            id: userId,
            email,
            passcode_hash: passcodeHash,
            name: params.fullName ?? null,
            created_at: new Date().toISOString(),
        };
        const { error: insertError } = await supabase.from('users').insert(insertPayload);
        if (insertError) {
            console.error('Supabase users insert error:', insertError);
            return { success: false, error: insertError.message };
        }
        // Create a preferences row for this user
        await saveToSupabase('user_preferences', {
            user_id: userId,
            preferred_pace: 'slow',
            favorite_time: 'morning',
            interests: [],
            routine_notes: null,
        });
        const token = (0, exports.issueAuthToken)(userId);
        return { success: true, userId, token, fullName: params.fullName ?? null };
    }
    catch (error) {
        console.error('Unexpected signUp error:', error);
        return { success: false, error: error.message || 'Unable to sign up right now.' };
    }
}
/**
 * Supabase Auth: Log in an existing user with email/password
 */
async function signInUser(params) {
    if (!supabase) {
        throw new Error('Supabase client not initialized – cannot sign in user.');
    }
    try {
        const email = normalizeEmail(params.email);
        const { data: user, error } = await supabase
            .from('users')
            .select('id, passcode_hash, name, email')
            .eq('email', email)
            .maybeSingle();
        if (error && error.code !== 'PGRST116') {
            console.error('Supabase users select error:', error);
            return { success: false, error: error.message };
        }
        if (!user?.id || !user.passcode_hash) {
            return { success: false, error: 'Invalid email or password.' };
        }
        if (!verifyPasscode(user.passcode_hash, params.password)) {
            return { success: false, error: 'Invalid email or password.' };
        }
        const token = (0, exports.issueAuthToken)(user.id);
        const fallbackName = typeof user?.email === 'string'
            ? user.email.split('@')[0]?.replace(/[^a-z0-9]/gi, ' ') || null
            : null;
        return {
            success: true,
            userId: user.id,
            token,
            fullName: user.name ?? fallbackName ?? null,
        };
    }
    catch (error) {
        console.error('Unexpected signIn error:', error);
        return { success: false, error: error.message || 'Unable to log in right now.' };
    }
}
/**
 * Fetch core user profile (name) from Supabase
 */
async function getUserProfile(userId) {
    if (!supabase) {
        throw new Error('Supabase client not initialized – cannot fetch user profile.');
    }
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', userId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                // Not found
                return null;
            }
            throw error;
        }
        if (!data) {
            return null;
        }
        const fallbackName = typeof data.email === 'string'
            ? data.email.split('@')[0]?.replace(/[^a-z0-9]/gi, ' ') || null
            : null;
        return {
            id: data.id,
            name: data.name ?? fallbackName ?? null,
        };
    }
    catch (error) {
        console.error('Failed to fetch user profile:', error);
        throw error;
    }
}
/**
 * n8n Webhook Integration for Care Circle notifications
 */
async function triggerN8NWorkflow(event, payload) {
    if (!config_1.config.keys.n8nWebhook) {
        throw new Error('N8N webhook URL not configured – cannot trigger workflow.');
    }
    try {
        const response = await fetch(config_1.config.keys.n8nWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, ...payload }),
        });
        if (!response.ok) {
            throw new Error(`N8N webhook returned ${response.status}`);
        }
        console.log(`🔔 Triggered n8n webhook for "${event}"`);
        return true;
    }
    catch (error) {
        console.error('n8n webhook error:', error);
        throw error;
    }
}
/**
 * Get user preferences from Supabase
 */
async function getUserPreferences(userId) {
    if (!supabase) {
        throw new Error('Supabase client not initialized – cannot fetch user preferences.');
    }
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (error) {
            console.error('Failed to fetch user preferences from Supabase:', error);
            throw new Error(`Failed to fetch preferences: ${error.message}`);
        }
        return data || {};
    }
    catch (error) {
        console.error('Failed to fetch user preferences:', error);
        throw error;
    }
}
/**
 * Get recent chat history for a user from Supabase
 */
async function getChatHistory(userId, limit = 50) {
    if (!supabase) {
        console.warn('⚠️ Supabase not initialized – returning empty chat history');
        return [];
    }
    try {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: true })
            .limit(limit);
        if (error) {
            // Handle missing table gracefully (PGRST205 = table not found)
            if (error.code === 'PGRST205') {
                console.warn('⚠️ Table "chat_messages" does not exist in database. Returning empty history.');
                return [];
            }
            console.error('Failed to fetch chat history from Supabase:', error);
            return [];
        }
        return data || [];
    }
    catch (error) {
        console.error('Failed to fetch chat history:', error);
        return [];
    }
}
/**
 * Get saved memories for a user
 */
async function getMemories(userId, limit = 50) {
    if (!supabase) {
        console.warn('⚠️ Supabase not initialized – returning empty memories list');
        return [];
    }
    try {
        const { data, error } = await supabase
            .from('memories')
            .select('memory, timestamp')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .limit(limit);
        if (error) {
            if (error.code === 'PGRST205') {
                console.warn('⚠️ Table "memories" does not exist in database. Returning empty memories list.');
                return [];
            }
            console.error('Failed to fetch memories from Supabase:', error);
            return [];
        }
        return (data ?? []).map((row) => {
            const memory = (row.memory || {});
            return {
                ...memory,
                story: memory.story ?? memory.story_3_sentences,
                storyFull: memory.story_full ?? memory.story ?? memory.story_3_sentences ?? null,
                imageUrl: memory.image_url ?? memory.imageUrl ?? null,
                timestamp: row.timestamp,
            };
        });
    }
    catch (error) {
        console.error('Failed to fetch memories:', error);
        return [];
    }
}
/**
 * Generate AI-powered chat reply using Gemini
 * Supports conversation history for context-aware responses
 */
async function generateChatReply(userInput, history = [], isFirstTurn = false, options = {}) {
    if (!config_1.config.keys.gemini) {
        throw new Error('Gemini API key is required for chat generation.');
    }
    const sanitizedAvoidTopics = options.avoidTopics
        ?.map((topic) => topic
        ?.replace(/[^a-z0-9\s'-]/gi, '')
        ?.trim()
        ?.toLowerCase())
        .filter((topic) => topic && topic.length > 1) ?? [];
    const avoidInstruction = sanitizedAvoidTopics.length
        ? ` Avoid bringing up these sensitive topics unless the user specifically asks: ${sanitizedAvoidTopics
            .slice(-6)
            .join(', ')}. If they mention them, acknowledge gently and steer toward safer ground.`
        : '';
    const systemInstruction = 'You are Amily, a gentle, patient companion for elderly users. ' +
        'You speak slowly, in short, simple sentences. ' +
        'You avoid technical language. ' +
        'You respond with warmth, reassurance, and clear, kind suggestions. ' +
        avoidInstruction +
        (isFirstTurn
            ? 'This is the first conversation today. Gently check if they have taken their pills, eaten, and had some water, then respond warmly.'
            : '');
    try {
        const preparedHistory = history
            .filter((message) => Boolean(message?.text?.trim()))
            .map((message) => ({
            role: message.role === 'user' ? 'user' : 'model',
            parts: [{ text: message.text }],
        }));
        const useSystemInstruction = /gemini-2/i.test(exports.GEMINI_CHAT_MODEL) || exports.GEMINI_CHAT_MODEL.includes('flash');
        const contents = [...preparedHistory];
        if (!useSystemInstruction) {
            contents.unshift({
                role: 'system',
                parts: [{ text: systemInstruction }],
            });
        }
        contents.push({
            role: 'user',
            parts: [{ text: userInput }],
        });
        const requestBody = {
            contents,
            generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 220,
                topP: 0.9,
            },
        };
        if (useSystemInstruction) {
            requestBody.systemInstruction = {
                role: 'system',
                parts: [{ text: systemInstruction }],
            };
        }
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${exports.GEMINI_CHAT_MODEL}:generateContent`;
        const response = await fetch(`${endpoint}?key=${config_1.config.keys.gemini}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`Gemini API error: ${response.status} ${errorText}`);
        }
        const json = await response.json();
        const candidateText = json.candidates
            ?.map((candidate) => candidate.content?.parts
            ?.map((part) => part?.text ?? '')
            .join('')
            .trim())
            .find((text) => Boolean(text)) ?? '';
        if (!candidateText) {
            throw new Error('Empty response from Gemini');
        }
        return candidateText;
    }
    catch (error) {
        console.error('AI chat generation error:', error);
        throw error;
    }
}
