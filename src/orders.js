import { P } from "./params.js";
// ORDINI — il potere dell'AI sugli NPC. Principio NON negoziabile del progetto: un ordine NON è
// esecuzione, è INFLUENZA. Il capo non ha un telecomando: ha autorità sociale. Ogni NPC decide se
// obbedire in base a lealtà, paura, conformismo, distanza dal capo e ai PROPRI bisogni:
//   • chi muore di fame o di sete ignora qualunque ordine (la biologia batte la politica);
//   • chi è leale/timoroso/conformista obbedisce anche a ordini che non gli convengono;
//   • chi obbedisce controvoglia accumula MALCONTENTO → e il malcontento uccide i re.
// Da qui il ciclo di potere: governi male → non ti obbediscono più → cadi. Nessuna regola scritta.

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Compiti che un editto può assegnare. Ognuno è solo un'ETICHETTA che dirotta il comportamento
// già esistente dell'NPC: non introduce azioni nuove, riusa le leggi del mondo.
export const COMPITI = ["raccogliere", "costruire", "coltivare", "esplorare", "migrare",
  "attaccare", "difendere", "pregare", "festeggiare", "studiare", "commerciare",
  // LEVE DEL POTERE — primitivi neutri, non istituzioni. Nessuno di questi è "la dittatura":
  // sono la possibilità di farsi proteggere, di usare la forza sui propri e di comprare fedeltà.
  // Che ne esca un tiranno con le sue guardie o un principe generoso lo decide chi comanda.
  "proteggere", "reprimere", "donare"];


// ─────────────────────────────────────────────────────────────────────────────────────────────
// LE PAROLE NUOVE. Un capo puo' ordinare qualunque cosa, anche una cosa che nella lingua del
// mondo non esiste. Prima veniva scartata: l'AI era libera solo a parole, e il resoconto le
// diceva perfino che era stata eseguita. Ora accade quello che accade davvero quando qualcuno
// riceve un ordine che non capisce: NON chiede spiegazioni, fa la cosa piu' sensata che gli
// viene in mente — e quella diventa, per lui e per i suoi, il significato della parola.
//
// Da qui vengono tre cose che nessuno ha scritto:
//   • ogni popolo puo' dare alla STESSA parola un senso diverso (e' cosi' che nascono i dialetti);
//   • una parola che porta bene si radica, una che porta male si sfalda e viene reinterpretata;
//   • il capo scopre dal resoconto quali sue parole attecchiscono, e impara a parlare la lingua
//     del suo popolo invece che la propria.
//
// Il motore NON sa cosa voglia dire la parola. Sa solo quali gesti ha un corpo, e sceglie fra
// quelli in base a cio' che chi ascolta gia' conosce: la cosa nominata, il posto indicato, e
// in mancanza d'altro il mestiere delle sue mani.

// Quale gesto corrisponde a una vita passata a fare una certa cosa. Non e' una lista di lavori
// leciti: e' l'elenco dei movimenti che un corpo ha, lo stesso da cui nascono i mestieri.
const GESTO_DI_UNA_VITA = {
  coltura: "coltivare", costruzione: "costruire", combattimento: "attaccare",
  esplorazione: "esplorare", raccolta: "raccogliere", caccia: "raccogliere",
  commercio: "commerciare", invenzione: "studiare", predicazione: "pregare",
  cura: "proteggere", insegnamento: "studiare", opera: "festeggiare",
};

function lessicoDi(pop) { return pop.significati || (pop.significati = new Map()); }
function chiaveParola(npc, parola) { return (npc.fazione ?? "x") + "|" + parola; }

