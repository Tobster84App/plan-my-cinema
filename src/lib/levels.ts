/**
 * Rechner 4: Pegel & Verstärker – reine Funktionen.
 *
 * Schalldruck im Freifeld:  L = Kennempfindlichkeit + 10 · log10(P / P_ref) − 20 · log10(d / 1 m)
 *   P_ref = 1 W, wenn die Empfindlichkeit für 1 W/1 m angegeben ist,
 *   P_ref = 2,83² / Z, wenn sie für 2,83 V/1 m angegeben ist (bei 4 Ω also ≈ 2 W).
 * Ziel: Kalibrierpegel laut Dolby 79–82 dB SPL(C) am Hauptsitzplatz bei rosa Rauschen mit −20 dBFS RMS
 * (Dolby Atmos Home Theater Installation Guidelines, 12/2018, S. 15). Bei 0 dBFS RMS liegt der Pegel 20 dB höher.
 * Vereinfachungen: Freifeld ohne Raumreflexionen (im Raum meist lauter), kein Leistungskompressionsverlust,
 * Verstärkerleistung als Dauerleistung an der angegebenen Impedanz.
 */
import type { RoomModel, SensBasis, LevelGroup } from './room';
import type { SpeakerGroup } from './speakers';
import type { SpeakersResult } from './speakers-calc';

/** Abstand zwischen Kalibriersignal (−20 dBFS RMS) und Vollaussteuerung (0 dBFS RMS). */
export const FULL_SCALE_HEADROOM_DB = 20;
/** Kalibrierbereich laut Dolby (S. 15). */
export const DOLBY_CAL_RANGE = { min: 79, max: 82 } as const;
/** Reserve unter diesem Wert gilt als knapp (eigene Festlegung). */
export const RESERVE_WARN_DB = 3;

export const refPower = (basis: SensBasis, impedance: number): number => (basis === '1w' ? 1 : (2.83 * 2.83) / impedance);

/** Schalldruckpegel im Abstand d bei Leistung P. */
export function splAt(sens: number, basis: SensBasis, impedance: number, power: number, d: number): number {
  return sens + 10 * Math.log10(power / refPower(basis, impedance)) - 20 * Math.log10(d);
}

/** Nötige Leistung für den Pegel L im Abstand d. */
export function powerFor(level: number, sens: number, basis: SensBasis, impedance: number, d: number): number {
  return refPower(basis, impedance) * 10 ** ((level - sens + 20 * Math.log10(d)) / 10);
}

export const levelGroupOf = (g: SpeakerGroup): LevelGroup => (g === 'front' ? 'front' : g === 'overhead' ? 'height' : 'surround');

export type LevelStatus = 'ok' | 'warn' | 'bad';

export function computeLevels(m: RoomModel, sp: SpeakersResult) {
  const target = m.levels.calSpl + FULL_SCALE_HEADROOM_DB;
  const rows = sp.speakers.map((s) => {
    const group = levelGroupOf(s.rule.group);
    const g = m.levels.groups[group];
    const required = powerFor(target, g.sens, g.basis, g.impedance, s.distance);
    const maxSpl = splAt(g.sens, g.basis, g.impedance, g.amp, s.distance);
    const reserve = maxSpl - target;
    const status: LevelStatus = reserve >= RESERVE_WARN_DB - 1e-9 ? 'ok' : reserve >= -1e-9 ? 'warn' : 'bad';
    return { id: s.id, group, distance: s.distance, required, maxSpl, reserve, status };
  });
  const worst = rows.reduce<(typeof rows)[number] | null>((w, x) => (!w || x.reserve < w.reserve ? x : w), null);
  return { target, rows, worst };
}
