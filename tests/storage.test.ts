import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM } from '../src/lib/room';
import { decodeShare, encodeShare, exportRoomJson, importRoomJson, loadRoom, saveRoom, type KeyValueStore } from '../src/lib/storage';

const memStore = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};
const brokenStore: KeyValueStore = {
  getItem: () => { throw new Error('SecurityError'); },
  setItem: () => { throw new Error('QuotaExceeded'); },
};

describe('localStorage', () => {
  it('Speichern und Laden', () => {
    const s = memStore();
    expect(saveRoom(DEFAULT_ROOM, s)).toBe(true);
    expect(loadRoom(s)).toEqual(DEFAULT_ROOM);
  });
  it('leerer Speicher → null', () => expect(loadRoom(memStore())).toBeNull());
  it('kaputtes JSON → null', () => {
    const s = memStore();
    s.setItem('pmc-room-v1', '{kaputt');
    expect(loadRoom(s)).toBeNull();
  });
  it('werfender Speicher bricht nichts', () => {
    expect(loadRoom(brokenStore)).toBeNull();
    expect(saveRoom(DEFAULT_ROOM, brokenStore)).toBe(false);
    expect(saveRoom(DEFAULT_ROOM, null)).toBe(false);
  });
});

describe('Export/Import', () => {
  it('Roundtrip', () => {
    const r = importRoomJson(exportRoomJson(DEFAULT_ROOM));
    expect(r).toEqual({ ok: true, room: DEFAULT_ROOM });
  });
  it('Fehlerfälle', () => {
    expect(importRoomJson('nope')).toEqual({ ok: false, error: 'invalidJson' });
    expect(importRoomJson('{"a":1}')).toEqual({ ok: false, error: 'notARoom' });
    expect(importRoomJson(' '.repeat(100_001))).toEqual({ ok: false, error: 'tooLarge' });
  });
});

describe('Teilen-Link', () => {
  it('Roundtrip über #r=…', () => {
    const m = structuredClone(DEFAULT_ROOM);
    m.projector.modelId = 'beispiel-ä';
    expect(decodeShare('#r=' + encodeShare(m))?.projector.modelId).toBe('beispiel-ä');
    expect(decodeShare('r=' + encodeShare(DEFAULT_ROOM))).toEqual(DEFAULT_ROOM);
  });
  it('kaputter oder fehlender Parameter → null', () => {
    expect(decodeShare('#r=%%%')).toBeNull();
    expect(decodeShare('#x=1')).toBeNull();
    expect(decodeShare('')).toBeNull();
  });
});
