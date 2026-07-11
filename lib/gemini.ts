import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'The GEMINI_API_KEY environment variable is required but is missing. Please set it in your environment.',
      );
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}
