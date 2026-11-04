/** Fasst alle Berechnungen von Rechner 1 für ein Raummodell zusammen. */
import type { RoomModel } from './room';
import { roomIssues } from './room';
import {
  ANGLE_LIMITS_DEG,
  checkShift,
  combinedShiftUsage,
  distanceForAngle,
  isScope,
  luminanceNits,
  nitsToFootLambert,
  projectedImage,
  rateBrightness,
  rateViewingAngle,
  requiredShiftPct,
  screenGeometry,
  throwRange,
  throwRatioAt,
} from './screen';

export function computeScreen(m: RoomModel) {
  const geo = screenGeometry(m.screen.width, m.screen.aspect);
  const scope = isScope(m.screen.aspect);
  const method = scope ? m.projector.scopeMethod : 'zoom';
  const img = projectedImage(geo, m.screen.aspect, method);
  const usesLens = scope && method === 'lens';

  const nits = luminanceNits({
    lumens: m.projector.lumens,
    gain: m.screen.gain,
    fabricLossPct: m.screen.fabricLossPct,
    lensLossPct: usesLens ? m.projector.lensLossPct : 0,
    litArea: img.litArea,
  });
  const fl = nitsToFootLambert(nits);

  const throwDist = throwRange(m.projector.throwMin, m.projector.throwMax, img.throwWidth);
  const tr = throwRatioAt(m.projector.distance, img.throwWidth);
  const eps = 1e-9;
  const throwStatus: 'ok' | 'tooClose' | 'tooFar' =
    m.projector.distance < throwDist.min - eps ? 'tooClose' : m.projector.distance > throwDist.max + eps ? 'tooFar' : 'ok';

  const angle = (() => {
    const d = m.seat.distance;
    return d > 0 && geo.width > 0 ? (2 * Math.atan(geo.width / (2 * d)) * 180) / Math.PI : 0;
  })();

  // Lens Shift: Bildmitte des projizierten Panel-Bildes = Leinwandmitte (Zoom: Balken symmetrisch).
  const screenCenterZ = m.screen.bottomEdge + geo.height / 2;
  const shiftVReq = requiredShiftPct(screenCenterZ, m.projector.lensHeight, img.height);
  const shiftHReq = requiredShiftPct(0, m.projector.offsetY, img.throwWidth);
  const shiftVStatus = checkShift(shiftVReq, m.projector.shiftV);
  const shiftHStatus = checkShift(shiftHReq, m.projector.shiftH);
  const combined =
    m.projector.shiftV != null && m.projector.shiftH != null && shiftVReq !== 0 && shiftHReq !== 0
      ? combinedShiftUsage(shiftVReq, shiftHReq, m.projector.shiftV, m.projector.shiftH)
      : null;

  return {
    geo,
    scope,
    method,
    usesLens,
    img,
    nits,
    fl,
    brightness: rateBrightness(fl),
    throwDist,
    throwRatio: tr,
    throwStatus,
    angle,
    angleRating: rateViewingAngle(angle),
    smpteDistance: distanceForAngle(geo.width, ANGLE_LIMITS_DEG.smpte),
    thxDistance: distanceForAngle(geo.width, ANGLE_LIMITS_DEG.thx),
    thxMaxDistance: distanceForAngle(geo.width, ANGLE_LIMITS_DEG.max),
    screenCenterZ,
    shift: {
      vReq: shiftVReq,
      hReq: shiftHReq,
      vStatus: shiftVStatus,
      hStatus: shiftHStatus,
      /** > 1 heißt: bei rautenförmigem Shift-Bereich nicht erreichbar */
      combined,
    },
    issues: roomIssues(m),
  };
}

export type ScreenResult = ReturnType<typeof computeScreen>;
