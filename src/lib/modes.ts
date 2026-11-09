/**
 * Raummoden eines quaderförmigen Raums mit schallharten Wänden – reine Funktionen.
 *
 * f = c/2 · √((nx/L)² + (ny/B)² + (nz/H)²)
 * Druckverteilung einer Mode: p ∝ cos(nx·π·x/L) · cos(ny·π·y/B) · cos(nz·π·z/H)
 * x, y, z ab einer Ecke (Stirnwand, linke Wand, Boden).
 *
 * Vereinfachungen: keine Dämpfung, keine Wandabsorption. Mehrere Subs werden mit Pegel (Vorzeichen = Polarität)
 * und Verzögerung bei der Modenfrequenz phasenrichtig addiert. Ergebnis = Tendenz, keine Messung.
 */

export type ModeKind = 'axial' | 'tangential' | 'oblique';

export interface RoomDims {
  length: number;
  width: number;
  height: number;
}

export interface Point {
  /** ab Stirnwand */
  x: number;
  /** ab linker Wand */
  y: number;
  /** ab Boden */
  z: number;
}

/** Subwoofer als Schallquelle: Position, Pegelfaktor (−1 = invertiert), Verzögerung in s. */
export interface Source extends Point {
  gain?: number;
  delay?: number;
}

export interface Mode {
  n: [number, number, number];
  f: number;
  kind: ModeKind;
}

/** Schallgeschwindigkeit in trockener Luft (ideales Gas): c = 331,3 · √(1 + T/273,15) m/s. */
export function speedOfSound(temperatureC: number): number {
  const t = Math.max(-273.15, temperatureC);
  return 331.3 * Math.sqrt(1 + t / 273.15);
}

export function modeFrequency(n: [number, number, number], d: RoomDims, c: number): number {
  const [nx, ny, nz] = n;
  return (c / 2) * Math.sqrt((nx / d.length) ** 2 + (ny / d.width) ** 2 + (nz / d.height) ** 2);
}

export function modeKind(n: [number, number, number]): ModeKind {
  const nonZero = n.filter((v) => v > 0).length;
  return nonZero === 1 ? 'axial' : nonZero === 2 ? 'tangential' : 'oblique';
}

/** Alle Moden bis fMax (einschließlich), aufsteigend sortiert. */
export function roomModes(d: RoomDims, c: number, fMax: number): Mode[] {
  if (!(d.length > 0 && d.width > 0 && d.height > 0 && c > 0 && fMax > 0)) return [];
  const max = (len: number) => Math.floor((2 * fMax * len) / c);
  const out: Mode[] = [];
  for (let nx = 0; nx <= max(d.length); nx++)
    for (let ny = 0; ny <= max(d.width); ny++)
      for (let nz = 0; nz <= max(d.height); nz++) {
        if (nx + ny + nz === 0) continue;
        const n: [number, number, number] = [nx, ny, nz];
        const f = modeFrequency(n, d, c);
        if (f <= fMax + 1e-9) out.push({ n, f, kind: modeKind(n) });
      }
  return out.sort((a, b) => a.f - b.f);
}

/** Normierter Druck der Mode an einem Punkt, −1 … 1 (Vorzeichen = Phase). */
export function modeShape(n: [number, number, number], d: RoomDims, p: Point): number {
  return (
    Math.cos((n[0] * Math.PI * p.x) / d.length) *
    Math.cos((n[1] * Math.PI * p.y) / d.width) *
    Math.cos((n[2] * Math.PI * p.z) / d.height)
  );
}

/**
 * Kopplung Sub(s) → Mode → Sitz.
 * Anregung = Summe der Modenform an allen Subs, gewichtet mit Pegel und Phase der Verzögerung bei der
 * Modenfrequenz f: Σ g·ψ·e^(−i·2π·f·τ), geteilt durch die Zahl der unverzögerten Subs (so bleibt
 * 1 Sub im Druckbauch = 1). Für Subs ohne Verzögerung ist das der Mittelwert wie bisher.
 * `excitation` = Betrag mit Vorzeichen des Realteils (bei rein reellen Summen = Summe selbst).
 * Am Sitz = Modenform an der Sitzposition. Produkt = relative Stärke der Mode am Sitz.
 */
export function coupling(n: [number, number, number], d: RoomDims, seat: Point, subs: Source[], f = 0) {
  let re = 0;
  let im = 0;
  for (const s of subs) {
    const g = (s.gain ?? 1) * modeShape(n, d, s);
    const ph = 2 * Math.PI * f * (s.delay ?? 0);
    re += g * Math.cos(ph);
    im -= g * Math.sin(ph);
  }
  const norm = subs.filter((s) => !s.delay).length || subs.length;
  const mag = norm ? Math.hypot(re, im) / norm : 0;
  const excitation = re < 0 ? -mag : mag;
  const atSeat = modeShape(n, d, seat);
  return { excitation, atSeat, product: excitation * atSeat };
}

/** Betrag in dB relativ zu 1 (volle Anregung im Druckbauch), nach unten begrenzt. */
export function toDb(v: number, floorDb = -40): number {
  const a = Math.abs(v);
  return a <= 0 ? floorDb : Math.max(floorDb, 20 * Math.log10(a));
}

export interface DensityBin {
  from: number;
  to: number;
  axial: number;
  tangential: number;
  oblique: number;
}

/** Anzahl Moden je Frequenzband [from, to). */
export function modeDensity(modes: Mode[], binHz: number, fMax: number): DensityBin[] {
  const bins: DensityBin[] = [];
  for (let f = 0; f < fMax; f += binHz) bins.push({ from: f, to: Math.min(f + binHz, fMax), axial: 0, tangential: 0, oblique: 0 });
  for (const m of modes) {
    const i = Math.min(bins.length - 1, Math.floor(m.f / binHz));
    if (i >= 0) bins[i][m.kind]++;
  }
  return bins;
}

/**
 * Axiale Moden aus unterschiedlichen Raumrichtungen, die näher als `relTol` beieinander liegen.
 * Solche Häufungen verstärken sich gegenseitig. Die Schwelle ist eine eigene Festlegung, keine Norm.
 */
export function closeAxialPairs(modes: Mode[], relTol = 0.05): [Mode, Mode][] {
  const axial = modes.filter((m) => m.kind === 'axial');
  const dir = (m: Mode) => m.n.findIndex((v) => v > 0);
  const out: [Mode, Mode][] = [];
  for (let i = 0; i < axial.length; i++)
    for (let j = i + 1; j < axial.length; j++) {
      const a = axial[i];
      const b = axial[j];
      if (dir(a) !== dir(b) && Math.abs(a.f - b.f) / Math.min(a.f, b.f) < relTol) out.push([a, b]);
    }
  return out;
}

/** Richtung einer axialen Mode: 0 = Länge, 1 = Breite, 2 = Höhe. */
export const axialDirection = (m: Mode): 0 | 1 | 2 => m.n.findIndex((v) => v > 0) as 0 | 1 | 2;
