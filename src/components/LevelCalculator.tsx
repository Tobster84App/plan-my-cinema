/** Rechner 4: Pegel & Verstärker (Preact-Insel). Nutzt Lautsprecher-Positionen und MLP aus dem gemeinsamen Raummodell. */
import { useEffect, useMemo } from 'preact/hooks';
import { LEVELS_UI } from '../i18n/levels-ui';
import { SPEAKERS_UI } from '../i18n/speakers-ui';
import { UI } from '../i18n/ui';
import { path } from '../i18n/routes';
import { fmtLength, fmtNum, type Lang } from '../lib/format';
import { computeLevels, DOLBY_CAL_RANGE } from '../lib/levels';
import { LEVEL_GROUPS, LIMITS, type SensBasis, type SpeakerId } from '../lib/room';
import { computeSpeakers } from '../lib/speakers-calc';
import { initBrowserState, isSample, room, units, updateRoom } from '../state/room';
import { NumberField } from './NumberField';
import { RoomTools } from './RoomTools';
import { STATUS_COLOR, STATUS_ICON } from './SpeakerViews';

export default function LevelCalculator({ lang }: { lang: Lang }) {
  const t = LEVELS_UI[lang];
  const ts = SPEAKERS_UI[lang];
  const tg = UI[lang];
  useEffect(() => initBrowserState(), []);
  const m = room.value;
  const u = units.value;
  const sp = useMemo(() => computeSpeakers(m), [m]);
  const r = useMemo(() => computeLevels(m, sp), [m, sp]);
  const db = (v: number, signed = false) => `${signed && v > 0.05 ? '+' : ''}${fmtNum(v, 1, lang)} dB`;
  const watts = (v: number) => `${fmtNum(v, v < 10 ? 1 : 0, lang)} W`;
  const w = r.worst;

  return (
    <div class="calc">
      <form class="panel" onSubmit={(e) => e.preventDefault()} autoComplete="off">
        <p class="sample" aria-live="polite">{isSample.value ? tg.sample : tg.saved}</p>
        <fieldset>
          <legend>{t.gTarget}</legend>
          <NumberField id="cal" label={t.calSpl} value={m.levels.calSpl} unit="dB" digits={1} onChange={(v) => updateRoom((d) => void (d.levels.calSpl = v!))} lang={lang} min={LIMITS.calSpl[0]} max={LIMITS.calSpl[1]} hint={t.calHint} />
        </fieldset>
        {LEVEL_GROUPS.map((g) => {
          const s = m.levels.groups[g];
          return (
            <fieldset key={g}>
              <legend>{t.groups[g]}</legend>
              <div class="row2">
                <NumberField id={`${g}-sens`} label={t.sens} value={s.sens} unit="dB" digits={1} onChange={(v) => updateRoom((d) => void (d.levels.groups[g].sens = v!))} lang={lang} min={LIMITS.sens[0]} max={LIMITS.sens[1]} />
                <div class="f">
                  <label for={`${g}-basis`}>{t.basis}</label>
                  <select id={`${g}-basis`} value={s.basis} onChange={(e) => updateRoom((d) => void (d.levels.groups[g].basis = (e.target as HTMLSelectElement).value as SensBasis))}>
                    <option value="2v83">{t.basis283}</option>
                    <option value="1w">{t.basis1w}</option>
                  </select>
                </div>
              </div>
              <div class="row2">
                <NumberField id={`${g}-imp`} label={t.impedance} value={s.impedance} unit="Ω" digits={1} onChange={(v) => updateRoom((d) => void (d.levels.groups[g].impedance = v!))} lang={lang} min={LIMITS.impedance[0]} max={LIMITS.impedance[1]} />
                <NumberField id={`${g}-amp`} label={t.amp} value={s.amp} unit="W" digits={0} onChange={(v) => updateRoom((d) => void (d.levels.groups[g].amp = v!))} lang={lang} min={LIMITS.amp[0]} max={LIMITS.amp[1]} />
              </div>
            </fieldset>
          );
        })}
        <p class="hint">{t.groupHint} <a href={path('speakers', lang)}>{t.planner}</a></p>
        <RoomTools lang={lang} />
      </form>

      <section class="results" id="results" aria-live="polite" aria-atomic="false">
        <div class="hero">
          <span class="k">{m.speakers.layout} · {t.kTarget}</span>
          <div class="big">
            <span class="v">
              {fmtNum(r.target, 1, lang)}
              <small>dB</small>
            </span>
            <span class="alt" style={w ? { color: STATUS_COLOR[w.status] } : undefined}>
              {!w ? '' : w.status === 'ok' ? t.heroOk : w.status === 'warn' ? t.heroWarn(w.id, db(w.reserve)) : t.heroBad(w.id, db(-w.reserve))}
            </span>
          </div>
          <p class="hint" style={{ margin: 0 }}>
            {fmtNum(m.levels.calSpl, 1, lang)} dB + 20 dB · Dolby {DOLBY_CAL_RANGE.min}–{DOLBY_CAL_RANGE.max} dB
          </p>
        </div>

        <figure class="chart">
          <h2>{t.tableTitle}</h2>
          <div class="tbl-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>{t.thSpk}</th>
                  <th>{t.thGroup}</th>
                  <th>{t.thDist}</th>
                  <th>{t.thNeed}</th>
                  <th>{t.thMax}</th>
                  <th>{t.thReserve}</th>
                </tr>
              </thead>
              <tbody>
                {r.rows.map((x) => (
                  <tr key={x.id}>
                    <td><b>{x.id}</b> <span style={{ color: 'var(--muted)' }}>{ts.names[x.id as SpeakerId]}</span></td>
                    <td>{t.groups[x.group]}</td>
                    <td class="num">{fmtLength(x.distance, u, lang)}</td>
                    <td class="num">{watts(x.required)}</td>
                    <td class="num">{db(x.maxSpl)}</td>
                    <td class="num" style={{ color: STATUS_COLOR[x.status] }}>
                      {STATUS_ICON[x.status]} {db(x.reserve, true)} · {t.status[x.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="sub">{t.tableNote}</p>
        </figure>
      </section>
    </div>
  );
}
