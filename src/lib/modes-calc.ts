/** Fasst die Berechnungen von Rechner 2 (Raummoden) für ein Raummodell zusammen. */
import type { RoomModel } from './room';
import { closeAxialPairs, coupling, modeDensity, roomModes, speedOfSound, toDb, type Mode, type Point } from './modes';

export const MODES_FMAX = 300;

/** Sitzposition in Wandkoordinaten (Abstand Stirnwand / linke Wand / Boden). */
export function seatPoint(m: RoomModel): Point {
  return { x: m.screen.wallGap + m.seat.distance, y: m.room.width / 2 + m.seat.offsetY, z: m.seat.eyeHeight };
}

export interface ModeAtSeat extends Mode {
  excitation: number;
  atSeat: number;
  /** relative Stärke am Sitz in dB (0 dB = volle Anregung im Druckbauch) */
  db: number;
}

export function computeModes(m: RoomModel) {
  const dims = m.room;
  const c = speedOfSound(m.acoustics.temperatureC);
  const seat = seatPoint(m);
  const subs: Point[] = m.subs;
  const modes: ModeAtSeat[] = roomModes(dims, c, MODES_FMAX).map((mode) => {
    const k = coupling(mode.n, dims, seat, subs);
    return { ...mode, excitation: k.excitation, atSeat: k.atSeat, db: toDb(k.product) };
  });
  const axial = modes.filter((x) => x.kind === 'axial');
  return {
    c,
    seat,
    modes,
    axial,
    counts: {
      axial: axial.length,
      tangential: modes.filter((x) => x.kind === 'tangential').length,
      oblique: modes.filter((x) => x.kind === 'oblique').length,
    },
    density: modeDensity(modes, 10, MODES_FMAX),
    closePairs: closeAxialPairs(modes),
    /** erste Mode je Richtung: Lage des Sitzes (Knoten/Bauch) */
    firstAxial: [0, 1, 2].map((dir) => axial.find((a) => a.n[dir] === 1)),
  };
}

export type ModesResult = ReturnType<typeof computeModes>;
