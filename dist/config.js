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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.loadConfig = loadConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
/**
 * Reads API key from file in APIKEYSFORTOMORROW folder
 */
function readKeyFile(filename) {
    try {
        const keysPath = path.join(__dirname, '..', '..', 'APIKEYSFORTOMORROW', filename);
        if (fs.existsSync(keysPath)) {
            const content = fs.readFileSync(keysPath, 'utf-8').trim();
            return content.length > 0 ? content : undefined;
        }
    }
    catch (error) {
        console.warn(`Could not read key file ${filename}:`, error);
    }
    return undefined;
}
/**
 * Load configuration - requires real API keys
 */
function loadConfig() {
    const keys = {
        elevenLabs: process.env.ELEVENLABS_API_KEY || readKeyFile('ElevenLabs.txt'),
        gemini: process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_GEMINI_API_KEY ||
            readKeyFile('FeatherlessAI.txt'),
        supabaseUrl: process.env.SUPABASE_URL || readKeyFile('supabase.txt')?.split('\n')[0],
        supabaseKey: process.env.SUPABASE_KEY || readKeyFile('supabase.txt')?.split('\n')[1],
        n8nWebhook: process.env.N8N_WEBHOOK_URL || readKeyFile('n8ns.txt'),
    };
    const config = {
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
exports.config = loadConfig();
