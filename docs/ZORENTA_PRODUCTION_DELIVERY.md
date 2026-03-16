# Zorenta Production Delivery

## 1. Files Created or Modified

### Created
- `middleware.ts` — Route protection for `/zorenta` (auth cookie check) and rate limiting for `/api/zorenta/*`
- `app/zorenta/error.tsx` — Error boundary for Zorenta routes
- `lib/zorenta/validations.ts` — Zod schemas for job creation and application
- `lib/zorenta/logger.ts` — Simple logger for API errors/warnings
- `supabase/migrations/20250319000000_zorenta_production_indexes.sql` — Index on `care_jobs(care_type)`
- `.env.example` — Example environment variables
- `vercel.json` — Vercel deployment config
- `docs/ZORENTA_PRODUCTION_DELIVERY.md` — This file

### Modified
- `lib/zorenta/matching.ts` — Weights: city 20, region 10, skill 20, care type 15, availability 10, experience 10, rate 10, rating 5; removed country/recent activity
- `app/api/zorenta/jobs/route.ts` — Pagination (limit/offset/total), Zod validation and logger
- `app/api/zorenta/messages/route.ts` — Pagination for messages
- `app/api/zorenta/applications/route.ts` — Pagination for applications
- `app/api/zorenta/conversations/route.ts` — Last message preview per conversation
- `app/api/zorenta/search/route.ts` — Caregiver search returns `average_rating`
- `app/zorenta/messages/page.tsx` — Conversation preview (last message + timestamp)
- `app/zorenta/messages/[id]/page.tsx` — Typing indicator, conversation sidebar (desktop), last message preview in sidebar
- `app/zorenta/search/page.tsx` — Caregiver cards: photo placeholder, skills, experience, rating, hourly rate, availability

---

## 2. SQL Migrations Required

Run in Supabase (after existing Zorenta migrations):

1. **`20250319000000_zorenta_production_indexes.sql`**
   - Adds `idx_care_jobs_care_type` on `care_jobs(care_type)`.

No RLS or table structure changes. All required RLS policies already exist in earlier migrations (profiles, caregiver_profiles, client_profiles, care_jobs, job_applications, conversations, messages, reviews, notifications).

---

## 3. Routes to Test

| Route | What to check |
|-------|----------------|
| `/zorenta` | Redirect to login when not authenticated |
| `/zorenta/login`, `/zorenta/register` | Public access |
| `/zorenta/dashboard` | Protected; role-specific content |
| `/zorenta/jobs` | List with optional pagination params |
| `/zorenta/jobs/new` | Create job (Zod validation) |
| `/zorenta/jobs/[id]` | Job detail |
| `/zorenta/applications` | Applications list (pagination) |
| `/zorenta/messages` | Conversation list + last message preview |
| `/zorenta/messages/[id]` | Thread, typing indicator, conversation sidebar (desktop) |
| `/zorenta/search` | Jobs + caregivers; caregiver cards with rating, experience, rate |
| `/zorenta/notifications` | List; bell in header with unread count |
| `/api/zorenta/*` | Rate limit 120 req/min per IP; 429 when exceeded |

---

## 4. Security Improvements Summary

- **Middleware**
  - All `/zorenta` routes except `/zorenta`, `/zorenta/login`, `/zorenta/register` require Supabase auth cookie; otherwise redirect to `/zorenta/login`.
  - `/api/zorenta/*` rate limited to 120 requests per minute per client IP (in-memory per instance).
- **RLS**
  - Already in place: profiles (own), caregiver/client/org profiles (own + public read for caregivers), care_jobs (read open, poster CRUD), job_applications (applicant + poster), conversations/messages (participants only), reviews (read all, insert own), notifications (own only).
- **Validation**
  - Job creation body validated with Zod (`createJobSchema`); invalid payloads return 400 with first error message.
- **Error handling**
  - Zorenta error boundary catches runtime errors and shows a retry/dashboard message; API routes use `jsonResponse` and logger for errors.

---

## 5. Deployment Steps

1. **Environment**
   - Copy `.env.example` to `.env.local` (local) or set in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

2. **Supabase**
   - Run migrations in order (including `20250319000000_zorenta_production_indexes.sql`).
   - Confirm RLS is enabled and triggers exist for notifications (new application, status change, new message, new review).

3. **Vercel**
   - Connect repo; framework preset Next.js.
   - Set env vars in project settings.
   - Deploy; `vercel.json` uses default Next.js build.

4. **Post-deploy**
   - Open `/zorenta` and confirm redirect to login when not logged in.
   - Log in, create a job, apply as caregiver, check messages and notifications.

5. **Rate limiting**
   - Middleware limit is per-instance (in-memory). For multi-instance or stricter limits, use Vercel KV/Upstash or similar and replace the in-memory map in `middleware.ts`.
