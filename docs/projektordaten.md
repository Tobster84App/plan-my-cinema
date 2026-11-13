# Projektordaten – Regeln und Stand

Datei: `data/projectors.json` (Schema: `data/projectors.schema.json`). Stand: 2026-11-09.

## Grundsätze
- Nur Hersteller-Websites bzw. -Datenblätter, keine Sammeldatenbanken (projektoren-datenbank.com, projectorcentral.com, projector-database.com u. ä.).
- Jeder Eintrag hat `source` (Hersteller-URL) und `asOf` (Abrufdatum).
- Seiten werden einzeln und mit Pause abgerufen; kein Umgehen von Bot-Schutz oder Sperren (Sony-Produktseiten sperren automatische Abrufe; die Sony-Hilfe helpguide.sony.net ist erreichbar).
- Unklare oder widersprüchliche Angaben werden **nicht** geschätzt: Feld `null` + Originalangabe in `statedThrowRatio`/`statedLensShift`, oder Modell ausgelassen.

## Übernahmeregeln
| Herstellerangabe | Übernahme |
|---|---|
| Projektionsverhältnis „1,35 – 2,84:1“, optischer Zoom | min 1,35 / max 2,84 |
| Projektionsverhältnis mit **Digitalzoom** (z. B. „1,27 – 2,54:1“, Zoom „Digital“) | min = max = 1,27 (optisch fest), Originalangabe in `statedThrowRatio` |
| Fest (kein Zoom) | min = max |
| Lens Shift „±60 %“ | oben = unten = 60 |
| Lens Shift nur vertikal angegeben | horizontal `null` |
| Kein Lens Shift genannt | alle `null` (unbekannt), Hinweis im UI |
| Uneindeutig („0 %–60 %“, „40 %~60 %“, „+10 %“, „… @ 20,9 % V“) | `null`, Originalangabe in `statedLensShift` |
| Lumen | Weißhelligkeit nach ISO 21118 (Epson) bzw. ANSI (BenQ), Norm in `lumensStandard` |
| Farbvarianten mit identischen Daten (B/W …) | ein Eintrag, Modelle mit „ / “ |

## Stand 2026-11-05
Gesamt: **106 Modelle** (Stand 2026-11-09).

- **Epson** (www.epson.de, Kategorie Heimkino): 39 Artikel → 29 Einträge.
- **BenQ** (www.benq.eu/de-de, Cinema/Gaming/Portable, je `/spec.html`): 23 Seiten → 21 Einträge.
- Ausgelassen:
  - BenQ **TH575** – Seitentitel nennt TH585P, Zuordnung unklar.
  - BenQ **W5850** – Projektionsverhältnis „Recommended: 1.0~1.5, Max: 1.0~1.6“ wirkt wie Zoomfaktor, nicht plausibel.
- **JVC** (de.jvc.com/projektoren/d-ila-projektor/…): 7 Einträge (NZ500/700/7/8/800/9/900). Ausgelassen: **DLA-NP5** (kein Projektionsverhältnis auf der Seite).
- **Valerion** (www.valerion.com, Vergleichstabelle): VisionMaster Max, Pro 2, Pro. Plus/Plus 2 ausgelassen (keine Lumenangabe gefunden).
- **LG** (www.lg.com/de/beamer/…, eingebettete Datentabelle): HU810PW, HU915QE, HU715QW, PU615U. Ausgelassen: **HU710PB** (keine Daten auf der Seite). HU715QW: Seite nennt widersprüchlich 0,22 und „1,6x optisch“.
- **Optoma**: Produktseiten nur per JavaScript; Werte aus dem Optoma-**Abstandsrechner** (www.optoma.de/service-and-support/distancecalculator). Bewusst nur UHZ- und CinemaX-Modelle mit vollständigen Werten (13), nicht der ganze Rechner-Datenbestand (~980 Modelle). Lens Shift dort nicht angegeben → `null`.
- **XGIMI** (de.xgimi.com/products/…, 2026-11-06): 18 Einträge. Vertikaler Lens Shift der Horizon-20-Reihe („±120 %“, Standardposition 100 %, +20 %/−120 %) folgt einer anderen Zählweise → vertikal `null`, Originaltext in `statedLensShift`; horizontal ±45 % übernommen. Kleine Geräte ohne optischen Zoom als `digital`.
- **Dangbei** (de.dangbei.com/products/…, 2026-11-06): 6 Einträge (DBOX02, DBOX02 Pro, MP1 Max, Atom, Freedo, N2 mini), alle mit festem Projektionsverhältnis und elektronischem Zoom. Ausgelassen: **N3 Max** (Seitentitel 1.000 ISO-Lumen, Datentabelle 2.000), Mars 4K und Neo (Seite 404).
- **Sony** (2026-11-09): 5 Einträge (VPL-XW5000ES, XW5100, XW6100, XW7000ES, XW8100). XW7000ES: Lumen (3.200 lm), Projektionsverhältnis und Shift von der Sony-Produktseite pro.sony (Screenshot des Inhabers; pro.sony ist aus der Arbeitsumgebung nicht erreichbar), bestätigt die Werte der Sony-Hilfe. Projektionsabstand und Lens Shift aus der Sony-Hilfe (helpguide.sony.net, „Projektionsentfernung“), Projektionsverhältnis aus Sonys Formel für 100 Zoll 16:9. **Lens Shift umgerechnet:** Sony zählt 100 % = Objektivachse am Bildrand (halbe Bildhöhe), der Rechner % der ganzen Bildhöhe → Sony-Wert ÷ 2, Originalangabe in `statedLensShift`. **Lumen** stehen nicht in der Sony-Hilfe → Händlerangabe von visunext.de (Inhaber-Freigabe für Händlerseiten), Norm wie vom Händler genannt. Beim XW8100 vertauscht visunext horizontalen und vertikalen Shift – deshalb Shift nur aus der Sony-Hilfe. visunext `/search` ist per robots.txt gesperrt → Produktseiten über die Sitemap gefunden.
  - Ausgelassen: ältere VW-Modelle (keine Hilfe-Seite gefunden).
  - **JVC geprüft (2026-11-13):** Bedienungsanleitung DLA-NZ9/NZ8/NZ7/NP5 (B5A-3961-44, S. 30, manuals.jvckenwood.com): „Bis etwa 100 % [NZ9] und 80 % [NZ8/NZ7/NP5] des projizierten Bilds“ (Bild 16:9) vertikal, 43 % / 34 % horizontal → Bezug ganze Bildhöhe/-breite, wie im Rechner; gespeicherte JVC-Werte unverändert richtig. Gleiches Diagramm in B5A-4578-14 (NZ900) und B5A-4685-04 (NZ700).
  - Offen: Bezug bei Epson, BenQ, XGIMI, LG, Valerion nicht geprüft.
- Nicht erreichbar: Hisense (www.hisense.de antwortet mit Serverfehler 502).
