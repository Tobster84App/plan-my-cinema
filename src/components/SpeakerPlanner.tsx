/** Rechner 3: Lautsprecher-Planer Dolby Atmos (Preact-Insel). */
import { Fragment } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { SPEAKERS_UI } from '../i18n/speakers-ui';
import { UI } from '../i18n/ui';
import { fmtLength, fmtNum, fmtSmallLength, type Lang } from '../lib/format';
import { LIMITS, SPEAKER_LAYOUTS, type SpeakerId, type SpeakerLayout } from '../lib/room';
import { computeSpeakers } from '../lib/speakers-calc';
import { initBrowserState, isSample, room, units, updateRoom } from '../state/room';
import { NumberField } from './NumberField';
import { RoomTools } from './RoomTools';
import { STATUS_COLOR, STATUS_ICON, SpeakerSideView, SpeakerTopView } from './SpeakerViews';

export default function SpeakerPlanner({ lang }: { lang: Lang }) {
  const t = SPEAKERS_UI[lang];
  const tg = UI[lang];
  useEffect(() => initBrowserState(), []);
  const m = room.value;
  const u = units.value;
  const r = useMemo(() => computeSpeakers(m), [m]);
  const [editing, setEditing] = useState<SpeakerId | null>(null);
  const mlpIndex = Math.max(0, r.seats.findIndex((x) => x.seat.isMlp));
  const [selRaw, setSel] = useState<number | null>(null);
  const sel = selRaw != null && selRaw < r.seats.length ? selRaw : mlpIndex;
  const seatRes = r.seats[sel];
  const cnt = seatRes.counts;
  const seatName = seatRes.seat.isMlp ? t.mlpLabel : t.seatLabel(seatRes.seat.row, seatRes.seat.index);
  const resOf = (id: SpeakerId) => seatRes.results.find((x) => x.id === id)!;
  const f = (v: number) => fmtLength(v, u, lang);
  const deg = (v: number) => `${fmtNum(v, 0, lang)}°`;
  const n = r.speakers.length;

  const setPos = (id: SpeakerId, key: 'x' | 'y' | 'z', v: number) =>
    updateRoom((d) => {
      const cur = r.speakers.find((s) => s.id === id)!.pos;
      d.speakers.overrides[id] = { ...cur, ...(d.speakers.overrides[id] ?? {}), [key]: v };
    });

  return (
    <div class="calc">
      <form class="panel" onSubmit={(e) => e.preventDefault()} autoComplete="off">
        <p class="sample" aria-live="polite">{isSample.value ? tg.sample : tg.saved}</p>

        <fieldset>
          <legend>{t.gLayout}</legend>
          <div class="f">
            <label for="layout">{t.layout}</label>
            <select id="layout" value={m.speakers.layout} onChange={(e) => updateRoom((d) => void (d.speakers.layout = (e.target as HTMLSelectElement).value as SpeakerLayout))}>
              {SPEAKER_LAYOUTS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <p class="hint">{t.layoutHint}</p>
          </div>
          <NumberField id="lh" label={t.listenerHeight} value={m.speakers.listenerHeight} nullable onChange={(v) => updateRoom((d) => void (d.speakers.listenerHeight = v))} lang={lang} units={u} kind="cm" min={0.2} max={3} hint={t.listenerHeightHint} />
        </fieldset>

        <fieldset>
          <legend>{t.gRoom}</legend>
          <NumberField id="room-l" label={tg.roomLength} value={m.room.length} onChange={(v) => updateRoom((d) => void (d.room.length = v!))} lang={lang} units={u} kind="m" min={LIMITS.roomLength[0]} max={LIMITS.roomLength[1]} />
          <div class="row2">
            <NumberField id="room-w" label={tg.roomWidth} value={m.room.width} onChange={(v) => updateRoom((d) => void (d.room.width = v!))} lang={lang} units={u} kind="m" min={LIMITS.roomWidth[0]} max={LIMITS.roomWidth[1]} />
            <NumberField id="room-h" label={tg.roomHeight} value={m.room.height} onChange={(v) => updateRoom((d) => void (d.room.height = v!))} lang={lang} units={u} kind="m" min={LIMITS.roomHeight[0]} max={LIMITS.roomHeight[1]} />
          </div>
          <NumberField id="gap" label={tg.wallGap} value={m.screen.wallGap} onChange={(v) => updateRoom((d) => void (d.screen.wallGap = v!))} lang={lang} units={u} kind="cm" min={LIMITS.wallGap[0]} max={LIMITS.wallGap[1]} />
        </fieldset>

        <fieldset>
          <legend>{t.gSeat}</legend>
          <NumberField id="seat" label={tg.seatDistance} value={m.seat.distance} onChange={(v) => updateRoom((d) => void (d.seat.distance = v!))} lang={lang} units={u} kind="m" min={LIMITS.seatDistance[0]} max={LIMITS.seatDistance[1]} />
          <div class="row2">
            <NumberField id="seat-off" label={t.seatOffset} value={m.seat.offsetY} onChange={(v) => updateRoom((d) => void (d.seat.offsetY = v!))} lang={lang} units={u} kind="cm" min={LIMITS.offset[0]} max={LIMITS.offset[1]} />
            <NumberField id="ear" label={tg.eyeHeight} value={m.seat.eyeHeight} onChange={(v) => updateRoom((d) => void (d.seat.eyeHeight = v!))} lang={lang} units={u} kind="cm" min={LIMITS.eyeHeight[0]} max={LIMITS.eyeHeight[1]} />
          </div>
        </fieldset>

        <fieldset>
          <legend>{t.gSeating}</legend>
          <div class="row2">
            <NumberField id="rows" label={t.rows} value={m.seating.rows} digits={0} unit="" onChange={(v) => updateRoom((d) => void (d.seating.rows = Math.round(v!)))} lang={lang} min={LIMITS.rows[0]} max={LIMITS.rows[1]} />
            <NumberField id="spr" label={t.seatsPerRow} value={m.seating.seatsPerRow} digits={0} unit="" onChange={(v) => updateRoom((d) => void (d.seating.seatsPerRow = Math.round(v!)))} lang={lang} min={LIMITS.seatsPerRow[0]} max={LIMITS.seatsPerRow[1]} />
          </div>
          <div class="row2">
            <NumberField id="sps" label={t.seatSpacing} value={m.seating.seatSpacing} onChange={(v) => updateRoom((d) => void (d.seating.seatSpacing = v!))} lang={lang} units={u} kind="cm" min={LIMITS.seatSpacing[0]} max={LIMITS.seatSpacing[1]} />
            <NumberField id="rsp" label={t.rowSpacing} value={m.seating.rowSpacing} onChange={(v) => updateRoom((d) => void (d.seating.rowSpacing = v!))} lang={lang} units={u} kind="cm" min={LIMITS.rowSpacing[0]} max={LIMITS.rowSpacing[1]} />
          </div>
          {m.seating.rows > 1 && (
            <NumberField id="riser" label={t.riserStep} value={m.seating.riserStep} onChange={(v) => updateRoom((d) => void (d.seating.riserStep = v!))} lang={lang} units={u} kind="cm" min={LIMITS.riserStep[0]} max={LIMITS.riserStep[1]} />
          )}
          <p class="hint">{t.seatingHint}</p>
        </fieldset>

        <RoomTools lang={lang} />
      </form>

      <a class="mini" href="#results" aria-hidden="true" tabIndex={-1}>
        <span>{m.speakers.layout}</span>
        <span style={{ color: 'var(--ok)' }}>✓ {cnt.ok}</span>
        <span style={{ color: 'var(--warn)' }}>! {cnt.warn}</span>
        <span style={{ color: 'var(--bad)' }}>✕ {cnt.bad}</span>
      </a>

      <section class="results" id="results" aria-live="polite" aria-atomic="false">
        <div class="hero">
          <span class="k">{m.speakers.layout} · Dolby Atmos{r.seats.length > 1 ? ` · ${seatName}` : ''}</span>
          <div class="big">
            <span class="v">
              {cnt.ok}
              <small>/ {n}</small>
            </span>
            <span class="alt">{t.summary(cnt.ok, n)}</span>
          </div>
          <div class="legend">
            {(['ok', 'warn', 'bad'] as const).map((s) => (
              <span key={s}>
                <b style={{ color: STATUS_COLOR[s] }}>{STATUS_ICON[s]}</b> {cnt[s]} {t[s]}
              </span>
            ))}
          </div>
        </div>

        <figure class="chart">
          <h2>{t.topView}</h2>
          <SpeakerTopView m={m} r={r} selected={sel} lang={lang} units={u} t={t} />
          <div class="legend">
            <span><i class="swatch" style={{ background: 'var(--info)', borderRadius: '50%' }} />{t.legendMlp}</span>
            <span><i class="swatch" style={{ background: 'var(--fg)' }} />{t.legendScreen}</span>
            <span><i class="swatch" style={{ background: 'var(--ok)', borderRadius: '50%' }} />{lang === 'de' ? 'Ohrhöhe' : 'Ear level'}</span>
            <span><i class="swatch" style={{ border: '2px solid var(--ok)', background: 'transparent' }} />Overhead</span>
          </div>
        </figure>

        {(r.speakers.some((s) => s.rule.measure === 'elevation') || m.seating.rows > 1) && (
          <figure class="chart">
            <h2>{t.sideView}</h2>
            <SpeakerSideView m={m} r={r} selected={sel} lang={lang} units={u} t={t} />
          </figure>
        )}

        <figure class="chart">
          <h2>{t.tableTitle}</h2>
          {r.seats.length > 1 && (
            <div class="f">
              <span class="lbl">{t.viewFrom}</span>
              <div class="presets" role="group" aria-label={t.viewFrom}>
                {r.seats.map((st, i) => (
                  <button type="button" key={i} class="btn small" aria-pressed={i === sel} style={i === sel ? { borderColor: 'var(--info)', color: 'var(--fg)' } : undefined} onClick={() => setSel(i)}>
                    {st.seat.isMlp ? t.mlpLabel : t.seatLabel(st.seat.row, st.seat.index)}
                    {' '}
                    <span style={{ color: st.counts.bad ? 'var(--bad)' : st.counts.warn ? 'var(--warn)' : 'var(--ok)' }}>
                      {st.counts.bad ? '✕' : st.counts.warn ? '!' : '✓'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div class="tbl-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>{t.thSpk}</th>
                  <th>{t.thAngle}</th>
                  <th>{t.thRange}</th>
                  <th>{t.thStatus}</th>
                  {r.seats.length > 1 && <th>{t.thAll}</th>}
                  <th>{t.thDist}</th>
                  <th>{t.thPos}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {r.speakers.map((s) => (
                  <Fragment key={s.id}>
                    <tr>
                      <td>
                        <b>{s.id}</b> <span style={{ color: 'var(--muted)' }}>{t.names[s.id]}</span>
                      </td>
                      <td class="num">{s.rule.measure === 'azimuth' ? `${t.az} ${deg(resOf(s.id).azimuth)}` : `${t.el} ${deg(resOf(s.id).elevation)}`}</td>
                      <td class="num">{s.rule.range.min === s.rule.range.max ? deg(s.rule.range.min) : `${fmtNum(s.rule.range.min, 0, lang)}–${deg(s.rule.range.max)}`}</td>
                      <td style={{ color: STATUS_COLOR[resOf(s.id).status] }}>
                        {STATUS_ICON[resOf(s.id).status]} {t[resOf(s.id).status]}
                      </td>
                      {r.seats.length > 1 && (
                        <td style={{ color: STATUS_COLOR[r.worstBySpeaker[s.id]] }} title={t.seatSummary(r.seats.length)}>
                          {STATUS_ICON[r.worstBySpeaker[s.id]]}
                        </td>
                      )}
                      <td class="num">{f(resOf(s.id).distance)}</td>
                      <td class="num">
                        {f(s.pos.x)} · {f(s.pos.y)} · {f(s.pos.z)} <span style={{ color: 'var(--muted)' }}>({s.manual ? t.manual : t.auto})</span>
                      </td>
                      <td>
                        <button type="button" class="btn small" aria-expanded={editing === s.id} onClick={() => setEditing(editing === s.id ? null : s.id)}>
                          {editing === s.id ? t.done : t.edit}
                        </button>
                      </td>
                    </tr>
                    {editing === s.id && (
                      <tr>
                        <td colSpan={8} style={{ whiteSpace: 'normal' }}>
                          <div class="row3" style={{ maxWidth: '520px' }}>
                            <NumberField id={`${s.id}-x`} label={t.x} value={s.pos.x} onChange={(v) => setPos(s.id, 'x', v!)} lang={lang} units={u} kind="cm" min={0} max={m.room.length} />
                            <NumberField id={`${s.id}-y`} label={t.y} value={s.pos.y} onChange={(v) => setPos(s.id, 'y', v!)} lang={lang} units={u} kind="cm" min={0} max={m.room.width} />
                            <NumberField id={`${s.id}-z`} label={t.z} value={s.pos.z} onChange={(v) => setPos(s.id, 'z', v!)} lang={lang} units={u} kind="cm" min={0} max={m.room.height} />
                          </div>
                          {s.manual && (
                            <button type="button" class="btn small ghost" style={{ marginTop: '8px' }} onClick={() => updateRoom((d) => void delete d.speakers.overrides[s.id])}>
                              {t.reset}
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p class="sub">{t.tolNote}</p>
          {r.speakers.some((s) => s.id === 'C' && s.status !== 'ok') && <p class="sub">{t.cNote}</p>}
        </figure>

        <div class="card">
          <h2>{t.sightTitle}</h2>
          {r.sightlines.length === 0 ? (
            <p class="hint">{t.sightSingle}</p>
          ) : (
            <ul class="hints">
              {r.sightlines.map((sl) => (
                <li key={sl.row} style={{ color: STATUS_COLOR[sl.status] }}>
                  {STATUS_ICON[sl.status]} {t.sightRow(sl.row)}: {t.sightC(fmtSmallLength(sl.c, u, lang))}
                  {sl.status !== 'ok' && <span style={{ color: 'var(--muted)' }}> · {t.sightNeed(f(sl.requiredEyeZ))}</span>}
                </li>
              ))}
            </ul>
          )}
          <p class="sub">{t.sightNote}</p>
        </div>

        <figure class="chart">
          <h2>{t.reflTitle}</h2>
          <div class="tbl-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>{t.thSpk}</th>
                  <th>{t.thSurface}</th>
                  <th>{t.thPoint}</th>
                  <th>{t.thExtra}</th>
                </tr>
              </thead>
              <tbody>
                {r.reflections.map((x) => (
                  <tr key={`${x.id}${x.surface}`}>
                    <td><b>{x.id}</b></td>
                    <td>{t.surfaces[x.surface]}</td>
                    <td>{x.surface === 'left' || x.surface === 'right' ? t.pointWall(f(x.point.x), f(x.point.z)) : t.pointFlat(f(x.point.x), f(x.point.y))}</td>
                    <td class="num">{f(x.extra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="sub">{t.reflNote}</p>
        </figure>

        <div class="card">
          <h2>{t.checksTitle}</h2>
          <ul class="hints">
            <li style={{ color: r.checks.rearHeightFactor <= r.checks.rearHeightMax + 1e-9 ? undefined : 'var(--warn)' }}>
              {t.rearHeight(fmtNum(r.checks.rearHeightFactor, 2, lang), fmtNum(r.checks.rearHeightMax, 2, lang))}
            </li>
            {r.checks.overheadFactor != null && (
              <li
                style={{
                  color:
                    r.checks.overheadFactor >= r.checks.overheadRange.min - 1e-9 && r.checks.overheadFactor <= r.checks.overheadRange.max + 1e-9 ? undefined : 'var(--warn)',
                }}
              >
                {t.overheadHeight(fmtNum(r.checks.overheadFactor, 2, lang), String(r.checks.overheadRange.min), String(r.checks.overheadRange.max))}
              </li>
            )}
            {r.checks.distanceSpread > 0.3 && <li>{t.distanceSpread(f(r.checks.distanceSpread))}</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
