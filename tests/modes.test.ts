import { describe, expect, it } from 'vitest';
import { closeAxialPairs, coupling, modeDensity, modeFrequency, modeKind, modeShape, roomModes, speedOfSound, toDb } from '../src/lib/modes';
import { arrayCutoff, bassSources, seatSpread } from '../src/lib/modes-calc';
import { DEFAULT_ROOM, sanitizeRoom } from '../src/lib/room';

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

describe('Bass je Sitzplatz (seatSpread)', () => {
  // Raum 6 × 4 × 2,5 m, c = 343 m/s, ein Sub in der Ecke (0|0|0) → Anregung jeder Mode = 1
  const dims = { length: 6, width: 4, height: 2.5 };
  const seats = [
    { x: 0, y: 2, z: 1.25 },
    { x: 1.5, y: 2, z: 1.25 },
    { x: 3, y: 2, z: 1.25 },
  ];
  const r = seatSpread(dims, 343, [{ x: 0, y: 0, z: 0 }], seats);
  it('Längsmode 1-0-0 (28,6 Hz): cos 0 = 0 dB, cos 45° = −3,01 dB, cos 90° = Knoten → −30 dB (Untergrenze); Spanne 30 dB', () => {
    const md = r.modes.find((x) => x.n.join() === '1,0,0')!;
    expect(md.f).toBeCloseTo(343 / 12, 6);
    expect(md.db[0]).toBeCloseTo(0, 6);
    expect(md.db[1]).toBeCloseTo(-3.0103, 3);
    expect(md.db[2]).toBe(-30);
    expect(md.spread).toBeCloseTo(30, 6);
    expect([md.best, md.worst]).toEqual([0, 2]);
  });
  it('Breitenmode 0-1-0: alle Plätze in Raummitte (y = 2) liegen im Knoten → überall −30 dB, Spanne 0', () => {
    const md = r.modes.find((x) => x.n.join() === '0,1,0')!;
    expect(md.spread).toBe(0);
  });
  it('nur Moden bis 120 Hz; ein einzelner Platz hat überall Spanne 0', () => {
    expect(r.modes.every((x) => x.f <= 120 + 1e-9)).toBe(true);
    expect(seatSpread(dims, 343, [{ x: 0, y: 0, z: 0 }], [seats[1]]).mean).toBe(0);
  });
});

