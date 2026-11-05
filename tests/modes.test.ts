import { describe, expect, it } from 'vitest';
import { closeAxialPairs, coupling, modeDensity, modeFrequency, modeKind, modeShape, roomModes, speedOfSound, toDb } from '../src/lib/modes';

const D = { length: 6, width: 4, height: 2.5 };
const C = 343;

describe('Schallgeschwindigkeit', () => {
  it('0 °C → 331,3 m/s; 20 °C → 331,3 · √(1 + 20/273,15) = 343,21 m/s', () => {
    expect(speedOfSound(0)).toBeCloseTo(331.3, 10);
    expect(speedOfSound(20)).toBeCloseTo(343.215, 2);
  });
  it('wärmer → schneller', () => {
    expect(speedOfSound(30)).toBeGreaterThan(speedOfSound(10));
  });
});

describe('Modenfrequenzen 6 × 4 × 2,5 m, c = 343 m/s', () => {
  it('axial: 343/12 = 28,58 · 343/8 = 42,88 · 343/5 = 68,60 Hz', () => {
    expect(modeFrequency([1, 0, 0], D, C)).toBeCloseTo(28.583, 3);
    expect(modeFrequency([0, 1, 0], D, C)).toBeCloseTo(42.875, 3);
    expect(modeFrequency([0, 0, 1], D, C)).toBeCloseTo(68.6, 3);
  });
  it('tangential (1,1,0): 171,5 · √(1/36 + 1/16) = 51,53 Hz', () => {
    expect(modeFrequency([1, 1, 0], D, C)).toBeCloseTo(51.529, 3);
  });
  it('oblique (1,1,1): 171,5 · √(1/36 + 1/16 + 1/6,25) = 85,80 Hz', () => {
    expect(modeFrequency([1, 1, 1], D, C)).toBeCloseTo(85.798, 3);
  });
  it('Typen', () => {
    expect(modeKind([2, 0, 0])).toBe('axial');
    expect(modeKind([0, 3, 1])).toBe('tangential');
    expect(modeKind([1, 2, 3])).toBe('oblique');
  });
});

describe('roomModes bis 300 Hz', () => {
  const modes = roomModes(D, C, 300);
  it('axial: ⌊300·12/343⌋ + ⌊300·8/343⌋ + ⌊300·5/343⌋ = 10 + 6 + 4 = 20', () => {
    expect(modes.filter((m) => m.kind === 'axial')).toHaveLength(20);
  });
  it('Gesamtzahl 233 (98 tangential, 115 oblique; Gegenprobe mit unabhängiger Schleife)', () => {
    expect(modes).toHaveLength(233);
    expect(modes.filter((m) => m.kind === 'tangential')).toHaveLength(98);
    expect(modes.filter((m) => m.kind === 'oblique')).toHaveLength(115);
  });
  it('aufsteigend sortiert, erste Mode 28,58 Hz, keine über 300 Hz', () => {
    expect(modes[0].n).toEqual([1, 0, 0]);
    expect(modes.every((m, i) => i === 0 || m.f >= modes[i - 1].f)).toBe(true);
    expect(modes[modes.length - 1].f).toBeLessThanOrEqual(300);
  });
  it('Grenzfälle: Maß 0 oder c 0 → keine Moden', () => {
    expect(roomModes({ ...D, width: 0 }, C, 300)).toEqual([]);
    expect(roomModes(D, 0, 300)).toEqual([]);
  });
});

describe('Modenform', () => {
  it('Wand = Druckbauch (1), Raummitte bei n=1 = Knoten (0), bei n=2 = Bauch mit Gegenphase (−1)', () => {
    expect(modeShape([1, 0, 0], D, { x: 0, y: 1, z: 1 })).toBeCloseTo(1, 10);
    expect(modeShape([1, 0, 0], D, { x: 3, y: 1, z: 1 })).toBeCloseTo(0, 10);
    expect(modeShape([2, 0, 0], D, { x: 3, y: 1, z: 1 })).toBeCloseTo(-1, 10);
  });
  it('Ecke regt jede Mode voll an (|p| = 1)', () => {
    expect(Math.abs(modeShape([3, 2, 1], D, { x: 0, y: 0, z: 0 }))).toBeCloseTo(1, 10);
    expect(Math.abs(modeShape([3, 2, 1], D, { x: 6, y: 4, z: 2.5 }))).toBeCloseTo(1, 10);
  });
});

describe('Kopplung Sub → Sitz', () => {
  const seat = { x: 4, y: 2, z: 1.2 };
  it('zwei Subs an gegenüberliegenden Stirnwänden löschen die 1. Längsmode aus (cos 0 + cos π = 0)', () => {
    const c = coupling([1, 0, 0], D, seat, [{ x: 0, y: 2, z: 0.3 }, { x: 6, y: 2, z: 0.3 }]);
    expect(c.excitation).toBeCloseTo(0, 10);
  });
  it('dieselben Subs verstärken die 2. Längsmode (cos 0 + cos 2π) / 2 = 1', () => {
    expect(coupling([2, 0, 0], D, seat, [{ x: 0, y: 2, z: 0.3 }, { x: 6, y: 2, z: 0.3 }]).excitation).toBeCloseTo(1, 10);
  });
  it('Sitz in Breitenmitte = Knoten der 1. Breitenmode', () => {
    expect(coupling([0, 1, 0], D, seat, [{ x: 0, y: 0, z: 0 }]).atSeat).toBeCloseTo(0, 10);
  });
  it('keine Subs → keine Anregung', () => {
    expect(coupling([1, 0, 0], D, seat, []).excitation).toBe(0);
  });
  it('dB: 1 → 0 dB, 0,5 → −6,02 dB, 0 → Untergrenze', () => {
    expect(toDb(1)).toBeCloseTo(0, 10);
    expect(toDb(-0.5)).toBeCloseTo(-6.0206, 3);
    expect(toDb(0)).toBe(-40);
  });
});

describe('Modendichte und Häufungen', () => {
  const modes = roomModes(D, C, 300);
  it('10-Hz-Bänder summieren sich zur Gesamtzahl', () => {
    const bins = modeDensity(modes, 10, 300);
    expect(bins).toHaveLength(30);
    expect(bins.reduce((s, b) => s + b.axial + b.tangential + b.oblique, 0)).toBe(233);
    expect(bins[2]).toMatchObject({ axial: 1, tangential: 0, oblique: 0 }); // 20–30 Hz: nur 28,58
  });
  it('Häufung: 6 × 4 × 2,5 m → 2. Breitenmode 85,75 Hz und 3. Längsmode 85,75 Hz fallen zusammen', () => {
    // 2·343/8 = 85,75 und 3·343/12 = 85,75
    const pairs = closeAxialPairs(modes);
    expect(pairs.some(([a, b]) => Math.abs(a.f - 85.75) < 0.01 && Math.abs(b.f - 85.75) < 0.01)).toBe(true);
  });
});
