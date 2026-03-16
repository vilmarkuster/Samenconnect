# Zorenta – System Reference

Complete reference for the healthcare marketplace: database tables, migrations, routes, and how to test.

---

## 1. Database tables

All tables live in the `public` schema. `profiles.id` = `auth.users(id)`.

| Table | Purpose |
|-------|--------|
| **profiles** | One row per user; links auth to role (caregiver, client, organization, admin). Columns: id (PK, FK → auth.users), display_name, role, avatar_url, created_at, updated_at. |
| **caregiver_profiles** | Extended profile for caregivers. Columns: id, profile_id (FK → profiles), headline, bio, skills (text[]), experience_years, availability, city, region, country, latitude, longitude, certifications, hourly_rate, created_at, updated_at. |
| **client_profiles** | Extended profile for clients. Columns: id, profile_id (FK → profiles), care_needs, preferred_location, preferred_care_type, city, region, country, latitude, longitude, created_at, updated_at. |
| **organization_profiles** | Extended profile for organizations. Columns: id, profile_id (FK → profiles), name, org_type, description, contact_person, city, region, country, latitude, longitude, created_at, updated_at. |
| **care_jobs** | Vacatures. Columns: id, poster_id (FK → profiles), poster_type (client|organization), title, description, city, region, country, care_type, budget_min, budget_max, schedule, status (open|closed|filled), created_at, updated_at. |
| **job_applications** | Sollicitaties. Columns: id, job_id (FK → care_jobs), applicant_id (FK → profiles), message, status (pending|shortlisted|accepted|rejected), created_at, updated_at. Unique(job_id, applicant_id). |
| **conversations** | 1:1 gesprekken. Columns: id, job_id (nullable), participant_1, participant_2 (FK → profiles), created_at, updated_at. participant_1 < participant_2. |
| **messages** | Berichten. Columns: id, conversation_id (FK → conversations), sender_id (FK → profiles), body, created_at. |
| **reviews** | Reviews van zorgverleners. Columns: id, reviewer_id, reviewee_id (FK → profiles), job_id (nullable), rating (1–5), comment, created_at. Unique(reviewer_id, reviewee_id, job_id). |
| **notifications** | In-app notificaties. Columns: id, user_id (FK → profiles), type, title, body, link, read_at, created_at. |

RLS is enabled on all of these; policies are defined in the migrations.

---

## 2. Migrations (run in order)

Run in Supabase **SQL Editor** in this order:

| # | File | Purpose |
|---|------|--------|
| 1 | `supabase/migrations/20250315000000_zorenta_phase1.sql` | profiles, caregiver_profiles, client_profiles, organization_profiles + RLS. |
| 2 | `supabase/migrations/20250315100000_zorenta_profiles_id_fk.sql` | **Only if** you had the old schema (auth_user_id). Fixes profiles so id = auth user id. |
| 3 | `supabase/migrations/20250315200000_zorenta_mvp_full.sql` | Profile extensions; care_jobs, job_applications, conversations, messages, reviews, notifications; RLS; triggers (new application, application status change). |
| 4 | `supabase/migrations/20250316000000_zorenta_public_caregiver_read.sql` | Public read on caregiver_profiles and profiles (for search and public caregiver profile). |
| 5 | `supabase/migrations/20250316000001_zorenta_notify_message.sql` | Trigger: notify recipient on new message. |

---

## 3. Created routes

### App routes (pages)

