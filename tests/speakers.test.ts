import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM, SPEAKER_LAYOUTS } from '../src/lib/room';
import { LAYOUT_CHANNELS, azimuthDeg, channelRule, elevationDeg, placeOnWalls, placeOverhead, rate } from '../src/lib/speakers';
import { computeSpeakers } from '../src/lib/speakers-calc';

const mlp = { x: 4.2, y: 3, z: 1.2 };
const input = { room: { length: 6, width: 6, height: 2.5 }, mlp, frontPlaneX: 0.2, listenerZ: 1.2, inset: 0.15 };

describe('Winkel', () => {
  it('Azimut: geradeaus 0°, links negativ, rechts positiv, hinten ±180°', () => {
    expect(azimuthDeg(mlp, { x: 0.2, y: 3, z: 1.2 })).toBeCloseTo(0, 10);
    expect(azimuthDeg(mlp, { x: 0.2, y: 3 - 4, z: 1.2 })).toBeCloseTo(-45, 10); // 4 m vor, 4 m links
    expect(azimuthDeg(mlp, { x: 4.2, y: 6, z: 1.2 })).toBeCloseTo(90, 10);
    expect(Math.abs(azimuthDeg(mlp, { x: 6, y: 3, z: 1.2 }))).toBeCloseTo(180, 10);
  });
  it('Elevation (Seitenansicht): 1,3 m höher und 1,3 m davor = 45°, senkrecht = 90°, dahinter = 135°', () => {
    expect(elevationDeg(mlp, { x: 2.9, y: 1, z: 2.5 })).toBeCloseTo(45, 10);
    expect(elevationDeg(mlp, { x: 4.2, y: 1, z: 2.5 })).toBeCloseTo(90, 10);
    expect(elevationDeg(mlp, { x: 5.5, y: 1, z: 2.5 })).toBeCloseTo(135, 10);
  });
});

describe('Automatische Platzierung', () => {
  it('L bei −26° trifft die Frontebene: t = 4,0 / cos 26° = 4,450 → y = 3 − sin 26° · 4,450 = 1,049', () => {
    const p = placeOnWalls(-26, input);
    expect(p.x).toBeCloseTo(0.2, 10);
    expect(p.y).toBeCloseTo(1.0491, 3);
    expect(p.z).toBe(1.2);
  });
  it('schmaler Raum (4 m): L bei −26° trifft zuerst die linke Wand bei x = 4,2 − cos 26° · 1,85/sin 26° = 0,407', () => {
    const p = placeOnWalls(-26, { ...input, room: { ...input.room, width: 4 }, mlp: { ...mlp, y: 2 } });
    expect(p.y).toBeCloseTo(0.15, 10);
    expect(p.x).toBeCloseTo(0.4069, 3);
  });
  it('Ls bei −100° an der linken Wand: x = 4,2 + cos 80° · 2,85/sin 100° = 4,703', () => {
    const p = placeOnWalls(-100, input);
    expect(p.y).toBeCloseTo(0.15, 10);
    expect(p.x).toBeCloseTo(4.7025, 3);
  });
  it('Overhead vorn 45°: x = 4,2 − 1,3 = 2,9; seitlich tan 30° · 4,0 = 2,309 → y = 0,691', () => {
    const p = placeOverhead(45, -1, input);
    expect(p.x).toBeCloseTo(2.9, 10);
    expect(p.y).toBeCloseTo(0.6906, 3);
    expect(p.z).toBe(2.5);
  });
  it('Overhead hinten 135°: x = 4,2 + 1,3 = 5,5; 90° genau über dem Sitz', () => {
    expect(placeOverhead(135, 1, input).x).toBeCloseTo(5.5, 10);
    expect(placeOverhead(90, 1, input).x).toBeCloseTo(4.2, 10);
  });
});

describe('Ampel', () => {
  it('im Bereich grün, bis 10° außerhalb gelb, darüber rot', () => {
    const r = { min: 90, max: 110 };
    expect(rate(100, r)).toBe('ok');
    expect(rate(110, r)).toBe('ok');
    expect(rate(118, r)).toBe('warn');
    expect(rate(121, r)).toBe('bad');
    expect(rate(81, r)).toBe('warn');
    expect(rate(79, r)).toBe('bad');
  });
  it('L/R: 22–30° grün, 30–40° gelb (Dolby G Abb. 3), über 40° rot', () => {
    const rule = channelRule('L', '7.1.4');
    expect(rate(28, rule.range, rule.extended)).toBe('ok');
    expect(rate(35, rule.range, rule.extended)).toBe('warn');
    expect(rate(41, rule.range, rule.extended)).toBe('bad');
    expect(rate(15, rule.range, rule.extended)).toBe('warn');
  });
});

describe('Regeln je Layout (freigegebene Dolby-Werte)', () => {
  it('Surround: 5.1 → 110–120°, 5.1.x → 90–120°, 7.1/9.1 → 90–110°', () => {
    expect(channelRule('Ls', '5.1').range).toEqual({ min: 110, max: 120 });
    expect(channelRule('Ls', '5.1.4').range).toEqual({ min: 90, max: 120 });
    expect(channelRule('Rs', '9.1.6').range).toEqual({ min: 90, max: 110 });
  });
  it('Top Middle: .2 → 65–100°, .6 → 70–110°', () => {
    expect(channelRule('Ltm', '7.1.2').range).toEqual({ min: 65, max: 100 });
    expect(channelRule('Rtm', '9.1.6').range).toEqual({ min: 70, max: 110 });
  });
  it('Kanalzahl je Layout = Name (z. B. 9.1.6 → 9 + 6 = 15)', () => {
    for (const l of SPEAKER_LAYOUTS) {
      const [a, , c = '0'] = l.split('.');
      expect(LAYOUT_CHANNELS[l]).toHaveLength(Number(a) + Number(c));
    }
  });
});

describe('computeSpeakers (Beispielraum 6 × 4 × 2,5 m, 7.1.4)', () => {
  const r = computeSpeakers(DEFAULT_ROOM);
  it('11 Lautsprecher, automatisch platziert, alle Winkel im Dolby-Bereich', () => {
    expect(r.speakers).toHaveLength(11);
    expect(r.speakers.every((s) => !s.manual)).toBe(true);
    expect(r.speakers.filter((s) => s.status !== 'ok').map((s) => [s.id, s.value.toFixed(1)])).toEqual([]);
  });
  it('Overheads auf Deckenhöhe; Faktor 2,5 / 1,2 = 2,08 liegt in 2–3', () => {
    expect(r.checks.overheadFactor).toBeCloseTo(2.0833, 3);
  });
  it('manuell verschobener Lautsprecher wird übernommen und neu bewertet', () => {
    const m = structuredClone(DEFAULT_ROOM);
    m.speakers.overrides.Ls = { x: 5.8, y: 0.15, z: 1.2 };
    const s = computeSpeakers(m).speakers.find((x) => x.id === 'Ls')!;
    expect(s.manual).toBe(true);
    expect(s.status).not.toBe('ok');
  });
});
