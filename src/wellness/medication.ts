import { MedicationSchedule, WellnessNudge } from './types';

export function getMedicationReminder(med: MedicationSchedule, timeOfDay: string): WellnessNudge {
  const withFoodNote = med.withFood ? ' Remember to take it with some food.' : '';

  return {
    type: 'medication',
    priority: 'high',
    message: `Time for your ${med.name} (${med.dosage}).${withFoodNote}`,
    ttsMessage: `Hi... it's time for your ${med.name}. ${med.dosage}.${withFoodNote} I'll wait while you take it... no rush.`,
    action: 'confirm_taken',
  };
}