| Route | File | Description |
|-------|------|-------------|
| `/zorenta` | `app/zorenta/page.tsx` | Redirect → dashboard. |
| `/zorenta/login` | `app/zorenta/login/page.tsx` | Login. |
| `/zorenta/register` | `app/zorenta/register/page.tsx` | Register + role + complete profile. |
| `/zorenta/dashboard` | `app/zorenta/dashboard/page.tsx` | Role-specific dashboard (jobs, applications, notifications). |
| `/zorenta/profile` | `app/zorenta/profile/page.tsx` | Redirect to role-specific profile edit. |
| `/zorenta/jobs` | `app/zorenta/jobs/page.tsx` | Job listing (filter by city). |
| `/zorenta/jobs/new` | `app/zorenta/jobs/new/page.tsx` | Create job (client/org). |
| `/zorenta/jobs/[id]` | `app/zorenta/jobs/[id]/page.tsx` | Job detail + apply (caregiver). |
| `/zorenta/jobs/[id]/edit` | `app/zorenta/jobs/[id]/edit/page.tsx` | Edit job (poster). |
| `/zorenta/applications` | `app/zorenta/applications/page.tsx` | My applications (caregiver) or applicants (client/org); status dropdown, “Bericht sturen”. |
| `/zorenta/messages` | `app/zorenta/messages/page.tsx` | Inbox (conversations). |
| `/zorenta/messages/[id]` | `app/zorenta/messages/[id]/page.tsx` | Conversation thread + send message. |
| `/zorenta/search` | `app/zorenta/search/page.tsx` | Search jobs / caregivers (tabs, city filter). |
| `/zorenta/caregivers/[id]` | `app/zorenta/caregivers/[id]/page.tsx` | Public caregiver profile + reviews. |
| `/zorenta/reviews` | `app/zorenta/reviews/page.tsx` | Info page (reviews on caregiver profile). |
| `/zorenta/notifications` | `app/zorenta/notifications/page.tsx` | Notification list + mark read. |
| `/zorenta/caregivers/me/edit` | `app/zorenta/caregivers/me/edit/page.tsx` | Edit own caregiver profile. |
| `/zorenta/clients/me/edit` | `app/zorenta/clients/me/edit/page.tsx` | Edit own client profile. |
| `/zorenta/organizations/me/edit` | `app/zorenta/organizations/me/edit/page.tsx` | Edit own organization profile. |

### API routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/zorenta/auth/register` | Register profile (role, display_name). Body: `{ role, display_name }`. |
| GET | `/api/zorenta/me` | Current user profile + role profile. |
| PUT | `/api/zorenta/me` | Update profile (display_name, avatar_url). |
| GET/POST/PUT | `/api/zorenta/caregivers/me` | Own caregiver profile. |
| GET/POST/PUT | `/api/zorenta/clients/me` | Own client profile. |
| GET/POST/PUT | `/api/zorenta/organizations/me` | Own organization profile. |
| GET | `/api/zorenta/caregivers/[id]` | Public caregiver profile + reviews (no auth). |
| GET | `/api/zorenta/jobs` | List jobs (query: status, city, care_type). |
| POST | `/api/zorenta/jobs` | Create job (client/org). |
| GET | `/api/zorenta/jobs/[id]` | Job detail. |
| PUT | `/api/zorenta/jobs/[id]` | Update job (poster). |
| GET | `/api/zorenta/applications` | My applications or applicants (role-based). Query: `job_id` for one job. |
| POST | `/api/zorenta/applications` | Apply to job (caregiver). Body: `{ job_id, message? }`. |
| GET | `/api/zorenta/applications/[id]` | One application. |
| PUT | `/api/zorenta/applications/[id]` | Update status (poster) or withdraw (caregiver). Body: `{ status }`. |
| GET | `/api/zorenta/conversations` | My conversations. |
| POST | `/api/zorenta/conversations` | Start conversation. Body: `{ other_user_id }`. |
| GET | `/api/zorenta/messages?conversation_id=` | Messages in a conversation. |
| POST | `/api/zorenta/messages` | Send message. Body: `{ conversation_id, body }`. |
| GET | `/api/zorenta/reviews?reviewee_id=` | Reviews for a caregiver + average. |
| POST | `/api/zorenta/reviews` | Create review (client/org). Body: `{ reviewee_id, rating, comment?, job_id? }`. |
| GET | `/api/zorenta/notifications` | My notifications. Query: `unread=true`. |
| PATCH | `/api/zorenta/notifications` | Mark read. Body: `{ id? }` (or omit to mark all). |
| GET | `/api/zorenta/search?type=caregivers|jobs&city=&skills=` | Search caregivers or jobs. |
| GET | `/api/zorenta/dashboard` | Dashboard stats (role-specific). |

