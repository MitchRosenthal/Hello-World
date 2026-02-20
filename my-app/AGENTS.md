# AGENTS.md

Guidance for AI agents working on this app. Keep this file updated when making significant changes.

---

## Workflow for agents

1. **Before changing auth, layout, routing, or Supabase:** Read this file, especially **Auth rules** and **Conventions**. Do not change callback redirect, server/browser client usage, sign-out flow, or protected-route pattern unless the user explicitly asks.
2. **After making changes:** Add a **new changelog entry at the top** of the Changelog section: date, list of files touched, and a one- or two-line description of what changed. This keeps a running log and helps avoid undoing past progress.
3. **When in doubt:** Prefer minimal edits that preserve existing behavior; refer to the changelog to see why things are set up as they are.

---

## Project overview

- **Name:** Hello World (my-app)
- **Framework:** Next.js 16 (App Router)
- **Auth:** Supabase (Google OAuth) via `@supabase/ssr` and `@supabase/supabase-js`
- **Main surface:** Protected home page showing an images list; login/sign-out in header

---

## Tech stack

| Layer        | Choice |
|-------------|--------|
| Runtime     | Node (Next.js 16) |
| Package mgr| pnpm |
| Styling     | Tailwind CSS, CSS variables (`--foreground`, `--background`) |
| Auth        | Supabase Auth, Google OAuth, session in **cookies** (server + browser) |
| DB / API    | Supabase (env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |

---

## Directory structure (relevant paths)

```
my-app/
├── app/
│   ├── layout.tsx              # Root layout; header + AuthStatus; suppressHydrationWarning on html/body
│   ├── page.tsx                # Home = protected images page (server auth, redirect to /login if no user)
│   ├── globals.css
│   ├── login/
│   │   ├── page.tsx            # Server component; redirect to / if user exists, else <SignInForm />
│   │   └── SignInForm.tsx      # Client; "Sign in with Google" (OAuth, prompt: select_account)
│   ├── auth/
│   │   ├── callback/route.ts   # GET: exchange code for session, redirect to requestUrl.origin only
│   │   └── signout/route.ts    # GET: signOut(), clear sb-* cookies, redirect to /login
│   └── components/
│       └── ImagesList.tsx      # Client list for images + Upvote/Downvote (caption_votes upsert)
├── components/
│   └── AuthStatus.tsx          # Client: user state, Sign in / Sign out; uses getSupabase()
├── lib/
│   └── supabase/
│       ├── server.ts           # createClient() async, uses cookies(); setAll strips options.name
│       └── client.ts           # getSupabase(), createBrowserClient (cookies), cached singleton
├── supabase/
│   ├── schema.sql              # Reference for images
│   └── caption_votes.sql       # caption_votes table + RLS (run in SQL Editor)
└── src/
    └── types/
        └── supabase.ts         # Image, CaptionVoteInsert
```

---

## Auth rules (do not break)

1. **Server client:** Use `createClient()` from `@/lib/supabase/server` only on the server. It is **async** (`await createClient()`). Uses `cookies()` from `next/headers`; in `setAll`, `name` is removed from cookie options before `cookieStore.set()`.
2. **Browser client:** Use `getSupabase()` from `@/lib/supabase/client` in client components. It returns `createBrowserClient` from `@supabase/ssr` (cookie-based). Do not replace with plain `createClient` from `@supabase/supabase-js` (that uses localStorage and desyncs from server).
3. **Callback:** `GET /auth/callback` must only exchange the code and redirect to **origin** (`requestUrl.origin`). Do not change redirect target or add middleware.
4. **Sign out:** Sign-out is a **button** that (1) calls `getSupabase().auth.signOut()`, then (2) navigates to `/auth/signout`. The signout route clears session and all `sb-*` cookies, then redirects to `/login`.
5. **Protected routes:** Guard with server-side `getUser()`; if no user, `redirect("/login")`. Do not rely only on client checks.
6. **Login page:** Server component; if user exists, `redirect("/")`. Only show sign-in UI when no user.
7. **Google OAuth:** Use `queryParams: { prompt: "select_account" }` so users can choose account.
8. **No middleware** for auth; no manual token storage; no changing Supabase env var names.

---

## Conventions

- **Path alias:** `@/` → project root (e.g. `@/lib/supabase/server`).
- **Dynamic routes:** Home uses `export const dynamic = "force-dynamic"`.
- **Hydration:** Layout uses `suppressHydrationWarning` on `<html>` and `<body>` to avoid noise from browser extensions (e.g. `wotdisconnected`).
- **Images:** Fetched on server via the same server Supabase client used for auth; type `Image` from `@/src/types/supabase`.
- **Caption votes:** Table `caption_votes` (caption_id, user_id, vote); RLS allows INSERT/UPDATE only for authenticated user’s own rows. Voting UI and upsert in `ImagesList`; `userId` passed from server; client uses `getSupabase()` for mutations.

---

## Changelog (changes made to the app)

*Agents: append new entries at the top of this section when you change behavior or structure.*

---

### 2025-01-29 — Scrollable meme feed with pagination and vote state

- **Files:** `app/components/Feed.tsx` (new), `app/page.tsx`; **removed:** `app/images/[id]/page.tsx`, `app/images/[id]/CaptionListWithVoting.tsx`
- **Change:** Homepage is a single scrollable feed of caption-image pairs. Feed loads captions in batches of 20 (Supabase range), fetches images for batch in one query, fetches vote state (caption_id, vote_value) for batch in one query; infinite scroll appends batches. Vote handler: select existing by profile_id+caption_id then UPDATE or INSERT; local voteState map highlights upvote/downvote per caption. Image grouping/detail pages removed.

---

### 2025-01-29 — Captions grouped by image; image detail page

- **Files:** `app/page.tsx`, `app/components/ImagesList.tsx`, `app/images/[id]/page.tsx` (new), `app/images/[id]/CaptionListWithVoting.tsx` (new)
- **Change:** Homepage shows each image once (only images with ≥1 caption); each image links to `/images/[id]`. New dynamic route `/images/[id]`: fetches image by id and captions by image_id; renders image + back link + CaptionListWithVoting (same vote insert logic). Voting unchanged; no schema or auth changes.

---

### 2025-01-29 — Render one card per caption (caption–image pairs)

- **Files:** `app/components/ImagesList.tsx`
- **Change:** Iterate over caption–image pairs (flattened from images + captionsByImageId). Each caption renders as its own image card (image + caption text + vote buttons). Images with zero captions do not appear; images with N captions appear N times. Empty state when no captions.

---

### 2025-01-29 — Caption voting: fetch captions table, vote by caption.id

- **Files:** `src/types/supabase.ts`, `app/page.tsx`, `app/components/ImagesList.tsx`
- **Change:** Fetches captions from `captions` table; groups by `image_id` and passes `captionsByImageId` to ImagesList. Each image renders its captions (real rows) underneath; vote buttons use `caption.id` for `caption_id` in caption_votes. Added `Caption` type (id, image_id, text/content/caption_text). No schema or RLS changes.

---

### 2025-01-29 — Caption votes: include created/modified_datetime_utc on insert

- **Files:** `src/types/supabase.ts`, `app/components/ImagesList.tsx`
- **Change:** Insert now sends `created_datetime_utc` and `modified_datetime_utc` (both `new Date().toISOString()`) to satisfy NOT NULL columns.

---

### 2025-01-29 — Caption votes schema: profile_id, vote_value

- **Files:** `src/types/supabase.ts`, `app/components/ImagesList.tsx`
- **Change:** Vote insertion aligned to existing caption_votes table: use `profile_id` (authenticated user id) and `vote_value` (1 | -1). Mutation uses `.insert(row)` only; no schema or RLS changes.

---

### 2025-01-29 — Caption voting (caption_votes)

- **Files:** `supabase/caption_votes.sql` (new), `src/types/supabase.ts`, `app/page.tsx`, `app/components/ImagesList.tsx`
- **Change:** Added caption voting for authenticated users. New table `caption_votes` (caption_id, user_id, vote ±1) with RLS: INSERT/UPDATE only when authenticated and user_id = auth.uid(); SELECT for authenticated. Each image card shows Upvote/Downvote; server passes `userId` to ImagesList; client uses `getSupabase()` to upsert into `caption_votes`. Logged-out users see “Sign in to vote”; mutations require `getUser()` and fail safely. Type `CaptionVoteInsert` added.

---

### 2025-01-29 — AGENTS.md workflow and running log

- **Files:** `AGENTS.md`
- **Change:** Added **Workflow for agents** section: read this file before touching auth/layout/routing/Supabase; add a new changelog entry at the top after making changes; prefer minimal edits. Ensures a running log is kept and past progress is not undone.

---

### 2025-01-29 — Hydration warning fix

- **Files:** `app/layout.tsx`
- **Change:** Added `suppressHydrationWarning` to `<html>` and `<body>` so React ignores attribute mismatches caused by browser extensions (e.g. `wotdisconnected="true"` on `<body>`).

---

### 2025-01-29 — Remove debug instrumentation

- **Files removed:** `app/debug-auth/page.tsx`, `DEBUG-AUTH-CHECKLIST.md`; directory `app/debug-auth/` removed.
- **Files edited:** `app/auth/callback/route.ts`, `components/AuthStatus.tsx`
- **Change:** Removed temporary debug: callback no longer logs session existence; AuthStatus no longer shows “client user / client session exists” or uses `session` state / `getSession()`.

---

### 2025-01-29 — Fix “images page not visible when logged in”

- **Files:** `lib/supabase/client.ts`, `lib/supabase/server.ts`
- **Change:** Browser client switched from `createClient` (supabase-js, localStorage) to `createBrowserClient` (@supabase/ssr, cookies) so client and server share the same cookie-based session. In server `setAll`, strip `name` from cookie options before `cookieStore.set()` to avoid Next.js issues.

---

### 2025-01-29 — Protect images (home); remove dashboard/account

- **Files:** `app/page.tsx`, `app/login/page.tsx`, `app/layout.tsx`; **deleted:** `app/dashboard/page.tsx`, `app/account/page.tsx`
- **Change:** Home page is protected: server `getUser()`, redirect to `/login` if no user; images loaded with server client. Login redirect when user exists changed from `/dashboard` to `/`. Dashboard and Account pages and their nav links removed.

---

### 2025-01-29 — Google account picker

- **Files:** `components/AuthStatus.tsx`, `app/login/SignInForm.tsx`
- **Change:** Added `queryParams: { prompt: "select_account" }` to `signInWithOAuth` so Google shows account chooser after sign-out.

---

### 2025-01-29 — Sign-out fix (cookies + client)

- **Files:** `app/auth/signout/route.ts`, `components/AuthStatus.tsx`
- **Change:** Signout route explicitly clears all `sb-*` cookies (maxAge 0, path `/`) and redirects to `/login`. Sign out in header changed from Link to button: client calls `supabase.auth.signOut()` then `window.location.href = "/auth/signout"`.

---

### 2025-01-29 — Auth flow fixes (login, protected routes, AuthStatus)

- **Files:** `app/login/page.tsx`, `app/login/SignInForm.tsx` (new), `app/dashboard/page.tsx`, `app/account/page.tsx`, `components/AuthStatus.tsx`, `app/auth/signout/route.ts`
- **Change:** Login page made a server component that redirects to `/dashboard` (later `/`) when user exists; sign-in UI moved to client `SignInForm`. Dashboard and account protected with server `getUser()` and redirect to `/login`. AuthStatus: client component with `getUser()` and `onAuthStateChange`; Sign out as Link to `/auth/signout`. Signout route redirect changed from `/` to `/login`.

---

### Earlier — Supabase + auth setup

- **Files:** `lib/supabase/server.ts`, `lib/supabase/client.ts`, `app/auth/callback/route.ts`, env (e.g. `.env.local`), Supabase schema/types
- **Change:** Next.js 15+ async `cookies()`: server `createClient()` made async, `await cookies()`. Callback exchanges code and redirects to origin. Client initially plain supabase-js (later switched to createBrowserClient). Images table and list; RLS/setup as needed.

---

*End of changelog.*
