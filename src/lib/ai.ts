// Server-only ZAI wrapper.
// IMPORTANT: This file imports z-ai-web-dev-sdk, so it MUST only be imported by
// server code (route handlers). NEVER import from a client component.

import ZAI from 'z-ai-web-dev-sdk';

let zaiPromise: Promise<ZAI> | null = null;

/**
 * Lazily create and cache a single ZAI instance.
 */
async function getZAI(): Promise<ZAI> {
  if (!zaiPromise) {
    zaiPromise = ZAI.create().catch((err) => {
      // Reset so next call can retry.
      zaiPromise = null;
      throw err;
    });
  }
  return zaiPromise;
}

/**
 * Run a text chat completion against the ZAI LLM.
 *
 * @param messages       Conversation messages (role: 'user' | 'assistant' | 'system').
 * @param systemPrompt   Prepended as an assistant-role message (per project spec).
 */
export async function llm(
  messages: { role: string; content: string }[],
  systemPrompt: string,
): Promise<string> {
  try {
    const zai = await getZAI();
    const completion: any = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as any, content: m.content })),
      ],
      thinking: { type: 'disabled' },
    });
    return completion?.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`LLM request failed: ${msg}`);
  }
}

/**
 * Run a vision (multimodal) chat completion against the ZAI VLM.
 *
 * @param prompt     Text instructions for the model.
 * @param imageUrl   Image URL or data URL (e.g. `data:image/jpeg;base64,...`).
 *                   Passed through unchanged.
 */
export async function vlm(prompt: string, imageUrl: string): Promise<string> {
  try {
    const zai = await getZAI();
    const completion: any = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });
    return completion?.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`VLM request failed: ${msg}`);
  }
}
