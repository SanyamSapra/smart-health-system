import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const hasGeminiKey = Boolean(apiKey);
export default ai;