describe('Bass-Arrays (SBA/DBA)', () => {
  // Raum 6 × 4 × 2,5 m, c = 343 m/s, Raster 2 × 2, Wandabstand 0,3 m
  const room = (mode: 'sba' | 'dba', wallGap = 0.3) => {
    const m = structuredClone(DEFAULT_ROOM);
    m.bass = { mode, cols: 2, rows: 2, wallGap };
    return m;
  };
  const seat = { x: 4.2, y: 2, z: 1.2 };
  it('SBA-Raster: y = B/4, 3B/4 = 1 / 3 m; z = H/4, 3H/4 = 0,625 / 1,875 m; x = 0,3 m', () => {
    const s = bassSources(room('sba'), 343);
    expect(s).toHaveLength(4);
    expect(s.map((p) => p.y)).toEqual([1, 3, 1, 3]);
    expect(s.map((p) => p.z)).toEqual([0.625, 0.625, 1.875, 1.875]);
    expect(s.every((p) => p.x === 0.3 && !p.delay)).toBe(true);
  });
  it('SBA löscht Breitenmoden 1–3 aus: cos(nπ/4) + cos(3nπ/4) = 0; Mode 4: cos π + cos 3π = −2 → Anregung |−1|', () => {
    const s = bassSources(room('sba'), 343);
    for (const n of [1, 2, 3]) expect(coupling([0, n, 0], D, seat, s).excitation).toBeCloseTo(0, 10);
    expect(Math.abs(coupling([0, 4, 0], D, seat, s).excitation)).toBeCloseTo(1, 10);
    expect(coupling([0, 0, 1], D, seat, s).excitation).toBeCloseTo(0, 10);
  });
  it('DBA: Rückwand-Array verpolt, Verzögerung = Raumlänge/c = 6/343 = 17,49 ms (Nubert 2005: 6 m / 340 m/s = 17,6 ms)', () => {
    const s = bassSources(room('dba'), 343);
    expect(s).toHaveLength(8);
    const rear = s.filter((p) => p.gain === -1);
    expect(rear).toHaveLength(4);
    expect(rear[0].x).toBeCloseTo(5.7, 10);
    expect(rear[0].delay!).toBeCloseTo(6 / 343, 12);
  });
  it('Grenzfrequenz der ebenen Welle f = c/(2d): 2 × 2 auf 4 × 3 m → 343/(2·2) = 85,75 Hz, 343/(2·1,5) = 114,3 Hz (Wikipedia-Beispiel)', () => {
    const m = room('sba');
    m.room = { length: 6, width: 4, height: 3 };
    const fc = arrayCutoff(m, 343);
    expect(fc.width).toBeCloseTo(85.75, 6);
    expect(fc.height).toBeCloseTo(114.333, 3);
  });
  it('DBA direkt an den Wänden: 1. Längsmode vorn 1, hinten −1 · cos π · e^(−iπ) = −1 → Summe 0', () => {
    const s = bassSources(room('dba', 0), 343);
    expect(coupling([1, 0, 0], D, seat, s, 343 / 12).excitation).toBeCloseTo(0, 10);
  });
  it('DBA mit 0,3 m Wandabstand: Verzögerung L/c → Phase bei Längsmode n = nπ; hinten −1 · (−1)ⁿψ · (−1)ⁿ = −ψ → Summe 0 für n = 1…4', () => {
    const s = bassSources(room('dba'), 343);
    for (const n of [1, 2, 3, 4]) expect(coupling([n, 0, 0], D, seat, s, (n * 343) / 12).excitation).toBeCloseTo(0, 10);
    // SBA allein: Längsmode 1 voll angeregt, ψ = cos(0,05π) = 0,98769
    expect(Math.abs(coupling([1, 0, 0], D, seat, bassSources(room('sba'), 343), 343 / 12).excitation)).toBeCloseTo(0.98769, 4);
  });
  it('DBA schwächt die Moden an allen Plätzen deutlich stärker ab als SBA', () => {
    const seatsPts = [{ x: 4.2, y: 1.3, z: 1.2 }, { x: 4.2, y: 2, z: 1.2 }, { x: 5.8, y: 2, z: 1.5 }];
    const sba = seatSpread(D, 343, bassSources(room('sba'), 343), seatsPts);
    const dba = seatSpread(D, 343, bassSources(room('dba'), 343), seatsPts);
    expect(dba.level).toBeLessThan(sba.level - 10);
  });
  it('Energiemittel: Raum 6 × 1,4 × 1,4 m → bis 120 Hz nur Längsmoden 1–4 (Breite/Höhe erst bei 343/2,8 = 122,5 Hz)', () => {
    // Sub in der Ecke (Anregung 1). Platz x = 0: alle Moden 0 dB. Platz x = 3: cos(nπ/2) → n = 1, 3: Knoten (−30 dB), n = 2, 4: 0 dB.
    // 6 × 10^0 + 2 × 10^(−3) = 6,002 → /8 = 0,75025 → 10·log10 = −1,2479 dB; Spanne: 30, 0, 30, 0 → Mittel 15 dB
    const r = seatSpread({ length: 6, width: 1.4, height: 1.4 }, 343, [{ x: 0, y: 0, z: 0 }], [{ x: 0, y: 0.7, z: 0.7 }, { x: 3, y: 0.7, z: 0.7 }]);
    expect(r.modes.map((x) => x.n.join())).toEqual(['1,0,0', '2,0,0', '3,0,0', '4,0,0']);
    expect(r.level).toBeCloseTo(-1.2479, 3);
    expect(r.mean).toBeCloseTo(15, 6);
  });
  it('Import: v6 → v7 mit einzelnen Subs; ungültige Werte begrenzt', () => {
    expect(sanitizeRoom({ version: 6 }).bass).toEqual(DEFAULT_ROOM.bass);
    const r = sanitizeRoom({ ...DEFAULT_ROOM, bass: { mode: 'xyz', cols: 9, rows: 0, wallGap: 5 } });
    expect(r.bass).toEqual({ mode: 'free', cols: 4, rows: 1, wallGap: 1.5 });
  });
});
