/**
 * Speichern, Export/Import und Teilen-Link für das Raummodell.
 * Alle Zugriffe auf Browser-Speicher sind in try/catch gekapselt
 * (privater Modus, blockierte Website-Daten).
 */
import { sanitizeRoom, type RoomModel } from './room';
import type { UnitSystem } from './units';

export const STORAGE_KEY = 'pmc-room-v1';
export const UNITS_KEY = 'pmc-units';

/** Minimale Schnittstelle, damit Tests ohne Browser laufen. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadRoom(store: KeyValueStore | null = defaultStore()): RoomModel | null {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitizeRoom(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveRoom(m: RoomModel, store: KeyValueStore | null = defaultStore()): boolean {
  try {
    if (!store) return false;
    store.setItem(STORAGE_KEY, JSON.stringify(m));
    return true;
  } catch {
    return false;
  }
}

export function loadUnits(store: KeyValueStore | null = defaultStore()): UnitSystem | null {
  try {
    const v = store?.getItem(UNITS_KEY);
    return v === 'metric' || v === 'imperial' ? v : null;
  } catch {
    return null;
  }
}

export function saveUnits(u: UnitSystem, store: KeyValueStore | null = defaultStore()): void {
  try {
    store?.setItem(UNITS_KEY, u);
  } catch {
    /* ignorieren */
  }
}

/* ---------- Export / Import (JSON-Datei) ---------- */

export function exportRoomJson(m: RoomModel): string {
  return JSON.stringify({ app: 'plan-my-cinema', ...m }, null, 2);
}

export type ImportResult = { ok: true; room: RoomModel } | { ok: false; error: 'tooLarge' | 'invalidJson' | 'notARoom' };

export function importRoomJson(text: string): ImportResult {
  if (text.length > 100_000) return { ok: false, error: 'tooLarge' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalidJson' };
  }
  if (!data || typeof data !== 'object' || !('room' in data) || !('screen' in data)) {
    return { ok: false, error: 'notARoom' };
  }
  return { ok: true, room: sanitizeRoom(data) };
}

/* ---------- Teilen-Link (#r=… im URL-Fragment, wird nicht an Server gesendet) ---------- */

export const SHARE_PARAM = 'r';

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeShare(m: RoomModel): string {
  return toBase64Url(JSON.stringify(m));
}

export function decodeShare(hash: string): RoomModel | null {
  try {
    const h = hash.startsWith('#') ? hash.slice(1) : hash;
    const v = new URLSearchParams(h).get(SHARE_PARAM);
    if (!v || v.length > 20_000) return null;
    return sanitizeRoom(JSON.parse(fromBase64Url(v)));
  } catch {
    return null;
  }
}
