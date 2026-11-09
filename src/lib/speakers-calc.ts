/** Fasst Rechner 3 (Lautsprecher-Planer) für ein Raummodell zusammen. */
import guidelines from '../../data/speaker-guidelines.json';
import type { RoomModel, SpeakerId, SpeakerPos } from './room';
import { seatPoint } from './modes-calc';
import { LAYOUT_CHANNELS, autoPlace, azimuthDeg, channelRule, distance3d, elevationDeg, rate, type ChannelRule, type Status } from './speakers';
import { SURFACES, reflectionDelay, reflectionPoint, seatPositions, sightlines, surfaceAxes, surfacePlane, type Seat } from './seating';

/** Bewertung eines Lautsprechers von einem bestimmten Platz aus. */
export function evaluateFrom(rule: ChannelRule, listener: SpeakerPos, pos: SpeakerPos) {
  const azimuth = azimuthDeg(listener, pos);
  const elevation = elevationDeg(listener, pos);
  const value = rule.measure === 'azimuth' ? Math.abs(azimuth) : elevation;
  return { azimuth, elevation, value, status: rate(value, rule.range, rule.extended), distance: distance3d(listener, pos) };
}

const WORST: Record<Status, number> = { ok: 0, warn: 1, bad: 2 };

export const SPEAKER_INSET = 0.15;
/** Lautsprecher näher als das an einer Fläche gelten als dort montiert (eigene Festlegung, ≈ 2 × Wandabstand der Automatik). */
export const REFLECTION_MIN_GAP = 0.3;

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
    const e = evaluateFrom(rule, mlp, pos);
    return { id, rule, pos, manual: !!manualPos, ...e };
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

  // Alle Plätze: Bewertung je Lautsprecher und Platz
  const seats = seatPositions(m).map((seat: Seat) => {
    const results = speakers.map((sp) => ({ id: sp.id, ...evaluateFrom(sp.rule, seat.pos, sp.pos) }));
    const c = { ok: 0, warn: 0, bad: 0 } as Record<Status, number>;
    for (const x of results) c[x.status]++;
    return { seat, results, counts: c };
  });
  /** schlechteste Bewertung je Lautsprecher über alle Plätze */
  const worstBySpeaker = Object.fromEntries(
    speakers.map((sp) => [sp.id, seats.reduce<Status>((w, st) => {
      const x = st.results.find((r) => r.id === sp.id)!.status;
      return WORST[x] > WORST[w] ? x : w;
    }, 'ok')]),
  ) as Record<string, Status>;

  // Erstreflexionen aller Lautsprecher an allen sechs Raumflächen: Punkt für den MLP und Bereich über alle Plätze
  const seatList = seats.map((st) => st.seat.pos);
  const reflections = speakers.flatMap((sp) =>
    SURFACES.flatMap((surface) => {
      const { axis, plane } = surfacePlane(surface, m.room);
      // Lautsprecher an oder dicht vor dieser Fläche: Reflexion fällt mit dem Lautsprecher zusammen → keine Absorberstelle
      if (Math.abs(sp.pos[axis] - plane) < REFLECTION_MIN_GAP) return [];
      const p = reflectionPoint(sp.pos, mlp, surface, m.room);
      if (!p) return [];
      const [a, b] = surfaceAxes(surface);
      const pts = seatList.map((lis) => reflectionPoint(sp.pos, lis, surface, m.room)).filter((q): q is SpeakerPos => q !== null);
      const span = (k: 'x' | 'y' | 'z') => ({ min: Math.min(...pts.map((q) => q[k])), max: Math.max(...pts.map((q) => q[k])) });
      return [{ id: sp.id, group: sp.rule.group, surface, point: p, extra: reflectionDelay(sp.pos, mlp, p), area: { a: span(a), b: span(b) } }];
    }),
  );

  return {
    mlp,
    speakers,
    counts,
    seats,
    worstBySpeaker,
    reflections,
    sightlines: sightlines(m),
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
