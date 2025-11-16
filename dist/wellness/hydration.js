"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHydrationNudge = getHydrationNudge;
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
