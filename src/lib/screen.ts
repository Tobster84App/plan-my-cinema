/**
 * Leinwand & Projektion – reine Rechenfunktionen ohne DOM-Bezug.
 * Alle Längen in Metern, Winkel in Grad, Helligkeit in cd/m² (nits).
 */
import { FL_NITS, degToRad, radToDeg } from './units';

/** Seitenverhältnis des Projektor-Panels (16:9). */
export const NATIVE_ASPECT = 16 / 9;

export type ScopeMethod = 'zoom' | 'lens';

export interface ScreenGeometry {
  width: number;
  height: number;
  diagonal: number;
  area: number;
}

/** Bildbreite aus Diagonale: B = D · r / √(1 + r²). */
export function widthFromDiagonal(diagonal: number, aspect: number): number {
  if (!(diagonal > 0) || !(aspect > 0)) return 0;
  return (diagonal * aspect) / Math.sqrt(1 + aspect * aspect);
}

/** Diagonale aus Bildbreite: D = B · √(1 + r²) / r. */
export function diagonalFromWidth(width: number, aspect: number): number {
  if (!(width > 0) || !(aspect > 0)) return 0;
  return (width * Math.sqrt(1 + aspect * aspect)) / aspect;
}

export function screenGeometry(width: number, aspect: number): ScreenGeometry {
  const w = width > 0 ? width : 0;
  const h = aspect > 0 ? w / aspect : 0;
  return { width: w, height: h, diagonal: Math.hypot(w, h), area: w * h };
}

/** Breiter als 16:9 (mit kleiner Toleranz für 1,78 vs. 16/9). */
export const isScope = (aspect: number): boolean => aspect > NATIVE_ASPECT + 0.01;

export interface ProjectedImage {
  /** Breite des (unverzerrten) Panel-Bildes am Leinwandort – Bezug für Throw Ratio. */
  throwWidth: number;
  /** Höhe des projizierten Panel-Bildes – Bezug für Lens Shift in % Bildhöhe. */
  height: number;
  /** Fläche, auf die der gesamte Lichtstrom fällt. */
  litArea: number;
  /** Anteil des Lichts, der im sichtbaren Bild landet (Zoom: Rest fällt auf Balken/Maskierung). */
  usefulFraction: number;
}

/**
 * Projiziertes Bild abhängig von Leinwandformat und Scope-Methode.
 *
 * - 16:9-Leinwand: Panelbild = Leinwand.
 * - Scope per Zoom: das 16:9-Bild wird auf die Leinwandbreite gezoomt.
 *   Höhe = B / (16/9), Balken oben/unten fallen auf Maskierung/Wand.
 * - Scope per anamorphotischer Linse (horizontale Dehnung): das Panel wird
 *   vertikal skaliert und vollständig genutzt; die Linse dehnt horizontal.
 *   Throw-Bezug ist die ungedehnte Breite = Bildhöhe · 16/9.
 */
export function projectedImage(geo: ScreenGeometry, aspect: number, method: ScopeMethod): ProjectedImage {
  if (!isScope(aspect)) {
    return { throwWidth: geo.width, height: geo.height, litArea: geo.area, usefulFraction: geo.area > 0 ? 1 : 0 };
  }
  if (method === 'zoom') {
    const h = geo.width / NATIVE_ASPECT;
    const lit = geo.width * h;
    return { throwWidth: geo.width, height: h, litArea: lit, usefulFraction: lit > 0 ? geo.area / lit : 0 };
  }
  return { throwWidth: geo.height * NATIVE_ASPECT, height: geo.height, litArea: geo.area, usefulFraction: geo.area > 0 ? 1 : 0 };
}

export interface BrightnessInput {
  lumens: number;
  gain: number;
  /** Lichtverlust des (AT-)Tuchs in %. */
  fabricLossPct: number;
  /** Lichtverlust der anamorphotischen Linse in % (0, wenn keine Linse). */
  lensLossPct: number;
  litArea: number;
}

/**
 * Leuchtdichte auf der Leinwand (Lambert-Strahler):
 * L = Φ · Gain · (1 − Tuchverlust) · (1 − Linsenverlust) / (π · A)
 */
export function luminanceNits(i: BrightnessInput): number {
  if (!(i.litArea > 0) || !(i.lumens > 0) || !(i.gain > 0)) return 0;
  const fabric = 1 - clampPct(i.fabricLossPct) / 100;
  const lens = 1 - clampPct(i.lensLossPct) / 100;
  return (i.lumens * i.gain * fabric * lens) / (Math.PI * i.litArea);
}

/** Benötigte Lumen für eine Ziel-Leuchtdichte (Umkehrung von luminanceNits). */
export function lumensForNits(nits: number, i: Omit<BrightnessInput, 'lumens'>): number {
  const fabric = 1 - clampPct(i.fabricLossPct) / 100;
  const lens = 1 - clampPct(i.lensLossPct) / 100;
  const k = i.gain * fabric * lens;
  if (!(k > 0) || !(i.litArea > 0) || !(nits > 0)) return 0;
  return (nits * Math.PI * i.litArea) / k;
}

const clampPct = (p: number): number => (Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 0);

export const nitsToFootLambert = (nits: number): number => nits / FL_NITS;

export interface Range {
  min: number;
  max: number;
}

