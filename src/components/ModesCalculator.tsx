/** Rechner 2: Raummoden (Preact-Insel). Nutzt Raummaße, Sitz und Subs aus dem gemeinsamen Raummodell. */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { MODES_UI } from '../i18n/modes-ui';
import { SPEAKERS_UI } from '../i18n/speakers-ui';
import { UI } from '../i18n/ui';
import { fmtLength, fmtNum, type Lang } from '../lib/format';
import { axialDirection } from '../lib/modes';
import { SPREAD_WARN_DB, computeModes, seatSpread } from '../lib/modes-calc';
import { BASS_MODES, LIMITS, MAX_SUBS, type BassMode, type Subwoofer } from '../lib/room';
import { initBrowserState, isSample, room, units, updateRoom } from '../state/room';
import { AxialProfile, DensityChart, KindLegend, ProfileLegend, SpectrumChart } from './ModeCharts';
import { NumberField } from './NumberField';
import { RoomTools } from './RoomTools';
import { SeatingFields } from './SeatingFields';

/** Betrag der Modenform → Einordnung. Schwellen 0,3 / 0,7 sind eigene Festlegung. */
const where = (v: number): 'node' | 'antinode' | 'between' => (Math.abs(v) < 0.3 ? 'node' : Math.abs(v) > 0.7 ? 'antinode' : 'between');

const WALL = 0.3; // typischer Abstand Sub-Membran ↔ Wand für Schnellauswahl

