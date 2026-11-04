# CLAUDE.md – Plan My Cinema

Heimkino-Rechner (DE/EN) auf plan-my-cinema.com. Projektplan: `PROJEKTPLAN.md`.

## Arbeitsweise
- Deutsch als Hauptsprache, Inhalte zuerst DE schreiben, EN eigenständig (nicht wörtlich übersetzt).
- Keine Werte zu Normen/Grenzwerten aus Modellwissen: Quelle nennen oder Unsicherheit kennzeichnen.
- Kleine, nachvollziehbare Commits. Nach jedem Meilenstein kurz: fertig / offen.
- Versionen von Werkzeugen vor Updates mit `npm view` prüfen.

## Technik
- Astro 7 + Preact-Inseln + @preact/signals, TypeScript 6 (TS 7 noch nicht mit @astrojs/check kompatibel).
- Rechenlogik nur in `src/lib/` als reine Funktionen, jede Formel mit Vitest-Test (Sollwerte von Hand gerechnet, im Testkommentar).
- Intern alles in SI (m, cd/m²). Anzeige metrisch oder imperial über `src/lib/format.ts`.
- Raummodell: `src/lib/room.ts` (Typ, Standardwerte, `sanitizeRoom`). Änderungen am Format → `ROOM_MODEL_VERSION` erhöhen und `migrate()` ergänzen.
- Browser-Speicher nur über `src/lib/storage.ts` (try/catch). Keine Cookies, kein Tracking.
- Schriften lokal über @fontsource, keine CDNs, kein Google Fonts.
- Projektordaten nur von Hand aus Hersteller-Datenblättern (`data/projectors.json`), kein Scraping (§ 87b UrhG).

## Befehle
- `npm run dev` – Entwicklungsserver
- `npm test` – Tests
- `npm run check` – Typprüfung
- `npm run build` – statischer Build nach `dist/`

## Google-Drive-Kopie
Ordner „Plan My Cinema“: nur Dokumente (PROJEKTPLAN.md, CLAUDE.md, Dolby-Tabelle, Logo-Vorschau, später Verträge) nach Änderungen aktualisieren, alte Versionen in den Papierkorb. Code nicht im Drive – Sicherung über GitHub.
