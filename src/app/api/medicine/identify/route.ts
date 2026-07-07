import { NextRequest, NextResponse } from 'next/server';
import { vlm } from '@/lib/ai';
import { MEDICINE_LENS_KNOWLEDGE } from '@/lib/prompts';

// POST /api/medicine/identify
// Body: { image: string (data URL or URL), note?: string }
// Returns: { result: string }
//
// Uses VLM (createVision) with MEDICINE_LENS_KNOWLEDGE. The image is passed as
// a data URL directly. On error, returns a graceful fallback so the UI keeps
// working.
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const image = typeof body?.image === 'string' ? body.image.trim() : '';
  if (!image) {
    return NextResponse.json(
      { error: 'An image is required.' },
      { status: 400 },
    );
  }

  const note =
    typeof body?.note === 'string' && body.note.trim().length > 0
      ? body.note.trim()
      : null;

  const prompt =
    MEDICINE_LENS_KNOWLEDGE +
    (note
      ? `\n\nExtra context from the person: ${note}`
      : '\n\nPlease look at this photo of a medicine.');

  let result = '';
  try {
    result = await vlm(prompt, image);
  } catch (err) {
    console.error('[/api/medicine/identify] VLM error:', err);
    return NextResponse.json({
      result:
        "I couldn't read anything useful from this photo — please try a clearer, well-lit shot, or ask a pharmacist directly.",
    });
  }

  if (!result || !result.trim()) {
    return NextResponse.json({
      result:
        "I couldn't read anything useful from this photo — please try a clearer, well-lit shot, or ask a pharmacist directly.",
    });
  }

  return NextResponse.json({ result: result.trim() });
}
