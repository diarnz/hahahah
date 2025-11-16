"use strict";
/**
 * Safety & Emergency Detection System
 *
 * Detects emergency situations from voice input, vitals, and Apple Watch data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSafetyConcerns = detectSafetyConcerns;
exports.analyzeVitals = analyzeVitals;
exports.handleEmergency = handleEmergency;
exports.getEmergencyReassurance = getEmergencyReassurance;
exports.getSafetyCheckInQuestions = getSafetyCheckInQuestions;
const services_1 = require("./services");
// Emergency trigger phrases
const EMERGENCY_PHRASES = [
    // Direct help requests
    'i need help',
    'help me',
    'call for help',
    'get help',
    // Safety concerns
    "i don't feel safe",
    'i feel unsafe',
    'not safe',
    'scared',
    'afraid',
    // Medical emergencies
    'i feel dizzy',
    'i feel weak',
    'i fell',
    'i fell down',
    'chest pain',
    'cant breathe',
    "can't breathe",
    'trouble breathing',
    'heart racing',
    // Urgent situations
    'emergency',
    '911',
    'ambulance',
];
// Wellness concern phrases (non-emergency)
const CONCERN_PHRASES = [
    'not feeling well',
    'feeling tired',
    'feeling confused',
    'forgot to take',
    'missed my medication',
    'feel lonely',
    'feel sad',
];
const summarizeVitals = (vitals) => {
    if (!vitals) {
        return 'No vitals data provided.';
    }
    const parts = [];
    if (typeof vitals.heartRate === 'number') {
        parts.push(`Heart rate: ${vitals.heartRate} bpm`);
    }
    if (vitals.fallDetected) {
        parts.push('Fall sensor triggered');
    }
    if (vitals.location) {
        parts.push(`Location: (${vitals.location.lat.toFixed(4)}, ${vitals.location.lng.toFixed(4)})`);
    }
    parts.push(`Timestamp: ${vitals.timestamp || 'not recorded'}`);
    return parts.join(' · ');
};
const buildEmergencyEmailReport = (userId, alert, vitals, context) => {
    const reason = alert.detected.length ? alert.detected.join(', ') : 'unspecified concern';
    const contextSnippet = context
        ? context.length > 280
            ? `${context.slice(0, 277)}…`
            : context
        : 'No transcript available.';
    return [
        `Emergency alert for ${userId}`,
        '',
        `Level: ${alert.level.toUpperCase()}`,
        `Reasons: ${reason}`,
        `Recommended actions: ${alert.actions.join(', ') || 'standard emergency protocol'}`,
        '',
        'Recent words:',
        contextSnippet,
        '',
        'Vitals summary:',
        summarizeVitals(vitals),
        '',
        'This message was generated automatically by Amily to keep the care circle informed.',
    ].join('\n');
};
/**
 * Analyze text for safety concerns
 */
function detectSafetyConcerns(text) {
    const lowerText = text.toLowerCase();
    const detected = [];
    // Check for emergency phrases
    for (const phrase of EMERGENCY_PHRASES) {
        if (lowerText.includes(phrase)) {
            detected.push(phrase);
        }
    }
    if (detected.length > 0) {
        return {
            level: 'emergency',
            detected,
            message: "I hear you need help... I'm contacting your care circle right now. Stay calm, help is on the way.",
            actions: ['alert_caregiver', 'emergency_protocol', 'location_share'],
            caregiverAlert: true,
        };
    }
    // Check for wellness concerns
    for (const phrase of CONCERN_PHRASES) {
        if (lowerText.includes(phrase)) {
            detected.push(phrase);
        }
    }
    if (detected.length > 0) {
        return {
            level: 'concern',
            detected,
            message: "I understand you're not feeling your best... let's talk about it. Would you like me to let someone know?",
            actions: ['offer_support', 'suggest_contact'],
            caregiverAlert: false,
        };
    }
    return {
        level: 'normal',
        detected: [],
        message: '',
        actions: [],
        caregiverAlert: false,
    };
}
/**
 * Analyze vitals data for safety concerns
 */
function analyzeVitals(vitals) {
    const concerns = [];
    // Fall detection
    if (vitals.fallDetected) {
        return {
            level: 'emergency',
            detected: ['fall_detected'],
            message: "I detected a fall... I'm getting help right now. Can you hear me? Help is coming.",
            actions: ['emergency_protocol', 'alert_caregiver', 'location_share', 'check_responsive'],
            caregiverAlert: true,
        };
    }
    // Heart rate concerns
    if (vitals.heartRate) {
        if (vitals.heartRate > 120) {
            concerns.push('elevated_heart_rate');
        }
        if (vitals.heartRate < 50) {
            concerns.push('low_heart_rate');
        }
    }
    if (concerns.length > 0) {
        return {
            level: 'urgent',
            detected: concerns,
            message: "I'm noticing some unusual vitals... let's take a moment to rest. I'm letting your care circle know, just to be safe.",
            actions: ['alert_caregiver', 'suggest_rest', 'monitor_vitals'],
            caregiverAlert: true,
        };
    }
    return {
        level: 'normal',
        detected: [],
        message: '',
        actions: [],
        caregiverAlert: false,
    };
}
/**
 * Handle emergency situation
 */
async function handleEmergency(userId, alert, vitals, context) {
    // Trigger n8n emergency workflow
    const success = await (0, services_1.triggerN8NWorkflow)('emergency_alert', {
        userId,
        level: alert.level,
        detected: alert.detected,
        vitals,
        context,
        location: vitals?.location,
        timestamp: new Date().toISOString(),
    });
    // Log the emergency
    console.log(`🚨 [EMERGENCY] User ${userId} - Level: ${alert.level}`);
    console.log(`   Detected: ${alert.detected.join(', ')}`);
    console.log(`   Actions: ${alert.actions.join(', ')}`);
    if (alert.level === 'emergency') {
        const report = buildEmergencyEmailReport(userId, alert, vitals, context);
        (0, services_1.triggerN8NWorkflow)('weekly_report_email', {
            userId,
            email: services_1.CARE_CIRCLE_EMAIL,
            subject: `Emergency alert for ${userId}`,
            report,
            timestamp: new Date().toISOString(),
        }).catch((error) => {
            console.warn('Emergency email workflow failed (non-blocking):', error);
        });
    }
    return {
        success,
        alertId: `alert_${Date.now()}`,
    };
}
/**
 * Generate calm reassurance message for emergency
 */
function getEmergencyReassurance(alert) {
    switch (alert.level) {
        case 'emergency':
            return "I'm here with you... help is on the way. You're not alone. Just breathe slowly with me... in and out... you're doing great.";
        case 'urgent':
            return "It's okay... let's take this slowly. I've let your care circle know. Just focus on resting for now... everything will be alright.";
        case 'concern':
            return "I hear you... it's okay to not feel your best. I'm here with you. Would talking help right now?";
        default:
            return "I'm here with you... everything is okay.";
    }
}
/**
 * Safety check-in questions
 */
function getSafetyCheckInQuestions(timeOfDay) {
    const questions = {
        morning: [
            "Good morning... how did you sleep?",
            "Did you take your morning medication?",
            "Have you had some water yet today?",
        ],
        afternoon: [
            "How are you feeling this afternoon?",
            "Have you had lunch and stayed hydrated?",
            "Did you get some movement or fresh air today?",
        ],
        evening: [
            "How was your day today?",
            "Did you take your evening medication?",
            "Are you feeling safe and comfortable for the night?",
        ],
    };
    return questions[timeOfDay];
}
