/**
 * Gemeinsames Raummodell – Grundlage aller Rechner.
 *
 * Koordinaten (alle in Metern):
 *  x = Abstand von der Leinwandebene Richtung Rückwand
 *  y = seitlicher Versatz zur Raummitte, positiv = rechts (Blick zur Leinwand)
 *  z = Höhe über Fußboden
 * Der Raum ist ein Quader (Länge = Leinwandwand → Rückwand).
 *
 * Ausnahme Subwoofer (ab v2): Position ab den Wänden, weil Subs an Wänden/Ecken stehen:
 *  x = Abstand von der Stirnwand (Leinwandwand), y = Abstand von der linken Wand, z = Höhe.
 */
import { clamp, finiteOr } from './units';
import type { ScopeMethod } from './screen';

export const ROOM_MODEL_VERSION = 2;

export interface Subwoofer {
  /** Abstand Stirnwand (Leinwandwand) */
  x: number;
  /** Abstand linke Wand (Blick zur Leinwand) */
  y: number;
  /** Höhe der Membranmitte */
  z: number;
}

export const MAX_SUBS = 4;

export interface RoomModel {
  version: typeof ROOM_MODEL_VERSION;
  room: { length: number; width: number; height: number };
  screen: {
    aspect: number;
    /** sichtbare Bildbreite */
    width: number;
    gain: number;
    fabricLossPct: number;
    /** Unterkante Bild über Boden */
    bottomEdge: number;
    /** Abstand Leinwandebene zur Stirnwand (AT-Leinwand mit Lautsprechern dahinter) */
    wallGap: number;
  };
  projector: {
    /** id aus data/projectors.json, null = manuelle Eingabe */
    modelId: string | null;
    lumens: number;
    throwMin: number;
    throwMax: number;
    scopeMethod: ScopeMethod;
    lensLossPct: number;
    /** gewählter Objektivabstand zur Leinwandebene */
    distance: number;
    /** Höhe Objektivmitte über Boden */
    lensHeight: number;
    /** seitlicher Versatz Objektivmitte */
    offsetY: number;
    /** verfügbarer Lens Shift ± in % Bildhöhe / Bildbreite; null = unbekannt */
    shiftV: number | null;
    shiftH: number | null;
  };
  seat: {
    /** Augen zur Leinwandebene */
    distance: number;
    /** Ohr-/Augenhöhe sitzend */
    eyeHeight: number;
    offsetY: number;
  };
  acoustics: {
    /** Lufttemperatur für die Schallgeschwindigkeit */
    temperatureC: number;
  };
  subs: Subwoofer[];
}

/** Beispielraum. Der Hinweis „Beispielwerte“ steht in der Oberfläche. */
export const DEFAULT_ROOM: RoomModel = {
  version: ROOM_MODEL_VERSION,
  room: { length: 6.0, width: 4.0, height: 2.5 },
  screen: { aspect: 2.35, width: 3.0, gain: 1.0, fabricLossPct: 15, bottomEdge: 0.6, wallGap: 0.4 },
  projector: {
    modelId: null,
    lumens: 2000,
    throwMin: 1.35,
    throwMax: 2.84,
    scopeMethod: 'zoom',
    lensLossPct: 8,
    distance: 5.0,
    lensHeight: 2.2,
    offsetY: 0,
    shiftV: 90,
    shiftH: 40,
  },
  seat: { distance: 3.8, eyeHeight: 1.2, offsetY: 0 },
  acoustics: { temperatureC: 20 },
  subs: [{ x: 0.3, y: 0.3, z: 0.25 }],
};

/** Zulässige Bereiche für Eingaben (auch für Validierung beim Import). */
export const LIMITS = {
  roomLength: [1.5, 30],
  roomWidth: [1.5, 30],
  roomHeight: [1.8, 10],
  aspect: [1.3, 3],
  screenWidth: [0.5, 15],
  gain: [0.3, 3],
  fabricLossPct: [0, 60],
  bottomEdge: [0, 5],
  wallGap: [0, 3],
  lumens: [100, 50000],
  throwRatio: [0.1, 10],
  lensLossPct: [0, 30],
  projDistance: [0.1, 40],
  lensHeight: [0, 10],
  offset: [-15, 15],
  shift: [0, 200],
  seatDistance: [0.5, 30],
  eyeHeight: [0.5, 2.5],
  temperature: [-10, 40],
} as const satisfies Record<string, readonly [number, number]>;

type Lim = keyof typeof LIMITS;
const num = (v: unknown, fallback: number, lim: Lim): number =>
  clamp(finiteOr(v, fallback), LIMITS[lim][0], LIMITS[lim][1]);
