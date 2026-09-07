// I POVERI GUARDANO I RICCHI? La domanda del TODO, e va misurata prima di toccare qualsiasi cosa.
// Per ogni coppia di popoli abbastanza vicini da potersi fare la guerra si guarda: quanto sono
// diversi per RICCHEZZA, quanto per NUMERO, e se fra loro c'è un fronte aperto.
import { corri } from "./sim.mjs";
const { pop } = await corri(process.argv[2] || "invidia", 58, +(process.argv[3] || 1200));

const facs = (pop.factions || []).filter((f) => f._membri && f._membri.length >= 8);
if (facs.length < 3) { console.log("popoli troppo pochi: " + facs.length); process.exit(0); }

// ricchezza di un popolo: la media di quanto i suoi stanno sopra la media del mondo
for (const f of facs) {
  let s = 0, n = 0;
  for (const m of f._membri) { if (!m.vivo) continue; s += m._agiatezza ?? 1; n++; }
  f._ricchezza = n ? s / n : 1;
}
// Non basta sapere CHI si fa la guerra: quando la metà delle coppie è in guerra, un sì/no è
// schiacciato contro il soffitto e nessuna correlazione può venire fuori. L'intensità del fronte
// la calcola già il motore, ed è una misura continua.
const fronti = new Map((pop.fronti || []).map((x) => [[x.a, x.b].sort().join("|"), x.intensita]));

const righe = [];
for (let i = 0; i < facs.length; i++) for (let j = i + 1; j < facs.length; j++) {
  const A = facs[i], B = facs[j];
  const d = Math.hypot(A.x - B.x, A.y - B.y);
  if (d > 90) continue;                                   // troppo lontani per confliggere
  righe.push({
    dislRicchezza: Math.abs(A._ricchezza - B._ricchezza) / Math.max(A._ricchezza, B._ricchezza, 1e-6),
    dislNumero: Math.abs(A.membri - B.membri) / Math.max(A.membri, B.membri),
    guerra: fronti.has([A.nome, B.nome].sort().join("|")) ? 1 : 0,
    intensita: fronti.get([A.nome, B.nome].sort().join("|")) || 0,
  });
}
if (righe.length < 6) { console.log("coppie vicine troppo poche: " + righe.length); process.exit(0); }

function corr(a, b) {
  const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length;
  let n = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; n += x * y; da += x * x; db += y * y; }
  return da && db ? n / Math.sqrt(da * db) : 0;
}
const g = righe.map((r) => r.guerra);
const inGuerra = righe.filter((r) => r.guerra);
const inPace = righe.filter((r) => !r.guerra);
const med = (v, k) => v.length ? v.reduce((s, x) => s + x[k], 0) / v.length : null;

console.log(JSON.stringify({
  anno: pop.anno | 0, popoli: facs.length, "coppie abbastanza vicine": righe.length,
  "di cui in guerra": inGuerra.length,
  "ricchezza dei popoli (min..max)": [Math.min(...facs.map((f) => f._ricchezza)), Math.max(...facs.map((f) => f._ricchezza))].map((v) => +v.toFixed(2)),
  "── correlazione con la guerra ──": "",
  "divario di RICCHEZZA": +corr(righe.map((r) => r.dislRicchezza), g).toFixed(3),
  "divario di NUMERO": +corr(righe.map((r) => r.dislNumero), g).toFixed(3),
  "── e con l'INTENSITÀ del fronte (misura continua, niente soffitto) ──": "",
  "ricchezza → intensità": +corr(righe.map((r) => r.dislRicchezza), righe.map((r) => r.intensita)).toFixed(3),
  "numero → intensità": +corr(righe.map((r) => r.dislNumero), righe.map((r) => r.intensita)).toFixed(3),
  "── QUANTO PESANO DAVVERO I DUE TERMINI ──": (() => {
    // Si ricalcolano esattamente come li calcola culture.js, dai dati delle fazioni. Se il termine
    // della roba è minuscolo rispetto a quello del numero, non c'è confondimento che tenga: è
    // semplicemente troppo debole per spostare la soglia (0,6).
    const num = [], rob = [];
    for (let i = 0; i < facs.length; i++) for (let j = i + 1; j < facs.length; j++) {
      const A = facs[i], B = facs[j];
      if (Math.hypot(A.x - B.x, A.y - B.y) > 90) continue;
      num.push((Math.abs(A.membri - B.membri) / Math.max(A.membri, B.membri))
        * ((A.cultura.invidia + B.cultura.invidia) / 2));
      const rA = A.ricchezza ?? 1, rB = B.ricchezza ?? 1;
      const pov = rA < rB ? A : B, ric = rA < rB ? B : A;
      rob.push(Math.max(0, ((ric.ricchezza ?? 1) - (pov.ricchezza ?? 1)) / Math.max(ric.ricchezza ?? 1, 1e-6)
        * (pov.cultura.invidia || 0.4)) * 0.8);
    }
    const mm = (v) => +(v.reduce((s, x) => s + x, 0) / Math.max(1, v.length)).toFixed(3);
    const mx = (v) => +Math.max(...v).toFixed(3);
    return { "termine NUMERO — medio": mm(num), "massimo": mx(num),
             "termine ROBA — medio": mm(rob), "massimo": mx(rob),
             "soglia di guerra": 0.6,
             "la ricchezza arriva sulla fazione": facs.every((f) => f.ricchezza !== undefined) };
  })(),
  "── STRATIFICATO: solo coppie di taglia simile (divario di numero < 0,3) ──": (() => {
    // Il divario di ricchezza e quello di numero sono ATTACCATI: un popolo grande ha per forza
    // una media vicina a quella del mondo, quindi i divari di ricchezza estremi capitano fra
    // popoli piccoli — e i popoli piccoli fanno meno guerra. Guardando i due insieme si legge il
    // confondimento, non l'effetto. Qui si tiene ferma la taglia e si guarda solo la roba.
    const sim = righe.filter((r) => r.dislNumero < 0.3);
    if (sim.length < 20) return "coppie simili troppo poche: " + sim.length;
    const g2 = sim.map((r) => r.guerra);
    const inG = sim.filter((r) => r.guerra), inP = sim.filter((r) => !r.guerra);
    const m = (v) => v.length ? +(v.reduce((s, x) => s + x.dislRicchezza, 0) / v.length).toFixed(3) : null;
    return {
      coppie: sim.length, "di cui in guerra": inG.length,
      "ricchezza → guerra": +corr(sim.map((r) => r.dislRicchezza), g2).toFixed(3),
      "ricchezza → intensità": +corr(sim.map((r) => r.dislRicchezza), sim.map((r) => r.intensita)).toFixed(3),
      "divario medio in guerra": m(inG), "in pace": m(inP),
    };
  })(),
  "── divario medio ──": "",
  "fra chi si fa la guerra — ricchezza": med(inGuerra, "dislRicchezza") == null ? null : +med(inGuerra, "dislRicchezza").toFixed(3),
  "fra chi sta in pace — ricchezza": med(inPace, "dislRicchezza") == null ? null : +med(inPace, "dislRicchezza").toFixed(3),
  "fra chi si fa la guerra — numero": med(inGuerra, "dislNumero") == null ? null : +med(inGuerra, "dislNumero").toFixed(3),
  "fra chi sta in pace — numero": med(inPace, "dislNumero") == null ? null : +med(inPace, "dislNumero").toFixed(3),
}, null, 1));
