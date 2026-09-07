// =================================================================================================
// LA MEMORIA DEL MONDO.
//
// Il motore sa dire com'è il mondo ADESSO (`pop.stats()`), e non sapeva dire com'era. Ogni numero
// veniva calcolato, mostrato e buttato via — quindi non esisteva modo di vedere che una carestia
// stava arrivando, che una lingua si stava spezzando, che i ceti si stavano allargando. Si vedeva
// solo l'istante, e l'istante non racconta niente: la storia è la differenza fra due istanti.
//
// Questo modulo tiene quella differenza. Non calcola NIENTE di suo: si aggancia alla stessa
// `stats()` che l'interfaccia già chiede ogni 0,35 secondi di mondo, e ne conserva le cifre in
// anelli di numeri a lunghezza fissa. Costa una scrittura per serie, e la memoria è limitata per
// costruzione: quando l'anello è pieno ricomincia da capo e il più vecchio si perde.
//
// PERCHÉ UN ANELLO E NON UN ELENCO CHE CRESCE: una partita lunga farebbe milioni di campioni, e un
// grafico non può mostrarne più di qualche migliaio comunque. Un elenco che cresce sarebbe memoria
// buttata via che prima o poi impianta la scheda — cioè lo stesso errore che il progetto evita nel
// mondo (niente tetti scritti a mano, ma niente crescite infinite per sbaglio).
// =================================================================================================

export const CAPIENZA = 4000;

