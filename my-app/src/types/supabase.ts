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
