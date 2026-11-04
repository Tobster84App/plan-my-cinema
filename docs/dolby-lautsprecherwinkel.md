# Dolby Atmos – Lautsprecherwinkel (Quellenauswertung)

Stand der Auswertung: 2026-11-04. Maschinenlesbar in `data/speaker-guidelines.json`.
Status: **ENTWURF – vom Projektinhaber freizugeben, bevor der Planer gebaut wird.**

## Quellen

| Kürzel | Dokument | Stand laut PDF-Metadaten | URL |
|---|---|---|---|
| G | Dolby Atmos Home Theater Installation Guidelines (r3.1, 60 S.) | Dez. 2018 | https://www.dolby.com/siteassets/technologies/dolby-atmos/atmos-installation-guidelines-121318_r3.1.pdf |
| S712 | Home Theater Speaker Guide 7.1.2 Overhead | März 2020 | https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.2-overhead-speaker-placement/7_1_2_overhead_speaker_setup.pdf |
| S714 | dto. 7.1.4 Overhead | März 2020 | https://www.dolby.com/siteassets/about/support/guide/setup-guides/7.1.4-overhead-speaker-placement/7_1_4_overhead_speaker_setup.pdf |
| S912 | dto. 9.1.2 Overhead | März 2020 | https://www.dolby.com/siteassets/about/support/guide/setup-guides/9.1.2-overhead-speaker-placement/9_1_2_overhead_speaker_setup.pdf |
| S914 | dto. 9.1.4 Overhead | März 2020 | https://www.dolby.com/siteassets/about/support/guide/setup-guides/9.1.4-overhead-speaker-placement/9_1_4_overhead_speaker_setup.pdf |
| S916 | dto. 9.1.6 Overhead | März 2020 | https://www.dolby.com/siteassets/about/support/guide/setup-guides/9.1.6-overhead-speaker-placement/9_1_6_overhead_speaker_setup.pdf |

Übersichtsseite: https://www.dolby.com/about/support/guide/speaker-setup-guides/

Ein neueres Dokument als G (2018) habe ich auf dolby.com nicht gefunden. Das heißt nicht, dass keins existiert.
Die Einzelblätter für 5.1, 5.1.x und 7.1 liefern unter dem erwarteten Pfad 404. Für diese Layouts stammen die Werte aus den Layout-Grafiken in G (S. 26–29 ff.).

## Konventionen

- **Azimut**: horizontaler Winkel vom Hauptsitzplatz (MLP), gemessen gegen die Linie MLP → Leinwandmitte (0°). Symmetrisch für links/rechts.
- **Elevation (Overhead)**: Winkel in der Seitenansicht, gemessen vom Ohr am MLP. 0° = waagerecht nach vorn, 90° = senkrecht über dem Kopf, 180° = waagerecht nach hinten (so beschriftet Dolby die Seitenansichten).

## Ohrhöhe (Listener Level)

| Kanal | Azimut ideal | Azimut-Bereich | Quelle | Anmerkung |
|---|---|---|---|---|
| C (Center) | 0° | – | G, alle Layout-Grafiken | |
| L/R | – | 22–30° | G S. 18–49 (alle Layout-Grafiken), S7xx/S9xx | **Widerspruch:** G Abb. 3 (S. 8) nennt „30° (22°–40°)“ |
| Lw/Rw (Wides) | – | 50–70° | G S. 47–49, S916 | nur 9.1.x |
| Ls/Rs bei 5.1 und 4.1 | – | 110–120° | G S. 22, 24, 26 | |
| Ls/Rs bei 5.1.2 / 5.1.4 | – | 90–110° | G S. 27, 29 | **Widerspruch** zu 5.1 (110–120°) im selben Dokument |
| Ls/Rs bei 7.1.x / 9.1.x | – | 90–110° | G, S7xx, S9xx | |
| Lrs/Rrs | – | 135–150° | G, S7xx, S9xx | nur 7.1.x / 9.1.x |

