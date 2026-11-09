/**
 * Sitzreihen, Sichtlinien und Erstreflexionen – reine Funktionen.
 * Koordinaten wie bei Subs/Lautsprechern: x ab Stirnwand, y ab linker Wand, z Höhe.
 */
import type { RoomModel, SpeakerPos } from './room';

export interface Seat {
  row: number; // 1 = vorderste Reihe (Hauptsitzplatz-Reihe)
  index: number; // 1 … n von links (Blick zur Leinwand)
  pos: SpeakerPos; // Ohr-/Augenposition
  isMlp: boolean;
  /** von Hand verschoben (x/y aus m.seating.overrides) */
  moved: boolean;
}

/** Schlüssel eines Platzes in m.seating.overrides, z. B. "2-1" = Reihe 2, Platz 1. */
export const seatKey = (row: number, index: number) => `${row}-${index}`;

/**
 * Alle Plätze; Reihe 1 liegt auf Höhe des Hauptsitzplatzes, die Plätze einer Reihe sind um den MLP zentriert.
 * Von Hand verschobene Plätze übernehmen x/y aus m.seating.overrides, die Höhe bleibt die der Reihe.
 * Der MLP selbst wird nur über den Hauptsitzplatz (m.seat) verschoben.
 */
export function seatPositions(m: RoomModel): Seat[] {
  const g = m.seating;
  const x0 = m.screen.wallGap + m.seat.distance;
  const yC = m.room.width / 2 + m.seat.offsetY;
  const seats: Seat[] = [];
  const mid = (g.seatsPerRow - 1) / 2;
  for (let r = 1; r <= g.rows; r++) {
    for (let i = 0; i < g.seatsPerRow; i++) {
      // MLP = mittlerer Platz der ersten Reihe (bei gerader Anzahl liegt der MLP zwischen zwei Plätzen)
      const isMlp = r === 1 && Math.abs(i - mid) < 1e-9;
      const ov = isMlp ? undefined : g.overrides[seatKey(r, i + 1)];
      seats.push({
        row: r,
        index: i + 1,
        pos: { x: ov?.x ?? x0 + (r - 1) * g.rowSpacing, y: ov?.y ?? yC + (i - mid) * g.seatSpacing, z: m.seat.eyeHeight + (r - 1) * g.riserStep },
        isMlp,
        moved: !!ov,
      });
    }
  }
  return seats;
}

/* ---------- Sichtlinie ---------- */

/**
 * C-Wert: Wie hoch läuft die Sichtlinie eines Zuschauers zur Bildunterkante über das Auge
 * der Person direkt davor? (Höhe der Sichtlinie an der Augenposition der vorderen Reihe − deren Augenhöhe)
 */
export function cValue(rear: { x: number; z: number }, front: { x: number; z: number }, screen: { x: number; bottom: number }): number {
  const dx = rear.x - screen.x;
  if (!(dx > 0) || front.x <= screen.x || front.x >= rear.x) return NaN;
  const zLine = screen.bottom + ((rear.z - screen.bottom) * (front.x - screen.x)) / dx;
  return zLine - front.z;
}

/** Orientierungswerte (keine verbindliche Norm gefunden): 12 cm optimal, 6 cm Minimum. */
export const C_VALUE_LIMITS = { good: 0.12, min: 0.06 } as const;

export type SightStatus = 'ok' | 'warn' | 'bad';
export const rateCValue = (c: number): SightStatus => (c >= C_VALUE_LIMITS.good - 1e-9 ? 'ok' : c >= C_VALUE_LIMITS.min - 1e-9 ? 'warn' : 'bad');

/** Nötige Podesthöhe der hinteren Reihe für einen gewünschten C-Wert (bei gleicher Augenhöhe über Podest). */
export function riserForC(rearX: number, frontX: number, frontZ: number, screenX: number, screenBottom: number, c: number): number {
  // Sichtlinie muss bei frontX die Höhe frontZ + c haben → Rückwärts nach rearX verlängern
  const target = frontZ + c;
  const slope = (target - screenBottom) / (frontX - screenX);
  return screenBottom + slope * (rearX - screenX);
}

