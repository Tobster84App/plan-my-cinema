/**
 * Lautsprecher-Planer (Dolby Atmos Home) – reine Funktionen.
 *
 * Werte: data/speaker-guidelines.json (freigegeben 2026-11-04, Quellen in docs/dolby-lautsprecherwinkel.md).
 * Koordinaten wie bei Subs: x ab Stirnwand, y ab linker Wand, z Höhe. MLP = Hauptsitzplatz.
 *
 * Konventionen (wie in den Dolby-Unterlagen):
 *  Azimut: Draufsicht, 0° = Richtung Leinwandmitte, negativ = links, positiv = rechts.
 *  Elevation: Seitenansicht (Projektion auf die Längsachse), 0° = waagerecht nach vorn,
 *             90° = senkrecht über dem Kopf, 180° = waagerecht nach hinten.
 */
import guidelines from '../../data/speaker-guidelines.json';
import type { SpeakerId, SpeakerLayout, SpeakerPos } from './room';
import { degToRad, radToDeg } from './units';

export interface Range {
  min: number;
  max: number;
}

type GuidelineKey = keyof typeof guidelines.channels;

/** Welcher Kanal in welchem Layout gegen welche Dolby-Vorgabe geprüft wird. */
export const LAYOUT_CHANNELS: Record<SpeakerLayout, SpeakerId[]> = {
  '5.1': ['L', 'C', 'R', 'Ls', 'Rs'],
  '5.1.2': ['L', 'C', 'R', 'Ls', 'Rs', 'Ltm', 'Rtm'],
  '5.1.4': ['L', 'C', 'R', 'Ls', 'Rs', 'Ltf', 'Rtf', 'Ltr', 'Rtr'],
  '7.1': ['L', 'C', 'R', 'Ls', 'Rs', 'Lrs', 'Rrs'],
  '7.1.2': ['L', 'C', 'R', 'Ls', 'Rs', 'Lrs', 'Rrs', 'Ltm', 'Rtm'],
  '7.1.4': ['L', 'C', 'R', 'Ls', 'Rs', 'Lrs', 'Rrs', 'Ltf', 'Rtf', 'Ltr', 'Rtr'],
  '9.1.2': ['L', 'C', 'R', 'Lw', 'Rw', 'Ls', 'Rs', 'Lrs', 'Rrs', 'Ltm', 'Rtm'],
  '9.1.4': ['L', 'C', 'R', 'Lw', 'Rw', 'Ls', 'Rs', 'Lrs', 'Rrs', 'Ltf', 'Rtf', 'Ltr', 'Rtr'],
  '9.1.6': ['L', 'C', 'R', 'Lw', 'Rw', 'Ls', 'Rs', 'Lrs', 'Rrs', 'Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'],
};

export type SpeakerGroup = 'front' | 'wide' | 'surround' | 'rear' | 'overhead';

export interface ChannelRule {
  id: SpeakerId;
  group: SpeakerGroup;
  /** 'azimuth' für Ohrhöhe, 'elevation' für Overhead */
  measure: 'azimuth' | 'elevation';
  side: -1 | 0 | 1;
  /** Dolby-Bereich (Betrag beim Azimut) */
  range: Range;
  /** für die automatische Platzierung */
  target: number;
  /** erweiterter Gelb-Bereich, falls in den Quellen ausdrücklich genannt (L/R: G Abb. 3) */
  extended?: Range;
  source: GuidelineKey;
}

const ch = (k: GuidelineKey) => guidelines.channels[k] as { azimuth?: { min?: number; max?: number; ideal?: number }; elevation?: { min: number; max: number; ideal: number }; tolerance?: Range };

/** Regel für einen Kanal im gewählten Layout. */
export function channelRule(id: SpeakerId, layout: SpeakerLayout): ChannelRule {
  const side: -1 | 0 | 1 = id === 'C' ? 0 : id.startsWith('L') ? -1 : 1;
  const az = (key: GuidelineKey, group: SpeakerGroup, extended?: Range): ChannelRule => {
    const a = ch(key).azimuth!;
    const range = { min: a.min ?? a.ideal ?? 0, max: a.max ?? a.ideal ?? 0 };
    return { id, group, measure: 'azimuth', side, range, target: (range.min + range.max) / 2, extended, source: key };
  };
  const el = (key: GuidelineKey): ChannelRule => {
    const e = ch(key).elevation!;
    return { id, group: 'overhead', measure: 'elevation', side, range: { min: e.min, max: e.max }, target: e.ideal, source: key };
  };
  switch (id) {
    case 'C':
      return az('C', 'front');
    case 'L':
    case 'R':
      return az('LR', 'front', ch('LR').tolerance);
    case 'Lw':
    case 'Rw':
      return az('LwRw', 'wide');
    case 'Ls':
    case 'Rs':
      return az(layout === '5.1' ? 'LsRs_5.1' : layout.startsWith('5.1.') ? 'LsRs_5.1.x' : 'LsRs_7plus', 'surround');
    case 'Lrs':
    case 'Rrs':
      return az('LrsRrs', 'rear');
    case 'Ltf':
    case 'Rtf':
      return el('Ltf');
    case 'Ltr':
    case 'Rtr':
      return el('Ltr');
    case 'Ltm':
    case 'Rtm':
      return el(layout.endsWith('.6') ? 'Ltm_6' : 'Ltm_2');
  }
}

