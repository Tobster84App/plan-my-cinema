/** Draufsicht und Seitenansicht für den Lautsprecher-Planer (maßstäblich, Breite passt sich an). */
import { fmtLength, fmtNum, type Lang } from '../lib/format';
import type { RoomModel } from '../lib/room';
import type { SpeakerResult, SpeakersResult } from '../lib/speakers-calc';
import type { Status } from '../lib/speakers';
import { surfaceAxes, surfacePlane, type Surface } from '../lib/seating';
import type { UnitSystem } from '../lib/units';
import type { SpeakersDict } from '../i18n/speakers-ui';
import { useWidth } from './useWidth';

export const STATUS_COLOR: Record<Status, string> = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)' };
export const STATUS_ICON: Record<Status, string> = { ok: '✓', warn: '!', bad: '✕' };

export type ReflGroup = 'side' | 'ceiling' | 'floor' | 'front' | 'back';
export const REFL_GROUPS: readonly ReflGroup[] = ['side', 'ceiling', 'floor', 'front', 'back'];
export const inReflGroup = (s: Surface, g: ReflGroup) => (g === 'side' ? s === 'left' || s === 'right' : s === g);

type Refl = SpeakersResult['reflections'][number];
type Range = { min: number; max: number };

/** Absorberbereich als achsparalleler Quader (Ausdehnung 0 senkrecht zur Fläche). */
function reflBox(f: Refl, room: RoomModel['room']): Record<'x' | 'y' | 'z', Range> {
  const { axis, plane } = surfacePlane(f.surface, room);
  const [a, b] = surfaceAxes(f.surface);
  const box = { x: { min: 0, max: 0 }, y: { min: 0, max: 0 }, z: { min: 0, max: 0 } };
  box[axis] = { min: plane, max: plane };
  box[a] = f.area.a;
  box[b] = f.area.b;
  return box;
}

/** Bereich + MLP-Punkt einer Reflexion in einer 2D-Ansicht; dünne Bereiche werden mindestens 4 px breit gezeichnet. */
function ReflMark({ f, h, v, sx, sy, title }: { f: Refl; h: Range; v: Range; sx: (n: number) => number; sy: (n: number) => number; title: string }) {
  const MIN = 4;
  let x1 = Math.min(sx(h.min), sx(h.max));
  let x2 = Math.max(sx(h.min), sx(h.max));
  let y1 = Math.min(sy(v.min), sy(v.max));
  let y2 = Math.max(sy(v.min), sy(v.max));
  if (x2 - x1 < MIN) [x1, x2] = [(x1 + x2) / 2 - MIN / 2, (x1 + x2) / 2 + MIN / 2];
  if (y2 - y1 < MIN) [y1, y2] = [(y1 + y2) / 2 - MIN / 2, (y1 + y2) / 2 + MIN / 2];
  return (
    <g>
      <title>{title}</title>
      <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill="var(--beam)" fill-opacity="0.22" stroke="var(--beam)" stroke-width="1.5" />
      <text x={(x1 + x2) / 2} y={y1 - 4} text-anchor="middle" style={{ fill: 'var(--beam)', fontSize: '10px' }}>{f.id}</text>
    </g>
  );
}

function Diamond({ cx, cy }: { cx: number; cy: number }) {
  return <rect x={cx - 5} y={cy - 5} width="10" height="10" transform={`rotate(45 ${cx} ${cy})`} fill="var(--beam)" stroke="var(--panel)" stroke-width="1.5" />;
}

interface Props {
  m: RoomModel;
  r: SpeakersResult;
  /** Index des Platzes in r.seats, von dem aus bewertet wird */
  selected: number;
  /** angezeigte Reflexionen (Fläche und Kanal); ohne Angabe keine */
  refl?: { group: ReflGroup; id: string | null };
  lang: Lang;
  units: UnitSystem;
  t: SpeakersDict;
}

const P = { l: 14, r: 14, t: 14, b: 30 };

