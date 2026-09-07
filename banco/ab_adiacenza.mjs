// A/B DENTRO LO STESSO PROCESSO — l'unico confronto di cui ci si possa fidare.
//
// Confrontare due giri diversi del banco su questa macchina non funziona: dopo ore di carico la
// stessa identica misura torna il 10–15% più lenta, e quel rumore è più grande di quasi tutte le
// ottimizzazioni. Qui le due versioni della costruzione dei legami sociali stanno nello stesso
// file, girano sullo stesso mondo, alternate, e si confrontano anche i RISULTATI: se non escono
// le stesse identiche adiacenze, il confronto non vale niente.
import { corri } from "./sim.mjs";
const B = "../src/";
const { P } = await import(B + "params.js");

const { pop } = await corri(process.argv[2] || "scala", 58, +(process.argv[3] || 900));
const npcs = pop.npcs.filter((n) => n.vivo);
const world = pop.world;
const R2 = P.raggioLegame * P.raggioLegame;
const PASSO = Math.max(1, Math.round(P.passoFazioni || P.raggioLegame / 3));
const ANELLI = Math.ceil(P.raggioLegame / PASSO);
const Kdi = (n) => (P.cerchiaBase + n.intelligenza * P.cerchiaTesta + (n.socievolezza || 0.5) * P.cerchiaIndole) | 0;
const quota = (n) => world.elevation[((n.y | 0) * world.width + (n.x | 0))];

// ── PRIMA: Map con chiavi stringa, due array nuovi per persona, adiacenza in una Map ──────────
function prima() {
  const grid = new Map();
  for (const n of npcs) { const k = ((n.x / PASSO) | 0) + "," + ((n.y / PASSO) | 0); let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(n); }
  const adj = new Map();
  for (const n of npcs) {
    const cx = (n.x / PASSO) | 0, cy = (n.y / PASSO) | 0;
    const en = quota(n), K = Kdi(n);
    const vic = [], dis = [];
    for (let r = 0; r <= ANELLI; r++) {
      if (vic.length >= K) { const mf = (r - 1) * PASSO; if (mf > 0 && mf * mf >= dis[K - 1]) break; }
      for (let gy = cy - r; gy <= cy + r; gy++) for (let gx = cx - r; gx <= cx + r; gx++) {
        if (r > 0 && Math.abs(gx - cx) !== r && Math.abs(gy - cy) !== r) continue;
        const arr = grid.get(gx + "," + gy); if (!arr) continue;
        for (const m of arr) {
          if (m === n) continue;
          const d2 = (m.x - n.x) ** 2 + (m.y - n.y) ** 2; if (d2 > R2) continue;
          if (vic.length >= K && d2 >= dis[vic.length - 1]) continue;
          let j = vic.length < K ? vic.length : K - 1;
          while (j > 0 && dis[j - 1] > d2) { dis[j] = dis[j - 1]; vic[j] = vic[j - 1]; j--; }
          dis[j] = d2; vic[j] = m;
        }
      }
    }
    const out = [];
    for (let k = 0; k < vic.length; k++) {
      const m = vic[k];
      if ((n.memoria.get(m.id) || 0) + (m.memoria.get(n.id) || 0) <= -0.2) continue;
      out.push([m, Math.sqrt(dis[k]) * (1 + Math.abs(quota(m) - en) * 12)]);
    }
    adj.set(n, out);
  }
  return adj;
}

