// A/B DENTRO LO STESSO PROCESSO — la potatura SEMANTICA.
//
// Due sottosistemi della società fanno insieme il 60% del suo tempo, e fanno la stessa identica
// cosa: qualcuno con qualcosa in mano si guarda intorno cercando un DISPERATO — chi non ha niente
// nell'inventario ed ha fame. Nella maggior parte dei casi in giro non c'è nessuno così, e lo si
// scopre solo dopo aver esaminato duecentocinquanta persone una per una.
//
// L'idea è la stessa della potatura geometrica delle fazioni, spostata dalla distanza al
// CONTENUTO: se in nessuna delle nove celle attorno c'è un disperato, non c'è niente da cercare.
// Si tiene un conto per cella di quanti disperati ci sono, e se il vicinato ne ha zero si salta.
//
// È esatta, non approssimata: quel ciclo produce un effetto SOLO su chi soddisfa quella
// condizione. Zero disperati intorno ⇒ nessun effetto, comunque lo si scopra. E non tocca i dadi:
// l'estrazione avviene PRIMA della ricerca, quindi la sequenza casuale resta identica.
//
// Qui i due cicli non modificano niente: registrano CHI avrebbe scelto CHI. Se le due versioni non
// scrivono la stessa identica lista, il confronto non vale niente e il banco si ferma.
import { corri } from "./sim.mjs";
const B = "../src/";
const { P } = await import(B + "params.js");

const { pop } = await corri(process.argv[2] || "scala", 58, +(process.argv[3] || 900));
const npcs = pop.npcs;
console.log("gente " + npcs.filter((n) => n.vivo).length);

const CELL = 10, MARG = 2;
const COL = Math.ceil(pop.world.width / CELL) + MARG * 2;
const RIG = Math.ceil(pop.world.height / CELL) + MARG * 2;
const idC = (c, r) => (r + MARG) * COL + (c + MARG);
const dentro = (c, r) => c + MARG >= 0 && r + MARG >= 0 && c + MARG < COL && r + MARG < RIG;
const grid = new Array(COL * RIG).fill(null);
for (const n of npcs) {
  if (!n.vivo) continue;
  const c = (n.x / CELL) | 0, r = (n.y / CELL) | 0;
  if (!dentro(c, r)) continue;
  const k = idC(c, r);
  (grid[k] || (grid[k] = [])).push(n);
}
const vicini = (n) => {
  const cx = (n.x / CELL) | 0, cy = (n.y / CELL) | 0;
  const out = [];
  for (let gy = cy - 1; gy <= cy + 1; gy++) for (let gx = cx - 1; gx <= cx + 1; gx++) {
    if (!dentro(gx, gy)) continue;
    const arr = grid[idC(gx, gy)];
    if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
  }
  return out;
};

// chi tenta: si fissa una volta, così le due versioni provano esattamente sulle stesse persone.
// Nel motore vero è un tiro di dado che avviene PRIMA della ricerca, e la potatura non lo tocca.
const dt = 0.35;
const tentanoDono = [], tentanoCoerc = [];
{
  let s = 12345;
  const dado = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (const npc of npcs) {
    if (!npc.vivo || npc.inventory.size < 3 || npc.empatia < 0.55) continue;
    if (dado() > dt * P.probDono) continue;
    tentanoDono.push(npc);
  }
  for (const npc of npcs) {
    if (!npc.vivo || npc.inventory.size < 4) continue;
    const dom = npc.aggressivita * 0.4 + npc.avidita * 0.4 + (npc.crudelta || 0.3) * 0.4 - npc.empatia * 0.5;
    if (dom < 0.4 || dado() > dt * P.probCoercizione) continue;
    tentanoCoerc.push(npc);
  }
}
console.log("tentano un dono " + tentanoDono.length + " · tentano di sottomettere " + tentanoCoerc.length);

// ── PRIMA: si guarda in faccia tutto il vicinato ───────────────────────────────────────────────
function primaDoni(out) {
  for (const npc of tentanoDono) {
    for (const altro of vicini(npc)) {
      if (altro === npc || !altro.vivo || altro.inventory.size > 0 || altro.fame < 0.6) continue;
      out.push(npc.id * 1e7 + altro.id); break;
    }
  }
}
function primaCoerc(out) {
  for (const npc of tentanoCoerc) {
    for (const altro of vicini(npc)) {
      if (altro === npc || !altro.vivo || altro._padrone) continue;
      if (!(altro.fame > 0.7 && altro.inventory.size === 0 && altro.forza < npc.forza && altro.coraggio < 0.5)) continue;
      out.push(npc.id * 1e7 + altro.id); break;
    }
  }
}

