import { describe, expect, it } from 'vitest';
import data from '../data/projectors.json';
import { applyProjector, validateProjectors } from '../src/lib/projectors';
import { DEFAULT_ROOM } from '../src/lib/room';

describe('data/projectors.json', () => {
  it('alle Einträge gültig, alle als Beispiel markiert', () => {
    const { valid, errors } = validateProjectors(data);
    expect(errors).toEqual([]);
    expect(valid).toHaveLength(3);
    expect(valid.every((p) => p.example === true)).toBe(true);
  });
});

describe('validateProjectors', () => {
  const ok = { id: 'x-1', manufacturer: 'X', model: '1', throwRatio: { min: 1, max: 2 }, lensShift: { vertical: null, horizontal: 10 }, lumensSpec: 1000, source: 'https://x.test/a.pdf', asOf: '2026-01-01' };
  it('meldet fehlerhafte Einträge', () => {
    const { valid, errors } = validateProjectors({ projectors: [ok, ok, { ...ok, id: 'y', throwRatio: { min: 3, max: 2 } }, { ...ok, id: 'z', source: 'http://x' }] });
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(3);
  });
  it('kein Array → Fehler', () => {
    expect(validateProjectors({}).errors).toHaveLength(1);
  });
});

describe('applyProjector', () => {
  it('übernimmt TR und Shift, Lumen = 70 % Datenblatt, auf 10 gerundet', () => {
    const p = validateProjectors(data).valid[0];
    const m = applyProjector(DEFAULT_ROOM, p);
    expect(m.projector.throwMin).toBe(1.35);
    expect(m.projector.shiftV).toBe(96);
    expect(m.projector.lumens).toBe(1820); // 2600 · 0,7
    expect(m.projector.modelId).toBe('beispiel-a-1000');
    expect(m.screen).toBe(DEFAULT_ROOM.screen);
  });
});
