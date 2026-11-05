/** Diagramme für Rechner 2: Modenspektrum am Sitz, Modendichte, axiale Druckverteilung. */
import { useWidth } from './useWidth';
import { fmtLength, fmtNum, type Lang } from '../lib/format';
import type { DensityBin, ModeKind, Point } from '../lib/modes';
import type { ModeAtSeat } from '../lib/modes-calc';
import type { UnitSystem } from '../lib/units';
import type { ModesDict } from '../i18n/modes-ui';

export const KIND_COLOR: Record<ModeKind, string> = {
  axial: 'var(--mode-axial)',
  tangential: 'var(--mode-tangential)',
  oblique: 'var(--mode-oblique)',
};
const KINDS: ModeKind[] = ['axial', 'tangential', 'oblique'];

export function KindLegend({ t }: { t: ModesDict }) {
  const label = { axial: t.axialLong, tangential: t.tangentialLong, oblique: t.obliqueLong };
  return (
    <div class="legend" aria-label={t.legendTitle}>
      {KINDS.map((k) => (
        <span key={k}>
          <i class="swatch" style={{ background: KIND_COLOR[k] }} />
          {label[k]}
        </span>
      ))}
    </div>
  );
}

const hz = (f: number, lang: Lang) => `${fmtNum(f, 1, lang)} Hz`;
const nStr = (n: [number, number, number]) => `(${n.join(',')})`;

/* ---------- Modenspektrum am Sitz (logarithmische Frequenzachse) ---------- */

export function SpectrumChart({ modes, lang, t }: { modes: ModeAtSeat[]; lang: Lang; t: ModesDict }) {
  const [ref, W] = useWidth();
  const H = 220, L = 46, R = 10, T = 10, B = 28;
  const fMin = 20, fMax = 300, dbMin = -30;
  const x = (f: number) => L + ((Math.log10(f) - Math.log10(fMin)) / (Math.log10(fMax) - Math.log10(fMin))) * (W - L - R);
  const y = (db: number) => T + (Math.max(dbMin, Math.min(0, db)) / dbMin) * (H - T - B);
  const ticks = W < 480 ? [20, 40, 60, 100, 200, 300] : [20, 30, 40, 50, 60, 80, 100, 150, 200, 300];
  // weniger wichtige zuerst zeichnen, axiale oben
  const order: ModeKind[] = ['oblique', 'tangential', 'axial'];
  const sorted = order.flatMap((k) => modes.filter((m) => m.kind === k && m.f >= fMin));
  return (
    <div ref={ref}>
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={t.spectrumTitle}>
      <g class="grid">
        {[0, -10, -20, -30].map((d) => (
          <g key={d}>
            <line x1={L} x2={W - R} y1={y(d)} y2={y(d)} />
            <text x={L - 6} y={y(d) + 4} text-anchor="end">{d === 0 ? '0 dB' : d}</text>
          </g>
        ))}
        {ticks.map((f) => (
          <g key={f}>
            <line x1={x(f)} x2={x(f)} y1={T} y2={y(dbMin)} />
            <text x={x(f)} y={H - 8} text-anchor="middle">{f === 300 ? '300 Hz' : f}</text>
          </g>
        ))}
      </g>
      {sorted.map((m) => {
        const top = y(m.db);
        const h = Math.max(1, y(dbMin) - top);
        return (
          <rect class="bar" key={`${m.n}`} x={x(m.f) - 1.5} y={top} width={3} height={h} rx={1.5} fill={KIND_COLOR[m.kind]} tabIndex={-1}>
            <title>{`${hz(m.f, lang)} · ${t[m.kind]} ${nStr(m.n)} · ${fmtNum(m.db, 1, lang)} dB`}</title>
          </rect>
        );
      })}
      <line x1={L} x2={W - R} y1={y(dbMin)} y2={y(dbMin)} stroke="var(--line-strong)" />
    </svg>
    </div>
  );
}

/* ---------- Modendichte (gestapelte Balken je 10 Hz) ---------- */

