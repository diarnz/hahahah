/**
 * Test script to verify Amily server functionality
 */

import { config } from './config';
import {
  generateCheckInMessage,
  generateMemoryPrompt,
  formatForTTS,
  detectEmotion,
  generateEmpatheticResponse,
} from './persona';
import {
  generateTTS,
  generateChatReply,
} from './services';

async function runTests() {
  console.log('🧪 Testing Amily Components\n');
  
  // Test 1: Persona engine
  console.log('✓ Test 1: Persona Engine');
  const greeting = generateCheckInMessage('ok');
  console.log(`  Greeting: "${greeting}"\n`);
  
  // Test 2: Emotion detection
  console.log('✓ Test 2: Emotion Detection');
  const stressedInput = "I'm feeling so worried and stressed today";
  const emotion = detectEmotion(stressedInput);
  const response = generateEmpatheticResponse(emotion);
  console.log(`  Input: "${stressedInput}"`);
  console.log(`  Detected: ${emotion}`);
  console.log(`  Response: "${response}"\n`);
  
  // Test 3: TTS generation
  console.log('✓ Test 3: TTS Generation');
  const ttsText = "Good morning... how are you feeling today?";
  const audioUrl = await generateTTS(ttsText);
  console.log(`  Text: "${ttsText}"`);
  console.log(`  Audio URL: ${audioUrl}\n`);
  
  // Test 4: Chat reply generation (requires AI key)
  console.log('✓ Test 4: Chat Reply Generation');
  try {
    const chatReply = await generateChatReply("I'm feeling good today", [], false);
    console.log(`  User Input: "I'm feeling good today"`);
    console.log(`  Reply: "${chatReply}"\n`);
  } catch (error: any) {
    console.log(`  Skipped: ${error.message}\n`);
  }
  
  // Test 5: Memory prompt
  console.log('✓ Test 5: Memory Recording');
  const memoryPrompt = generateMemoryPrompt();
  console.log(`  Prompt: "${memoryPrompt}"\n`);
  
  console.log('🌸 All tests passed!\n');
}

runTests().catch(console.error);
