# Zorenta Launch Delivery

## 1. Files Created/Modified

### Created
- `components/zorenta/landing-page.tsx` — Public landing: hero, value prop, how it works, for caregivers, for clients, trust/safety, testimonials placeholder, CTAs, FAQ, footer
- `components/zorenta/onboarding-progress.tsx` — Role-based onboarding: progress bar, steps, next recommended action
- `app/zorenta/intake/page.tsx` — Multi-step care intake wizard (who, when/where, skills/budget, notes)
- `app/zorenta/intake/results/page.tsx` — Intake summary + top 5 caregiver matches + “Create job from intake” CTA
- `app/api/zorenta/intake/route.ts` — GET/POST intakes (draft/completed)
- `app/api/zorenta/matching/caregivers-for-intake/route.ts` — GET matches for an intake (score 0–100 + explanation)
- `supabase/migrations/20250320000000_zorenta_care_intakes.sql` — `care_intakes` table + RLS
- `docs/ZORENTA_LAUNCH_DELIVERY.md` — This file

### Modified
- `app/zorenta/page.tsx` — Shows landing for guests, redirects logged-in users to dashboard
- `app/zorenta/register/page.tsx` — Reads `?role=client` / `?role=caregiver` and presets role
- `app/zorenta/dashboard/page.tsx` — Onboarding progress card, safe-messaging notice (trust/safety)
- `app/api/zorenta/dashboard/route.ts` — Returns `applicationsCount` for caregivers (onboarding)
- `lib/zorenta/matching.ts` — `IntakeForScoring`, `scoreCaregiverForIntake()` (language + skills_required)
- `components/zorenta/zorenta-sidebar.tsx` — Nav item “Zorgvraag intake” → `/zorenta/intake`

---

## 2. SQL Migrations Required

Run in Supabase after existing Zorenta migrations:

**`20250320000000_zorenta_care_intakes.sql`**
- Creates `care_intakes`: id, user_id, who_needs_care, age_group, care_type, care_frequency, preferred_schedule, preferred_city/region/country, urgency, skills_required (text[]), language_preference, budget_min/max, notes, status (draft|completed), created_at, updated_at
- RLS: users can manage their own intakes

---

## 3. New Routes Added

| Route | Purpose |
|-------|--------|
| `/zorenta` | Landing for guests; redirect to dashboard when logged in |
| `/zorenta/intake` | Multi-step care intake (clients/orgs); draft save; complete → results |
| `/zorenta/intake/results?intake_id=` | Intake summary + top 5 caregiver matches + create job from intake |

---

## 4. Matching Formula

**Job ↔ caregiver (existing)**  
Weights: city 20, region 10, skillOverlap 20, careTypeMatch 15, availability 10, experience 10, rateFit 10, rating 5 (total 100).  
Explanation: first 4 reason labels joined with “ + ”; narrative e.g. “Sterke match voor [care_type] in [city]”.

**Intake ↔ caregiver (new)**  
Same weights; intake mapped to job-like (city, region, country, care_type, availability, budget_min/max).  
Extra: +20 if any `skills_required` overlaps caregiver skills; +5 if `language_preference` in caregiver headline.  
Explanation and narrative built the same way.

---

## 5. Intake Flow Summary

1. Client/org opens **Zorgvraag intake** → `/zorenta/intake`.
2. **Steps:** (1) Voor wie + leeftijd + type zorg, (2) Wanneer & waar (frequentie, schema, plaats, urgentie), (3) Vaardigheden + taal + budget, (4) Opmerkingen.
3. **Concept opslaan** saves draft; **Afronden en matches bekijken** sets status completed and redirects to results.
4. **Results** page: summary card, “Vacature aanmaken” (creates job from intake), top 5 caregiver matches (score badge, explanation, link to profile).
5. **Create job from intake** POSTs to `/api/zorenta/jobs` with title, care_type, city, availability, budget_min/max from intake → redirect to new job page.

---

## 6. First Pages to Test

1. **Landing:** `/zorenta` (logged out) → hero, CTAs (Zorg vinden, Zorgverlener worden, Zorgvraag indienen), FAQ, footer.
2. **Register with role:** `/zorenta/register?role=client` → role “Client” preselected.
3. **Intake:** Log in as client → `/zorenta/intake` → complete 4 steps → results with matches and “Vacature aanmaken”.
4. **Dashboard:** Log in → onboarding progress, safe-messaging notice, role-specific cards and quick actions.
5. **Job from intake:** On intake results click “Vacature aanmaken” → new job created → redirect to job detail.

---

## 7. Launch Checklist

- [ ] Run migration `20250320000000_zorenta_care_intakes.sql` in Supabase
- [ ] Confirm landing at `/zorenta` for guests and redirect for logged-in users
- [ ] Test intake flow: draft save, complete, view results, create job from intake
- [ ] Test matching: caregiver dashboard “Best matches”, job detail “Best caregiver matches”, intake results “Beste matches”
- [ ] Test onboarding progress and next action on dashboard (caregiver vs client/org)
- [ ] Confirm register `?role=client` / `?role=caregiver` from landing CTAs
- [ ] Confirm trust/safety: safe-messaging notice on dashboard
- [ ] Smoke-test responsive: landing, dashboard, intake, results on mobile width
