import { describe, expect, it } from 'vitest';
import { computeLevels, levelGroupOf, powerFor, refPower, splAt } from '../src/lib/levels';
import { DEFAULT_ROOM, sanitizeRoom } from '../src/lib/room';
import { computeSpeakers } from '../src/lib/speakers-calc';

describe('Pegel & Verstärker', () => {
  it('Bezugsleistung: 1 W/1 m → 1 W; 2,83 V an 4 Ω → 2,83²/4 = 2,0022 W; an 8 Ω → 1,0011 W', () => {
    expect(refPower('1w', 4)).toBe(1);
    expect(refPower('2v83', 4)).toBeCloseTo(2.002225, 6);
    expect(refPower('2v83', 8)).toBeCloseTo(1.0011125, 7);
  });
  it('88 dB (2,83 V), 8 Ω, 100 W, 3 m: 88 + 10·log10(100/1,0011) − 20·log10(3) = 98,45 dB', () => {
    expect(splAt(88, '2v83', 8, 100, 3)).toBeCloseTo(98.4527, 3);
  });
  it('102 dB in 4 m mit 88 dB (2,83 V) an 4 Ω: 2,0022 · 10^((102 − 88 + 12,041)/10) = 804,7 W', () => {
    expect(powerFor(102, 88, '2v83', 4, 4)).toBeCloseTo(804.698, 2);
  });
  it('Leistung und Pegel sind invers: splAt(powerFor(L)) = L', () => {
    expect(splAt(90, '1w', 6, powerFor(101.3, 90, '1w', 6, 2.7), 2.7)).toBeCloseTo(101.3, 9);
  });
  it('Gruppen: L/C/R = Front, Wides/Surround/Rear = Surround, Overheads = Höhe', () => {
    expect(levelGroupOf('front')).toBe('front');
    expect(['wide', 'surround', 'rear'].map((g) => levelGroupOf(g as never))).toEqual(['surround', 'surround', 'surround']);
    expect(levelGroupOf('overhead')).toBe('height');
  });
  it('Ziel = Kalibrierpegel + 20 dB; C (MLP 4,2 m, Lautsprecher bei x = 0,2 → 4,0 m) mit Beispielwerten: Reserve = 88 + 10·log10(100/1,0011) − 20·log10(4) − 102', () => {
    const m = structuredClone(DEFAULT_ROOM);
    const r = computeLevels(m, computeSpeakers(m));
    expect(r.target).toBe(102);
    const c = r.rows.find((x) => x.id === 'C')!;
    expect(c.distance).toBeCloseTo(4.0, 6);
    // 88 + 19,9952 − 12,0412 − 102 = −6,046 dB
    expect(c.reserve).toBeCloseTo(-6.046, 2);
    expect(c.status).toBe('bad');
  });
  it('Import: v7 → v8 mit Beispielwerten, Werte begrenzt', () => {
    expect(sanitizeRoom({ version: 7 }).levels).toEqual(DEFAULT_ROOM.levels);
    const r = sanitizeRoom({ ...DEFAULT_ROOM, levels: { calSpl: 120, groups: { front: { sens: 50, basis: 'x', impedance: 1, amp: 99999 } } } });
    expect(r.levels.calSpl).toBe(90);
    expect(r.levels.groups.front).toEqual({ sens: 70, basis: '2v83', impedance: 2, amp: 5000 });
  });
});
