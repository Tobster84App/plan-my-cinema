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

export const ROOM_MODEL_VERSION = 8;

export interface Subwoofer {
  /** Abstand Stirnwand (Leinwandwand) */
  x: number;
  /** Abstand linke Wand (Blick zur Leinwand) */
  y: number;
  /** Höhe der Membranmitte */
  z: number;
}

export const MAX_SUBS = 4;

export interface LensShift {
  up: number | null;
  down: number | null;
  left: number | null;
  right: number | null;
}

/** Unterstützte Lautsprecher-Layouts (Dolby Atmos Home). */
export const SPEAKER_LAYOUTS = ['5.1', '5.1.2', '5.1.4', '7.1', '7.1.2', '7.1.4', '9.1.2', '9.1.4', '9.1.6'] as const;
export type SpeakerLayout = (typeof SPEAKER_LAYOUTS)[number];
export const SPEAKER_IDS = ['L', 'C', 'R', 'Lw', 'Rw', 'Ls', 'Rs', 'Lrs', 'Rrs', 'Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'] as const;
export type SpeakerId = (typeof SPEAKER_IDS)[number];

/** Position wie bei Subs: ab Stirnwand, ab linker Wand, Höhe. */
export interface SpeakerPos {
  x: number;
  y: number;
  z: number;
}

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
    /**
     * Verfügbarer Lens Shift in % der Bildhöhe (oben/unten) bzw. Bildbreite (links/rechts),
     * Verschiebung der Bildmitte gegenüber der Objektivachse. 0 = kein Shift, null = unbekannt.
     */
    shift: LensShift;
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
  /** Bass-System: einzelne Subs (Liste `subs`) oder Bass-Array an der Stirnwand (SBA) bzw. Stirn- + Rückwand (DBA) */
  bass: {
    mode: BassMode;
    /** Subs je Array nebeneinander (Breite) */
    cols: number;
    /** Subs je Array übereinander (Höhe) */
    rows: number;
    /** Abstand Membran ↔ Wand */
    wallGap: number;
  };
  /** Rechner 4: Kalibrierpegel und Lautsprecher-/Verstärkerdaten je Gruppe */
  levels: {
    /** Kalibrierpegel am MLP bei −20 dBFS rosa Rauschen, dB SPL(C) */
    calSpl: number;
    groups: Record<LevelGroup, LevelGroupSpec>;
    /** Daten je Subwoofer (alle Subs gleich); Anzahl und Positionen aus Rechner 2 */
    sub: LevelGroupSpec;
    /** Anhebung des LFE-Kanals gegenüber den Hauptkanälen in dB (Erfahrungswert, im Raum fein abstimmen) */
    lfeBoost: number;
  };
  speakers: {
    layout: SpeakerLayout;
    /** Höhe der Ohrhöhen-Lautsprecher (Hochtöner); null = Ohrhöhe am Sitz */
    listenerHeight: number | null;
    /** von Hand verschobene Lautsprecher; alle anderen werden automatisch platziert */
    overrides: Partial<Record<SpeakerId, SpeakerPos>>;
  };
  /** Sitzreihen; Reihe 1 liegt am Hauptsitzplatz (seat), weitere Reihen dahinter */
  seating: {
    rows: number;
    seatsPerRow: number;
    /** Mittenabstand der Plätze in einer Reihe */
    seatSpacing: number;
    /** Abstand der Reihen (Augenposition zu Augenposition) */
    rowSpacing: number;
    /** Podesthöhe je weiterer Reihe (kumulativ) */
    riserStep: number;
    /** von Hand verschobene Plätze, Schlüssel "Reihe-Platz" (z. B. "2-1"); Höhe bleibt die der Reihe */
    overrides: Record<string, { x: number; y: number }>;
  };
}

