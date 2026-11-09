/** Fasst die Berechnungen von Rechner 2 (Raummoden) für ein Raummodell zusammen. */
import type { RoomModel } from './room';
import { closeAxialPairs, coupling, modeDensity, roomModes, speedOfSound, toDb, type Mode, type Point, type RoomDims, type Source } from './modes';
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

/**
 * Quellen des Bass-Systems.
 * - free: die einzeln eingetragenen Subs (gleich laut, gleichphasig)
 * - sba: Raster an der Stirnwand – cols × rows Subs, gleichmäßig verteilt mit halbem Rasterabstand zu den Wänden
 * - dba: dasselbe Raster zusätzlich an der Rückwand, invertiert und um die Laufzeit zwischen den Arrays verzögert
 * Rasterregel und Polarität/Verzögerung: siehe Erklärtext (Quellenlage dort).
 */
export function bassSources(m: RoomModel, c: number): Source[] {
  const b = m.bass;
  if (b.mode === 'free') return m.subs.map((s) => ({ ...s }));
  const grid: { y: number; z: number }[] = [];
  for (let j = 0; j < b.rows; j++)
    for (let k = 0; k < b.cols; k++) grid.push({ y: ((2 * k + 1) * m.room.width) / (2 * b.cols), z: ((2 * j + 1) * m.room.height) / (2 * b.rows) });
  const xf = b.wallGap;
  const front = grid.map((g) => ({ x: xf, ...g }));
  if (b.mode === 'sba') return front;
  const xr = Math.max(xf, m.room.length - b.wallGap);
  const delay = (xr - xf) / c;
  return [...front, ...grid.map((g) => ({ x: xr, ...g, gain: -1, delay }))];
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
export function seatSpread(dims: RoomDims, c: number, subs: Source[], seats: Point[]) {
  const modes = roomModes(dims, c, SPREAD_FMAX).map((mode) => {
    const db = seats.map((p) => toDb(coupling(mode.n, dims, p, subs, mode.f).product, SPREAD_FLOOR_DB));
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
  const subs = bassSources(m, c);
  const modes: ModeAtSeat[] = roomModes(dims, c, MODES_FMAX).map((mode) => {
    const k = coupling(mode.n, dims, seat, subs, mode.f);
    return { ...mode, excitation: k.excitation, atSeat: k.atSeat, db: toDb(k.product) };
  });
  const axial = modes.filter((x) => x.kind === 'axial');
  return {
    c,
    seat,
    seats: seatList,
    subs,
    spread: seatSpread(dims, c, subs, seatList.map((x) => x.pos)),
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
