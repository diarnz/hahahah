import { WeatherData, WellnessNudge } from './types';

export function getWeatherPrompt(weather: WeatherData, timeOfDay: string): WellnessNudge | null {
  if (weather.temp > 85) {
    return {
      type: 'weather',
      priority: 'high',
      message: `It's ${weather.temp}°F outside. Stay indoors and drink plenty of water.`,
      ttsMessage: `It's quite warm today... ${weather.temp} degrees. Let's stay inside where it's cool... and make sure to drink extra water.`,
    };
  }

  if (weather.temp < 35) {
    return {
      type: 'weather',
      priority: 'medium',
      message: `It's ${weather.temp}°F outside. Dress warmly if you go out.`,
      ttsMessage: `It's cold today... ${weather.temp} degrees. If you go outside, make sure to bundle up nice and warm.`,
    };
  }

  if (weather.condition === 'rainy') {
    return {
      type: 'weather',
      priority: 'low',
      message: "It's raining today. Perfect day to stay cozy inside.",
      ttsMessage: "It's a rainy day... perfect for staying cozy inside. Maybe a good book or some music?",
    };
  }

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

