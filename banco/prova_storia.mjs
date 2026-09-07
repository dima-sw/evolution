// LA STORIA DICE IL VERO?
//
// Ho aggiunto settantasei serie e ventotto figure, e per un po' non c'era una sola prova che i
// numeri registrati fossero quelli del motore. È il debito peggiore possibile, perché un grafico
// sbagliato non sembra rotto: sembra un fatto. E stasera mi è già successo tre volte di leggere
// un numero che non contava quel che credevo (un `Proxy` che misurava se stesso, uno `stderr`
// silenziato, e `pop.ribelli` che un altro modulo riscriveva a ogni passo).
//
// Qui si controllano quattro cose, in ordine di quanto fanno male se sbagliate:
//
//   1. NESSUNA SERIE È MUTA. Se una serie legge un campo che non esiste — un nome sbagliato, un
//      campo rinominato — `campiona()` scrive zero e non se ne accorge nessuno. Una serie che
//      resta a zero per tutta la partita è o un errore di nome o un fenomeno che non accade mai:
//      tutt'e due cose da sapere, e nessuna delle due si vede guardando un grafico piatto.
//   2. NESSUNA SERIE ESPLODE. Un valore che non è finito (NaN, infinito) rompe la scala di tutto
//      il riquadro e fa sparire le altre linee.
//   3. L'ANELLO NON MENTE. Scrivendo più campioni della capienza, i vecchi devono perdersi e i
//      superstiti devono restare in ORDINE. Un anello letto male mescola il passato col presente,
//      ed è l'errore che produce grafici bellissimi e falsi.
//   4. IL RITMO È UNA DERIVATA VERA. Su un totale che cresce di un tanto costante per anno, il
//      ritmo deve dare quel tanto — non il totale, non il tanto diviso per il numero di campioni.
//
// uso: node banco/prova_storia.mjs [seed] [tick]
import { corri } from "./sim.mjs";
const B = "../src/";
const { Storia, SERIE, distribuzione } = await import(B + "storia.js");
const { RIQUADRI } = await import(B + "grafici.js");

let guasti = 0;
const ok = (buono, testo, dettaglio = "") => {
  console.log((buono ? "  ✓ " : "  ✗ ") + testo + (dettaglio ? "   " + dettaglio : ""));
  if (!buono) guasti++;
};

// ── 3 e 4: l'anello e il ritmo, su numeri inventati apposta ───────────────────────────────────
// Prima del mondo vero: se l'anello sbaglia, ogni misura successiva è carta straccia.
{
  console.log("L'ANELLO E IL RITMO (su numeri costruiti apposta)");
  const st = new Storia(10);
  // si finge di campionare: anno che avanza di 2, e una serie cumulativa che cresce di 6 per anno
  for (let i = 0; i < 25; i++) {
    const j = st.n % st.cap;
    st.anno[j] = i * 2;
    st.dati.get("nascite")[j] = i * 12;      // 12 per campione = 6 per anno
    st.dati.get("vivi")[j] = i;
    st.n++;
  }
  const v = st.leggi("vivi");
  ok(v.y.length === 10, "l'anello tiene solo la sua capienza", v.y.length + " campioni su 25 scritti");
  ok(v.y[0] === 15 && v.y[9] === 24, "sopravvivono gli ULTIMI, non i primi", "primo " + v.y[0] + " · ultimo " + v.y[9]);
  let crescente = true;
  for (let i = 1; i < v.x.length; i++) if (v.x[i] <= v.x[i - 1]) crescente = false;
  ok(crescente, "e restano in ordine cronologico");
  const r = st.leggiRitmo("nascite");
  const tutti6 = r.y.every((y) => Math.abs(y - 6) < 1e-6);
  ok(tutti6, "il ritmo è una derivata sul TEMPO, non sui campioni", "atteso 6/anno, letto " + (r.y[0] || 0).toFixed(3));
}

// ── il mondo vero ─────────────────────────────────────────────────────────────────────────────
const { pop } = await corri(process.argv[2] || "storia", 58, +(process.argv[3] || 420));
const storia = new Storia();
// si ricampiona il mondo com'è adesso, più volte, così le serie hanno di che riempirsi
for (let i = 0; i < 5; i++) { pop.anno += 0.35; storia.campiona(pop, pop.stats()); }

