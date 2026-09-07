// ═══ IL META-LIVELLO — ENTITÀ E EVOLUZIONE APERTA ═══════════════════════════════════════════
// L'ultimo passo del progetto, e il più radicale.
//
// Fin qui ogni cosa culturale aveva il suo modulo dedicato: le religioni in culture.js, la moneta
// in economy.js, le norme in society.js, le invenzioni in chemistry.js. Il motore SAPEVA cosa
// fosse una religione. Qui quella distinzione cade: esiste UNA SOLA struttura — l'ENTITÀ — e
// religioni, monete, norme, mestieri, tecniche, opere e popoli ne sono solo istanze diverse.
//
// Ma il punto non è ordinare ciò che c'è già: è ciò che diventa possibile DOPO.
// Se tutto è un'entità con attributi generici e relazioni, allora un essere umano può COMBINARE
// due entità che conosce e ottenerne una TERZA che il motore non ha mai previsto. Non un oggetto
// nuovo: una CATEGORIA nuova. Il motore non sa cosa sia una scuola, una banca, un tribunale o una
// guerra santa — sa solo che qualcuno ha unito "chi insegna" e "un luogo dove stare", che la cosa
// ha un costo e un beneficio, e che chi l'ha adottata se ne è trovato meglio (o peggio).
//
// Da lì in poi decide la selezione culturale: le istituzioni che rendono si diffondono, quelle
// che pesano vengono dimenticate. Nessuno ha scritto quali possano esistere.

import { AFF } from "./chemistry.js";
import { nomeGenere } from "./chemistry.js";

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Gli EFFETTI che un'entità può avere sul mondo. Sono volutamente GENERICI e astratti: non
// "cura le malattie" o "insegna a leggere", ma dimensioni elementari che qualunque istituzione
// può toccare in qualche misura. È questa astrazione a permettere combinazioni impreviste.
export const ASSI = ["coesione", "sapere", "ricchezza", "ordine", "forza", "morale"];

let _eid = 0;

export function initEntities(pop) {
  pop.entita = new Map();          // id -> entità
  pop.entitaPerChiave = new Map(); // chiave naturale -> id (per non duplicare l'indicizzazione)
  pop.concetti = 0;                // quante CATEGORIE inedite sono state inventate
  pop.concettiVivi = 0;
  pop.entitaEstinte = 0;
}

function nuovaEntita(pop, { nome, tipo, attributi = {}, origine = "?", creatore = null, genitori = [], chiave = null }) {
  const e = {
    id: ++_eid, nome, tipo,
    attributi: Object.fromEntries(ASSI.map((a) => [a, attributi[a] || 0])),
    costo: attributi.costo || 0.1, rischio: attributi.rischio || 0,
    relazioni: genitori.map((g) => ({ verso: g, tipo: "discende-da" })),
    origine, creatore, anno: Math.floor(pop.anno),
    diffusione: 0, portatori: new Set(),
    affidabilita: 0.2, prove: 0, beneficioOsservato: 0,
    prestigio: 0.2, eta: 0, inedita: !!genitori.length,
  };
  pop.entita.set(e.id, e);
  if (chiave) pop.entitaPerChiave.set(chiave, e.id);
  return e;
}

