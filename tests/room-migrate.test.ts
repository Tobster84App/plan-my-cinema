import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM, MAX_SUBS, ROOM_MODEL_VERSION, roomIssues, sanitizeRoom } from '../src/lib/room';

describe('Raummodell v2', () => {
  it('v1-Daten (ohne Subs/Temperatur) werden ergänzt, Rest bleibt', () => {
    const v1 = { version: 1, room: { length: 7, width: 5, height: 2.8 }, screen: {}, projector: {}, seat: {} };
    const r = sanitizeRoom(v1);
    expect(r.version).toBe(ROOM_MODEL_VERSION);
    expect(r.room.length).toBe(7);
    expect(r.subs).toEqual(DEFAULT_ROOM.subs);
    expect(r.acoustics.temperatureC).toBe(20);
    expect(r.speakers).toEqual({ layout: '7.1.4', listenerHeight: null, overrides: {} });
  });
  it('Lautsprecher: unbekanntes Layout → 7.1.4, unbekannte Kanäle verworfen', () => {
    const r = sanitizeRoom({ ...DEFAULT_ROOM, speakers: { layout: '11.1.8', listenerHeight: 'x', overrides: { L: { x: 1, y: 2, z: 1.1 }, Foo: { x: 1, y: 1, z: 1 } } } });
    expect(r.speakers.layout).toBe('7.1.4');
    expect(r.speakers.listenerHeight).toBeNull();
    expect(r.speakers.overrides).toEqual({ L: { x: 1, y: 2, z: 1.1 } });
  });
  it('höchstens 4 Subs, ungültige Werte ersetzt', () => {
    const r = sanitizeRoom({ ...DEFAULT_ROOM, subs: Array.from({ length: 6 }, () => ({ x: 'a', y: -3, z: 1 })) });
    expect(r.subs).toHaveLength(MAX_SUBS);
    expect(r.subs[0]).toEqual({ x: 0.3, y: 0, z: 1 });
  });
  it('Temperatur auf −10 … 40 °C begrenzt', () => {
    expect(sanitizeRoom({ ...DEFAULT_ROOM, acoustics: { temperatureC: 99 } }).acoustics.temperatureC).toBe(40);
  });
  it('Sub außerhalb des Raums wird gemeldet', () => {
    expect(roomIssues({ ...DEFAULT_ROOM, subs: [{ x: 7, y: 1, z: 0.3 }] })).toContain('subOutsideRoom');
  });
});
