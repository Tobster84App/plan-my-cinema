import { describe, expect, it } from 'vitest';
import {
  checkShift, combinedShiftUsage, diagonalFromWidth, distanceForAngle, isScope, lumensForNits,
  luminanceNits, nitsToFootLambert, projectedImage, rateBrightness, rateViewingAngle,
  requiredShiftPct, screenGeometry, throwRange, throwRatioAt, viewingAngleDeg, widthFromDiagonal,
} from '../src/lib/screen';

// Alle Sollwerte von Hand gerechnet (Rechenweg im Kommentar).

describe('Geometrie', () => {
  it('100″ 16:9 → Breite 2,2138 m (2,54 · 1,7778 / √(1 + 1,7778²))', () => {
    expect(widthFromDiagonal(2.54, 16 / 9)).toBeCloseTo(2.21380, 4);
  });
  it('Diagonale ↔ Breite ist umkehrbar', () => {
    expect(diagonalFromWidth(widthFromDiagonal(3.3, 2.39), 2.39)).toBeCloseTo(3.3, 10);
  });
  it('3,00 m bei 2,35:1 → H 1,2766 m, A 3,8298 m², D 3,2603 m', () => {
    const g = screenGeometry(3, 2.35);
    expect(g.height).toBeCloseTo(1.27660, 4);
    expect(g.area).toBeCloseTo(3.82979, 4);
    expect(g.diagonal).toBeCloseTo(3.26032, 4);
  });
  it('Grenzfälle: 0 oder negativ → 0', () => {
    expect(widthFromDiagonal(0, 16 / 9)).toBe(0);
    expect(widthFromDiagonal(-1, 16 / 9)).toBe(0);
    expect(diagonalFromWidth(2, 0)).toBe(0);
    expect(screenGeometry(-2, 2).area).toBe(0);
  });
  it('isScope: 1,78 ist kein Scope, 2,00 schon', () => {
    expect(isScope(1.7778)).toBe(false);
    expect(isScope(16 / 9)).toBe(false);
    expect(isScope(2)).toBe(true);
  });
});

describe('Projiziertes Bild', () => {
  const g = screenGeometry(3, 2.35);
  it('Zoom: Panelbild 3,00 × 1,6875 m, beleuchtet 5,0625 m², nutzbar 75,65 %', () => {
    const p = projectedImage(g, 2.35, 'zoom');
    expect(p.throwWidth).toBe(3);
    expect(p.height).toBeCloseTo(1.6875, 10);
    expect(p.litArea).toBeCloseTo(5.0625, 10);
    expect(p.usefulFraction).toBeCloseTo(0.75650, 4);
  });
  it('Linse: Throw-Bezug = ungedehnte Breite 1,2766 · 16/9 = 2,2695 m', () => {
    const p = projectedImage(g, 2.35, 'lens');
    expect(p.throwWidth).toBeCloseTo(2.26950, 4);
    expect(p.litArea).toBeCloseTo(3.82979, 4);
    expect(p.usefulFraction).toBe(1);
  });
  it('16:9-Leinwand ignoriert die Scope-Methode', () => {
    const g169 = screenGeometry(2, 16 / 9);
    expect(projectedImage(g169, 16 / 9, 'lens')).toEqual(projectedImage(g169, 16 / 9, 'zoom'));
  });
});

describe('Helligkeit', () => {
  it('1000 lm auf 2,25 m², Gain 1 → 1000 / (π · 2,25) = 141,47 nits', () => {
    expect(luminanceNits({ lumens: 1000, gain: 1, fabricLossPct: 0, lensLossPct: 0, litArea: 2.25 })).toBeCloseTo(141.471, 2);
  });
  it('Prototyp-Beispiel Zoom: 2000 lm · 0,85 / (π · 5,0625) = 106,89 nits = 31,20 fL', () => {
    const n = luminanceNits({ lumens: 2000, gain: 1, fabricLossPct: 15, lensLossPct: 0, litArea: 5.0625 });
    expect(n).toBeCloseTo(106.889, 2);
    expect(nitsToFootLambert(n)).toBeCloseTo(31.197, 2);
  });
  it('Linse 8 %: 2000 · 0,85 · 0,92 / (π · 3,8298) = 129,99 nits', () => {
    expect(luminanceNits({ lumens: 2000, gain: 1, fabricLossPct: 15, lensLossPct: 8, litArea: 3.829787 })).toBeCloseTo(129.99, 1);
  });
  it('Grenzfälle: Fläche 0, Lumen 0, Verlust > 100 % → 0', () => {
    expect(luminanceNits({ lumens: 2000, gain: 1, fabricLossPct: 0, lensLossPct: 0, litArea: 0 })).toBe(0);
    expect(luminanceNits({ lumens: 0, gain: 1, fabricLossPct: 0, lensLossPct: 0, litArea: 2 })).toBe(0);
    expect(luminanceNits({ lumens: 1000, gain: 1, fabricLossPct: 150, lensLossPct: 0, litArea: 2 })).toBe(0);
  });
  it('lumensForNits ist die Umkehrung', () => {
    const base = { gain: 1.3, fabricLossPct: 20, lensLossPct: 5, litArea: 4 };
    expect(lumensForNits(luminanceNits({ ...base, lumens: 1800 }), base)).toBeCloseTo(1800, 6);
  });
  it('Bewertung an den Grenzen 12 / 16 / 24 fL', () => {
    expect(rateBrightness(11.99)).toBe('dim');
    expect(rateBrightness(12)).toBe('reference');
    expect(rateBrightness(16)).toBe('bright');
    expect(rateBrightness(24)).toBe('hdr');
  });
});

