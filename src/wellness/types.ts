export interface MedicationSchedule {
  id: string;
  name: string;
  dosage: string;
  times: string[]; // e.g., ["08:00", "20:00"]
  withFood?: boolean;
  notes?: string;
}

export interface HydrationGoal {
  dailyGlasses: number;
  currentGlasses: number;
  lastDrink?: string;
}

export interface WeatherData {
  temp: number;
  condition: string; // sunny, rainy, cloudy, etc.
  humidity: number;
  alerts?: string[];
}

export interface WellnessNudge {
  type: 'medication' | 'hydration' | 'activity' | 'rest' | 'weather';
  priority: 'high' | 'medium' | 'low';
  message: string;
  ttsMessage: string;
  action?: string;
}

