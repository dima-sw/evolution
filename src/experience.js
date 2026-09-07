// =================================================================================================
// ESPERIENZA — la legge per cui un essere impara dalla propria vita.
//
// Questo modulo contiene UNA sola legge, e appartiene al livello 3 (psicologia), l'unico a cui è
// lecito scrivere qualcosa: ciò che precede il benessere tende a ripetersi, ciò che precede il
// male tende a essere evitato. È il condizionamento operante, e vale per un cane come per un uomo.
//
// Ciò che il motore NON sa è altrettanto importante di ciò che sa. Non sa cosa sia un tabù, né una
// maniera di combattere, né un'abitudine alimentare, né una superstizione. Sa solo tre cose:
//   1. che un corpo ha dei sensi, e che quei sensi riportano dei numeri (luce, calore, pendenza,
//      quanti altri ci sono intorno, quanto sei in forze);
//   2. che quel corpo, poco dopo, sta meglio o peggio;
//   3. che la mente lega le due cose, e sbaglia spesso a legarle.
//
// Tutto il resto viene da sé. Se in un popolo gli scontri notturni sono andati bene, i suoi uomini
// prenderanno gusto al buio — senza che nessuno abbia chiamato "dottrina" quel gusto, e senza che
// il motore regali loro un vantaggio: combattono meglio di notte semplicemente perché di notte non
// hanno paura, e la paura la avevano già nelle vene prima che io scrivessi questo file.
// Allo stesso modo, se qualcuno ha maneggiato una certa pietra e subito dopo è stato male, quella
// pietra diventerà per lui una cosa da non toccare. Che abbia ragione non conta: il legame è nella
// sua testa, e dalla sua testa può passare a quella degli altri.
// =================================================================================================

import { isWater } from "./world.js";

// Quanto sta bene, adesso, questo corpo. Non è un punteggio di gioco: è la somma di ciò che un
// animale sente di sé — se ha fame, se ha sete, se gli fa male qualcosa, se ha paura, se è intero.
export function benessere(npc) {
  return npc.salute * 0.4
    + (1 - npc.fame) * 0.2
    + (1 - npc.sete) * 0.15
    + (1 - npc.dolore) * 0.15
    - npc.emo.paura * 0.1;
}

// I CANALI SENSORIALI. Sono cinque perché cinque sono le cose che un corpo può sentire senza
// bisogno di concetti: la luce sugli occhi, il calore sulla pelle, la pendenza sotto i piedi, la
// presenza degli altri, la propria stanchezza. Ognuno vale poco (tre gradini appena) perché la
// percezione è grossolana — ed è proprio la grossolanità a rendere possibili le associazioni
// sbagliate, cioè le superstizioni.
// Quanto è ripido qui: la differenza di quota fra un passo e l'altro. Nessuno «vede» la pendenza —
// la sentono le gambe, ed è per questo che è un canale sensoriale come gli altri.
function pendenza(w, i) {
  const x0 = i % w.width;
  const dx = Math.abs(w.elevation[x0 > 0 ? i - 1 : i + 1] - w.elevation[i]);
  const iy = i - w.width >= 0 ? i - w.width : i + w.width;
  const dy = Math.abs(w.elevation[iy] - w.elevation[i]);
  // ×26 tara i tre gradini sui dislivelli veri di questo mondo (mediana 0,014, massimo 0,058):
  // sotto è piano, in mezzo è mosso, sopra è ripido.
  return Math.min(1, (dx + dy) * 26);
}

const GRADINI = 3;
function bin(v) { return v <= 0.333 ? 0 : v < 0.667 ? 1 : 2; }

export function chiaviContesto(pop, npc, out) {
  out.length = 0;
  const w = pop.world, i = pop.tileIdx(npc.x, npc.y);
  if (i < 0) return out;
  out.push("l" + bin(pop.luce !== undefined ? pop.luce : 1));      // quanta luce c'è
  out.push("c" + bin(w.temperature[i]));                          // che caldo fa qui
  out.push("p" + bin(pendenza(w, i)));                            // quanto è ripido sotto i piedi
  out.push("f" + bin(Math.min(1, (npc._vicini || 0) / 8)));        // quanti altri intorno
  out.push("v" + bin(1 - npc.stanchezza));                         // quanto sei in forze
  out.push(isWater(w.biome[i]) ? "a1" : "a0");                     // hai i piedi nell'acqua
  return out;
}

