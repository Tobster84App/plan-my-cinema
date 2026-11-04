/** Umschalter metrisch/imperial im Seitenkopf. */
import { useEffect } from 'preact/hooks';
import { UI } from '../i18n/ui';
import type { Lang } from '../lib/format';
import { initBrowserState, units } from '../state/room';

export default function UnitSwitch({ lang }: { lang: Lang }) {
  const t = UI[lang];
  useEffect(() => initBrowserState(), []);
  return (
    <div class="switch" role="group" aria-label={t.unitsLabel}>
      <button type="button" aria-pressed={units.value === 'metric'} onClick={() => (units.value = 'metric')}>m</button>
      <button type="button" aria-pressed={units.value === 'imperial'} onClick={() => (units.value = 'imperial')}>ft</button>
    </div>
  );
}
