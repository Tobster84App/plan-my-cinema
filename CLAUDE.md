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
- `npm run build` – statischer Build nach `dist/` inkl. `dist/sw.js`
- `npm run preview` – Build lokal ansehen (Service Worker nur hier aktiv, nicht in `dev`)

## Hosting
ALL-INKL (PrivatPlus). Manueller Start (Actions → Deploy) → GitHub Action baut, testet und spiegelt `dist/` per FTPS (ohne Löschen, nur mit Markierungsdatei `.plan-my-cinema-deploy` im Ziel) ins Website-Verzeichnis, vorher Sicherung ins Google Drive. Server-Konfiguration in `public/.htaccess`.

## Google-Drive-Kopie
Ordner „Plan My Cinema“: Dokumente (PROJEKTPLAN.md, CLAUDE.md, Dolby-Tabelle, Logo-Vorschau, später Verträge) nach Änderungen aktualisieren, alte Versionen in den Papierkorb. Quellcode liegt auf GitHub.

**Sicherungen (Wunsch des Inhabers, immer):** Jeder Deploy legt vor dem Upload zwei ZIPs in „Plan My Cinema/Sicherungen“ ab: `server_<Datum>_<Commit>.zip` (Serverstand vorher) und `neu_<Datum>_<Commit>.zip` (hochgeladene Version). Ohne erfolgreiche Sicherung kein Upload. Empfänger ist ein Google Apps Script im Konto des Inhabers (`scripts/drive-upload.gs`), Adresse fest im Workflow, Schlüssel im Secret `DRIVE_UPLOAD_KEY`.
