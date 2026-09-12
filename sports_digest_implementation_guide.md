# Sports Digest Application: Developer Implementation Guide

This document serves as a comprehensive blueprint for implementing a personalized sports digest application. It is structured to be read by both human developers and AI coding agents to ensure a systematic build process.

## 1. Architecture & Tech Stack

*   **Frontend Framework:** Next.js (App Router) with TypeScript and Tailwind CSS.
*   **Authentication:** Clerk (integrated with Next.js App Router).
*   **Database & RLS:** Supabase (PostgreSQL).
*   **Email Delivery:** Resend + React Email.
*   **Sports Data Provider:** API-Sports or ESPN Public API.
*   **Background Worker:** Node.js or Python script, containerized via Docker for scheduling (ideal for self-hosted home lab environments like a Synology NAS) or deployed via Vercel Cron.

---

## 2. Database Schema (Supabase)

Execute the following SQL in the Supabase SQL Editor to establish the relational models and map Clerk user IDs to the database.

```sql
-- 1. Profiles Table (Synced via Clerk Webhook)
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY, -- Maps to Clerk's user_id
  email TEXT NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Teams Table (Global Master List)
CREATE TABLE public.teams (
  id TEXT PRIMARY KEY, -- External API team ID
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  league TEXT NOT NULL,
  logo_url TEXT
);

-- 3. User Subscriptions (Junction Table)
CREATE TABLE public.user_subscriptions (
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, team_id)
);

-- 4. Row Level Security (RLS) Helper for Clerk
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$ LANGUAGE SQL STABLE;

-- 5. Apply Policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own subscriptions" 
ON user_subscriptions
FOR ALL USING (user_id = requesting_user_id());
```

---

## 3. Authentication Setup (Clerk -> Supabase)

### 3.1 Clerk Provider & Middleware
Wrap the Next.js layout in `<ClerkProvider>`. Configure `middleware.ts` to protect the `/dashboard` route.

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect()
})
export const config = { matcher: ['/((?!.*\..*|_next).*)', '/', '/(api|trpc)(.*)'] }
```

### 3.2 Webhook Sync
Create an API route at `app/api/webhooks/clerk/route.ts`. Use `svix` to verify the webhook signature. On the `user.created` event, bypass RLS using the Supabase Service Role Key to insert the user into `public.profiles`.

---

## 4. Web Application Implementation

### 4.1 Supabase Client (Clerk JWT Injection)
To allow Next.js Server Actions to write to Supabase securely:

```typescript
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

export function createClerkSupabaseClient(clerkToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${clerkToken}` } } }
  )
}
```

### 4.2 Server Action (Database Mutation)
Create a Server Action (`app/actions.ts`) to handle team subscriptions.
1. Extract `userId` and custom Supabase template token via `auth()` from `@clerk/nextjs/server`.
2. Upsert the team data into `public.teams` (`onConflict: 'id'`).
3. Insert the relationship into `public.user_subscriptions`.

### 4.3 Search UI Component
Build a Client Component (`TeamSearch.tsx`) with the following specifications:
*   Use a debounced state (`useEffect` with `setTimeout`) to query the sports API without rate-limiting.
*   Display results with team logos and league metadata.
*   Implement an "Optimistic UI" pattern when the user clicks "Follow" to provide immediate visual feedback before the Server Action completes.

---

## 5. Background Aggregation Worker & Delivery

This process should run decoupled from the Next.js UI, executing on a weekly cron schedule. A Docker container handles the execution environment cleanly.

### 5.1 Worker Logic Flow
1. **Query Unique Teams:** Fetch all teams that have at least one active subscriber from `public.teams` via `user_subscriptions`.
2. **Fetch API Schedules:** Iterate through the unique teams and query the external sports API for the upcoming 7 days of fixtures (including opponent, UTC time, and broadcast network).
3. **Map to Users:** Query `public.profiles` alongside a joined array of their subscribed `team_id`s.
4. **Timezone Conversion:** For each user, map their teams to the fetched schedule data. Use a library like `date-fns-tz` to convert UTC kickoff times to the user's stored local timezone.

### 5.2 Email Templating (React Email)
Design the email layout utilizing `@react-email/components`.
*   Group matches logically by day (e.g., "Saturday, Sep 19").
*   Keep styling inline (Tailwind support provided by React Email).
*   Compile the component to HTML strings.

### 5.3 Batch Dispatch (Resend)
Use the Resend SDK to dispatch the batched HTML payloads. Structure the API call to utilize Resend's batch sending endpoints to optimize throughput and API limits.

### 5.4 Containerization (Dockerfile)
To run this worker in an isolated environment:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# Using a lightweight cron daemon or a continuous node process with node-cron
CMD ["npm", "run", "start-worker"] 
```