// Che cosa capisce COSTUI, adesso, di una parola che nessuno gli ha spiegato.
//
// Non basta guardare che mestiere fa: alla prima prova quasi tutti finivano per capire
// «raccogliere», perche' raccogliere e' quello che fa la maggior parte della gente, e cosi'
// ogni parola nuova voleva dire la stessa cosa. Mancava il pezzo piu' ovvio: una frase oscura
// si interpreta guardando IN CHE SITUAZIONE viene detta. «Fortificare» gridato mentre arrivano
// gli armati e «fortificare» detto in un anno di carestia non finiscono per voler dire la
// stessa cosa, e non e' un difetto della lingua — e' come funziona la lingua.
function indovina(pop, npc, ordine) {
  // a) la cosa nominata. Se e' roba che conosce, la parola vuol dire "procurala".
  const b = ordine.bersaglio ? String(ordine.bersaglio).toLowerCase() : null;
  if (b) {
    for (const id of npc.inventory.keys()) {
      const m = pop.registry.byId ? pop.registry.byId.get(id) : null;
      if (m && m.nome && b.includes(m.nome.toLowerCase())) return "raccogliere";
    }
    // b) se nomina un altro popolo, quel che si fa dipende da come lo si sente: con chi si
    //    detesta si va addosso, con chi non si detesta si va a trattare.
    if (pop.identityNames) {
      for (const [id, nome] of pop.identityNames) {
        if (id === npc.fazione || !b.includes(String(nome).toLowerCase())) continue;
        return npc.emo.rabbia > 0.4 || npc.aggressivita > 0.6 ? "attaccare" : "commerciare";
      }
    }
  }
  // c) un posto lontano indicato: la parola vuol dire "vacci".
  if (ordine.x != null && Math.hypot(npc.x - ordine.x, npc.y - ordine.y) > 25) return "esplorare";

  // d) LA CIRCOSTANZA. Si guarda cosa preme, adesso, a chi ascolta — e la stessa parola prende
  //    sensi diversi in bocca a popoli che stanno vivendo cose diverse.
  const estranei = pop.vicini(npc.x, npc.y, 14).filter((o) => o.fazione != null && o.fazione !== npc.fazione).length;
  if (estranei >= 3) return npc.coraggio > 0.5 || npc.aggressivita > 0.5 ? "attaccare" : "difendere";
  if (npc.emo.paura > 0.55) return "difendere";
  if (npc.fame > 0.5) return npc.azioni.coltura > 2 ? "coltivare" : "raccogliere";
  if (!npc.casa || npc.riparo > 0.6) return "costruire";
  if (npc.malcontento > 0.5) return "festeggiare";        // in mezzo al malumore si legge una festa
  if (npc.emo.speranza > 0.6 && npc.spiritualita > 0.55) return "pregare";

  // e) niente preme e niente e' riconoscibile: si fa quello che si sa fare. E' la risposta piu'
  //    umana a un ordine oscuro — chi non capisce non sta fermo, torna al proprio mestiere.
  let miglior = null, quanto = 1;
  for (const az in npc.azioni) { const v = npc.azioni[az] || 0; if (v > quanto) { quanto = v; miglior = az; } }
  return (miglior && GESTO_DI_UNA_VITA[miglior]) || "raccogliere";
}

// IL SENSO SI ASSESTA A MAGGIORANZA. Prima decideva il primo che sentiva la parola, e da li' in
// poi tutti gli altri leggevano il suo verdetto: bastava un uomo per fissare una lingua. Adesso
// i primi che la sentono la intendono ognuno a modo suo, e vince quella che intendono in piu'.
// Passata la soglia la parola e' fatta, e la si usa come la usano i propri — che e' esattamente
// quello che rende una lingua una lingua e non un'opinione.
const QUANTI_LA_FANNO = 8;

function interpreta(pop, npc, ordine) {
  const lex = lessicoDi(pop);
  const k = chiaveParola(npc, ordine.tipo);
  let voce = lex.get(k);
  if (!voce) {
    voce = { gesto: null, forza: 0.25, usi: 0, voti: new Map(), parola: ordine.tipo };
    lex.set(k, voce);
    pop.paroleNate = (pop.paroleNate || 0) + 1;
  }
  voce.usi++;
  // Se e' gia' assestata e regge, la si segue. Se si sta sfaldando, ogni tanto si torna a
  // indovinare: e' cosi' che una parola che ha portato male puo' finire per voler dire altro.
  if (voce.gesto && voce.usi > QUANTI_LA_FANNO) {
    // assestata e viva: la si usa come la usano i propri.
    if (voce.forza > 0.1) return voce.gesto;
    // assestata ma che ha portato male: per lo piu' la si segue lo stesso (le parole hanno
    // inerzia), ma ogni tanto qualcuno ci ripensa — ed e' cosi' che una parola cambia senso.
    if (pop.rng() > 0.4) return voce.gesto;
  }

  const mio = indovina(pop, npc, ordine);
  voce.voti.set(mio, (voce.voti.get(mio) || 0) + 1);
  let vinc = null, max = 0;
  for (const [g, n] of voce.voti) if (n > max) { max = n; vinc = g; }
  if (voce.gesto && voce.gesto !== vinc) pop.paroleCambiate = (pop.paroleCambiate || 0) + 1;
  voce.gesto = vinc;
  return mio;      // per ORA fa quel che ha capito lui; il senso comune si formera' dopo
}

