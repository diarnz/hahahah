import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  keys: {
    elevenLabs?: string;
    gemini?: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    n8nWebhook?: string;
  };
}

/**
 * Reads API key from file in APIKEYSFORTOMORROW folder
 */
function readKeyFile(filename: string): string | undefined {
  try {
    const keysPath = path.join(__dirname, '..', '..', 'APIKEYSFORTOMORROW', filename);
    if (fs.existsSync(keysPath)) {
      const content = fs.readFileSync(keysPath, 'utf-8').trim();
      return content.length > 0 ? content : undefined;
    }
  } catch (error) {
    console.warn(`Could not read key file ${filename}:`, error);
  }
  return undefined;
}

/**
 * Load configuration - requires real API keys
 */
export function loadConfig(): Config {
  const keys = {
    elevenLabs: process.env.ELEVENLABS_API_KEY || readKeyFile('ElevenLabs.txt'),
    gemini:
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GEMINI_API_KEY ||
      readKeyFile('FeatherlessAI.txt'),
    supabaseUrl: process.env.SUPABASE_URL || readKeyFile('supabase.txt')?.split('\n')[0],
    supabaseKey: process.env.SUPABASE_KEY || readKeyFile('supabase.txt')?.split('\n')[1],
    n8nWebhook: process.env.N8N_WEBHOOK_URL || readKeyFile('n8ns.txt'),
  };

  const config: Config = {
    port: parseInt(process.env.PORT || '3000', 10),
    keys,
  };

  console.log(`🌸 Amily Companion Server`);
  const hasKeys = Object.values(keys).some(k => k && k.length > 0);
  if (!hasKeys) {
    console.warn('⚠️  No API keys detected - some features may not work');
  }

  return config;
}

export const config = loadConfig();
