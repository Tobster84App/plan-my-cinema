/** Einheiten und Umrechnungen. Intern rechnet alles in SI (Meter, cd/m²). */

export const INCH_M = 0.0254;
export const FOOT_M = 0.3048;
/** 1 Foot-Lambert in cd/m² (= 1/π cd/ft²). */
export const FL_NITS = 3.4262591;

export type UnitSystem = 'metric' | 'imperial';

export const mToInch = (m: number): number => m / INCH_M;
export const inchToM = (inch: number): number => inch * INCH_M;
export const mToFeet = (m: number): number => m / FOOT_M;
export const feetToM = (ft: number): number => ft * FOOT_M;
export const nitsToFl = (nits: number): number => nits / FL_NITS;
export const flToNits = (fl: number): number => fl * FL_NITS;

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Begrenzt v auf [min, max]. */
export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Endliche Zahl oder Ersatzwert. */
export const finiteOr = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
