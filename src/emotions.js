// Sentimenti degli NPC. NESSUNA AI: le emozioni variano per regole in base a ciò che
// l'NPC vive (fame, salute, minacce, affollamento, aiuti/torti ricevuti). Dalle emozioni
// EMERGE il comportamento: paura->fuga, gioia->riproduzione, e la RIBELLIONE nasce da un
// malcontento cronico unito a poca lealtà. Nulla è hardcodato "ribellati": è conseguenza.
import { isWater } from "./world.js";
import { impara } from "./experience.js";
import { ostentabile } from "./desire.js";
import { P } from "./params.js";
import { tentaBaratto } from "./economy.js";
import { AFF } from "./chemistry.js";

export const EMOTIONS = [
  { key: "gioia",       label: "Gioia" },
  { key: "soddisfazione", label: "Soddisfazione" },
  { key: "speranza",    label: "Speranza" },
  { key: "fiducia",     label: "Fiducia" },
  { key: "gratitudine", label: "Gratitudine" },
  { key: "lealta",      label: "Lealtà" },
  { key: "paura",       label: "Paura" },
  { key: "tristezza",   label: "Tristezza" },
  { key: "rabbia",      label: "Rabbia" },
  { key: "invidia",     label: "Invidia" },
];

export function initEmotions() {
  return {
    gioia: 0.4, soddisfazione: 0.4, speranza: 0.4, fiducia: 0.4, gratitudine: 0.1,
    lealta: 0.5, paura: 0.1, tristezza: 0.1, rabbia: 0.05, invidia: 0.1,
  };
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Griglia spaziale leggera sugli umani (per affollamento e interazioni sociali).
function buildHumanGrid(npcs, cell) {
  const g = new Map();
  for (const n of npcs) {
    if (!n.vivo) continue;
    const k = ((n.x / cell) | 0) + "," + ((n.y / cell) | 0);
    let a = g.get(k); if (!a) { a = []; g.set(k, a); } a.push(n);
  }
  return g;
}
function cellNeighbors(grid, x, y, cell) {
  const cx = (x / cell) | 0, cy = (y / cell) | 0, out = [];
  for (let gy = cy - 1; gy <= cy + 1; gy++)
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      // NON con lo spread: `push(...arr)` passa ogni elemento come argomento, ed è lento su un
      // array grande — oltre a poter far saltare lo stack in una cella molto affollata.
      const arr = grid.get(gx + "," + gy);
      if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
    }
  return out;
}

// Aggiorna le emozioni di un NPC in base al suo stato attuale.
function updateEmotions(npc, dt, crowd, threat) {
  const e = npc.emo;
  const to = (k, target, rate) => { e[k] += (target - e[k]) * Math.min(1, rate * dt); };
  const affamato = npc.fame > 0.7, sazio = npc.fame < 0.35;
  const malato = npc.salute < 0.5, sano = npc.salute > 0.8;
  const sovraffollato = crowd > 6;

  // Il bias di DISPONIBILITÀ rallenta l'oblio: chi ce l'ha alto continua a temere ciò che ha
  // visto di recente, molto dopo che il pericolo è finito. È così che una carestia lascia
  // prudenti per generazioni.
  const oblio = 1 - (npc.bias?.disponibilita || 0.4) * 0.6;
  to("paura", threat ? 0.9 : (malato ? 0.5 : 0.05), threat ? 4 : 1.2 * oblio);
  to("gioia", (sazio && sano && !threat) ? 0.8 : (affamato || malato ? 0.1 : 0.45), 1.0);
  to("soddisfazione", (sazio && !threat && !sovraffollato) ? 0.75 : 0.2, 0.7);
  to("tristezza", (malato || affamato) ? 0.7 : 0.1, 0.8);
  to("speranza", (sazio && sano) ? 0.7 : 0.15, 0.5);
  to("rabbia", (affamato ? 0.5 : 0) + (sovraffollato ? 0.4 : 0), 1.0);
  // L'invidia NON viene resettata qui: la alimenta il motoreInvidia (confronto sociale) e
  // decade solo lentamente, così può accumularsi fino a diventare un'azione.
  e.invidia = clamp01(e.invidia - dt * 0.12 + (sovraffollato && affamato ? dt * 0.3 : 0));

  // Sofferenza CRONICA: si accumula lentamente sotto privazioni e decade piano.
  // Così una carestia lunga logora l'animo (e porta a ribellioni vere), mentre un
  // brutto momento passeggero viene superato.
  if (npc._sofferenza == null) npc._sofferenza = 0;
  const soffreOra = (affamato ? 1 : 0) + (malato ? 0.7 : 0);
  npc._sofferenza = clamp01(npc._sofferenza + (soffreOra > 0 ? P.sofferenzaRate * dt * soffreOra : -0.05 * dt));

  // Malcontento: rabbia + sofferenza cronica - benessere - lealtà. Genera la ribellione.
  npc.malcontento = clamp01(
    0.4 * e.rabbia + 0.25 * e.tristezza + 0.15 * e.paura + 0.2 * e.invidia + 0.4 * npc._sofferenza
    - 0.4 * e.gioia - 0.35 * e.lealta
  );
  // La lealtà cala se si è scontenti a lungo, cresce se si sta bene.
  to("lealta", npc.malcontento > 0.6 ? 0.05 : 0.6, 0.25);

  // RIBELLIONE emergente (con isteresi per non lampeggiare).
  if (npc.malcontento > P.sogliaRibellione && e.lealta < P.sogliaLealta) npc.ribelle = true;
  else if (npc.malcontento < 0.4) npc.ribelle = false;

  for (const k in e) e[k] = clamp01(e[k]);
}

