// Lightweight in-memory TTL cache for single-server deployments.
// Avoids Redis overhead for read-heavy endpoints that change infrequently.

class MemoryCache {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
  }

  // Retrieve a cached value. Returns null if missing or expired.
  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.delete(key);
      return null;
    }
    return item.value;
  }

  // Store a value with a TTL in seconds (default 5 minutes).
  set(key, value, ttlSeconds = 300) {
    // Clear existing timer before overwriting so we don't leak timers.
    if (this.timers.has(key)) clearTimeout(this.timers.get(key));

    this.store.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });

    // Auto-evict after TTL so stale entries don't accumulate.
    const timer = setTimeout(() => this.delete(key), ttlSeconds * 1000);
    // Allow Node to exit even if this timer is pending.
    if (timer.unref) timer.unref();
    this.timers.set(key, timer);
  }

  // Remove a single entry and its associated timer.
  delete(key) {
    this.store.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  // Remove all keys whose names start with the given prefix.
  // Useful for user-scoped invalidation: invalidatePattern("summary:userId123")
  invalidatePattern(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.delete(key);
    }
  }

  // Wipe the entire cache (used on graceful shutdown).
  clear() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.store.clear();
    this.timers.clear();
  }

  // Number of currently cached entries.
  get size() {
    return this.store.size;
  }
}

// Export a singleton so all modules share the same cache instance.
export const cache = new MemoryCache();
