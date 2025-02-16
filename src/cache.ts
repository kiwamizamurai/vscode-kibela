import { CacheEntry } from './types';

export class CacheManager<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly ttl: number;

  constructor(ttlMs: number) {
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (this.isValid(cached.timestamp)) {
      return cached.data;
    }

    this.cache.delete(key);
    return null;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private isValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.ttl;
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry.timestamp)) {
        this.cache.delete(key);
      }
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (!this.isValid(entry.timestamp)) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  getSize(): number {
    this.clearExpired();
    return this.cache.size;
  }
}
