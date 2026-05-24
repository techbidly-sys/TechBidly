import { NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are TechBidly's AI photo grader. You analyze photos of used consumer electronics that a seller wants to list at auction.

Return ONLY valid JSON matching this exact shape:
{
  "device": "string — model + storage + color if visible, e.g. 'iPhone 15 Pro Max — 256 GB Natural Titanium'",
  "condition": "one of: 'Mint', 'Excellent', 'Good', 'Fair', 'For Parts'",
  "conditionConfidence": "integer 0-100",
  "issues": ["short string", "..."],
  "bidRange": { "low": integer_usd, "high": integer_usd },
  "suggestedStart": integer_usd,
  "fraudScore": "integer 0-100, higher = more trustworthy/authentic",
  "checks": [
    { "label": "Original photos", "pass": boolean },
    { "label": "No AI-generated images", "pass": boolean },
    { "label": "No stock photo match", "pass": boolean },
    { "label": "Metadata consistent", "pass": boolean }
  ],
  "description": "2-3 sentence honest description suitable as a listing draft"
}

Pricing guidance: suggestedStart should be ~60-70% of bidRange.low to invite competitive bidding. Be conservative on condition grading — note any visible wear in 'issues'. If you cannot identify the device, return device: 'Unknown device' and condition: 'Fair' with low confidence.`;

export async function POST(req) {
  try {
    const { images } = await req.json();
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'images array is required (base64 data URLs)' }, { status: 400 });
    }

    const openai = getOpenAI();
    const content = [
      { type: 'text', text: 'Analyze these photos and return the JSON grading.' },
      ...images.slice(0, 6).map((url) => ({ type: 'image_url', image_url: { url } })),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_completion_tokens: 700,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
    const result = JSON.parse(raw);
    return NextResponse.json({ result });
  } catch (err) {
    console.error('AI photo-grade error:', err);
    return NextResponse.json(
      { error: err.message ?? 'AI photo grading failed' },
      { status: 500 },
    );
  }
}
