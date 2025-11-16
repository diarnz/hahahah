"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseSchema = exports.SummaryJSONSchema = exports.MemoryJSONSchema = exports.PlanJSONSchema = void 0;
const zod_1 = require("zod");
/**
 * PlanJSON: Daily check-in response with mood, summary, and next step
 */
exports.PlanJSONSchema = zod_1.z.object({
    summary: zod_1.z.string().describe('Simple, warm summary of the day plan'),
    next_step: zod_1.z.string().describe('Clear actionable next step for the user'),
    mood: zod_1.z.enum(['low', 'ok', 'good']).describe('User mood assessment'),
    tags: zod_1.z.array(zod_1.z.string()).describe('Activity tags like routine, social, mobility'),
});
/**
 * MemoryJSON: Captured life story or memory for MemoryLane
 */
exports.MemoryJSONSchema = zod_1.z.object({
    title: zod_1.z.string().describe('Brief title for the memory'),
    era: zod_1.z.string().describe('Time period or era (e.g., "1960s", "College years")'),
    story_3_sentences: zod_1.z.string().describe('The memory told in 3 simple sentences'),
    tags: zod_1.z.array(zod_1.z.string()).describe('Categories like travel, family, work'),
    quote: zod_1.z.string().optional().describe('A memorable quote from the story'),
    image_url: zod_1.z.string().optional().describe('AI generated illustration for the memory'),
});
/**
 * SummaryJSON: Summary of buddy messages or interactions
 */
exports.SummaryJSONSchema = zod_1.z.object({
    summary: zod_1.z.string().describe('Warm summary of the message or interaction'),
    tone: zod_1.z.enum(['warm', 'neutral']).describe('Detected emotional tone'),
    suggestion: zod_1.z.string().optional().describe('Optional gentle suggestion or encouragement'),
});
/**
 * Full API Response with TTS text and audio URL
 */
exports.ResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.union([exports.PlanJSONSchema, exports.MemoryJSONSchema, exports.SummaryJSONSchema, zod_1.z.any()]),
    ttsText: zod_1.z.string().optional().describe('Text formatted for ElevenLabs TTS'),
    audioUrl: zod_1.z.string().optional().describe('Audio URL (base64 data URL)'),
    timestamp: zod_1.z.string(),
});
