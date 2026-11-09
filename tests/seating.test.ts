import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM, roomIssues, sanitizeRoom } from '../src/lib/room';
import { cValue, rateCValue, reflectionDelay, reflectionPoint, riserForC, seatPositions, sightlines } from '../src/lib/seating';
import { computeSpeakers } from '../src/lib/speakers-calc';

describe('Sitzplätze', () => {
  it('3 Plätze in Reihe 1, zentriert um den MLP (x = 0,4 + 3,8 = 4,2; y = 2 ± 0,7)', () => {
    const s = seatPositions(DEFAULT_ROOM);
    expect(s).toHaveLength(3);
    expect(s.map((x) => x.pos.y)).toEqual([1.3, 2, 2.7]);
    expect(s.every((x) => Math.abs(x.pos.x - 4.2) < 1e-9)).toBe(true);
    expect(s.filter((x) => x.isMlp).map((x) => x.index)).toEqual([2]);
  });
  it('2 Reihen: Reihe 2 bei x + 1,6 und Augen + 0,3 m', () => {
    const m = structuredClone(DEFAULT_ROOM);
    m.seating.rows = 2;
    const r2 = seatPositions(m).filter((x) => x.row === 2);
    expect(r2[0].pos.x).toBeCloseTo(5.8, 10);
    expect(r2[0].pos.z).toBeCloseTo(1.5, 10);
  });
  it('gerade Anzahl: kein Platz genau auf dem MLP', () => {
    const m = structuredClone(DEFAULT_ROOM);
    m.seating.seatsPerRow = 2;
    expect(seatPositions(m).some((x) => x.isMlp)).toBe(false);
  });
  it('v4-Daten erhalten Standard-Sitzreihen; Reihe hinter Rückwand wird gemeldet', () => {
    expect(sanitizeRoom({ version: 4 }).seating).toEqual(DEFAULT_ROOM.seating);
    expect(sanitizeRoom({ ...DEFAULT_ROOM, seating: { ...DEFAULT_ROOM.seating, rows: 9 } }).seating.rows).toBe(3);
    const m = structuredClone(DEFAULT_ROOM);
    m.seating.rows = 3; // 0,4 + 3,8 + 2 · 1,6 = 7,4 > 6
    expect(roomIssues(m)).toContain('rowsBehindBackWall');
  });
});

describe('Sichtlinie (C-Wert)', () => {
  const screen = { x: 0.4, bottom: 0.6 };
  it('Reihe 2 bei 5,8 m / 1,5 m: Sichtlinie bei 4,2 m = 0,6 + 0,9 · 3,8/5,4 = 1,2333 → C = 3,3 cm', () => {
    const c = cValue({ x: 5.8, z: 1.5 }, { x: 4.2, z: 1.2 }, screen);
    expect(c).toBeCloseTo(0.0333, 3);
    expect(rateCValue(c)).toBe('bad');
  });
  it('für C = 12 cm braucht Reihe 2 Augenhöhe 0,6 + 0,72/3,8 · 5,4 = 1,623 m (Podest ≈ 42 cm)', () => {
    expect(riserForC(5.8, 4.2, 1.2, 0.4, 0.6, 0.12)).toBeCloseTo(1.6232, 3);
  });
  it('Bewertung: ≥ 12 cm gut, 6–12 cm knapp, < 6 cm schlecht', () => {
    expect(rateCValue(0.12)).toBe('ok');
    expect(rateCValue(0.08)).toBe('warn');
    expect(rateCValue(0.05)).toBe('bad');
  });
});

describe('Erstreflexionen', () => {
  const spk = { x: 0.4, y: 0.9, z: 1.2 };
  const lis = { x: 4.2, y: 2, z: 1.2 };
  const room = { length: 6, width: 4, height: 2.5 };
  it('linke Wand: t = 0,9 / (0,9 + 2) = 0,3103 → x = 0,4 + 3,8 · t = 1,579 m', () => {
    const p = reflectionPoint(spk, lis, 'left', room)!;
    expect(p.y).toBe(0);
    expect(p.x).toBeCloseTo(1.5793, 3);
    expect(p.z).toBeCloseTo(1.2, 10);
  });
  it('Decke bei gleicher Höhe von Lautsprecher und Ohr: genau in der Mitte (x = 2,3 m)', () => {
    const p = reflectionPoint(spk, lis, 'ceiling', room)!;
    expect(p.z).toBe(2.5);
    expect(p.x).toBeCloseTo(2.3, 10);
  });
  it('Rückwand (x = 6): t = 5,6 / (5,6 + 1,8) = 0,7568 → y = 0,9 + 1,1 · t = 1,732 m', () => {
    const p = reflectionPoint(spk, lis, 'back', room)!;
    expect(p.x).toBe(6);
    expect(p.y).toBeCloseTo(1.7324, 3);
    expect(p.z).toBeCloseTo(1.2, 10);
  });
  it('Umweg linke Wand: √(3,8² + 2,9²) − √(3,8² + 1,1²) = 0,824 m', () => {
    const p = reflectionPoint(spk, lis, 'left', room)!;
    expect(reflectionDelay(spk, lis, p)).toBeCloseTo(0.8242, 3);
  });
});

