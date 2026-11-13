/** Texte für Rechner 4 „Pegel & Verstärker“. DE zuerst, EN eigenständig. */
import type { Lang } from '../lib/format';

const de = {
  gTarget: 'Zielpegel',
  calSpl: 'Kalibrierpegel am Hauptsitzplatz',
  calHint: 'Dolby: 79–82 dB SPL(C) je nach Raumgröße, gemessen mit rosa Rauschen bei −20 dBFS. Vollaussteuerung liegt 20 dB darüber.',
  groups: { front: 'Front (L, C, R)', surround: 'Surround, Rear, Wides', height: 'Höhenlautsprecher' } as Record<string, string>,
  sens: 'Kennempfindlichkeit',
  basis: 'Angabe für',
  basis1w: '1 W / 1 m',
  basis283: '2,83 V / 1 m',
  impedance: 'Nennimpedanz',
  amp: 'Verstärkerleistung je Kanal',
  ampHint: 'Dauerleistung laut Datenblatt bei dieser Impedanz.',
  groupHint: 'Werte aus dem Datenblatt deiner Lautsprecher. Die Positionen kommen aus dem Lautsprecher-Planer.',
  kTarget: 'Ziel bei Vollaussteuerung',
  heroOk: 'Alle Lautsprecher schaffen den Zielpegel.',
  heroBad: (id: string, d: string) => `${id} fehlen ${d} bis zum Zielpegel.`,
  heroWarn: (id: string, d: string) => `Knapp: ${id} hat nur ${d} Reserve.`,
  tableTitle: 'Je Lautsprecher am Hauptsitzplatz',
  thSpk: 'Kanal',
  thGroup: 'Gruppe',
  thDist: 'Abstand',
  thNeed: 'nötige Leistung',
  thMax: 'max. Pegel',
  thReserve: 'Reserve',
  status: { ok: 'reicht', warn: 'knapp', bad: 'reicht nicht' } as Record<string, string>,
  tableNote: 'Max. Pegel = Pegel am Hauptsitzplatz mit der eingetragenen Verstärkerleistung. Reserve = max. Pegel − Ziel. „Knapp“ = weniger als 3 dB Reserve (eigene Festlegung). Freifeld-Rechnung ohne Raumreflexionen – im Raum ist es meist etwas lauter. Nicht berücksichtigt: Belastbarkeit der Lautsprecher, Leistungskompression, Subwoofer und LFE-Kanal.',
  planner: 'Positionen und Layout ändern',
  w: 'W',
};

type Dict = typeof de;

const en: Dict = {
  gTarget: 'Target level',
  calSpl: 'Calibration level at the main seat',
  calHint: 'Dolby: 79–82 dB SPL(C) depending on room size, measured with pink noise at −20 dBFS. Full scale is 20 dB above that.',
  groups: { front: 'Front (L, C, R)', surround: 'Surround, rear, wides', height: 'Height speakers' },
  sens: 'Sensitivity',
  basis: 'Rated at',
  basis1w: '1 W / 1 m',
  basis283: '2.83 V / 1 m',
  impedance: 'Nominal impedance',
  amp: 'Amplifier power per channel',
  ampHint: 'Continuous power from the data sheet at this impedance.',
  groupHint: 'Values from your speakers’ data sheet. Positions come from the speaker planner.',
  kTarget: 'Target at full scale',
  heroOk: 'Every speaker reaches the target level.',
  heroBad: (id, d) => `${id} falls ${d} short of the target.`,
  heroWarn: (id, d) => `Tight: ${id} has only ${d} of headroom.`,
  tableTitle: 'Per speaker at the main seat',
  thSpk: 'Channel',
  thGroup: 'Group',
  thDist: 'Distance',
  thNeed: 'Power needed',
  thMax: 'Max. level',
  thReserve: 'Headroom',
  status: { ok: 'enough', warn: 'tight', bad: 'not enough' },
  tableNote: 'Max. level = level at the main seat with the amplifier power entered. Headroom = max. level − target. “Tight” = less than 3 dB headroom (our own threshold). Free-field calculation without room reflections – a real room is usually a little louder. Not covered: speaker power handling, power compression, subwoofers and the LFE channel.',
  planner: 'Change positions and layout',
  w: 'W',
};

export const LEVELS_UI: Record<Lang, Dict> = { de, en };
export type LevelsDict = Dict;
