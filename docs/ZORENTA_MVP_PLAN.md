# Zorenta MVP – Plan & Architecture

Healthcare marketplace connecting caregivers, clients, and healthcare organizations. Built inside the existing Next.js + Supabase project.

---

## 1. MVP Scope

### In scope (launch)

| Area | Features |
|------|----------|
| **Auth** | Registration, login, logout via Supabase Auth. Role: caregiver, client, organization, admin. |
| **Profiles** | Caregiver profile (skills, experience, availability, location). Client profile (care needs, location). Organization profile (name, type, location). |
| **Care jobs** | Organizations/clients post jobs (title, description, location, type, pay range). List, detail, create, edit. |
| **Search** | Search caregivers by location, skills, availability. Basic filters. |
| **Applications** | Caregivers apply to jobs. Status: pending, accepted, rejected. List applications per job and per caregiver. |
| **Messaging** | 1:1 conversations (DB-backed). Thread list, thread view, send message. No real-time required for MVP (poll or refresh). |
| **Reviews** | Rate and review caregivers (from clients/orgs) or jobs (from caregivers). Display average rating and list of reviews. |
| **Notifications** | In-app only: new application, new message, application update. Stored in `notifications` table, badge/link in UI. |
| **Location** | Store location (city/region or lat/lng). Location-based search (e.g. same city / radius). No maps required for MVP. |

### Out of scope (post-MVP)

- Real-time messaging (WebSockets/presence).
- Payments (Stripe, invoicing).
- Mobile app (Flutter / React Native).
- Video calls.
- Document verification / background checks.
- Advanced matching algorithm (ML); MVP = filter-based search.
- Separate backend (Express); all logic in Next.js API routes + Supabase.

### Coexistence with existing app

- **Keep unchanged:** Dashboard, AI Chat, Agents, Workflows, Prompt Library, Generated Apps, Task Runner, Settings.
- **Zorenta lives under:** `/zorenta` (or `/marketplace`) with its own layout: sidebar/tabs for Zorenta, shared Supabase and auth.
- **Auth:** One Supabase project. Users can be “platform users” (dashboard) and/or “Zorenta users” (role in `profiles` or org). Optional: separate Zorenta login flow that still uses Supabase Auth.

---

## 2. Recommended Architecture

### High level

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App                                                    │
│  ├── /dashboard, /chat, /agents, ... (existing)                 │
│  └── /zorenta                                                    │
│       ├── /login, /register                                      │
│       ├── /caregivers, /caregivers/[id], /caregivers/me          │
│       ├── /clients, /clients/me                                   │
│       ├── /organizations, /organizations/[id], /organizations/me  │
│       ├── /jobs, /jobs/[id], /jobs/new                           │
│       ├── /applications                                          │
│       ├── /messages                                              │
│       └── /reviews                                               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js API routes (/api/zorenta/...)                           │
│  Auth: Supabase Auth (session from cookie or client)             │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL + Auth)                                    │
│  Tables: users (extended via profiles), caregiver_profiles,      │
│          client_profiles, organization_profiles, care_jobs,       │
│          applications, messages, reviews, notifications           │
└─────────────────────────────────────────────────────────────────┘
```

### Auth strategy

- Use **Supabase Auth** for all Zorenta users (email/password for MVP).
- Store **role** and **Zorenta-specific profile** in DB:
  - Option A: `auth.users` + one `profiles` table with `role` and optional `caregiver_profile_id`, `client_profile_id`, `organization_profile_id`.
  - Option B: `auth.users` + `zorenta_users` (id, auth_user_id, role, created_at) and then caregiver/client/org profiles reference `zorenta_users.id`.
- Recommended: **Single `profiles` table** (or `zorenta_users`) linking `auth.users.id` to role and to the appropriate profile table(s). One user can have one role for MVP (caregiver **or** client **or** organization **or** admin).

### Where Zorenta lives in the repo

- **Routes:** `app/zorenta/` (or `app/(zorenta)/` group with its own layout).
- **API:** `app/api/zorenta/` (e.g. `api/zorenta/jobs/route.ts`, `api/zorenta/applications/route.ts`).
- **Components:** `components/zorenta/` for marketplace-specific UI; reuse `components/ui` (Card, Button, Table, etc.).
- **Lib:** `lib/zorenta/` for helpers (e.g. matching score, distance).

---

## 3. Database Schema

### Tables (PostgreSQL via Supabase)

- **auth.users** – Supabase built-in; use for login/register.
- **profiles** (or **zorenta_users**) – Links auth to role and profile IDs.

```text
profiles
  id                uuid PK default gen_random_uuid()
  auth_user_id      uuid UNIQUE NOT NULL references auth.users(id) on delete cascade
  role              text NOT NULL  -- 'caregiver' | 'client' | 'organization' | 'admin'
  display_name      text
  avatar_url        text
  created_at        timestamptz default now()
  updated_at        timestamptz default now()
