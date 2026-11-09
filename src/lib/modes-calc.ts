/** Fasst die Berechnungen von Rechner 2 (Raummoden) für ein Raummodell zusammen. */
import type { RoomModel } from './room';
import { closeAxialPairs, coupling, modeDensity, roomModes, speedOfSound, toDb, type Mode, type Point, type RoomDims } from './modes';
import { seatPositions } from './seating';

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

/** Bereich, in dem einzelne Moden den Bass prägen und Platzunterschiede ausgewertet werden (eigene Festlegung). */
export const SPREAD_FMAX = 120;
/** Untergrenze für die Platzvergleiche: tiefer als −30 dB zählt als „ausgelöscht“ (eigene Festlegung). */
export const SPREAD_FLOOR_DB = -30;
/** Ab diesem Unterschied zwischen bestem und schlechtestem Platz wird eine Mode hervorgehoben (eigene Festlegung). */
export const SPREAD_WARN_DB = 10;

/**
 * Unterschiede zwischen den Plätzen je Mode (bis SPREAD_FMAX): Stärke der Mode am Platz (Anregung × Modenform)
 * in dB, Spanne = bester − schlechtester Platz. `mean` = mittlere Spanne über alle Moden im Bereich.
 * Vereinfacht wie das Modenspektrum: ohne Dämpfung, Subs gleich laut und gleichphasig.
 */
export function seatSpread(dims: RoomDims, c: number, subs: Point[], seats: Point[]) {
  const modes = roomModes(dims, c, SPREAD_FMAX).map((mode) => {
    const db = seats.map((p) => toDb(coupling(mode.n, dims, p, subs).product, SPREAD_FLOOR_DB));
    const max = Math.max(...db);
    const min = Math.min(...db);
    return { ...mode, db, spread: max - min, best: db.indexOf(max), worst: db.indexOf(min) };
  });
  const mean = modes.length ? modes.reduce((a, x) => a + x.spread, 0) / modes.length : 0;
  return { modes, mean };
}

/** `seatIndex`: Platz aus seatPositions(m), für den Spektrum und Hinweise gelten; ohne Angabe der Hauptsitzplatz. */
export function computeModes(m: RoomModel, seatIndex: number | null = null) {
  const dims = m.room;
  const c = speedOfSound(m.acoustics.temperatureC);
  const seatList = seatPositions(m);
  const chosen = seatIndex != null ? seatList[seatIndex] : undefined;
  const seat = chosen ? chosen.pos : seatPoint(m);
  const subs: Point[] = m.subs;
  const modes: ModeAtSeat[] = roomModes(dims, c, MODES_FMAX).map((mode) => {
    const k = coupling(mode.n, dims, seat, subs);
    return { ...mode, excitation: k.excitation, atSeat: k.atSeat, db: toDb(k.product) };
  });
  const axial = modes.filter((x) => x.kind === 'axial');
  return {
    c,
    seat,
    seats: seatList,
    spread: seatSpread(dims, c, m.subs, seatList.map((x) => x.pos)),
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
