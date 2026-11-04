/**
 * Plan My Cinema – Empfänger für Sicherungen im Google Drive.
 * Läuft als Google Apps Script im Konto des Inhabers (script.google.com).
 * Nimmt ZIP-Dateien vom GitHub-Deploy entgegen und legt sie NUR im Ordner
 * „Plan My Cinema/Sicherungen“ ab. Ohne den geheimen Schlüssel wird nichts gespeichert.
 */
const FOLDER_ID = '1BTRH3_4xhyCpzHhpLI74nupi6NjvbKEq'; // Plan My Cinema/Sicherungen

/** Einmal von Hand ausführen: erzeugt den Schlüssel und fragt die Drive-Berechtigung an. */
function einrichten() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('KEY');
  if (!key) {
    key = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    props.setProperty('KEY', key);
  }
  const folder = DriveApp.getFolderById(FOLDER_ID);
  Logger.log('Zielordner: ' + folder.getName());
  Logger.log('Schlüssel für GitHub-Secret DRIVE_UPLOAD_KEY: ' + key);
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const key = PropertiesService.getScriptProperties().getProperty('KEY');
    if (!key || typeof req.key !== 'string' || req.key !== key) return antwort({ ok: false, error: 'nicht berechtigt' });
    if (typeof req.name !== 'string' || !/^[A-Za-z0-9_.-]{1,120}\.zip$/.test(req.name)) return antwort({ ok: false, error: 'ungültiger Dateiname' });
    const bytes = Utilities.base64Decode(req.data);
    const file = DriveApp.getFolderById(FOLDER_ID).createFile(Utilities.newBlob(bytes, 'application/zip', req.name));
    return antwort({ ok: true, name: file.getName(), size: file.getSize() });
  } catch (err) {
    return antwort({ ok: false, error: String(err) });
  }
}

function antwort(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