```

- **caregiver_profiles**

```text
caregiver_profiles
  id                uuid PK default gen_random_uuid()
  profile_id        uuid UNIQUE NOT NULL references profiles(id) on delete cascade
  headline          text
  bio               text
  skills            text[]  -- or jsonb
  experience_years  int
  availability      text   -- e.g. 'full_time' | 'part_time' | 'on_call'
  city              text
  region            text
  country           text
  latitude          numeric
  longitude         numeric
  created_at        timestamptz default now()
  updated_at        timestamptz default now()
```

- **client_profiles**

```text
client_profiles
  id                uuid PK default gen_random_uuid()
  profile_id        uuid UNIQUE NOT NULL references profiles(id) on delete cascade
  care_needs        text
  preferred_location text
  city              text
  region            text
  country           text
  latitude          numeric
  longitude         numeric
  created_at        timestamptz default now()
  updated_at        timestamptz default now()
```

- **organization_profiles**

```text
organization_profiles
  id                uuid PK default gen_random_uuid()
  profile_id        uuid UNIQUE NOT NULL references profiles(id) on delete cascade
  name              text NOT NULL
  org_type          text   -- 'home_care' | 'nursing_home' | 'hospital' | 'agency' | 'other'
  description       text
  city              text
  region            text
  country           text
  latitude          numeric
  longitude         numeric
  created_at        timestamptz default now()
  updated_at        timestamptz default now()
```

- **care_jobs**

```text
care_jobs
  id                uuid PK default gen_random_uuid()
  poster_profile_id uuid NOT NULL references profiles(id) on delete cascade
  poster_type       text NOT NULL  -- 'client' | 'organization'
  title             text NOT NULL
  description       text
  job_type          text   -- 'full_time' | 'part_time' | 'one_time' | etc.
  city              text
  region            text
  country           text
  latitude          numeric
  longitude         numeric
  pay_min           numeric
  pay_max           numeric
  pay_period        text   -- 'hourly' | 'daily' | 'monthly'
  status            text default 'open'  -- 'open' | 'filled' | 'cancelled'
  created_at        timestamptz default now()
  updated_at        timestamptz default now()
```

- **applications**

```text
applications
  id                uuid PK default gen_random_uuid()
  job_id            uuid NOT NULL references care_jobs(id) on delete cascade
  caregiver_profile_id uuid NOT NULL references caregiver_profiles(id) on delete cascade
  message           text
  status            text default 'pending'  -- 'pending' | 'accepted' | 'rejected'
  created_at        timestamptz default now()
  updated_at        timestamptz default now()
  UNIQUE(job_id, caregiver_profile_id)
```

- **conversations** (optional; can derive from messages)

```text
conversations
  id                uuid PK default gen_random_uuid()
  participant_1     uuid NOT NULL references profiles(id)
  participant_2     uuid NOT NULL references profiles(id)
  created_at        timestamptz default now()
  updated_at        timestamptz default now()
  UNIQUE(least(participant_1, participant_2), greatest(participant_1, participant_2))