// GUARDARE GLI ALTRI — da dove viene il lusso.
//
// Qui non nasce nessun oggetto nuovo: nasce un MODO DI GUARDARE, ed è tutto ciò che serviva. Se
// uno vede addosso a un altro una cosa che luccica, succedono due cose, e nessuna delle due è
// nuova in questo mondo:
//
//   1. IMPARA CHE QUELLA COSA È BUONA. Non perché l'abbia provata: perché ce l'ha uno che pare
//      qualcuno. È il prestigio come scorciatoia dell'apprendimento — copiare chi sembra riuscito
//      invece di scoprire da sé, che è come impariamo quasi tutto. E siccome finisce nello stesso
//      posto dove finisce l'esperienza vera, le due cose si fanno concorrenza: una cosa può
//      diventare amata da un popolo intero SENZA servire a niente. Questo è il lusso, e questa è
//      la moda: un desiderio che si regge su se stesso.
//
//   2. LO SI GUARDA DIVERSAMENTE. Chi ammira concede un po' di stima; chi invidia si rode. Sono
//      due facce della stessa occhiata, e a decidere quale tocchi a te sono i tuoi tratti.
//
// Il cerchio si chiude da solo: il superbo si carica di cose che luccicano → gli altri gliele
// invidiano e lo trattano meglio → quelle cose valgono di più → conviene ancora di più portarle.
// Nessuno ha scritto che l'oro è prezioso.
function guardaGliAltri(pop, npc, vicini, dt) {
  if (vicini.length < 2 || pop.rng() > dt * 0.5) return;
  const altro = vicini[(pop.rng() * vicini.length) | 0];
  if (!altro || altro === npc || !altro.vivo || !(altro._sfarzo > 0.25)) return;

  // Quanto quello lì ti sembra uno che conta: quello che porta addosso, più il posto che occupa,
  // più quanto sta sopra gli altri. Qui prima c'era scritto «se è nobile, +0,35»: ma nessuno
  // vede un ceto, si vede uno che sta meglio — e chi sta 2,19 volte sopra la media non è meno
  // impressionante di chi sta 2,21. Ora conta il quanto, non l'etichetta, e cresce per gradi.
  const sopraGliAltri = Math.max(0, ((altro._agiatezza ?? 1) - 1) * 0.3);
  const spicca = Math.min(1.6, altro._sfarzo * 0.5 + (altro._isLeader ? 0.7 : 0)
    + Math.min(0.5, sopraGliAltri));

  // (1) si impara a volere ciò che vedi addosso a chi ammiri
  let migliore = null, meglio = 0;
  for (const [id, q] of altro.inventory) {
    if (q <= 0) continue;
    const m = pop.registry.mat(id);
    if (!m) continue;
    const v = ostentabile(m);
    if (v > meglio) { meglio = v; migliore = id; }
  }
  if (migliore != null && meglio > 0.3) {
    const copia = npc.bias.imitazione * 0.55 + npc.superbia * 0.35 + npc.invidiaT * 0.3;
    if (copia > 0.15) {
      impara(npc, "m" + migliore, Math.min(1, spicca * 0.55), copia * 0.22);
      pop.sguardiInvidiosi = (pop.sguardiInvidiosi || 0) + 1;
    }
  }

  // (2) e lo si guarda diversamente: c'è chi ammira e chi si rode
  if (npc.invidiaT > 0.5) {
    npc.emo.invidia = Math.min(1, npc.emo.invidia + spicca * dt * 0.35 * npc.invidiaT);
    npc.malcontento = Math.min(1, npc.malcontento + spicca * dt * 0.06 * npc.invidiaT);
  } else {
    npc.memoria.set(altro.id, Math.max(-1, Math.min(1,
      (npc.memoria.get(altro.id) || 0) + spicca * dt * 0.25 * (npc.bias.autorita || 0.4))));
  }
}

