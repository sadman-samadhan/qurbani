# 🐄 QurbaniSathi — কোরবানি সাথী


## 🚀 Production Deployment Guide (Vercel)

### 1. Prerequisites
- **Node.js 18+** installed locally.
- **Supabase Account**: For database, auth, and spatial queries.
- **Vercel Account**: For hosting and cron jobs.

### 2. Step-by-Step Setup

#### A. Clone & Install
```bash
git clone https://github.com/your-username/qurbani-sathi.git
cd qurbani-sathi
npm install
```

#### B. Supabase Setup
1. Create a new project in [Supabase Dashboard](https://supabase.com).
2. **Enable PostGIS**: Go to **SQL Editor** and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. **Run Migrations**: Copy the content of `supabase/migrations/001_initial_schema.sql` and run it in the SQL Editor.
4. **Auth Settings**: Disable email confirmation (optional, since we use phone-to-email logic) in Authentication > Settings.

#### C. Map Setup
No API keys or accounts are needed for maps. We use **Leaflet.js** with **OpenStreetMap** tiles and **Nominatim** for geocoding.

#### D. Environment Variables
Create a `.env.local` for local development and add these to **Vercel Settings > Environment Variables**:

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (Server-side only) |
| `NEXT_PUBLIC_EID_DATE` | Target Eid Date (e.g., `2025-06-07`) |
| `CRON_SECRET` | A secret string for securing cron jobs |

#### E. Set First Admin
Run this in your Supabase SQL Editor to grant admin access to your phone number:
```sql
UPDATE public.profiles SET is_admin = true WHERE phone = '01XXXXXXXXX';
```

### 3. Local Development
```bash
npm run dev
```

### 4. Vercel Deployment
1. Connect your repository to Vercel.
2. Add all environment variables listed above.
3. Deploy! Vercel will automatically pick up `vercel.json` for the daily cron job.

---

## ✅ Pre-launch Checklist
<!--
[ ] PostGIS extension enabled in Supabase
[ ] All migrations run correctly
[ ] RLS policies verified (test with anon key — contact info should be hidden)
[ ] At least one admin account set up
[ ] Tested on real Android phone (Chrome)
[ ] Tested on real iPhone (Safari)
[ ] Eid date (NEXT_PUBLIC_EID_DATE) set correctly for the current year
-->

## 🛠 Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Maps**: Leaflet.js + OpenStreetMap (via Nominatim)
- **Database**: PostgreSQL + PostGIS (Supabase)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PWA**: manifest.json + Next.js metadata

---
Made with ❤️ for the Muslims of Bangladesh.
