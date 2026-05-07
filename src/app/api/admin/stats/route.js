import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard.js';
import { supabaseAdmin } from '@/lib/supabase-admin.js';

export async function GET() {
  const { forbidden } = await requireAdmin();
  if (forbidden) return forbidden;

  const [
    { count: totalUsers },
    { count: totalListings },
    { count: activeListings },
    { count: totalBids },
    { count: auctionOrders },
    { data: auctionRevenueData },
    { count: mktOrders },
    { data: mktRevenueData },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('bids').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('order_status', 'paid'),
    supabaseAdmin.from('listings').select('current_bid').eq('order_status', 'paid'),
    supabaseAdmin.from('marketplace_orders').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabaseAdmin.from('marketplace_orders').select('total_price').eq('status', 'confirmed'),
  ]);

  const totalOrders = (auctionOrders ?? 0) + (mktOrders ?? 0);
  const totalRevenue =
    (auctionRevenueData ?? []).reduce((sum, o) => sum + (Number(o.current_bid) || 0), 0) +
    (mktRevenueData ?? []).reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    totalListings: totalListings ?? 0,
    activeListings: activeListings ?? 0,
    totalBids: totalBids ?? 0,
    totalOrders,
    totalRevenue,
  });
}
