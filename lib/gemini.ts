import { GoogleGenerativeAI } from "@google/generative-ai";

// Multiple API keys for round-robin rotation to avoid per-key rate limits
const GEMINI_KEYS = (
  process.env.GEMINI_API_KEYS ||
  process.env.GEMINI_API_KEY ||
  ""
)
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

if (GEMINI_KEYS.length === 0) {
  throw new Error(
    "No Gemini API keys configured. Set GEMINI_API_KEYS or GEMINI_API_KEY in .env",
  );
}

let keyIndex = 0;

export function getGeminiModel(config?: {
  model?: string;
  temperature?: number;
}) {
  const key = GEMINI_KEYS[keyIndex % GEMINI_KEYS.length];
  keyIndex++;

  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: config?.model || "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: config?.temperature ?? 0.3,
    },
  });
}

// Keep backward compat
export const genAI = new GoogleGenerativeAI(GEMINI_KEYS[0]);
