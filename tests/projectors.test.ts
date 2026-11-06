import { describe, expect, it } from 'vitest';
import data from '../data/projectors.json';
import { applyProjector, validateProjectors } from '../src/lib/projectors';
import { DEFAULT_ROOM } from '../src/lib/room';

describe('data/projectors.json', () => {
  const { valid, errors } = validateProjectors(data);
  it('alle Einträge gültig, keine Platzhalter mehr', () => {
    expect(errors).toEqual([]);
    expect(valid.length).toBeGreaterThanOrEqual(50);
    expect(valid.some((p) => p.example)).toBe(false);
  });
  it('nur Herstellerquellen', () => {
    const allowed = /^https:\/\/(www\.epson\.de|www\.benq\.eu|de\.jvc\.com|www\.optoma\.de|www\.valerion\.com|www\.lg\.com|de\.xgimi\.com|de\.dangbei\.com)\//;
    expect(valid.filter((p) => !allowed.test(p.source)).map((p) => p.source)).toEqual([]);
  });
  it('Stichprobe JVC DLA-NZ800BE wie auf de.jvc.com: 1,43–2,92, ±80 % / ±34 %, 2.700 lm', () => {
    const p = valid.find((x) => x.id === 'jvc-dla-nz800')!;
    expect(p.throwRatio).toEqual({ min: 1.43, max: 2.92 });
    expect(p.lensShift).toEqual({ up: 80, down: 80, left: 34, right: 34 });
    expect(p.lumensSpec).toBe(2700);
  });
  it('Valerion: Lens Shift nur beim Max (±105 % vertikal), Pro 2 ohne', () => {
    expect(valid.find((x) => x.id === 'valerion-visionmaster-max')!.lensShift).toEqual({ up: 105, down: 105, left: null, right: null });
    expect(valid.find((x) => x.id === 'valerion-visionmaster-pro2')!.lensShift).toEqual({ up: 0, down: 0, left: 0, right: 0 });
  });
  it('Stichprobe EH-LS12000B wie auf epson.de: 1,35–2,84, ±96,3 % / ±47,1 %, 2.700 lm', () => {
    const p = valid.find((x) => x.id === 'epson-eh-ls12000')!;
    expect(p.throwRatio).toEqual({ min: 1.35, max: 2.84 });
    expect(p.lensShift).toEqual({ up: 96.3, down: 96.3, left: 47.1, right: 47.1 });
    expect(p.lumensSpec).toBe(2700);
  });
  it('Digitalzoom: Throw Ratio optisch fest, Originalangabe erhalten (EB-W53: 1,27–2,54)', () => {
    const p = valid.find((x) => x.id === 'epson-eb-w53')!;
    expect(p.zoom).toBe('digital');
    expect(p.throwRatio).toEqual({ min: 1.27, max: 1.27 });
    expect(p.statedThrowRatio).toBe('1,27 - 2,54:1');
  });
});

describe('validateProjectors', () => {
  const ok = { id: 'x-1', manufacturer: 'X', model: '1', throwRatio: { min: 1, max: 2 }, lensShift: { up: null, down: 5, left: 10, right: 10 }, lumensSpec: 1000, source: 'https://x.test/a.pdf', asOf: '2026-01-01' };
  it('meldet fehlerhafte Einträge', () => {
    const { valid, errors } = validateProjectors({ projectors: [ok, ok, { ...ok, id: 'y', throwRatio: { min: 3, max: 2 } }, { ...ok, id: 'z', source: 'http://x' }, { ...ok, id: 'w', lensShift: { vertical: 5 } }, { ...ok, id: 'v', zoom: 'magic' }] });
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(5);
  });
  it('kein Array → Fehler', () => {
    expect(validateProjectors({}).errors).toHaveLength(1);
  });
});

describe('applyProjector', () => {
  it('übernimmt TR und getrennten Shift, Lumen = 70 % Datenblatt, auf 10 gerundet', () => {
    const p = validateProjectors(data).valid.find((x) => x.id === 'epson-eh-ls12000')!;
    const m = applyProjector(DEFAULT_ROOM, p);
    expect(m.projector.throwMin).toBe(1.35);
    expect(m.projector.shift).toEqual({ up: 96.3, down: 96.3, left: 47.1, right: 47.1 });
    expect(m.projector.lumens).toBe(1890); // 2700 · 0,7
    expect(m.projector.modelId).toBe('epson-eh-ls12000');
    expect(m.screen).toBe(DEFAULT_ROOM.screen);
  });
});
