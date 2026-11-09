/** Eingabe der Sitzreihen (gemeinsames Raummodell) – genutzt von Lautsprecher-Planer und Raummoden. */
import { SPEAKERS_UI } from '../i18n/speakers-ui';
import type { Lang } from '../lib/format';
import { LIMITS } from '../lib/room';
import { room, units, updateRoom } from '../state/room';
import { NumberField } from './NumberField';

export function SeatingFields({ lang }: { lang: Lang }) {
  const t = SPEAKERS_UI[lang];
  const m = room.value;
  const u = units.value;
  return (
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
  );
}