/* ---------- Winkel ---------- */

/** Azimut in Grad: 0 = Leinwand, negativ links, positiv rechts, ±180 hinten. */
export function azimuthDeg(mlp: SpeakerPos, p: SpeakerPos): number {
  const forward = mlp.x - p.x; // Richtung Leinwand positiv
  const right = p.y - mlp.y;
  return radToDeg(Math.atan2(right, forward));
}

/** Elevation in der Seitenansicht: 0 = vorn waagerecht, 90 = senkrecht oben, 180 = hinten waagerecht. */
export function elevationDeg(mlp: SpeakerPos, p: SpeakerPos): number {
  const forward = mlp.x - p.x;
  const up = p.z - mlp.z;
  return radToDeg(Math.atan2(up, forward));
}

export const distance3d = (a: SpeakerPos, b: SpeakerPos): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/* ---------- Ampel ---------- */

export type Status = 'ok' | 'warn' | 'bad';

/** Eigene Festlegung (keine Dolby-Vorgabe): bis 10° außerhalb = Gelb, darüber Rot. */
export const YELLOW_MARGIN_DEG = 10;

export function rate(value: number, range: Range, extended?: Range): Status {
  if (value >= range.min - 1e-9 && value <= range.max + 1e-9) return 'ok';
  const lo = Math.min(range.min, extended?.min ?? range.min) - YELLOW_MARGIN_DEG;
  const hi = Math.max(range.max, extended?.max ?? range.max);
  const hiYellow = extended ? hi : hi + YELLOW_MARGIN_DEG;
  return value >= lo && value <= hiYellow ? 'warn' : 'bad';
}

/* ---------- Automatische Platzierung ---------- */

export interface PlacementInput {
  room: { length: number; width: number; height: number };
  mlp: SpeakerPos;
  /** x-Ebene der Frontlautsprecher (hinter AT-Leinwand bzw. an der Stirnwand) */
  frontPlaneX: number;
  /** Höhe der Ohrhöhen-Lautsprecher */
  listenerZ: number;
  /** Abstand der Lautsprecher-Mitte zur Wand */
  inset: number;
}

/**
 * Ohrhöhen-Lautsprecher: Schnittpunkt des Strahls vom MLP unter dem Ziel-Azimut
 * mit Frontebene, Seitenwänden oder Rückwand (jeweils um `inset` nach innen versetzt).
 */
export function placeOnWalls(az: number, i: PlacementInput): SpeakerPos {
  const a = degToRad(az);
  const dx = -Math.cos(a); // Richtung x (zur Leinwand negativ)
  const dy = Math.sin(a);
  const ts: number[] = [];
  if (dx < -1e-9) ts.push((i.frontPlaneX - i.mlp.x) / dx);
  if (dx > 1e-9) ts.push((i.room.length - i.inset - i.mlp.x) / dx);
  if (dy < -1e-9) ts.push((i.inset - i.mlp.y) / dy);
  if (dy > 1e-9) ts.push((i.room.width - i.inset - i.mlp.y) / dy);
  const t = Math.max(0, Math.min(...ts.filter((v) => v >= 0)));
  return { x: i.mlp.x + dx * t, y: i.mlp.y + dy * t, z: i.listenerZ };
}

/**
 * Overhead an der Decke: Elevation in der Seitenansicht bestimmt x,
 * seitlich wie L/R bei ±30° (G S. 7), innerhalb des Raums.
 */
export function placeOverhead(elev: number, side: -1 | 1, i: PlacementInput): SpeakerPos {
  const z = i.room.height;
  const up = z - i.mlp.z;
  const x = Math.abs(elev - 90) < 1e-9 ? i.mlp.x : i.mlp.x - up / Math.tan(degToRad(elev));
  const lateral = Math.tan(degToRad(30)) * Math.max(0, i.mlp.x - i.frontPlaneX);
  const y = Math.min(i.room.width - i.inset, Math.max(i.inset, i.mlp.y + side * lateral));
  return { x: Math.min(i.room.length - i.inset, Math.max(i.inset, x)), y, z };
}

export function autoPlace(rule: ChannelRule, i: PlacementInput): SpeakerPos {
  if (rule.measure === 'elevation') return placeOverhead(rule.target, rule.side === 0 ? 1 : rule.side, i);
  return placeOnWalls(rule.side * rule.target, i);
}
