/**
 * Ausrichtung der Lautsprecher (Toe-in, Neigung) und Abdeckung der Sitzplätze – reine Funktionen.
 *
 * - Ohrhöhen-Lautsprecher: Grundrichtung = Normale der nächstgelegenen Wand (in den Raum hinein).
 *   Eindrehen (Toe-in) = Winkel in der Draufsicht zwischen dieser Normalen und der Richtung zum Ziel.
 *   Neigung = Höhenwinkel der Richtung zum Ziel (negativ = nach unten).
 * - Deckenlautsprecher: Dolby (Installation Guidelines 12/2018, S. 7): Bei breiter Abstrahlung (≈ ±45° von 100 Hz bis
 *   10 kHz oder mehr) dürfen sie senkrecht nach unten zeigen; schwenkbare Modelle mit engerer Abstrahlung sollen zum
 *   Hauptsitzplatz geneigt werden. Der Planer nimmt deshalb ab ±45° die Achse senkrecht nach unten, darunter die Richtung zum Ziel.
 * - Abdeckung: Winkel zwischen Lautsprecherachse und Richtung zum Platz (3D). Bewertung: ≤ Abstrahlwinkel gut,
 *   bis 10° darüber knapp (eigene Festlegung, wie bei der Winkel-Ampel), darüber außerhalb.
 */
import type { RoomModel, SpeakerId, SpeakerPos } from './room';
import { levelGroupOf } from './levels';
import type { SpeakersResult } from './speakers-calc';

export const DOLBY_OVERHEAD_WIDE_DEG = 45;
export const AIM_TOLERANCE_DEG = 10;

type V = { x: number; y: number; z: number };
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (a: V) => Math.hypot(a.x, a.y, a.z);
const deg = (r: number) => (r * 180) / Math.PI;
/** Winkel zwischen zwei Vektoren in Grad */
export const angleBetween = (a: V, b: V) => deg(Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / (len(a) * len(b))))));

/** Nach innen zeigende Normale der nächstgelegenen Wand (Stirn-, Rück-, linke, rechte Wand). */
export function wallNormal(p: SpeakerPos, room: { length: number; width: number }): V {
  const c = [
    { d: p.x, n: { x: 1, y: 0, z: 0 } },
    { d: room.length - p.x, n: { x: -1, y: 0, z: 0 } },
    { d: p.y, n: { x: 0, y: 1, z: 0 } },
    { d: room.width - p.y, n: { x: 0, y: -1, z: 0 } },
  ];
  return c.reduce((a, b) => (b.d < a.d ? b : a)).n;
}

/** Zielpunkt: Hauptsitzplatz oder Mittelpunkt aller Plätze. */
export function aimPoint(m: RoomModel, r: SpeakersResult): V {
  if (m.speakers.aim === 'mlp' || r.seats.length === 0) return r.mlp;
  const n = r.seats.length;
  const s = r.seats.reduce((a, st) => ({ x: a.x + st.seat.pos.x, y: a.y + st.seat.pos.y, z: a.z + st.seat.pos.z }), { x: 0, y: 0, z: 0 });
  return { x: s.x / n, y: s.y / n, z: s.z / n };
}

export type AimStatus = 'ok' | 'warn' | 'bad';
const rate = (off: number, half: number): AimStatus => (off <= half + 1e-9 ? 'ok' : off <= half + AIM_TOLERANCE_DEG + 1e-9 ? 'warn' : 'bad');

export function computeAiming(m: RoomModel, r: SpeakersResult) {
  const target = aimPoint(m, r);
  const WORST: Record<AimStatus, number> = { ok: 0, warn: 1, bad: 2 };
  const rows = r.speakers.map((sp) => {
    const own = m.speakers.dispersionOverrides[sp.id as SpeakerId];
    const half = own ?? m.speakers.dispersion[levelGroupOf(sp.rule.group)];
    const toTarget = sub(target, sp.pos);
    const overhead = sp.rule.measure === 'elevation';
    const facesDown = overhead && half >= DOLBY_OVERHEAD_WIDE_DEG - 1e-9;
    const axis: V = facesDown ? { x: 0, y: 0, z: -1 } : toTarget;
    let toeIn: number | null = null;
    let tilt: number;
    if (overhead) {
      // Neigung aus der Senkrechten
      tilt = facesDown ? 0 : angleBetween({ x: 0, y: 0, z: -1 }, toTarget);
    } else {
      const n = wallNormal(sp.pos, m.room);
      toeIn = angleBetween(n, { x: toTarget.x, y: toTarget.y, z: 0 });
      tilt = deg(Math.atan2(toTarget.z, Math.hypot(toTarget.x, toTarget.y)));
    }
    const seats = r.seats.map((st) => {
      const off = angleBetween(axis, sub(st.seat.pos, sp.pos));
      return { off, status: rate(off, half) };
    });
    const worstIdx = seats.reduce((w, x, i) => (x.off > seats[w].off ? i : w), 0);
    const status = seats.reduce<AimStatus>((w, x) => (WORST[x.status] > WORST[w] ? x.status : w), 'ok');
    return { id: sp.id, overhead, half, own: own != null, facesDown, toeIn, tilt, axis, seats, worstIdx, status, outside: seats.filter((x) => x.status === 'bad').length };
  });
  return { target, rows };
}

export type AimingResult = ReturnType<typeof computeAiming>;
