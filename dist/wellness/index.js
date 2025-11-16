"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStressReduction = exports.getActivityGuidance = exports.getWeatherPrompt = exports.getHydrationNudge = exports.getMedicationReminder = void 0;
exports.getWellnessNudges = getWellnessNudges;
__exportStar(require("./types"), exports);
var medication_1 = require("./medication");
Object.defineProperty(exports, "getMedicationReminder", { enumerable: true, get: function () { return medication_1.getMedicationReminder; } });
var hydration_1 = require("./hydration");
Object.defineProperty(exports, "getHydrationNudge", { enumerable: true, get: function () { return hydration_1.getHydrationNudge; } });
var weather_1 = require("./weather");
Object.defineProperty(exports, "getWeatherPrompt", { enumerable: true, get: function () { return weather_1.getWeatherPrompt; } });
var activity_1 = require("./activity");
Object.defineProperty(exports, "getActivityGuidance", { enumerable: true, get: function () { return activity_1.getActivityGuidance; } });
var stress_1 = require("./stress");
Object.defineProperty(exports, "getStressReduction", { enumerable: true, get: function () { return stress_1.getStressReduction; } });
const medication_2 = require("./medication");
const hydration_2 = require("./hydration");
const weather_2 = require("./weather");
const activity_2 = require("./activity");
function getWellnessNudges(timeOfDay, medications, hydration, weather, mood) {
    const nudges = [];
    const currentHour = new Date().getHours();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:00`;
    for (const med of medications) {
        if (med.times.includes(currentTime)) {
            nudges.push((0, medication_2.getMedicationReminder)(med, timeOfDay));
        }
    }
    const hydrationNudge = (0, hydration_2.getHydrationNudge)(hydration, weather.temp);
    if (hydrationNudge)
        nudges.push(hydrationNudge);
    const weatherNudge = (0, weather_2.getWeatherPrompt)(weather, timeOfDay);
    if (weatherNudge)
        nudges.push(weatherNudge);
    nudges.push((0, activity_2.getActivityGuidance)(timeOfDay, mood));
    return nudges.sort((a, b) => {
        const priority = { high: 0, medium: 1, low: 2 };
        return priority[a.priority] - priority[b.priority];
    });
}
