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
}

/** Alle Plätze; Reihe 1 liegt auf Höhe des Hauptsitzplatzes, die Plätze einer Reihe sind um den MLP zentriert. */
export function seatPositions(m: RoomModel): Seat[] {
  const g = m.seating;
  const x0 = m.screen.wallGap + m.seat.distance;
  const yC = m.room.width / 2 + m.seat.offsetY;
  const seats: Seat[] = [];
  const mid = (g.seatsPerRow - 1) / 2;
  for (let r = 1; r <= g.rows; r++) {
    for (let i = 0; i < g.seatsPerRow; i++) {
      seats.push({
        row: r,
        index: i + 1,
        pos: { x: x0 + (r - 1) * g.rowSpacing, y: yC + (i - mid) * g.seatSpacing, z: m.seat.eyeHeight + (r - 1) * g.riserStep },
        // MLP = mittlerer Platz der ersten Reihe (bei gerader Anzahl liegt der MLP zwischen zwei Plätzen)
        isMlp: r === 1 && Math.abs(i - mid) < 1e-9,
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

export function sightlines(m: RoomModel) {
  const seats = seatPositions(m);
  const screen = { x: m.screen.wallGap, bottom: m.screen.bottomEdge };
  const out: { row: number; c: number; status: SightStatus; requiredEyeZ: number }[] = [];
  for (let r = 2; r <= m.seating.rows; r++) {
    const rear = seats.find((s) => s.row === r)!.pos;
    const front = seats.find((s) => s.row === r - 1)!.pos;
    const c = cValue(rear, front, screen);
    out.push({ row: r, c, status: rateCValue(c), requiredEyeZ: riserForC(rear.x, front.x, front.z, screen.x, screen.bottom, C_VALUE_LIMITS.good) });
  }
  return out;
}

/* ---------- Erstreflexionen (Spiegelquellen-Methode) ---------- */

export type Surface = 'left' | 'right' | 'ceiling' | 'floor';

/**
 * Punkt auf einer Raumfläche, an dem der Schall von `spk` zu `lis` zuerst reflektiert wird.
 * Spiegelt den Hörer an der Fläche und schneidet die Verbindung Lautsprecher → Spiegelbild mit der Fläche.
 */
export function reflectionPoint(spk: SpeakerPos, lis: SpeakerPos, surface: Surface, room: { width: number; height: number }): SpeakerPos | null {
  const plane = surface === 'left' ? 0 : surface === 'right' ? room.width : surface === 'ceiling' ? room.height : 0;
  const axis: 'y' | 'z' = surface === 'left' || surface === 'right' ? 'y' : 'z';
  const ds = Math.abs(spk[axis] - plane);
  const dl = Math.abs(lis[axis] - plane);
  if (ds + dl < 1e-9) return null;
  const t = ds / (ds + dl); // Anteil der Strecke Lautsprecher → Hörer bis zur Reflexion
  return {
    x: spk.x + (lis.x - spk.x) * t,
    y: axis === 'y' ? plane : spk.y + (lis.y - spk.y) * t,
    z: axis === 'z' ? plane : spk.z + (lis.z - spk.z) * t,
  };
}

/** Umweg der Reflexion gegenüber dem Direktschall in m (Spiegelquelle). */
export function reflectionDelay(spk: SpeakerPos, lis: SpeakerPos, p: SpeakerPos): number {
  const d = (a: SpeakerPos, b: SpeakerPos) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  return d(spk, p) + d(p, lis) - d(spk, lis);
}
