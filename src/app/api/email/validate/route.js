import { NextResponse } from 'next/server';
import { resolveMx } from 'dns/promises';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email')?.toLowerCase().trim();

  if (!email || !email.includes('@')) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const domain = email.split('@')[1];

  try {
    const mxRecords = await resolveMx(domain);
    const valid = mxRecords && mxRecords.length > 0;
    return NextResponse.json({ valid, email });
  } catch (error) {
    return NextResponse.json({ valid: false, email });
  }
}
