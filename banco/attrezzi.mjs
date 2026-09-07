// L'ATTREZZO CHE SI CONSUMA CAMBIA QUALCOSA? Tre domande. (1) Si rompono e si rifanno davvero.
// (2) Chi sa fare cose buone ma non ha materia dura retrocede — cioè sapere non basta più.
// (3) L'era dei metalli non è più una porta che si apre e resta aperta.
import { corri } from "./sim.mjs";
const { pop } = await corri(process.argv[2] || "attrezzi", 58, +(process.argv[3] || 900));
const vivi = pop.npcs.filter((n) => n.vivo);
const med = (v) => v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;

const conAttrezzo = vivi.filter((n) => n._utensile);
const senza = vivi.filter((n) => !n._utensile);
// chi SAPREBBE fare di meglio di quello che ha in mano: è lì che si vede il divario
const frustrati = vivi.filter((n) => (n.strumentoNoto || 0) - (n.strumento || 0) > 0.1);

console.log(JSON.stringify({
  anno: pop.anno | 0, vivi: vivi.length,
  "attrezzi rifatti in tutto": pop.utensiliRifatti || 0,
  "attrezzi rotti in tutto": pop.utensiliRotti || 0,
  "chi ne ha uno adesso": conAttrezzo.length,
  "chi è a mani nude": senza.length,
  "── sapere contro avere ──": "",
  "quello che saprebbero fare (medio)": +med(vivi.map((n) => n.strumentoNoto || 0)).toFixed(3),
  "quello che hanno in mano (medio)": +med(vivi.map((n) => n.strumento || 0)).toFixed(3),
  "quanti sanno fare meglio di quel che hanno": frustrati.length +
    " (" + ((frustrati.length / Math.max(1, vivi.length)) * 100).toFixed(0) + "%)",
  "── di che cosa se li fanno ──": "",
  materie: (() => {
    const c = new Map();
    for (const n of conAttrezzo) {
      const m = pop.registry.mat(n._utensile.di);
      if (m) c.set(m.nome, (c.get(m.nome) || 0) + 1);
    }
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([k, v]) => k + " ×" + v).join(" · ");
  })(),
  "durata media dell'attrezzo (vita che gli resta)": +med(conAttrezzo.map((n) => n._utensile.vita)).toFixed(2),
}, null, 1));
