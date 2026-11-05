/** Seiten mit übersetzten Slugs. Schlüssel = interne Seiten-ID. */
import type { Lang } from '../lib/format';

export const LANGS: Lang[] = ['de', 'en'];
export const DEFAULT_LANG: Lang = 'de';

export const ROUTES = {
  home: { de: '/de/', en: '/en/' },
  screen: { de: '/de/leinwand-projektion/', en: '/en/screen-projection/' },
  modes: { de: '/de/raummoden/', en: '/en/room-modes/' },
  imprint: { de: '/de/impressum/', en: '/en/legal-notice/' },
  privacy: { de: '/de/datenschutz/', en: '/en/privacy/' },
} as const satisfies Record<string, Record<Lang, string>>;

export type PageId = keyof typeof ROUTES;

export const path = (id: PageId, lang: Lang): string => ROUTES[id][lang];
