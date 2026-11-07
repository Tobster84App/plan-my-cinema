import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM, roomIssues, sanitizeRoom } from '../src/lib/room';
import { cValue, rateCValue, reflectionDelay, reflectionPoint, riserForC, seatPositions } from '../src/lib/seating';
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
  const room = { width: 4, height: 2.5 };
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
  it('Reflexionen für L, C, R an vier Flächen', () => {
    const r = computeSpeakers(DEFAULT_ROOM);
    expect(new Set(r.reflections.map((x) => x.id))).toEqual(new Set(['L', 'C', 'R']));
    expect(r.reflections).toHaveLength(12);
  });
});
