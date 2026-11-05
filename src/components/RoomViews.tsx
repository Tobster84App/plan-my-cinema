/** Maßstäbliche Draufsicht und Seitenansicht des Raums (SVG). */
import type { RoomModel } from '../lib/room';
import type { ScreenResult } from '../lib/screen-calc';
import { fmtLength, type Lang } from '../lib/format';
import type { UnitSystem } from '../lib/units';
import type { UIDict } from '../i18n/ui';

const VW = 600; // viewBox-Breite; Textgröße 13 bleibt auf Smartphones lesbar
const PAD = { l: 18, r: 22, t: 34, b: 34 };
const C = {
  wall: 'var(--line-strong)',
  grid: 'var(--line)',
  screen: 'var(--fg)',
  beam: 'var(--beam)',
  seat: 'var(--info)',
  ok: 'var(--ok)',
  muted: 'var(--muted)',
};

interface Props {
  m: RoomModel;
  r: ScreenResult;
  lang: Lang;
  units: UnitSystem;
  t: UIDict;
}

/** Darstellungslänge: Raum, bei Bedarf bis zum Ende des Zoombereichs (max. 1,6 × Raumlänge). */
function extent(m: RoomModel, r: ScreenResult): number {
  const L = m.room.length;
  const need = Math.max(L, m.screen.wallGap + r.throwDist.max, m.screen.wallGap + m.projector.distance, m.screen.wallGap + m.seat.distance);
  return Math.min(need * 1.03, L * 1.6);
}

/** Rasterlinien je Meter (bzw. alle 2 m bei großen Räumen). */
function grid(lenM: number, x: (v: number) => number, y0: number, y1: number, units: UnitSystem) {
  const step = units === 'imperial' ? 0.3048 * (lenM > 9 ? 8 : lenM > 5 ? 4 : 2) : lenM > 12 ? 2 : 1;
  const out = [];
  for (let v = 0; v <= lenM + 1e-6; v += step) {
    const label = units === 'imperial' ? `${Math.round(v / 0.3048)} ft` : `${Math.round(v)} m`;
    out.push(
      <g key={v}>
        <line x1={x(v)} y1={y0} x2={x(v)} y2={y1} stroke={C.grid} stroke-width="1" />
        <text x={x(v)} y={y1 + 16} text-anchor="middle">{label}</text>
      </g>,
    );
  }
  return out;
}

export function TopView({ m, r, lang, units, t }: Props) {
  const L = m.room.length;
  const W = m.room.width;
  const E = extent(m, r);
  const s = (VW - PAD.l - PAD.r) / E;
  const VH = Math.round(PAD.t + W * s + PAD.b);
  const x = (v: number) => PAD.l + v * s;
  const yC = PAD.t + (W * s) / 2;
  // Leinwand links im Bild: Wer zur Leinwand schaut, hat rechts oben → positiver Versatz (rechts) nach oben
  const y = (off: number) => yC - off * s;
  const sx = m.screen.wallGap;
  const half = r.geo.width / 2;
  const f = (v: number) => fmtLength(v, units, lang);
  const pX = sx + m.projector.distance;
  const seatX = sx + m.seat.distance;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" role="img" aria-label={t.svgTopAlt(f(r.geo.width), f(m.projector.distance), f(m.seat.distance))}>
      {grid(E, x, PAD.t, PAD.t + W * s, units)}
      <rect x={x(0)} y={PAD.t} width={L * s} height={W * s} fill="none" stroke={C.wall} stroke-width="2" />
      {/* Zoombereich */}
      {r.throwDist.max > 0 && (
        <>
          <rect x={x(sx + r.throwDist.min)} y={PAD.t - 18} width={Math.max(2, (r.throwDist.max - r.throwDist.min) * s)} height="8" rx="3" fill={C.beam} opacity=".55" />
          <text x={Math.min(VW - PAD.r - 80, Math.max(PAD.l + 80, x(sx + (r.throwDist.min + r.throwDist.max) / 2)))} y={PAD.t - 22} text-anchor="middle" fill={C.beam}>
            {f(r.throwDist.min)} – {f(r.throwDist.max)}
          </text>
        </>
      )}
      {/* Lichtkegel */}
      <polygon points={`${x(pX)},${y(m.projector.offsetY)} ${x(sx)},${y(-r.img.throwWidth / 2)} ${x(sx)},${y(r.img.throwWidth / 2)}`} fill={C.beam} opacity=".08" />
      <line x1={x(pX)} y1={y(m.projector.offsetY)} x2={x(sx)} y2={y(-half)} stroke={C.beam} stroke-width="1" stroke-dasharray="4 3" />
      <line x1={x(pX)} y1={y(m.projector.offsetY)} x2={x(sx)} y2={y(half)} stroke={C.beam} stroke-width="1" stroke-dasharray="4 3" />
      {/* Blickwinkel */}
      <polygon points={`${x(seatX)},${y(m.seat.offsetY)} ${x(sx)},${y(-half)} ${x(sx)},${y(half)}`} fill={C.seat} opacity=".14" stroke={C.seat} stroke-width="1" />
      {/* SMPTE / THX */}
      {[
        [r.smpteDistance, 'SMPTE'],
        [r.thxDistance, 'THX'],
      ].map(([d, label]) =>
        sx + (d as number) <= L ? (
          <g key={label as string}>
            <line x1={x(sx + (d as number))} y1={y(-half) + 6} x2={x(sx + (d as number))} y2={y(-half) + 16} stroke={C.ok} stroke-width="2" />
            <text x={x(sx + (d as number))} y={y(-half) + 28} text-anchor="middle" fill={C.ok}>{label}</text>
          </g>
        ) : null,
      )}
      {/* Leinwand */}
      <line x1={x(sx)} y1={y(-half)} x2={x(sx)} y2={y(half)} stroke={C.screen} stroke-width="5" stroke-linecap="round" />
      {/* Projektor */}
      <rect x={x(pX) - 7} y={y(m.projector.offsetY) - 9} width="14" height="18" rx="3" fill={C.beam} />
      {/* Sitz */}
      <circle cx={x(seatX)} cy={y(m.seat.offsetY)} r="7" fill={C.seat} />
      <text x={x(seatX) + 11} y={y(m.seat.offsetY) - 9} fill={C.seat}>{f(m.seat.distance)}</text>
    </svg>
  );
}

