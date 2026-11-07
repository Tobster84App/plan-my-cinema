/** Draufsicht und Seitenansicht für den Lautsprecher-Planer (maßstäblich, Breite passt sich an). */
import { fmtLength, fmtNum, type Lang } from '../lib/format';
import type { RoomModel } from '../lib/room';
import type { SpeakerResult, SpeakersResult } from '../lib/speakers-calc';
import type { Status } from '../lib/speakers';
import type { UnitSystem } from '../lib/units';
import type { SpeakersDict } from '../i18n/speakers-ui';
import { useWidth } from './useWidth';

export const STATUS_COLOR: Record<Status, string> = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)' };
export const STATUS_ICON: Record<Status, string> = { ok: '✓', warn: '!', bad: '✕' };

interface Props {
  m: RoomModel;
  r: SpeakersResult;
  /** Index des Platzes in r.seats, von dem aus bewertet wird */
  selected: number;
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

export function SpeakerTopView({ m, r, selected, lang, units, t }: Props) {
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
        {/* Erstreflexionen an den Seitenwänden */}
        {r.reflections
          .filter((f) => f.surface === 'left' || f.surface === 'right')
          .map((f) => (
            <g key={`rf${f.id}${f.surface}`}>
              <title>{`${f.id} → ${t.surfaces[f.surface]}: ${t.pointWall(fmtLength(f.point.x, units, lang), fmtLength(f.point.z, units, lang))}`}</title>
              <rect x={x(f.point.x) - 5} y={y(f.point.y) - 5} width="10" height="10" transform={`rotate(45 ${x(f.point.x)} ${y(f.point.y)})`} fill="var(--beam)" stroke="var(--panel)" stroke-width="1.5" />
            </g>
          ))}
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
            <title>{t.seatLabel(st.seat.row, st.seat.index)}</title>
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

export function SpeakerSideView({ m, r, lang, units, t }: Props) {
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
        {/* Erstreflexionen an Decke und Boden (L/C/R liegen in der Seitenansicht übereinander) */}
        {r.reflections
          .filter((f) => (f.surface === 'ceiling' || f.surface === 'floor') && f.id === 'C')
          .map((f) => (
            <g key={`rc${f.surface}`}>
              <title>{`C → ${t.surfaces[f.surface]}: ${fmtLength(f.point.x, units, lang)}`}</title>
              <rect x={x(f.point.x) - 5} y={z(f.point.z) - 5} width="10" height="10" transform={`rotate(45 ${x(f.point.x)} ${z(f.point.z)})`} fill="var(--beam)" stroke="var(--panel)" stroke-width="1.5" />
            </g>
          ))}
        {[...new Set(r.seats.map((st) => st.seat.row))].map((row) => {
          const p = r.seats.find((st) => st.seat.row === row)!.seat.pos;
          return (
            <g key={`row${row}`}>
              <circle cx={x(p.x)} cy={z(p.z)} r="7" fill={row === 1 ? 'var(--info)' : 'var(--panel)'} stroke="var(--info)" stroke-width="2" />
              <line x1={x(p.x)} x2={x(p.x)} y1={z(p.z) + 7} y2={z(0)} stroke="var(--info)" stroke-width="2" opacity="0.5" />
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