// ── DOPO: griglia piatta, buffer riusati, adiacenza in un array indicizzato ───────────────────
const MARG = 2;
const COL = Math.ceil(world.width / PASSO) + MARG * 2;
const RIG = Math.ceil(world.height / PASSO) + MARG * 2;
const cellaId = (c, r) => (r + MARG) * COL + (c + MARG);
const dentroG = (c, r) => c + MARG >= 0 && r + MARG >= 0 && c + MARG < COL && r + MARG < RIG;
const K_MAX = ((P.cerchiaBase + P.cerchiaTesta + P.cerchiaIndole) | 0) + 2;
const vicB = new Array(K_MAX), disB = new Float64Array(K_MAX);
function dopo() {
  const grid = new Array(COL * RIG).fill(null);
  for (let i = 0; i < npcs.length; i++) {
    const n = npcs[i]; n._iF = i;
    const c = (n.x / PASSO) | 0, r = (n.y / PASSO) | 0;
    if (!dentroG(c, r)) continue;
    const k = cellaId(c, r);
    (grid[k] || (grid[k] = [])).push(n);
  }
  const adj = new Array(npcs.length);
  for (const n of npcs) {
    const cx = (n.x / PASSO) | 0, cy = (n.y / PASSO) | 0;
    const en = quota(n), K = Kdi(n);
    let nv = 0;
    for (let r = 0; r <= ANELLI; r++) {
      if (nv >= K) { const mf = (r - 1) * PASSO; if (mf > 0 && mf * mf >= disB[K - 1]) break; }
      for (let gy = cy - r; gy <= cy + r; gy++) for (let gx = cx - r; gx <= cx + r; gx++) {
        if (r > 0 && Math.abs(gx - cx) !== r && Math.abs(gy - cy) !== r) continue;
        if (!dentroG(gx, gy)) continue;
        const arr = grid[cellaId(gx, gy)]; if (!arr) continue;
        for (const m of arr) {
          if (m === n) continue;
          const d2 = (m.x - n.x) ** 2 + (m.y - n.y) ** 2; if (d2 > R2) continue;
          if (nv >= K && d2 >= disB[nv - 1]) continue;
          let j = nv < K ? nv : K - 1;
          while (j > 0 && disB[j - 1] > d2) { disB[j] = disB[j - 1]; vicB[j] = vicB[j - 1]; j--; }
          disB[j] = d2; vicB[j] = m;
          if (nv < K) nv++;
        }
      }
    }
    const out = [];
    for (let k = 0; k < nv; k++) {
      const m = vicB[k];
      if ((n.memoria.get(m.id) || 0) + (m.memoria.get(n.id) || 0) <= -0.2) continue;
      out.push([m, Math.sqrt(disB[k]) * (1 + Math.abs(quota(m) - en) * 12)]);
    }
    adj[n._iF] = out;
  }
  return adj;
}

// ── POTATA: come "dopo", ma salta le celle che NON POSSONO contenere un candidato migliore ───
//
// Per ogni cella si calcola la distanza minima possibile fra la persona e QUALUNQUE punto di quella
// cella. Se quel minimo e' gia' peggiore del K-esimo vicino che si ha in mano, nessuno di quella
// cella potrebbe entrare — e si salta l'intera cella senza calcolare una sola distanza.
//
// E' esatta, non approssimata: il codice originale scarta un candidato con `d2 >= dis[nv-1]`, e
// ogni candidato di una cella saltata avrebbe per forza d2 >= minimo >= dis[nv-1]. Stesso esito.
function potata() {
  const grid = new Array(COL * RIG).fill(null);
  for (let i = 0; i < npcs.length; i++) {
    const n = npcs[i]; n._iF = i;
    const c = (n.x / PASSO) | 0, r = (n.y / PASSO) | 0;
    if (!dentroG(c, r)) continue;
    const k = cellaId(c, r);
    (grid[k] || (grid[k] = [])).push(n);
  }
  const adj = new Array(npcs.length);
  for (const n of npcs) {
    const cx = (n.x / PASSO) | 0, cy = (n.y / PASSO) | 0;
    const en = quota(n), K = Kdi(n);
    let nv = 0;
    for (let r = 0; r <= ANELLI; r++) {
      if (nv >= K) { const mf = (r - 1) * PASSO; if (mf > 0 && mf * mf >= disB[K - 1]) break; }
      for (let gy = cy - r; gy <= cy + r; gy++) for (let gx = cx - r; gx <= cx + r; gx++) {
        if (r > 0 && Math.abs(gx - cx) !== r && Math.abs(gy - cy) !== r) continue;
        if (!dentroG(gx, gy)) continue;
        const arr = grid[cellaId(gx, gy)]; if (!arr) continue;
        // il limite inferiore della cella: quanto puo' avvicinarsi al massimo
        if (nv >= K) {
          const x0 = gx * PASSO, y0 = gy * PASSO;
          const ddx = n.x < x0 ? x0 - n.x : (n.x > x0 + PASSO ? n.x - x0 - PASSO : 0);
          const ddy = n.y < y0 ? y0 - n.y : (n.y > y0 + PASSO ? n.y - y0 - PASSO : 0);
          if (ddx * ddx + ddy * ddy >= disB[nv - 1]) continue;      // cella impossibile: si salta
        }
        for (const m of arr) {
          if (m === n) continue;
          const d2 = (m.x - n.x) ** 2 + (m.y - n.y) ** 2; if (d2 > R2) continue;
          if (nv >= K && d2 >= disB[nv - 1]) continue;
          let j = nv < K ? nv : K - 1;
          while (j > 0 && disB[j - 1] > d2) { disB[j] = disB[j - 1]; vicB[j] = vicB[j - 1]; j--; }
          disB[j] = d2; vicB[j] = m;
          if (nv < K) nv++;
        }
      }
    }
    const out = [];
    for (let k = 0; k < nv; k++) {
      const m = vicB[k];
      if ((n.memoria.get(m.id) || 0) + (m.memoria.get(n.id) || 0) <= -0.2) continue;
      out.push([m, Math.sqrt(disB[k]) * (1 + Math.abs(quota(m) - en) * 12)]);
    }
    adj[n._iF] = out;
  }
  return adj;
}