export function SideView({ m, r, lang, units, t }: Props) {
  const L = m.room.length;
  const H = m.room.height;
  const E = extent(m, r);
  const s = (VW - PAD.l - PAD.r) / E;
  const VH = Math.round(PAD.t + H * s + PAD.b);
  const x = (v: number) => PAD.l + v * s;
  const z = (v: number) => PAD.t + (H - v) * s;
  const sx = m.screen.wallGap;
  const f = (v: number) => fmtLength(v, units, lang);
  const pX = sx + m.projector.distance;
  const seatX = sx + m.seat.distance;
  const imgTop = r.screenCenterZ + r.img.height / 2;
  const imgBot = r.screenCenterZ - r.img.height / 2;
  const scrTop = m.screen.bottomEdge + r.geo.height;
  const lensZ = m.projector.lensHeight;
  const eyeZ = m.seat.eyeHeight;
  const bars = r.scope && r.method === 'zoom';

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" role="img" aria-label={t.svgSideAlt(f(lensZ), f(m.seat.distance))}>
      {grid(E, x, PAD.t, PAD.t + H * s, units)}
      <rect x={x(0)} y={z(H)} width={L * s} height={H * s} fill="none" stroke={C.wall} stroke-width="2" />
      {/* projiziertes Panelbild (bei Zoom größer als die Leinwand) */}
      {bars && <line x1={x(sx) - 6} y1={z(imgTop)} x2={x(sx) - 6} y2={z(imgBot)} stroke={C.beam} stroke-width="2" stroke-dasharray="3 3" />}
      {/* Lichtkegel */}
      <polygon points={`${x(pX)},${z(lensZ)} ${x(sx)},${z(imgTop)} ${x(sx)},${z(imgBot)}`} fill={C.beam} opacity=".08" />
      <line x1={x(pX)} y1={z(lensZ)} x2={x(sx)} y2={z(imgTop)} stroke={C.beam} stroke-width="1" stroke-dasharray="4 3" />
      <line x1={x(pX)} y1={z(lensZ)} x2={x(sx)} y2={z(imgBot)} stroke={C.beam} stroke-width="1" stroke-dasharray="4 3" />
      {/* Objektivachse */}
      <line x1={x(pX)} y1={z(lensZ)} x2={x(sx)} y2={z(lensZ)} stroke={C.beam} stroke-width="1" opacity=".5" />
      {/* Sichtlinie */}
      <line x1={x(seatX)} y1={z(eyeZ)} x2={x(sx)} y2={z(r.screenCenterZ)} stroke={C.seat} stroke-width="1" />
      {/* Leinwand */}
      <line x1={x(sx)} y1={z(scrTop)} x2={x(sx)} y2={z(m.screen.bottomEdge)} stroke={C.screen} stroke-width="5" stroke-linecap="round" />
      <text x={x(sx) + 8} y={z(m.screen.bottomEdge) + 14} fill={C.muted}>{f(m.screen.bottomEdge)}</text>
      {/* Projektor */}
      <rect x={x(pX) - 7} y={z(lensZ) - 7} width="22" height="14" rx="3" fill={C.beam} />
      <text x={x(pX) + 20} y={z(lensZ) + 4} fill={C.beam}>{f(lensZ)}</text>
      {/* Kopf am Sitz */}
      <circle cx={x(seatX)} cy={z(eyeZ)} r="7" fill={C.seat} />
      <line x1={x(seatX)} y1={z(eyeZ) + 7} x2={x(seatX)} y2={z(0)} stroke={C.seat} stroke-width="2" opacity=".5" />
    </svg>
  );
}