console.log("\nLE SERIE (mondo a " + pop.npcs.filter((n) => n.vivo).length + " vivi, anno " + (pop.anno | 0) + ")");
const mute = [], rotte = [];
for (const d of SERIE) {
  const { y } = storia.leggi(d.k);
  let vive = false, finita = true;
  for (const v of y) { if (v !== 0) vive = true; if (!isFinite(v)) finita = false; }
  if (!vive) mute.push(d.k);
  if (!finita) rotte.push(d.k);
}
ok(rotte.length === 0, "nessuna serie produce valori non finiti", rotte.join(" "));
// Le mute non sono per forza un errore: la guerra può non essere ancora scoppiata. Ma vanno DETTE,
// perché è lì che si nasconde un nome sbagliato — e un nome sbagliato non si vede mai da solo.
console.log("  · serie ancora a zero (" + mute.length + " su " + SERIE.length + "): " +
  (mute.join(" ") || "nessuna"));
console.log("    (a zero può voler dire «non è ancora successo», ma anche «il campo non esiste»:");
console.log("     se una resta muta in partite lunghe e diverse, è un nome sbagliato.)");

// ── I NOMI ESISTONO DAVVERO? ──────────────────────────────────────────────────────────────────
// Una serie a zero può essere un fenomeno che non è ancora accaduto oppure un campo scritto male, e
// dal valore le due cose sono indistinguibili: `s.credennti || 0` fa zero esattamente come una
// religione che non è ancora nata. Qui si guarda quali chiavi ogni serie LEGGE davvero, e si
// controlla che esistano nell'oggetto vero.
//
// (Sì, un `Proxy`. Stasera me ne ha fregato uno perché lo avevo messo in un ciclo caldo a contare
//  il lavoro, e misurava se stesso. Qui non si misura niente: si guarda una volta sola chi legge
//  che cosa, ed è esattamente il mestiere per cui un Proxy è fatto.)
console.log("");
console.log("I NOMI");
{
  const vero = pop.stats();
  const lette = new Map();
  for (const d of SERIE) {
    const viste = new Set();
    const spia = new Proxy(vero, { get: (t, k) => { if (typeof k === "string") viste.add(k); return t[k]; } });
    try { d.da(spia, pop); } catch (e) { /* già coperto dal controllo dei valori non finiti */ }
    lette.set(d.k, viste);
  }
  const inesistenti = [];
  for (const [k, viste] of lette) {
    for (const campo of viste) {
      if (!(campo in vero)) inesistenti.push(k + " legge s." + campo);
    }
  }
  ok(inesistenti.length === 0, "ogni serie legge campi che esistono in stats()", inesistenti.join(" · "));
  // e adesso le mute si possono giudicare
  for (const k of mute) {
    const campi = [...lette.get(k)].filter((c) => c in vero).map((c) => c + "=" + JSON.stringify(vero[c]));
    console.log("    «" + k + "» è a zero perché vale davvero zero: " + (campi.join(" ") || "(legge da pop, non da stats)"));
  }
}

// ── le figure chiedono serie che esistono? ────────────────────────────────────────────────────
// Un riquadro che nomina una serie inesistente disegna una linea piatta a zero, e sembra un fatto.
console.log("\nLE FIGURE");
const chiavi = new Set(SERIE.map((d) => d.k));
const orfane = [];
for (const r of RIQUADRI) for (const s of r.serie || []) if (!chiavi.has(s.k)) orfane.push(r.titolo + " → " + s.k);
ok(orfane.length === 0, "ogni linea disegnata ha una serie che esiste", orfane.join(" · "));
const quali = ["fame", "eta", "agiatezza", "lingua", "salute", "sapere"];
const istoRotti = RIQUADRI.filter((r) => r.tipo === "isto" && !quali.includes(r.quale));
ok(istoRotti.length === 0, "ogni istogramma chiede una distribuzione che si sa calcolare",
  istoRotti.map((r) => r.quale).join(" "));

// ── le distribuzioni ──────────────────────────────────────────────────────────────────────────
console.log("\nLE DISTRIBUZIONI");
const vivi = pop.npcs.filter((n) => n.vivo).length;
for (const q of quali) {
  const d = distribuzione(pop, q);
  const somma = d.conti.reduce((a, b) => a + b, 0);
  ok(d.n > 0 && somma === d.n,
    "«" + q + "»: ogni persona finisce in una cella e in una sola",
    somma + " contati su " + d.n + " considerati (vivi " + vivi + ")");
}

console.log("\n" + (guasti ? "✗ " + guasti + " GUASTI" : "✓ tutto a posto"));
process.exit(guasti ? 1 : 0);