// Passo sociale: affollamento, minacce, condivisione del cibo e aggressioni (memoria).
const TURNI = 3;

export function stepSociety(pop, dt, predGridQuery) {
  const grid = buildHumanGrid(pop.npcs, P.raggioSociale);
  pop._turnoSoc = ((pop._turnoSoc || 0) + 1) % TURNI;
  const turno = pop._turnoSoc;
  dt *= TURNI;                                   // chi tocca il turno riceve il tempo di tutti
  // I conteggi globali si accumulano lungo i tre turni e si pubblicano a giro chiuso, altrimenti
  // direbbero che i ribelli sono un terzo di quelli che sono.
  if (!pop._accSoc) pop._accSoc = { rib: 0, mal: 0, vivi: 0 };
  const accS = pop._accSoc;
  pop.ribelli = pop._ribelliTot || 0;
  let malSum = 0, vivi = 0;

  for (let k = turno; k < pop.npcs.length; k += TURNI) {
    const npc = pop.npcs[k];
    if (!npc || !npc.vivo) continue;
    const vicini = cellNeighbors(grid, npc.x, npc.y, P.raggioSociale);
    const crowd = vicini.length - 1;
    npc._vicini = crowd;   // quanti altri sente intorno a sé: serve anche all'esperienza
    guardaGliAltri(pop, npc, vicini, dt);
    const threat = predGridQuery ? predGridQuery(npc.x, npc.y) : false;
    updateEmotions(npc, dt, crowd, threat);
    vivi++; malSum += npc.malcontento;
    if (npc.ribelle) accS.rib++;

    // PRESSIONE DA SPAZIO/RISORSE -> COLONIZZAZIONE. Affollamento + fame locale (la terra intorno
    // non basta più per tutti) accumulano la voglia di emigrare. Quando esplode, l'NPC parte a
    // fondare un nuovo insediamento lontano. Nessun ordine "espanditi": emerge dalla scarsità.
    const stretti = crowd > 6 && npc.fame > 0.45;
    // E non è solo il bisogno a spingere via: anche il DESIDERIO che qui non si può soddisfare.
    // Chi vuole ciò che luccica e vive in una terra spoglia, prima o poi guarda l'orizzonte — e
    // siccome il cibo sta nelle valli e i metalli nelle montagne, quelle due voglie tirano in
    // direzioni opposte. È la stessa spinta della fame con un'altra origine, ed è il motivo per
    // cui si sono attraversati deserti per delle miniere.
    const qui = pop.tileIdx(npc.x, npc.y);
    const spoglia = qui >= 0 && pop.ricchezza ? clamp01(0.45 - pop.ricchezza[qui]) : 0;
    const bramaVana = (npc.superbia * 0.5 + npc.avidita * 0.4 + npc.emo.invidia * 0.6) * spoglia;
    const spinta = (stretti ? P.pressioneSpazio : 0) + bramaVana * P.pressioneSpazio * 0.55;
    npc._pressioneSpazio = clamp01((npc._pressioneSpazio || 0) + (spinta > 0 ? spinta * dt : -0.05 * dt));
    // BIAS: chi ha SUNK-COST (attaccamento a ciò in cui ha investito: casa) e paura del CAMBIAMENTO
    // resta anche quando converrebbe partire. Chi ha una casa grande parte ancora più di rado.
    const b = npc.bias || {};
    const inerzia = 1 - Math.min(0.8, (b.sunkcost || 0) * 0.4 + (b.cambiamento || 0) * 0.4 + npc.casaLivello * 0.06);
    if (!npc.migrante && npc._pressioneSpazio > P.sogliaMigrazione && npc.salute > 0.5 && npc.eta > 14 && !npc._isLeader && pop.rng() < 0.02 * inerzia) {
      // VIAGGIO PIANIFICATO (B.7): prima di partire si valutano le PROVVISTE (cibo nell'inventario).
      // Chi non ne ha non parte — a meno che la disperazione non lo spinga comunque (e rischi la vita).
      let provviste = 0;
      for (const [id, q] of npc.inventory) {
        if (q <= 0) continue;
        const m = pop.registry.mat(id);
        if (m && (m.props.nutriente || 0) > 0.3) provviste += q;
      }
      const disperato = npc.malcontento > 0.65;
      if (provviste >= 2 || disperato) {
        // Non più una direzione a caso: si va dove si crede che si stia meglio.
        const meta = pop.scegliMeta(npc, 45 + pop.rng() * 70);
        if (meta) {
          npc.migMeta = meta;
          npc.migrante = true;
        }
        if (npc.migrante) {
          pop.emigrazioni = (pop.emigrazioni || 0) + 1;
          if ((pop.emigrazioni % 25) === 0 && pop.chronicle) pop.chronicle("Ondata di coloni parte in cerca di terre nuove", 6);
        }
      }
    }

    // --- Interazioni sociali (rare, per prestazioni) ---
    if (pop.rng() < P.probAiuto && vicini.length > 1) {
      const altro = vicini[(pop.rng() * vicini.length) | 0];
      if (altro !== npc && altro.vivo) {
        // Chi sta bene ed è empatico AIUTA un affamato -> gratitudine (la "virtù").
        if (npc.fame < 0.35 && altro.fame > 0.75 && npc.emo.gioia > 0.35 && pop.rng() < 0.4 + npc.empatia * 0.5) {
          altro.fame = Math.max(0, altro.fame - 0.4);
          altro.emo.gratitudine = clamp01(altro.emo.gratitudine + 0.35);
          altro.emo.fiducia = clamp01(altro.emo.fiducia + 0.15);
          ricorda(altro, npc.id, +0.4); rep(npc, "generoso");
          pop.aiuti = (pop.aiuti || 0) + 1;
        } else {
          motoreInvidia(pop, npc, altro); // il vizio come motore di storia
        }
      }
    }

    // ESPLORAZIONE (9.10): la CURIOSITÀ GEOGRAFICA spinge alcuni a partire per vedere cosa c'è
    // oltre. Non è migrazione (non cercano casa): vanno, scoprono la mappa e tornano a raccontare.
    // Chi torna porta CONOSCENZA del territorio (fog of war) e prestigio: nasce l'esploratore.
    if (!npc.migrante && !npc._esplora && npc.curiosita > 0.65 && npc.coraggio > 0.5 && npc.fame < 0.5
        && npc.eta > 14 && npc.salute > 0.6 && pop.rng() < 0.004) {
      const ang = pop.rng() * Math.PI * 2, r = 60 + pop.rng() * 90;
      npc._esplora = [npc.x + Math.cos(ang) * r, npc.y + Math.sin(ang) * r];
      npc._casaBase = [npc.x, npc.y];
      pop.spedizioni = (pop.spedizioni || 0) + 1;
    }
    if (npc._esplora) {
      // fallisce se sta troppo male: l'esplorazione è rischiosa
      if (npc.salute < 0.3 || npc.fame > 1.0) { npc._esplora = null; npc._casaBase = null; }
      else if ((npc.x - npc._esplora[0]) ** 2 + (npc.y - npc._esplora[1]) ** 2 < 25) {
        npc._esplora = npc._casaBase; npc._casaBase = null; npc.azioni.esplorazione++;   // meta raggiunta: si torna
        if (!npc._casaBase) { npc.reputazione.esploratore = (npc.reputazione.esploratore || 0) + 1; pop.esplorazioni = (pop.esplorazioni || 0) + 1; }
      }
    }

    // PROPRIETÀ PRIVATA EMERGENTE (B.6): nessuna regola "la casa è privata". Un esposto prova a
    // ripararsi nella casa di un vicino; il proprietario reagisce secondo la SUA personalità
    // (empatia→ospita, avidità/superbia→scaccia). Le reazioni accumulano la NORMA della fazione
    // (ospitalità 0..1) che i conformisti seguono → culture "tutto condiviso" o "casa privata".
    if (npc.riparo > 0.55 && npc.casaLivello === 0 && vicini.length > 1 && pop.rng() < P.probOspitalita) {
      const prop = vicini[(pop.rng() * vicini.length) | 0];
      if (prop !== npc && prop.vivo && prop.casa && ((prop.casa[0] - npc.x) ** 2 + (prop.casa[1] - npc.y) ** 2) < 64) {
        const chiave = prop.fazione != null ? "f" + prop.fazione : "z";
        let norma = pop._norme.get(chiave); if (!norma) { norma = { osp: 1, sca: 1 }; pop._norme.set(chiave, norma); }
        const normaV = norma.osp / (norma.osp + norma.sca);
        const accoglie = prop.empatia * 0.8 + normaV * prop.conformismo * 0.6
                       - prop.avidita * 0.5 - prop.superbia * 0.3;
        if (accoglie > 0.25 || pop.rng() < 0.1) {
          npc.riparo = Math.max(0, npc.riparo - 0.4);         // ospitato
          npc.emo.gratitudine = clamp01(npc.emo.gratitudine + 0.3);
          ricorda(npc, prop.id, +0.3); norma.osp++; pop.ospitati = (pop.ospitati || 0) + 1;
        } else {
          // scacciato: litigio → rancore; la norma scivola verso la proprietà privata
          npc.emo.rabbia = clamp01(npc.emo.rabbia + 0.3);
          ricorda(npc, prop.id, -0.4); ricorda(prop, npc.id, -0.2);
          norma.sca++; pop.scacciati = (pop.scacciati || 0) + 1;
          if (pop.rng() < 0.15 * prop.aggressivita) { npc.salute -= 0.15; pop.aggressioni = (pop.aggressioni || 0) + 1; }
        }
      }
    }

    // BARATTO: due vicini con inventari diversi scambiano se ENTRAMBI ci guadagnano.
    // Il valore è soggettivo -> nel deserto il legno vale, nella foresta no: nasce il commercio.
    if (vicini.length > 1 && npc.inventory.size && pop.rng() < P.probBaratto) {
      const altro = vicini[(pop.rng() * vicini.length) | 0];
      if (altro !== npc && altro.vivo && altro.inventory.size && tentaBaratto(pop, npc, altro)) { npc.azioni.commercio++; altro.azioni.commercio++; npc._att = "commerciare"; }
    }

    // TRASMISSIONE DELLA CONOSCENZA per contatto (anti-hivemind): chi sa qualcosa la
    // insegna a un vicino di cui si fida. Le tecnologie viaggiano nello spazio -> nascono
    // tribù tecnologiche e primitive. (Roll indipendente, non legato agli altri eventi.)
    if (npc.sapere.size && vicini.length > 1 && npc.emo.fiducia > 0.3 && pop.rng() < P.probInsegnamento) {
      const altro = vicini[(pop.rng() * vicini.length) | 0];
      if (altro !== npc && altro.vivo) {
        // BARRIERA LINGUISTICA (4.6): parlarsi AVVICINA le lingue; ma se sono già troppo lontane
        // non ci si capisce — l'insegnamento fallisce. Popoli isolati a lungo non comunicano più.
        const distL = Math.abs(npc.lingua - altro.lingua);
        npc.lingua += (altro.lingua - npc.lingua) * 0.03;
        altro.lingua += (npc.lingua - altro.lingua) * 0.03;
        if (distL > P.sogliaIncomprensione) {
          pop.incomprensioni = (pop.incomprensioni || 0) + 1; // «non si capiscono»
        } else {
          // CONOSCENZA PARZIALE (4.2): si tramanda ciò di cui si è SICURI. Una "teoria" (molte
          // prove) passa facile; una "ipotesi" incerta raramente → il sapere consolidato si
          // diffonde, quello acerbo resta locale e può perdersi.
          const nuove = [...npc.sapere].filter((s) => !altro.sapere.has(s));
          if (nuove.length) {
            const sig = nuove[(pop.rng() * nuove.length) | 0];
            const b = pop.knowledge.beliefs.get(sig);
            const soglia = !b || b.livello === "teoria" ? 1 : b.livello === "esperimento" ? 0.6 : 0.2;
            if (pop.rng() < soglia) { altro.sapere.add(sig); pop.insegnamenti = (pop.insegnamenti || 0) + 1; npc.azioni.insegnamento++; npc._att = "insegnare"; }
          }
        }
      }
    }

    // SPECIALIZZAZIONE RICHIESTA (5.4): il malato CERCA il guaritore. Se un vicino di mestiere
    // guaritore conosce una medicina fidata, presta la cura → gratitudine e legame sociale.
    if (npc.salute < 0.55 && vicini.length > 1 && pop.rng() < P.probOspitalita) {
      for (const g of vicini) {
        if (g === npc || !g.vivo || g.mestiere !== "guaritore") continue;
        let sa = false;
        for (const sig of g.sapere) {
          const b = pop.knowledge.beliefs.get(sig);
          if (b && !b.edificio && AFF.cura(b) && b.verdetto === "utile") { sa = true; break; }
        }
        if (!sa) break;
        npc.salute = Math.min(1, npc.salute + 0.2);
        npc.emo.gratitudine = clamp01(npc.emo.gratitudine + 0.3);
        ricorda(npc, g.id, +0.3); g.azioni.cura++;
        pop.curePrestate = (pop.curePrestate || 0) + 1;
        break;
      }
    }
  }
  accS.mal += malSum; accS.vivi += vivi;
  if (turno === TURNI - 1) {                    // giro chiuso: i conti valgono per tutti
    pop.malcontentoMedio = accS.vivi ? accS.mal / accS.vivi : 0;
    pop._ribelliTot = accS.rib;
    pop.ribelli = accS.rib;
    accS.rib = 0; accS.mal = 0; accS.vivi = 0;
  }
}