// L'associazione: quante volte, e con che esito medio. `v` sta fra -1 e +1.
export function impara(npc, chiave, esito, peso = 1) {
  if (!npc.esperienze) npc.esperienze = new Map();
  let e = npc.esperienze.get(chiave);
  if (!e) {
    if (npc.esperienze.size > 48) {                 // la memoria non è infinita: cede la più debole
      let peggiore = null, min = 2;
      for (const [k, x] of npc.esperienze) { const f = Math.abs(x.v) * Math.min(1, x.n / 4); if (f < min) { min = f; peggiore = k; } }
      if (peggiore) npc.esperienze.delete(peggiore);
    }
    e = { n: 0, v: 0 }; npc.esperienze.set(chiave, e);
  }
  // Le prime volte contano moltissimo, poi sempre meno: chi si è scottato una volta ci sta
  // attento per anni. È anche il motivo per cui le paure infondate durano tanto.
  const alfa = peso / (1 + e.n * 0.55);
  e.v += (esito - e.v) * Math.min(1, alfa);
  e.n++;
  return e;
}

// Quanto uno è ben disposto verso una circostanza o una cosa. Chi non ne ha esperienza è neutro:
// non sa, e non sapere non è né temere né desiderare.
export function propensione(npc, chiave) {
  const e = npc.esperienze && npc.esperienze.get(chiave);
  if (!e) return 0;
  return e.v * Math.min(1, e.n / 3);
}

export function propensioneContesto(pop, npc) {
  const k = _buf; chiaviContesto(pop, npc, k);
  let s = 0;
  for (const c of k) s += propensione(npc, c);
  return s / Math.max(1, k.length);
}
const _buf = [];

// =================================================================================================
// IL PASSO. Ogni tanto un essere si accorge di stare meglio o peggio di prima, e dà la colpa (o il
// merito) a quello che aveva intorno e per le mani poco fa. La TRACCIA è l'elenco di quelle cose,
// che sbiadisce in fretta: per questo si impara solo dalle conseguenze immediate, e per questo si
// sbaglia — perché la vera causa può essere arrivata prima che la traccia si formasse, o dopo che
// si era già spenta.
// =================================================================================================
const TURNI = 3;

