/** Rechner 1: Leinwand & Projektion (Preact-Insel). */
import { useEffect, useMemo, useState } from 'preact/hooks';
import projectorData from '../../data/projectors.json';
import { UI } from '../i18n/ui';
import { fmtInches, fmtLength, fmtNum, fmtSmallLength, type Lang } from '../lib/format';
import { applyProjector, validateProjectors } from '../lib/projectors';
import { LIMITS } from '../lib/room';
import { computeScreen } from '../lib/screen-calc';
import { BRIGHTNESS_LIMITS_FL, diagonalFromWidth, widthFromDiagonal } from '../lib/screen';
import { INCH_M } from '../lib/units';
import { initBrowserState, isSample, room, units, updateRoom } from '../state/room';
import { NumberField } from './NumberField';
import { SideView, TopView } from './RoomViews';
import { RoomTools } from './RoomTools';

const ASPECTS = [
  { v: 16 / 9, de: '16:9 (1,78:1)', en: '16:9 (1.78:1)' },
  { v: 2, de: '2,00:1 (Univisium)', en: '2.00:1 (Univisium)' },
  { v: 2.35, de: '2,35:1 Cinemascope', en: '2.35:1 CinemaScope' },
  { v: 2.39, de: '2,39:1', en: '2.39:1' },
  { v: 2.4, de: '2,40:1', en: '2.40:1' },
];

const PROJECTORS = validateProjectors(projectorData).valid;

