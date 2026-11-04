# Plan My Cinema

Heimkino-Rechner (DE/EN) auf einem gemeinsamen Raummodell. Statische Astro-Seite mit Preact-Inseln, PWA, keine Server-Logik.

```bash
npm install
npm run dev      # http://localhost:4321/de/
npm test
npm run build && npm run preview
```

- Rechenlogik: `src/lib/` (Tests in `tests/`)
- Projektordaten: `data/projectors.json` (Schema: `data/projectors.schema.json`)
- Dolby-Werte (Entwurf): `docs/dolby-lautsprecherwinkel.md`
- Plan und Meilensteine: `PROJEKTPLAN.md`