describe('Projektionsabstand', () => {
  it('TR 1,35–2,84 bei 3,00 m → 4,05–8,52 m', () => {
    const r = throwRange(1.35, 2.84, 3);
    expect(r.min).toBeCloseTo(4.05, 10);
    expect(r.max).toBeCloseTo(8.52, 10);
  });
  it('vertauschte Grenzen werden sortiert', () => {
    expect(throwRange(2.84, 1.35, 3)).toEqual(throwRange(1.35, 2.84, 3));
  });
  it('Breite 0 → 0', () => {
    expect(throwRange(1.35, 2.84, 0)).toEqual({ min: 0, max: 0 });
    expect(throwRatioAt(5, 0)).toBe(0);
  });
  it('Throw Ratio bei 5 m und 3 m Breite = 1,667', () => {
    expect(throwRatioAt(5, 3)).toBeCloseTo(1.66667, 4);
  });
});

describe('Blickwinkel', () => {
  it('3 m Breite, 3,8 m Abstand → 2 · atan(3 / 7,6) = 43,08°', () => {
    expect(viewingAngleDeg(3, 3.8)).toBeCloseTo(43.082, 2);
  });
  it('Abstände für 30° / 36° / 40° bei 3 m: 5,598 / 4,617 / 4,121 m', () => {
    expect(distanceForAngle(3, 30)).toBeCloseTo(5.5981, 3);
    expect(distanceForAngle(3, 36)).toBeCloseTo(4.6165, 3);
    expect(distanceForAngle(3, 40)).toBeCloseTo(4.1212, 3);
  });
  it('Umkehrbarkeit', () => {
    expect(viewingAngleDeg(2.5, distanceForAngle(2.5, 33))).toBeCloseTo(33, 10);
  });
  it('Grenzfälle', () => {
    expect(viewingAngleDeg(3, 0)).toBe(0);
    expect(distanceForAngle(3, 0)).toBe(0);
    expect(distanceForAngle(3, 180)).toBe(0);
  });
  it('Bewertung an den Grenzen 30 / 36 / 40°', () => {
    expect(rateViewingAngle(29.99)).toBe('narrow');
    expect(rateViewingAngle(30)).toBe('smpte');
    expect(rateViewingAngle(36)).toBe('thx');
    expect(rateViewingAngle(40)).toBe('thx');
    expect(rateViewingAngle(40.01)).toBe('wide');
  });
});

describe('Lens Shift', () => {
  // Bildmitte 0,6 + 1,2766/2 = 1,2383 m, Objektiv 2,2 m
  it('Zoom: (1,2383 − 2,2) / 1,6875 = −56,99 %', () => {
    expect(requiredShiftPct(1.2382979, 2.2, 1.6875)).toBeCloseTo(-56.99, 2);
  });
  it('Linse: (1,2383 − 2,2) / 1,2766 = −75,33 %', () => {
    expect(requiredShiftPct(1.2382979, 2.2, 1.2765957)).toBeCloseTo(-75.33, 2);
  });
  it('Prüfung gegen verfügbaren Bereich', () => {
    expect(checkShift(-57, 90)).toBe('ok');
    expect(checkShift(-57, 50)).toBe('outside');
    expect(checkShift(90, 90)).toBe('ok');
    expect(checkShift(0, 0)).toBe('ok');
    expect(checkShift(5, 0)).toBe('outside');
    expect(checkShift(5, null)).toBe('unknown');
  });
  it('Raute: 45/90 + 20/40 = 1,0', () => {
    expect(combinedShiftUsage(45, -20, 90, 40)).toBeCloseTo(1, 10);
    expect(combinedShiftUsage(10, 0, 90, 0)).toBeCloseTo(0.1111, 4);
    expect(combinedShiftUsage(0, 5, 90, 0)).toBe(Infinity);
  });
  it('Bildgröße 0 → 0', () => {
    expect(requiredShiftPct(1, 2, 0)).toBe(0);
  });
});