All authenticated API routes expect header: `Authorization: Bearer <access_token>`.

---

## 4. How to test the full system

### Prerequisites

- Supabase project with migrations 1–5 applied.
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`).
- `npm run dev`; open `http://localhost:3000/zorenta`.

---

### Phase 1 – Jobs marketplace

1. Register as **Client** or **Organization** and complete profile.
2. **Dashboard** → “Vacatures” or go to **Vacatures** → “Nieuwe vacature”.
3. Create a job (title, description, city, type, schedule, budget).
4. **Vacatures** list shows the job; open it to see detail.
5. **Dashboard** shows “Mijn vacatures” and the new job.

---

### Phase 2 – Applications

1. Log out; register as **Caregiver** and complete caregiver profile.
2. **Vacatures** → open the job created above → “Sollicitatie versturen” (optional message).
3. **Sollicitaties** (caregiver): your application appears with status “pending”.
4. Log in as the **Client/Organization** that posted the job.
5. **Sollicitaties**: see the applicant; use the **status dropdown** (Pending / Shortlist / Geaccepteerd / Afgewezen).
6. Change to “Geaccepteerd”; the caregiver receives a notification (if triggers run with sufficient privileges).

---

### Phase 3 – Messaging

1. As **Client/Organization**, open **Sollicitaties** and click “Bericht sturen” on an applicant.
2. You are redirected to **Berichten** → conversation; type a message and send.
3. Log in as the **Caregiver**; open **Berichten** → open the conversation and reply.
4. The other user gets a “Nieuw bericht” notification (after migration 5).

---

### Phase 4 – Search

1. **Zoeken** → tab “Vacatures” or “Zorgverleners”.
2. Optionally enter a city and click “Zoeken”.
3. Jobs list or caregivers list updates; click a **caregiver** to open **Profiel** (public) with reviews.

---

### Phase 5 – Reviews

1. As **Client/Organization**, open a **caregiver profile** (e.g. from Zoeken or from Sollicitaties → “Profiel bekijken”).
2. Reviews and average rating are shown (empty until someone leaves a review).
3. To add a review: use the API (POST `/api/zorenta/reviews` with `reviewee_id`, `rating` 1–5, optional `comment`, `job_id`) or add a “Review schrijven” form on the caregiver profile page later.
4. After a review exists, the caregiver’s public profile shows rating and reviews.

---

### Phase 6 – Notifications

1. **Notificaties** in the sidebar; bell icon in the header shows unread count.
2. Trigger “new application”: as caregiver, apply to a job → poster gets “Nieuwe sollicitatie”.
3. Trigger “application status”: as poster, set application to accepted/rejected → applicant gets “Sollicitatie geaccepteerd/afgewezen”.
4. Trigger “new message”: send a message → other user gets “Nieuw bericht”.
5. Open a notification and use “Als gelezen markeren”; or mark all read from the list.

---

### Quick flow (all roles)

1. **Client**: Register → complete profile → create job.
2. **Caregiver**: Register → complete profile → search jobs → apply → open Sollicitaties.
3. **Client**: Sollicitaties → set status “Shortlist” or “Geaccepteerd” → “Bericht sturen” → send message.
4. **Caregiver**: Berichten → reply; Notificaties → see application accepted and new message.
5. **Client**: Open caregiver profile from Sollicitaties → see reviews (or add one via API).
6. **Caregiver**: Zoeken → Vacatures (filter city); Zoeken → Zorgverleners → open a profile to see reviews.

This completes the Zorenta system reference. Use it to verify migrations, routes, and end-to-end behaviour.
