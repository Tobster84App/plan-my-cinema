/**
 * Erzeugt das Titelbild der Startseite (public/img/titelbild.svg) aus dem Raummodell:
 * Grundriss 7,0 × 4,0 m, 7.1.4 nach Dolby (automatische Platzierung), 2 Sitzreihen, Blickwinkel vom MLP zur Leinwand.
 * Aufruf: npx tsx scripts/make-hero.ts public/img/titelbild.svg
 */
import { writeFileSync } from 'node:fs';
import { DEFAULT_ROOM } from '../src/lib/room';
import { computeSpeakers } from '../src/lib/speakers-calc';
import { seatPositions } from '../src/lib/seating';

const m = structuredClone(DEFAULT_ROOM);
m.seating.rows = 2;
m.room.length = 7;
m.seat.distance = 3.5;
m.seating.rowSpacing = 1.5;
m.seating.riserStep = 0.3;
m.projector.distance = 6.1;
const r = computeSpeakers(m);
const seats = seatPositions(m);
const pad = 24;
const L = m.room.length, B = m.room.width;
const s = 104; // px pro m
const W = Math.round(L * s + 2 * pad), H = Math.round(B * s + 2 * pad);
const x0 = pad, y0 = pad;
const X = (x: number) => x0 + x * s;
const Y = (y: number) => y0 + (B - y) * s; // linke Wand unten (wie auf der Seite)
const amber = '#f2b544', grey = '#959bab', line = '#3a4256', bg = '#0d0f14';
const mlp = r.mlp;
const scr = { x: m.screen.wallGap, y1: B / 2 - m.screen.width / 2, y2: B / 2 + m.screen.width / 2 };
const proj = { x: m.screen.wallGap + m.projector.distance, y: B / 2 };
const f = (n: number) => n.toFixed(1);

// Sessel mit Blick zur Leinwand (Lehne rechts)
const chair = (cx: number, cy: number) => {
  const w = 0.62 * s, d = 0.7 * s;
  const l = cx - d / 2 + 6, t = cy - w / 2;
  return `<g fill="none" stroke="${amber}" stroke-width="1.4" opacity="0.85">
    <rect x="${f(l)}" y="${f(t + 8)}" width="${f(d - 20)}" height="${f(w - 16)}" rx="5"/>
    <rect x="${f(l + d - 20)}" y="${f(t)}" width="12" height="${f(w)}" rx="5"/>
    <rect x="${f(l)}" y="${f(t)}" width="${f(d - 14)}" height="8" rx="3"/>
    <rect x="${f(l)}" y="${f(t + w - 8)}" width="${f(d - 14)}" height="8" rx="3"/>
  </g>`;
};

const parts: string[] = [];
parts.push(`<defs>
  <linearGradient id="cone" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${amber}" stop-opacity="0.13"/><stop offset="1" stop-color="${amber}" stop-opacity="0.03"/></linearGradient>
</defs>`);
// feines Raster
for (let i = 0; i <= L; i++) parts.push(`<line x1="${f(X(i))}" y1="${f(Y(0))}" x2="${f(X(i))}" y2="${f(Y(B))}" stroke="${line}" stroke-width="1" opacity="0.35"/>`);
// Raum
parts.push(`<rect x="${f(X(0))}" y="${f(Y(B))}" width="${f(L * s)}" height="${f(B * s)}" fill="none" stroke="${grey}" stroke-width="2" opacity="0.8"/>`);
// Projektorstrahl (sehr dezent) und Projektor
parts.push(`<polygon points="${f(X(proj.x))},${f(Y(proj.y))} ${f(X(scr.x))},${f(Y(scr.y1))} ${f(X(scr.x))},${f(Y(scr.y2))}" fill="${amber}" opacity="0.04"/>`);
parts.push(`<g stroke="${grey}" stroke-width="1" stroke-dasharray="3 5" opacity="0.5"><line x1="${f(X(proj.x))}" y1="${f(Y(proj.y))}" x2="${f(X(scr.x))}" y2="${f(Y(scr.y1))}"/><line x1="${f(X(proj.x))}" y1="${f(Y(proj.y))}" x2="${f(X(scr.x))}" y2="${f(Y(scr.y2))}"/></g>`);
parts.push(`<rect x="${f(X(proj.x) - 4)}" y="${f(Y(proj.y) - 13)}" width="30" height="26" rx="4" fill="${bg}" stroke="${grey}" stroke-width="1.5"/><circle cx="${f(X(proj.x) - 4)}" cy="${f(Y(proj.y))}" r="5" fill="${bg}" stroke="${grey}" stroke-width="1.5"/>`);
// Blickwinkel vom MLP zur Leinwand
parts.push(`<polygon points="${f(X(mlp.x))},${f(Y(mlp.y))} ${f(X(scr.x))},${f(Y(scr.y1))} ${f(X(scr.x))},${f(Y(scr.y2))}" fill="url(#cone)"/>`);
parts.push(`<g stroke="${amber}" stroke-width="1" opacity="0.6"><line x1="${f(X(mlp.x))}" y1="${f(Y(mlp.y))}" x2="${f(X(scr.x))}" y2="${f(Y(scr.y1))}"/><line x1="${f(X(mlp.x))}" y1="${f(Y(mlp.y))}" x2="${f(X(scr.x))}" y2="${f(Y(scr.y2))}"/></g>`);
// Leinwand
parts.push(`<line x1="${f(X(scr.x))}" y1="${f(Y(scr.y1))}" x2="${f(X(scr.x))}" y2="${f(Y(scr.y2))}" stroke="${amber}" stroke-width="5" stroke-linecap="round"/>`);
// Strahlen MLP → Lautsprecher
for (const sp of r.speakers) parts.push(`<line x1="${f(X(mlp.x))}" y1="${f(Y(mlp.y))}" x2="${f(X(sp.pos.x))}" y2="${f(Y(sp.pos.y))}" stroke="${amber}" stroke-width="0.8" opacity="${sp.rule.measure === 'elevation' ? 0.25 : 0.4}"/>`);
// Sessel
for (const st of seats) parts.push(chair(X(st.pos.x), Y(st.pos.y)));
// Lautsprecher
for (const sp of r.speakers) {
  const cx = X(sp.pos.x), cy = Y(sp.pos.y);
  parts.push(sp.rule.measure === 'elevation'
    ? `<rect x="${f(cx - 8)}" y="${f(cy - 8)}" width="16" height="16" rx="3" fill="${bg}" stroke="${grey}" stroke-width="1.5"/>`
    : `<circle cx="${f(cx)}" cy="${f(cy)}" r="7" fill="${bg}" stroke="${amber}" stroke-width="1.8"/>`);
}
// MLP
parts.push(`<circle cx="${f(X(mlp.x))}" cy="${f(Y(mlp.y))}" r="4" fill="${amber}"/>`);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Grundriss eines Heimkinos">${parts.join('')}</svg>`;
writeFileSync(process.argv[2], svg);
console.log(svg.length);
