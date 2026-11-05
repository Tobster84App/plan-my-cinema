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

export function SpeakerTopView({ m, r, lang, units, t }: Props) {
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
        {r.speakers
          .filter((sp) => sp.rule.measure === 'azimuth')
          .map((sp) => (
            <line key={`l${sp.id}`} x1={x(r.mlp.x)} y1={y(r.mlp.y)} x2={x(sp.pos.x)} y2={y(sp.pos.y)} stroke={STATUS_COLOR[sp.status]} stroke-width="1" opacity="0.45" />
          ))}
        {r.speakers.map((sp) => (
          <Marker key={sp.id} s={sp} cx={x(sp.pos.x)} cy={y(sp.pos.y)} t={t} lang={lang} />
        ))}
        <circle cx={x(r.mlp.x)} cy={y(r.mlp.y)} r="7" fill="var(--info)" stroke="var(--panel)" stroke-width="2" />
        <text x={x(r.mlp.x) + 10} y={y(r.mlp.y) + 18} style={{ fill: 'var(--info)', fontSize: '11px' }}>MLP · {fmtLength(m.seat.distance, units, lang)}</text>
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
        <circle cx={x(r.mlp.x)} cy={z(ear)} r="7" fill="var(--info)" stroke="var(--panel)" stroke-width="2" />
        <line x1={x(r.mlp.x)} x2={x(r.mlp.x)} y1={z(ear) + 7} y2={z(0)} stroke="var(--info)" stroke-width="2" opacity="0.5" />
        <text x={x(0)} y={H - 8}>0</text>
        <text x={x(L)} y={H - 8} text-anchor="end">{fmtLength(L, units, lang)}</text>
        <text x={x(L) - 4} y={z(Hr) + 14} text-anchor="end">{fmtLength(Hr, units, lang)}</text>
      </svg>
    </div>
  );
}
