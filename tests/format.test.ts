import { describe, expect, it } from 'vitest';
import { feetInches, fieldFactor, fmtLength, fmtNum, parseDecimal } from '../src/lib/format';

describe('Formatierung', () => {
  it('Dezimaltrenner je Sprache', () => {
    expect(fmtNum(1234.5, 1, 'de')).toBe('1.234,5');
    expect(fmtNum(1234.5, 1, 'en')).toBe('1,234.5');
    expect(fmtNum(NaN, 0, 'de')).toBe('0');
  });
  it('3,80 m = 149,6″ → 12′ 6″ (150 in = 12 · 12 + 6)', () => {
    expect(feetInches(3.8)).toBe('12′ 6″');
    expect(feetInches(0.3048)).toBe('1′ 0″');
    expect(fmtLength(3.8, 'metric', 'de')).toBe('3,80 m');
  });
  it('parseDecimal akzeptiert Komma und Punkt', () => {
    expect(parseDecimal('3,8')).toBe(3.8);
    expect(parseDecimal(' 3.8 ')).toBe(3.8);
    expect(parseDecimal('12')).toBe(12);
    expect(parseDecimal('12.')).toBe(12);
    expect(parseDecimal('abc')).toBeNaN();
    expect(parseDecimal('')).toBeNaN();
    expect(parseDecimal('1,2,3')).toBeNaN();
  });
  it('Feldeinheiten', () => {
    expect(fieldFactor('m', 'imperial')).toEqual({ factor: 0.3048, label: 'ft' });
    expect(fieldFactor('cm', 'metric')).toEqual({ factor: 0.01, label: 'cm' });
  });
});
