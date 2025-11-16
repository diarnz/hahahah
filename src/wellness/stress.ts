import { WellnessNudge } from './types';

type StressLevel = 'high' | 'medium' | 'low';

export function getStressReduction(stressLevel: StressLevel): WellnessNudge {
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

