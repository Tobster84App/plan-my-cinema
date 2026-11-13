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
import type { Source } from './modes';

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

const rate = (reserve: number): LevelStatus => (reserve >= RESERVE_WARN_DB - 1e-9 ? 'ok' : reserve >= -1e-9 ? 'warn' : 'bad');

/**
 * Subwoofer für den LFE-Kanal. Ziel = Kalibrierpegel + 20 dB + LFE-Anhebung (Erfahrungswert, Standard 10 dB).
 * Gezählt werden nur unverzögerte Subs mit positiver Polarität (beim DBA löscht das Rückwand-Array die Welle nur aus).
 * Mehrere Subs addieren sich phasengleich: L = 20 · log10(Σ 10^(L_i/20)) – bei tiefen Frequenzen und ähnlichen Abständen eine
 * übliche Näherung. Freifeld ohne Raumverstärkung: Im Raum ist der Bass meist deutlich lauter, das Ergebnis also vorsichtig.
 */
export function subLevels(m: RoomModel, subs: Source[], mlp: { x: number; y: number; z: number }) {
  const s = m.levels.sub;
  const target = m.levels.calSpl + FULL_SCALE_HEADROOM_DB + m.levels.lfeBoost;
  const active = subs.filter((q) => (q.gain ?? 1) > 0 && !q.delay);
  const dist = active.map((q) => Math.hypot(q.x - mlp.x, q.y - mlp.y, q.z - mlp.z));
  // Pegel je Sub bei 1 W Bezug: A_i = Empfindlichkeit − 10·log10(P_ref) − 20·log10(d_i)
  const sumAt = (power: number) => 20 * Math.log10(dist.reduce((a, d) => a + 10 ** (splAt(s.sens, s.basis, s.impedance, power, d) / 20), 0));
  if (!dist.length) return { target, count: 0, distances: dist, maxSpl: -Infinity, required: Infinity, reserve: -Infinity, status: 'bad' as LevelStatus };
  const maxSpl = sumAt(s.amp);
  const required = 10 ** ((target - sumAt(1)) / 10);
  const reserve = maxSpl - target;
  return { target, count: dist.length, distances: dist, maxSpl, required, reserve, status: rate(reserve) };
}

export function computeLevels(m: RoomModel, sp: SpeakersResult) {
  const target = m.levels.calSpl + FULL_SCALE_HEADROOM_DB;
  const rows = sp.speakers.map((s) => {
    const group = levelGroupOf(s.rule.group);
    const g = m.levels.groups[group];
    const required = powerFor(target, g.sens, g.basis, g.impedance, s.distance);
    const maxSpl = splAt(g.sens, g.basis, g.impedance, g.amp, s.distance);
    const reserve = maxSpl - target;
    const status = rate(reserve);
    return { id: s.id, group, distance: s.distance, required, maxSpl, reserve, status };
  });
  const worst = rows.reduce<(typeof rows)[number] | null>((w, x) => (!w || x.reserve < w.reserve ? x : w), null);
  return { target, rows, worst };
}
