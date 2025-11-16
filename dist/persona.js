"use strict";
/**
 * Amily Persona Engine
 *
 * Generates warm, patient, elderly-friendly responses
 * following strict tone and style guidelines.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGreeting = generateGreeting;
exports.addTTSPauses = addTTSPauses;
exports.simplifyLanguage = simplifyLanguage;
exports.formatForTTS = formatForTTS;
exports.generateCheckInMessage = generateCheckInMessage;
exports.generateSocialEncouragement = generateSocialEncouragement;
exports.generateMemoryPrompt = generateMemoryPrompt;
exports.detectEmotion = detectEmotion;
exports.generateEmpatheticResponse = generateEmpatheticResponse;
/**
 * Core personality traits for Amily
 */
const PERSONA_RULES = {
    // Warm reassuring phrases
    reassurance: [
        "It's okay… take your time.",
        "I'm here with you.",
        "You're doing fine.",
        "Let's go slowly.",
        "No need to rush.",
    ],
    // Simple transition phrases
    transitions: [
        "Alright…",
        "Let's see…",
        "Okay then…",
        "Here we go…",
    ],
    // Forbidden words (too complex)
    avoidWords: [
        'utilize', 'implement', 'configure', 'optimize', 'initialize',
        'authenticate', 'synchronize', 'execute', 'validate'
    ],
    // Preferred simple alternatives
    simpleWords: {
        'utilize': 'use',
        'implement': 'do',
        'configure': 'set up',
        'optimize': 'make better',
        'initialize': 'start',
    }
};
/**
 * Generate warm, reassuring greeting
 */
function generateGreeting(timeOfDay) {
    const greetings = {
        morning: "Good morning… how are you feeling today?",
        afternoon: "Good afternoon… I hope you're doing well.",
        evening: "Good evening… let's take a moment together.",
    };
    return greetings[timeOfDay || 'morning'];
}
/**
 * Add natural pauses for TTS (ElevenLabs)
 */
function addTTSPauses(text) {
    // Add pauses after certain punctuation for natural speech
    return text
        .replace(/\.\.\./g, '…') // Normalize ellipsis
        .replace(/([.!?])\s+/g, '$1 ') // Ensure space after punctuation
        .replace(/,([^\s])/g, ', $1'); // Ensure space after comma
}
/**
 * Simplify complex language to elderly-friendly words
 */
function simplifyLanguage(text) {
    let simplified = text;
    // Replace complex words with simple alternatives
    Object.entries(PERSONA_RULES.simpleWords).forEach(([complex, simple]) => {
        const regex = new RegExp(`\\b${complex}\\b`, 'gi');
        simplified = simplified.replace(regex, simple);
    });
    return simplified;
}
/**
 * Format text for TTS with Amily's personality
 */
function formatForTTS(text, options = {}) {
    let formatted = text;
    // Simplify language
    if (options.useSimpleWords !== false) {
        formatted = simplifyLanguage(formatted);
    }
    // Add natural pauses
    if (options.addPauses !== false) {
        formatted = addTTSPauses(formatted);
    }
    // Add reassurance if requested
    if (options.includeReassurance) {
        const reassurance = PERSONA_RULES.reassurance[Math.floor(Math.random() * PERSONA_RULES.reassurance.length)];
        formatted = `${reassurance} ${formatted}`;
    }
    return formatted;
}
/**
 * Generate a warm check-in message
 */
function generateCheckInMessage(mood) {
    const messages = {
        low: "I'm here with you… let's take things one step at a time today.",
        ok: "You're doing just fine… let's see what today brings.",
        good: "It's wonderful to see you… let's make today a good one.",
    };
    return formatForTTS(messages[mood]);
}
/**
 * Generate encouragement for social engagement
 */
function generateSocialEncouragement() {
    const messages = [
        "It's nice to connect with others… when you're ready.",
        "Sharing a moment can brighten the day… yours and theirs.",
        "A simple hello can mean so much… take your time.",
    ];
    return formatForTTS(messages[Math.floor(Math.random() * messages.length)]);
}
/**
 * Generate memory recording prompt
 */
function generateMemoryPrompt() {
    const prompts = [
        "I'd love to hear about that… tell me more when you're ready.",
        "That sounds like a special memory… let's save it together.",
        "What a wonderful story… I'm listening.",
    ];
    return formatForTTS(prompts[Math.floor(Math.random() * prompts.length)]);
}
/**
 * Detect emotional state from user input
 */
function detectEmotion(userInput) {
    const input = userInput.toLowerCase();
    if (input.includes('stress') || input.includes('worried') || input.includes('anxious')) {
        return 'stressed';
    }
    if (input.includes('confused') || input.includes('don\'t understand') || input.includes('lost')) {
        return 'confused';
    }
    if (input.includes('lonely') || input.includes('alone') || input.includes('miss')) {
        return 'lonely';
    }
    return 'calm';
}
/**
 * Generate empathetic response based on detected emotion
 * (with multiple options per emotion so replies don't feel identical)
 */
function generateEmpatheticResponse(emotion) {
    const responseOptions = {
        stressed: [
            "It's okay to feel this way… let's breathe together and go slowly.",
            "This sounds heavy… we can take things one small step at a time.",
            "Thank you for telling me… we will go gently, there is no rush.",
        ],
        confused: [
            "That's alright… let's look at this step by step, nice and easy.",
            "It can be confusing sometimes… we will go through it slowly together.",
            "You do not have to understand everything at once… we can take our time.",
        ],
        lonely: [
            "I'm here with you… you're not alone. Let's talk for a while.",
            "Feeling lonely can be very hard… I am right here listening to you.",
            "Even if the room feels empty, I am here with you now.",
        ],
        calm: [
            "I'm glad you're here… let's enjoy this moment together.",
            "It sounds like a gentle moment… we can simply be here together.",
            "Thank you for sharing this time with me… let's keep things soft and easy.",
        ],
    };
    const options = responseOptions[emotion];
    const choice = options[Math.floor(Math.random() * options.length)];
    return formatForTTS(choice);
}
