const store = new Map<string, { count: number; expires: number }>();

export function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.expires < now) {
    store.set(key, { count: 1, expires: now + windowMs });
    return false;
  }
  entry.count += 1;
  store.set(key, entry);
  return entry.count > limit;
}
