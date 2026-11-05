# Projektordaten – Regeln und Stand

Datei: `data/projectors.json` (Schema: `data/projectors.schema.json`). Stand: 2026-11-05.

## Grundsätze
- Nur Hersteller-Websites bzw. -Datenblätter, keine Sammeldatenbanken (projektoren-datenbank.com, projectorcentral.com, projector-database.com u. ä.).
- Jeder Eintrag hat `source` (Hersteller-URL) und `asOf` (Abrufdatum).
- Seiten werden einzeln und mit Pause abgerufen; kein Umgehen von Bot-Schutz oder Sperren (Sony sperrt automatische Abrufe → nur per PDF).
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
Gesamt: **77 Modelle**.

- **Epson** (www.epson.de, Kategorie Heimkino): 39 Artikel → 29 Einträge.
- **BenQ** (www.benq.eu/de-de, Cinema/Gaming/Portable, je `/spec.html`): 23 Seiten → 21 Einträge.
- Ausgelassen:
  - BenQ **TH575** – Seitentitel nennt TH585P, Zuordnung unklar.
  - BenQ **W5850** – Projektionsverhältnis „Recommended: 1.0~1.5, Max: 1.0~1.6“ wirkt wie Zoomfaktor, nicht plausibel.
- **JVC** (de.jvc.com/projektoren/d-ila-projektor/…): 7 Einträge (NZ500/700/7/8/800/9/900). Ausgelassen: **DLA-NP5** (kein Projektionsverhältnis auf der Seite).
- **Valerion** (www.valerion.com, Vergleichstabelle): VisionMaster Max, Pro 2, Pro. Plus/Plus 2 ausgelassen (keine Lumenangabe gefunden).
- **LG** (www.lg.com/de/beamer/…, eingebettete Datentabelle): HU810PW, HU915QE, HU715QW, PU615U. Ausgelassen: **HU710PB** (keine Daten auf der Seite). HU715QW: Seite nennt widersprüchlich 0,22 und „1,6x optisch“.
- **Optoma**: Produktseiten nur per JavaScript; Werte aus dem Optoma-**Abstandsrechner** (www.optoma.de/service-and-support/distancecalculator). Bewusst nur UHZ- und CinemaX-Modelle mit vollständigen Werten (13), nicht der ganze Rechner-Datenbestand (~980 Modelle). Lens Shift dort nicht angegeben → `null`.
- Nicht erreichbar: XGIMI (de./www.xgimi.com), Hisense (www.hisense.de), Dangbei (de.dangbei.com; www.dangbei.com ist die chinesische Seite). Sony sperrt automatische Abrufe → nur per PDF.