// ---------------------------------------------------------------------------------------------
// 1) INDICIZZAZIONE — ciò che già emerge nei vari moduli viene RILETTO come entità. I sistemi
// esistenti continuano a funzionare come prima: qui si costruisce solo il livello comune su cui
// la combinazione (punto 2) può operare. Ogni dominio porta con sé i propri assi caratteristici.
function indicizza(pop) {
  const reg = (chiave, dati) => {
    const id = pop.entitaPerChiave.get(chiave);
    if (id && pop.entita.has(id)) return pop.entita.get(id);
    return nuovaEntita(pop, { ...dati, chiave });
  };
  // RELIGIONI → coesione e morale, con un costo di tempo (riti) e il rischio del fanatismo
  for (const r of pop.religioni || []) {
    const e = reg("rel:" + r.id, { nome: r.nome, tipo: "fede", origine: "profeta",
      attributi: { coesione: 0.6, morale: 0.5, ordine: 0.2, costo: 0.15, rischio: 0.25 } });
    e.diffusione = r.credenti;
  }
  // MESTIERI → sapere e ricchezza (la specializzazione produce di più)
  const mest = new Map();
  for (const n of pop.npcs) if (n.vivo && n.mestiere) mest.set(n.mestiere, (mest.get(n.mestiere) || 0) + 1);
  for (const [m, q] of mest) {
    const assi = { guaritore: { sapere: .5, morale: .3 }, cacciatore: { ricchezza: .4, forza: .3 },
      agricoltore: { ricchezza: .6 }, costruttore: { ordine: .3, ricchezza: .3 },
      inventore: { sapere: .7 }, mercante: { ricchezza: .6 }, maestro: { sapere: .8, coesione: .2 },
      guerriero: { forza: .8, rischio: .3 }, sacerdote: { coesione: .5, morale: .4 },
      artista: { morale: .6, coesione: .3 }, esploratore: { sapere: .4 }, raccoglitore: { ricchezza: .2 } }[m] || {};
    const e = reg("mest:" + m, { nome: m, tipo: "mestiere", origine: "pratica", attributi: { ...assi, costo: 0.1 } });
    e.diffusione = q;
  }
  // NORME → ordine (riducono i conflitti) ma costano libertà
  for (const [k, v] of Object.entries(pop.norme || {})) {
    const e = reg("norma:" + k, { nome: "norma sul " + k, tipo: "norma", origine: "conseguenze",
      attributi: { ordine: 0.7, coesione: 0.2, costo: 0.2, rischio: 0.1 } });
    e.diffusione = Math.round(v * (pop.npcs.length || 1) * 0.5);
  }
  // MONETA → ricchezza e scambio
  if (pop.moneta != null) {
    const m = pop.registry.mat(pop.moneta);
    if (m) { const e = reg("moneta:" + m.id, { nome: "il " + m.nome + " come moneta", tipo: "moneta",
      origine: "accettazione", attributi: { ricchezza: 0.8, ordine: 0.3, costo: 0.05 } });
      e.diffusione = pop.baratti || 0; }
  }
  // TECNICHE (le invenzioni consolidate) → sapere e, secondo la categoria, forza o ricchezza
  for (const b of pop.knowledge.list) {
    if (b.prove < 6 || b.verdetto !== "utile") continue;
    // Cosa porta al mondo una tecnica lo dicono le sue proprietà, non l'etichetta che le diamo.
    const assi = AFF.taglia(b) ? { forza: .6, rischio: .2 }
      : AFF.cura(b) ? { sapere: .3, morale: .3 }
      : AFF.nutre(b) ? { ricchezza: .4 }
      : AFF.regge(b) ? { ordine: .3, ricchezza: .2 }
      : (AFF.galleggia(b) || AFF.rotola(b)) ? { ricchezza: .4, sapere: .2 }
      : { sapere: .3 };
    // Se la cosa non ha ancora un nome, non le si appiccica una categoria: le si dà il nome che
    // questo mondo dà a tutto ciò che non è stato ancora battezzato, cioè uno inventato.
    const e = reg("tec:" + b.signature, { nome: b.nome || nomeGenere(String(b.signature), 17), tipo: "tecnica", origine: b.scopertoDa || "?",
      attributi: { ...assi, costo: 0.15 } });
    e.affidabilita = b.affidabilita;
  }
  // EDIFICI → ordine e l'effetto del loro tipo
  const tipiEd = new Map();
  for (const b of pop.buildings || []) tipiEd.set(b.tipo, (tipiEd.get(b.tipo) || 0) + 1);
  for (const [t, q] of tipiEd) {
    const e = reg("ed:" + t, { nome: t, tipo: "luogo", origine: "costruzione",
      attributi: { ordine: 0.4, ricchezza: 0.3, coesione: 0.3, costo: 0.3 } });
    e.diffusione = q;
  }
  // OPERE E TRADIZIONI → morale e coesione
  for (const [chiave, q] of (pop.tradizioni || new Map())) {
    const e = reg("trad:" + chiave, { nome: chiave.split("@")[0], tipo: "tradizione", origine: "ripetizione",
      attributi: { morale: 0.5, coesione: 0.5, costo: 0.1 } });
    e.diffusione = q;
  }
}