/**
 * Sichtlinie je hinterer Reihe: Für jeden Platz wird die Person davor gesucht (Platz der vorderen Reihe mit dem
 * kleinsten seitlichen Abstand); gemeldet wird der ungünstigste Platz der Reihe.
 */
export function sightlines(m: RoomModel) {
  const seats = seatPositions(m);
  const screen = { x: m.screen.wallGap, bottom: m.screen.bottomEdge };
  const out: { row: number; index: number; c: number; status: SightStatus; requiredEyeZ: number; requiredRiser: number }[] = [];
  for (let r = 2; r <= m.seating.rows; r++) {
    const frontRow = seats.filter((s) => s.row === r - 1);
    let worst: (typeof out)[number] | null = null;
    for (const seat of seats.filter((s) => s.row === r)) {
      const rear = seat.pos;
      const front = frontRow.reduce((a, b) => (Math.abs(b.pos.y - rear.y) < Math.abs(a.pos.y - rear.y) ? b : a)).pos;
      const c = cValue(rear, front, screen);
      const requiredEyeZ = riserForC(rear.x, front.x, front.z, screen.x, screen.bottom, C_VALUE_LIMITS.good);
      const e = { row: r, index: seat.index, c, status: rateCValue(c), requiredEyeZ, requiredRiser: requiredEyeZ - m.seat.eyeHeight };
      if (!worst || !(e.c >= worst.c)) worst = e; // NaN (Platz nicht hinter der Reihe davor) gilt als schlechtester
    }
    if (worst) out.push(worst);
  }
  return out;
}

/* ---------- Erstreflexionen (Spiegelquellen-Methode) ---------- */

export type Surface = 'left' | 'right' | 'ceiling' | 'floor' | 'front' | 'back';
export const SURFACES: readonly Surface[] = ['left', 'right', 'ceiling', 'floor', 'front', 'back'];

/** Achse senkrecht zur Fläche und Lage der Fläche (Stirnwand x = 0, Rückwand x = Länge). */
export function surfacePlane(surface: Surface, room: { length: number; width: number; height: number }): { axis: 'x' | 'y' | 'z'; plane: number } {
  switch (surface) {
    case 'left': return { axis: 'y', plane: 0 };
    case 'right': return { axis: 'y', plane: room.width };
    case 'floor': return { axis: 'z', plane: 0 };
    case 'ceiling': return { axis: 'z', plane: room.height };
    case 'front': return { axis: 'x', plane: 0 };
    case 'back': return { axis: 'x', plane: room.length };
  }
}

/** Die beiden Koordinaten in der Fläche (für Maßangaben und Absorberbereiche). */
export const surfaceAxes = (surface: Surface): ['x' | 'y', 'y' | 'z'] =>
  surface === 'left' || surface === 'right' ? ['x', 'z'] : surface === 'front' || surface === 'back' ? ['y', 'z'] : ['x', 'y'];

/**
 * Punkt auf einer Raumfläche, an dem der Schall von `spk` zu `lis` zuerst reflektiert wird.
 * Spiegelt den Hörer an der Fläche und schneidet die Verbindung Lautsprecher → Spiegelbild mit der Fläche.
 */
export function reflectionPoint(spk: SpeakerPos, lis: SpeakerPos, surface: Surface, room: { length: number; width: number; height: number }): SpeakerPos | null {
  const { axis, plane } = surfacePlane(surface, room);
  const ds = Math.abs(spk[axis] - plane);
  const dl = Math.abs(lis[axis] - plane);
  if (ds + dl < 1e-9) return null;
  const t = ds / (ds + dl); // Anteil der Strecke Lautsprecher → Hörer bis zur Reflexion
  const at = (k: 'x' | 'y' | 'z') => (k === axis ? plane : spk[k] + (lis[k] - spk[k]) * t);
  return { x: at('x'), y: at('y'), z: at('z') };
}

/** Umweg der Reflexion gegenüber dem Direktschall in m (Spiegelquelle). */
export function reflectionDelay(spk: SpeakerPos, lis: SpeakerPos, p: SpeakerPos): number {
  const d = (a: SpeakerPos, b: SpeakerPos) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  return d(spk, p) + d(p, lis) - d(spk, lis);
}