```

- **messages**

```text
messages
  id                uuid PK default gen_random_uuid()
  conversation_id   uuid NOT NULL references conversations(id) on delete cascade
  sender_id         uuid NOT NULL references profiles(id) on delete cascade
  body              text NOT NULL
  read_at           timestamptz
  created_at        timestamptz default now()
```

If you prefer **no conversations table**: store `sender_id`, `receiver_id`, and optionally `job_id` or `application_id` on each message and derive threads in app logic.

- **reviews**

```text
reviews
  id                uuid PK default gen_random_uuid()
  reviewer_profile_id uuid NOT NULL references profiles(id) on delete cascade
  reviewee_type     text NOT NULL  -- 'caregiver' | 'organization' | 'job'
  reviewee_id       uuid NOT NULL  -- caregiver_profile_id or organization_profile_id or care_job_id
  rating            int NOT NULL check (rating >= 1 and rating <= 5)
  comment           text
  created_at        timestamptz default now()
  UNIQUE(reviewer_profile_id, reviewee_type, reviewee_id)  -- one review per (reviewer, reviewee)
```

- **notifications**

```text
notifications
  id                uuid PK default gen_random_uuid()
  profile_id        uuid NOT NULL references profiles(id) on delete cascade
  type              text NOT NULL  -- 'new_application' | 'application_update' | 'new_message' | etc.
  title             text
  body              text
  link              text   -- e.g. /zorenta/applications/123
  read_at           timestamptz
  created_at        timestamptz default now()