// ---------------------------------------------------------------------------------------------
// 2) CONCETTUALIZZAZIONE — il vero salto. Una persona sveglia e creativa mette insieme DUE cose
// che conosce e ne ricava una TERZA che prima non esisteva: non un oggetto, una CATEGORIA.
// Il motore non sa cosa stia nascendo. Sa solo comporre gli assi dei "genitori" e osservare se
// chi la adotta se ne trova bene. Il nome viene dalle sillabe dei genitori: sarà la gente a
// chiamarla in qualche modo, non noi.
function sillabe(nome) {
  const pulito = String(nome).toLowerCase().replace(/[^a-zàèéìòù]/g, "");
  return pulito.slice(0, 3 + (pulito.length % 2));
}
function concettualizza(pop, npc) {
  const noti = [];
  for (const e of pop.entita.values()) {
    if (e.diffusione > 0 || e.portatori.has(npc.id) || e.tipo === "tecnica") noti.push(e);
  }
  if (noti.length < 2) return;
  const a = noti[(pop.rng() * noti.length) | 0];
  const b = noti[(pop.rng() * noti.length) | 0];
  if (a === b) return;
  // due entità dello stesso identico tipo raramente generano qualcosa di nuovo
  if (a.tipo === b.tipo && pop.rng() < 0.7) return;
  // non reinventare una combinazione già esistente
  const chiave = "cpt:" + [a.id, b.id].sort().join("+");
  if (pop.entitaPerChiave.has(chiave)) return;

  // Gli assi si combinano: il meglio dei due, smorzato (mettere insieme non raddoppia), più una
  // mutazione. Il costo si somma: ogni istituzione pesa più delle parti che la compongono.
  const attributi = { costo: Math.min(1, (a.costo + b.costo) * 0.8), rischio: Math.max(a.rischio, b.rischio) * 0.9 };
  let potenza = 0;
  for (const ax of ASSI) {
    const v = clamp01(Math.max(a.attributi[ax], b.attributi[ax]) * 0.85
      + Math.min(a.attributi[ax], b.attributi[ax]) * 0.35
      + (pop.rng() - 0.45) * 0.25);
    attributi[ax] = v; potenza += v;
  }
  if (potenza < 0.35) return;   // un'idea che non serve a nulla non viene nemmeno formulata

  const e = nuovaEntita(pop, {
    nome: sillabe(a.nome) + sillabe(b.nome), tipo: "istituzione",
    origine: "intuizione", creatore: npc.id, genitori: [a.id, b.id], chiave, attributi,
  });
  e.portatori.add(npc.id);
  e.prestigio = 0.3 + (npc.creativita || 0.5) * 0.3;
  npc._att = "concepire";
  npc.reputazione.pensatore = (npc.reputazione.pensatore || 0) + 1;
  pop.concetti++;
  if (pop.chronicle) pop.chronicle(`Qualcuno mette insieme ${a.nome} e ${b.nome}: nasce «${e.nome}»`, 6);
  return e;
}