// ── DOPO: quante celle contengono qualcuno che potrebbe ricevere? ──────────────────────────────
// Due conti diversi, perché le due condizioni sono diverse: il dono cerca chi non ha nulla ed ha
// fame; la sottomissione cerca chi non ha nulla, ha molta fame, poco coraggio e nessun padrone.
const contaDono = new Int32Array(COL * RIG), contaCoerc = new Int32Array(COL * RIG);
function conta() {
  contaDono.fill(0); contaCoerc.fill(0);
  for (const n of npcs) {
    if (!n.vivo || n.inventory.size !== 0) continue;
    const c = (n.x / CELL) | 0, r = (n.y / CELL) | 0;
    if (!dentro(c, r)) continue;
    const k = idC(c, r);
    if (n.fame >= 0.6) contaDono[k]++;
    if (n.fame > 0.7 && n.coraggio < 0.5 && !n._padrone) contaCoerc[k]++;
  }
}
const vuoto = (conteggio, n) => {
  const cx = (n.x / CELL) | 0, cy = (n.y / CELL) | 0;
  for (let gy = cy - 1; gy <= cy + 1; gy++) for (let gx = cx - 1; gx <= cx + 1; gx++) {
    if (!dentro(gx, gy)) continue;
    if (conteggio[idC(gx, gy)] > 0) return false;
  }
  return true;
};
function dopoDoni(out) {
  for (const npc of tentanoDono) {
    if (vuoto(contaDono, npc)) continue;                 // in giro non c'è nessun disperato
    for (const altro of vicini(npc)) {
      if (altro === npc || !altro.vivo || altro.inventory.size > 0 || altro.fame < 0.6) continue;
      out.push(npc.id * 1e7 + altro.id); break;
    }
  }
}
function dopoCoerc(out) {
  for (const npc of tentanoCoerc) {
    if (vuoto(contaCoerc, npc)) continue;
    for (const altro of vicini(npc)) {
      if (altro === npc || !altro.vivo || altro._padrone) continue;
      if (!(altro.fame > 0.7 && altro.inventory.size === 0 && altro.forza < npc.forza && altro.coraggio < 0.5)) continue;
      out.push(npc.id * 1e7 + altro.id); break;
    }
  }
}

// ── danno le STESSE scelte? ────────────────────────────────────────────────────────────────────
conta();
const a1 = [], a2 = [], b1 = [], b2 = [];
primaDoni(a1); dopoDoni(a2); primaCoerc(b1); dopoCoerc(b2);
const uguali = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
const ok = uguali(a1, a2) && uguali(b1, b2);
console.log("doni scelti " + a1.length + " (potata " + a2.length + ") · sottomissioni " + b1.length +
  " (potata " + b2.length + ")" + (ok ? "  ✓" : "  ✗ IL CONFRONTO NON VALE"));
if (!ok) process.exit(1);

let saltatiD = 0, saltatiC = 0;
for (const n of tentanoDono) if (vuoto(contaDono, n)) saltatiD++;
for (const n of tentanoCoerc) if (vuoto(contaCoerc, n)) saltatiC++;
console.log("ricerche saltate: doni " + saltatiD + "/" + tentanoDono.length +
  " · sottomissioni " + saltatiC + "/" + tentanoCoerc.length);

// I TEMPI VANNO PRESI SUL MONDO INTATTO, e la prima volta avevo sbagliato l'ordine: la prova dei
// disperati riduce in miseria migliaia di persone, e su QUEL mondo la potatura non salta piu'
// niente — paga solo il censimento. Cronometrare li' dentro misura il caso peggiore e lo spaccia
// per il caso normale. Prima i tempi, poi si sporca il mondo.
// ── i tempi, alternati ─────────────────────────────────────────────────────────────────────────
for (let i = 0; i < 3; i++) { const t = []; primaDoni(t); dopoDoni(t); primaCoerc(t); dopoCoerc(t); conta(); }
const N = +(process.env.GIRI || 20);
let tp = 0, td = 0;
for (let i = 0; i < N; i++) {
  let t = performance.now(); { const o = []; primaDoni(o); primaCoerc(o); } tp += performance.now() - t;
  t = performance.now(); { const o = []; conta(); dopoDoni(o); dopoCoerc(o); } td += performance.now() - t;
  t = performance.now(); { const o = []; conta(); dopoDoni(o); dopoCoerc(o); } td += performance.now() - t;
  t = performance.now(); { const o = []; primaDoni(o); primaCoerc(o); } tp += performance.now() - t;
}
const p = tp / (N * 2), d = td / (N * 2);
console.log("");
console.log("prima  " + p.toFixed(2) + " ms   (doni + sottomissioni, per passo di società)");
console.log("dopo   " + d.toFixed(2) + " ms   (conteggio incluso) — " +
  (d < p ? "−" + ((1 - d / p) * 100).toFixed(0) : "+" + ((d / p - 1) * 100).toFixed(0)) + "%");

// ── E SE IL MONDO FOSSE PIENO DI DISPERATI? ───────────────────────────────────────────────────
// Il confronto qui sopra ha un buco, e va detto: in questo mondo le sottomissioni sono ZERO sia
// prima sia dopo. Due liste vuote coincidono sempre — non e' una verifica, e' una coincidenza.
// La potatura della coercizione, li', non e' provata: e' solo argomentata.
//
// Allora si forza il caso che conta. Si prende della gente a caso e la si riduce alla condizione
// che quei cicli cercano — niente in mano, fame, poco coraggio, nessun padrone — e si guarda se le
// due versioni scelgono ancora le stesse identiche persone. Se la potatura sbaglia, sbaglia qui.
console.log("");
console.log("con dei disperati veri nel mondo:");
let semePr = 999;
const dadoPr = () => ((semePr = (semePr * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const viviTutti = npcs.filter((n) => n.vivo);
for (const quanti of [1, 10, 100, 1000, 5000]) {
  for (let i = 0; i < quanti; i++) {
    const n = viviTutti[(dadoPr() * viviTutti.length) | 0];
    n.inventory.clear(); n.fame = 0.95; n.coraggio = 0.2; n._padrone = undefined;
  }
  conta();
  const c1 = [], c2 = [], d1 = [], d2 = [];
  primaDoni(c1); dopoDoni(c2); primaCoerc(d1); dopoCoerc(d2);
  const bene = uguali(c1, c2) && uguali(d1, d2);
  console.log("  ~" + String(quanti).padStart(4) + " ridotti in miseria · doni " +
    String(c1.length).padStart(4) + " (potata " + String(c2.length).padStart(4) + ") · sottomissioni " +
    String(d1.length).padStart(4) + " (potata " + String(d2.length).padStart(4) + ")" +
    (bene ? "  ✓" : "  ✗ LA POTATURA SBAGLIA"));
  if (!bene) process.exit(1);
}