export function stepEsperienza(pop, dt) {
  const buf = [];
  pop._turnoEsp = ((pop._turnoEsp || 0) + 1) % TURNI;
  dt *= TURNI;                                   // chi tocca il turno riceve il tempo di tutti
  for (let i = pop._turnoEsp; i < pop.npcs.length; i += TURNI) {
    const npc = pop.npcs[i];
    if (!npc || !npc.vivo || npc.eta < 1) continue;
    if (!npc._traccia) { npc._traccia = new Map(); npc._ben = benessere(npc); npc._tImp = 0; }

    // la traccia sbiadisce: quello che hai fatto molto tempo fa non te lo ricordi più
    for (const [k, p] of npc._traccia) {
      const q = p - dt * 0.5;
      if (q <= 0.02) npc._traccia.delete(k); else npc._traccia.set(k, q);
    }
    // quello che hai intorno adesso entra nella traccia
    chiaviContesto(pop, npc, buf);
    let disp = 0;
    for (const k of buf) {
      npc._traccia.set(k, Math.min(1, (npc._traccia.get(k) || 0) + dt * 0.9));
      disp += propensione(npc, k);
    }
    // COME TI TROVI QUI, ADESSO. È la media di quanto ti sono andate bene le volte che ti sei
    // trovato in circostanze come questa. Non è un pensiero: è un'aria che si respira.
    // Ora questo numero sta attorno allo zero: positivo se qui le cose vanno meglio del tuo solito,
    // negativo se vanno peggio. È uno scarto, non un giudizio sul mondo.
    npc._disposizione = disp / Math.max(1, buf.length);
    if (npc._scosso) npc._scosso = Math.max(0, npc._scosso - dt * 0.25);

    npc._tImp += dt;
    if (npc._tImp < 0.5) continue;
    npc._tImp = 0;

    const ora = benessere(npc);
    const delta = ora - npc._ben;
    npc._ben = ora;
    if (Math.abs(delta) < 0.02) continue;            // se non è successo niente, non si impara niente

    const grezzo = Math.max(-1, Math.min(1, delta * 6));

    // NON SI IMPARA DAL BENE E DAL MALE: SI IMPARA DALLA SORPRESA.
    // Un corpo si abitua a come va di solito la sua vita, e quello che nota è lo scarto — meglio
    // del solito, peggio del solito. È la differenza fra il piacere e il *notare* il piacere, ed è
    // il modo in cui funziona davvero il rinforzo in un cervello.
    //
    // Senza questo passaggio il meccanismo si rompe in silenzio, e ci ho sbattuto contro: siccome
    // essere vivi e mangiare tutti i giorni va quasi sempre bene, OGNI cosa risultava buona (+0,18)
    // e nessuna si distingueva dall'altra. Popoli diversi avevano le stesse identiche inclinazioni,
    // e la paura si prosciugava perché il mondo pareva costantemente rassicurante.
    npc._esitoMedio = (npc._esitoMedio === undefined ? grezzo : npc._esitoMedio * 0.985 + grezzo * 0.015);
    const esito = Math.max(-1, Math.min(1, grezzo - npc._esitoMedio));
    // Chi ha memoria e testa impara di più; chi è ottuso lega a caso e si porta dietro le paure.
    const lucidita = 0.35 + npc.intelligenza * 0.65;
    for (const [k, p] of npc._traccia) {
      impara(npc, k, esito, p * lucidita * (k[0] === "m" ? 1.4 : 0.7));
    }
    if (delta < -0.09) npc._scosso = 1;              // hai preso uno spavento: sei più suggestionabile
  }
}

// =================================================================================================
// OSSERVAZIONE (solo per l'interfaccia). Nessuno di questi numeri torna dentro la simulazione: è
// il modo in cui NOI, guardando da fuori, ci accorgiamo che un popolo ha preso una piega. Loro non
// sanno di averla presa, e non hanno un nome per dirla.
// =================================================================================================
const NOMI = {
  l0: "nel buio", l2: "in piena luce", c0: "al freddo", c2: "nel caldo",
  p2: "sui pendii", p0: "in piano", f0: "da soli", f2: "in molti",
  v2: "quando sono riposati", v0: "allo stremo", a1: "nell'acqua", a0: "all'asciutto",
};

export function inclinazioni(pop, filtro = null, minimo = 8) {
  const somma = new Map();
  let quanti = 0;
  for (const npc of pop.npcs) {
    if (!npc.vivo || !npc.esperienze) continue;
    if (filtro && !filtro(npc)) continue;
    quanti++;
    for (const [k, e] of npc.esperienze) {
      if (!NOMI[k]) continue;
      const s = somma.get(k) || { v: 0, n: 0 };
      s.v += e.v * Math.min(1, e.n / 3); s.n++;
      somma.set(k, s);
    }
  }
  if (quanti < minimo) return [];
  // LA PIEGA È RELATIVA. Guardando i numeri nudi risultavano tutti negativi — usciva un popolo che
  // «si trova male in piena luce E nel buio», che non vuol dire niente. Non era un errore
  // dell'apprendimento: le perdite sono brusche e i guadagni graduali, quindi la media di
  // qualunque cosa pende un po' verso il basso. Ma quello che dice qualcosa di un popolo non è
  // quanto sta male in assoluto — è DOVE sta meno peggio che altrove. Si toglie la media di tutti
  // i canali e si guarda lo scarto: è la stessa legge della sorpresa, applicata al referto.
  const medie = [];
  for (const [k, s] of somma) if (NOMI[k]) medie.push([k, s.v / Math.max(1, quanti), s.n]);
  if (!medie.length) return [];
  const centro = medie.reduce((a, [, v]) => a + v, 0) / medie.length;
  // Non c'e' una soglia sotto cui una piega "non conta": conta la CLASSIFICA. Con una soglia fissa
  // capitava che passasse solo la coda negativa, e usciva un popolo che sta male dappertutto.
  const out = [];
  for (const [k, v, n] of medie) {
    if (n <= quanti * 0.25) continue;                 // deve averla provata abbastanza gente
    out.push({ chiave: k, nome: NOMI[k], v: v - centro });
  }
  // Si mostra il CONTRASTO, non la coda. Ordinando per grandezza uscivano quattro voci tutte
  // dallo stesso lato — vero, ma illeggibile: un popolo si racconta dicendo dove sta meglio E
  // dove sta peggio, non elencando quattro cose che gli piacciono poco.
  out.sort((a, b) => b.v - a.v);
  const su = out.filter((o) => o.v > 0).slice(0, 2);
  const giu = out.filter((o) => o.v < 0).slice(-2).reverse();
  return [...su, ...giu];
}