// ---------------------------------------------------------------------------------------------
// 3) SELEZIONE CULTURALE — un'istituzione non sopravvive perché è "giusta", ma perché a chi la
// pratica conviene. Chi la porta ne subisce COSTI e BENEFICI reali; gli altri guardano e imitano
// se vedono che funziona. Quella che pesa più di quanto renda viene abbandonata e dimenticata.
function vivi(pop, dt) {
  let concettiVivi = 0;
  // CHI È QUESTO NUMERO. Qui si cercava ogni portatore scorrendo tutta la gente, dentro il ciclo
  // di ogni istituzione: costo = istituzioni × portatori × popolazione. Con un elenco fatto una
  // volta sola diventa una lettura. Non cambia una virgola di quel che succede nel mondo.
  const chiE = new Map();
  for (const n of pop.npcs) if (n.vivo) chiE.set(n.id, n);
  for (const [id, e] of pop.entita) {
    e.eta += dt;
    if (e.tipo !== "istituzione") continue;
    concettiVivi++;
    // — effetto sui portatori —
    let beneficio = 0, n = 0;
    for (const pid of e.portatori) {
      const npc = chiE.get(pid);
      if (!npc) { e.portatori.delete(pid); continue; }
      n++;
      const A = e.attributi;
      // gli assi agiscono su ciò che nel mondo esiste già: emozioni, sapere, beni, salute
      if (A.coesione) { npc.emo.lealta = clamp01(npc.emo.lealta + A.coesione * 0.04 * dt); npc.malcontento = clamp01(npc.malcontento - A.coesione * 0.02 * dt); }
      if (A.morale) { npc.emo.gioia = clamp01(npc.emo.gioia + A.morale * 0.04 * dt); npc.emo.paura = clamp01(npc.emo.paura - A.morale * 0.02 * dt); }
      if (A.sapere && pop.rng() < A.sapere * dt * 0.3) {
        // chi pratica un'istituzione del sapere impara più in fretta da chi gli sta intorno
        for (const o of pop.vicini(npc.x, npc.y, 10)) {
          if (o === npc) continue;
          const nuove = [...o.sapere].filter((s) => !npc.sapere.has(s));
          if (nuove.length) { npc.sapere.add(nuove[0]); break; }
        }
      }
      if (A.ordine) npc.emo.paura = clamp01(npc.emo.paura - A.ordine * 0.02 * dt);
      if (A.forza) npc._bellicoso = pop.anno + 1;
      // il COSTO è reale: tempo e fatica sottratti al resto
      npc.stanchezza = Math.min(1.3, npc.stanchezza + e.costo * 0.02 * dt);
      npc.fame = Math.min(1.4, npc.fame + e.costo * 0.01 * dt);
      if (e.rischio && pop.rng() < e.rischio * dt * 0.02) npc.salute -= 0.1;
      // il beneficio percepito da questo portatore, ORA
      beneficio += (npc.emo.gioia + npc.emo.lealta) * 0.5 - npc.malcontento - e.costo * 0.5;
    }
    if (!n) {
      // nessuno la pratica più: se è anche vecchia, la si dimentica
      if (e.eta > 12) { pop.entita.delete(id); pop.entitaPerChiave.delete("cpt:" + e.relazioni.map((r) => r.verso).sort().join("+")); pop.entitaEstinte++; }
      continue;
    }
    e.beneficioOsservato = e.beneficioOsservato * 0.9 + (beneficio / n) * 0.1;
    e.prove += n * dt;
    e.affidabilita = e.prove / (e.prove + 8);
    e.diffusione = e.portatori.size;
    e.prestigio = clamp01(e.prestigio * 0.98 + Math.max(0, e.beneficioOsservato) * 0.05);

    // — IMITAZIONE: chi vede che funziona la adotta (i conformisti per primi) —
    if (e.beneficioOsservato > 0.05 && pop.rng() < dt * 0.6) {
      // il primo dei suoi che sia ancora vivo: si guarda fra i portatori, non fra tutta la gente
      let modello = null;
      for (const pid of e.portatori) { const m = chiE.get(pid); if (m) { modello = m; break; } }
      if (modello) {
        // UN'USANZA CHE FUNZIONA SI DIFFONDE IN PROPORZIONE A QUANTI LA VEDONO. Qui c'era lo
        // stesso difetto del contagio, e dentro lo stesso `break`: per quanti la praticassero e
        // per quanta gente ci fosse intorno, ogni tiro convertiva **una persona sola**. Ecco
        // perché le istituzioni restavano minuscole — misurato: nove usanze vive, la più diffusa
        // con dodici praticanti su settecento persone.
        //
        // È la legge di livello 4 che il progetto dichiara da sempre — «si imita chi riesce» — e
        // finora non poteva funzionare: si imitava chi riesce, ma uno per volta.
        for (const o of pop.vicini(modello.x, modello.y, 12)) {
          if (e.portatori.has(o.id)) continue;
          const apertura = (o.bias?.imitazione || 0.4) * 0.6 + o.conformismo * 0.4 + e.prestigio * 0.4;
          // Tarato dopo la misura, e la prima taratura era inutile: con 0,09 e una ventina di
          // vicini il risultato tornava IDENTICO a prima (la più diffusa all'1,6% del mondo contro
          // 1,7%). Avevo reso la diffusione proporzionale alla folla e poi scelto il coefficiente
          // che annullava l'effetto. Il collo vero è che il tiro scatta poche decine di volte in un
          // secolo: perché un'usanza che giova possa davvero attecchire, in mezzo alla gente deve
          // guadagnare più di una persona per volta.
          if (pop.rng() < apertura * 0.22) e.portatori.add(o.id);
        }
      }
    }
    // — ABBANDONO: se pesa più di quanto rende, la si molla —
    if (e.beneficioOsservato < -0.15 && e.portatori.size && pop.rng() < dt * 0.5) {
      const uscente = [...e.portatori][(pop.rng() * e.portatori.size) | 0];
      e.portatori.delete(uscente);
    }
  }
  pop.concettiVivi = concettiVivi;
}

