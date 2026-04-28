interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 1000, ttlSeconds: number = 3600) {
    this.maxSize = maxSize;
    this.ttl = ttlSeconds * 1000;
  }

  set(key: string, value: T): void {
    // Remove existing key to update its position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // If cache is at max size, remove the least recently used item (first entry)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // Add new entry at the end (most recently used)
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (mark as recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global session cache instance
export const sessionCache = new LRUCache<{
  userId: string;
  email: string;
  username: string;
  createdAt: number;
}>(1000, 3600); // 1000 entries, 1 hour TTL
