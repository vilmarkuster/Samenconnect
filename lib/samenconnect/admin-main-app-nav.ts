/** Session flag: admin explicitly opened the main SamenConnect app from the admin portal. */
export const ADMIN_MAIN_APP_SESSION_KEY = "samenconnect_admin_main_app";

export function setAdminPrefersMainAppSession(): void {
  try {
    sessionStorage.setItem(ADMIN_MAIN_APP_SESSION_KEY, "1");
  } catch {
    /* private / blocked storage */
  }
}

export function adminPrefersMainAppSession(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_MAIN_APP_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearAdminMainAppSession(): void {
  try {
    sessionStorage.removeItem(ADMIN_MAIN_APP_SESSION_KEY);
  } catch {
    /* */
  }
}
