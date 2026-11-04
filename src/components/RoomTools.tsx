/** Teilen-Link, Export/Import, Zurücksetzen. */
import { useState } from 'preact/hooks';
import { UI } from '../i18n/ui';
import type { Lang } from '../lib/format';
import { DEFAULT_ROOM } from '../lib/room';
import { encodeShare, exportRoomJson, importRoomJson, SHARE_PARAM } from '../lib/storage';
import { replaceRoom, room } from '../state/room';

export function RoomTools({ lang }: { lang: Lang }) {
  const t = UI[lang];
  const [msg, setMsg] = useState('');

  const share = async () => {
    const url = `${location.origin}${location.pathname}#${SHARE_PARAM}=${encodeShare(room.value)}`;
    try {
      await navigator.clipboard.writeText(url);
      setMsg(t.shareDone);
    } catch {
      try {
        history.replaceState(null, '', url);
      } catch {
        /* ignorieren */
      }
      setMsg(t.shareFail);
    }
  };

  const exportFile = () => {
    const blob = new Blob([exportRoomJson(room.value)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'plan-my-cinema-raum.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const res = importRoomJson(await file.text());
    if (res.ok) {
      replaceRoom(res.room);
      setMsg(t.importOk);
    } else setMsg(t.importErr);
  };

  return (
    <fieldset>
      <legend>{t.gManage}</legend>
      <div class="tools">
        <button type="button" class="btn" onClick={share}>{t.share}</button>
        <button type="button" class="btn" onClick={exportFile}>{t.export}</button>
        <label class="btn">
          {t.import}
          <input type="file" accept="application/json,.json" class="sr-only" onChange={importFile} />
        </label>
        <button
          type="button"
          class="btn ghost"
          onClick={() => {
            if (confirm(t.resetConfirm)) replaceRoom(DEFAULT_ROOM, true);
          }}
        >
          {t.reset}
        </button>
      </div>
      <p class="hint" role="status">{msg}</p>
    </fieldset>
  );
}
