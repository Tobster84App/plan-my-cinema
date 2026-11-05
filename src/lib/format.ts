/** Zahlen- und Einheitenformatierung (rein, ohne DOM). */
import { FOOT_M, INCH_M, type UnitSystem } from './units';

export type Lang = 'de' | 'en';

const nf = new Map<string, Intl.NumberFormat>();
export function fmtNum(v: number, digits: number, lang: Lang): string {
  const key = `${lang}|${digits}`;
  let f = nf.get(key);
  if (!f) {
    f = new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    nf.set(key, f);
  }
  // Werte, die auf 0 runden, ohne Minuszeichen anzeigen („-0,00“ vermeiden)
  const x = Number.isFinite(v) ? (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v) : 0;
  return f.format(x);
}

/** Feet + Inches, auf ganze Zoll gerundet: 3,80 m → 12′ 6″. */
export function feetInches(m: number): string {
  const totalIn = Math.round(Math.abs(m) / INCH_M);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn % 12;
  return `${m < 0 ? '−' : ''}${ft}′ ${inch}″`;
}

/** Länge im gewählten System: metrisch „3,80 m“, imperial „12′ 6″“. */
export function fmtLength(m: number, units: UnitSystem, lang: Lang, digits = 2): string {
  return units === 'imperial' ? feetInches(m) : `${fmtNum(m, digits, lang)} m`;
}

/** Kleine Längen: metrisch cm, imperial Zoll. */
export function fmtSmallLength(m: number, units: UnitSystem, lang: Lang): string {
  return units === 'imperial' ? `${fmtNum(m / INCH_M, 1, lang)}″` : `${fmtNum(m * 100, 0, lang)} cm`;
}

export const fmtInches = (m: number, lang: Lang): string => `${fmtNum(m / INCH_M, 0, lang)}″`;

/** Liest „3,8“ oder „3.8“ (auch „1.234,5“ in DE nicht nötig → einfache Regel). */
export function parseDecimal(s: string): number {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '' || t === '-' || t === '.') return NaN;
  return /^-?\d*\.?\d+$|^-?\d+\.?$/.test(t) ? Number(t) : NaN;
}

/** Einheiten für Eingabefelder: Anzeige ↔ SI. */
export type FieldUnit = 'm' | 'cm' | 'none';

export function fieldFactor(kind: FieldUnit, units: UnitSystem): { factor: number; label: string } {
  if (kind === 'm') return units === 'imperial' ? { factor: FOOT_M, label: 'ft' } : { factor: 1, label: 'm' };
  if (kind === 'cm') return units === 'imperial' ? { factor: INCH_M, label: 'in' } : { factor: 0.01, label: 'cm' };
  return { factor: 1, label: '' };
}
