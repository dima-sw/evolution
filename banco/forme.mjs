// QUANTE FORME DIVERSE HANNO LE PERSONE.
//
// In JavaScript un oggetto non è un sacco di proprietà: il motore gli assegna una FORMA nascosta,
// e quella forma è la mappa che dice dove sta ogni campo. Due oggetti con la stessa forma si
// leggono con un accesso diretto; oggetti di forme diverse costringono il motore a cercare ogni
// volta, e un punto del codice che ne vede più di quattro smette di ottimizzare del tutto.
//
// Qui le proprietà nascono per strada: `_padrone` compare quando qualcuno viene sottomesso,
// `_deterrenza` quando assiste a una punizione, `_commemorato` quando muore, `_agiatezza` al primo
// censimento dei ceti. Ognuna di quelle aggiunte crea una forma nuova — e chi non l'ha ancora
// ricevuta ha una forma diversa da chi sì. Se le forme sono tante, OGNI ciclo del motore paga.
//
// Questa sonda le conta davvero, chiedendolo al motore.
// uso: node --allow-natives-syntax banco/forme.mjs [seed] [tick]
import { corri } from "./sim.mjs";

const { pop } = await corri(process.argv[2] || "scala", 58, +(process.argv[3] || 400));
const npcs = pop.npcs;
console.log("persone nell'array " + npcs.length);

// I rappresentanti: un esemplare per forma incontrata.
const forme = [];
const conteggi = [];
for (const n of npcs) {
  let trovata = -1;
  for (let i = 0; i < forme.length; i++) if (%HaveSameMap(n, forme[i])) { trovata = i; break; }
  if (trovata < 0) { forme.push(n); conteggi.push(1); }
  else conteggi[trovata]++;
}
console.log("FORME DIVERSE: " + forme.length);

// le più diffuse, e che cosa hanno in più o in meno
const ordine = conteggi.map((c, i) => i).sort((a, b) => conteggi[b] - conteggi[a]);
const chiavi = (o) => new Set(Object.keys(o));
const comune = chiavi(forme[ordine[0]]);
for (let k = 0; k < Math.min(8, ordine.length); k++) {
  const i = ordine[k], ch = chiavi(forme[i]);
  const in_piu = [...ch].filter((x) => !comune.has(x));
  const in_meno = [...comune].filter((x) => !ch.has(x));
  console.log("  " + String(conteggi[i]).padStart(6) + " persone · " + ch.size + " campi" +
    (in_piu.length ? " · in più: " + in_piu.join(",") : "") +
    (in_meno.length ? " · in meno: " + in_meno.join(",") : ""));
}
if (ordine.length > 8) console.log("  … e altre " + (ordine.length - 8) + " forme");

// il conto vero: quanto costa leggere una proprietà su questa gente
const giro = (f, nome) => {
  for (let i = 0; i < 3; i++) f();
  const t = performance.now();
  let q = 0;
  for (let i = 0; i < 20; i++) q += f();
  console.log("  " + nome.padEnd(34) + ((performance.now() - t) / 20).toFixed(2) + " ms   (" + q + ")");
};
console.log("venti passate sull'array, per passata:");
giro(() => { let q = 0; for (const n of npcs) if (n.vivo) q++; return q; }, "n.vivo");
giro(() => { let q = 0; for (const n of npcs) if (n.vivo && !n._padrone) q++; return q; }, "n.vivo && !n._padrone");
giro(() => { let q = 0; for (const n of npcs) if (n.vivo && n.inventory.size > 2) q++; return q; }, "n.vivo && n.inventory.size");
giro(() => { let q = 0; for (const n of npcs) if (n.vivo && n.empatia > 0.5) q++; return q; }, "n.vivo && n.empatia");

