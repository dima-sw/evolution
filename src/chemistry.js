// Livello 3 rivoluzionato — CHIMICA EMERGENTE.
// Niente ricette: si combinano gli attributi dei materiali secondo formule.
// Da attributi + soglie emerge la categoria (arma/medicina/veleno/cibo/lega...),
// la stabilità e gli effetti. Il database contiene LE LEGGI, non gli oggetti.
import { splendore } from "./desire.js";
import { PROPS } from "./materials.js";
import { P } from "./params.js";

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// PROCESSI — la "fisica" della lavorazione. Non sono ricette: sono LEGGI che trasformano
// gli attributi di una miscela. La stessa miscela + processo diverso = risultato diverso.
// (macinare farina, cuocere mattoni, fondere metalli, martellare acciaio, filare tele...)
// Questo moltiplica lo spazio delle invenzioni di migliaia di volte.
const mul = (attr, k, f) => { attr[k] = clamp01((attr[k] || 0) * f); };
const add = (attr, k, d) => { attr[k] = clamp01((attr[k] || 0) + d); };
export const PROCESSES = [
  { id: "grezzo",     nome: "Grezzo",     icona: "◻️", t: (a) => a },
  { id: "macinare",   nome: "Macinare",   icona: "🌀", t: (a) => { mul(a, "durezza", .5); mul(a, "fragilita", .7); mul(a, "taglio", .4); mul(a, "nutriente", 1.2); add(a, "legame", .1); } },
  { id: "cuocere",    nome: "Cuocere",    icona: "🔥", t: (a) => { mul(a, "tossicita", .35); mul(a, "nutriente", 1.3); mul(a, "bioattivo", .9); mul(a, "reattivita", .7); mul(a, "durezza", 1.25); mul(a, "energiaChim", .5); } },
  { id: "essiccare",  nome: "Essiccare",  icona: "🌬️", t: (a) => { mul(a, "tossicita", .8); mul(a, "peso", .7); mul(a, "durezza", 1.1); mul(a, "nutriente", 1.1); } },
  { id: "fermentare", nome: "Fermentare", icona: "🫧", t: (a) => { mul(a, "energiaChim", 1.3); mul(a, "tossicita", 1.2); mul(a, "bioattivo", 1.2); mul(a, "nutriente", .9); mul(a, "valore", 1.3); } },
  { id: "fondere",    nome: "Fondere",    icona: "🌋", t: (a) => { mul(a, "durezza", 1.3); mul(a, "fragilita", .5); mul(a, "legame", 1.3); mul(a, "taglio", 1.2); mul(a, "conducibilita", 1.15); } },
  { id: "martellare", nome: "Martellare", icona: "🔨", t: (a) => { mul(a, "durezza", 1.3); mul(a, "fragilita", .5); mul(a, "taglio", 1.35); add(a, "peso", .05); } },
  { id: "filare",     nome: "Filare",     icona: "🧵", t: (a) => { mul(a, "elasticita", 1.5); mul(a, "durezza", .8); mul(a, "portanza", 1.3); mul(a, "peso", .6); } },
  { id: "pressare",   nome: "Pressare",   icona: "🗜️", t: (a) => { mul(a, "peso", 1.2); mul(a, "energiaChim", 1.15); mul(a, "legame", 1.15); mul(a, "durezza", 1.1); } },
  { id: "distillare", nome: "Distillare", icona: "⚗️", t: (a) => { mul(a, "volatilita", 1.6); mul(a, "bioattivo", 1.4); mul(a, "energiaChim", 1.3); mul(a, "tossicita", 1.2); mul(a, "peso", .6); mul(a, "nutriente", .5); } },
  { id: "affumicare", nome: "Affumicare", icona: "💨", t: (a) => { mul(a, "tossicita", .5); mul(a, "reattivita", .7); mul(a, "nutriente", 1.05); mul(a, "durezza", 1.05); add(a, "legame", .05); } },
  { id: "conciare",   nome: "Conciare",   icona: "🥾", t: (a) => { mul(a, "durezza", 1.2); mul(a, "elasticita", 1.2); mul(a, "legame", 1.2); mul(a, "porosita", .5); mul(a, "fragilita", .6); } },
  { id: "temperare",  nome: "Temperare",  icona: "❄️", t: (a) => { mul(a, "durezza", 1.4); mul(a, "taglio", 1.2); mul(a, "fragilita", .7); mul(a, "elasticita", 1.1); } },
  { id: "soffiare",   nome: "Soffiare",   icona: "🫧", t: (a) => { mul(a, "trasparenza", 1.8); mul(a, "durezza", 1.15); mul(a, "fragilita", 1.3); mul(a, "porosita", .3); } },
];
export function getProcess(id) { return PROCESSES.find((p) => p.id === id) || PROCESSES[0]; }