function Marker({ s, cx, cy, t, lang, side = false }: { s: SpeakerResult; cx: number; cy: number; t: SpeakersDict; lang: Lang; side?: boolean }) {
  const over = s.rule.measure === 'elevation';
  const angle = over ? `${t.el} ${fmtNum(s.elevation, 0, lang)}°` : `${t.az} ${fmtNum(s.azimuth, 0, lang)}°`;
  return (
    <g>
      <title>{`${t.names[s.id]} (${s.id}) · ${angle} · ${t[s.status]}`}</title>
      {over ? (
        <rect x={cx - 8} y={cy - 8} width="16" height="16" rx="4" fill="var(--panel)" stroke={STATUS_COLOR[s.status]} stroke-width="2.5" />
      ) : (
        <circle cx={cx} cy={cy} r="8" fill={STATUS_COLOR[s.status]} stroke="var(--panel)" stroke-width="2" />
      )}
      {/* Overhead-Kürzel unter dem Symbol, damit es nicht mit Wandlautsprechern an derselben Stelle kollidiert */}
      <text x={cx} y={over && !side ? cy + 22 : cy - 12} text-anchor="middle" style={{ fill: 'var(--fg)', fontSize: '11px' }}>{s.id}</text>
    </g>
  );
}

export function SpeakerTopView({ m, r, selected, refl, lang, units, t }: Props) {
  const [ref, W] = useWidth();
  const P = { l: 14, r: 14, t: 18, b: 44 }; // unten Platz für Kürzel der Overheads + Achse
  const L = m.room.length;
  const Wr = m.room.width;
  const s = Math.min((W - P.l - P.r) / L, 420 / Wr);
  const H = Math.round(P.t + Wr * s + P.b);
  const x = (v: number) => P.l + v * s;
  // Leinwand links im Bild: Wer zur Leinwand schaut, hat die linke Wand unten → y ab linker Wand von unten auftragen
  const y = (v: number) => P.t + (Wr - v) * s;
  const sw = m.screen.width;
  const scrX = m.screen.wallGap;
  const step = units === 'imperial' ? 0.3048 * (L > 6 ? 4 : 2) : 1;
  const seat = r.seats[selected] ?? r.seats[0];
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={t.svgTop}>
        <g class="grid">
          {Array.from({ length: Math.floor(L / step) + 1 }, (_, i) => i * step).map((v) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={y(0)} y2={y(Wr)} />
              <text x={x(v)} y={y(0) + 36} text-anchor="middle">{units === 'imperial' ? `${Math.round(v / 0.3048)} ft` : `${Math.round(v)} m`}</text>
            </g>
          ))}
        </g>
        <rect x={x(0)} y={y(Wr)} width={L * s} height={Wr * s} fill="none" stroke="var(--line-strong)" stroke-width="2" />
        <line x1={x(scrX)} x2={x(scrX)} y1={y(Wr / 2 - sw / 2)} y2={y(Wr / 2 + sw / 2)} stroke="var(--fg)" stroke-width="4" stroke-linecap="round" />
        {/* Erstreflexionen der gewählten Fläche: Bereich über alle Plätze (Draufsicht = x/y) und Punkt für den MLP */}
        {refl &&
          r.reflections
            .filter((f) => inReflGroup(f.surface, refl.group) && (refl.id == null || f.id === refl.id))
            .map((f) => {
              const b = reflBox(f, m.room);
              return (
                <g key={`rf${f.id}${f.surface}`}>
                  <ReflMark f={f} h={b.x} v={b.y} sx={x} sy={y} title={`${f.id} → ${t.surfaces[f.surface]}`} />
                  <Diamond cx={x(f.point.x)} cy={y(f.point.y)} />
                </g>
              );
            })}
        {r.speakers
          .filter((sp) => sp.rule.measure === 'azimuth')
          .map((sp) => {
            const res = seat.results.find((x) => x.id === sp.id)!;
            return <line key={`l${sp.id}`} x1={x(seat.seat.pos.x)} y1={y(seat.seat.pos.y)} x2={x(sp.pos.x)} y2={y(sp.pos.y)} stroke={STATUS_COLOR[res.status]} stroke-width="1" opacity="0.45" />;
          })}
        {r.speakers.map((sp) => (
          <Marker key={sp.id} s={{ ...sp, ...seat.results.find((x) => x.id === sp.id)! }} cx={x(sp.pos.x)} cy={y(sp.pos.y)} t={t} lang={lang} />
        ))}
        {r.seats.map((st, i) => (
          <g key={`seat${i}`}>
            <title>{`${st.seat.isMlp ? t.mlpLabel : t.seatLabel(st.seat.row, st.seat.index)}${st.seat.moved ? ` (${t.seatMoved})` : ''}`}</title>
            <circle cx={x(st.seat.pos.x)} cy={y(st.seat.pos.y)} r={i === selected ? 7 : 5} fill={i === selected ? 'var(--info)' : 'var(--panel)'} stroke="var(--info)" stroke-width="2" />
          </g>
        ))}
        <text x={x(seat.seat.pos.x) + 10} y={y(seat.seat.pos.y) + 18} style={{ fill: 'var(--info)', fontSize: '11px' }}>
          {seat.seat.isMlp ? 'MLP' : t.seatLabel(seat.seat.row, seat.seat.index)}
        </text>
      </svg>
    </div>
  );
}

