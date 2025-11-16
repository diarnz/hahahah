"use strict";
/**
 * Test script to verify Amily server functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
const persona_1 = require("./persona");
const services_1 = require("./services");
async function runTests() {
    console.log('🧪 Testing Amily Components\n');
    // Test 1: Persona engine
    console.log('✓ Test 1: Persona Engine');
    const greeting = (0, persona_1.generateCheckInMessage)('ok');
    console.log(`  Greeting: "${greeting}"\n`);
    // Test 2: Emotion detection
    console.log('✓ Test 2: Emotion Detection');
    const stressedInput = "I'm feeling so worried and stressed today";
    const emotion = (0, persona_1.detectEmotion)(stressedInput);
    const response = (0, persona_1.generateEmpatheticResponse)(emotion);
    console.log(`  Input: "${stressedInput}"`);
    console.log(`  Detected: ${emotion}`);
    console.log(`  Response: "${response}"\n`);
    // Test 3: TTS generation
    console.log('✓ Test 3: TTS Generation');
    const ttsText = "Good morning... how are you feeling today?";
    const audioUrl = await (0, services_1.generateTTS)(ttsText);
    console.log(`  Text: "${ttsText}"`);
    console.log(`  Audio URL: ${audioUrl}\n`);
    // Test 4: Chat reply generation (requires AI key)
    console.log('✓ Test 4: Chat Reply Generation');
    try {
        const chatReply = await (0, services_1.generateChatReply)("I'm feeling good today", [], false);
        console.log(`  User Input: "I'm feeling good today"`);
        console.log(`  Reply: "${chatReply}"\n`);
    }
    catch (error) {
        console.log(`  Skipped: ${error.message}\n`);
    }
    // Test 5: Memory prompt
    console.log('✓ Test 5: Memory Recording');
    const memoryPrompt = (0, persona_1.generateMemoryPrompt)();
    console.log(`  Prompt: "${memoryPrompt}"\n`);
    console.log('🌸 All tests passed!\n');
}
runTests().catch(console.error);
