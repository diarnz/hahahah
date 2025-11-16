# 🌸 Amily - Digital Companion for Elderly Users

A gentle, patient, emotionally intelligent digital companion designed to reduce stress, create clarity, and make elderly users feel safe, understood, and never rushed.

## Overview

Amily provides calm guidance, conversation, and assistance through:
- **Daily Check-ins** - Mood assessment and gentle planning
- **MemoryLane** - Recording and preserving life stories
- **Buddy System** - Safe social engagement with voice messages
- **Care Circle** - High-level status notifications for caregivers
- **Utopia Meter** - Engagement and activity tracking

## Design Philosophy

### Personality & Style
- Warm, slow, simple communication
- Short sentences, no technical jargon
- Patient and reassuring: *"It's okay... take your time."*
- Never rushes the user
- Detects emotions: stress, confusion, loneliness, calm

### Design Theme
- **Background**: `#fff7ef` (warm cream)
- **Primary Text**: `#545454` (soft gray)
- **Accent/Warm Tone**: `#ff5757` (gentle red)

## Modes

### Demo Mode (Default)
Automatically activated when no API keys are detected.
- Returns structured JSON responses with placeholder data
- Generates demo audio URLs: `demo://audio1.mp3`
- Simulates all external API calls
- Perfect for testing and development

### Production Mode
Automatically activated when API keys are present.
- Connects to Gemini (reasoning) + ElevenLabs (voice), Supabase, n8n APIs
- Generates actual Gemini replies with real ElevenLabs TTS audio
- Stores data in Supabase database
- Sends Care Circle notifications via n8n webhooks

## Quick Start

### Installation

```powershell
cd Amily
npm install
```

### Running the Server

```powershell
# Development mode (auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

Server runs at `http://localhost:3000`

### Testing

```powershell
# Run component tests
npx tsx src/test.ts
```

## API Endpoints

### `POST /api/checkin`
Daily check-in with mood assessment and plan generation.

**Request:**
```json
{
  "userId": "user123",
  "userInput": "I'm feeling a bit worried today",
  "mood": "low"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "demo",
  "data": {
    "summary": "Let's take the day slowly... a little movement, some rest.",
    "next_step": "How about a short walk after breakfast?",
    "mood": "ok",
    "tags": ["routine", "mobility"]
  },
  "ttsText": "You're doing just fine... let's see what today brings.",
  "audioUrl": "demo://audio1.mp3",
  "timestamp": "2025-11-15T01:45:00.000Z"
}
```

### `POST /api/memory`
Record a life story or memory for MemoryLane.

**Request:**
```json
{
  "userId": "user123",
  "storyInput": "I remember climbing the old oak tree with my brother every summer..."
}
```

**Response:**
```json
{
  "success": true,
  "mode": "demo",
  "data": {
    "title": "The Old Oak Tree",
    "era": "Childhood, 1950s",
    "story_3_sentences": "There was this big oak tree behind our house. My brother and I would climb it every summer. We'd sit up there for hours, watching the world go by.",
    "tags": ["family", "childhood"],
    "quote": "We felt like we could see the whole world from up there."
  },
  "ttsText": "What a wonderful story... I'm listening.",
  "audioUrl": "demo://audio2.mp3",
  "timestamp": "2025-11-15T01:45:00.000Z"
}
```

### `POST /api/buddy`
Process buddy messages with sentiment analysis.

**Request:**
```json
{
  "userId": "user123",
  "messageFrom": "Sarah",
  "messageText": "Hi Mom, thinking of you today! Hope you're doing well."
}
```

**Response:**
```json
{
  "success": true,
  "mode": "demo",
  "data": {
    "summary": "Your friend sent a warm hello... they're thinking of you today.",
    "tone": "warm",
    "suggestion": "Maybe send a little message back when you're ready?"
  },
  "ttsText": "Your friend sent a warm hello...",
  "audioUrl": "demo://audio3.mp3",
  "timestamp": "2025-11-15T01:45:00.000Z"
}
```

### `POST /api/empathy`
Generate empathetic response based on user emotion.

**Request:**
```json
{
  "userInput": "I'm feeling so lonely today"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "demo",
  "data": {
    "emotion": "lonely",
    "response": "I'm here with you... you're not alone. Let's talk for a while."
  },
  "ttsText": "I'm here with you... you're not alone.",
  "audioUrl": "demo://audio4.mp3",
  "timestamp": "2025-11-15T01:45:00.000Z"
}
```

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "mode": "demo",
  "service": "Amily Companion",
  "timestamp": "2025-11-15T01:45:00.000Z"
}
```

### `GET /api/preferences/:userId`
Get user preferences from database.

**Response:**
```json
{
  "success": true,
  "data": {
    "preferredPace": "slow",
    "favoriteTime": "morning",
    "interests": ["gardening", "music"],
    "routineNotes": "Prefers gentle reminders, mornings are slow"
  }
}
```

## Configuration

### Environment Variables

Create a `.env` file (see `.env.example`):

```env
PORT=3000
NODE_ENV=development