Höhen (G S. 6 und Abb. 2):
- Alle Ohrhöhen-Lautsprecher auf gleicher Höhe, typisch ca. 1,2 m (Ohrhöhe sitzend nach ITU-R BS.1116-1).
- Hintere Lautsprecher dürfen höher hängen, aber höchstens 1,25 × die Höhe der Front-Lautsprecher.
- Alle Ohrhöhen-Lautsprecher möglichst gleich weit vom MLP entfernt, sonst Laufzeitkorrektur im AVR.

## Overhead (Deckenlautsprecher)

| Kanal | Elevation ideal | Bereich | Layouts | Quelle |
|---|---|---|---|---|
| Ltm/Rtm (Top Middle) bei .2 | 80° | 65–100° | 5.1.2, 7.1.2, 9.1.2 | S712, S912 |
| Ltf/Rtf (Top Front) bei .4/.6 | 45° | 30–55° | 5.1.4, 7.1.4, 9.1.4, 9.1.6 | G S. 7 + Abb. 2, S714, S914, S916 |
| Ltm/Rtm (Top Middle) bei .6 | 90° | 70–110° | 9.1.6 (7.1.6) | S916 |
| Ltr/Rtr (Top Rear) bei .4/.6 | 135° | 125–150° | 5.1.4, 7.1.4, 9.1.4, 9.1.6 | G Abb. 2 (als „45°, 30–55°“ von hinten), S714, S914, S916 |

Beachte: Abb. 2 in G nennt für Top Rear 30–55° von hinten gemessen, also 125–150° in Dolby-Zählung von vorn. Die Einzelblätter zeigen 125°/135°/150°. Das passt zusammen.

Weitere Overhead-Vorgaben (G S. 7):
- Montagehöhe H3 zwischen 2× und 3× der Höhe der Ohrhöhen-Lautsprecher (H1 ≈ 1,2 m → ca. 2,4–3,6 m).
- Seitlicher Abstand der Overhead-Paare ≈ Abstand von L/R bei ±30°, entspricht etwa 0,5–0,7 × Breite des Gesamtlayouts.
- Overhead-Anordnung von vorn nach hinten über dem Hörbereich zentrieren.
- Breit abstrahlende Lautsprecher (ca. ±45° zwischen 100 Hz und 10 kHz) dürfen senkrecht nach unten zeigen, sonst auf den MLP ausrichten.

Zu Dolby-Atmos-enabled-Aufsatzlautsprechern (G S. 11–12, nur Hinweis, nicht im Planer):
- Decke flach, Höhe 2,3–3,66 m.
- Aufstellung auf oder knapp über Ohrhöhe, nicht höher als die halbe Wandhöhe.

## Offen / nicht verwendet

- **DTS:X**: dts.com ist aus dieser Umgebung weiterhin nicht erreichbar (Proxy lehnt ab). Ich habe keine DTS-Werte geprüft.
- Weitere Positionen aus G Abschnitt 4 (Lc/Rc, Ls1/Ls2, Lrs1/Lrs2, Front Height an der Wand) sind für 5.1–9.1.6 nicht nötig und deshalb nicht übernommen.
- 7.1.6 und 11.1.8 hat Dolby als Blätter, gehören aber nicht zum Umfang „5.1 bis 9.1.6“.

## Vorschlag zur Auflösung der Widersprüche (Freigabe nötig)

1. **L/R**: Grün bei 22–30° (alle Layout-Blätter), Gelb bei 30–40° mit Hinweis auf G Abb. 3.
2. **Ls/Rs bei 5.1.x**: Grün bei 90–120° (Vereinigung beider Angaben), Hinweistext zur Abweichung innerhalb G.
3. **Ampel allgemein**: Grün = im Dolby-Bereich. Gelb = bis 10° außerhalb (eigene Festlegung, keine Dolby-Vorgabe, im UI so kennzeichnen). Rot = mehr als 10° außerhalb.
