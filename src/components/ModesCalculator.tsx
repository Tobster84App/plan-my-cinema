/** Rechner 2: Raummoden (Preact-Insel). Nutzt Raummaße, Sitz und Subs aus dem gemeinsamen Raummodell. */
import { useEffect, useMemo } from 'preact/hooks';
import { MODES_UI } from '../i18n/modes-ui';
import { UI } from '../i18n/ui';
import { fmtLength, fmtNum, type Lang } from '../lib/format';
import { axialDirection } from '../lib/modes';
import { computeModes } from '../lib/modes-calc';
import { LIMITS, MAX_SUBS, type Subwoofer } from '../lib/room';
import { initBrowserState, isSample, room, units, updateRoom } from '../state/room';
import { AxialProfile, DensityChart, KindLegend, ProfileLegend, SpectrumChart } from './ModeCharts';
import { NumberField } from './NumberField';
import { RoomTools } from './RoomTools';

/** Betrag der Modenform → Einordnung. Schwellen 0,3 / 0,7 sind eigene Festlegung. */
const where = (v: number): 'node' | 'antinode' | 'between' => (Math.abs(v) < 0.3 ? 'node' : Math.abs(v) > 0.7 ? 'antinode' : 'between');

const WALL = 0.3; // typischer Abstand Sub-Membran ↔ Wand für Schnellauswahl

export default function ModesCalculator({ lang }: { lang: Lang }) {
  const t = MODES_UI[lang];
  const tg = UI[lang];
  useEffect(() => initBrowserState(), []);
  const m = room.value;
  const u = units.value;
  const r = useMemo(() => computeModes(m), [m]);
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
          <p class="hint">{t.seatFromWall(f(seat.x))}</p>
          <div class="row2">
            <NumberField id="seat-off" label={t.seatOffset} value={m.seat.offsetY} onChange={(v) => updateRoom((d) => void (d.seat.offsetY = v!))} lang={lang} units={u} kind="cm" min={LIMITS.offset[0]} max={LIMITS.offset[1]} />
            <NumberField id="ear" label={t.earHeight} value={m.seat.eyeHeight} onChange={(v) => updateRoom((d) => void (d.seat.eyeHeight = v!))} lang={lang} units={u} kind="cm" min={LIMITS.eyeHeight[0]} max={LIMITS.eyeHeight[1]} />
          </div>
          <p class="hint">{t.seatOffsetHint}</p>
        </fieldset>

        <fieldset>
          <legend>{t.gSubs}</legend>
          <p class="hint">{t.subsHint}</p>
          <div class="f">
            <span class="lbl">{t.presets}</span>
            <div class="presets">
              {presets.map((p) => (
                <button type="button" class="btn small" key={p.label} onClick={() => updateRoom((d) => void (d.subs = p.subs.map((s) => ({ ...s }))))}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
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
        </fieldset>

        <RoomTools lang={lang} />
      </form>

      <a class="mini" href="#results" aria-hidden="true" tabIndex={-1}>
        <span>{hz(r.axial[0]?.f ?? 0)}</span>
        <span>{r.modes.length} {lang === 'de' ? 'Moden' : 'modes'}</span>
        <span>{m.subs.length} Sub{m.subs.length > 1 ? 's' : ''}</span>
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
            {m.subs.length > 1 && cancelled > 0 && <li>{t.hintCancel(cancelled)}</li>}
            {m.subs.length === 1 && <li>{t.hintSingle}</li>}
          </ul>
        </div>

        <figure class="chart">
          <h2>{t.spectrumTitle}</h2>
          <p class="sub">{t.spectrumSub}</p>
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
              const subPos = m.subs.map((s) => [s.x, s.y, s.z][dir]);
              return <AxialProfile key={dir} title={dirName[dir]} len={len} freqs={freqs} seatPos={seatPos} subPos={subPos} units={u} lang={lang} t={t} />;
            })}
          </div>
          <ProfileLegend t={t} />
        </figure>

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
