# Humor Study

An image-caption application with an upload flow, generated captions, and a feed for rating captions. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- Upload an image and request captions from a shared generation service.
- Select a favorite generated caption and download it as a meme image.
- Browse and rate captions through the feed.
- Google sign-in with cookie-based sessions.

## Product research

The [three-participant usability study](user_study_report.md) documents observations about navigation, caption-generation feedback, and mobile interactions. The application includes follow-up work on clearer navigation and favorite-caption selection/download. The study is qualitative feedback, not evidence of broad adoption.

## Scope and access

This repository contains the web application and integration with a shared Supabase database and caption-generation API. It does not contain the underlying generation service. The hosted application requires Google sign-in and the appropriate backend access; it is not an anonymous demo.

## Local development

The application lives in `my-app/`.

```bash
cd my-app
pnpm install --frozen-lockfile
```

Create `.env.local` containing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for an authorized project, then run:

```bash
pnpm dev
```

Use a Node.js release supported by Next.js 16. Open http://localhost:3000. Shared database schema, OAuth configuration, and API access are required separately. See [deployment notes](VERCEL_SETUP.md) for repository-specific setup context.
