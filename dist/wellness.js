"use strict";
/**
 * Wellness Coaching System
 *
 * Medication reminders, hydration nudges, weather-aware prompts,
 * activity guidance, and stress reduction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMedicationReminder = getMedicationReminder;
exports.getHydrationNudge = getHydrationNudge;
exports.getWeatherPrompt = getWeatherPrompt;
exports.getActivityGuidance = getActivityGuidance;
exports.getStressReduction = getStressReduction;
exports.getWellnessNudges = getWellnessNudges;
/**
 * Generate medication reminder
 */
function getMedicationReminder(med, timeOfDay) {
    const withFoodNote = med.withFood ? ' Remember to take it with some food.' : '';
    return {
        type: 'medication',
        priority: 'high',
        message: `Time for your ${med.name} (${med.dosage}).${withFoodNote}`,
        ttsMessage: `Hi... it's time for your ${med.name}. ${med.dosage}.${withFoodNote} I'll wait while you take it... no rush.`,
        action: 'confirm_taken',
    };
}
/**
 * Generate hydration nudge based on time and activity
 */
function getHydrationNudge(goal, temp) {
    const remaining = goal.dailyGlasses - goal.currentGlasses;
    if (remaining <= 0)
        return null;
    const tempAdjust = temp > 75 ? ' It is warm today, so staying hydrated is extra important.' : '';
    let priority = 'medium';
    let message = '';
    let ttsMessage = '';
    if (remaining >= 6) {
        priority = 'high';
        message = `You've had ${goal.currentGlasses} glass${goal.currentGlasses !== 1 ? 'es' : ''} of water today. Let's have another one.`;
        ttsMessage = `How about a glass of water?${tempAdjust} Take your time... I'll wait.`;
    }
    else if (remaining >= 3) {
        message = `${remaining} more glass${remaining !== 1 ? 'es' : ''} of water to reach your goal today.`;
        ttsMessage = `You're doing well... just ${remaining} more glass${remaining !== 1 ? 'es' : ''} of water to go.${tempAdjust}`;
    }
    else {
        priority = 'low';
        message = `Almost there! Just ${remaining} more glass${remaining !== 1 ? 'es' : ''}.`;
        ttsMessage = `You're almost at your water goal... just ${remaining} more to go. You're doing great!`;
    }
    return {
        type: 'hydration',
        priority,
        message,
        ttsMessage,
        action: 'log_water',
    };
}
/**
 * Generate weather-aware routine prompts
 */
function getWeatherPrompt(weather, timeOfDay) {
    // Heat advisory
    if (weather.temp > 85) {
        return {
            type: 'weather',
            priority: 'high',
            message: `It's ${weather.temp}°F outside. Stay indoors and drink plenty of water.`,
            ttsMessage: `It's quite warm today... ${weather.temp} degrees. Let's stay inside where it's cool... and make sure to drink extra water.`,
        };
    }
    // Cold weather
    if (weather.temp < 35) {
        return {
            type: 'weather',
            priority: 'medium',
            message: `It's ${weather.temp}°F outside. Dress warmly if you go out.`,
            ttsMessage: `It's cold today... ${weather.temp} degrees. If you go outside, make sure to bundle up nice and warm.`,
        };
    }
    // Rain
    if (weather.condition === 'rainy') {
        return {
            type: 'weather',
            priority: 'low',
            message: "It's raining today. Perfect day to stay cozy inside.",
            ttsMessage: "It's a rainy day... perfect for staying cozy inside. Maybe a good book or some music?",
        };
    }
    // Nice weather
    if (weather.temp >= 65 && weather.temp <= 75 && weather.condition === 'sunny') {
        return {
            type: 'weather',
            priority: 'low',
            message: `Beautiful day! ${weather.temp}°F and sunny. Great for a short walk.`,
            ttsMessage: `It's a beautiful day outside... ${weather.temp} degrees and sunny. If you feel up to it, a short walk might feel nice.`,
        };
    }
    return null;
}
/**
 * Generate activity guidance based on time and user state
 */
