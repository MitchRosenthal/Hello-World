-- Run this in Supabase SQL Editor to create caption_votes and RLS.
-- caption_id references the item being voted on (e.g. images.id or captions.id).

CREATE TABLE IF NOT EXISTS public.caption_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caption_id uuid NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote       smallint NOT NULL CHECK (vote IN (1, -1)),
  created_at timestamptz DEFAULT now(),
  UNIQUE(caption_id, user_id)
);

-- RLS
ALTER TABLE public.caption_votes ENABLE ROW LEVEL SECURITY;

-- INSERT: only authenticated users, and only for their own user_id
CREATE POLICY "caption_votes_insert_authenticated_own"
  ON public.caption_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- SELECT: allow authenticated users to read votes (e.g. to show counts or disable after vote)
CREATE POLICY "caption_votes_select_authenticated"
  ON public.caption_votes
  FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE: allow users to change their own vote (for upsert / change vote)
CREATE POLICY "caption_votes_update_own"
  ON public.caption_votes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
