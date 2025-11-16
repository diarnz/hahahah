export * from './types';
export { getMedicationReminder } from './medication';
export { getHydrationNudge } from './hydration';
export { getWeatherPrompt } from './weather';
export { getActivityGuidance } from './activity';
export { getStressReduction } from './stress';

import { getMedicationReminder } from './medication';
import { getHydrationNudge } from './hydration';
import { getWeatherPrompt } from './weather';
import { getActivityGuidance } from './activity';
import { HydrationGoal, MedicationSchedule, WeatherData, WellnessNudge } from './types';

export function getWellnessNudges(
  timeOfDay: 'morning' | 'afternoon' | 'evening',
  medications: MedicationSchedule[],
  hydration: HydrationGoal,
  weather: WeatherData,
  mood: 'low' | 'ok' | 'good'
): WellnessNudge[] {
  const nudges: WellnessNudge[] = [];
  const currentHour = new Date().getHours();
  const currentTime = `${currentHour.toString().padStart(2, '0')}:00`;

  for (const med of medications) {
    if (med.times.includes(currentTime)) {
      nudges.push(getMedicationReminder(med, timeOfDay));
    }
  }

  const hydrationNudge = getHydrationNudge(hydration, weather.temp);
  if (hydrationNudge) nudges.push(hydrationNudge);

  const weatherNudge = getWeatherPrompt(weather, timeOfDay);
  if (weatherNudge) nudges.push(weatherNudge);

  nudges.push(getActivityGuidance(timeOfDay, mood));

  return nudges.sort((a, b) => {
    const priority = { high: 0, medium: 1, low: 2 };
    return priority[a.priority] - priority[b.priority];
  });
}