```

### Row Level Security (RLS)

- Enable RLS on all Zorenta tables.
- Policies: users can read/write only their own profiles and related rows; can read public caregiver/job listing data; can read/write their own applications, messages, reviews, notifications.
- Service role or authenticated role used in API routes to enforce “user can only do X if profile_id = current user’s profile”.

---

## 4. API Route Structure

Base path: **`/api/zorenta`**. All routes assume authenticated user where relevant; resolve `profile_id` from Supabase Auth.

| Method | Path | Purpose |
|--------|------|---------|
| **Auth / profile** | | |
| POST | /api/zorenta/auth/register | Register (Supabase Auth + create profile row). |
| GET  | /api/zorenta/me | Current user’s profile + role + linked caregiver/client/org profile. |
| PUT  | /api/zorenta/me | Update profile (display_name, avatar_url). |
| **Caregivers** | | |
| GET  | /api/zorenta/caregivers | List/search (query: city, skills, availability, radius). |
| GET  | /api/zorenta/caregivers/[id] | Public caregiver profile. |
| GET  | /api/zorenta/caregivers/me | Current user’s caregiver profile. |
| POST | /api/zorenta/caregivers/me | Create caregiver profile. |
| PUT  | /api/zorenta/caregivers/me | Update caregiver profile. |
| **Clients** | | |
| GET  | /api/zorenta/clients/me | Current user’s client profile. |
| POST | /api/zorenta/clients/me | Create client profile. |
| PUT  | /api/zorenta/clients/me | Update client profile. |
| **Organizations** | | |
| GET  | /api/zorenta/organizations | List (optional search). |
| GET  | /api/zorenta/organizations/[id] | Public org profile. |
| GET  | /api/zorenta/organizations/me | Current user’s org profile. |
| POST | /api/zorenta/organizations/me | Create org profile. |
| PUT  | /api/zorenta/organizations/me | Update org profile. |
| **Jobs** | | |
| GET  | /api/zorenta/jobs | List (filters: city, job_type, status, poster). |
| GET  | /api/zorenta/jobs/[id] | Job detail + applications count (and list if poster). |
| POST | /api/zorenta/jobs | Create job (client or org). |
| PUT  | /api/zorenta/jobs/[id] | Update job (poster only). |
| **Applications** | | |
| GET  | /api/zorenta/applications | My applications (caregiver) or applications to my jobs (client/org). |
| POST | /api/zorenta/applications | Apply to job (caregiver). |
| PUT  | /api/zorenta/applications/[id] | Update status: accept/reject (poster). |
| **Messages** | | |
| GET  | /api/zorenta/conversations | List my conversations (with last message). |
| GET  | /api/zorenta/conversations/[id]/messages | Messages in conversation. |
| POST | /api/zorenta/conversations/[id]/messages | Send message. |
| **Reviews** | | |
| GET  | /api/zorenta/reviews | List by reviewee_type + reviewee_id. |
| POST | /api/zorenta/reviews | Create review (with uniqueness). |
| **Notifications** | | |
| GET  | /api/zorenta/notifications | My notifications (unread first, paginated). |
| PATCH| /api/zorenta/notifications/[id]/read | Mark read. |

---

## 5. Page Structure (Frontend)

All under **`/zorenta`** (or `/marketplace`). Layout: Zorenta shell (sidebar or top nav for Zorenta sections), shared header with “Dashboard” link back to main app if desired.

| Route | Description |
|-------|-------------|
| /zorenta | Redirect to /zorenta/jobs or /zorenta/dashboard. |
| /zorenta/login | Login (Supabase Auth). |
| /zorenta/register | Register + choose role. |
| /zorenta/dashboard | Role-based: caregiver (my applications, messages); client/org (my jobs, applications, messages). |
| /zorenta/caregivers | Search caregivers (filters, list, cards). |
| /zorenta/caregivers/[id] | Public caregiver profile. |
| /zorenta/caregivers/me/edit | Create/edit my caregiver profile. |
| /zorenta/clients/me/edit | Create/edit my client profile. |
| /zorenta/organizations | List organizations. |
| /zorenta/organizations/[id] | Public org profile. |
| /zorenta/organizations/me/edit | Create/edit my org profile. |
| /zorenta/jobs | List care jobs (filters). |
| /zorenta/jobs/[id] | Job detail; apply (caregiver) or manage applications (poster). |
| /zorenta/jobs/new | Create job (client/org). |
| /zorenta/jobs/[id]/edit | Edit job (poster). |
| /zorenta/applications | My applications (caregiver) or “Applications to my jobs” (client/org). |
| /zorenta/messages | Conversation list. |
| /zorenta/messages/[conversationId] | Thread view, send message. |
| /zorenta/reviews/[type]/[id] | List reviews for caregiver/org/job. |
| /zorenta/notifications | Notification list (optional page; can be dropdown only). |

**Components (suggested):**

- `components/zorenta/layout.tsx` – Zorenta layout (nav + outlet).
- `components/zorenta/ProfileWizard.tsx` – Role selection + profile creation after register.
- `components/zorenta/JobCard.tsx`, `CaregiverCard.tsx`, `ApplicationRow.tsx`, `ConversationList.tsx`, `MessageThread.tsx`, `ReviewList.tsx`, `NotificationDropdown.tsx`.

Reuse: `components/ui` (Card, Button, Input, Table, Badge, Tabs, Dialog).

---

## 6. Matching Algorithm Logic (MVP)

- **No ML.** Matching = filter + sort.
- **Inputs:** job (location, job_type, maybe skills) or search form (city, skills, availability).
- **Caregiver search:**  
  - Filter: `city` or `region` match (or distance ≤ X km if lat/lng); `skills` overlap; `availability` compatible.  
  - Sort: by relevance (e.g. number of matching skills, then experience_years, then created_at).
- **Job search for caregiver:**  
  - Filter: `city`/`region`, `job_type`, `status = 'open'`.  
  - Sort: by `created_at` or pay.
- **Implementation:** In API route or `lib/zorenta/search.ts`, build Supabase query with `.eq()`, `.contains()` (for arrays), `.gte()`/`.lte()` for numeric; optional raw SQL for distance if using PostGIS later. Return ordered list.

---

## 7. Messaging System Design

- **Model:** Conversations (two participants) + Messages (conversation_id, sender_id, body, read_at).
- **Create conversation:** When user A sends first message to B, create conversation (A, B) and first message. If conversation exists, reuse it.
- **List conversations:** For current user, list conversations with last message and unread count (messages where receiver = me and read_at is null).
- **MVP:** No real-time. Poll `GET /api/zorenta/conversations/[id]/messages` on thread open or “Refresh”; optional polling every N seconds on messages page.
- **Notifications:** On new message insert, create notification for receiver (type: new_message, link to conversation).

---

## 8. Notification System Design

- **Storage:** `notifications` table (profile_id, type, title, body, link, read_at, created_at).
- **Create notifications when:**  
  - New application (notify job poster).  
  - Application accepted/rejected (notify caregiver).  
  - New message (notify conversation partner).
- **Delivery:** In-app only. Header or sidebar shows unread count; dropdown or page lists notifications; PATCH to mark read.
- **MVP:** No email/push; optional “email digest” later.

---

## 9. Security Best Practices

- **Supabase RLS:** Enable on all Zorenta tables; policies per role (caregiver can update own caregiver_profile, etc.).
- **API:** In each route, get `auth_user_id` from Supabase Auth (cookie or Bearer). Resolve `profile_id` and role; reject if role not allowed for action.
- **Input:** Validate and sanitize all inputs; use parameterized queries (Supabase client).
- **IDs:** Use UUIDs; no sequential IDs exposed. Validate that `job_id`, `application_id`, etc. exist and user has permission.
- **PII:** Store only what’s needed; consider masking in logs. Plan for future compliance (e.g. HIPAA) in data handling.

---

## 10. Deployment Guide (high level)

- **Vercel:** Same as today; add env vars for Supabase (already present). No change to build.
- **Supabase:** New schema in same project or new project. Run migrations (SQL files) for Zorenta tables and RLS.
- **Auth:** Configure Supabase Auth (email confirm optional for MVP). Redirect after login to `/zorenta/dashboard`.
- **Feature flag (optional):** Hide “Zorenta” nav/link until launch; show when ready.

---

## 11. Phased Implementation Plan (~30 days)

| Phase | Focus | Deliverables |
|-------|--------|--------------|
| **1 – Foundation (Days 1–5)** | Schema, auth, profiles | DB migrations (profiles, caregiver/client/org). Register/login under /zorenta. Role selection. Create/edit caregiver, client, org profile (API + pages). |
| **2 – Jobs & Applications (Days 6–12)** | Post and apply | care_jobs + applications tables, RLS. APIs: list/create/edit jobs; list/create applications; accept/reject. Pages: job list, job detail, job create/edit, applications list, apply flow. |
| **3 – Search (Days 13–16)** | Find caregivers/jobs | Caregiver search API (filters: location, skills, availability). Job search API. Pages: caregiver search results, filters. Optional: simple “matching” score (e.g. skill overlap). |
| **4 – Messaging (Days 17–22)** | Conversations | conversations + messages tables, RLS. APIs: list conversations, get/send messages. Pages: conversation list, thread view. Create conversation on first message. |
| **5 – Reviews & Notifications (Days 23–27)** | Trust & engagement | reviews table; APIs create/list reviews. notifications table; create on application/message events. APIs: list/read notifications. UI: review display on profile/job; notification bell + list. |
| **6 – Polish & Launch (Days 28–30)** | QA, copy, deploy | Fix bugs, responsive pass, copy. Deploy to Vercel; run migrations on production Supabase. Soft launch. |

---

## Next step

Please review this plan. Once you confirm (or specify changes), the next step will be to generate:

1. SQL migrations for the Zorenta schema  
2. API route implementations (starting with auth and profiles)  
3. Zorenta layout and core pages (register, login, dashboard, profile creation)  
4. Then jobs, applications, search, messaging, reviews, notifications in order

Reply with **“Confirmed”** or with any changes you want (e.g. table names, extra fields, different route paths) before code is written.
