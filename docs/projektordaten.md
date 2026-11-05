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
- **Epson** (www.epson.de, Kategorie Heimkino): 39 Artikel → 29 Einträge.
- **BenQ** (www.benq.eu/de-de, Cinema/Gaming/Portable, je `/spec.html`): 23 Seiten → 21 Einträge.
- Ausgelassen:
  - BenQ **TH575** – Seitentitel nennt TH585P, Zuordnung unklar.
  - BenQ **W5850** – Projektionsverhältnis „Recommended: 1.0~1.5, Max: 1.0~1.6“ wirkt wie Zoomfaktor, nicht plausibel.
- Noch nicht erreichbar / offen: JVC (de.jvc.com), Sony (sperrt automatische Abrufe), Optoma, XGIMI, Valerion, Hisense, LG, Dangbei.
