/** Tiny in-memory cache with a time limit, to protect the free-tier database. */
export class TtlCache<T> {
  private store = new Map<string, { at: number; value: T }>();
  constructor(private ttlMs: number, private maxEntries = 500) {}

  get(key: string, now = Date.now()): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (now - e.at > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return e.value;
  }

  set(key: string, value: T, now = Date.now()) {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { at: now, value });
  }

  delete(prefix: string) {
    for (const k of [...this.store.keys()]) if (k.startsWith(prefix)) this.store.delete(k);
  }
}
