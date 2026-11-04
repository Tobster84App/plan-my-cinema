import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { ROUTES } from './src/i18n/routes';

const SITE = 'https://plan-my-cinema.com';
const NOINDEX = new Set(['imprint', 'privacy']);

/** URL → Sprachvarianten (übersetzte Slugs), für hreflang in der Sitemap. */
const alternates = new Map<string, { lang: string; url: string }[]>();
for (const [id, langs] of Object.entries(ROUTES)) {
  if (NOINDEX.has(id)) continue;
  const links = Object.entries(langs).map(([lang, p]) => ({ lang, url: SITE + p }));
  links.push({ lang: 'x-default', url: SITE + langs.de });
  for (const p of Object.values(langs)) alternates.set(SITE + p, links);
}

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  i18n: {
    locales: ['de', 'en'],
    defaultLocale: 'de',
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  integrations: [
    preact(),
    sitemap({
      filter: (page) => alternates.has(page),
      serialize: (item) => ({ ...item, links: alternates.get(item.url) }),
    }),
  ],
});
