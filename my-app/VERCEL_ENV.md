# Vercel deployment – environment variables (Assignment 2)

Read-only list page: fetches from the **images** table in the class Supabase database.

1. **Vercel Dashboard** → your project → **Settings** → **Environment Variables**
2. Add (use class Supabase project; do not create a new database):

   | Name                           | Value                     | Environments   |
   | ------------------------------ | ------------------------- | -------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`     | `https://xxx.supabase.co` | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`| your anon key             | Production, Preview, Development |

3. **Redeploy** after saving.

- Get URL and anon key from **Supabase** → **Project Settings** → **API** (class database).
- Do not add/delete tables or fields; use the existing **images** table.
