// QUANTO SI DIFFONDE UN'USANZA CHE FUNZIONA? Prima ogni tiro convertiva una persona sola, per
// quanti la praticassero: le istituzioni restavano minuscole. Si guarda quanta gente ne pratica
// almeno una, e quanto è larga la più diffusa.
import { corri } from "./sim.mjs";
const { pop } = await corri(process.argv[2] || "usanze", 70, +(process.argv[3] || 530));
const vivi = pop.npcs.filter((n) => n.vivo);
const ist = [...(pop.entita || new Map()).values()].filter((e) => e.tipo === "istituzione");
const praticanti = new Set();
for (const e of ist) for (const pid of e.portatori) praticanti.add(pid);
const grandi = ist.map((e) => ({ n: e.nome, q: e.portatori.size, giova: +(e.beneficioOsservato ?? 0).toFixed(3) }))
  .sort((a, b) => b.q - a.q);
console.log(JSON.stringify({
  anno: pop.anno | 0, vivi: vivi.length,
  "usanze vive": ist.length, "usanze estinte": pop.entitaEstinte || 0,
  "quanta gente ne pratica almeno una": praticanti.size +
    " (" + ((praticanti.size / Math.max(1, vivi.length)) * 100).toFixed(1) + "%)",
  "le più diffuse": grandi.slice(0, 6).map((g) => g.n + " ×" + g.q + (g.giova ? " (giova " + g.giova + ")" : "")),
  "la più diffusa arriva al": grandi.length
    ? ((grandi[0].q / Math.max(1, vivi.length)) * 100).toFixed(1) + "% del mondo" : "—",
}, null, 1));