// Combina una miscela [{matId, qta}] con un PROCESSO opzionale. Gli attributi sono la MEDIA
// PESATA (composizione, indipendente dalla quantità), poi trasformati dal processo.
export function combine(ingredienti, registry, processo = "grezzo") {
  const attr = {};
  for (const { key } of PROPS) attr[key] = 0;
  let totQ = 0, distinct = 0;
  for (const ing of ingredienti) {
    const mat = registry.mat(ing.matId);
    if (!mat) continue;
    const q = Math.max(0, ing.qta || 0); if (!q) continue;
    totQ += q; distinct++;
    for (const { key } of PROPS) attr[key] += (mat.props[key] || 0) * q;
  }
  if (totQ) for (const { key } of PROPS) attr[key] /= totQ; // media pesata = composizione
  const proc = getProcess(processo);
  proc.t(attr); // il processo trasforma gli attributi
  return { attr, totQ, distinct, processo: proc.id };
}

// FISIOLOGIA — la LEGGE (biochimica) di come un ORGANISMO reagisce a una sostanza. NON è una
// proprietà del materiale: nutrimento/veleno/cura NON esistono più come attributi. Emergono qui,
// dalle sole proprietà fondamentali. È l'organismo a "interpretare" la sostanza — e classify()
// deciderà l'affordance (cibo/veleno/medicina). Paracelso: "è la dose che fa il veleno".
export function physiology(attr) {
  const t = attr.tossicita || 0;
  const bio = attr.bioattivo || 0;
  const nutr = attr.nutriente || 0;
  // Quanto ne sai tirare fuori: la sostanza può esserci tutta e non servirti a niente. È la
  // differenza fra il grano e la segatura, e non sta nella quantità — sta nel tuo intestino.
  const dig = attr.digeribilita !== undefined ? attr.digeribilita : 0.8;
  // Nutrimento: energia bio-disponibile, guastata dalle tossine.
  const nutrimento = Math.max(0, nutr * dig * (1 - t * 0.7));
  // Un principio bioattivo GIOVA se poco tossico (medicina) e NUOCE se molto tossico (veleno):
  // stesso composto, esito opposto secondo la tossicità → il veleno emerge dalla dose.
  const beneficio = Math.max(0, bio * (1 - t * 1.3));
  const danno = Math.max(0, t - bio * 0.25);
  return { nutrimento, beneficio, danno };
}
// Energia sprigionata: l'energia chimica conta solo se la materia è REATTIVA (→ esplosione/fuoco).
const explosivePower = (attr) => (attr.energiaChim || 0) * (0.3 + 0.7 * (attr.reattivita || 0));