export function SpeakerSideView({ m, r, selected, refl, lang, units, t }: Props) {
  const [ref, W] = useWidth();
  const L = m.room.length;
  const Hr = m.room.height;
  const s = (W - P.l - P.r) / L;
  const H = Math.round(P.t + Hr * s + P.b);
  const x = (v: number) => P.l + v * s;
  const z = (v: number) => P.t + (Hr - v) * s;
  const over = r.speakers.filter((sp) => sp.rule.measure === 'elevation');
  const ear = r.mlp.z;
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={t.svgSide}>
        <rect x={x(0)} y={z(Hr)} width={L * s} height={Hr * s} fill="none" stroke="var(--line-strong)" stroke-width="2" />
        <line x1={x(0)} x2={x(L)} y1={z(ear)} y2={z(ear)} stroke="var(--line)" stroke-dasharray="4 4" />
        <line x1={x(m.screen.wallGap)} x2={x(m.screen.wallGap)} y1={z(m.screen.bottomEdge)} y2={z(Math.min(Hr, m.screen.bottomEdge + m.screen.width / m.screen.aspect))} stroke="var(--fg)" stroke-width="4" stroke-linecap="round" />
        {/* je Seite nur einmal zeichnen (links), Seitenansicht projiziert L und R aufeinander */}
        {over
          .filter((sp) => sp.rule.side <= 0)
          .map((sp) => (
            <g key={sp.id}>
              <line x1={x(r.mlp.x)} y1={z(ear)} x2={x(sp.pos.x)} y2={z(sp.pos.z)} stroke={STATUS_COLOR[sp.status]} stroke-width="1.5" />
              <Marker s={sp} cx={x(sp.pos.x)} cy={z(sp.pos.z) + 9} t={t} lang={lang} side />
              <text x={x(sp.pos.x)} y={z(sp.pos.z) + 34} text-anchor="middle" style={{ fontSize: '11px' }}>{fmtNum(sp.elevation, 0, lang)}°</text>
            </g>
          ))}
        {/* Sichtlinien der hinteren Reihen zur Bildunterkante */}
        {r.sightlines.map((sl) => {
          const rear = r.seats.find((st) => st.seat.row === sl.row)!.seat.pos;
          return <line key={`sl${sl.row}`} x1={x(rear.x)} y1={z(rear.z)} x2={x(m.screen.wallGap)} y2={z(m.screen.bottomEdge)} stroke={STATUS_COLOR[sl.status]} stroke-width="1.5" stroke-dasharray="5 4" />;
        })}
        {/* Erstreflexionen der gewählten Fläche: Seitenansicht = x/z (linke und rechte Wand liegen übereinander) */}
        {refl &&
          r.reflections
            .filter((f) => inReflGroup(f.surface, refl.group) && (refl.id == null || f.id === refl.id))
            .map((f) => {
              const b = reflBox(f, m.room);
              return (
                <g key={`rs${f.id}${f.surface}`}>
                  <ReflMark f={f} h={b.x} v={b.z} sx={x} sy={z} title={`${f.id} → ${t.surfaces[f.surface]}`} />
                  <Diamond cx={x(f.point.x)} cy={z(f.point.z)} />
                </g>
              );
            })}
        {r.seats.map((st, i) => {
          const p = st.seat.pos;
          return (
            <g key={`seat${i}`}>
              <line x1={x(p.x)} x2={x(p.x)} y1={z(p.z) + 7} y2={z(0)} stroke="var(--info)" stroke-width="2" opacity="0.35" />
              <circle cx={x(p.x)} cy={z(p.z)} r={i === selected ? 7 : 5} fill={i === selected ? 'var(--info)' : 'var(--panel)'} stroke="var(--info)" stroke-width="2" />
            </g>
          );
        })}
        <text x={x(0)} y={H - 8}>0</text>
        <text x={x(L)} y={H - 8} text-anchor="end">{fmtLength(L, units, lang)}</text>
        <text x={x(L) - 4} y={z(Hr) + 14} text-anchor="end">{fmtLength(Hr, units, lang)}</text>
      </svg>
    </div>
  );
}