export type BassMode = 'free' | 'sba' | 'dba';
/** Bezug der Kennempfindlichkeit: 1 W/1 m oder 2,83 V/1 m */
export type SensBasis = '1w' | '2v83';
export type LevelGroup = 'front' | 'surround' | 'height';
export const LEVEL_GROUPS: readonly LevelGroup[] = ['front', 'surround', 'height'];
export interface LevelGroupSpec {
  /** Kennempfindlichkeit in dB SPL */
  sens: number;
  basis: SensBasis;
  /** Nennimpedanz in Ω */
  impedance: number;
  /** Verstärkerleistung je Kanal in W an dieser Impedanz */
  amp: number;
}
export const BASS_MODES: readonly BassMode[] = ['free', 'sba', 'dba'];

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
    shift: { up: 90, down: 90, left: 40, right: 40 },
  },
  seat: { distance: 3.8, eyeHeight: 1.2, offsetY: 0 },
  acoustics: { temperatureC: 20 },
  subs: [{ x: 0.3, y: 0.3, z: 0.25 }],
  bass: { mode: 'free', cols: 2, rows: 2, wallGap: 0.3 },
  levels: {
    calSpl: 82,
    groups: {
      front: { sens: 88, basis: '2v83', impedance: 8, amp: 100 },
      surround: { sens: 88, basis: '2v83', impedance: 8, amp: 100 },
      height: { sens: 86, basis: '2v83', impedance: 8, amp: 100 },
    },
    sub: { sens: 88, basis: '2v83', impedance: 8, amp: 500 },
    lfeBoost: 10,
  },
  speakers: { layout: '7.1.4', listenerHeight: null, overrides: {} },
  seating: { rows: 1, seatsPerRow: 3, seatSpacing: 0.7, rowSpacing: 1.6, riserStep: 0.3, overrides: {} },
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
  rows: [1, 3],
  seatsPerRow: [1, 6],
  seatSpacing: [0.5, 1.5],
  rowSpacing: [0.8, 3],
  riserStep: [0, 1],
  arrayCols: [1, 4],
  arrayRows: [1, 3],
  arrayGap: [0.05, 1.5],
  calSpl: [70, 90],
  sens: [70, 115],
  impedance: [2, 16],
  amp: [1, 5000],
  lfeBoost: [0, 15],
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
      shift: (() => {
        const sh = obj(p.shift);
        const ds = d.projector.shift;
        return {
          up: numOrNull(sh.up, ds.up, 'shift'),
          down: numOrNull(sh.down, ds.down, 'shift'),
          left: numOrNull(sh.left, ds.left, 'shift'),
          right: numOrNull(sh.right, ds.right, 'shift'),
        };
      })(),
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
    bass: (() => {
      const b = obj(i.bass);
      const db = d.bass;
      return {
        mode: (BASS_MODES as readonly string[]).includes(b.mode as string) ? (b.mode as BassMode) : db.mode,
        cols: Math.round(num(b.cols, db.cols, 'arrayCols')),
        rows: Math.round(num(b.rows, db.rows, 'arrayRows')),
        wallGap: num(b.wallGap, db.wallGap, 'arrayGap'),
      };
    })(),
    levels: (() => {
      const l = obj(i.levels);
      const gs = obj(l.groups);
      const groups = {} as Record<LevelGroup, LevelGroupSpec>;
      const spec = (raw: unknown, dg: LevelGroupSpec): LevelGroupSpec => {
        const g = obj(raw);
        return {
          sens: num(g.sens, dg.sens, 'sens'),
          basis: g.basis === '1w' || g.basis === '2v83' ? g.basis : dg.basis,
          impedance: num(g.impedance, dg.impedance, 'impedance'),
          amp: num(g.amp, dg.amp, 'amp'),
        };
      };
      for (const k of LEVEL_GROUPS) groups[k] = spec(gs[k], d.levels.groups[k]);
      return {
        calSpl: num(l.calSpl, d.levels.calSpl, 'calSpl'),
        groups,
        sub: spec(l.sub, d.levels.sub),
        lfeBoost: num(l.lfeBoost, d.levels.lfeBoost, 'lfeBoost'),
      };
    })(),
    speakers: sanitizeSpeakers(i.speakers),
    seating: (() => {
      const g = obj(i.seating);
      const ds = d.seating;
      return {
        rows: Math.round(num(g.rows, ds.rows, 'rows')),
        seatsPerRow: Math.round(num(g.seatsPerRow, ds.seatsPerRow, 'seatsPerRow')),
        seatSpacing: num(g.seatSpacing, ds.seatSpacing, 'seatSpacing'),
        rowSpacing: num(g.rowSpacing, ds.rowSpacing, 'rowSpacing'),
        riserStep: num(g.riserStep, ds.riserStep, 'riserStep'),
        overrides: sanitizeSeatOverrides(g.overrides),
      };
    })(),
  };
}