// -------------------------------------------------------------------------------------------------
// CHE COSA SI RICORDA.
//
// Ogni voce dice da dove si prende il numero. `cumulativa: true` significa che il motore conta un
// TOTALE da inizio partita (le nascite, le morti, le battaglie): di quelli non interessa il totale
// — che cresce e basta — ma il RITMO, cioè quanti se ne aggiungono fra un campione e l'altro. È la
// differenza fra «sono nati in tutto 1 400» e «stanno nascendo tanti quanti ne muoiono».
// -------------------------------------------------------------------------------------------------
export const SERIE = [
  // — chi c'è —
  { k: "vivi", nome: "Vivi", gruppo: "popolo", da: (s) => s.vivi },
  { k: "nascite", nome: "Nascite", gruppo: "popolo", cumulativa: true, da: (s) => s.nascite },
  { k: "morti", nome: "Morti", gruppo: "popolo", cumulativa: true, da: (s) => s.morti },
  { k: "etaMedia", nome: "Età media", gruppo: "popolo", da: (s) => s.etaMedia },
  { k: "generazione", nome: "Generazione", gruppo: "popolo", da: (s) => s.generazione || 0 },
  { k: "gravide", nome: "Gravidanze", gruppo: "popolo", da: (s) => s.gravide || 0 },
  { k: "migranti", nome: "In migrazione", gruppo: "popolo", da: (s) => s.migranti || 0 },
  { k: "emigrati", nome: "Emigrati", gruppo: "popolo", cumulativa: true, da: (s) => s.emigrati || 0 },

  // — il corpo —
  { k: "fame", nome: "Fame media", gruppo: "corpo", da: (s) => s.fameMedia },
  { k: "sete", nome: "Sete media", gruppo: "corpo", da: (s) => s.seteMedia },
  { k: "carenza", nome: "Carenza alimentare", gruppo: "corpo", da: (s) => s.carenza || 0 },
  { k: "dolore", nome: "Dolore", gruppo: "corpo", da: (s) => s.dolore || 0 },
  { k: "immunita", nome: "Immunità media", gruppo: "corpo", da: (s) => s.immunitaMedia || 0 },
  { k: "infetti", nome: "Infetti", gruppo: "corpo", da: (s) => s.infetti || 0 },
  { k: "riparo", nome: "Riparo medio", gruppo: "corpo", da: (s) => s.riparoMedio || 0 },
  { k: "conCasa", nome: "Chi ha una casa", gruppo: "corpo", da: (s) => s.conCasa || 0 },

  // — i ceti (composizione) —
  { k: "nobili", nome: "Nobili", gruppo: "ceti", da: (s) => (s.classi || {}).nobili || 0 },
  { k: "agiati", nome: "Agiati", gruppo: "ceti", da: (s) => (s.classi || {}).agiati || 0 },
  { k: "poveri", nome: "Poveri", gruppo: "ceti", da: (s) => (s.classi || {}).poveri || 0 },
  { k: "servi", nome: "Servi", gruppo: "ceti", da: (s) => (s.classi || {}).servi || 0 },
  { k: "disug", nome: "Disuguaglianza", gruppo: "ceti", da: (s) => s.disuguaglianza || 0 },

  // — chi comanda e chi subisce —
  { k: "fazioni", nome: "Popoli", gruppo: "potere", da: (s, p) => (p.factions || []).length },
  { k: "costretti", nome: "Sottomessi", gruppo: "potere", cumulativa: true, da: (s) => s.costretti || 0 },
  { k: "liberatisi", nome: "Liberatisi", gruppo: "potere", cumulativa: true, da: (s, p) => p.liberatisi || 0 },
  { k: "orfani", nome: "Liberi per morte del padrone", gruppo: "potere", cumulativa: true, da: (s, p) => p.orfaniDiPadrone || 0 },
  { k: "tributi", nome: "Tributi", gruppo: "potere", cumulativa: true, da: (s) => s.tributi || 0 },
  { k: "estorsioni", nome: "Estorsioni", gruppo: "potere", cumulativa: true, da: (s) => s.estorsioni || 0 },
  { k: "doni", nome: "Doni", gruppo: "potere", cumulativa: true, da: (s) => s.doni || 0 },

  // — la legge —
  { k: "normaFurto", nome: "Quanto si sente la norma", gruppo: "legge", da: (s) => s.normaFurto || 0 },
  { k: "processi", nome: "Processi", gruppo: "legge", cumulativa: true, da: (s) => s.processi || 0 },
  { k: "punizioni", nome: "Punizioni", gruppo: "legge", cumulativa: true, da: (s) => s.punizioni || 0 },

  // — quel che si sa e quel che si dice —
  { k: "materie", nome: "Materie conosciute", gruppo: "sapere", da: (s, p) => p.registry.materials.length },
  { k: "oggetti", nome: "Cose create", gruppo: "sapere", cumulativa: true, da: (s) => s.oggetti || 0 },
  { k: "falseCredenze", nome: "False credenze", gruppo: "sapere", da: (s) => s.falseCredenze || 0 },
  { k: "libri", nome: "Libri", gruppo: "sapere", da: (s) => s.libri || 0 },
  { k: "maestri", nome: "Insegnamenti", gruppo: "sapere", cumulativa: true, da: (s) => s.maestri || 0 },
  { k: "artefatti", nome: "Artefatti", gruppo: "sapere", da: (s) => s.artefatti || 0 },

  // — la cultura —
  { k: "lessici", nome: "Lingue distinte", gruppo: "cultura", da: (s) => s.lessici || 0 },
  { k: "dialetti", nome: "Parlate che convivono", gruppo: "cultura", da: (s) => s.dialetti || 0 },
  { k: "generi", nome: "Generi inventati", gruppo: "cultura", da: (s) => s.generiCulturali || 0 },
  { k: "miti", nome: "Miti vivi", gruppo: "cultura", da: (s) => s.miti || 0 },
  { k: "voci", nome: "Voci in giro", gruppo: "cultura", da: (s) => s.voci || 0 },
  { k: "calunnie", nome: "Calunnie", gruppo: "cultura", cumulativa: true, da: (s) => s.calunnie || 0 },
  { k: "tradizioni", nome: "Tradizioni", gruppo: "cultura", da: (s) => s.tradizioni || 0 },
  { k: "credenti", nome: "Credenti", gruppo: "cultura", da: (s) => s.credenti || 0 },
  { k: "opere", nome: "Opere", gruppo: "cultura", cumulativa: true, da: (s) => s.opere || 0 },

  // — la guerra —
  { k: "battaglie", nome: "Battaglie", gruppo: "guerra", cumulativa: true, da: (s) => s.battaglie || 0 },
  { k: "razzie", nome: "Razzie", gruppo: "guerra", cumulativa: true, da: (s, p) => p.razzieTot || 0 },
  { k: "caseDistrutte", nome: "Case distrutte", gruppo: "guerra", cumulativa: true, da: (s) => s.caseDistrutte || 0 },

  // — la terra —
  { k: "vegetazione", nome: "Vegetazione", gruppo: "terra", da: (s) => s.vegetazione || 0 },
  { k: "fertilita", nome: "Fertilità del suolo", gruppo: "terra", da: (s) => s.fertilita },
  { k: "inquinamento", nome: "Cicatrici sul mondo", gruppo: "terra", da: (s) => s.inquinamento || 0 },
  { k: "esplorato", nome: "Mondo esplorato", gruppo: "terra", da: (s) => s.esplorato || 0 },
  { k: "campi", nome: "Campi coltivati", gruppo: "terra", da: (s) => s.campi || 0 },
  { k: "strade", nome: "Sentieri battuti", gruppo: "terra", da: (s) => s.strade || 0 },

  // — le bestie —
  { k: "erbivori", nome: "Erbivori", gruppo: "fauna", da: (s) => s.erbivori || 0 },
  { k: "predatori", nome: "Predatori", gruppo: "fauna", da: (s) => s.predatori || 0 },
  { k: "onnivori", nome: "Onnivori", gruppo: "fauna", da: (s) => s.onnivori || 0 },
  { k: "pesci", nome: "Pesci", gruppo: "fauna", da: (s) => s.pesci || 0 },
  { k: "predMarini", nome: "Predatori marini", gruppo: "fauna", da: (s) => s.predatoriMarini || 0 },
  { k: "tagliaErb", nome: "Taglia degli erbivori", gruppo: "fauna", da: (s) => s.faunaTagliaErb || 0 },
  { k: "tagliaPred", nome: "Taglia dei predatori", gruppo: "fauna", da: (s) => s.faunaTagliaPred || 0 },
  { k: "carnivoria", nome: "Carnivoria media", gruppo: "fauna", da: (s) => s.carnivoriaMedia || 0 },

  // — che gente è diventata —
  { k: "aggressivita", nome: "Aggressività", gruppo: "indole", da: (s) => (s.valori || {}).aggressivita || 0 },
  { k: "empatia", nome: "Empatia", gruppo: "indole", da: (s) => (s.valori || {}).empatia || 0 },
  { k: "avidita", nome: "Avidità", gruppo: "indole", da: (s) => (s.valori || {}).avidita || 0 },
  { k: "onesta", nome: "Onestà", gruppo: "indole", da: (s) => (s.valori || {}).onesta || 0 },
  { k: "invidia", nome: "Invidia", gruppo: "indole", da: (s) => (s.valori || {}).invidia || 0 },
  { k: "curiosita", nome: "Curiosità", gruppo: "indole", da: (s) => (s.valori || {}).curiosita || 0 },
  { k: "ambizione", nome: "Ambizione", gruppo: "indole", da: (s) => (s.valori || {}).ambizione || 0 },

  // — l'umore —
  { k: "gioia", nome: "Gioia", gruppo: "umore", da: (s) => (s.emo || {}).gioia || 0 },
  { k: "paura", nome: "Paura", gruppo: "umore", da: (s) => (s.emo || {}).paura || 0 },
  { k: "rabbia", nome: "Rabbia", gruppo: "umore", da: (s) => (s.emo || {}).rabbia || 0 },
  { k: "lealta", nome: "Lealtà", gruppo: "umore", da: (s) => (s.emo || {}).lealta || 0 },
];