// COM'E' ANDATA. La parola non vale per quello che significa: vale per come e' finita a chi l'ha
// obbedita. Stessa legge dell'esperienza — si impara dall'esito, non dall'intenzione.
function pesaParola(pop, npc, ordine, bene) {
  if (!ordine._nuova) return;
  const voce = lessicoDi(pop).get(chiaveParola(npc, ordine.tipo));
  if (!voce) return;
  voce.forza = Math.max(0, Math.min(1, voce.forza + (bene ? 0.12 : -0.12)));
}

// Quanto un NPC è disposto a obbedire a QUESTO ordine, ADESSO.
export function obbedienza(pop, npc, editto, leader) {
  if (!leader || !leader.vivo) return 0;
  // 1) I bisogni vitali vengono prima di tutto: nessuno costruisce mentre muore di sete.
  if (npc.fame > 0.85 || npc.sete > 0.85 || npc.salute < 0.35) return 0;
  if (npc.stanchezza > 1.0) return 0;
  // 2) Autorità percepita: lealtà + paura + conformismo + fede condivisa - malcontento - ribellione
  //
  // I DELEGATI. La voce del capo si spegne con la distanza — è già legge, e non cambia. Ma un
  // ordine non deve per forza arrivare dalla sua bocca: se il capo ha nominato qualcuno, quel
  // qualcuno lo porta dove lui non arriva, e chi lo sente vicino obbedisce a lui. Non c'è nessuna
  // «gerarchia» scritta: c'è che la voce più vicina si sente meglio, e basta.
  //
  // È il motivo per cui gli imperi grandi hanno sempre avuto governatori: non per organigramma,
  // ma perché a novanta passi di distanza nessuno ti sente. E porta con sé il suo rovescio — un
  // delegato lontano e ascoltato è esattamente la stoffa di cui è fatto un usurpatore.
  let piuVicino = leader;
  let d = Math.hypot(npc.x - leader.x, npc.y - leader.y);
  const ruoli = pop.aiStati?.get(npc.fazione)?.ruoli;
  if (ruoli) {
    for (const r of Object.values(ruoli)) {
      const del = r._npc && r._npc.vivo ? r._npc : null;
      if (!del || del === npc) continue;
      const dd = Math.hypot(npc.x - del.x, npc.y - del.y);
      if (dd < d) { d = dd; piuVicino = del; }
    }
  }
  // Un delegato non è il re: la sua voce vale meno, e quanto meno dipende da quanto potere ha
  // messo insieme. Ecco perché a un delegato conviene accumularne — e da lì nascono i guai.
  const vocePropria = piuVicino === leader ? 1 : 0.55 + Math.min(0.35, (piuVicino._potereRuolo || 0.2));
  const distanza = Math.max(0, 1 - d / 90) * vocePropria;   // gli ordini arrivano attenuati da lontano
  const stessaFede = npc.credo != null && npc.credo === leader.credo ? 0.15 : 0;
  const servo = npc._padrone === leader.id ? 0.3 : 0; // chi è sottomesso obbedisce di più
  let a = P.aiPesoLealta * npc.emo.lealta + P.aiPesoPaura * npc.emo.paura + 0.25 * npc.conformismo
        + 0.2 * (npc.bias?.autorita || 0.4) + stessaFede + servo
        // Un capo che risplende viene ascoltato di più — non perché abbia ragione, ma perché pare
        // uno che conta. È il motivo per cui il potere si è sempre vestito bene.
        + Math.min(0.25, (leader._sfarzo || 0) * 0.12) * (npc.bias?.autorita || 0.4)
        - 0.5 * npc.malcontento - (npc.ribelle ? 0.6 : 0);
  a *= 0.35 + 0.65 * distanza;
  // 3) Il tipo di ordine pesa: rischiare la vita richiede molta più autorità che raccogliere.
  const costo = { attaccare: P.aiCostoAttacco, migrare: P.aiCostoMigrazione, esplorare: 0.2,
    reprimere: 0.4, proteggere: 0.15, costruire: 0.1, coltivare: 0.1 }[editto.tipo] || 0.05;
  a -= costo * (1 - npc.coraggio * 0.5);
  return clamp01(a);
}

