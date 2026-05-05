-- KYB (Know Your Business) verification documents table
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS verifications (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text        NOT NULL CHECK (document_type IN ('business_license', 'bank_statement', 'trade_reference')),
  document_url  text        NOT NULL,   -- storage path inside kyb-documents bucket
  status        text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   uuid        REFERENCES auth.users(id),
  reviewed_at   timestamptz,
  notes         text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own records
CREATE POLICY "verifications_select_own" ON verifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own records
CREATE POLICY "verifications_insert_own" ON verifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin routes use the service-role key which bypasses RLS entirely.

-- Storage bucket for KYB documents (private — no public access)
-- Run this via the Supabase dashboard Storage section or API:
--   supabase storage create kyb-documents --private
-- Then add an RLS policy so users can upload to their own folder:
--   INSERT: bucket_id = 'kyb-documents' AND (storage.foldername(name))[1] = auth.uid()::text
--   SELECT: bucket_id = 'kyb-documents' AND (storage.foldername(name))[1] = auth.uid()::text
