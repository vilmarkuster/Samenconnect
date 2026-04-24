/**
 * UI / matching card shape for caregivers (not a DB row).
 * Used by matches and legacy scoring helpers — keep separate from seed mocks.
 */
export type CaregiverProfile = {
  id: string;
  name: string;
  role: "ZZP zorgverlener" | "Mantelzorger" | "Vrijwilliger" | "Organisatie";
  /**
   * `public.profiles.id` — messaging, saved providers, public profile URL.
   */
  linkedProfileId?: string | null;
  avatarUrl?: string | null;
  provider_type?: string;
  city: string;
  rate?: number | null;
  isVolunteer?: boolean;
  tags: string[];
  skills: string[];
  experienceRange?:
    | "Starter (0–1 jaar)"
    | "Ervaren (1–3 jaar)"
    | "Senior (3–5 jaar)"
    | "Specialist (5+ jaar)";
  certifications?:
    | (
        | "VOG"
        | "BHV"
        | "EHBO"
        | "Medicatie bevoegd"
        | "SKJ registratie"
        | "Zorgdiploma"
        | "BIG registratie"
        | "AGB-code"
        | "KIWA keurmerk"
        | "HKZ certificering"
      )[];
  arrangement: "PGB" | "ZZP" | "Mantelzorg" | "Vrijwillig";
  bio: string;
};