const numOrNull = (v: unknown, fallback: number | null, lim: Lim): number | null => {
  if (v === null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return clamp(v, LIMITS[lim][0], LIMITS[lim][1]);
  return fallback;
};
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/**
 * Bringt beliebige Eingaben (localStorage, Import, Teilen-Link) in ein gültiges Raummodell.
 * Fehlende oder ungültige Werte werden durch Standardwerte ersetzt, Zahlen auf LIMITS begrenzt.
 */
export function sanitizeRoom(input: unknown): RoomModel {
  const d = DEFAULT_ROOM;
  const i = migrate(obj(input));
  const r = obj(i.room);
  const s = obj(i.screen);
  const p = obj(i.projector);
  const st = obj(i.seat);
  return {
    version: ROOM_MODEL_VERSION,
    room: {
      length: num(r.length, d.room.length, 'roomLength'),
      width: num(r.width, d.room.width, 'roomWidth'),
      height: num(r.height, d.room.height, 'roomHeight'),
    },
    screen: {
      aspect: num(s.aspect, d.screen.aspect, 'aspect'),
      width: num(s.width, d.screen.width, 'screenWidth'),
      gain: num(s.gain, d.screen.gain, 'gain'),
      fabricLossPct: num(s.fabricLossPct, d.screen.fabricLossPct, 'fabricLossPct'),
      bottomEdge: num(s.bottomEdge, d.screen.bottomEdge, 'bottomEdge'),
      wallGap: num(s.wallGap, d.screen.wallGap, 'wallGap'),
    },
    projector: {
      modelId: typeof p.modelId === 'string' && p.modelId.length <= 100 ? p.modelId : null,
      lumens: num(p.lumens, d.projector.lumens, 'lumens'),
      throwMin: num(p.throwMin, d.projector.throwMin, 'throwRatio'),
      throwMax: num(p.throwMax, d.projector.throwMax, 'throwRatio'),
      scopeMethod: p.scopeMethod === 'lens' ? 'lens' : 'zoom',
      lensLossPct: num(p.lensLossPct, d.projector.lensLossPct, 'lensLossPct'),
      distance: num(p.distance, d.projector.distance, 'projDistance'),
      lensHeight: num(p.lensHeight, d.projector.lensHeight, 'lensHeight'),
      offsetY: num(p.offsetY, d.projector.offsetY, 'offset'),
      shiftV: numOrNull(p.shiftV, d.projector.shiftV, 'shift'),
      shiftH: numOrNull(p.shiftH, d.projector.shiftH, 'shift'),
    },
    seat: {
      distance: num(st.distance, d.seat.distance, 'seatDistance'),
      eyeHeight: num(st.eyeHeight, d.seat.eyeHeight, 'eyeHeight'),
      offsetY: num(st.offsetY, d.seat.offsetY, 'offset'),
    },
    acoustics: {
      temperatureC: num(obj(i.acoustics).temperatureC, d.acoustics.temperatureC, 'temperature'),
    },
    subs: sanitizeSubs(i.subs),
  };
}

function sanitizeSubs(v: unknown): Subwoofer[] {
  if (!Array.isArray(v)) return DEFAULT_ROOM.subs.map((s) => ({ ...s }));
  return v.slice(0, MAX_SUBS).map((raw) => {
    const s = obj(raw);
    // Grenzen gegen die Raummaße prüft subsOutsideRoom(); hier nur grob begrenzen
    return {
      x: clamp(finiteOr(s.x, 0.3), 0, 30),
      y: clamp(finiteOr(s.y, 0.3), 0, 30),
      z: clamp(finiteOr(s.z, 0.25), 0, 10),
    };
  });
}

/** Versionsmigration. v1 → v2: Temperatur und Subwoofer ergänzt (Standardwerte über sanitizeRoom). */
function migrate(i: Record<string, unknown>): Record<string, unknown> {
  const out = { ...i };
  if (out.version === 1) {
    out.version = 2;
    // v1 kannte keine Subs: fehlendes Feld → Standard-Sub vorn links
  }
  return out;
}

/* ---------- Plausibilitätsprüfungen gegen den Raum ---------- */

export type RoomIssue =
  | 'screenWiderThanRoom'
  | 'screenTopAboveCeiling'
  | 'seatBehindBackWall'
  | 'projectorBehindBackWall'
  | 'projectorAboveCeiling'
  | 'subOutsideRoom';

export function roomIssues(m: RoomModel): RoomIssue[] {
  const out: RoomIssue[] = [];
  const h = m.screen.width / m.screen.aspect;
  const usableLength = m.room.length - m.screen.wallGap;
  if (m.screen.width > m.room.width) out.push('screenWiderThanRoom');
  if (m.screen.bottomEdge + h > m.room.height) out.push('screenTopAboveCeiling');
  if (m.seat.distance > usableLength) out.push('seatBehindBackWall');
  if (m.projector.distance > usableLength) out.push('projectorBehindBackWall');
  if (m.projector.lensHeight > m.room.height) out.push('projectorAboveCeiling');
  if (m.subs.some((s) => s.x > m.room.length || s.y > m.room.width || s.z > m.room.height)) out.push('subOutsideRoom');
  return out;
}