export class Storia {
  constructor(capienza = CAPIENZA) {
    this.cap = capienza;
    this.n = 0;                       // quanti campioni sono stati presi in tutto
    this.anno = new Float32Array(capienza);
    this.dati = new Map();
    for (const s of SERIE) this.dati.set(s.k, new Float32Array(capienza));
    this.eventi = [];                 // i fatti da segnare sull'asse: ere, estinzioni, guerre
  }

  // Un campione. Chiamato dove `stats()` è GIÀ stata calcolata: qui non si somma niente.
  campiona(pop, s) {
    const i = this.n % this.cap;
    this.anno[i] = s.anno;
    for (const d of SERIE) {
      let v = 0;
      try { v = d.da(s, pop) || 0; } catch (e) { v = 0; }
      this.dati.get(d.k)[i] = v;
    }
    this.n++;
    // Le ERE sono i fatti che una generazione non ha saputo dimenticare: vanno segnate sull'asse,
    // perché un salto in un grafico senza il fatto che l'ha causato è solo una curva strana.
    const ere = pop.ere || [];
    if (ere.length > this.eventi.length) {
      for (let k = this.eventi.length; k < ere.length; k++) {
        this.eventi.push({ anno: ere[k].anno != null ? ere[k].anno : s.anno, nome: ere[k].nome });
      }
    }
  }

