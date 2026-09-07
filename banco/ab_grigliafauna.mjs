// A/B DENTRO LO STESSO PROCESSO — le chiavi della griglia delle bestie.
//
// È lo stesso schema già tolto tre volte altrove (gente, società, fazioni) e rimasto proprio nel
// modulo più caro: la griglia della fauna ha chiavi STRINGA. Ogni `grid.get(gx + "," + gy)`
// costruisce una stringa, la sminuzza per l'hash e lascia spazzatura — e non succede una volta per
// bestia, ma **una volta per cella di ogni anello di ogni interrogazione**. Con ventisettemila
// bestie sono milioni di stringhe a battito.
//
// Lo stesso vale per la chiave del branco, che impasta quattro pezzi (cella x, cella y, se è
// acquatico, quanto è carnivoro) in una stringa, per ogni bestia, a ogni giro.
//
// Qui si confrontano le due versioni sullo stesso mondo, e PRIMA di cronometrare si verifica che
// diano gli stessi identici raggruppamenti e le stesse identiche risposte. Se non coincidono il
// confronto non vale niente e il banco si ferma.
import { corri } from "./sim.mjs";

const { pop } = await corri(process.argv[2] || "scala", 58, +(process.argv[3] || 900));
const bestie = pop.creature.filter((a) => a.vivo);
console.log("bestie vive " + bestie.length + " · mondo " + pop.world.width + "×" + pop.world.height);

const CELLA = 12;

// ── PRIMA: una Map con chiavi stringa ─────────────────────────────────────────────────────────
function grigliaPrima(list, ammesso) {
  const g = new Map();
  for (const o of list) {
    if (!o.vivo || (ammesso && !ammesso(o))) continue;
    const k = ((o.x / CELLA) | 0) + "," + ((o.y / CELLA) | 0);
    let a = g.get(k); if (!a) { a = []; g.set(k, a); } a.push(o);
  }
  return g;
}
function viciniPrima(grid, x, y, r, quanti) {
  const out = [];
  const R2 = r * r, cx = (x / CELLA) | 0, cy = (y / CELLA) | 0;
  const span = Math.ceil(r / CELLA);
  for (let anello = 0; anello <= span; anello++) {
    if (out.length >= quanti) {
      const minFuori = (anello - 1) * CELLA;
      if (minFuori > 0 && minFuori * minFuori >= out[out.length - 1].d2) break;
    }
    for (let gy = cy - anello; gy <= cy + anello; gy++) for (let gx = cx - anello; gx <= cx + anello; gx++) {
      if (anello > 0 && Math.abs(gx - cx) !== anello && Math.abs(gy - cy) !== anello) continue;
      const arr = grid.get(gx + "," + gy);
      if (!arr) continue;
      for (const o of arr) {
        if (!o.vivo) continue;
        const d2 = (o.x - x) ** 2 + (o.y - y) ** 2;
        if (d2 > R2) continue;
        if (out.length >= quanti && d2 >= out[out.length - 1].d2) continue;
        let j = out.length < quanti ? out.length : quanti - 1;
        while (j > 0 && out[j - 1].d2 > d2) { out[j] = out[j - 1]; j--; }
        out[j] = { a: o, d2 };
        if (out.length > quanti) out.length = quanti;
      }
    }
  }
  return out;
}

// ── DOPO: un array piatto e chiavi numeriche ──────────────────────────────────────────────────
// Il MARGINE non è un dettaglio: la mappa a stringhe non aveva confini, e una bestia che finisse
// fuori dal mondo aveva comunque la sua cella. Con un array piatto senza margine verrebbe scartata
// o accorpata a quella accanto — e sarebbe un cambiamento del mondo travestito da ottimizzazione.
const MARG = 4;
const COL = Math.ceil(pop.world.width / CELLA) + MARG * 2;
const RIG = Math.ceil(pop.world.height / CELLA) + MARG * 2;
const idC = (c, r) => (r + MARG) * COL + (c + MARG);
const dentro = (c, r) => c + MARG >= 0 && r + MARG >= 0 && c + MARG < COL && r + MARG < RIG;