// ---------------------------------------------------------------------------------------------
export function stepEntities(pop, dt) {
  if (!pop.entita) initEntities(pop);
  indicizza(pop);
  // chi pensa: creativi, intelligenti e non affamati. Pochissimi, come nella realtà.
  const tentativi = 3 + Math.min(12, (pop.npcs.length / 150) | 0);
  for (let k = 0; k < tentativi; k++) {
    const npc = pop.npcs[(pop.rng() * pop.npcs.length) | 0];
    if (!npc || !npc.vivo || npc.fame > 0.6 || npc.salute < 0.5) continue;
    const ingegno = (npc.creativita || 0.5) * 0.5 + npc.intelligenza * 0.4 + (npc.volonta || 0.5) * 0.2;
    if (ingegno < 0.68) continue;
    if (pop.rng() < dt * 0.5 * ingegno) concettualizza(pop, npc);
  }
  vivi(pop, dt);
}

// Riepilogo per l'interfaccia: le entità più diffuse, con i loro effetti e la loro storia.
export function entitaStats(pop) {
  if (!pop.entita) return null;
  const tutte = [...pop.entita.values()];
  const istituzioni = tutte.filter((e) => e.tipo === "istituzione")
    .sort((a, b) => b.portatori.size - a.portatori.size || b.prestigio - a.prestigio);
  const perTipo = {};
  for (const e of tutte) perTipo[e.tipo] = (perTipo[e.tipo] || 0) + 1;
  return {
    totali: tutte.length, perTipo, inventate: pop.concetti || 0, estinte: pop.entitaEstinte || 0,
    istituzioni: istituzioni.slice(0, 12).map((e) => ({
      nome: e.nome, portatori: e.portatori.size, anno: e.anno,
      beneficio: e.beneficioOsservato, prestigio: e.prestigio, costo: e.costo,
      assi: ASSI.filter((a) => e.attributi[a] > 0.25).map((a) => `${a} ${(e.attributi[a] * 100) | 0}`),
      da: e.relazioni.map((r) => pop.entita.get(r.verso)?.nome).filter(Boolean),
    })),
  };
}