function getActivityGuidance(timeOfDay, mood, lastActivity) {
    const guidance = {
        morning: {
            low: {
                message: "Let's start gentle today. Maybe some stretches in your chair?",
                ttsMessage: "Let's take it easy this morning... how about some gentle stretches? Just what feels comfortable.",
                action: 'chair_stretches',
            },
            ok: {
                message: "A short morning walk might feel good. Just around the block?",
                ttsMessage: "How about a short walk this morning? Just around the block... fresh air can feel so nice.",
                action: 'short_walk',
            },
            good: {
                message: "You're feeling good! How about a morning walk or some light exercise?",
                ttsMessage: "You seem to be feeling well today... maybe a nice walk or some light exercise?",
                action: 'morning_activity',
            },
        },
        afternoon: {
            low: {
                message: "Rest is important. Maybe sit by a window and enjoy the view?",
                ttsMessage: "It's okay to rest... how about sitting by a window? The light and view can be calming.",
                action: 'rest_time',
            },
            ok: {
                message: "A little movement can boost your energy. Short walk or gentle stretches?",
                ttsMessage: "A bit of movement might help your energy... nothing too much, just what feels right.",
                action: 'light_movement',
            },
            good: {
                message: "Great energy! Maybe some gardening or a hobby you enjoy?",
                ttsMessage: "You have good energy today... how about spending time on something you love? Gardening, crafts, whatever brings you joy.",
                action: 'hobby_time',
            },
        },
        evening: {
            low: {
                message: "Wind down gently. Some calm music or a favorite show?",
                ttsMessage: "Let's wind down peacefully... maybe some calm music or a show you like?",
                action: 'calm_evening',
            },
            ok: {
                message: "Evening is for relaxing. Light reading or gentle music?",
                ttsMessage: "Time to relax... maybe some light reading or peaceful music before bed?",
                action: 'relaxation',
            },
            good: {
                message: "Nice evening! Maybe a phone call with family or friends?",
                ttsMessage: "It's a nice evening... would you like to call someone? Family or friends?",
                action: 'social_connection',
            },
        },
    };
    const selected = guidance[timeOfDay][mood];
    return {
        type: 'activity',
        priority: 'medium',
        ...selected,
    };
}
/**
 * Stress reduction guidance
 */
function getStressReduction(stressLevel) {
    const techniques = {
        high: {
            message: "Let's take some deep breaths together. In slowly... and out slowly...",
            ttsMessage: "I can tell you might be feeling stressed... let's breathe together. Breathe in slowly... two, three, four... and out... two, three, four. You're doing great.",
            action: 'breathing_exercise',
        },
        medium: {
            message: "Feeling a bit tense? Try relaxing your shoulders and taking a few deep breaths.",
            ttsMessage: "Let's relax those shoulders... drop them down... and take a few slow, deep breaths. That's it... you're doing well.",
            action: 'shoulder_relaxation',
        },
        low: {
            message: "You're doing well. Remember to pause and breathe when you need to.",
            ttsMessage: "You're doing just fine... remember, you can always pause and take a breath whenever you need to.",
            action: 'reminder',
        },
    };
    return {
        type: 'rest',
        priority: stressLevel === 'high' ? 'high' : 'medium',
        ...techniques[stressLevel],
    };
}
/**
 * Get all wellness nudges for current time
 */
function getWellnessNudges(timeOfDay, medications, hydration, weather, mood) {
    const nudges = [];
    const currentHour = new Date().getHours();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:00`;
    // Check medications
    for (const med of medications) {
        if (med.times.includes(currentTime)) {
            nudges.push(getMedicationReminder(med, timeOfDay));
        }
    }
    // Check hydration
    const hydrationNudge = getHydrationNudge(hydration, weather.temp);
    if (hydrationNudge)
        nudges.push(hydrationNudge);
    // Check weather
    const weatherNudge = getWeatherPrompt(weather, timeOfDay);
    if (weatherNudge)
        nudges.push(weatherNudge);
    // Add activity guidance
    nudges.push(getActivityGuidance(timeOfDay, mood));
    // Sort by priority
    return nudges.sort((a, b) => {
        const priority = { high: 0, medium: 1, low: 2 };
        return priority[a.priority] - priority[b.priority];
    });
}