describe('Planer mit mehreren Plätzen', () => {
  it('Bewertung je Platz; seitliche Plätze schlechter als der MLP möglich', () => {
    const r = computeSpeakers(DEFAULT_ROOM);
    expect(r.seats).toHaveLength(3);
    const mlp = r.seats.find((s) => s.seat.isMlp)!;
    expect(mlp.counts.ok).toBe(r.counts.ok);
    expect(Object.keys(r.worstBySpeaker)).toHaveLength(r.speakers.length);
  });
  it('Reflexionen aller Lautsprecher, aber nicht an der Fläche, an der der Lautsprecher hängt', () => {
    const r = computeSpeakers(DEFAULT_ROOM);
    expect(new Set(r.reflections.map((x) => x.id))).toEqual(new Set(r.speakers.map((s) => s.id)));
    // C steht 0,2 m vor der Stirnwand (< 0,3 m) → keine Stirnwand-Reflexion; L und Ls hängen an der linken Wand (y = 0,15)
    expect(r.reflections.some((x) => x.id === 'C' && x.surface === 'front')).toBe(false);
    expect(r.reflections.some((x) => x.id === 'L' && x.surface === 'left')).toBe(false);
    expect(r.reflections.some((x) => x.id === 'Ls' && x.surface === 'left')).toBe(false);
    expect(r.reflections.some((x) => x.id === 'Ltf' && x.surface === 'ceiling')).toBe(false);
    expect(r.reflections.some((x) => x.id === 'L' && x.surface === 'back')).toBe(true);
  });
  it('Absorberbereich über alle Plätze: L bei (0,4 | 0,9 | 1,2), Plätze y = 1,3 / 2 / 2,7 → linke Wand x = 1,35 … 1,955 m', () => {
    // t = 0,9/(0,9 + 2,7) = 0,25 → x = 0,4 + 3,8 · 0,25 = 1,35; t = 0,9/2,2 = 0,409 → x = 1,9545
    const m = structuredClone(DEFAULT_ROOM);
    m.speakers.overrides.L = { x: 0.4, y: 0.9, z: 1.2 };
    const f = computeSpeakers(m).reflections.find((x) => x.id === 'L' && x.surface === 'left')!;
    expect(f.area.a.min).toBeCloseTo(1.35, 3);
    expect(f.area.a.max).toBeCloseTo(1.9545, 3);
    expect(f.area.b.min).toBeCloseTo(1.2, 10);
    expect(f.area.b.max).toBeCloseTo(1.2, 10);
    expect(f.point.x).toBeCloseTo(1.5793, 3); // MLP-Punkt liegt im Bereich
  });
});

describe('Verschobene Plätze (Raummodell v6)', () => {
  it('Platz 2-1 übernimmt x/y, Höhe bleibt die der Reihe; MLP lässt sich hier nicht verschieben', () => {
    const m = structuredClone(DEFAULT_ROOM);
    m.seating.rows = 2;
    m.seating.overrides = { '2-1': { x: 5.5, y: 1 }, '1-2': { x: 1, y: 1 } };
    const s = seatPositions(m);
    const p21 = s.find((x) => x.row === 2 && x.index === 1)!;
    expect(p21.pos).toEqual({ x: 5.5, y: 1, z: 1.5 });
    expect(p21.moved).toBe(true);
    const mlp = s.find((x) => x.isMlp)!;
    expect(mlp.pos.x).toBeCloseTo(4.2, 10);
    expect(mlp.moved).toBe(false);
  });
  it('Import: ungültige Schlüssel fallen weg, v5 → v6 mit leerer Liste; Platz außerhalb wird gemeldet', () => {
    expect(sanitizeRoom({ version: 5 }).seating.overrides).toEqual({});
    const r = sanitizeRoom({ ...DEFAULT_ROOM, seating: { ...DEFAULT_ROOM.seating, overrides: { '2-1': { x: 7, y: 1 }, foo: { x: 1, y: 1 }, '1-3': 5 } } });
    expect(r.seating.overrides).toEqual({ '2-1': { x: 7, y: 1 } });
    expect(roomIssues(r)).toContain('seatOutsideRoom');
  });
  it('Sichtlinie meldet den ungünstigsten Platz der Reihe: 2-3 bei x = 5,95 → 0,6 + 0,9 · 3,8/5,55 = 1,2162 → C = 1,6 cm', () => {
    const m = structuredClone(DEFAULT_ROOM);
    m.seating.rows = 2;
    m.seating.overrides = { '2-3': { x: 5.95, y: 2.7 } };
    const [sl] = sightlines(m);
    expect(sl.index).toBe(3);
    expect(sl.c).toBeCloseTo(0.0162, 3);
  });
});
