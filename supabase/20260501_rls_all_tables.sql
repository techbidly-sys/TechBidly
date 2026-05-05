-- RLS policies for all user-facing tables.
-- The verifications table already has RLS (see 20260501_verifications.sql).
-- Run this in the Supabase SQL editor.
-- Admin routes use the service-role key which bypasses RLS entirely.

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read profiles (needed for seller display, bid history)
CREATE POLICY "profiles_select_authenticated" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users insert only their own profile row (triggered on signup)
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Users update only their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- LISTINGS
-- ============================================================
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can browse all listings
CREATE POLICY "listings_select_authenticated" ON listings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only verified sellers can create their own listings
CREATE POLICY "listings_insert_seller" ON listings
  FOR INSERT WITH CHECK (
    seller_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'seller')
  );

-- Sellers update only their own listings
CREATE POLICY "listings_update_own" ON listings
  FOR UPDATE USING (seller_id = auth.uid());

-- Sellers delete only their own listings
CREATE POLICY "listings_delete_own" ON listings
  FOR DELETE USING (seller_id = auth.uid());

-- ============================================================
-- BIDS
-- ============================================================
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all bids (needed for bid history and current-bid display)
CREATE POLICY "bids_select_authenticated" ON bids
  FOR SELECT USING (auth.role() = 'authenticated');

-- Buyers insert only their own bids
CREATE POLICY "bids_insert_own" ON bids
  FOR INSERT WITH CHECK (
    buyer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'buyer')
  );

-- No UPDATE or DELETE policies — bids are immutable once placed.

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users see only their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users mark their own notifications as read
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Users can dismiss their own notifications
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- INSERT is service-role only (backend creates notifications on bid/purchase events).
-- No user INSERT policy = users cannot create their own notifications.

-- ============================================================
-- MARKETPLACE_ITEMS
-- ============================================================
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;

-- Authenticated users can browse all marketplace items
CREATE POLICY "marketplace_items_select_authenticated" ON marketplace_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only sellers can create items for themselves
CREATE POLICY "marketplace_items_insert_seller" ON marketplace_items
  FOR INSERT WITH CHECK (
    seller_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'seller')
  );

-- Sellers update only their own items
CREATE POLICY "marketplace_items_update_own" ON marketplace_items
  FOR UPDATE USING (seller_id = auth.uid());

-- Sellers delete only their own items
CREATE POLICY "marketplace_items_delete_own" ON marketplace_items
  FOR DELETE USING (seller_id = auth.uid());

-- ============================================================
-- MARKETPLACE_ORDERS
-- ============================================================
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;

-- Buyers see their own orders
CREATE POLICY "marketplace_orders_select_buyer" ON marketplace_orders
  FOR SELECT USING (buyer_id = auth.uid());

-- Sellers see orders placed against their items
CREATE POLICY "marketplace_orders_select_seller" ON marketplace_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM marketplace_items
      WHERE marketplace_items.id = marketplace_orders.item_id
        AND marketplace_items.seller_id = auth.uid()
    )
  );

-- Buyers place their own orders (service role also inserts — bypasses this check)
CREATE POLICY "marketplace_orders_insert_buyer" ON marketplace_orders
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- Sellers update orders for their items (e.g. adding tracking info)
CREATE POLICY "marketplace_orders_update_seller" ON marketplace_orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM marketplace_items
      WHERE marketplace_items.id = marketplace_orders.item_id
        AND marketplace_items.seller_id = auth.uid()
    )
  );

-- ============================================================
-- ORDERS (admin-only table)
-- Enabling RLS with no user policies blocks all anon/user access.
-- The admin routes use the service-role key which bypasses RLS, so they still work.
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