// Analizza una miscela. `potenza` cresce coi materiali distinti ("più miscugli = più potenza, ma
// più instabile"). La stabilità cala con energia reattiva/fragilità/conflitto dose e con la
// potenza; gli stabilizzanti la alzano. Gli effetti sul corpo derivano dalla fisiologia.
export function analyze(c) {
  const attr = c.attr;
  const phys = physiology(attr);
  const esplosivo = explosivePower(attr);
  const potenza = 1 + 0.3 * Math.max(0, (c.distinct || 1) - 1); // ogni ingrediente in più aumenta la potenza
  const rawPower = (attr.taglio + phys.danno + phys.beneficio + esplosivo) * potenza;
  const conflict = 2 * Math.min(phys.beneficio, phys.danno) * potenza;
  const stab = attr.stabilizzante;
  // Il LEGAME (coesione tra i materiali) alza molto la stabilità: materiali che si
  // legano bene tengono insieme la miscela; quelli che si legano male la rendono instabile.
  const legame = attr.legame;
  const instab = clamp01(
    0.28 * esplosivo * potenza + 0.4 * attr.fragilita + 0.35 * conflict + 0.12 * rawPower
    + 0.04 * ((c.totQ || 1) - 1) - 1.1 * stab - 0.55 * legame + 0.2
  );
  const stabilita = 1 - instab;

  // Effetti netti: scalano con la potenza; lo stabilizzante attenua danno ed energia.
  const effVeleno = Math.max(0, phys.danno - stab * 0.8) * potenza * (0.5 + 0.5 * stabilita);
  const effCura = phys.beneficio * potenza * stabilita;
  const effNutrimento = phys.nutrimento * potenza * stabilita;
  const effTaglio = attr.taglio * potenza * (0.4 + 0.6 * stabilita);
  const effEnergia = Math.max(0, esplosivo - stab * 0.6) * potenza;

  return { stabilita, potenza, effVeleno, effCura, effNutrimento, effTaglio, effEnergia, rawPower };
}

// Classifica: che COSA è la miscela? Emerge da soglie sulle INTENSITÀ (composizione),
// così la categoria non dipende dalla quantità. vel = veleno al netto dello stabilizzante.
// Le categorie sono AFFORDANCE: interpretazioni che un essere vivente dà a una sostanza in base
// a come si comporta (fisiologia + fisica), non a un'etichetta scritta sul materiale. Ogni funzione
// riceve gli attributi fondamentali `a`, l'esito fisiologico `f` e l'energia esplosiva `x`.
const CATS = [
  { nome: "Esplosivo", icona: "💥", score: (a, f, x) => x - a.stabilizzante * 0.5 - 0.44 },
  { nome: "Veleno",    icona: "🧪", score: (a, f) => f.danno - f.beneficio - 0.12 },
  { nome: "Medicina",  icona: "💊", score: (a, f) => f.beneficio - f.danno * 0.8 - 0.12 },
  { nome: "Cibo",      icona: "🍞", score: (a, f) => f.nutrimento - f.danno * 1.5 - 0.15 },
  { nome: "Arma",      icona: "⚔️", score: (a) => a.taglio * 0.9 + a.durezza * 0.2 - a.fragilita * 0.2 - 0.2 },
  { nome: "Conduttore",icona: "⚡", score: (a) => a.conducibilita - 0.55 },
  // --- Mezzi di trasporto: strutture avanzate distinte dal mezzo che sfruttano ---
  { nome: "Imbarcazione",   icona: "⛵", score: (a) => 0.5 * a.durezza + 0.65 * a.galleggiamento - 0.35 * a.fragilita - 0.45 },
  { nome: "Velivolo",       icona: "🎈", score: (a) => 0.4 * a.durezza + 0.95 * a.portanza - 0.5 * a.peso - 0.35 * a.fragilita - 0.42 },
  { nome: "Veicolo terrestre", icona: "🛒", score: (a) => 0.55 * a.durezza + 0.3 - 2 * Math.abs(a.galleggiamento - 0.3) - 0.3 * a.fragilita - 0.15 },
  { nome: "Struttura", icona: "🧱", score: (a) => a.durezza * 0.6 + a.peso * 0.4 - a.fragilita * 0.3 - 0.45 },
  { nome: "Ornamento", icona: "💎", score: (a) => a.valore - 0.5 },
  // --- Nuove affordance dalle nuove proprietà (soglie conservative: non rubano alle esistenti) ---
  { nome: "Fibra",     icona: "🧶", score: (a) => a.elasticita * 0.7 + a.portanza * 0.4 - a.durezza * 0.4 - a.peso * 0.3 - 0.35 },
  { nome: "Vetro",     icona: "🪟", score: (a) => a.trasparenza * 0.9 + a.durezza * 0.2 - a.peso * 0.2 - 0.5 },
  { nome: "Acido",     icona: "🧴", score: (a) => a.acidita - a.stabilizzante * 0.4 - 0.45 },
  { nome: "Colla",     icona: "🩹", score: (a) => a.viscosita * 0.7 + a.legame * 0.5 - a.durezza * 0.3 - 0.5 },
  { nome: "Colorante", icona: "🎨", score: (a) => a.valore * 0.4 + a.volatilita * 0.3 + a.bioattivo * 0.2 - a.durezza * 0.4 - a.nutriente * 0.5 - 0.4 },
  { nome: "Combustibile", icona: "🛢️", score: (a) => a.energiaChim * 0.6 + a.volatilita * 0.4 - a.reattivita * 0.3 - a.nutriente * 0.6 - 0.42 },
];