// Assegna gli editti attivi di una fazione ai suoi membri (una volta ogni tanto, non a ogni tick).
export function assegnaOrdini(pop, faction, dt) {
  const st = pop.aiStati?.get(faction.id);
  if (!st || !st.editti?.length) return;
  const leader = faction._leader;
  for (const ed of st.editti) {
    if (ed.fino != null && pop.anno > ed.fino) continue;
    let assegnati = 0;
    const quanti = Math.max(1, Math.min(ed.quanti || 5, faction.membri));
    if (ed._contato === undefined) {
      ed._contato = 0;
      if (!st.esitoEditti) st.esitoEditti = [];
      ed._riga = { tipo: ed.tipo, inedito: !!ed.inedito, raccolto: 0, chiesti: quanti };
      st.esitoEditti.push(ed._riga);
      if (st.esitoEditti.length > 6) st.esitoEditti.shift();
    }
    for (const npc of faction._membri) {
      if (assegnati >= quanti) break;
      if (!npc.vivo || npc === leader) continue;
      if (npc._ordine && npc._ordine.fino > pop.anno) continue;  // ha già un incarico in corso
      const p = obbedienza(pop, npc, ed, leader);
      if (pop.rng() < p) {
        npc._ordine = { tipo: ed.tipo, x: ed.x, y: ed.y, bersaglio: ed.bersaglio, fino: pop.anno + (ed.durata || 4),
          _nuova: !COMPITI.includes(ed.tipo),                 // parola che il mondo non conosce
          _prima: npc._ben ?? 0 };   // il benessere che gia' si misura: e' il metro giusto, e non costa niente
        assegnati++;
        st.eseguiti = (st.eseguiti || 0) + 1;
        if (ed._riga) ed._riga.raccolto++;
        // Obbedire a un ordine gravoso quando non se ne ha voglia LOGORA: il consenso si consuma.
        if ((ed.tipo === "attaccare" || ed.tipo === "migrare") && npc.emo.lealta < 0.6) {
          npc.malcontento = clamp01(npc.malcontento + 0.06);
          st.consenso = clamp01((st.consenso ?? 0.5) - 0.01);
        }
      } else {
        st.ignorati = (st.ignorati || 0) + 1;
        // Un ordine ignorato erode l'autorità percepita del capo (e lui lo scoprirà dal report).
        st.consenso = clamp01((st.consenso ?? 0.5) - 0.004);
      }
    }
  }
}

