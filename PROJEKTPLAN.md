# Plan My Cinema – Projektplan

Domain: plan-my-cinema.com (gekauft). Schwesterprojekt: rate-my-throne.com.
Stand: 2026-11-13.

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
Hosting: ALL-INKL (Tarif PrivatPlus, Server in Deutschland, AVV vorhanden). Deploy per GitHub Action über FTPS (`.github/workflows/deploy.yml`), Header/Weiterleitungen in `public/.htaccess`.

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

**M2 – Rechner 2 „Raummoden“** (fertig, 2026-11-05)
- axiale, tangentiale, oblique Moden bis 300 Hz, c aus Temperatur (c = 331,3 · √(1 + T/273,15))
- Modendichte (10-Hz-Bänder), Druckverteilung der axialen Moden je Raumrichtung mit Sitz und Subs
- Raummodell v2: bis zu 4 Subs (Position ab Stirnwand/linker Wand/Boden), Lufttemperatur; Migration v1 → v2
- Modenspektrum am Sitz: Anregung durch Subs × Modenform am Sitz (vereinfacht, ohne Dämpfung)
- Schnellauswahl Sub-Anordnungen (1 Ecke, 1 Mitte, 2 vorn/hinten, 4 Wandmitten, 4 Ecken), Hinweise (Knoten/Bauch, Modenhäufungen, Auslöschung)
- Diagrammfarben mit Validator geprüft (dunkler Hintergrund, Farbsehschwäche)
- Quelle Multi-Sub: Welti, „How Many Subwoofers are Enough?“, AES 112th Convention 2002 (Volltext nicht gelesen)

**M3 – Rechner 3 „Lautsprecher-Planer“ (Dolby Atmos 5.1–9.1.6)** (fertig, 2026-11-05)
- Werte aus freigegebener Dolby-Tabelle (`data/speaker-guidelines.json`)
- Raummodell v3: Layout, Höhe der Ohrhöhen-Lautsprecher, von Hand verschobene Lautsprecher (übrige automatisch)
- Automatische Platzierung: Mitte des Dolby-Bereichs, Strahl vom MLP bis zur Wand (15 cm Abstand); Overheads an der Decke, seitlich wie L/R bei 30°
- Azimut (Draufsicht) und Elevation (Seitenansicht) zum MLP, Ampel: Grün im Bereich, Gelb bis 10° außerhalb bzw. L/R 30–40°, Rot darüber (10° = eigene Festlegung)
- Zusatzprüfungen: hintere Höhe ≤ 1,25 × Front, Overheads 2–3 × Ohrhöhen-Lautsprecher, Abstandsunterschiede zum MLP
- Draufsicht + Seitenansicht maßstäblich, Tabelle mit Verschieben/Zurücksetzen
- Korrektur: Draufsichten (auch Rechner 1) waren seitlich gespiegelt

**M3b – Sitzreihen, Sichtlinie, Erstreflexionen** (fertig, 2026-11-07)
- Raummodell v5: 1–3 Reihen, 1–6 Plätze je Reihe, Platz-/Reihenabstand, Podesthöhe je Reihe; MLP = mittlerer Platz Reihe 1
- Bewertung der Lautsprecherwinkel je Platz, Platzwahl, Spalte „alle Plätze“ (schlechteste Bewertung)
- Sichtlinie: C-Wert zur Bildunterkante, Richtwerte 12 cm optimal / 6 cm Minimum (keine verbindliche Norm gefunden), nötige Augenhöhe für 12 cm
- Erstreflexionen L/C/R/Wides an Seitenwänden, Decke, Boden (Spiegelquellen) mit Umweg, in Drauf- und Seitenansicht markiert

**M3c – Plätze verschieben, Reflexionen erweitert** (fertig, 2026-11-09)
- Raummodell v6: einzelne Plätze von Hand verschieben (x/y, Höhe bleibt die der Reihe), MLP nur über Hauptsitzplatz
- Sichtlinie je Platz (Person davor = nächster Platz der vorderen Reihe), Anzeige des ungünstigsten Platzes je Reihe
- Reflexionen aller Lautsprecher an allen 6 Flächen (inkl. Stirn-/Rückwand); ausgelassen, wenn der Lautsprecher < 30 cm vor der Fläche hängt (eigene Festlegung)
- Absorberbereich = Fläche, die die Reflexionspunkte aller Plätze abdeckt; Auswahl nach Fläche und Kanal, Bereiche in Drauf- und Seitenansicht