export default function ModesCalculator({ lang }: { lang: Lang }) {
  const t = MODES_UI[lang];
  const tg = UI[lang];
  useEffect(() => initBrowserState(), []);
  const m = room.value;
  const u = units.value;
  const ts = SPEAKERS_UI[lang];
  const [selRaw, setSel] = useState<number | null>(null);
  const r0 = useMemo(() => computeModes(m), [m]);
  const mlpIndex = Math.max(0, r0.seats.findIndex((x) => x.isMlp));
  const sel = selRaw != null && selRaw < r0.seats.length ? selRaw : mlpIndex;
  const r = useMemo(() => (sel === mlpIndex && r0.seats[sel]?.isMlp ? r0 : computeModes(m, sel)), [m, sel, r0, mlpIndex]);
  const seatName = (i: number) => {
    const st = r0.seats[i];
    return !st ? '' : st.isMlp ? ts.mlpLabel : ts.seatLabel(st.row, st.index);
  };
  const multi = r0.seats.length > 1;
  const db = (v: number) => `${fmtNum(v, 1, lang)} dB`;
  const f = (v: number) => fmtLength(v, u, lang);
  const hz = (v: number) => `${fmtNum(v, 1, lang)} Hz`;
  const { length: Lr, width: Wr } = m.room;

  const presets: { label: string; subs: Subwoofer[] }[] = [
    { label: t.pFrontCorner, subs: [{ x: WALL, y: WALL, z: 0.25 }] },
    { label: t.pFrontMid, subs: [{ x: WALL, y: Wr / 2, z: 0.25 }] },
    { label: t.pFrontBack, subs: [{ x: WALL, y: Wr / 2, z: 0.25 }, { x: Lr - WALL, y: Wr / 2, z: 0.25 }] },
    {
      label: t.pFourMid,
      subs: [
        { x: WALL, y: Wr / 2, z: 0.25 },
        { x: Lr - WALL, y: Wr / 2, z: 0.25 },
        { x: Lr / 2, y: WALL, z: 0.25 },
        { x: Lr / 2, y: Wr - WALL, z: 0.25 },
      ],
    },
    {
      label: t.pFourCorners,
      subs: [
        { x: WALL, y: WALL, z: 0.25 },
        { x: WALL, y: Wr - WALL, z: 0.25 },
        { x: Lr - WALL, y: WALL, z: 0.25 },
        { x: Lr - WALL, y: Wr - WALL, z: 0.25 },
      ],
    },
  ];

  const dirName = [t.dirLength, t.dirWidth, t.dirHeight];
  const whereText = { node: t.whereNode, antinode: t.whereAntinode, between: t.whereBetween };
  const whereShort = { node: t.node, antinode: t.antinode, between: t.between };
  const cancelled = r.axial.filter((a) => a.f < 120 && Math.abs(a.excitation) < 0.1).length;
  const seat = r.seat;

  return (
    <div class="calc">
      <form class="panel" onSubmit={(e) => e.preventDefault()} autoComplete="off">
        <p class="sample" aria-live="polite">{isSample.value ? tg.sample : tg.saved}</p>

        <fieldset>
          <legend>{t.gRoom}</legend>
          <NumberField id="room-l" label={tg.roomLength} value={m.room.length} onChange={(v) => updateRoom((d) => void (d.room.length = v!))} lang={lang} units={u} kind="m" min={LIMITS.roomLength[0]} max={LIMITS.roomLength[1]} />
          <div class="row2">
            <NumberField id="room-w" label={tg.roomWidth} value={m.room.width} onChange={(v) => updateRoom((d) => void (d.room.width = v!))} lang={lang} units={u} kind="m" min={LIMITS.roomWidth[0]} max={LIMITS.roomWidth[1]} />
            <NumberField id="room-h" label={tg.roomHeight} value={m.room.height} onChange={(v) => updateRoom((d) => void (d.room.height = v!))} lang={lang} units={u} kind="m" min={LIMITS.roomHeight[0]} max={LIMITS.roomHeight[1]} />
          </div>
          <NumberField id="temp" label={t.temperature} value={m.acoustics.temperatureC} unit="°C" digits={0} onChange={(v) => updateRoom((d) => void (d.acoustics.temperatureC = v!))} lang={lang} min={LIMITS.temperature[0]} max={LIMITS.temperature[1]} hint={t.temperatureHint} />
        </fieldset>

        <fieldset>
          <legend>{t.gSeat}</legend>
          <NumberField id="seat" label={t.seatDistance} value={m.seat.distance} onChange={(v) => updateRoom((d) => void (d.seat.distance = v!))} lang={lang} units={u} kind="m" min={LIMITS.seatDistance[0]} max={LIMITS.seatDistance[1]} />
          <p class="hint">{t.seatFromWall(f(r0.seat.x))}</p>
          <div class="row2">
            <NumberField id="seat-off" label={t.seatOffset} value={m.seat.offsetY} onChange={(v) => updateRoom((d) => void (d.seat.offsetY = v!))} lang={lang} units={u} kind="cm" min={LIMITS.offset[0]} max={LIMITS.offset[1]} />
            <NumberField id="ear" label={t.earHeight} value={m.seat.eyeHeight} onChange={(v) => updateRoom((d) => void (d.seat.eyeHeight = v!))} lang={lang} units={u} kind="cm" min={LIMITS.eyeHeight[0]} max={LIMITS.eyeHeight[1]} />
          </div>
          <p class="hint">{t.seatOffsetHint}</p>
        </fieldset>

        <SeatingFields lang={lang} />

        <fieldset>
          <legend>{t.gSubs}</legend>
          <div class="f">
            <span class="lbl">{t.bassMode}</span>
            <div class="presets" role="group" aria-label={t.bassMode}>
              {BASS_MODES.map((bm: BassMode) => (
                <button type="button" key={bm} class="btn small" aria-pressed={m.bass.mode === bm} style={m.bass.mode === bm ? { borderColor: 'var(--info)', color: 'var(--fg)' } : undefined} onClick={() => updateRoom((d) => void (d.bass.mode = bm))}>
                  {t.bassModes[bm]}
                </button>
              ))}
            </div>
          </div>
          {m.bass.mode === 'free' && (
            <>
          <p class="hint">{t.subsHint}</p>
          <div class="f">
            <span class="lbl">{t.presets}</span>
            <div class="presets">
              {presets.map((p) => (
                <button type="button" class="btn small" key={p.label} onClick={() => updateRoom((d) => void (d.subs = p.subs.map((s) => ({ ...s }))))}>
                  {p.label}
                  {multi && <span style={{ color: 'var(--muted)' }}> · {t.presetSpread(db(seatSpread(m.room, r.c, p.subs, r0.seats.map((x) => x.pos)).mean))}</span>}
                </button>
              ))}
            </div>
          </div>
          {multi && <p class="hint">{t.presetSpreadHint}</p>}
          {m.subs.map((s, i) => (
            <div class="sub-card" key={i}>
              <div class="head">
                <span>{t.sub(i + 1)}</span>
                {m.subs.length > 1 && (
                  <button type="button" class="btn small ghost" onClick={() => updateRoom((d) => void d.subs.splice(i, 1))}>
                    {t.removeSub}
                  </button>
                )}
              </div>
              <div class="row3">
                <NumberField id={`sub${i}-x`} label={t.subX} value={s.x} onChange={(v) => updateRoom((d) => void (d.subs[i].x = v!))} lang={lang} units={u} kind="cm" min={0} max={m.room.length} />
                <NumberField id={`sub${i}-y`} label={t.subY} value={s.y} onChange={(v) => updateRoom((d) => void (d.subs[i].y = v!))} lang={lang} units={u} kind="cm" min={0} max={m.room.width} />
                <NumberField id={`sub${i}-z`} label={t.subZ} value={s.z} onChange={(v) => updateRoom((d) => void (d.subs[i].z = v!))} lang={lang} units={u} kind="cm" min={0} max={m.room.height} />
              </div>
            </div>
          ))}
          {m.subs.length < MAX_SUBS && (
            <button type="button" class="btn" onClick={() => updateRoom((d) => void d.subs.push({ x: WALL, y: d.room.width - WALL, z: 0.25 }))}>
              + {t.addSub}
            </button>
          )}
            </>
          )}
          {m.bass.mode !== 'free' && (
            <>
              <p class="hint">{m.bass.mode === 'sba' ? t.sbaHint : t.dbaHint}</p>
              <div class="row2">
                <NumberField id="arr-c" label={t.arrayCols} value={m.bass.cols} digits={0} unit="" onChange={(v) => updateRoom((d) => void (d.bass.cols = Math.round(v!)))} lang={lang} min={LIMITS.arrayCols[0]} max={LIMITS.arrayCols[1]} />
                <NumberField id="arr-r" label={t.arrayRows} value={m.bass.rows} digits={0} unit="" onChange={(v) => updateRoom((d) => void (d.bass.rows = Math.round(v!)))} lang={lang} min={LIMITS.arrayRows[0]} max={LIMITS.arrayRows[1]} />
              </div>
              <NumberField id="arr-g" label={t.arrayGap} value={m.bass.wallGap} onChange={(v) => updateRoom((d) => void (d.bass.wallGap = v!))} lang={lang} units={u} kind="cm" min={LIMITS.arrayGap[0]} max={LIMITS.arrayGap[1]} />
              <p class="hint">{t.arrayGrid}</p>
              <div class="sub-card">
                <div class="head">
                  <span>{t.arrayTotal(r.subs.length)}</span>
                </div>
                <p class="hint" style={{ margin: 0 }}>
                  {t.arrayY}: {[...new Set(r.subs.map((q) => q.y))].map((v) => f(v)).join(' · ')}
                  <br />
                  {t.arrayZ}: {[...new Set(r.subs.map((q) => q.z))].map((v) => f(v)).join(' · ')}
                  <br />
                  {t.arrayFront}: {f(r.subs[0].x)}
                  {m.bass.mode === 'dba' && (
                    <>
                      {' · '}
                      {t.arrayRear}: {f(r.subs[r.subs.length - 1].x)}
                    </>
                  )}
                </p>
                {m.bass.mode === 'dba' && <p class="hint" style={{ margin: 0 }}>{t.arrayDelay(`${fmtNum((r.subs[r.subs.length - 1].delay ?? 0) * 1000, 2, lang)} ms`, f(r.subs[r.subs.length - 1].x - r.subs[0].x))}</p>}
                {multi && <p class="hint" style={{ margin: 0 }}>{t.arraySpread(db(r.spread.mean))}</p>}
                <p class="hint" style={{ margin: 0 }}>{t.levelMean(db(r.spread.level))}</p>
              </div>
            </>
          )}
        </fieldset>

        <RoomTools lang={lang} />
      </form>

      <a class="mini" href="#results" aria-hidden="true" tabIndex={-1}>
        <span>{hz(r.axial[0]?.f ?? 0)}</span>
        <span>{r.modes.length} {lang === 'de' ? 'Moden' : 'modes'}</span>
        <span>{r.subs.length} Sub{r.subs.length > 1 ? 's' : ''}</span>
      </a>

      <section class="results" id="results" aria-live="polite" aria-atomic="false">
        <div class="hero">
          <span class="k">{t.kSummary}</span>
          <div class="big">
            <span class="v">
              {r.modes.length}
              <small>{lang === 'de' ? 'Moden' : 'modes'}</small>
            </span>
            <span class="alt">
              {r.counts.axial} {t.axial} · {r.counts.tangential} {t.tangential} · {r.counts.oblique} {t.oblique}
            </span>
          </div>
          <dl>
            <dt>{t.lowest}</dt>
            <dd>{r.modes[0] ? `${hz(r.modes[0].f)} (${dirName[axialDirection(r.modes[0])]})` : '–'}</dd>
            <dt>{t.speed}</dt>
            <dd>{fmtNum(r.c, 1, lang)} m/s</dd>
          </dl>
        </div>

        <div class="card">
          <h2>{t.hintsTitle}</h2>
          <ul class="hints">
            {r.firstAxial.map((a, dir) =>
              a ? (
                <li key={dir}>{t.hintFirst(t.modeNames[dir], hz(a.f), whereText[where(a.atSeat)])}</li>
              ) : null,
            )}
            {r.closePairs.slice(0, 2).map(([a, b]) => (
              <li key={`${a.n}-${b.n}`}>{t.hintPair(`${hz(a.f)} ${dirName[axialDirection(a)]}`, `${hz(b.f)} ${dirName[axialDirection(b)]}`)}</li>
            ))}
            {r.subs.length > 1 && cancelled > 0 && <li>{t.hintCancel(cancelled)}</li>}
            {r.subs.length === 1 && <li>{t.hintSingle}</li>}
          </ul>
        </div>

        <figure class="chart">
          <h2>{t.spectrumTitle}</h2>
          <p class="sub">{t.spectrumSub}</p>
          {multi && (
            <div class="f">
              <span class="lbl">{t.spectrumFor}</span>
              <div class="presets" role="group" aria-label={t.spectrumFor}>
                {r0.seats.map((st, i) => (
                  <button type="button" key={i} class="btn small" aria-pressed={i === sel} style={i === sel ? { borderColor: 'var(--info)', color: 'var(--fg)' } : undefined} onClick={() => setSel(i)}>
                    {seatName(i)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <SpectrumChart modes={r.modes} lang={lang} t={t} />
          <KindLegend t={t} />
        </figure>

        <figure class="chart">
          <h2>{t.profilesTitle}</h2>
          <p class="sub">{t.profilesSub}</p>
          <div class="small-multiples">
            {[0, 1, 2].map((dir) => {
              const len = [m.room.length, m.room.width, m.room.height][dir];
              const freqs = r.axial.filter((a) => axialDirection(a) === dir).slice(0, 3).map((a) => a.f);
              const seatPos = [seat.x, seat.y, seat.z][dir];
              const otherSeats = r0.seats.filter((_, i) => i !== sel).map((st) => [st.pos.x, st.pos.y, st.pos.z][dir]);
              const subPos = r.subs.map((s) => [s.x, s.y, s.z][dir]);
              return <AxialProfile key={dir} title={dirName[dir]} len={len} freqs={freqs} seatPos={seatPos} otherSeats={otherSeats} subPos={subPos} units={u} lang={lang} t={t} />;
            })}
          </div>
          <ProfileLegend t={t} />
        </figure>

        <div class="card">
          <h2>{t.evenTitle}</h2>
          {!multi ? (
            <p class="hint">{t.evenSingle}</p>
          ) : (
            (() => {
              const big = r.spread.modes.filter((x) => x.spread >= SPREAD_WARN_DB - 1e-9);
              return (
                <>
                  <p>{t.evenMean(db(r.spread.mean))}</p>
                  <p class="hint">{t.levelMean(db(r.spread.level))}</p>
                  {big.length === 0 ? (
                    <p class="hint">{t.evenNone}</p>
                  ) : (
                    <>
                      <p class="hint">{t.evenList}</p>
                      <ul class="hints">
                        {big.slice(0, 8).map((x) => (
                          <li key={x.n.join()} style={{ color: x.spread >= 20 ? 'var(--bad)' : 'var(--warn)' }}>
                            {t.evenRow(`${hz(x.f)} (${x.n.join('-')})`, x.spread >= 30 - 1e-9 ? '≥ 30 dB' : db(x.spread), seatName(x.best), seatName(x.worst))}
                          </li>
                        ))}
                        {big.length > 8 && <li>{t.evenMore(big.length - 8)}</li>}
                      </ul>
                    </>
                  )}
                </>
              );
            })()
          )}
          <p class="sub">{t.evenNote}</p>
        </div>

        <figure class="chart">
          <h2>{t.densityTitle}</h2>
          <p class="sub">{t.densitySub}</p>
          <DensityChart bins={r.density} t={t} />
          <KindLegend t={t} />
        </figure>

        <figure class="chart">
          <h2>{t.tableTitle}</h2>
          <div class="tbl-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>{t.thF}</th>
                  <th>{t.thDir}</th>
                  <th>{t.thN}</th>
                  <th>{t.thSeat}</th>
                  <th>{t.thExc}</th>
                  <th>{t.thDb}</th>
                </tr>
              </thead>
              <tbody>
                {r.axial.map((a) => {
                  const dir = axialDirection(a);
                  return (
                    <tr key={`${a.n}`}>
                      <td class="num">{hz(a.f)}</td>
                      <td>{dirName[dir]}</td>
                      <td class="num">{a.n[dir]}</td>
                      <td class="num">{fmtNum(a.atSeat, 2, lang)} · {whereShort[where(a.atSeat)]}</td>
                      <td class="num">{fmtNum(a.excitation, 2, lang)}</td>
                      <td class="num">{fmtNum(a.db, 1, lang)} {t.dbUnit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p class="sub">{t.tableNote}</p>
        </figure>
      </section>
    </div>
  );
}
