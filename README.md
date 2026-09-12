# Sports Digest Application

Personalized sports digest application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Clerk**, **Supabase**, **React Email**, and **Resend**.

---

## Features

- **Automated Sports Digest**: Fetches upcoming 7-day fixtures, matches, venues, and TV broadcast networks (ESPN, FOX, CBS, NBC, etc.) across major leagues (NFL, NBA, MLB, NHL, Premier League, MLS, NCAA).
- **Timezone Conversion**: Kickoff times are automatically formatted to each subscriber's preferred local timezone.
- **Debounced Team Search & Optimistic UI**: Instant search with league filters and responsive follow/unfollow buttons.
- **Clerk + Supabase RLS**: Secure authentication and row-level security mapped to Clerk user tokens.
- **React Email + Resend**: Modern inline email template with batch sending support.
- **Flexible Worker Execution**: Standalone CLI script (`npm run start-worker`), containerized Docker deployment (`docker-compose`), or HTTP Cron endpoint (`/api/cron/digest`).

---

## 1. Quick Start

### Step 1: Clone & Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your credentials from Clerk, Supabase, and Resend.

### Step 3: Initialize Supabase Database

In your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql), execute the contents of [`supabase/schema.sql`](./supabase/schema.sql).

This sets up:

- `public.profiles`
- `public.teams`
- `public.user_subscriptions`
- RLS policies and the `requesting_user_id()` function.

### Step 4: Configure Clerk Webhook (Optional but Recommended)

1. Go to your Clerk Dashboard -> **Webhooks**.
2. Add an endpoint pointing to `https://your-domain.com/api/webhooks/clerk`.
3. Subscribe to `user.created`, `user.updated`, and `user.deleted`.
4. Copy the **Signing Secret** and paste it into `CLERK_WEBHOOK_SECRET` in `.env.local`.

---

## 2. Running Locally

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page and `/dashboard`.

---

## 3. Running the Background Digest Worker

### Test Run (Dry Run)

You can test the aggregation logic, fixture fetching, and React Email HTML generation locally without sending real emails:

```bash
npm run test-worker
```

### Production Dispatch

To run the worker and dispatch emails via Resend:

```bash
npm run start-worker
```

### Docker Container Deployment (Homelab / Synology NAS)

Build and run the worker via Docker:

```bash
docker compose up --build
```

You can trigger this container on a weekly schedule using Synology Task Scheduler, crontab, or Portainer.

---

## 4. Project Structure

```
├── app/
│   ├── layout.tsx             # Root layout with ClerkProvider & dark theme
│   ├── page.tsx               # Landing page
│   ├── globals.css            # Tailwind styling
│   ├── actions.ts             # Server actions (follow, unfollow, update timezone)
│   ├── dashboard/page.tsx     # User dashboard
│   └── api/
│       ├── webhooks/clerk/    # Clerk Svix webhook sync
│       ├── teams/search/      # Debounced team search and fixture lookup
│       └── cron/digest/       # Vercel Cron endpoint
├── components/
│   ├── Navbar.tsx             # Header with Clerk auth buttons
│   ├── TeamSearch.tsx         # Client component with debounced search
│   ├── SubscribedTeams.tsx    # Followed teams grid with 1-click unfollow
│   ├── SchedulePreview.tsx    # Upcoming 7-day schedule preview
│   └── TimezoneSelector.tsx   # Timezone selection dropdown
├── emails/
│   └── DigestEmail.tsx        # React Email template
├── lib/
│   ├── supabaseClient.ts      # Supabase client helpers
│   ├── sportsApi.ts           # Sports API provider (ESPN public API)
│   └── types.ts               # Shared TypeScript types
├── worker/
│   └── digest-worker.ts       # Standalone background worker
├── supabase/
│   └── schema.sql             # Supabase schema & RLS setup
└── Dockerfile                 # Worker Dockerfile
```