function sanitizeSpeakers(v: unknown): RoomModel['speakers'] {
  const s = obj(v);
  const layout = (SPEAKER_LAYOUTS as readonly string[]).includes(s.layout as string) ? (s.layout as SpeakerLayout) : DEFAULT_ROOM.speakers.layout;
  const lh = s.listenerHeight;
  const listenerHeight = typeof lh === 'number' && Number.isFinite(lh) ? clamp(lh, 0.2, 3) : null;
  const overrides: Partial<Record<SpeakerId, SpeakerPos>> = {};
  const ov = obj(s.overrides);
  for (const id of SPEAKER_IDS) {
    const p = ov[id];
    if (p && typeof p === 'object') {
      const q = obj(p);
      overrides[id] = { x: clamp(finiteOr(q.x, 0), 0, 30), y: clamp(finiteOr(q.y, 0), 0, 30), z: clamp(finiteOr(q.z, 1.2), 0, 10) };
    }
  }
  return { layout, listenerHeight, overrides };
}

function sanitizeSeatOverrides(v: unknown): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const o = obj(v);
  for (const [k, raw] of Object.entries(o)) {
    if (!/^[1-9]-[1-9]$/.test(k) || !raw || typeof raw !== 'object') continue;
    const q = obj(raw);
    out[k] = { x: clamp(finiteOr(q.x, 0), 0, 30), y: clamp(finiteOr(q.y, 0), 0, 30) };
  }
  return out;
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

/** Versionsmigration. v1 → v2: Temperatur und Subwoofer; v2 → v3: Lautsprecher. Fehlende Felder füllt sanitizeRoom mit Standardwerten. */
function migrate(i: Record<string, unknown>): Record<string, unknown> {
  const out = { ...i };
  if (out.version === 1) out.version = 2; // v1 kannte keine Subs: Standard-Sub vorn links
  if (out.version === 2) out.version = 3; // v2 kannte keine Lautsprecher: Standard 7.1.4, automatisch platziert
  if (out.version === 3) {
    // v3 → v4: symmetrischer Lens Shift (± shiftV / ± shiftH) → getrennt oben/unten/links/rechts
    const p = obj(out.projector);
    if (!('shift' in p) && ('shiftV' in p || 'shiftH' in p)) {
      const v = p.shiftV === undefined ? DEFAULT_ROOM.projector.shift.up : p.shiftV;
      const h = p.shiftH === undefined ? DEFAULT_ROOM.projector.shift.left : p.shiftH;
      out.projector = { ...p, shift: { up: v, down: v, left: h, right: h } };
    }
    out.version = 4;
  }
  if (out.version === 4) out.version = 5; // v4 kannte keine Sitzreihen: Standard 1 Reihe à 3 Plätze
  if (out.version === 5) out.version = 6; // v5 kannte keine verschobenen Plätze: leere Liste
  if (out.version === 6) out.version = 7; // v6 kannte keine Bass-Arrays: einzelne Subs wie bisher
  if (out.version === 7) out.version = 8; // v7 kannte keine Pegel-/Verstärkerdaten: Beispielwerte
  return out;
}

/* ---------- Plausibilitätsprüfungen gegen den Raum ---------- */

export type RoomIssue =
  | 'screenWiderThanRoom'
  | 'screenTopAboveCeiling'
  | 'seatBehindBackWall'
  | 'projectorBehindBackWall'
  | 'projectorAboveCeiling'
  | 'subOutsideRoom'
  | 'speakerOutsideRoom'
  | 'rowsBehindBackWall'
  | 'seatOutsideRoom';

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
  if (m.seating.rows > 1 && m.screen.wallGap + m.seat.distance + (m.seating.rows - 1) * m.seating.rowSpacing > m.room.length) out.push('rowsBehindBackWall');
  if (Object.values(m.seating.overrides).some((s) => s.x > m.room.length || s.y > m.room.width)) out.push('seatOutsideRoom');
  if (Object.values(m.speakers.overrides).some((s) => s && (s.x > m.room.length || s.y > m.room.width || s.z > m.room.height))) out.push('speakerOutsideRoom');
  return out;
}