# API Keys (optional - uses demo mode if missing)
GEMINI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
SUPABASE_URL=your_url_here
SUPABASE_KEY=your_key_here
N8N_WEBHOOK_URL=your_webhook_url_here
```

### API Key Files

Alternatively, place API keys in `../APIKEYSFORTOMORROW/`:
- `FeatherlessAI.txt` - Gemini API key (reasoning)
- `ElevenLabs.txt` - ElevenLabs API key (for natural voice / TTS)
- `supabase.txt` - Supabase URL (line 1) and key (line 2)
- `n8ns.txt` - n8n webhook URL

The system auto-detects keys and switches to production mode.

## Project Structure

```
Amily/
├── src/
│   ├── config.ts      # Configuration and mode detection
│   ├── schemas.ts     # Zod schemas for JSON validation
│   ├── persona.ts     # Amily's personality engine
│   ├── services.ts    # External API integrations
│   ├── server.ts      # Express server and endpoints
│   └── test.ts        # Component tests
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## JSON Schemas

### PlanJSON
```typescript
{
  summary: string;      // Simple, warm summary of the day plan
  next_step: string;    // Clear actionable next step
  mood: 'low' | 'ok' | 'good';
  tags: string[];       // e.g., ["routine", "social", "mobility"]
}
```

### MemoryJSON
```typescript
{
  title: string;             // Brief title for the memory
  era: string;               // Time period (e.g., "1960s", "College years")
  story_3_sentences: string; // The memory in 3 simple sentences
  tags: string[];            // e.g., ["travel", "family", "work"]
  quote?: string;            // Optional memorable quote
}
```

### SummaryJSON
```typescript
{
  summary: string;           // Warm summary of interaction
  tone: 'warm' | 'neutral';
  suggestion?: string;       // Optional gentle suggestion
}
```

## Safety & Ethics

Amily follows strict ethical guidelines:

- ✅ **Never gives medical, legal, or financial advice**
- ✅ **Reassures, redirects, or provides safe alternatives**
- ✅ **Always respectful, inclusive, and supportive**
- ✅ **Stores only safe, useful preferences** (no sensitive data)
- ✅ **Consent-first sharing** (Buddy system opt-in)
- ✅ **Care Circle gets high-level status only** (no private details)

## TTS Guidelines

Text-to-Speech formatting follows ElevenLabs best practices:

- Natural pauses with ellipsis (...)
- Soft commas for breathing
- Warm, comforting tone
- No emojis unless requested
- Simple, elderly-friendly language

Example:
```
"Alright... let's look at this together. You're doing fine... we can go slowly."
```

## Development

### Building

```powershell
npm run build
```

Compiles TypeScript to `dist/` folder.

### Code Style

- TypeScript with strict mode
- Zod for runtime validation
- Async/await for all API calls
- Clear error handling with user-friendly messages

## Integration Details

### Gemini (Reasoning & Conversation)
- Primary thought partner for Amily’s replies
- Detects tone (confused, lonely, calm) and keeps sentences short
- Adds gentle reminders about pills, water, or rest on first turns
- Runs on `gemini-1.5-pro-002` via the Generative Language API

### ElevenLabs (Voice & TTS)
- Transforms Gemini’s reply into natural speech (Rachel voice)
- Provides warm pacing with breathing pauses and soft inflection
- Uses the `eleven_monolingual_v1` model with configurable stability
- Ensures the chatbox always has an accessible audio companion

### Supabase (Database)
- User preferences storage
- Memory timeline
- Activity tracking
- Buddy message history

### n8n (Workflows)
- Care Circle notifications
- Mood alerts
- Engagement tracking
- Social reminders

## Example Usage

### Daily Check-in Flow

```bash
curl -X POST http://localhost:3000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "userInput": "Feeling good today",
    "mood": "good"
  }'
```

### Record a Memory

```bash
curl -X POST http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "storyInput": "I remember my first job at the bakery..."
  }'
```

## Support

For questions or issues, please ensure:
1. Dependencies are installed (`npm install`)
2. Server is running (`npm run dev`)
3. Check console logs for detailed error messages

## License

MIT

---

**Built with care for those who deserve patience, dignity, and warmth.** 🌸

Team Members:
 - Lirak Hamiti
 - Diar Neziri
 - Lorik Jashari
 - Bardh Hasani 
 - Jon Arifi
"# hahahah" 
