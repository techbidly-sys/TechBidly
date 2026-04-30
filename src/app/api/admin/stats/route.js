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
    { count: totalOrders },
    { data: revenueData },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('bids').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('orders').select('amount'),
  ]);

  const totalRevenue = (revenueData ?? []).reduce((sum, o) => sum + (o.amount || 0), 0);

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    totalListings: totalListings ?? 0,
    activeListings: activeListings ?? 0,
    totalBids: totalBids ?? 0,
    totalOrders: totalOrders ?? 0,
    totalRevenue,
  });
}
