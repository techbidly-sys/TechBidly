import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';
import { getProfileRole } from '@/lib/role-guard.js';
import { stripe } from '@/lib/stripe-server.js';

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('ends_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ listings: data ?? [] });
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

  return NextResponse.json({ listing: data });
}
