/**
 * Zorenta conversion analytics – placeholder hooks for future product analytics.
 * No third-party integration. Call these at key conversion points.
 */

export type ZorentaEvent =
  | "signup_started"
  | "signup_completed"
  | "intake_started"
  | "intake_completed"
  | "job_created"
  | "application_sent"
  | "message_sent";

export type ZorentaEventPayload = {
  signup_started: { role?: string };
  signup_completed: { role: string };
  intake_started: Record<string, never>;
  intake_completed: { intake_id?: string };
  job_created: { job_id?: string };
  application_sent: { job_id?: string };
  message_sent: { conversation_id?: string };
};

export function trackZorentaEvent<E extends ZorentaEvent>(
  event: E,
  payload?: ZorentaEventPayload[E]
) {
  try {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "development") {
      console.debug("[Zorenta analytics]", event, payload);
    }
    // Future: send to analytics provider
  } catch {
    // ignore
  }
}
