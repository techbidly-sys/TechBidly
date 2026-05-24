import { NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai.js';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are Bidly, the in-app AI copilot for TechBidly — an online auction marketplace for used and refurbished consumer electronics (phones, laptops, tablets, audio gear, gaming).

Your job is to help buyers and sellers:
- Estimate fair bid ranges based on typical resale prices.
- Draft listings (title, condition notes, suggested starting bid, reserve).
- Explain what to check before bidding (battery health, IMEI status, shipping origin, seller rating, etc.).
- Compare devices for resale value and reliability.

Style: concise, practical, friendly. Use short bullets or numbered lists when helpful. Always give a specific number or range rather than a vague answer. Never invent seller names, listing IDs, or claim to look up live data — speak in terms of typical market behavior.`;

export async function POST(req) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-12).map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(m.text ?? m.content ?? ''),
        })),
      ],
      temperature: 0.6,
      max_tokens: 400,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err);
    return NextResponse.json(
      { error: err.message ?? 'AI chat failed' },
      { status: 500 },
    );
  }
}
