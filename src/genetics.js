// Livello 4 (bis) — Genetica e regioni.
// I FONDATORI ricevono la pigmentazione dal clima del luogo di nascita:
//   caldo -> più scuro, freddo -> più chiaro;  ovest -> rosso, est -> giallo.
// I FIGLI invece ereditano i geni dei genitori (media + mutazione): due regioni
// diverse producono una combinazione. Così le "razze" emergono e si mescolano.

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const clampT = (v) => Math.max(-1, Math.min(1, v));
function randTrait(r) { return 0.2 + r() * 0.6; }

// Colore della pelle da: melanina (0 chiaro .. 1 scuro) e tint (-1 rosso .. +1 giallo).
export function skinRGB(melanina, tint) {
  const light = [244, 223, 199], dark = [78, 52, 38];
  let r = light[0] + (dark[0] - light[0]) * melanina;
  let g = light[1] + (dark[1] - light[1]) * melanina;
  let b = light[2] + (dark[2] - light[2]) * melanina;
  const t = clampT(tint);
  // ovest (t<0): più rosso; est (t>0): più giallo
  r += (t < 0 ? -t * 22 : t * 10);
  g += (t > 0 ? t * 16 : t * 12);
  b += -Math.abs(t) * 14;
  const c = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return [c(r), c(g), c(b)];
}
export function skinHex(melanina, tint) {
  const [r, g, b] = skinRGB(melanina, tint);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Pigmentazione + adattamento dedotti da un tile del mondo (per i fondatori).
export function pigmentFromTile(world, x, y, r) {
  const i = (y | 0) * world.width + (x | 0);
  const temp = clamp01(world.temperature[i]);
  const long = x / world.width;              // 0 = ovest, 1 = est
  const noise = (amp) => (r ? (r() - 0.5) * amp : 0);
  return {
    melanina: clamp01(temp * 0.9 + 0.05 + noise(0.15)),
    tint: clampT((long * 2 - 1) + noise(0.3)),
    resFreddo: clamp01(1 - temp + noise(0.2)),
    resCaldo: clamp01(temp + noise(0.2)),
  };
}

// Tratti di PERSONALITÀ (permanenti, genetici). Includono le "virtù" e i "vizi" — che nel
// simulatore non sono morali ma VETTORI DI COMPORTAMENTO: l'invidia spinge a copiare/rubare,
// l'avidità ad accumulare, l'ira a vendicarsi, la pigrizia a inventare strumenti, ecc.
export const TRATTI = [
  "forza", "intelligenza", "coraggio", "aggressivita", "curiosita", "resistenza",
  "empatia", "onesta", "lealta", "ambizione",       // indole sociale
  "invidia", "avidita", "ira", "pigrizia", "superbia", "gola", // "vizi" = motori
  "conformismo",  // quanto segue il gruppo: alto = assimila memi/religione; basso = ribelle/eretico
  "volonta",      // perseguire il proprio obiettivo ANCHE quando è irrazionale (Newton, Napoleone)
  "pazienza",     // tolleranza al costo/tempo prima della ricompensa (risparmio, opere lunghe)
  "creativita",   // propensione a combinare idee in modo inedito (arte, invenzioni fuori norma)
  "socievolezza", // bisogno di stare in gruppo (coesione, feste) vs. solitudine
  "crudelta",     // piacere nel far male a prescindere dal tornaconto (tiranni, aguzzini)
  "spiritualita", // ricerca di significato: predispone a fede, riti, tabù
];

// BIAS COGNITIVI — "gli esseri umani NON sono razionali". Non sono geni ma DISTORSIONI della
// percezione con cui gli NPC valutano il mondo: la decisione nasce da ciò che CREDONO, non dai
// fatti. Elenco-contenuto; l'intensità di ciascuno per NPC deriva dai tratti (vedi npc.bias).
export const BIAS = [
  "conferma",      // cerca conferme alle proprie idee, ignora le smentite
  "cambiamento",   // paura del nuovo: preferisce lo status quo
  "imitazione",    // fa ciò che fanno gli altri (effetto gregge)
  "autorita",      // crede a chi comanda / al sacerdote
  "disponibilita", // sovrastima ciò che ha visto di recente
  "sicumera",      // eccesso di fiducia nelle proprie capacità
  "sunkcost",      // insiste in ciò in cui ha già investito, anche se perde
  "tribalismo",    // "noi" contro "loro": favorisce il gruppo, diffida degli estranei
];

// OUTLIER — "le anomalie fanno la storia". La popolazione segue una distribuzione normale, ma
// ~1% delle nascite ha UN tratto estremo (empatia 2/crudeltà 98 → tiranno; curiosità 100 →
// scienziato). Nessun ruolo scritto: solo code estreme della distribuzione.
function maybeOutlier(g, r) {
  if (r() > 0.012) return g;
  const t = TRATTI[(r() * TRATTI.length) | 0];
  g[t] = r() < 0.5 ? 0.02 + r() * 0.08 : 0.9 + r() * 0.08;
  return g;
}

// Geni completi di un fondatore nato in (x,y).
export function foundingGenes(world, x, y, r) {
  const p = pigmentFromTile(world, x, y, r);
  const g = { ...p };
  for (const t of TRATTI) g[t] = randTrait(r);
  return maybeOutlier(g, r);
}

// Eredità: media dei due genitori + mutazione.
export function childGenes(a, b, r) {
  const mix01 = (k, mut = 0.12) => clamp01(((a[k] || 0) + (b[k] || 0)) / 2 + (r() - 0.5) * mut);
  const mixT = (k, mut = 0.2) => clampT((a[k] + b[k]) / 2 + (r() - 0.5) * mut);
  const c = {
    melanina: mix01("melanina", 0.1),
    tint: mixT("tint", 0.15),
    resFreddo: mix01("resFreddo"), resCaldo: mix01("resCaldo"),
  };
  for (const t of TRATTI) c[t] = mix01(t);
  return maybeOutlier(c, r);
}
