/** Projektordaten: Typen, Validierung, Übernahme ins Raummodell. */
import type { RoomModel } from './room';

export interface ProjectorEntry {
  id: string;
  example?: boolean;
  manufacturer: string;
  model: string;
  throwRatio: { min: number; max: number };
  lensShift: { vertical: number | null; horizontal: number | null };
  lumensSpec: number;
  source: string;
  asOf: string;
  notes?: string;
}

const isPosNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isShift = (v: unknown): v is number | null => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0);

/** Gibt nur gültige Einträge zurück; ungültige werden mit Grund gemeldet. */
export function validateProjectors(data: unknown): { valid: ProjectorEntry[]; errors: string[] } {
  const errors: string[] = [];
  const valid: ProjectorEntry[] = [];
  const list = (data as { projectors?: unknown })?.projectors;
  if (!Array.isArray(list)) return { valid, errors: ['projectors fehlt oder ist kein Array'] };
  const ids = new Set<string>();
  list.forEach((p: any, i) => {
    const where = `#${i} (${p?.id ?? '?'})`;
    if (typeof p?.id !== 'string' || !/^[a-z0-9-]+$/.test(p.id)) return errors.push(`${where}: id ungültig`);
    if (ids.has(p.id)) return errors.push(`${where}: id doppelt`);
    if (typeof p.manufacturer !== 'string' || typeof p.model !== 'string') return errors.push(`${where}: Hersteller/Modell fehlt`);
    if (!isPosNum(p.throwRatio?.min) || !isPosNum(p.throwRatio?.max) || p.throwRatio.min > p.throwRatio.max)
      return errors.push(`${where}: throwRatio ungültig`);
    if (!isShift(p.lensShift?.vertical) || !isShift(p.lensShift?.horizontal)) return errors.push(`${where}: lensShift ungültig`);
    if (!isPosNum(p.lumensSpec)) return errors.push(`${where}: lumensSpec ungültig`);
    if (typeof p.source !== 'string' || !/^https:\/\//.test(p.source)) return errors.push(`${where}: source muss https-URL sein`);
    if (typeof p.asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.asOf)) return errors.push(`${where}: asOf muss JJJJ-MM-TT sein`);
    ids.add(p.id);
    valid.push(p as ProjectorEntry);
  });
  return { valid, errors };
}

/**
 * Übernimmt Datenblattwerte in das Raummodell.
 * Lumen werden NICHT direkt übernommen: Datenblatt-Lumen liegen meist deutlich
 * über kalibrierten Werten. Der Faktor ist eine einstellbare Annahme.
 */
export function applyProjector(m: RoomModel, p: ProjectorEntry, calibratedFactor = 0.7): RoomModel {
  return {
    ...m,
    projector: {
      ...m.projector,
      modelId: p.id,
      throwMin: p.throwRatio.min,
      throwMax: p.throwRatio.max,
      shiftV: p.lensShift.vertical,
      shiftH: p.lensShift.horizontal,
      lumens: Math.round((p.lumensSpec * calibratedFactor) / 10) * 10,
    },
  };
}
