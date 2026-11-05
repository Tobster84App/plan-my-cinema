import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM, roomIssues, sanitizeRoom } from '../src/lib/room';
import { computeScreen } from '../src/lib/screen-calc';

describe('sanitizeRoom', () => {
  it('Müll → Standardraum', () => {
    expect(sanitizeRoom(null)).toEqual(DEFAULT_ROOM);
    expect(sanitizeRoom('x')).toEqual(DEFAULT_ROOM);
    expect(sanitizeRoom([1, 2])).toEqual(DEFAULT_ROOM);
  });
  it('begrenzt Zahlen und ersetzt falsche Typen', () => {
    const r = sanitizeRoom({ screen: { gain: 10, width: 'abc' }, projector: { scopeMethod: 'x', modelId: 42, shift: { up: null, down: 'x' }, lumens: NaN } });
    expect(r.screen.gain).toBe(3);
    expect(r.screen.width).toBe(DEFAULT_ROOM.screen.width);
    expect(r.projector.scopeMethod).toBe('zoom');
    expect(r.projector.modelId).toBeNull();
    expect(r.projector.shift.up).toBeNull();
    expect(r.projector.shift.down).toBe(DEFAULT_ROOM.projector.shift.down);
    expect(r.projector.lumens).toBe(DEFAULT_ROOM.projector.lumens);
  });
  it('gültiges Modell bleibt unverändert', () => {
    const m = structuredClone(DEFAULT_ROOM);
    m.projector.scopeMethod = 'lens';
    m.projector.modelId = 'beispiel-a-1000';
    expect(sanitizeRoom(m)).toEqual(m);
  });
});

describe('roomIssues', () => {
  it('Standardraum ist plausibel', () => {
    expect(roomIssues(DEFAULT_ROOM)).toEqual([]);
  });
  it('erkennt zu breite Leinwand, Oberkante über Decke, Sitz hinter Rückwand', () => {
    const m = structuredClone(DEFAULT_ROOM);
    m.screen.width = 4.5; // > 4,0 m Raumbreite; Höhe 1,915 + 0,6 = 2,515 > 2,5
    m.seat.distance = 5.7; // > 6,0 − 0,4
    expect(roomIssues(m)).toEqual(['screenWiderThanRoom', 'screenTopAboveCeiling', 'seatBehindBackWall']);
  });
});

describe('computeScreen (Beispielraum)', () => {
  const r = computeScreen(DEFAULT_ROOM);
  it('Zoom-Scope: 31,20 fL, Abstand 4,05–8,52 m, 5 m liegt im Bereich', () => {
    expect(r.fl).toBeCloseTo(31.197, 2);
    expect(r.throwDist.min).toBeCloseTo(4.05, 10);
    expect(r.throwStatus).toBe('ok');
    expect(r.throwRatio).toBeCloseTo(1.6667, 3);
  });
  it('Shift −56,99 % vertikal, 0 % horizontal, beides ok', () => {
    expect(r.shift.vReq).toBeCloseTo(-56.99, 2);
    expect(r.shift.hReq).toBeCloseTo(0, 10);
    expect(r.shift.vStatus).toBe('ok');
    expect(r.shift.combined).toBeNull();
  });
  it('Linse ändert Throw-Bezug: 1,35 · 2,2695 = 3,064 m', () => {
    const m = structuredClone(DEFAULT_ROOM);
    m.projector.scopeMethod = 'lens';
    const l = computeScreen(m);
    expect(l.throwDist.min).toBeCloseTo(3.0638, 3);
    expect(l.nits).toBeCloseTo(129.99, 1);
  });
  it('Abstand unter Minimum → tooClose', () => {
    const m = structuredClone(DEFAULT_ROOM);
    m.projector.distance = 4.0;
    expect(computeScreen(m).throwStatus).toBe('tooClose');
  });
});