**M3d – Bass je Sitzplatz (Rechner 2)** (fertig, 2026-11-09)
- Sitzreihen auch im Raummoden-Rechner (gemeinsame Komponente), Spektrum/Hinweise/Druckverteilung für den gewählten Platz
- Gleichmäßigkeit: je Mode bis 120 Hz Spanne zwischen stärkstem und schwächstem Platz (Untergrenze −30 dB), Hervorhebung ab 10 dB (eigene Festlegungen)
- Sub-Schnellauswahl zeigt den mittleren Platzunterschied je Anordnung
- Projektordaten: Sony XW5000ES/5100/6100/7000ES/8100 (106 Modelle); Lens Shift Sony auf ganze Bildhöhe umgerechnet

**M3e – SBA/DBA (Rechner 2)** (fertig, 2026-11-09)
- Raummodell v7: Bass-System `free` (einzelne Subs) / `sba` / `dba`, Raster Spalten × Reihen (1–4 × 1–3), Wandabstand
- Raster p = (2n + 1) · w / (2a), Grenzfrequenz f = c / (2d) (Wikipedia „Double bass array“, abgerufen 2026-11-09); DBA-Rückwand verpolt, Verzögerung = Raumlänge ÷ c (D. Schmelzer, Nubert, 31.01.2005; Wikipedia). CABS: Celestinos & Nielsen, JAES 56, 2008, nicht gelesen
- Korrektur 2026-11-09: Verzögerung war zuerst Abstand der Arrays ÷ c (falsch) → Raumlänge ÷ c; damit löscht das DBA im Modell die Längsmoden unabhängig vom Wandabstand
- Kopplung komplex: Σ g·ψ·e^(−i2πfτ), normiert auf unverzögerte Subs
- Neue Kennzahl „mittlere Modenstärke an den Plätzen“ (Energiemittel bis 120 Hz), weil DBA die Platzunterschiede kaum, die Modenstärke aber deutlich ändert
- Modell ideal (starre Wände, leerer Quader): DBA löscht alle Moden bis 120 Hz; reale Einschränkungen (Möbel, Türen, nachgiebige Wände) laut Wikipedia nur als Hinweis
- Sub-Schnellauswahl zeigt zusätzlich die mittlere Modenstärke

**M4 – Veröffentlichung**
- Deploy ALL-INKL, Domain, Search Console, Lighthouse/Barrierefreiheit-Prüfung
- Inhalte überarbeiten, Affiliate-Partnerprogramme

**Später:** mehrere Raumvarianten, Capacitor-App, ggf. DTS:X.

## Entscheidungen
- 2026-11-13: Seite „Über das Projekt“ (`/de/ueber-das-projekt/`, `/en/about/`) + Abschnitt auf der Startseite; Kontaktadresse für Fragen in `src/config/site.ts` (`CONTACT_EMAIL`) = info@plan-my-cinema.com (bestehendes Postfach); Text vom Inhaber freigegeben, persönliche Angaben (Name, Kino-Eckdaten, Foto) vorerst nicht
- 2026-11-05: Projektordaten aus Hersteller-Websites (Epson, BenQ: 50 Modelle), Lens Shift getrennt oben/unten/links/rechts (Raummodell v4); Regeln in `docs/projektordaten.md`
- 2026-11-05: Sicherung über Google Apps Script (`scripts/drive-upload.gs`), erster Deploy mit Sicherung erfolgreich; Seite läuft auf plan-my-cinema.com
- 2026-11-05: Einheiten-Umschalter beschriftet (m · cm / ft · in)
- 2026-11-05: Subwoofer bleiben unabhängig von Lautsprechern (eigene Liste im Raummodell)
- 2026-11-04: Sicherung bei jedem Deploy ins Google Drive (Serverstand vorher + neue Version), Upload nur nach erfolgreicher Sicherung
- 2026-11-04: Deploy ohne Löschen, nur manuell, nur mit Markierungsdatei im Ziel (nach Löschvorfall beim ersten Upload)
- 2026-11-04: Hosting und Postfach bei ALL-INKL (PrivatPlus)
- 2026-11-04: Logo B „Grundriss & Blickwinkel“ (`public/favicon.svg`)
- 2026-11-04: Dolby-Tabelle freigegeben, Widersprüche wie vorgeschlagen aufgelöst
- Normangaben: 14 fL = SMPTE ST 431-1 (48 cd/m²); 30° = SMPTE EG 18-1994 (2003 zurückgezogen); THX 36° vom entferntesten Sitz, THX-TV-Regel 0,835 ≈ 40°

## Offen
- Speicherdauer/Anonymisierung der Server-Logfiles bei ALL-INKL prüfen und in Datenschutzerklärung eintragen
- Projektordaten: Hisense (502); Definition des Lens Shift bei Epson/JVC/BenQ/XGIMI/LG/Valerion ungeprüft (manuals.jvckenwood.com gesperrt, files.support.epson.com 403, Handbuch-Links bei Epson/BenQ nicht gefunden)
- Analytics: vorerst keine