// ── AFFORDANCE TOTALE (10.3) ────────────────────────────────────────────────────────────────
// Il "profilo" di una sostanza: cosa fa, ridotto a poche grandezze grossolane — il massimo che
// un occhio nudo può cogliere. Non contiene alcuna interpretazione: è la traccia sensibile.
export function profilo(attr) {
  const f = physiology(attr);
  const x = explosivePower(attr);
  return {
    nutre: f.nutrimento, giova: f.beneficio, nuoce: f.danno, scoppia: x,
    taglia: attr.taglio, dura: attr.durezza, galleggia: attr.galleggiamento,
    conduce: attr.conducibilita, luce: attr.trasparenza, pregio: attr.valore,
  };
}
// La FIRMA percettiva: il profilo discretizzato in gradini grossolani. Due sostanze con la stessa
// firma sono, per chi le usa, "la stessa specie di cosa" — anche se noi le chiameremmo diverse.
function firmaPercettiva(attr) {
  const p = profilo(attr);
  const g = (v) => (v > 0.55 ? 2 : v > 0.22 ? 1 : 0);
  return Object.values(p).map(g).join("");
}
// Nome inventato per un genere di cose: sillabe, come tutti gli altri nomi di questo mondo.
export function nomeGenere(firma, seme) {
  const cons = "bcdfgklmnprstvz", voc = "aeiou";
  let x = 0;
  for (let i = 0; i < firma.length; i++) x = (x * 31 + firma.charCodeAt(i) + seme) >>> 0;
  let s = "";
  for (let i = 0; i < 3; i++) { s += cons[x % cons.length]; x = (x / 15) | 0; s += voc[x % voc.length]; x = (x / 5) | 0; }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Classificazione CULTURALE: il popolo `cultura` guarda la sostanza, la confronta con ciò che ha
// già visto e, se non la riconosce, conia un nome nuovo. Nessuna categoria è data in partenza.
export function classifyCulturale(attr, cultura) {
  if (!cultura.generi) { cultura.generi = new Map(); cultura.seme = (cultura.seme || 1); }
  const firma = firmaPercettiva(attr);
  let g = cultura.generi.get(firma);
  if (!g) {
    g = { nome: nomeGenere(firma, cultura.seme), icona: "◆", firma, prove: 0, scoperto: true };
    cultura.generi.set(firma, g);
  }
  g.prove++;
  return { categoria: g, punteggio: 0, culturale: true };
}

export function classify(attr) {
  const f = physiology(attr);
  const x = explosivePower(attr);
  let best = { nome: "Materiale grezzo", icona: "🪨" }, bestScore = -1e9;
  for (const c of CATS) {
    const s = c.score(attr, f, x);
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return { categoria: best, punteggio: bestScore };
}

// ── AFFORDANZE: domande sulle PROPRIETÀ, non sui nomi ───────────────────────────────────────
// Sono le uniche cose che il motore ha il diritto di sapere, perché discendono dalla fisica e
// dalla biologia (i due livelli di hardcoding ammessi): ciò che ha nutrimento nutre, ciò che ha
// filo taglia, ciò che galleggia porta a galla. Come una cultura CHIAMI quella cosa non ci
// riguarda: quello lo decide il popolo (classifyCulturale).
export const AFF = {
  nutre: (b) => (b.eff?.effNutrimento || 0) > 0.12 && (b.eff?.effVeleno || 0) < 0.12,
  cura: (b) => (b.eff?.effCura || 0) > (b.eff?.effVeleno || 0) + 0.04,
  nuoce: (b) => (b.eff?.effVeleno || 0) > 0.25 || (b.eff?.effEnergia || 0) > 0.4,
  taglia: (b) => (b.attr?.taglio || 0) > 0.3 || (b.attr?.durezza || 0) > 0.55,
  regge: (b) => (b.attr?.durezza || 0) > 0.5 && (b.attr?.peso || 0) > 0.35 && (b.attr?.fragilita || 0) < 0.6,
  galleggia: (b) => (b.attr?.galleggiamento || 0) > 0.45 && (b.attr?.durezza || 0) > 0.2 && (b.attr?.fragilita || 0) < 0.6,
  rotola: (b) => (b.attr?.durezza || 0) > 0.45 && (b.attr?.galleggiamento || 0) < 0.45 && (b.attr?.fragilita || 0) < 0.5,
  vola: (b) => (b.attr?.portanza || 0) > 0.5 && (b.attr?.peso || 0) < 0.35,
  conduce: (b) => (b.attr?.conducibilita || 0) > 0.55,
  splende: (b) => splendore(b.attr, b.colore) > 0.45,
};

// Colore della miscela: media pesata dei colori dei materiali.
export function mixColor(ingredienti, registry) {
  let r = 0, g = 0, b = 0, totQ = 0;
  for (const ing of ingredienti) {
    const mat = registry.mat(ing.matId);
    if (!mat) continue;
    const q = Math.max(0, ing.qta || 0); totQ += q;
    const h = mat.colore.replace("#", "");
    r += parseInt(h.slice(0, 2), 16) * q; g += parseInt(h.slice(2, 4), 16) * q; b += parseInt(h.slice(4, 6), 16) * q;
  }
  if (!totQ) return "#888";
  const hx = (v) => Math.round(v / totQ).toString(16).padStart(2, "0");
  return "#" + hx(r) + hx(g) + hx(b);
}

export function signature(ingredienti, processo = "grezzo") {
  const base = ingredienti.filter((i) => i.qta > 0).map((i) => i.matId + "x" + i.qta).sort().join("+");
  return processo && processo !== "grezzo" ? base + "|" + processo : base;
}

// Nome dell'invenzione generato dai MATERIALI e dalle QUANTITÀ: sillabe fuse insieme.
// Es. 2×Legno + 1×Miele -> chunk più lungo per il legno -> "Legnomie". Deterministico:
// combinazioni identiche danno lo stesso nome (e la firma le deduplica comunque).
export function inventName(ingredienti, registry, processo = "grezzo") {
  const parts = ingredienti
    .filter((i) => i.qta > 0)
    .map((i) => ({ mat: registry.mat(i.matId), qta: i.qta }))
    .filter((p) => p.mat)
    .sort((a, b) => a.mat.id - b.mat.id); // ordine stabile
  const totQ = parts.reduce((s, p) => s + p.qta, 0) || 1;
  let name = "";
  for (const p of parts) {
    const len = Math.max(2, Math.round(6 * p.qta / totQ)); // più quantità -> sillaba più lunga
    name += p.mat.nome.toLowerCase().replace(/[^a-zàèéìòù]/g, "").slice(0, len);
  }
  name = name.charAt(0).toUpperCase() + name.slice(1);
  // Il processo diventa un aggettivo del nome (macinato, cotto, fuso, ...).
  const suff = { macinare: " macinato", cuocere: " cotto", essiccare: " essiccato", fermentare: " fermentato", fondere: " fuso", martellare: " forgiato", filare: " filato", pressare: " pressato" }[processo];
  return name + (suff || "");
}

// Simula UN esperimento/uso: la stabilità determina se "riesce"; gli effetti
// determinano se è benefico o dannoso per chi lo prova. Ritorna l'esito.
export function simulate(attr, eff, rng) {
  const riuscito = rng() < eff.stabilita;
  let danno = 0, beneficio = 0, incidente = null;
  if (!riuscito) {
    // Incidente: il tipo dipende dall'attributo dominante.
    if (eff.effEnergia > 0.4) incidente = "è esploso";
    else if (eff.effVeleno > 0.3) incidente = "ha avvelenato chi lo usava";
    else if (attr.fragilita > 0.4) incidente = "si è rotto";
    else incidente = "non ha funzionato";
    danno = 0.15 + eff.effEnergia * 0.4 + eff.effVeleno * 0.3;
  } else {
    // Riuscito: l'effetto netto sul consumatore.
    const netto = eff.effCura - eff.effVeleno;
    if (netto > 0.05) beneficio = netto;
    else if (netto < -0.05) danno = -netto;
  }
  // "Utile" = riuscito senza fare danno netto. Un'arma/cibo/struttura stabile è
  // una tecnica valida (beneficio 0, danno 0); una medicina che avvelena, o un
  // incidente, no.
  const positivo = riuscito && beneficio >= danno;
  return { riuscito, beneficio, danno, incidente, positivo };
}

// --- FUSIONE DI INVENZIONI -> EDIFICI/ISTITUZIONI ---
// Non è hardcodato quali coppie: serve UNA base strutturale (Struttura) + UNA funzione.
// Il TIPO di edificio emerge dalla categoria funzionale del secondo pezzo.
const BUILDINGS = {
  "Arma": { nome: "Armeria", icona: "🏯", effetto: "difesa" },
  "Medicina": { nome: "Infermeria", icona: "🏥", effetto: "cura" },
  "Cibo": { nome: "Granaio", icona: "🌾", effetto: "cibo" },
  "Ornamento": { nome: "Tempio", icona: "⛩️", effetto: "morale" },
  "Conduttore": { nome: "Officina", icona: "🏭", effetto: "ingegno" },
  "Imbarcazione": { nome: "Porto", icona: "⚓", effetto: "porto" },
  "Veicolo terrestre": { nome: "Rimessa", icona: "🏚️", effetto: "trasporto" },
  "Velivolo": { nome: "Hangar", icona: "🛩️", effetto: "trasporto" },
  "Veleno": { nome: "Laboratorio", icona: "⚗️", effetto: "veleno" },
  "Esplosivo": { nome: "Arsenale", icona: "🧨", effetto: "difesa" },
  "Fibra": { nome: "Filanda", icona: "🧵", effetto: "ingegno" },
  "Vetro": { nome: "Vetreria", icona: "🔬", effetto: "ingegno" },
  "Colorante": { nome: "Bottega d'arte", icona: "🎨", effetto: "morale" },
  "Combustibile": { nome: "Fornace", icona: "🔥", effetto: "ingegno" },
  "Acido": { nome: "Alchimia", icona: "🧪", effetto: "veleno" },
  "Colla": { nome: "Cantiere", icona: "🏗️", effetto: "trasporto" },
};

// È una base strutturale? (una Struttura, o comunque molto dura e pesante)
function isStructural(belief) {
  return AFF.regge(belief);
}

// Prova a fondere due invenzioni note in un edificio. Ritorna il "progetto" o null.
export function fuse(a, b, registry) {
  let base = null, funz = null;
  if (isStructural(a)) { base = a; funz = b; }
  else if (isStructural(b)) { base = b; funz = a; }
  else return null; // senza una struttura non si costruisce nulla
  // Che genere di luogo nasce lo dice la FUNZIONE della cosa che ci si mette dentro, letta dalle
  // sue proprietà: qualcosa che cura fa un'infermeria, qualcosa che nutre un granaio, qualcosa
  // che taglia un'armeria. Nessun nome di categoria entra in questa decisione.
  const tipo = AFF.cura(funz) ? BUILDINGS.Medicina
    : AFF.nutre(funz) ? BUILDINGS.Cibo
    : AFF.galleggia(funz) ? BUILDINGS.Imbarcazione
    : AFF.vola(funz) ? BUILDINGS.Velivolo
    : AFF.rotola(funz) ? BUILDINGS["Veicolo terrestre"]
    : AFF.nuoce(funz) ? BUILDINGS.Veleno
    : AFF.taglia(funz) ? BUILDINGS.Arma
    : AFF.conduce(funz) ? BUILDINGS.Conduttore
    : AFF.splende(funz) ? BUILDINGS.Ornamento
    : null;
  if (!tipo) return null;
  const attr = {};
  for (const k in a.attr) attr[k] = (a.attr[k] + b.attr[k]) / 2;
  const nome = ((base.nome || "").slice(0, 3) + (funz.nome || "").slice(0, 3)) || tipo.nome;
  return {
    edificio: true, tipo: tipo.nome, icona: tipo.icona, effetto: tipo.effetto,
    nome: nome.charAt(0).toUpperCase() + nome.slice(1),
    categoria: { nome: tipo.nome, icona: tipo.icona },
    attr, colore: a.colore,
    ingredienti: [...a.ingredienti, ...b.ingredienti],
    fonti: [a.signature, b.signature],
    signature: "fus:" + [a.signature, b.signature].sort().join("|"),
  };
}

// Database delle conoscenze con AFFIDABILITÀ.
// Ogni credenza accumula prove: la fiducia cresce e il verdetto converge alla verità.
export class KnowledgeBase {
  constructor() { this.beliefs = new Map(); } // signature -> belief
  get list() { return [...this.beliefs.values()]; }
  get size() { return this.beliefs.size; }

  // Registra una prova. Ritorna { belief, nuovo }.
  record({ ingredienti, categoria, colore, attr, eff, esito, nome = "", processo = "grezzo", anno = 0, autore = "?" }) {
    const sig = signature(ingredienti, processo);
    let b = this.beliefs.get(sig);
    const nuovo = !b;
    if (nuovo) {
      b = {
        signature: sig, nome, processo, ingredienti: ingredienti.map((i) => ({ matId: i.matId, qta: i.qta })),
        categoria, colore, attr, eff,
        prove: 0, benefici: 0, danni: 0, primaVolta: anno, scopertoDa: autore,
      };
      this.beliefs.set(sig, b);
    }
    b.prove++;
    if (esito.positivo) b.benefici++; else b.danni++;
    // Affidabilità = fiducia (cresce con le prove).
    b.affidabilita = b.prove / (b.prove + 4);
    // Verdetto = cosa crede la popolazione ADESSO. CONOSCENZA FALSA (4.3): il verdetto ha
    // INERZIA — non si ribalta alla prima prova contraria, serve un'evidenza NETTA (isteresi).
    // Così una civiltà può credere il falso per generazioni (una cura inutile, un cibo "maledetto")
    // e correggersi solo quando le prove contrarie si accumulano davvero.
    const nuovoVerdetto = b.benefici >= b.danni ? "utile" : "pericoloso";
    if (!b.verdetto) b.verdetto = nuovoVerdetto;
    else if (b.verdetto !== nuovoVerdetto) {
      const contrarie = b.verdetto === "utile" ? b.danni : b.benefici;
      const favorevoli = b.verdetto === "utile" ? b.benefici : b.danni;
      if (contrarie > favorevoli * P.inerziaVerdetto + 2) { b.verdetto = nuovoVerdetto; b.ribaltato = (b.ribaltato || 0) + 1; }
      else b.falsaCredenza = true;   // la popolazione continua a credere ciò che l'evidenza smentisce
    } else b.falsaCredenza = false;
    // 4.1 (base): il LIVELLO della conoscenza cresce con le prove: ipotesi → esperimento → teoria.
    b.livello = b.prove < 3 ? "ipotesi" : b.prove < P.provePerTeoria ? "esperimento" : "teoria";
    return { belief: b, nuovo };
  }

  // Apprende un EDIFICIO ottenuto per fusione (progetto da fuse()).
  learnBuilding(p, anno = 0) {
    if (this.beliefs.has(p.signature)) return { belief: this.beliefs.get(p.signature), nuovo: false };
    const b = {
      signature: p.signature, nome: p.nome, edificio: true, tipo: p.tipo, icona: p.icona, effetto: p.effetto,
      ingredienti: p.ingredienti, categoria: p.categoria, colore: p.colore, attr: p.attr, fonti: p.fonti,
      prove: 1, benefici: 1, danni: 0, affidabilita: 0.5, verdetto: "utile", primaVolta: anno,
    };
    this.beliefs.set(p.signature, b);
    return { belief: b, nuovo: true };
  }
}
