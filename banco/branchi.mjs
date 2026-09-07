// LA SOCIALITÀ CONTA DAVVERO? Due domande. (1) Chi è gregario finisce più vicino ai suoi di chi
// è schivo — cioè il comportamento esiste. (2) La media si è mossa da 0,5 — cioè la selezione ha
// potuto lavorarci. Se la risposta a (2) è no, il gene resta un ornamento.
import { corri } from "./sim.mjs";
const { pop } = await corri(process.argv[2] || "branchi", 58, +(process.argv[3] || 900));
const vive = pop.creature.filter((a) => a.vivo);
if (vive.length < 50) { console.log("troppo poche bestie: " + vive.length); process.exit(0); }

const CELLA = 12;
const g = new Map();
for (const a of vive) {
  const k = ((a.x / CELLA) | 0) + "," + ((a.y / CELLA) | 0);
  let arr = g.get(k); if (!arr) { arr = []; g.set(k, arr); } arr.push(a);
}
// La distanza dal CENTRO del proprio gruppo: è quella che il comportamento governa davvero.
// Il vicino più stretto non dice niente in una calca — a ventimila bestie ce l'hanno tutti a un
// passo, gregari e schivi allo stesso modo.
const centri = new Map();
for (const [k, arr] of g) {
  let sx = 0, sy = 0;
  for (const a of arr) { sx += a.x; sy += a.y; }
  centri.set(k, [sx / arr.length, sy / arr.length, arr.length]);
}
function dalCentro(a) {
  const k = ((a.x / CELLA) | 0) + "," + ((a.y / CELLA) | 0);
  const c = centri.get(k);
  if (!c || c[2] < 3) return null;
  return Math.hypot(a.x - c[0], a.y - c[1]);
}

function vicinoPiuStretto(a) {
  let bd = Infinity;
  const cx = (a.x / CELLA) | 0, cy = (a.y / CELLA) | 0;
  for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
    const arr = g.get(x + "," + y); if (!arr) continue;
    for (const b of arr) {
      if (b === a) continue;
      const d = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      if (d < bd) bd = d;
    }
  }
  return bd === Infinity ? null : Math.sqrt(bd);
}
const med = (v) => v.reduce((s, x) => s + x, 0) / Math.max(1, v.length);
const soc = vive.map((a) => a.dna.socialita || 0.5).sort((x, y) => x - y);
const q = (f) => soc[Math.min(soc.length - 1, (soc.length * f) | 0)];

const gregari = vive.filter((a) => (a.dna.socialita || 0.5) > 0.65);
const schivi = vive.filter((a) => (a.dna.socialita || 0.5) < 0.35);
const dG = gregari.map(vicinoPiuStretto).filter((v) => v != null);
const dS = schivi.map(vicinoPiuStretto).filter((v) => v != null);

// e chi sopravvive meglio? l'età media è il proxy più semplice.
const etaG = med(gregari.map((a) => a.eta));
const etaS = med(schivi.map((a) => a.eta));

console.log(JSON.stringify({
  anno: pop.anno | 0, bestie: vive.length,
  "socialità media": +med(soc).toFixed(3),
  "socialità: primo quarto / mediana / ultimo quarto": [q(0.25), q(0.5), q(0.75)].map((v) => +v.toFixed(2)),
  "gregari (>0,65)": gregari.length, "schivi (<0,35)": schivi.length,
  "vicino più stretto — GREGARIO": +med(dG).toFixed(2),
  "vicino più stretto — SCHIVO": +med(dS).toFixed(2),
  "distanza dal centro del gruppo — GREGARIO": +med(gregari.map(dalCentro).filter(v=>v!=null)).toFixed(2),
  "distanza dal centro del gruppo — SCHIVO": +med(schivi.map(dalCentro).filter(v=>v!=null)).toFixed(2),
  "età media dei gregari": +etaG.toFixed(1),
  "età media degli schivi": +etaS.toFixed(1),
  predatori: vive.filter((a) => a.dna.carnivoria > 0.5).length,
}, null, 1));
