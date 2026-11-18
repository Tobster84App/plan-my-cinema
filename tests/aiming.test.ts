import { describe, expect, it } from 'vitest';
import { angleBetween, computeAiming, mountNormal, wallNormal } from '../src/lib/aiming';
import { DEFAULT_ROOM, sanitizeRoom } from '../src/lib/room';
import { computeSpeakers } from '../src/lib/speakers-calc';

const withL = () => {
  const m = structuredClone(DEFAULT_ROOM);
  m.speakers.overrides.L = { x: 0.4, y: 0.9, z: 1.2 };
  return m;
};

describe('Ausrichtung (Toe-in, Neigung, Abdeckung)', () => {
  it('Wandnormale: L bei x = 0,4 / y = 0,9 → Stirnwand am nächsten → (1, 0, 0)', () => {
    expect(wallNormal({ x: 0.4, y: 0.9, z: 1.2 }, DEFAULT_ROOM.room)).toEqual({ x: 1, y: 0, z: 0 });
    expect(angleBetween({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBeCloseTo(90, 10);
  });
  it('Ziel MLP (4,2 | 2 | 1,2): Toe-in L = atan(1,1/3,8) = 16,14°, Neigung 0°', () => {
    const m = withL();
    const a = computeAiming(m, computeSpeakers(m)).rows.find((x) => x.id === 'L')!;
    expect(a.toeIn!).toBeCloseTo(16.1443, 3);
    expect(a.tilt).toBeCloseTo(0, 10);
  });
  it('Abdeckung L: P1 (y = 1,3) 16,14° − atan(0,4/3,8) = 10,14°, P3 (y = 2,7) atan(1,8/3,8) − 16,14° = 9,20° → bei ±45° alle gut', () => {
    const m = withL();
    const a = computeAiming(m, computeSpeakers(m)).rows.find((x) => x.id === 'L')!;
    expect(a.seats[0].off).toBeCloseTo(10.1353, 3);
    expect(a.seats[2].off).toBeCloseTo(9.2018, 3);
    expect(a.worstIdx).toBe(0);
    expect(a.status).toBe('ok');
  });
  it('Ziel Mitte aller Plätze (2 Reihen → 5,0 | 2 | 1,35): Toe-in L = atan(1,1/4,6) = 13,45°, Neigung atan(0,15/4,7297) = 1,82°', () => {
    const m = withL();
    m.seating.rows = 2;
    m.speakers.aim = 'center';
    const r = computeAiming(m, computeSpeakers(m));
    expect(r.target.x).toBeCloseTo(5, 10);
    expect(r.target.z).toBeCloseTo(1.35, 10);
    const a = r.rows.find((x) => x.id === 'L')!;
    expect(a.toeIn!).toBeCloseTo(13.4486, 3);
    expect(a.tilt).toBeCloseTo(1.8165, 3);
  });
  it('Decke Ltf (2,9 | 0,15 | 2,5) mit ±45°: zeigt nach unten (Dolby), MLP liegt acos(1,3/2,6082) = 60,1° neben der Achse → nur „knapp“, weil Dolby das zulässt', () => {
    const m = structuredClone(DEFAULT_ROOM);
    const a = computeAiming(m, computeSpeakers(m)).rows.find((x) => x.id === 'Ltf')!;
    expect(a.facesDown).toBe(true);
    expect(a.seats[1].off).toBeCloseTo(60.1034, 3);
    expect(a.seats[1].status).toBe('warn');
    expect(a.outside).toBe(3);
  });
  it('Montagewand je Gruppe: Front → Stirnwand, Rear → Rückwand, Surround → nächste Seitenwand', () => {
    const room = DEFAULT_ROOM.room;
    expect(mountNormal('front', { x: 0.41, y: 0.15, z: 1.2 }, room)).toEqual({ x: 1, y: 0, z: 0 });
    expect(mountNormal('rear', { x: 5.85, y: 0.7, z: 1.2 }, room)).toEqual({ x: -1, y: 0, z: 0 });
    expect(mountNormal('surround', { x: 4.5, y: 3.85, z: 1.2 }, room)).toEqual({ x: 0, y: -1, z: 0 });
  });
  it('Decke Ltf mit eigenem Abstrahlwinkel ±30°: zum MLP geneigt (60,1° aus der Senkrechten), MLP auf der Achse', () => {
    const m = structuredClone(DEFAULT_ROOM);
    m.speakers.dispersionOverrides.Ltf = 30;
    const a = computeAiming(m, computeSpeakers(m)).rows.find((x) => x.id === 'Ltf')!;
    expect(a.facesDown).toBe(false);
    expect(a.own).toBe(true);
    expect(a.tilt).toBeCloseTo(60.1034, 3);
    expect(a.seats[1].off).toBeCloseTo(0, 4); // acos nahe 1 → Rundung im 1e-6-Bereich
  });
  it('Import: v8 → v9 mit Ziel MLP und ±45°; Werte begrenzt', () => {
    const r = sanitizeRoom({ version: 8 });
    expect(r.speakers.aim).toBe('mlp');
    expect(r.speakers.dispersion).toEqual({ front: 45, surround: 45, height: 45 });
    const x = sanitizeRoom({ ...DEFAULT_ROOM, speakers: { ...DEFAULT_ROOM.speakers, aim: 'center', dispersion: { front: 200 }, dispersionOverrides: { C: 1, foo: 3 } } });
    expect(x.speakers.aim).toBe('center');
    expect(x.speakers.dispersion.front).toBe(90);
    expect(x.speakers.dispersionOverrides).toEqual({ C: 5 });
  });
});
