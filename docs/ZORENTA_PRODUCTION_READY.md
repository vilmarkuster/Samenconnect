# Zorenta — Production-Ready Marketplace

## 1. Files Created/Modified

### Created
- `app/zorenta/sollicitaties/page.tsx` — Redirect to `/zorenta/applications`
- `app/zorenta/berichten/page.tsx` — Redirect to `/zorenta/messages`
- `supabase/migrations/20250318000000_zorenta_notify_review.sql` — Trigger: notify on new review
- `docs/ZORENTA_PRODUCTION_READY.md` — This document

### Modified
- `lib/zorenta/matching.ts` — Added recent activity (updated_at, last_activity_at), weight 5; match explanation uses " + " join
- `app/api/zorenta/matching/jobs-for-me/route.ts` — Pass caregiver updated_at and last_activity_at
- `app/api/zorenta/matching/caregivers-for-job/route.ts` — Pass caregiver updated_at and last_activity_at
- `app/zorenta/jobs/page.tsx` — Fetch match scores for caregiver; show MatchScoreBadge on job cards
- `app/api/zorenta/search/route.ts` — Caregiver filters: availability, care_type (skills/headline), min_rating
- `app/zorenta/search/page.tsx` — UI: care_type, availability, min_rating for caregiver search

---

## 2. Migrations Required

Run in Supabase (in order, after existing Zorenta migrations):

1. **`20250318000000_zorenta_notify_review.sql`**
   - Creates `notify_new_review()` and trigger on `reviews` insert.
   - Inserts notification for reviewee (caregiver) when a new review is added.

No other new migrations. Existing tables used as-is: `job_applications` (applicant_id = caregiver_id), `conversations`, `messages`, `reviews`, `notifications`.

---

## 3. Routes to Test

| Route | Purpose |
|-------|--------|
| `/zorenta/dashboard` | Caregiver: Best matches + stats. Client/org: Active jobs + applications. |
| `/zorenta/jobs` | Job list; caregiver sees match % on cards (when in top matches). |
| `/zorenta/jobs/[id]` | Job detail; poster sees "Best caregiver matches". |
| `/zorenta/applications` | Applications list; accept/reject; conversation on accept. |
| `/zorenta/sollicitaties` | Redirects to `/zorenta/applications`. |
| `/zorenta/messages` | Conversation list. |
| `/zorenta/berichten` | Redirects to `/zorenta/messages`. |
| `/zorenta/messages/[id]` | Chat thread. |
| `/zorenta/search` | Search jobs/caregivers; caregivers: city, care type, availability, min rating. |
| `/zorenta/notifications` | Notification list; bell in header. |
| `/zorenta/reviews` | Info; reviews on caregiver profile. |
| `/zorenta/profile` | Profile entry. |

---

## 4. Scoring Formula (0–100)

| Factor | Max pts | Rule |
|--------|---------|------|
| City match | 15 | Normalized job city ↔ caregiver city |
| Region match | 10 | Normalized region |
| Country match | 5 | Normalized country |
| Care type / skills | 20 | Job care_type in caregiver skills or headline |
| Availability match | 15 | Job availability ↔ caregiver availability |
| Experience | 10 | 5+ yr = 10; 2+ = 6; 1+ = 3 |
| Rate fit | 10 | Caregiver rate within job budget; partial if one side missing |
| Average rating | 15 | (rating/5) × 15 |
| Recent activity | 5 | Profile updated in 30 days or application in 14 days |

**Match explanation:** First four reason labels joined with " + " (e.g. "City match + Type zorg / vaardigheden match + Beschikbaarheid match + Recente activiteit"). Optional narrative for score ≥ 50: "Sterke match voor [care_type] in [city]".

---

## 5. System Architecture Summary

- **Auth:** Supabase Auth; roles in `profiles` (caregiver, client, organization, admin). Protected routes and API use `requireZorentaAuth` and RLS.
- **Data:** Supabase (PostgreSQL). Core tables: `profiles`, `caregiver_profiles`, `client_profiles`, `organization_profiles`, `care_jobs`, `job_applications`, `conversations`, `messages`, `reviews`, `notifications`. No new tables in this pass.
- **Applications:** `job_applications`: id, job_id, applicant_id (caregiver), message, status (pending/shortlisted/accepted/rejected), created_at. Client sees applicants; accept/reject; accept creates conversation.
- **Matching:** Deterministic scoring in `lib/zorenta/matching.ts`. APIs: `GET /api/zorenta/matching/jobs-for-me` (caregiver), `GET /api/zorenta/matching/caregivers-for-job?job_id=` (poster). Scores shown on dashboard, job list (caregiver), job detail (poster).
- **Messaging:** `conversations` (participant_1, participant_2, job_id), `messages` (conversation_id, sender_id, body). Created when application accepted. Pages: messages list, message thread.
- **Reviews:** `reviews` (reviewer_id, reviewee_id, job_id, rating 1–5, comment). Average on caregiver profile; used in matching. New review → notification (trigger).
- **Notifications:** `notifications` (user_id, type, title, body, link, read_at). Triggers: new application, application accepted/rejected, new message, new review. Bell in header; list at `/zorenta/notifications`.
- **Search:** `GET /api/zorenta/search?type=caregivers|jobs&city=&care_type=&availability=&min_rating=` (caregivers), `&city=&care_type=` (jobs). Search page: filters for city, care type, availability, min rating (caregivers).
- **UI:** Next.js App Router; Zorenta under `/zorenta`. Sidebar + top bar; dashboard cards; match badges; job/caregiver cards; skeletons; empty states. No changes to auth or existing flows.
