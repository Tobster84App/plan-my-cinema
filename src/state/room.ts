/**
 * Gemeinsamer Raum-Store für alle Inseln einer Seite.
 * Server-Rendering nutzt den Beispielraum; im Browser lädt initBrowserState()
 * nach dem Mounten Teilen-Link oder gespeicherten Raum.
 */
import { effect, signal } from '@preact/signals';
import { DEFAULT_ROOM, sanitizeRoom, type RoomModel } from '../lib/room';
import { decodeShare, loadRoom, loadUnits, saveRoom, saveUnits } from '../lib/storage';
import type { UnitSystem } from '../lib/units';

export const room = signal<RoomModel>(DEFAULT_ROOM);
export const units = signal<UnitSystem>('metric');
/** true, solange der Nutzer noch nichts geändert hat und nichts gespeichert war. */
export const isSample = signal(true);

let initialized = false;

export function initBrowserState(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const shared = decodeShare(window.location.hash);
  const stored = loadRoom();
  if (shared) {
    room.value = shared;
    isSample.value = false;
    try {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch {
      /* ignorieren */
    }
  } else if (stored) {
    room.value = stored;
    isSample.value = false;
  }
  const u = loadUnits();
  if (u) units.value = u;

  // sofort speichern: localStorage-Schreiben ist billig, und so geht beim Neuladen nichts verloren
  let first = true;
  effect(() => {
    const m = room.value;
    if (first) {
      first = false;
      return;
    }
    saveRoom(m);
  });
  effect(() => saveUnits(units.value));
}

/** Änderung am Raummodell; Ergebnis wird immer validiert. */
export function updateRoom(fn: (draft: RoomModel) => void): void {
  const draft = structuredClone(room.value);
  fn(draft);
  room.value = sanitizeRoom(draft);
  isSample.value = false;
}

export function replaceRoom(m: RoomModel, sample = false): void {
  room.value = sanitizeRoom(m);
  isSample.value = sample;
}
