const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 8;
const store = new Map<string, { count: number; resetAt: number }>();

export function checkEarlyAccessSignupRateLimit(clientKey: string): boolean {
  const now = Date.now();
  let entry = store.get(clientKey);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(clientKey, entry);
  }
  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return false;
  }
  return true;
}
