/** Fasst Rechner 3 (Lautsprecher-Planer) für ein Raummodell zusammen. */
import guidelines from '../../data/speaker-guidelines.json';
import type { RoomModel, SpeakerId, SpeakerPos } from './room';
import { seatPoint } from './modes-calc';
import { LAYOUT_CHANNELS, autoPlace, azimuthDeg, channelRule, distance3d, elevationDeg, rate, type ChannelRule, type Status } from './speakers';

export const SPEAKER_INSET = 0.15;

export interface SpeakerResult {
  id: SpeakerId;
  rule: ChannelRule;
  pos: SpeakerPos;
  manual: boolean;
  azimuth: number;
  elevation: number;
  /** geprüfter Wert: |Azimut| bzw. Elevation */
  value: number;
  status: Status;
  distance: number;
}

export function placementInput(m: RoomModel) {
  const mlp = seatPoint(m);
  return {
    room: m.room,
    mlp,
    frontPlaneX: Math.max(SPEAKER_INSET, m.screen.wallGap / 2),
    listenerZ: m.speakers.listenerHeight ?? m.seat.eyeHeight,
    inset: SPEAKER_INSET,
  };
}

export function computeSpeakers(m: RoomModel) {
  const input = placementInput(m);
  const { mlp } = input;
  const layout = m.speakers.layout;
  const speakers: SpeakerResult[] = LAYOUT_CHANNELS[layout].map((id) => {
    const rule = channelRule(id, layout);
    const manualPos = m.speakers.overrides[id];
    const pos = manualPos ?? autoPlace(rule, input);
    const azimuth = azimuthDeg(mlp, pos);
    const elevation = elevationDeg(mlp, pos);
    const value = rule.measure === 'azimuth' ? Math.abs(azimuth) : elevation;
    return { id, rule, pos, manual: !!manualPos, azimuth, elevation, value, status: rate(value, rule.range, rule.extended), distance: distance3d(mlp, pos) };
  });

  const listener = speakers.filter((s) => s.rule.measure === 'azimuth');
  const overhead = speakers.filter((s) => s.rule.measure === 'elevation');
  const front = speakers.filter((s) => s.id === 'L' || s.id === 'R');
  const rearish = speakers.filter((s) => s.rule.group === 'rear' || s.rule.group === 'surround');
  const frontZ = front.length ? Math.max(...front.map((s) => s.pos.z)) : input.listenerZ;
  const rearZ = rearish.length ? Math.max(...rearish.map((s) => s.pos.z)) : frontZ;
  const overZ = overhead.length ? Math.min(...overhead.map((s) => s.pos.z)) : null;
  const dists = listener.map((s) => s.distance);
  const counts = { ok: 0, warn: 0, bad: 0 } as Record<Status, number>;
  for (const s of speakers) counts[s.status]++;

  return {
    mlp,
    speakers,
    counts,
    checks: {
      /** Dolby G S. 6: hintere Lautsprecher höchstens 1,25 × Höhe der Front */
      rearHeightFactor: frontZ > 0 ? rearZ / frontZ : 0,
      rearHeightMax: guidelines.listenerLevel.rearMaxHeightFactor,
      /** Dolby G S. 7: Overheads 2–3 × Höhe der Ohrhöhen-Lautsprecher */
      overheadFactor: overZ != null && frontZ > 0 ? overZ / frontZ : null,
      overheadRange: guidelines.overheadMountHeightFactor,
      /** Unterschied der Abstände zum MLP (Ohrhöhe): gleiche Abstände sind Ideal, sonst Laufzeitkorrektur im AVR */
      distanceSpread: dists.length ? Math.max(...dists) - Math.min(...dists) : 0,
    },
  };
}

export type SpeakersResult = ReturnType<typeof computeSpeakers>;