// ── E SE AVESSERO TUTTI LA STESSA FORMA? ──────────────────────────────────────────────────────
// Si prende l'unione di tutti i campi mai visti, si costruisce un modello che li ha tutti nello
// stesso ordine, e ci si ricopia dentro la gente. Le copie non sono persone — non hanno i metodi,
// non servono a simulare — ma leggere una loro proprietà costa esattamente quel che costerebbe
// leggerla sulle persone vere, se le persone vere avessero una forma sola.
const tutti = [];
const visti = new Set();
for (const n of npcs) for (const k of Object.keys(n)) if (!visti.has(k)) { visti.add(k); tutti.push(k); }
console.log("");
console.log("campi diversi in tutto: " + tutti.length);
const copie = npcs.map((n) => {
  const o = {};
  for (const k of tutti) o[k] = n[k];      // sempre nello stesso ordine: una forma sola
  return o;
});
let formeCopie = 0;
{
  const rap = [];
  for (const o of copie) { let t = false; for (const r of rap) if (%HaveSameMap(o, r)) { t = true; break; } if (!t) rap.push(o); }
  formeCopie = rap.length;
}
console.log("forme delle copie: " + formeCopie);
console.log("le stesse venti passate, sulle copie:");
const giroC = (f, nome) => {
  for (let i = 0; i < 3; i++) f();
  const t = performance.now();
  let q = 0;
  for (let i = 0; i < 20; i++) q += f();
  console.log("  " + nome.padEnd(34) + ((performance.now() - t) / 20).toFixed(2) + " ms   (" + q + ")");
};
giroC(() => { let q = 0; for (const n of copie) if (n.vivo) q++; return q; }, "n.vivo");
giroC(() => { let q = 0; for (const n of copie) if (n.vivo && !n._padrone) q++; return q; }, "n.vivo && !n._padrone");
giroC(() => { let q = 0; for (const n of copie) if (n.vivo && n.inventory.size > 2) q++; return q; }, "n.vivo && n.inventory.size");
giroC(() => { let q = 0; for (const n of copie) if (n.vivo && n.empatia > 0.5) q++; return q; }, "n.vivo && n.empatia");

// ── QUALI CAMPI NASCONO PER STRADA ─────────────────────────────────────────────────────────────
// Si mette al mondo una persona nuova e si guarda che cosa ha addosso appena nata. Tutto ciò che
// il resto della gente ha in più è un campo che il costruttore non dichiara: è lì che si rompe la
// forma comune.
pop.spawn(1);
const appenaNato = pop.npcs[pop.npcs.length - 1];
const dalNulla = new Set(Object.keys(appenaNato));
const perStrada = tutti.filter((k) => !dalNulla.has(k));
console.log("");
console.log("campi dichiarati alla nascita: " + dalNulla.size);
console.log("campi che nascono per strada: " + perStrada.length);
console.log(perStrada.join(" "));

// ── E LE BESTIE? ───────────────────────────────────────────────────────────────────────────────
// Sono molte piu' delle persone, e vengono attraversate a ogni battito. Se anche loro hanno mille
// forme, il conto e' lo stesso.
if (pop.creature && pop.creature.length) {
  const bes = pop.creature;
  const rap = [];
  for (const a of bes) { let t = false; for (const r of rap) if (%HaveSameMap(a, r)) { t = true; break; } if (!t) rap.push(a); }
  console.log("");
  console.log("bestie " + bes.length + " · FORME DIVERSE: " + rap.length);
  const tuttiB = []; const vistiB = new Set();
  for (const a of bes) for (const k of Object.keys(a)) if (!vistiB.has(k)) { vistiB.add(k); tuttiB.push(k); }
  const base = new Set(Object.keys(rap[0]));
  console.log("campi diversi in tutto: " + tuttiB.length + " · la forma piu' comune ne ha " + base.size);
  const extra = tuttiB.filter((k) => !base.has(k));
  if (extra.length) console.log("campi che nascono per strada: " + extra.join(" "));
  const giroB = (f, nome) => {
    for (let i = 0; i < 3; i++) f();
    const t = performance.now();
    let q = 0;
    for (let i = 0; i < 20; i++) q += f();
    console.log("  " + nome.padEnd(34) + ((performance.now() - t) / 20).toFixed(2) + " ms   (" + q + ")");
  };
  giroB(() => { let q = 0; for (const a of bes) if (a.vivo) q++; return q; }, "a.vivo");
  giroB(() => { let q = 0; for (const a of bes) if (a.vivo && a.eta > 1) q++; return q; }, "a.vivo && a.eta");
}
