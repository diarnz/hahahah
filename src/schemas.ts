import { z } from 'zod';

/**
 * PlanJSON: Daily check-in response with mood, summary, and next step
 */
export const PlanJSONSchema = z.object({
  summary: z.string().describe('Simple, warm summary of the day plan'),
  next_step: z.string().describe('Clear actionable next step for the user'),
  mood: z.enum(['low', 'ok', 'good']).describe('User mood assessment'),
  tags: z.array(z.string()).describe('Activity tags like routine, social, mobility'),
});

export type PlanJSON = z.infer<typeof PlanJSONSchema>;

/**
 * MemoryJSON: Captured life story or memory for MemoryLane
 */
export const MemoryJSONSchema = z.object({
  title: z.string().describe('Brief title for the memory'),
  era: z.string().describe('Time period or era (e.g., "1960s", "College years")'),
  story_3_sentences: z.string().describe('The memory told in 3 simple sentences'),
  tags: z.array(z.string()).describe('Categories like travel, family, work'),
  quote: z.string().optional().describe('A memorable quote from the story'),
  image_url: z.string().optional().describe('AI generated illustration for the memory'),
});

export type MemoryJSON = z.infer<typeof MemoryJSONSchema>;

/**
 * SummaryJSON: Summary of buddy messages or interactions
 */
export const SummaryJSONSchema = z.object({
  summary: z.string().describe('Warm summary of the message or interaction'),
  tone: z.enum(['warm', 'neutral']).describe('Detected emotional tone'),
  suggestion: z.string().optional().describe('Optional gentle suggestion or encouragement'),
});

export type SummaryJSON = z.infer<typeof SummaryJSONSchema>;

/**
 * Full API Response with TTS text and audio URL
 */
export const ResponseSchema = z.object({
  success: z.boolean(),
  data: z.union([PlanJSONSchema, MemoryJSONSchema, SummaryJSONSchema, z.any()]),
  ttsText: z.string().optional().describe('Text formatted for ElevenLabs TTS'),
  audioUrl: z.string().optional().describe('Audio URL (base64 data URL)'),
  timestamp: z.string(),
});

export type Response = z.infer<typeof ResponseSchema>;
