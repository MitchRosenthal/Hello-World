/**
 * Database types for the class Supabase schema.
 * Reference: supabase/schema.sql. Match field names to your table (e.g. images).
 */

/** Row from public.images — use columns that exist in your class DB (id, url or image_url, title, created_at, etc.) */
export type Image = {
  id: string;
  url?: string | null;
  image_url?: string | null;
  title?: string | null;
  prompt?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

/** Row from public.captions (caption_votes.caption_id → captions.id) */
export type Caption = {
  id: string;
  image_id: string;
  text?: string | null;
  content?: string | null;
  caption_text?: string | null;
  [key: string]: unknown;
};

/** Insert shape for public.caption_votes (profile_id = auth user id) */
export type CaptionVoteInsert = {
  caption_id: string;
  profile_id: string;
  vote_value: 1 | -1;
  created_datetime_utc: string;
  modified_datetime_utc: string;
};
