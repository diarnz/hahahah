import { WellnessNudge } from './types';

type TimeOfDay = 'morning' | 'afternoon' | 'evening';
type Mood = 'low' | 'ok' | 'good';

export function getActivityGuidance(
  timeOfDay: TimeOfDay,
  mood: Mood,
  lastActivity?: string
): WellnessNudge {
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