type SizeMode = 'width' | 'diagIn' | 'diagCm';

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div class="f">
      <span class="lbl" id={`seg-${label}`}>{label}</span>
      <div class="seg" role="group" aria-labelledby={`seg-${label}`}>
        {options.map((o) => (
          <button type="button" key={o.v} aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <>
    <dt>{k}</dt>
    <dd>{v}</dd>
  </>
);

export default function ScreenCalculator({ lang }: { lang: Lang }) {
  const t = UI[lang];
  useEffect(() => initBrowserState(), []);
  const m = room.value;
  const u = units.value;
  const r = useMemo(() => computeScreen(m), [m]);
  const [sizeMode, setSizeMode] = useState<SizeMode>('width');
  const f = (v: number) => fmtLength(v, u, lang);
  const pct = (v: number) => `${fmtNum(v, 0, lang)} %`;
  const area = (a: number) => (u === 'imperial' ? `${fmtNum(a / 0.09290304, 1, lang)} ft²` : `${fmtNum(a, 2, lang)} m²`);
  const L = LIMITS;

  const brightness = { dim: [t.rDim, 'var(--bad)'], reference: [t.rReference, 'var(--ok)'], bright: [t.rBright, 'var(--info)'], hdr: [t.rHdr, 'var(--beam)'] }[r.brightness];
  const angleText = { narrow: [t.aNarrow, 'var(--warn)'], smpte: [t.aSmpte, 'var(--ok)'], thx: [t.aThx, 'var(--ok)'], wide: [t.aWide, 'var(--warn)'] }[r.angleRating];
  const throwText = { ok: [t.throwOk, 'var(--ok)'], tooClose: [t.throwTooClose, 'var(--bad)'], tooFar: [t.throwTooFar, 'var(--bad)'] }[r.throwStatus];
  const shiftWorst = [r.shift.vStatus, r.shift.hStatus].includes('outside') ? 'outside' : [r.shift.vStatus, r.shift.hStatus].includes('unknown') ? 'unknown' : 'ok';
  const shiftText = { ok: [t.shiftOk, 'var(--ok)'], outside: [t.shiftOutside, 'var(--bad)'], unknown: [t.shiftUnknown, 'var(--muted)'] }[shiftWorst];
  const selected = PROJECTORS.find((p) => p.id === m.projector.modelId);
  const scaleMax = 40;

  return (
    <div class="calc">
      <form class="panel" onSubmit={(e) => e.preventDefault()} autoComplete="off">
        <p class="sample" aria-live="polite">{isSample.value ? t.sample : t.saved}</p>

        <fieldset>
          <legend>{t.gRoom}</legend>
          <NumberField id="room-l" label={t.roomLength} value={m.room.length} onChange={(v) => updateRoom((d) => void (d.room.length = v!))} lang={lang} units={u} kind="m" min={L.roomLength[0]} max={L.roomLength[1]} />
          <div class="row2">
            <NumberField id="room-w" label={t.roomWidth} value={m.room.width} onChange={(v) => updateRoom((d) => void (d.room.width = v!))} lang={lang} units={u} kind="m" min={L.roomWidth[0]} max={L.roomWidth[1]} />
            <NumberField id="room-h" label={t.roomHeight} value={m.room.height} onChange={(v) => updateRoom((d) => void (d.room.height = v!))} lang={lang} units={u} kind="m" min={L.roomHeight[0]} max={L.roomHeight[1]} />
          </div>
        </fieldset>

        <fieldset>
          <legend>{t.gScreen}</legend>
          <div class="f">
            <label for="aspect">{t.aspect}</label>
            <select id="aspect" value={String(ASPECTS.find((a) => Math.abs(a.v - m.screen.aspect) < 0.005)?.v ?? m.screen.aspect)} onChange={(e) => updateRoom((d) => void (d.screen.aspect = Number((e.target as HTMLSelectElement).value)))}>
              {ASPECTS.map((a) => (
                <option value={String(a.v)} key={a.v}>{a[lang]}</option>
              ))}
            </select>
          </div>
          <Seg label={t.sizeBy} value={sizeMode} onChange={setSizeMode} options={[{ v: 'width', label: t.sizeWidth }, { v: 'diagIn', label: t.sizeDiagIn }, { v: 'diagCm', label: t.sizeDiagCm }]} />
          {sizeMode === 'width' && (
            <NumberField id="scr-w" label={t.width} value={m.screen.width} onChange={(v) => updateRoom((d) => void (d.screen.width = v!))} lang={lang} units={u} kind="cm" min={L.screenWidth[0]} max={L.screenWidth[1]} />
          )}
          {sizeMode === 'diagIn' && (
            <NumberField id="scr-d" label={t.diagonal} value={diagonalFromWidth(m.screen.width, m.screen.aspect) / INCH_M} digits={1} unit="″" onChange={(v) => updateRoom((d) => void (d.screen.width = widthFromDiagonal(v! * INCH_M, d.screen.aspect)))} lang={lang} min={30} max={600} />
          )}
          {sizeMode === 'diagCm' && (
            <NumberField id="scr-d" label={t.diagonal} value={diagonalFromWidth(m.screen.width, m.screen.aspect) * 100} digits={0} unit="cm" onChange={(v) => updateRoom((d) => void (d.screen.width = widthFromDiagonal(v! / 100, d.screen.aspect)))} lang={lang} min={75} max={1500} />
          )}
          <div class="row2">
            <NumberField id="gain" label={t.gain} value={m.screen.gain} onChange={(v) => updateRoom((d) => void (d.screen.gain = v!))} lang={lang} min={L.gain[0]} max={L.gain[1]} />
            <NumberField id="loss" label={t.fabricLoss} value={m.screen.fabricLossPct} unit="%" digits={0} onChange={(v) => updateRoom((d) => void (d.screen.fabricLossPct = v!))} lang={lang} min={L.fabricLossPct[0]} max={L.fabricLossPct[1]} />
          </div>
          <p class="hint">{t.fabricLossHint}</p>
          <div class="row2">
            <NumberField id="bottom" label={t.bottomEdge} value={m.screen.bottomEdge} onChange={(v) => updateRoom((d) => void (d.screen.bottomEdge = v!))} lang={lang} units={u} kind="cm" min={L.bottomEdge[0]} max={L.bottomEdge[1]} />
            <NumberField id="gap" label={t.wallGap} value={m.screen.wallGap} onChange={(v) => updateRoom((d) => void (d.screen.wallGap = v!))} lang={lang} units={u} kind="cm" min={L.wallGap[0]} max={L.wallGap[1]} />
          </div>
        </fieldset>

        <fieldset>
          <legend>{t.gProjector}</legend>
          <div class="f">
            <label for="proj">{t.projModel}</label>
            <select
              id="proj"
              value={m.projector.modelId ?? ''}
              onChange={(e) => {
                const id = (e.target as HTMLSelectElement).value;
                const p = PROJECTORS.find((x) => x.id === id);
                if (p) updateRoom((d) => Object.assign(d, applyProjector(d, p)));
                else updateRoom((d) => void (d.projector.modelId = null));
              }}
            >
              <option value="">{t.projManual}</option>
              {PROJECTORS.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.manufacturer} {p.model}{p.example ? ` (${t.projExample})` : ''}
                </option>
              ))}
            </select>
            {selected && (
              <p class="hint">
                <a href={selected.source} rel="noopener nofollow" target="_blank">{t.projSource}</a> · {fmtNum(selected.lumensSpec, 0, lang)} lm · {selected.asOf}
              </p>
            )}
            <p class="hint">{t.projHint}</p>
          </div>
          <NumberField id="lm" label={t.lumens} value={m.projector.lumens} unit="lm" digits={0} onChange={(v) => updateRoom((d) => void (d.projector.lumens = v!))} lang={lang} min={L.lumens[0]} max={L.lumens[1]} />
          <div class="row2">
            <NumberField id="trmin" label={t.throwMin} value={m.projector.throwMin} unit=":1" onChange={(v) => updateRoom((d) => void (d.projector.throwMin = v!))} lang={lang} min={L.throwRatio[0]} max={L.throwRatio[1]} />
            <NumberField id="trmax" label={t.throwMax} value={m.projector.throwMax} unit=":1" onChange={(v) => updateRoom((d) => void (d.projector.throwMax = v!))} lang={lang} min={L.throwRatio[0]} max={L.throwRatio[1]} />
          </div>
          <p class="hint">{t.throwHint}</p>
          {r.scope && (
            <>
              <Seg label={t.scopeMethod} value={m.projector.scopeMethod} onChange={(v) => updateRoom((d) => void (d.projector.scopeMethod = v))} options={[{ v: 'zoom', label: t.zoom }, { v: 'lens', label: t.lens }]} />
              {m.projector.scopeMethod === 'lens' && (
                <NumberField id="lensloss" label={t.lensLoss} value={m.projector.lensLossPct} unit="%" digits={0} onChange={(v) => updateRoom((d) => void (d.projector.lensLossPct = v!))} lang={lang} min={L.lensLossPct[0]} max={L.lensLossPct[1]} />
              )}
              <p class="hint">{m.projector.scopeMethod === 'lens' ? t.lensHint : t.zoomHint}</p>
            </>
          )}
          <NumberField id="pdist" label={t.projDistance} value={m.projector.distance} onChange={(v) => updateRoom((d) => void (d.projector.distance = v!))} lang={lang} units={u} kind="m" min={L.projDistance[0]} max={L.projDistance[1]} />
          <div class="row2">
            <NumberField id="lensh" label={t.lensHeight} value={m.projector.lensHeight} onChange={(v) => updateRoom((d) => void (d.projector.lensHeight = v!))} lang={lang} units={u} kind="cm" min={L.lensHeight[0]} max={L.lensHeight[1]} />
            <NumberField id="poff" label={t.projOffset} value={m.projector.offsetY} onChange={(v) => updateRoom((d) => void (d.projector.offsetY = v!))} lang={lang} units={u} kind="cm" min={L.offset[0]} max={L.offset[1]} />
          </div>
          <p class="hint">{t.offsetHint}</p>
          <div class="row2">
            <NumberField id="shv" label={t.shiftV} value={m.projector.shiftV} nullable unit="%" digits={0} onChange={(v) => updateRoom((d) => void (d.projector.shiftV = v))} lang={lang} min={L.shift[0]} max={L.shift[1]} />
            <NumberField id="shh" label={t.shiftH} value={m.projector.shiftH} nullable unit="%" digits={0} onChange={(v) => updateRoom((d) => void (d.projector.shiftH = v))} lang={lang} min={L.shift[0]} max={L.shift[1]} />
          </div>
          <p class="hint">{t.shiftUnitHint}</p>
        </fieldset>

        <fieldset>
          <legend>{t.gSeat}</legend>
          <div class="row2">
            <NumberField id="seat" label={t.seatDistance} value={m.seat.distance} onChange={(v) => updateRoom((d) => void (d.seat.distance = v!))} lang={lang} units={u} kind="m" min={L.seatDistance[0]} max={L.seatDistance[1]} />
            <NumberField id="eye" label={t.eyeHeight} value={m.seat.eyeHeight} onChange={(v) => updateRoom((d) => void (d.seat.eyeHeight = v!))} lang={lang} units={u} kind="cm" min={L.eyeHeight[0]} max={L.eyeHeight[1]} />
          </div>
        </fieldset>

        <RoomTools lang={lang} />
      </form>

      <a class="mini" href="#results" aria-hidden="true" tabIndex={-1}>
        <span style={{ color: brightness[1] }}>{fmtNum(r.fl, 1, lang)} fL</span>
        <span style={{ color: throwText[1] }}>{f(r.throwDist.min)}–{f(r.throwDist.max)}</span>
        <span style={{ color: angleText[1] }}>{fmtNum(r.angle, 0, lang)}°</span>
      </a>

      <section class="results" id="results" aria-live="polite" aria-atomic="false">
        {r.issues.length > 0 && (
          <div class="alert" role="alert">
            {r.issues.map((i) => (
              <p key={i}>{t.issues[i]}</p>
            ))}
          </div>
        )}

        <div class="hero">
          <span class="k">{t.kBrightness}</span>
          <div class="big">
            <span class="v">
              {fmtNum(r.fl, 1, lang)}
              <small>fL</small>
            </span>
            <span class="alt">{fmtNum(r.nits, 0, lang)} nits</span>
            <span class="pill" style={{ color: brightness[1] }}>{brightness[0]}</span>
          </div>
          <div class="scale" aria-hidden="true">
            <div class="bar">
              <i style={{ width: `${(BRIGHTNESS_LIMITS_FL.dim / scaleMax) * 100}%`, background: 'var(--bad)' }} />
              <i style={{ width: `${((BRIGHTNESS_LIMITS_FL.reference - BRIGHTNESS_LIMITS_FL.dim) / scaleMax) * 100}%`, background: 'var(--ok)' }} />
              <i style={{ width: `${((BRIGHTNESS_LIMITS_FL.bright - BRIGHTNESS_LIMITS_FL.reference) / scaleMax) * 100}%`, background: 'var(--info)' }} />
              <i style={{ flex: 1, background: 'var(--beam)' }} />
            </div>
            <div class="mk" style={{ left: `${Math.min(100, (r.fl / scaleMax) * 100)}%` }} />
            <div class="ticks">
              <span>0</span>
              <span>12</span>
              <span>16</span>
              <span>24</span>
              <span>40 fL</span>
            </div>
          </div>
        </div>

        <div class="cards">
          <div class="card">
            <h2>{t.cScreen}</h2>
            <dl>
              <Row k={t.wLabel} v={f(r.geo.width)} />
              <Row k={t.hLabel} v={f(r.geo.height)} />
              <Row k={t.dLabel} v={`${fmtInches(r.geo.diagonal, lang)} · ${fmtSmallLength(r.geo.diagonal, 'metric', lang)}`} />
              <Row k={t.aLabel} v={area(r.geo.area)} />
              {r.scope && r.method === 'zoom' && <Row k={t.litLabel} v={area(r.img.litArea)} />}
              {r.scope && r.method === 'zoom' && <Row k={t.usefulLabel} v={pct(r.img.usefulFraction * 100)} />}
            </dl>
          </div>
          <div class="card">
            <h2>{t.cThrow}</h2>
            <dl>
              <Row k={t.minLabel} v={f(r.throwDist.min)} />
              <Row k={t.maxLabel} v={f(r.throwDist.max)} />
              <Row k={t.chosenLabel} v={f(m.projector.distance)} />
              <Row k={t.trLabel} v={`${fmtNum(r.throwRatio, 2, lang)}:1`} />
            </dl>
            <p class="verdict" style={{ color: throwText[1] }}>{throwText[0]}</p>
          </div>
          <div class="card">
            <h2>{t.cSeat}</h2>
            <dl>
              <Row k={t.angleLabel} v={`${fmtNum(r.angle, 1, lang)}°`} />
              <Row k={t.smpteLabel} v={f(r.smpteDistance)} />
              <Row k={t.thxLabel} v={f(r.thxDistance)} />
              <Row k={t.thxMaxLabel} v={f(r.thxMaxDistance)} />
            </dl>
            <p class="verdict" style={{ color: angleText[1] }}>{angleText[0]}</p>
          </div>
          <div class="card">
            <h2>{t.cShift}</h2>
            <dl>
              <Row k={t.shiftVReq} v={`${fmtNum(r.shift.vReq, 0, lang)} %`} />
              <Row k={t.shiftAvail} v={m.projector.shiftV == null ? '–' : `± ${fmtNum(m.projector.shiftV, 0, lang)} %`} />
              <Row k={t.shiftHReq} v={`${fmtNum(r.shift.hReq, 0, lang)} %`} />
              <Row k={t.shiftAvail} v={m.projector.shiftH == null ? '–' : `± ${fmtNum(m.projector.shiftH, 0, lang)} %`} />
            </dl>
            <p class="verdict" style={{ color: shiftText[1] }}>{shiftText[0]}</p>
            {r.shift.combined != null && (
              <p class="hint" style={{ color: r.shift.combined > 1 ? 'var(--warn)' : undefined }}>
                {t.shiftCombined}: {fmtNum(r.shift.combined * 100, 0, lang)} %
              </p>
            )}
            <p class="hint">{t.shiftSign}</p>
          </div>
        </div>

        <figure class="plan">
          <figcaption>{t.topView}</figcaption>
          <TopView m={m} r={r} lang={lang} units={u} t={t} />
          <div class="legend">
            <span><i style={{ background: 'var(--fg)' }} />{t.lgScreen}</span>
            <span><i style={{ background: 'var(--beam)' }} />{t.lgProj}</span>
            <span><i style={{ background: 'var(--info)' }} />{t.lgSeat}</span>
          </div>
        </figure>
        <figure class="plan">
          <figcaption>{t.sideView}</figcaption>
          <SideView m={m} r={r} lang={lang} units={u} t={t} />
          {r.scope && r.method === 'zoom' && (
            <div class="legend">
              <span><i style={{ background: 'var(--beam)' }} />{t.lgImage}</span>
            </div>
          )}
        </figure>
      </section>
    </div>
  );
}
