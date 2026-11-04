# Plan My Cinema – Projektplan

Domain: plan-my-cinema.com (gekauft). Schwesterprojekt: rate-my-throne.com.
Stand: 2026-11-04.

## Ziel
Zweisprachige Website (DE zuerst, EN zweitrangig) mit Heimkino-Rechnern auf einem **gemeinsamen Raummodell**. Statisch, PWA, später ggf. als App mit Capacitor. Einnahmen später über Affiliate (Amazon, Thomann), eventuell Werbung.

## Abgrenzung zur Konkurrenz
- theatercalc.com (gesichtet am 2026-11-04): nur Englisch, imperial, jeder Rechner hat eigene Eingaben, Helligkeit als „benötigte Lumen“ mit Ziel-fL, Atmos-Rechner nur für Deckenpositionen .2/.4, viel Amazon-Affiliate und Kaufberatung.
- cinemaconfig.com: aus der Arbeitsumgebung nicht erreichbar, noch **nicht gesichtet**.
- Unser Ansatz: Raum einmal eingeben, alle Rechner nutzen ihn. Deutsch zuerst, metrisch. Tiefe für Enthusiasten: nits/fL, AT-Verlust, Zoom vs. Linse, Lens Shift, Moden mit Sub-Positionen.

## Technik (Versionen geprüft am 2026-11-04)
| Werkzeug | Version | Zweck |
|---|---|---|
| Astro | 7.4.5 | statische Seiten, i18n-Routing `/de/…`, `/en/…` |
| Preact + @preact/signals | 11.1.1 / 2.11.4 | interaktive Inseln, gemeinsamer Raum-Store |
| TypeScript | 6.0.3 | 7.x wird von @astrojs/check (0.9.12) noch nicht unterstützt |
| Vitest | 5.1.0 | Tests der Rechenlogik |
| eigener Service Worker | – | `scripts/build-sw.mjs` erzeugt `dist/sw.js` mit inhaltsbasierter Cache-Version (ersetzt @vite-pwa/astro 2.0.0: erst 4 Tage alt, zusätzliche Peer-Abhängigkeiten, 10 Audit-Warnungen) |
| @astrojs/sitemap | 3.7.4 | Sitemap mit hreflang |
| @fontsource/* | 5.3.0 | Schriften selbst gehostet (kein Google-Fonts-Abruf, DSGVO) |
| Node | ≥ 22.23.4 | von Astro 7.4 vorausgesetzt |
Hosting: Cloudflare (Pages oder Workers Static Assets, wird vor dem Deploy geprüft).

## Architektur
- `src/lib/` – reine Rechenfunktionen ohne DOM (screen, room, storage, projectors, units), mit Vitest-Tests.
- `scripts/build-sw.mjs` + `scripts/sw-template.js` – Service Worker (Seiten: Netz zuerst, Assets: Cache zuerst)
- `src/state/room.ts` – Raummodell als Preact-Signal, wird in localStorage gespeichert (try/catch), Teilen-Link `#r=…`, Export/Import als JSON.
- `src/components/` – Inseln (Rechner, Draufsicht, Seitenansicht, Eingabefelder).
- `src/i18n/` – Texte DE/EN, Routenzuordnung mit übersetzten Slugs.
- `data/projectors.json` – eigene, von Hand gepflegte Projektordaten (Schema in `data/projectors.schema.json`), keine fremden Datenbanken.
- `data/speaker-guidelines.json` + `docs/dolby-lautsprecherwinkel.md` – Dolby-Werte mit Quellen.

## Meilensteine
**M1 – Gerüst + Rechner 1 „Leinwand & Projektion“** (fertig, lokal lauffähig, 2026-11-04)
- Astro-Projekt, i18n DE/EN mit übersetzten Slugs, Sprachweiche auf `/`
- Raummodell v1 + Speicherung, Teilen-Link, Export/Import
- Rechner 1: Seitenverhältnis, Breite oder Diagonale (cm/Zoll), Gain, AT-Verlust, Lumen, Throw Ratio, Zoom/Linse, Lens Shift V/H, Projektorhöhe, Sitzabstand
- Ausgaben: Maße, nits/fL mit Ampel, Abstände, Blickwinkel, SMPTE/THX-Abstände, Shift-Prüfung, Raum-Plausibilität
- Draufsicht + Seitenansicht maßstäblich (SVG)
- Projektorauswahl aus JSON (3 Beispiele), Hinweis Datenblatt-Lumen
- Einheiten metrisch/imperial umschaltbar
- Erklärtext DE/EN, Meta, hreflang, Sitemap, JSON-LD (WebApplication + FAQ)
- Impressum/Datenschutz als Platzhalter, Affiliate-Link-Komponente
- PWA-Grundlage (Manifest, Service Worker, Icons) – offline geprüft
- Tests der Rechenlogik

**M2 – Rechner 2 „Raummoden“**
- axiale, tangentiale, oblique Moden bis 300 Hz, c aus Temperatur
- Modendichte, Druckverteilung der axialen Moden am Sitz
- Sub-Positionen im Raummodell: welche Moden ein Sub anregt und welche am Sitz ankommen
- Multi-Sub-Hinweise

**M3 – Rechner 3 „Lautsprecher-Planer“ (Dolby Atmos 5.1–9.1.6)**
- Voraussetzung: Freigabe der Dolby-Tabelle (`docs/dolby-lautsprecherwinkel.md`)
- Draufsicht + Seitenansicht, Winkel zum MLP, Ampel

**M4 – Veröffentlichung**
- Deploy Cloudflare, Domain, Search Console, Lighthouse/Barrierefreiheit-Prüfung
- Inhalte überarbeiten, Affiliate-Partnerprogramme

**Später:** zweite Sitzreihe mit Podest, mehrere Raumvarianten, Capacitor-App, ggf. DTS:X.

## Offene Entscheidungen
- Logo: Vorschläge A/B/C in `docs/logo-vorschlaege/` (Platzhalter bis zur Wahl: B)
- Dolby-Widersprüche (L/R 22–30° vs. 22–40°, Surround 5.1 vs. 5.1.x) – Vorschlag in der Dolby-Datei
- GitHub-Repo `plan-my-cinema` (privat) muss noch angelegt werden
- Analytics: vorerst keine