// Le avversioni verso le COSE: qui il nome del materiale c'è, ma solo perché va scritto a schermo.
export function avversioni(pop, registry) {
  const somma = new Map();
  let quanti = 0;
  for (const npc of pop.npcs) {
    if (!npc.vivo || !npc.esperienze) continue;
    quanti++;
    // UNO EVITA CIÒ CHE GLI È ANDATO PEGGIO DEL RESTO, non ciò che sta sotto un numero deciso da
    // fuori. Con la soglia fissa (−0,25) non usciva mai niente: da quando si impara dalla sorpresa
    // i valori sono piccoli, e nessun materiale ci arrivava. Ma un tabù non è «questa cosa è
    // cattiva in assoluto» — è «questa cosa mi è andata male più delle altre», e quello si vede
    // solo confrontandola con le altre cose che quella persona ha in testa.
    let mio = 0, quante = 0;
    for (const [k, e] of npc.esperienze) if (k[0] === "m") { mio += e.v; quante++; }
    if (quante < 3) continue;
    mio /= quante;
    for (const [k, e] of npc.esperienze) {
      if (k[0] !== "m" || e.n < 3) continue;
      let c = somma.get(k);
      if (!c) { c = { conoscono: 0, evitano: 0 }; somma.set(k, c); }
      c.conoscono++;
      if (e.v <= mio - 0.12) c.evitano++;
    }
  }
  // IL DENOMINATORE GIUSTO È CHI QUELLA COSA LA CONOSCE. Prima si chiedeva che a rifiutarla fosse
  // il 12% del mondo intero: con settemila persone volevano dire ottocentosessanta persone sulla
  // stessa identica materia, e non usciva mai niente. Ma un tabù non è una cosa del mondo — è una
  // cosa di chi quella materia l'ha avuta per le mani. La domanda giusta è: di quelli che la
  // conoscono, quanti la evitano?
  // QUANTO SI STACCA DAL SOLITO. Anche una cosa qualunque viene sfortunata a qualcuno: c'e' un
  // tasso di fondo con cui qualsiasi materia finisce sotto la media di chi la maneggia. Chiedere
  // «la meta' di chi la conosce» era un numero deciso da me, e infatti non usciva mai niente:
  // la cosa piu' rifiutata di tutto il mondo stava a 0,38. Ma 0,38 contro un fondo di 0,22 e' un
  // fatto. Cosi' la soglia se la da' il mondo: e' tabu' cio' che viene evitato molto piu' di
  // quanto venga evitata una cosa qualsiasi.
  let evTot = 0, coTot = 0;
  for (const c of somma.values()) { evTot += c.evitano; coTot += c.conoscono; }
  const fondo = coTot ? evTot / coTot : 0;
  const out = [];
  for (const [k, c] of somma) {
    if (c.conoscono < 12) continue;                     // due o tre pareri non fanno un'usanza
    const quota = c.evitano / c.conoscono;
    if (quota < fondo * 1.5 || quota < 0.15) continue;
    const m = registry.mat(+k.slice(1));
    if (m) out.push({ nome: m.nome, quota, quanti: c.conoscono });
  }
  out.sort((a, b) => b.quota - a.quota);
  return out.slice(0, 6);
}
