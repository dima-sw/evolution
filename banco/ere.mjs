// L'ATTREZZO CHE SI CONSUMA BLOCCA IL PROGRESSO? È il rischio vero della modifica: se nessuno
// riesce più a tenere in mano un utensile buono, i metalli non si raggiungono e il mondo resta
// nella pietra per sempre. Si guarda quali durezze la gente riesce davvero a estrarre.
import { corri } from "./sim.mjs";
const { pop } = await corri(process.argv[2] || "ere", 58, +(process.argv[3] || 1500));
const vivi = pop.npcs.filter((n) => n.vivo);
const med = (v) => v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
const s = pop.stats ? pop.stats() : null;

// che cosa la gente ha davvero in mano, per durezza di estrazione
const per = new Map();
for (const n of vivi) for (const [id, q] of n.inventory) {
  if (q <= 0) continue;
  const m = pop.registry.mat(id);
  if (!m) continue;
  per.set(m.nome, (per.get(m.nome) || 0) + q);
}
const duri = [...per.entries()].map(([nome, q]) => {
  const m = pop.registry.materials.find((x) => x.nome === nome);
  return { nome, q, dur: m ? m.durezzaEstrazione : 0 };
}).sort((a, b) => b.dur - a.dur);

console.log(JSON.stringify({
  anno: pop.anno | 0, vivi: vivi.length,
  "era dei metalli raggiunta": !!pop.etaMetalli,
  "attrezzo medio in mano": +med(vivi.map((n) => n.strumento || 0)).toFixed(3),
  "il migliore che qualcuno abbia": +Math.max(0, ...vivi.map((n) => n.strumento || 0)).toFixed(3),
  "chi ha un attrezzo": vivi.filter((n) => n._utensile).length + " su " + vivi.length,
  "attrezzi rifatti / rotti": (pop.utensiliRifatti || 0) + " / " + (pop.utensiliRotti || 0),
  "le materie più dure che sono riusciti a cavare":
    duri.slice(0, 6).map((d) => d.nome + " (durezza " + d.dur.toFixed(2) + ", ne hanno " + Math.round(d.q) + ")"),
  "conoscenze vive": pop.knowledge ? [...pop.knowledge.beliefs.values()].filter((b) => b.verdetto === "utile").length : null,
}, null, 1));
