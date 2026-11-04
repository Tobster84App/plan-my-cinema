/** Zahlenfeld mit Dezimalkomma, Einheitenumrechnung und lokalem Bearbeitungszustand. */
import { useEffect, useState } from 'preact/hooks';
import { fieldFactor, fmtNum, parseDecimal, type FieldUnit, type Lang } from '../lib/format';
import type { UnitSystem } from '../lib/units';

interface Props {
  id: string;
  label: string;
  /** Wert in SI-Einheit; null = leer */
  value: number | null;
  onChange: (v: number | null) => void;
  lang: Lang;
  units?: UnitSystem;
  kind?: FieldUnit;
  /** Einheitentext, falls kind = 'none' */
  unit?: string;
  digits?: number;
  /** Grenzen in SI-Einheit */
  min?: number;
  max?: number;
  nullable?: boolean;
  hint?: string;
}

export function NumberField({ id, label, value, onChange, lang, units = 'metric', kind = 'none', unit, digits = 2, min, max, nullable, hint }: Props) {
  const { factor, label: uLabel } = fieldFactor(kind, units);
  const d = kind === 'cm' && units === 'metric' ? 0 : kind === 'cm' ? 1 : digits;
  // ohne Tausendertrennzeichen, damit der Text wieder einlesbar ist
  const show = (v: number | null) => {
    if (v == null) return '';
    const s = (v / factor).toFixed(d);
    return lang === 'de' ? s.replace('.', ',') : s;
  };
  const [text, setText] = useState(show(value));
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(show(value));
      setInvalid(false);
    }
  }, [value, focused, units, lang]);

  const commit = (t: string) => {
    if (t.trim() === '' && nullable) {
      setInvalid(false);
      onChange(null);
      return;
    }
    const n = parseDecimal(t);
    if (!Number.isFinite(n)) {
      setInvalid(true);
      return;
    }
    const si = n * factor;
    const out = (min != null && si < min - 1e-9) || (max != null && si > max + 1e-9);
    setInvalid(out);
    if (!out) onChange(si);
  };

  const hintId = hint ? `${id}-h` : undefined;
  const rangeText =
    min != null && max != null ? `${fmtNum(min / factor, d, lang)} – ${fmtNum(max / factor, d, lang)} ${kind === 'none' ? unit ?? '' : uLabel}` : '';

  return (
    <div class="f">
      <label for={id}>{label}</label>
      <div class={`inp${invalid ? ' bad' : ''}`}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellcheck={false}
          value={text}
          aria-invalid={invalid}
          aria-describedby={hintId}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit(text);
          }}
          onInput={(e) => {
            const t = (e.target as HTMLInputElement).value;
            setText(t);
            commit(t);
          }}
        />
        <span class="u" aria-hidden="true">{kind === 'none' ? unit : uLabel}</span>
      </div>
      {invalid && rangeText && <p class="hint err" role="alert">{rangeText}</p>}
      {hint && <p class="hint" id={hintId}>{hint}</p>}
    </div>
  );
}
