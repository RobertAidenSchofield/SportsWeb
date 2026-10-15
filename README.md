# 🏆 Sports Digest

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%26_PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)

**A personalized sports schedule platform and weekly digest service.**  
Follow your favorite teams across NFL, NBA, MLB, NHL, Premier League, MLS, UCL, La Liga, and NCAA College sports. Get upcoming kickoff times, TV broadcast networks, 1-click live calendar sync, and embeddable widgets.

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Calendar & Widgets](#-live-calendar-sync--embed-widgets) • [PWA Support](#-progressive-web-app-pwa) • [Worker & Email](#-weekly-digest-worker)

</div>

---

## ⚡ Key Features

- 🏈 **1,000+ Teams Across 10 Major Leagues**:
  - **Pro Leagues**: NFL, NBA, MLB, NHL, Premier League, MLS, UEFA Champions League, La Liga.
  - **College Sports**: 760+ NCAA Football (FBS/FCS) and 360+ NCAA Basketball teams (Alabama, Texas Longhorns, Ohio State, Georgia, Michigan, etc.).
- 🔍 **Intelligent Fuzzy Search**:
  - **Typo Tolerance**: Fast Damerau-Levenshtein matching handles spelling mistakes and transpositions (e.g. `"cheifs"` ➔ Chiefs, `"warriers"` ➔ Warriors, `"celtcis"` ➔ Celtics).
  - **Sports Nicknames & Slang**: `"pats"`, `"niners"`, `"bucs"`, `"sixers"`, `"cavs"`, `"mavs"`, `"wolves"`, `"man u"`, `"spurs"`, `"dubs"`, etc.
  - **City & Metro Aliases**: `"sf"`, `"la"`, `"philly"`, `"kc"`, `"nyc"`, `"chi"`, `"dfw"`, `"pitt"`, etc.
  - **College Normalization**: Easily finds teams by campus or abbreviation (e.g. `"University of Alabama"` ➔ Alabama Crimson Tide, `"UT Austin"` ➔ Texas Longhorns).
- 📺 **TV Broadcast Station Integration**:
  - Automatically identifies live TV networks (ESPN, FOX, CBS, NBC, ABC, TNT, TBS, Peacock, Prime Video) and renders high-visibility broadcast badges.
- 📅 **1-Click Live Calendar Sync (.ics)**:
  - Dynamic webcal subscription feed compatible with Apple Calendar, Google Calendar, and Microsoft Outlook. Automatically keeps your calendar up to date with new games.
- 🌐 **Public Shareable Schedules & Embed Widgets**:
  - Share your personal team schedule via a public URL (`/share/[userId]`).
  - Embed responsive dark-mode schedule widgets on personal blogs, Notion, or internal dashboards via iframe (`/share/[userId]?embed=true`).
- 📱 **Full Progressive Web App (PWA)**:
  - Installable directly to the home screen on iOS, Android, macOS, and Windows.
  - Service worker with offline shell caching and network-first navigation.
  - Mobile touch-optimized UI with minimum 44px tap targets and iOS Safari auto-zoom prevention.
- 🔐 **Native Supabase Authentication**:
  - Fast, secure sign-in via Email/Password and passwordless Magic Links with PKCE flow.
  - Row Level Security (RLS) on PostgreSQL protecting subscriber profiles and team preferences.
- ✉️ **Automated Weekly Email Digests**:
  - Beautiful HTML emails styled with **React Email** and dispatched via **Resend**.
  - Local timezone conversion using `date-fns-tz` so kickoff times match each user's location.

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/) |
| **Backend & DB** | [Supabase](https://supabase.com/) (`@supabase/ssr`, PostgreSQL, Row-Level Security) |
| **Sports Data API** | ESPN Public Sports Endpoints (Zero API keys required, live schedule & TV broadcast data) |
| **Email Delivery** | [React Email](https://react.email/) + [Resend](https://resend.com/) SDK |
| **Mobile / PWA** | Web App Manifest, Service Worker (`sw.js`), Apple Touch Icons, Dynamic Viewport |
| **Automation** | Standalone Node/TSX Worker (`worker/digest-worker.ts`), Docker, Vercel Cron (`/api/cron/digest`) |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/RobertAidenSchofield/SportsWeb.git
cd SportsWeb
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Resend Email Configuration (Optional for digest dispatch)
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=digest@yourdomain.com

# Cron Job Security Secret (Optional for Vercel Cron)
CRON_SECRET=your_random_secret_token
```

### 3. Initialize Supabase Database

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) ➔ **SQL Editor**.
2. Run the script provided in [`supabase/schema.sql`](./supabase/schema.sql).
3. Under **Authentication** ➔ **URL Configuration**:
   - Set **Site URL** to `http://localhost:3000` (or your production Vercel domain).
   - Add `http://localhost:3000/**` and `https://*.vercel.app/**` to **Redirect URLs**.

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to open the application.

---

## 📅 Live Calendar Sync & Embed Widgets

Each user gets a dedicated subscription link for external calendars and iframe embedding:

### Subscribe in Calendar Apps (.ics)
- **Webcal Feed**: `webcal://yourdomain.com/api/calendar/[userId]`
- **Direct ICS**: `https://yourdomain.com/api/calendar/[userId]`

Compatible with **Apple Calendar**, **Google Calendar**, and **Outlook**. Game dates, kickoff times, TV channels, and opponents sync dynamically.

### Embed Schedule Widget
Embed a live, auto-updating schedule widget on any website or dashboard:

```html
<iframe 
  src="https://yourdomain.com/share/[userId]?embed=true" 
  width="100%" 
  height="600" 
  frameborder="0" 
  style="border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);"
></iframe>
```

---

## 📲 Progressive Web App (PWA)

Sports Digest is a fully compliant Progressive Web App:

- **Home Screen Installation**:
  - **iOS (Safari)**: Tap the Share button ➔ select *"Add to Home Screen"*.
  - **Android / Chrome / Edge**: Automatically displays an in-app *"Install Sports Digest"* prompt.
- **Standalone Display**: Launches without browser address bars for a native app feel.
- **Service Worker (`public/sw.js`)**: Caches app shell, logos, and icons for instant loading.

---

## 📬 Weekly Digest Worker

The background worker aggregates upcoming fixtures for all subscribed users, formats times to their local timezone, compiles the React Email template, and dispatches via Resend.

### Dry Run (Test without sending emails)
```bash
npm run test-worker
```

### Production Email Dispatch
```bash
npm run start-worker
```

### Docker Deployment (Homelab / Synology NAS)
A `Dockerfile` and `docker-compose.yml` are included to run the worker on a weekly cron schedule in self-hosted environments:

```bash
docker compose up -d --build
```

### Vercel Cron
You can also trigger digests via Vercel Cron or an external webhook:
```bash
curl -X GET https://yourdomain.com/api/cron/digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 💻 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server at `localhost:3000`. |
| `npm run build` | Builds the optimized production application (~5 seconds). |
| `npm run typecheck` | Runs isolated TypeScript checks (`tsc --noEmit`) with 0 hang risk. |
| `npm run clean` | Cleans `.next` and TypeScript build caches. |
| `npm run test-worker` | Runs the aggregation worker in dry-run mode (no emails sent). |
| `npm run start-worker` | Dispatches weekly digest emails to all subscribers. |

---

## 📁 Project Structure

```
SportsWeb/
├── app/
│   ├── actions.ts             # Server actions (follow/unfollow, timezone preferences)
│   ├── layout.tsx             # Root layout (PWA registration, viewport, navigation)
│   ├── manifest.ts            # Dynamic Web App Manifest configuration
│   ├── page.tsx               # High-converting landing page
│   ├── dashboard/page.tsx     # User dashboard (followed teams, sync, schedules)
│   ├── share/[userId]/        # Public schedule view & iframe embed widget
│   ├── auth/callback/         # Supabase PKCE auth exchange handler
│   └── api/
│       ├── calendar/[userId]/ # Live .ics dynamic calendar feed generator
│       ├── teams/search/      # Fuzzy team search API endpoint
│       └── cron/digest/       # Vercel Cron trigger route
├── components/
│   ├── Navbar.tsx             # Header with Supabase auth modals
│   ├── TeamSearch.tsx         # Fuzzy search with progressive auto-scroll
│   ├── SubscribedTeams.tsx    # Followed teams grid with 1-click management
│   ├── SchedulePreview.tsx    # 7-day schedule with ESPN TV broadcast badges
│   ├── CalendarSyncCard.tsx   # 1-click calendar sync & widget embed modal
│   ├── InstallPwaPrompt.tsx   # Native PWA install prompt banner
│   └── PwaRegister.tsx        # Service worker client registrar
├── emails/
│   └── DigestEmail.tsx        # React Email component with dark theme styling
├── lib/
│   ├── sportsApi.ts           # ESPN data fetcher, typo-tolerant fuzzy engine, aliases
│   ├── supabaseServer.ts      # Supabase server client (cookies & SSR)
│   ├── supabaseBrowser.ts     # Supabase client-side browser client
│   └── types.ts               # Shared TypeScript interfaces
├── public/
│   ├── icons/                 # PWA icons (192x192, 512x512, maskable, apple-touch)
│   └── sw.js                  # PWA service worker with cache strategies
└── worker/
    └── digest-worker.ts       # Standalone aggregation & batch email dispatch worker
```

---

## 📄 License

MIT License. Free to use, modify, and distribute.
