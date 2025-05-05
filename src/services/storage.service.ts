import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  safeLoad<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (_) {
      // Ignore parse error
    }
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  safeLoadInt(key: string, fallback = 0): number {
    const raw = localStorage.getItem(key);
    const parsed = raw !== null ? parseInt(JSON.parse(raw), 10) : NaN;

    if (isNaN(parsed)) {
      localStorage.setItem(key, fallback.toString());
      return fallback;
    }

    return parsed;
  }

  save<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