/** Objektivabstand = Throw Ratio · Bildbreite (Bezug: throwWidth). Vertauschte Grenzen werden sortiert. */
export function throwRange(trMin: number, trMax: number, throwWidth: number): Range {
  const lo = Math.min(trMin, trMax);
  const hi = Math.max(trMin, trMax);
  if (!(throwWidth > 0) || !(lo > 0)) return { min: 0, max: 0 };
  return { min: lo * throwWidth, max: hi * throwWidth };
}

/** Throw Ratio bei gegebenem Abstand. */
export const throwRatioAt = (distance: number, throwWidth: number): number =>
  throwWidth > 0 && distance > 0 ? distance / throwWidth : 0;

/** Horizontaler Blickwinkel: 2 · atan(B / 2d). */
export function viewingAngleDeg(width: number, distance: number): number {
  if (!(width > 0) || !(distance > 0)) return 0;
  return radToDeg(2 * Math.atan(width / (2 * distance)));
}

/** Sitzabstand für einen gewünschten Blickwinkel: d = B / (2 · tan(α/2)). */
export function distanceForAngle(width: number, angleDeg: number): number {
  if (!(width > 0) || !(angleDeg > 0) || angleDeg >= 180) return 0;
  return width / (2 * Math.tan(degToRad(angleDeg) / 2));
}

/* ---------- Bewertungen (Orientierungswerte, siehe Erklärtext) ---------- */

export type BrightnessRating = 'dim' | 'reference' | 'bright' | 'hdr';

/** Grenzen in fL: < 12 zu dunkel · 12–16 SDR-Referenz · 16–24 hell · ≥ 24 HDR-Reserve. */
export const BRIGHTNESS_LIMITS_FL = { dim: 12, reference: 16, bright: 24 } as const;

export function rateBrightness(fl: number): BrightnessRating {
  if (fl < BRIGHTNESS_LIMITS_FL.dim) return 'dim';
  if (fl < BRIGHTNESS_LIMITS_FL.reference) return 'reference';
  if (fl < BRIGHTNESS_LIMITS_FL.bright) return 'bright';
  return 'hdr';
}

export type AngleRating = 'narrow' | 'smpte' | 'thx' | 'wide';

/** Grenzen in Grad: < 30 schmal · 30–36 SMPTE · 36–40 THX · > 40 sehr nah. */
export const ANGLE_LIMITS_DEG = { smpte: 30, thx: 36, max: 40 } as const;

export function rateViewingAngle(deg: number): AngleRating {
  if (deg < ANGLE_LIMITS_DEG.smpte) return 'narrow';
  if (deg < ANGLE_LIMITS_DEG.thx) return 'smpte';
  if (deg <= ANGLE_LIMITS_DEG.max) return 'thx';
  return 'wide';
}

/* ---------- Lens Shift ---------- */

/**
 * Benötigter Lens Shift in % der projizierten Bildhöhe bzw. -breite.
 * Konvention: Verschiebung der Bildmitte gegenüber der Objektivachse.
 * Positiv = Bild liegt höher bzw. weiter rechts als das Objektiv (Blick zur Leinwand).
 */
export function requiredShiftPct(imageCenter: number, lensPos: number, imageSize: number): number {
  if (!(imageSize > 0)) return 0;
  return ((imageCenter - lensPos) / imageSize) * 100;
}

export type ShiftStatus = 'ok' | 'outside' | 'unknown';

/** Prüft |benötigt| ≤ verfügbar (symmetrischer Bereich ±max). max ≤ 0 → kein Shift vorhanden. */
export function checkShift(requiredPct: number, availableMaxPct: number | null | undefined): ShiftStatus {
  if (availableMaxPct == null || !Number.isFinite(availableMaxPct)) return 'unknown';
  return Math.abs(requiredPct) <= Math.max(0, availableMaxPct) + 1e-9 ? 'ok' : 'outside';
}

/**
 * Prüfung mit getrennten Grenzen je Richtung (z. B. +90 % nach oben, −80 % nach unten).
 * required > 0 → `plusMax` ist maßgeblich, required < 0 → `minusMax`.
 */
export function checkShiftDir(requiredPct: number, plusMax: number | null | undefined, minusMax: number | null | undefined): ShiftStatus {
  return checkShift(requiredPct, requiredPct >= 0 ? plusMax : minusMax);
}

/** Verfügbarer Shift in Richtung des benötigten Werts (null = unbekannt). */
export const shiftLimitFor = (requiredPct: number, plusMax: number | null, minusMax: number | null): number | null =>
  requiredPct >= 0 ? plusMax : minusMax;

/**
 * Vereinfachte Prüfung bei gleichzeitigem vertikalem und horizontalem Shift.
 * Viele Projektoren haben einen rautenförmigen oder elliptischen Bereich
 * (beide Richtungen voll gleichzeitig ist nicht möglich). Wir prüfen
 * konservativ mit einer Raute: |v|/vMax + |h|/hMax ≤ 1.
 * Ob das für ein Modell zutrifft, steht im Datenblatt.
 */
export function combinedShiftUsage(vPct: number, hPct: number, vMax: number, hMax: number): number {
  const v = vMax > 0 ? Math.abs(vPct) / vMax : vPct === 0 ? 0 : Infinity;
  const h = hMax > 0 ? Math.abs(hPct) / hMax : hPct === 0 ? 0 : Infinity;
  return v + h;
}
