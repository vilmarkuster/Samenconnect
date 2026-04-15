/**
 * App-level toggle: UI + middleware for signup routes. New auth users are also blocked in Postgres
 * when `public.app_registration_control.registration_open` is false (see migration
 * `20260331200000_auth_users_registration_gate.sql`). Re-open fully:
 *   1. Set this to `true`
 *   2. Run: `update public.app_registration_control set registration_open = true where id = 1;`
 */
export const REGISTRATION_OPEN = false;