// Memoria delle relazioni: chi mi ha aiutato/danneggiato (usata per vendette/alleanze).
function ricorda(npc, altroId, delta) {
  if (!npc.memoria) npc.memoria = new Map();
  npc.memoria.set(altroId, Math.max(-1, Math.min(1, (npc.memoria.get(altroId) || 0) + delta)));
}
function rep(npc, tag) { npc.reputazione[tag] = (npc.reputazione[tag] || 0) + 1; }
function ruba(ladro, vittima, n) {
  let preso = 0;
  for (const [id, q] of vittima.inventory) {
    if (q > 0) { vittima.inventory.set(id, q - 1); ladro.addMat(id, 1); if (++preso >= n) break; }
  }
  return preso;
}

// MOTORE DELL'INVIDIA — nessuna regola «se invidioso allora ruba». L'invidia crea il
// DESIDERIO di ciò che l'altro ha; poi è la PERSONALITÀ a scegliere l'azione: copiare,
// rubare di nascosto, aggredire, chiedere/collaborare, o rinunciare rodendosi dentro.
function motoreInvidia(pop, npc, altro) {
  // Quanto l'altro sta «meglio»? L'invidia è GENERALIZZATA: non solo strumenti/ricchezza, ma
  // anche CASA più grande, più PROLE, e soprattutto lo STATUS (essere il capo). È uno dei motori
  // principali della storia: "hai una casa migliore → la voglio", "sei il capo → voglio esserlo io".
  const vantaggio = clamp01(
    0.32 * Math.max(0, altro.strumento - npc.strumento) +
    0.18 * Math.max(0, (altro.inventory.size - npc.inventory.size) / 8) +
    0.12 * Math.max(0, altro.salute - npc.salute) +
    0.20 * Math.max(0, (altro.casaLivello - npc.casaLivello) / 4) +
    0.10 * Math.max(0, (altro.figli - npc.figli) / 5) +
    0.25 * ((altro._isLeader && !npc._isLeader) ? 1 : 0)
  );
  if (vantaggio < 0.08) return;
  npc.emo.invidia = clamp01(npc.emo.invidia + vantaggio * (0.5 + npc.invidiaT) * 1.1);
  const desiderio = npc.emo.invidia;
  if (desiderio < 0.3 || pop.rng() > desiderio) return; // il desiderio non sempre diventa azione

  // Punteggi delle possibili azioni: emergono dai tratti (non sono soglie fisse). Un po' di
  // rumore perché la stessa personalità non agisca sempre in modo identico.
  const noise = () => pop.rng() * 0.25;
  // VENDETTA (C.6): un torto ricordato spinge all'aggressione anche quando non conviene.
  // POTERE: contro un capo, chi brama il potere sceglie lo scontro (il colpo di stato).
  const rancore = npc.memoria.get(altro.id) || 0;
  const m = npc.motiv || {};
  const s = {
    copia: npc.intelligenza * (0.5 + npc.curiosita) * 1.6 + noise(),
    furto: (1 - npc.onesta) * (0.5 + npc.avidita) * (1 - npc.coraggio * 0.4) * 1.8 + noise(),
    aggredisci: npc.aggressivita * npc.coraggio * (0.5 + npc.iraT) * 1.9
      + (rancore < -0.4 ? (m.vendetta || 0) * 1.2 : 0)
      + (altro._isLeader ? (m.potere || 0) * 0.6 : 0) + noise(),
    collabora: (npc.onesta * 0.6 + npc.empatia * 0.6) + noise(),
    rinuncia: npc.pigrizia * 0.8 + npc.emo.paura * 0.4 + noise(),
  };
  let scelta = "rinuncia", bv = -1;
  for (const k in s) if (s[k] > bv) { bv = s[k]; scelta = k; }

  if (scelta === "copia") {
    const nuove = altro.sapere ? [...altro.sapere].filter((x) => !npc.sapere.has(x)) : [];
    if (nuove.length) { npc.sapere.add(nuove[(pop.rng() * nuove.length) | 0]); rep(npc, "imitatore"); pop.copiature = (pop.copiature || 0) + 1; }
    npc.emo.invidia *= 0.5;
  } else if (scelta === "furto") {
    if (ruba(npc, altro, 2)) { rep(npc, "ladro"); pop.furti = (pop.furti || 0) + 1; }
    if (pop.rng() < 0.3) { altro.emo.rabbia = clamp01(altro.emo.rabbia + 0.4); ricorda(altro, npc.id, -0.5); } // scoperto!
    npc.emo.invidia *= 0.4;
  } else if (scelta === "aggredisci") {
    altro.salute -= 0.3 + npc.forza * 0.3;
    npc.azioni.combattimento++; npc._att = "aggredire";
    altro.emo.paura = clamp01(altro.emo.paura + 0.5); altro.emo.rabbia = clamp01(altro.emo.rabbia + 0.4);
    ricorda(altro, npc.id, -0.7); rep(npc, "violento");
    ruba(npc, altro, 3);
    pop.aggressioni = (pop.aggressioni || 0) + 1;
    if (altro.salute <= 0) { altro.vivo = false; pop.morti++; pop.omicidi = (pop.omicidi || 0) + 1; rep(npc, "assassino"); }
    npc.emo.invidia *= 0.3;
  } else if (scelta === "collabora") {
    altro.emo.fiducia = clamp01(altro.emo.fiducia + 0.1); ricorda(npc, altro.id, +0.2);
    npc.emo.invidia *= 0.6;
  }
  // rinuncia: non fa nulla; l'invidia resta e lo logora (alimenta il malcontento).
}
