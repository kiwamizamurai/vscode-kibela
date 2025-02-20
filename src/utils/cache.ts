import {
  KibelaNote,
  KibelaGroup,
  KibelaUser,
  KibelaFolder,
  NoteContent,
} from '../types';

type CacheableType =
  | KibelaNote
  | KibelaGroup
  | KibelaUser
  | KibelaFolder
  | NoteContent
  | KibelaNote[]
  | KibelaGroup[]
  | KibelaUser[]
  | KibelaFolder[];

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class CacheManager<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private ttl: number;

  constructor(ttlInSeconds: number) {
    this.ttl = ttlInSeconds * 1000;
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  getSize(): number {
    return this.cache.size;
  }
}