function grigliaDopo(list, ammesso) {
  const g = new Array(COL * RIG).fill(null);
  let fuori = 0;
  for (const o of list) {
    if (!o.vivo || (ammesso && !ammesso(o))) continue;
    const c = (o.x / CELLA) | 0, r = (o.y / CELLA) | 0;
    if (!dentro(c, r)) { fuori++; continue; }
    const k = idC(c, r);
    (g[k] || (g[k] = [])).push(o);
  }
  g._fuori = fuori;
  return g;
}
function viciniDopo(grid, x, y, r, quanti) {
  const out = [];
  const R2 = r * r, cx = (x / CELLA) | 0, cy = (y / CELLA) | 0;
  const span = Math.ceil(r / CELLA);
  for (let anello = 0; anello <= span; anello++) {
    if (out.length >= quanti) {
      const minFuori = (anello - 1) * CELLA;
      if (minFuori > 0 && minFuori * minFuori >= out[out.length - 1].d2) break;
    }
    for (let gy = cy - anello; gy <= cy + anello; gy++) for (let gx = cx - anello; gx <= cx + anello; gx++) {
      if (anello > 0 && Math.abs(gx - cx) !== anello && Math.abs(gy - cy) !== anello) continue;
      if (!dentro(gx, gy)) continue;
      const arr = grid[idC(gx, gy)];
      if (!arr) continue;
      for (const o of arr) {
        if (!o.vivo) continue;
        const d2 = (o.x - x) ** 2 + (o.y - y) ** 2;
        if (d2 > R2) continue;
        if (out.length >= quanti && d2 >= out[out.length - 1].d2) continue;
        let j = out.length < quanti ? out.length : quanti - 1;
        while (j > 0 && out[j - 1].d2 > d2) { out[j] = out[j - 1]; j--; }
        out[j] = { a: o, d2 };
        if (out.length > quanti) out.length = quanti;
      }
    }
  }
  return out;
}

// ── nessuna bestia deve restare fuori dal margine ─────────────────────────────────────────────
const gA = grigliaPrima(pop.creature), gB = grigliaDopo(pop.creature);
console.log("bestie cadute fuori dalla griglia col margine: " + gB._fuori +
  (gB._fuori ? "   ✗ IL MARGINE NON BASTA" : "   ✓"));
if (gB._fuori) process.exit(1);

// ── le due griglie contengono le stesse bestie nelle stesse celle, NELLO STESSO ORDINE? ───────
let celleDiverse = 0, totCelle = 0;
for (const [k, arr] of gA) {
  totCelle++;
  const [c, r] = k.split(",").map(Number);
  const altro = dentro(c, r) ? gB[idC(c, r)] : null;
  if (!altro || altro.length !== arr.length) { celleDiverse++; continue; }
  for (let i = 0; i < arr.length; i++) if (arr[i] !== altro[i]) { celleDiverse++; break; }
}
console.log("celle " + totCelle + " · differenti " + celleDiverse + (celleDiverse ? "   ✗" : "   ✓"));
if (celleDiverse) process.exit(1);

// ── e rispondono la stessa cosa? ──────────────────────────────────────────────────────────────
const gpA = grigliaPrima(pop.creature, (o) => o.dna.carnivoria >= 0.35);
const gpB = grigliaDopo(pop.creature, (o) => o.dna.carnivoria >= 0.35);
let risposteDiverse = 0, interrogazioni = 0;
for (let i = 0; i < bestie.length; i += 3) {
  const a = bestie[i];
  const r = 5 + (a.dna.vista || 0.5) * 8 + 9;
  const x = viciniPrima(gpA, a.x, a.y, r, 3), y = viciniDopo(gpB, a.x, a.y, r, 3);
  interrogazioni++;
  if (x.length !== y.length) { risposteDiverse++; continue; }
  for (let j = 0; j < x.length; j++) if (x[j].a !== y[j].a) { risposteDiverse++; break; }
}
console.log("interrogazioni " + interrogazioni + " · risposte diverse " + risposteDiverse +
  (risposteDiverse ? "   ✗ IL CONFRONTO NON VALE" : "   ✓"));
if (risposteDiverse) process.exit(1);

// ── i tempi, alternati ────────────────────────────────────────────────────────────────────────
const giroPrima = () => {
  const g = grigliaPrima(pop.creature), gp = grigliaPrima(pop.creature, (o) => o.dna.carnivoria >= 0.35);
  let n = 0;
  for (const a of bestie) n += viciniPrima(gp, a.x, a.y, 5 + (a.dna.vista || 0.5) * 8 + 9, 3).length;
  return n + g.size;
};
const giroDopo = () => {
  const g = grigliaDopo(pop.creature), gp = grigliaDopo(pop.creature, (o) => o.dna.carnivoria >= 0.35);
  let n = 0;
  for (const a of bestie) n += viciniDopo(gp, a.x, a.y, 5 + (a.dna.vista || 0.5) * 8 + 9, 3).length;
  return n + g.length;
};
for (let i = 0; i < 3; i++) { giroPrima(); giroDopo(); }
const N = +(process.env.GIRI || 6);
let tp = 0, td = 0;
for (let i = 0; i < N; i++) {
  let t = performance.now(); giroPrima(); tp += performance.now() - t;
  t = performance.now(); giroDopo(); td += performance.now() - t;
  t = performance.now(); giroDopo(); td += performance.now() - t;
  t = performance.now(); giroPrima(); tp += performance.now() - t;
}
const p = tp / (N * 2), d = td / (N * 2);
console.log("");
console.log("prima  " + p.toFixed(1) + " ms   (due griglie + una ricerca per bestia)");
console.log("dopo   " + d.toFixed(1) + " ms   " +
  (d < p ? "−" + ((1 - d / p) * 100).toFixed(0) : "+" + ((d / p - 1) * 100).toFixed(0)) + "%");
