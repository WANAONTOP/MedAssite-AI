// Server-only AI wrapper with dual-provider support.
// IMPORTANT: This file MUST only be imported by server code (route handlers).
// NEVER import from a client component.
//
// Provider selection (automatic):
//   1. If GEMINI_API_KEY is set → try Google Gemini first (gemini-2.0-flash).
//   2. If Gemini fails OR no key → fall back to z-ai-web-dev-sdk (sandbox only,
//      reads /etc/.z-ai-config or ./.z-ai-config).
//
// This keeps the sandbox demo working (z-ai ambient creds) while making the
// app deployable to Vercel (Gemini, which works in US/EU regions).

import { GoogleGenAI } from '@google/genai';

// --- Gemini setup -------------------------------------------------------

let geminiClient: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// --- z-ai setup (dynamic import so Vercel doesn't crash if unconfigured) -

let zaiPromise: Promise<any> | null = null;

async function getZAI(): Promise<any> {
  if (!zaiPromise) {
    zaiPromise = import('z-ai-web-dev-sdk').then((mod) => {
      const ZAI = mod.default;
      return ZAI.create();
    });
  }
  return zaiPromise;
}

// --- Types --------------------------------------------------------------

interface Message {
  role: string;
  content: string;
}

// --- Gemini implementations ---------------------------------------------

async function geminiLlm(
  messages: Message[],
  systemPrompt: string,
): Promise<string> {
  const ai = getGemini();
  if (!ai) throw new Error('GEMINI_API_KEY not set');
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: { systemInstruction: systemPrompt },
  });
  return response.text ?? '';
}

async function geminiVlm(prompt: string, imageDataUrl: string): Promise<string> {
  const ai = getGemini();
  if (!ai) throw new Error('GEMINI_API_KEY not set');
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image data URL');
  const [, mimeType, base64Data] = match;
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType } },
        ],
      },
    ],
  });
  return response.text ?? '';
}

// --- z-ai implementations (fallback) -----------------------------------

async function zaiLlm(
  messages: Message[],
  systemPrompt: string,
): Promise<string> {
  const zai = await getZAI();
  const completion: any = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as any, content: m.content })),
    ],
    thinking: { type: 'disabled' },
  });
  return completion?.choices?.[0]?.message?.content ?? '';
}

async function zaiVlm(prompt: string, imageDataUrl: string): Promise<string> {
  const zai = await getZAI();
  const completion: any = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  });
  return completion?.choices?.[0]?.message?.content ?? '';
}

// --- Public API (with automatic fallback) ------------------------------

/**
 * Run a text chat completion. Tries Gemini first, falls back to z-ai.
 *
 * @param messages     Conversation history ({role, content}[]).
 * @param systemPrompt System instruction.
 */
export async function llm(
  messages: Message[],
  systemPrompt: string,
): Promise<string> {
  // Try Gemini first if key is configured.
  if (process.env.GEMINI_API_KEY) {
    try {
      return await geminiLlm(messages, systemPrompt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[ai.llm] Gemini failed, falling back to z-ai:', msg.slice(0, 120));
      // Fall through to z-ai.
    }
  }
  // Fallback: z-ai (sandbox only).
  try {
    return await zaiLlm(messages, systemPrompt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai.llm] z-ai also failed:', msg);
    throw new Error(`LLM request failed (both providers): ${msg}`);
  }
}

/**
 * Analyze an image with a text prompt. Tries Gemini Vision first, falls back
 * to z-ai VLM.
 *
 * @param prompt       Text instructions/question about the image.
 * @param imageDataUrl A data URL (e.g. `data:image/jpeg;base64,...`).
 */
export async function vlm(prompt: string, imageDataUrl: string): Promise<string> {
  // Try Gemini first if key is configured.
  if (process.env.GEMINI_API_KEY) {
    try {
      return await geminiVlm(prompt, imageDataUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[ai.vlm] Gemini failed, falling back to z-ai:', msg.slice(0, 120));
      // Fall through to z-ai.
    }
  }
  // Fallback: z-ai (sandbox only).
  try {
    return await zaiVlm(prompt, imageDataUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai.vlm] z-ai also failed:', msg);
    throw new Error(`VLM request failed (both providers): ${msg}`);
  }
}