// Esegue il compito assegnato a un NPC. Ritorna true se l'ordine ha "consumato" il turno.
// NB: i movimenti passano da moveToward → pagano fame/stanchezza/terreno come qualunque altro
// spostamento. Nessun teletrasporto: marciare per ordine del re costa esattamente come marciare.
export function eseguiOrdine(pop, npc, dt, speed) {
  const o = npc._ordine;
  if (!o) return false;
  if (pop.anno > o.fino) {
    // L'ordine e' scaduto: si tira la somma. Se chi l'ha seguito sta meglio di quando gliel'hanno
    // detto, quella parola ha voluto dire qualcosa di buono, e attecchisce.
    pesaParola(pop, npc, o, (npc._ben ?? 0) > (o._prima ?? 0));
    npc._ordine = null; return false;
  }
  // Se nel frattempo i bisogni sono diventati urgenti, l'ordine viene abbandonato (l'uomo prima
  // del suddito): ed è così che le campagne militari si sfaldano per la fame.
  if (npc.fame > 0.9 || npc.sete > 0.9 || npc.salute < 0.3) { pesaParola(pop, npc, o, false); npc._ordine = null; return false; }

  const lontano = o.x != null && Math.hypot(npc.x - o.x, npc.y - o.y) > 3;
  // Una parola che il mondo non conosce va prima CAPITA: chi la riceve la traduce in un gesto
  // che sa fare, e da quel momento per i suoi la parola vuol dire quello.
  const gesto = o._nuova ? (o._gesto || (o._gesto = interpreta(pop, npc, o))) : o.tipo;
  switch (gesto) {
    case "migrare":
      npc.migrante = true; npc.migMeta = [o.x ?? npc.x, o.y ?? npc.y]; npc._ordine = null; return false;
    case "esplorare":
      npc._esplora = [o.x ?? npc.x, o.y ?? npc.y]; npc._casaBase = [npc.x, npc.y]; npc._ordine = null; return false;
    case "attaccare":
      // marcia verso il fronte; lo scontro vero lo risolve il sistema di guerra (culture.js)
      npc._bellicoso = pop.anno + 3;
      if (lontano) { pop.moveTowardPub(npc, o.x, o.y, speed); return true; }
      return false;
    case "difendere":
      npc._difensore = pop.anno + 3;
      if (lontano) { pop.moveTowardPub(npc, o.x, o.y, speed); return true; }
      return false;
    case "costruire":
      if (lontano) { pop.moveTowardPub(npc, o.x, o.y, speed); return true; }
      pop.maybeBuildHouse(npc, dt * 3); return true;
    case "coltivare":
      if (lontano) { pop.moveTowardPub(npc, o.x, o.y, speed); return true; }
      if (!npc.casa) npc.casa = [npc.x, npc.y];   // il campo ha bisogno di una base
      pop.maybeFarm(npc, dt * 3); return true;
    case "raccogliere":
      if (lontano) { pop.moveTowardPub(npc, o.x, o.y, speed); return true; }
      pop.gatherAndCraft(npc); return true;
    case "studiare":
      if (npc.inventore && pop.rng() < 0.08) pop.experiment(npc);
      return false;
    case "pregare":
      npc.emo.speranza = clamp01(npc.emo.speranza + 0.02 * dt);
      npc.emo.lealta = clamp01(npc.emo.lealta + 0.02 * dt);
      return false;
    case "festeggiare":
      npc.emo.gioia = clamp01(npc.emo.gioia + 0.03 * dt);
      npc.malcontento = clamp01(npc.malcontento - 0.02 * dt);
      return false;
    case "commerciare":
      if (lontano) { pop.moveTowardPub(npc, o.x, o.y, speed); return true; }
      return false;
    case "proteggere": {
      // GUARDIA: sta addosso al capo e scoraggia chi gli si avvicina con brutte intenzioni.
      const f = pop.factions.find((x) => x.id === npc.fazione);
      const L = f && f._leader;
      if (!L || !L.vivo) { npc._ordine = null; return false; }
      npc._guardia = pop.anno + 2;
      const d2 = (npc.x - L.x) ** 2 + (npc.y - L.y) ** 2;
      if (d2 > 36) { pop.moveTowardPub(npc, L.x, L.y, speed); return true; }
      return false;
    }
    case "reprimere": {
      // FORZA SUI PROPRI: colpisce chi non riconosce più il capo. Funziona — e proprio per
      // questo costa: chi assiste impara che dissentire fa male, e la paura sale insieme all'odio.
      const f = pop.factions.find((x) => x.id === npc.fazione);
      if (!f) { npc._ordine = null; return false; }
      let bersaglio = null, bd = 26 * 26;
      for (const m of f._membri) {
        if (!m.vivo || m === npc || (!m.ribelle && m.malcontento < 0.55)) continue;
        const d = (m.x - npc.x) ** 2 + (m.y - npc.y) ** 2;
        if (d < bd) { bd = d; bersaglio = m; }
      }
      if (!bersaglio) return false;
      if (bd > 6) { pop.moveTowardPub(npc, bersaglio.x, bersaglio.y, speed); return true; }
      bersaglio.salute -= 0.25 + npc.forza * 0.25;
      bersaglio.emo.paura = clamp01(bersaglio.emo.paura + 0.5);
      bersaglio.emo.rabbia = clamp01(bersaglio.emo.rabbia + 0.3);
      bersaglio.memoria.set(npc.id, -1);
      npc.azioni.combattimento++; npc._att = "reprimere";
      pop.repressioni = (pop.repressioni || 0) + 1;
      if (bersaglio.salute <= 0) { bersaglio.vivo = false; pop.morti++; pop.omicidi = (pop.omicidi || 0) + 1; }
      // chi vede la repressione tace, ma non dimentica
      for (const t of f._membri) {
        if (!t.vivo || (t.x - bersaglio.x) ** 2 + (t.y - bersaglio.y) ** 2 > 100) continue;
        t.emo.paura = clamp01(t.emo.paura + 0.15);
        t.ribelle = false;
        t.malcontento = clamp01(t.malcontento + 0.05);
      }
      return true;
    }
    case "donare": {
      // COMPRARE FEDELTÀ: il capo cede del suo a chi lo serve. La lealtà si può guadagnare
      // meritandola o pagandola — al motore non interessa la differenza.
      const f = pop.factions.find((x) => x.id === npc.fazione);
      const L = f && f._leader;
      if (!L || !L.vivo || !L.inventory.size) { npc._ordine = null; return false; }
      if ((npc.x - L.x) ** 2 + (npc.y - L.y) ** 2 > 64) { pop.moveTowardPub(npc, L.x, L.y, speed); return true; }
      for (const [id, q] of L.inventory) {
        if (q <= 0) continue;
        L.inventory.set(id, q - 1); npc.addMat(id, 1);
        npc.emo.lealta = clamp01(npc.emo.lealta + 0.25);
        npc.emo.gratitudine = clamp01(npc.emo.gratitudine + 0.3);
        npc.malcontento = clamp01(npc.malcontento - 0.15);
        npc.memoria.set(L.id, clamp01((npc.memoria.get(L.id) || 0) + 0.3));
        pop.elargizioni = (pop.elargizioni || 0) + 1;
        break;
      }
      npc._ordine = null;
      return false;
    }
    default:
      npc._ordine = null; return false;
  }
}