// ── prima di cronometrare: danno le STESSE adiacenze? ─────────────────────────────────────────
const a1 = prima(), a2 = dopo(), a3 = potata();
let diff = 0, diffP = 0, archi = 0;
for (const n of npcs) {
  const x = a1.get(n) || [], y = a2[n._iF] || [], z = a3[n._iF] || [];
  if (x.length !== y.length) diff++;
  else for (let i = 0; i < x.length; i++) {
    archi++;
    if (x[i][0] !== y[i][0] || Math.abs(x[i][1] - y[i][1]) > 1e-9) { diff++; break; }
  }
  if (x.length !== z.length) diffP++;
  else for (let i = 0; i < x.length; i++) {
    if (x[i][0] !== z[i][0] || Math.abs(x[i][1] - z[i][1]) > 1e-9) { diffP++; break; }
  }
}
console.log("gente=" + npcs.length + " · archi=" + archi +
  " · differenze dopo=" + diff + " · differenze potata=" + diffP +
  (diff || diffP ? "  ✗ IL CONFRONTO NON VALE" : "  ✓"));
if (diff || diffP) process.exit(1);

// ── alternate, così la macchina tratta le due allo stesso modo ────────────────────────────────
for (let i = 0; i < 3; i++) { prima(); dopo(); potata(); }          // si scalda
const N = +(process.env.GIRI || 10);
let tp = 0, td = 0, tq = 0;
for (let i = 0; i < N; i++) {
  // avanti e indietro, cosi' la macchina tratta le tre allo stesso modo
  let t = performance.now(); prima(); tp += performance.now() - t;
  t = performance.now(); dopo(); td += performance.now() - t;
  t = performance.now(); potata(); tq += performance.now() - t;
  t = performance.now(); potata(); tq += performance.now() - t;
  t = performance.now(); dopo(); td += performance.now() - t;
  t = performance.now(); prima(); tp += performance.now() - t;
}
const p = tp / (N * 2), d = td / (N * 2), q = tq / (N * 2);
const pct = (a, b) => (b < a ? "−" + ((1 - b / a) * 100).toFixed(0) : "+" + ((b / a - 1) * 100).toFixed(0)) + "%";
console.log("prima  " + p.toFixed(1) + " ms");
console.log("dopo   " + d.toFixed(1) + " ms   (" + pct(p, d) + " contro prima)");
console.log("potata " + q.toFixed(1) + " ms   (" + pct(p, q) + " contro prima, " + pct(d, q) + " contro dopo)");