export function DensityChart({ bins, t }: { bins: DensityBin[]; t: ModesDict }) {
  const [ref, W] = useWidth();
  const H = 200, L = 30, R = 10, T = 10, B = 28;
  const maxCount = Math.max(1, ...bins.map((b) => b.axial + b.tangential + b.oblique));
  const step = maxCount > 20 ? 10 : maxCount > 8 ? 5 : 2;
  const top = Math.ceil(maxCount / step) * step;
  const bw = (W - L - R) / bins.length;
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const yTicks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const every = W < 480 ? 10 : 5; // Beschriftung jedes 5. bzw. 10. Bandes
  return (
    <div ref={ref}>
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={t.densityTitle}>
      <g class="grid">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
            <text x={L - 6} y={y(v) + 4} text-anchor="end">{v}</text>
          </g>
        ))}
        {bins.map((b, i) =>
          i % every === 0 ? (
            <text key={b.from} x={L + i * bw} y={H - 8} text-anchor="middle">{b.from}</text>
          ) : null,
        )}
        <text x={W - R} y={H - 8} text-anchor="end">300 Hz</text>
      </g>
      {bins.map((b, i) => {
        let acc = 0;
        const x0 = L + i * bw + 1;
        const w = Math.max(1, bw - 2); // 2 px Abstand zwischen Balken
        return (
          <g key={b.from}>
            <title>{`${b.from}–${b.to} Hz: ${b.axial} ${t.axial}, ${b.tangential} ${t.tangential}, ${b.oblique} ${t.oblique}`}</title>
            {KINDS.map((k) => {
              const v = b[k];
              if (!v) return null;
              const y1 = y(acc + v);
              const y0 = y(acc);
              acc += v;
              return <rect key={k} x={x0} y={y1 + 1} width={w} height={Math.max(0.5, y0 - y1 - 2)} rx={1.5} fill={KIND_COLOR[k]} />;
            })}
          </g>
        );
      })}
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" />
    </svg>
    </div>
  );
}

/* ---------- Druckverteilung der axialen Moden (kleine Vielfache) ---------- */

const DASH = ['', '6 4', '2 3'];

export function AxialProfile({
  title,
  len,
  freqs,
  seatPos,
  subPos,
  units,
  lang,
  t,
}: {
  title: string;
  len: number;
  /** Frequenzen der 1.–3. Ordnung */
  freqs: number[];
  seatPos: number;
  subPos: number[];
  units: UnitSystem;
  lang: Lang;
  t: ModesDict;
}) {
  const W = 300, H = 150, L = 26, R = 10, T = 12, B = 26;
  const x = (v: number) => L + (v / len) * (W - L - R);
  const y = (v: number) => T + (1 - v) * (H - T - B);
  const path = (n: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const p = (i / 60) * len;
      pts.push(`${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(Math.abs(Math.cos((n * Math.PI * p) / len))).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  return (
    <figure class="chart" style={{ padding: '10px' }}>
      <h3>{title} · {fmtLength(len, units, lang)}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t.profilesTitle}: ${title}`}>
        <g class="grid">
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
              <text x={L - 5} y={y(v) + 4} text-anchor="end">{fmtNum(v, v === 0.5 ? 1 : 0, lang)}</text>
            </g>
          ))}
          <text x={L} y={H - 6}>0</text>
          <text x={W - R} y={H - 6} text-anchor="end">{fmtLength(len, units, lang, 1)}</text>
        </g>
        {freqs.map((f, i) => (
          <path key={i} d={path(i + 1)} fill="none" stroke="var(--mode-axial)" stroke-width="2" stroke-dasharray={DASH[i]} opacity={1 - i * 0.2}>
            <title>{`${t.order(i + 1)} · ${hz(f, lang)}`}</title>
          </path>
        ))}
        {subPos.map((p, i) => (
          <g key={`s${i}`}>
            <rect x={x(p) - 5} y={y(0) - 5} width="10" height="10" rx="2" fill="var(--fg)" stroke="var(--panel)" stroke-width="2" />
            <title>{`${t.subMark} ${i + 1}: ${fmtLength(p, units, lang)}`}</title>
          </g>
        ))}
        <line x1={x(seatPos)} x2={x(seatPos)} y1={y(1)} y2={y(0)} stroke="var(--info)" stroke-width="2" />
        <circle cx={x(seatPos)} cy={y(1) - 2} r="5" fill="var(--info)" stroke="var(--panel)" stroke-width="2" />
        <text x={Math.min(W - R - 24, x(seatPos) + 8)} y={y(1) + 10} fill="var(--info)" style={{ fill: 'var(--info)' }}>{t.seatMark}</text>
      </svg>
    </figure>
  );
}

export function ProfileLegend({ t }: { t: ModesDict }) {
  return (
    <div class="legend">
      {[1, 2, 3].map((n, i) => (
        <span key={n}>
          <svg width="26" height="8" aria-hidden="true" style={{ width: '26px' }}>
            <line x1="0" x2="26" y1="4" y2="4" stroke="var(--mode-axial)" stroke-width="2" stroke-dasharray={DASH[i]} opacity={1 - i * 0.2} />
          </svg>
          {t.order(n)}
        </span>
      ))}
      <span>
        <i class="swatch" style={{ background: 'var(--info)', borderRadius: '50%' }} />
        {t.seatMark}
      </span>
      <span>
        <i class="swatch" style={{ background: 'var(--fg)' }} />
        {t.subMark}
      </span>
    </div>
  );
}

export type { Point };
