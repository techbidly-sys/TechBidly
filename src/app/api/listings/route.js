import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';
import { getProfileRole } from '@/lib/role-guard.js';
import { stripe } from '@/lib/stripe-server.js';
import { runAuctionLifecycleMaintenance } from '@/lib/auction-lifecycle.js';
import { emailNotify } from '@/lib/email.js';

export async function GET(request) {
  await runAuctionLifecycleMaintenance();
  const supabase = await createSupabaseServerClient();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const category = searchParams.get('category')?.trim() ?? '';
  const condition = searchParams.get('condition')?.trim() ?? '';
  const maxPrice = Number(searchParams.get('maxPrice')) || 0;
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

  let query = supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('ends_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (condition) {
    query = query.eq('condition', condition);
  }
  if (maxPrice > 0) {
    query = query.lte('current_bid', maxPrice);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const sellerIds = [...new Set(rows.map((l) => l.seller_id).filter(Boolean))];
  let verifiedSet = new Set();
  if (sellerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .in('id', sellerIds)
      .eq('verification_status', 'verified');
    verifiedSet = new Set((profiles ?? []).map((p) => p.id));
  }

  const listings = rows.map((l) => ({ ...l, seller_verified: verifiedSet.has(l.seller_id) }));
  return NextResponse.json({ listings, total: count ?? 0, offset, limit });
}

export async function POST(request) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await getProfileRole(supabase, user.id);
  if (role !== 'seller') {
    return NextResponse.json({ error: 'Buyer accounts cannot create listings' }, { status: 403 });
  }

  // Require at least one saved payment method before listing
  const { data: sellerProfile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .eq('role', 'seller')
    .maybeSingle();

  if (!sellerProfile?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'A payment card is required before creating listings. Add one in your profile billing settings.' },
      { status: 403 }
    );
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: sellerProfile.stripe_customer_id,
    type: 'card',
  });

  if (paymentMethods.data.length === 0) {
    return NextResponse.json(
      { error: 'A payment card is required before creating listings. Add one in your profile billing settings.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { sellerHandle, form } = body;

  if (!form?.title || !form?.startingBid) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const endsAt = new Date(Date.now() + Number(form.duration) * 24 * 3600 * 1000).toISOString();
  const parts = (form.location ?? '').split(',');
  const city = parts[0]?.trim() ?? '';
  const country = parts.slice(1).join(',').trim();

  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: user.id,
      seller_handle: sellerHandle ?? 'Anonymous Seller',
      title: form.title,
      category: form.category,
      condition: form.condition,
      description: form.description,
      image_url: form.imageUrl || null,
      starting_bid: Number(form.startingBid),
      current_bid: Number(form.startingBid),
      ends_at: endsAt,
      city,
      country,
      quantity: Number(form.quantity) || 1,
      bid_count: 0,
      featured: false,
      status: 'active',
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      auth: { status: 'unverified', fraudScore: 0, checks: [] },
      comparables: [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data?.id) {
    return NextResponse.json({ error: 'Listing created without an identifier' }, { status: 500 });
  }

  // Insert a notification for the seller that their listing is live
  const { error: notifError } = await supabaseAdmin.from('notifications').insert({
    user_id: user.id,
    type: 'listing_posted',
    title: 'Listing posted',
    body: `${data.title} — your auction is now live on the marketplace`,
    listing_id: data.id,
    read: false,
  });
  if (notifError) {
    console.error('Listing posted notification error:', notifError);
  }

  emailNotify.listingPosted(user.id, data.title).catch(() => {});

  return NextResponse.json({ listing: data });
}