  // Legge una serie in ordine cronologico. `passo` salta campioni quando ce ne sono più di quanti
  // pixel abbia il grafico: disegnare mille punti su duecento pixel è lavoro buttato.
  leggi(chiave, quanti = this.cap, passo = 1) {
    const buf = this.dati.get(chiave);
    if (!buf) return { x: [], y: [] };
    const tot = Math.min(this.n, this.cap);
    const daQui = Math.max(0, tot - quanti);
    const x = [], y = [];
    for (let j = daQui; j < tot; j += passo) {
      const i = this.n <= this.cap ? j : (this.n + j) % this.cap;
      x.push(this.anno[i]); y.push(buf[i]);
    }
    return { x, y };
  }

  // Il RITMO invece del totale: quanti se ne aggiungono fra un campione e l'altro, diviso il tempo
  // passato. Senza dividere per il tempo il numero dipenderebbe da ogni quanto si campiona, che è
  // un dettaglio dell'interfaccia e non un fatto del mondo.
  leggiRitmo(chiave, quanti = this.cap, passo = 1) {
    const { x, y } = this.leggi(chiave, quanti + passo, passo);
    const rx = [], ry = [];
    for (let i = 1; i < x.length; i++) {
      const dt = x[i] - x[i - 1];
      rx.push(x[i]); ry.push(dt > 1e-6 ? Math.max(0, y[i] - y[i - 1]) / dt : 0);
    }
    return { x: rx, y: ry };
  }

  vuota() { return this.n < 2; }
}

// -------------------------------------------------------------------------------------------------
// LE DISTRIBUZIONI DI ADESSO.
//
// Una media non è una società. Un popolo con metà gente sazia e metà che muore di fame ha la stessa
// fame media di un popolo in cui stanno tutti così così — e sono due mondi diversi. La forma della
// distribuzione è il posto dove la disuguaglianza si vede, e non c'è modo di ricavarla da una linea.
//
// Si calcolano al momento del disegno, sulla gente viva: costano una passata e si fanno solo quando
// la scheda dei grafici è aperta.
// -------------------------------------------------------------------------------------------------
export function distribuzione(pop, quale, celle = 26) {
  const v = [];
  for (const n of pop.npcs) {
    if (!n.vivo) continue;
    let x = null;
    if (quale === "fame") x = n.fame;
    else if (quale === "eta") x = n.eta;
    else if (quale === "agiatezza") x = n._agiatezza;
    else if (quale === "lingua") x = n.lingua;
    else if (quale === "salute") x = n.salute;
    else if (quale === "sapere") x = n.sapere ? n.sapere.size : 0;
    if (x == null || !isFinite(x)) continue;
    v.push(x);
  }
  if (!v.length) return { bordi: [], conti: [], min: 0, max: 0, n: 0 };
  let min = Infinity, max = -Infinity;
  for (const x of v) { if (x < min) min = x; if (x > max) max = x; }
  if (max - min < 1e-9) max = min + 1;
  const conti = new Array(celle).fill(0);
  for (const x of v) {
    let i = ((x - min) / (max - min) * celle) | 0;
    if (i >= celle) i = celle - 1;
    conti[i]++;
  }
  const bordi = [];
  for (let i = 0; i <= celle; i++) bordi.push(min + (max - min) * i / celle);
  return { bordi, conti, min, max, n: v.length };
}
