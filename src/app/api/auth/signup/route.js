import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { form } = body ?? {};
  const {
    role,
    companyName,
    taxCountry = 'US',
    taxId,
    addressLine1,
    addressLine2,
    addressCity,
    addressRegion,
    addressPostal,
    addressCountry = 'US',
  } = form ?? {};

  if (!companyName?.trim() || !role) {
    return NextResponse.json({ error: 'Company name and role are required' }, { status: 400 });
  }
  if (!taxId?.trim()) {
    return NextResponse.json({ error: 'Tax ID is required' }, { status: 400 });
  }
  if (role === 'seller' && (!addressLine1?.trim() || !addressCity?.trim())) {
    return NextResponse.json({ error: 'Business address is required for seller accounts' }, { status: 400 });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const handle = companyName.trim();

  // Enforce uniqueness server-side (case-insensitive) excluding the current user
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('handle', handle)
    .neq('id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'A company with this name already exists on TechBidly' },
      { status: 409 }
    );
  }

  const profileData = {
    id: user.id,
    handle,
    role,
    company_name: handle,
    tax_id: taxId.trim(),
    tax_id_country: taxCountry,
    verification_status: 'pending',
    display_anonymous: false,
  };

  if (role === 'seller') {
    profileData.business_address_line1   = addressLine1?.trim() ?? '';
    profileData.business_address_line2   = addressLine2?.trim() ?? '';
    profileData.business_address_city    = addressCity?.trim() ?? '';
    profileData.business_address_region  = addressRegion?.trim() ?? '';
    profileData.business_address_postal  = addressPostal?.trim() ?? '';
    profileData.business_address_country = addressCountry;
  }

  const { error } = await supabaseAdmin.from('profiles').upsert(profileData);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
