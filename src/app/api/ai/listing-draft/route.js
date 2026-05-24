import { NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai.js';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You write auction listings for TechBidly, a marketplace for used and refurbished consumer electronics.

Return ONLY valid JSON matching this exact shape:
{
  "title": "string — concise, includes model, key specs, color/finish if relevant; max ~70 chars",
  "description": "string — 2-4 sentences, honest, mentions condition, included accessories, shipping; no marketing fluff",
  "startingBid": integer_usd
}

The startingBid should invite bidding — roughly 50-65% of typical resale value. Keep tone neutral and factual.`;

export async function POST(req) {
  try {
    const { category, condition, hint } = await req.json();

    const openai = getOpenAI();
    const userPrompt = [
      `Category: ${category ?? 'unspecified'}`,
      `Condition: ${condition ?? 'unspecified'}`,
      hint ? `Seller notes: ${hint}` : 'No additional notes — draft a plausible example listing for this category and condition.',
    ].join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
    const draft = JSON.parse(raw);
    return NextResponse.json({ draft });
  } catch (err) {
    console.error('AI listing-draft error:', err);
    return NextResponse.json(
      { error: err.message ?? 'AI listing draft failed' },
      { status: 500 },
    );
  }
}
