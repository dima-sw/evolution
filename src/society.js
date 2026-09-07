import { P } from "./params.js";
import { bonus, perizia } from "./skill.js";
import { piega } from "./tempra.js";
import { qualitaCasa, brama, raro, splendoreDi, splendore } from "./desire.js";
// SOCIETÀ EMERGENTE — qui NON esistono "tasse", "leggi", "scuole", "banche", "classi": il motore
// conosce solo PRIMITIVI (capacità elementari). Le istituzioni sono ciò che gli osservatori
// riconoscono in pattern ripetuti di quei primitivi. Regola d'oro del progetto:
//   • non "esiste la tassa" ma «si possono TRASFERIRE risorse» → tributo/dono/pizzo/elemosina
//   • non "esiste la legge" ma «le azioni hanno CONSEGUENZE osservate» → norme
//   • non "esiste la scuola" ma «si può INSEGNARE ciò che si sa» → maestri e apprendisti
//   • non "esistono le classi" ma «la ricchezza e il prestigio si distribuiscono male» → ceti
//   • non "esiste la schiavitù" ma «si può COSTRINGERE chi non può rifiutare» → lavoro forzato
//   • non "esiste la storia" ma «i vivi RICORDANO i morti notevoli» → miti ed eroi

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function initSociety(pop) {
  pop.norme = { furto: 0.2, violenza: 0.2, ospitalita: 0.5 }; // "se faccio X, mi puniscono?" (0..1)
  pop.tributi = 0; pop.doni = 0; pop.estorsioni = 0;          // trasferimenti classificati a posteriori
  pop.punizioni = 0; pop.processi = 0;
  pop.costretti = 0;                                          // sottomessi al lavoro forzato
  pop.insegnamentiMaestro = 0;
  pop.miti = [];                                              // memoria collettiva: eroi e tiranni
  pop.voci = [];                                              // informazioni in circolo (anche false)
  pop.artefatti = [];                                         // oggetti unici con una storia
  pop.magazzini = [];                                         // scorte comuni (logistica)
  pop.classi = { nobili: 0, agiati: 0, poveri: 0, servi: 0 };
}

// ---------------------------------------------------------------------------------------------
// PRIMITIVO 1 — TRASFERIRE RISORSE. Nessuna "tassa" scritta: qualcuno dà (o cede) qualcosa a un
// altro. Poi CLASSIFICHIAMO SOLO PER STATISTICA ciò che è successo: se chi riceve è il leader ed è
// stato preteso → "tributo"; se è stato preteso con la minaccia → "estorsione"; se dato spontaneo
// per empatia → "dono". Il motore non sa cosa siano: conta solo chi-dà-cosa-a-chi e perché.
function trasferimenti(pop, dt, vicini, zona) {
  const cro = pop._cronoSoc, L = cro && cro.lav;
  if (cro) cro.ms["trasf·tributi"] = (cro.ms["trasf·tributi"] || 0) - performance.now();
  for (const f of pop.factions) {
    if (!f._membri || f._membri.length < 8) continue;
    const L = f._leader;
    // Un capo AMBIZIOSO/AVIDO PRETENDE risorse dai suoi (più o meno legittimamente).
    if (L && pop.rng() < dt * P.probTributo * (L.avidita * 0.6 + L.motiv.potere * 0.4)) {
      const suddito = f._membri[(pop.rng() * f._membri.length) | 0];
      if (suddito !== L && suddito.vivo && suddito.inventory.size) {
        // Il suddito cede se è leale/timoroso o se il capo è forte; altrimenti si ribella un po'.
        const cede = suddito.emo.lealta * 0.5 + suddito.emo.paura * 0.4 + (suddito.bias?.autorita || 0.4) * 0.3;
        for (const [id, q] of suddito.inventory) {
          if (q <= 0) continue;
          if (cede > 0.45) {
            suddito.inventory.set(id, q - 1); L.addMat(id, 1);
            if (L.empatia < 0.3 && suddito.emo.paura > 0.4) { pop.estorsioni++; suddito.emo.rabbia = clamp01(suddito.emo.rabbia + 0.15); }
            else pop.tributi++;
          } else { // rifiuto: il rapporto si incrina
            suddito.memoria.set(L.id, Math.max(-1, (suddito.memoria.get(L.id) || 0) - 0.25));
            suddito.emo.rabbia = clamp01(suddito.emo.rabbia + 0.2);
          }
          break;
        }
      }
    }
  }
  if (cro) {
    cro.ms["trasf·tributi"] += performance.now();
    cro.ms["trasf·doni"] = (cro.ms["trasf·doni"] || 0) - performance.now();
  }
  // DONO spontaneo: chi ha molto ed è empatico dà a chi non ha nulla (elemosina/carità emergente).
  // Il censimento si fa QUI e non prima: i tributi appena riscossi possono aver lasciato qualcuno
  // a mani vuote, e chi è appena diventato indigente deve poter ricevere.
  zona.censimento();
  for (const npc of pop.npcs) {
    if (L) L.donoGiri++;
    if (!npc.vivo || npc.inventory.size < 3 || npc.empatia < 0.55) continue;
    if (L) L.donoEmpatici++;
    if (pop.rng() > dt * P.probDono) continue;
    if (L) L.donoTentano++;
    // NON C'È NESSUNO DA AIUTARE: non si guarda in faccia nessuno.
    // Chi vuol donare cerca un indigente — chi non ha nulla e ha fame — e in un mondo che funziona
    // è raro. Prima li esaminava tutti, uno per uno, per scoprirlo: duecentocinquanta persone a
    // testa, e quasi sempre per niente. Ora si sa in anticipo quanti indigenti ci sono in ogni
    // cella, e se le nove attorno ne hanno zero non c'è niente da cercare.
    // È esatta: questo ciclo ha effetto SOLO su chi soddisfa quella condizione, quindi zero
    // indigenti intorno significa nessun effetto, comunque lo si scopra. E non tocca i dadi —
    // l'estrazione è già avvenuta, due righe sopra.
    if (zona.nessuno(zona.indigenti, npc)) continue;
    const vic = vicini(npc);
    for (const altro of vic) {
      if (L) L.donoCandidati++;
      if (altro === npc || !altro.vivo || altro.inventory.size > 0 || altro.fame < 0.6) continue;
      for (const [id, q] of npc.inventory) {
        if (q > 0) { npc.inventory.set(id, q - 1); altro.addMat(id, 1); pop.doni++; altro.emo.gratitudine = clamp01(altro.emo.gratitudine + 0.3); altro.memoria.set(npc.id, clamp01((altro.memoria.get(npc.id) || 0) + 0.3)); break; }
      }
      break;
    }
  }
  if (cro) cro.ms["trasf·doni"] += performance.now();
}

// ---------------------------------------------------------------------------------------------
// PRIMITIVO 2 — LE AZIONI HANNO CONSEGUENZE OSSERVATE → NORME (poi "leggi"). Chi vede un torto e
// ha onestà/ira può PUNIRE il colpevole. Ogni punizione (o impunità) aggiorna la norma condivisa:
// «rubare porta guai?». Se nessuno punisce, la norma non nasce e il furto diventa normale.
function norme(pop, dt, vicini) {
  const L = pop._cronoSoc && pop._cronoSoc.lav;
  for (const npc of pop.npcs) {
    if (L) L.normeGiri++;
    if (!npc.vivo) continue;
    if (L) L.normeVivi++;
    const colpe = npc.reputazione || {};
    const grave = (colpe.assassino || 0) * 2 + (colpe.violento || 0) + (colpe.ladro || 0) * 0.6;
    if (grave < 1) continue;
    if (L) L.normeColpevoli++;
    if (pop.rng() > dt * P.probNorma) continue;
    if (L) L.normeProcessi++;
    // i testimoni vicini decidono se punire: onestà + ira + quanto la norma è già sentita
    const vic = vicini(npc);
    let giudici = 0, favorevoli = 0;
    for (const t of vic) {
      if (t === npc || !t.vivo) continue;
      giudici++;
      // Il testimone vuole punire se è onesto/irascibile, se la norma è già sentita e se ha
      // rancore personale verso il colpevole. L'empatia trattiene. Niente soglia scritta: confronto.
      const rancore = Math.max(0, -(t.memoria.get(npc.id) || 0));
      const vuolePunire = t.onesta * 0.4 + t.iraT * 0.3 + pop.norme.furto * 0.4 + rancore * 0.4 - t.empatia * 0.4;
      if (vuolePunire > P.sogliaPunizione) favorevoli++;
    }
    if (giudici < 2) continue;
    pop.processi++;
    if (favorevoli > giudici / 2) {
      // PENA: proporzionale alla gravità e alla durezza (aggressività) dei giudici.
      npc.salute -= 0.15 + grave * 0.05;
      npc.emo.paura = clamp01(npc.emo.paura + 0.4);
      npc.reputazione.punito = (npc.reputazione.punito || 0) + 1;
      if (npc.salute <= 0) { npc.vivo = false; pop.morti++; }
      pop.punizioni++;
      pop.norme.furto = Math.min(0.9, pop.norme.furto + 0.008);   // la norma si rafforza (mai assoluta)
      pop.norme.violenza = Math.min(0.9, pop.norme.violenza + 0.008);
      // deterrenza: chi ha visto la pena ci pensa due volte
      for (const t of vic) if (t.vivo) t._deterrenza = clamp01((t._deterrenza || 0) + 0.2);
    } else {
      pop.norme.furto = Math.max(0.05, pop.norme.furto - 0.006); // impunità: la norma si sfalda
    }
  }
}

// ---------------------------------------------------------------------------------------------
// PRIMITIVO 3 — COSTRINGERE chi non può rifiutare. Da qui può emergere il lavoro forzato: un forte
// (o un ricco) sottomette un debole affamato e senza nulla, che lavora per lui in cambio di cibo.
// Nessuna "schiavitù" nel motore: solo una relazione di dipendenza che si mantiene finché conviene
// al forte e il debole non può liberarsi.
function coercizione(pop, dt, vicini, zona) {
  const cro = pop._cronoSoc, L = cro && cro.lav;
  if (cro) cro.ms["coerc·prendere"] = (cro.ms["coerc·prendere"] || 0) - performance.now();
  // Di nuovo il censimento, e di nuovo adesso: fra i doni e qui c'è passata la giustizia, che
  // qualcuno lo uccide. Un conto TROPPO ALTO non fa danno — si guarda e non si trova, come prima;
  // un conto troppo basso sì, perché farebbe saltare una ricerca che avrebbe trovato qualcuno.
  // Per questo il censimento non si aggiorna mai al ribasso durante il giro: resta un limite
  // SUPERIORE, ed è l'unico verso in cui l'errore è innocuo.
  zona.censimento();
  for (const npc of pop.npcs) {
    if (L) L.coercGiri++;
    if (!npc.vivo || npc.inventory.size < 4) continue;
    if (L) L.coercRicchi++;
    const dominatore = npc.aggressivita * 0.4 + npc.avidita * 0.4 + (npc.crudelta || 0.3) * 0.4 - npc.empatia * 0.5;
    if (dominatore < 0.4 || pop.rng() > dt * P.probCoercizione) continue;
    if (L) L.coercTentano++;
    // Chi vuole sottomettere cerca un disperato senza padrone: nulla in mano, molta fame, poco
    // coraggio. Se in giro non ce n'è, non c'è nessuno da guardare in faccia.
    if (zona.nessuno(zona.disperati, npc)) continue;
    for (const altro of vicini(npc)) {
      if (L) L.coercCandidati++;
      if (altro === npc || !altro.vivo || altro._padrone) continue;
      const debole = altro.fame > 0.7 && altro.inventory.size === 0 && altro.forza < npc.forza && altro.coraggio < 0.5;
      if (!debole) continue;
      altro._padrone = npc.id;                       // relazione di dipendenza
      altro.emo.lealta = clamp01(altro.emo.lealta - 0.2);
      pop.costretti++;
      break;
    }
  }
  if (cro) {
    cro.ms["coerc·prendere"] += performance.now();
    cro.ms["coerc·servi"] = (cro.ms["coerc·servi"] || 0) - performance.now();
  }
  // Il sottomesso lavora per il padrone (gli passa ciò che raccoglie) e riceve di che sopravvivere.
  for (const npc of pop.npcs) {
    if (!npc.vivo || !npc._padrone) continue;
    if (L) L.servi++;
    npc.malcontento = clamp01(npc.malcontento + dt * 0.1);
    // si libera se il padrone muore, se trova coraggio, o se il malcontento esplode
    if (npc.malcontento > 0.8 && npc.coraggio > 0.5 && pop.rng() < dt * 0.5) { npc._padrone = null; npc.ribelle = true; }
    else if (pop.rng() < dt * 0.3) {
      for (const [id, q] of npc.inventory) { if (q > 0) { npc.inventory.set(id, q - 1); npc.fame = Math.max(0, npc.fame - 0.2); break; } }
    }
  }
  if (cro) cro.ms["coerc·servi"] += performance.now();
}

// ---------------------------------------------------------------------------------------------
// CLASSI SOCIALI (9.4) — non sono definite: sono la FOTOGRAFIA della disuguaglianza. Ricchezza
// (inventario+casa) e prestigio (leadership, reputazione) distribuiscono la gente in ceti.
function classi(pop) {
  const vivi = pop.npcs.filter((n) => n.vivo);
  if (!vivi.length) return;
  const val = (id) => {
    const m = pop.registry.mat(id);
    if (!m) return 0.2;
    return 0.15 + splendoreDi(m) * 1.6 + raro(pop, id) * 1.1 + brama(pop, id) * 0.9;
  };
  const ric = vivi.map((n) => {
    let r = 0;
    // Tetto secco a dodici per tipo: provato a sostituirlo con una saturazione dolce (radice), e
    // il mondo è peggiorato — disuguaglianza a 0,95 e il legame fra ceto e pregio della casa sceso
    // da 0,27 a 0,17. Chi accumula quantità enormi di roba da poco non deve poter comprare un ceto.
    for (const [id, q] of n.inventory) if (q > 0) r += Math.min(q, 12) * val(id);
    // La casa conta per quanto è grande E per di che cosa è fatta: una dimora di marmo è ricchezza
    // che si vede da lontano, ed è il modo più antico di dire agli altri chi sei.
    if (n.casaLivello) {
      const qc = qualitaCasa(pop, n);
      r += n.casaLivello * (1.1 + qc.pregio * 2.4);
    }
    // COMANDARE È UNA FORMA DI RICCHEZZA, e vale quanta gente ti obbedisce. Qui c'era un +6 secco:
    // un capo di dieci persone contava esattamente quanto un capo di duecento, il che non è vero in
    // nessun mondo. E aveva una conseguenza misurabile: nei popoli piccoli quel bonus spostava la
    // media di ricchezza molto più che nei grandi, e li faceva sembrare ricchi.
    // (Misurato: lo scarto fra media con e senza capo è ~0,05 — piccolo, ma è un numero magico in
    //  meno e una cosa vera in più: chi comanda molti dispone di molto.)
    if (n._isLeader) {
      const suoi = (pop.factions || []).find((f) => f.id === n.fazione);
      r += Math.min(14, 1.5 + (suoi ? suoi.membri : 8) * 0.06);
    }
    return r;
  });
  const media = ric.reduce((a, b) => a + b, 0) / ric.length;
  const c = { nobili: 0, agiati: 0, poveri: 0, servi: 0 };
  vivi.forEach((n, i) => {
    // QUANTO STAI SOPRA I TUOI. E' questo il numero vero; il ceto e' solo il nome che gli si da'
    // per poterne parlare. Chi guarda qualcuno non vede un'etichetta, vede uno che sta meglio o
    // peggio di lui — e a un filo sopra la soglia non corrisponde nessun salto nella realta'.
    n._agiatezza = ric[i] / Math.max(1e-4, media);
    n.classe = n._padrone ? "servo" : ric[i] > media * 2.2 ? "nobile" : ric[i] > media ? "agiato" : "povero";
    if (n.classe === "servo") c.servi++; else if (n.classe === "nobile") c.nobili++;
    else if (n.classe === "agiato") c.agiati++; else c.poveri++;
  });
  pop.classi = c;
  // Disuguaglianza (Gini semplificato): alimenta invidia e malcontento nei poveri.
  const max = Math.max(...ric) || 1;
  pop.disuguaglianza = clamp01(1 - media / max);
}

// ---------------------------------------------------------------------------------------------
// EDUCAZIONE (9.8) — la conoscenza non si teletrasporta: un ANZIANO esperto che sta vicino a un
// GIOVANE gli trasmette molto più in fretta ciò che sa (maestro→apprendista). Emerge il valore
// sociale dei vecchi: se muoiono prima di insegnare, il sapere si perde.
function educazione(pop, dt, vicini) {
  for (const m of pop.npcs) {
    if (!m.vivo || m.eta < 30 || m.sapere.size < 3) continue;
    if (pop.rng() > dt * P.probEducazione) continue;
    for (const g of vicini(m)) {
      if (g === m || !g.vivo || g.eta > 18 || g.eta < 4) continue;
      if (Math.abs(g.lingua - m.lingua) > 0.15) continue;         // devono capirsi
      const nuove = [...m.sapere].filter((s) => !g.sapere.has(s));
      if (!nuove.length) continue;
      // l'apprendista impara di più se è intelligente e il maestro è paziente
      const quante = 1 + ((m.pazienza + g.intelligenza) > 1.1 ? 1 : 0);
      for (let k = 0; k < quante && nuove.length; k++) g.sapere.add(nuove[(pop.rng() * nuove.length) | 0]);
      pop.insegnamentiMaestro++;
      g.memoria.set(m.id, clamp01((g.memoria.get(m.id) || 0) + 0.2));
      m.reputazione.maestro = (m.reputazione.maestro || 0) + 1;
      break;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// MEMORIA DELLA CIVILTÀ (9.9) — quando muore qualcuno di NOTEVOLE, i vivi lo ricordano. Non c'è
// una lista di eroi: il mito nasce dal confronto con la norma (chi ha fatto molto più degli altri).
function miti(pop, dt) {
  const L = pop._cronoSoc && pop._cronoSoc.lav;
  for (const n of pop.npcs) {
    if (L) L.mitiGiri++;
    if (n.vivo || n._commemorato) continue;
    if (L) L.mitiNuovi++;
    n._commemorato = true;
    const r = n.reputazione || {};
    const gesta = (r.generoso || 0) + (r.maestro || 0) + (n.oggettiCreati || 0) * 2 + (n._isLeader ? 4 : 0) + (n.figli || 0);
    const colpe = (r.assassino || 0) * 3 + (r.violento || 0) + (r.ladro || 0) * 0.5 + (r.guerriero || 0) * 0.5;
    if (gesta < 6 && colpe < 5) continue;                   // la maggior parte viene dimenticata
    const eroe = gesta >= colpe;
    const tipo = eroe
      ? (n.oggettiCreati > 3 ? "inventore leggendario" : r.maestro ? "maestro venerato" : "eroe")
      : (r.assassino ? "tiranno sanguinario" : "malfattore");
    pop.miti.push({ nome: "n" + n.id, tipo, eroe, anno: pop.anno | 0, gesta: gesta | 0, colpe: colpe | 0 });
    if (pop.miti.length > 40) pop.miti.shift();
    if (pop.chronicle) pop.chronicle(`Muore ${eroe ? "un" : "un"} ${tipo}; il popolo lo ricorderà`, 6);
    // I miti INFLUENZANO i vivi: un eroe ispira (gioia/speranza), un tiranno lascia paura.
    for (const o of pop.vicini(n.x, n.y, 30)) {
      if (eroe) {
        o.emo.speranza = clamp01(o.emo.speranza + 0.2);
        // Vedere qualcuno riuscire fa venir voglia di riuscire. Ma è una spinta, non un gradino:
        // ha un'ancora in ciò che sei nato, e se non vedi più nessuno riuscire ti riassorbe.
        piega(o, "ambizione", 0.7, 0.5, dt);
      }
      else o.emo.paura = clamp01(o.emo.paura + 0.2);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// INFORMAZIONE (9.13) — VOCI: le notizie viaggiano di bocca in bocca e si DEFORMANO. Una voce può
// essere falsa (mentire è un primitivo: chi ha poca onestà distorce ciò che riferisce) e viene
// creduta secondo i bias. Le voci alterano la reputazione e i sentimenti, non i fatti.
function voci(pop, dt, vicini) {
  // nascita di una voce: qualcuno osserva un fatto notevole e lo racconta (a modo suo)
  for (const npc of pop.npcs) {
    if (!npc.vivo || pop.rng() > dt * P.probVoce) continue;        // le notizie notevoli sono rare
    const vic = vicini(npc);
    if (vic.length < 2) continue;
    const oggetto = vic[(pop.rng() * vic.length) | 0];
    if (!oggetto || oggetto === npc) continue;
    const vera = (oggetto.reputazione?.ladro || 0) > 0 || (oggetto.reputazione?.violento || 0) > 0;
    const mente = pop.rng() > npc.onesta + 0.4;               // solo i più disonesti inventano
    if (!vera && !mente) continue;
    pop.voci.push({ su: oggetto.id, falsa: !vera && mente, anno: pop.anno | 0, forza: 0.5 });
    if (pop.voci.length > 25) pop.voci.shift();
  }
  // diffusione ed effetto: chi crede alla voce peggiora un po' l'opinione sul soggetto. L'effetto
  // è LIEVE per singolo ascoltatore, ma una voce persistente può rovinare una reputazione.
  for (const v of pop.voci) {
    v.forza -= dt * 0.2;                                      // le chiacchiere si spengono in fretta
    if (v.forza <= 0) continue;
    const t = pop.npcs[(pop.rng() * pop.npcs.length) | 0];
    if (!t || !t.vivo || t.id === v.su) continue;
    const credulita = (t.bias?.autorita || 0.4) * 0.4 + (t.bias?.imitazione || 0.4) * 0.3 + (1 - t.intelligenza) * 0.3;
    if (pop.rng() < credulita * v.forza * 0.5) {
      t.memoria.set(v.su, Math.max(-1, (t.memoria.get(v.su) || 0) - 0.05));
      if (v.falsa) pop.calunnie = (pop.calunnie || 0) + 1;
    }
  }
  pop.voci = pop.voci.filter((v) => v.forza > 0);
}

// ---------------------------------------------------------------------------------------------
// ARTEFATTI (9.16) — oggetti UNICI con una storia. Nascono quando un'invenzione eccezionale viene
// creata da qualcuno di eccezionale (o durante un evento memorabile): diventano reliquie che danno
// PRESTIGIO a chi le possiede e possono essere rubate, donate, tramandate.
export function forseArtefatto(pop, npc, belief) {
  if (!belief || !belief.attr) return;
  const eccellenza = splendore(belief.attr, belief.colore) + (belief.eff?.stabilita || 0) * 0.5 + (npc.oggettiCreati > 4 ? 0.4 : 0);
  if (eccellenza < 1.1 || pop.rng() > P.probArtefatto) return;
  const a = {
    nome: belief.nome + " di " + (npc.mestiere || "un ignoto"),
    creatore: npc.id, anno: pop.anno | 0, prestigio: 0.5 + eccellenza * 0.3, possessore: npc.id,
  };
  pop.artefatti.push(a);
  if (pop.artefatti.length > 25) pop.artefatti.shift();
  npc.reputazione.artefice = (npc.reputazione.artefice || 0) + 1;
  if (pop.chronicle) pop.chronicle(`Viene forgiato un oggetto memorabile: ${a.nome}`, 8);
}

// ---------------------------------------------------------------------------------------------
// MAGAZZINI / LOGISTICA (9.2) — le scorte comuni: un granaio (edificio con effetto "cibo") diventa
// il punto dove si accumulano le eccedenze. Chi ha troppo deposita, chi ha fame preleva: nasce la
// redistribuzione (e con essa la possibilità che qualcuno se ne impadronisca).
function magazzini(pop, dt) {
  const depositi = (pop.buildings || []).filter((b) => b.effetto === "cibo");
  if (!depositi.length) return;
  for (const b of depositi) {
    if (b.scorta == null) b.scorta = 0;
    for (const npc of pop.npcs) {
      if (!npc.vivo) continue;
      const d2 = (npc.x - b.x) ** 2 + (npc.y - b.y) ** 2;
      if (d2 > 400) continue;
      if (npc.fame < 0.3 && npc.inventory.size > 2 && pop.rng() < dt * 0.4) {
        for (const [id, q] of npc.inventory) { if (q > 0) { npc.inventory.set(id, q - 1); b.scorta++; break; } }
      } else if (npc.fame > 0.75 && b.scorta > 0 && pop.rng() < dt * 0.6) {
        b.scorta--; npc.fame = Math.max(0, npc.fame - 0.35);
        npc.dieta.carb = Math.min(1, npc.dieta.carb + 0.3);
        pop.prelievi = (pop.prelievi || 0) + 1;
      }
    }
  }
  pop.scorteTot = depositi.reduce((s, b) => s + (b.scorta || 0), 0);
}

// ---------------------------------------------------------------------------------------------
const CELL = 10;
export function stepSocietyAdvanced(pop, dt) {
  if (!pop.norme) initSociety(pop);
  // GRIGLIA PIATTA, E IL VICINATO SI COSTRUISCE UNA VOLTA PER CELLA.
  //
  // Due sprechi, tutt'e due invisibili leggendo il codice riga per riga.
  //
  // Il primo: la chiave era una stringa (`"12,7"`), quindi ogni accesso costruiva una stringa,
  // la sminuzzava per l'hash e lasciava spazzatura. Con una mappa 320×320 il numero della cella
  // basta e avanza, e l'indice si calcola con una moltiplicazione.
  //
  // Il secondo, più grosso: `vicini(n)` restituisce il blocco 3×3 attorno alla CELLA di n —
  // quindi tutti quelli che stanno nella stessa cella ricevono la lista IDENTICA, e la si
  // ricostruiva da capo per ognuno, sei volte (una per sottosistema). In una cella affollata
  // sono centinaia di elementi copiati per niente. Adesso si costruisce una volta e si presta.
  //
  // Nessuno la modifica — verificato: tutti i chiamanti la leggono soltanto — quindi prestarla è
  // esattamente equivalente. E l'ordine di visita resta identico: prima le righe, poi le colonne,
  // e dentro la cella l'ordine in cui la gente è entrata. Serve che sia identico, altrimenti
  // cambia chi incontra chi, e cambia il mondo.
  // Il MARGINE non è un dettaglio: la mappa a stringhe non aveva confini, e una persona che
  // finisse esattamente sul bordo aveva comunque la sua cella. Con una griglia piatta senza
  // margine quella persona verrebbe scartata o accorpata alla cella accanto — e sarebbe un
  // cambiamento del mondo travestito da ottimizzazione. Due celle di margine per lato bastano.
  const tGriglia = performance.now();
  const MARG = 2;
  const COLONNE = Math.ceil(pop.world.width / CELL) + MARG * 2;
  const RIGHE = Math.ceil(pop.world.height / CELL) + MARG * 2;
  const idCella = (c, r) => (r + MARG) * COLONNE + (c + MARG);
  const dentro = (c, r) => c + MARG >= 0 && r + MARG >= 0 && c + MARG < COLONNE && r + MARG < RIGHE;
  const grid = new Array(COLONNE * RIGHE).fill(null);
  for (const n of pop.npcs) {
    if (!n.vivo) continue;
    const c = (n.x / CELL) | 0, r = (n.y / CELL) | 0;
    if (!dentro(c, r)) continue;
    const i = idCella(c, r);
    (grid[i] || (grid[i] = [])).push(n);
  }
  // NIENTE CACHE PER CELLA, e vale la pena dire perché — sembrava l'ottimizzazione ovvia.
  // Tutti quelli che stanno nella stessa cella riceverebbero la lista identica, quindi costruirla
  // una volta e prestarla pare gratis. Misurato: **non rende, rende semmai un po' peggio**.
  // Il motivo sta in un numero solo: con 5 595 persone `vicini()` viene chiamata **650 volte per
  // passo** su circa mille celle, cioè meno di una volta per cella — i chiamanti stanno tutti
  // dietro dadi a bassa probabilità. Due chiamate non cadono quasi mai nella stessa cella, e una
  // cache che non colpisce è solo memoria da allocare.
  // Il cronometro è SPENTO finché qualcuno non appende `pop._cronoSoc`. Senza di quello `cro` è
  // `undefined` e ogni misura è un `if` falso: il percorso normale non cambia, e nemmeno il mondo.
  // Serve perché di questa funzione si conosceva solo il totale — sei sottosistemi in un numero
  // solo — e non si può potare quel che non si sa dove sia.
  const cro = pop._cronoSoc;
  let fase = "";
  const vicini = (n) => {
    const cx = (n.x / CELL) | 0, cy = (n.y / CELL) | 0;
    const out = [];
    for (let gy = cy - 1; gy <= cy + 1; gy++) {
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        if (!dentro(gx, gy)) continue;
        const arr = grid[idCella(gx, gy)];
        // NON con lo spread: `push(...arr)` passa ogni elemento come argomento, ed è lento su un
        // array grande — oltre a poter far saltare lo stack in una cella molto affollata.
        if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
      }
    }
    if (cro) { cro.chiamate[fase] = (cro.chiamate[fase] || 0) + 1; cro.gente[fase] = (cro.gente[fase] || 0) + out.length; }
    return out;
  };
  // Non contiamo solo i millisecondi ma anche il LAVORO: quante volte si chiede il vicinato e
  // quanta gente ne esce. Un sottosistema che esamina mezzo milione di persone per fare trecento
  // cose è un candidato alla potatura; uno lento su poche persone è un altro problema.
  const fai = (nome, f) => {
    if (!cro) return f();
    fase = nome;
    const t = performance.now();
    f();
    cro.ms[nome] = (cro.ms[nome] || 0) + (performance.now() - t);
  };
  if (cro) cro.ms.griglia = (cro.ms.griglia || 0) + (performance.now() - tGriglia);
  // IL CENSIMENTO DEGLI INDIGENTI, per cella.
  //
  // Due sottosistemi — il dono e la sottomissione — cercano la stessa figura: qualcuno che non
  // abbia niente. Sono la stessa domanda posta da due moventi opposti, la pietà e l'avidità, e
  // tutt'e due si guardavano intorno una faccia alla volta. Sapere QUANTI ce ne sono in ogni cella
  // costa una passata sola e risponde a tutt'e due.
  //
  // «Indigente» non è una categoria del mondo: è la condizione che quei due cicli richiedono,
  // scritta una volta invece che duecentocinquanta. Se cambia la condizione lì, cambia qui — e il
  // banco (`banco/ab_doni.mjs`) se ne accorge, perché confronta le scelte, non i tempi.
  const indigenti = new Int32Array(COLONNE * RIGHE), disperati = new Int32Array(COLONNE * RIGHE);
  const zona = {
    indigenti, disperati,
    censimento() {
      indigenti.fill(0); disperati.fill(0);
      for (const n of pop.npcs) {
        if (!n.vivo || n.inventory.size !== 0) continue;
        const c = (n.x / CELL) | 0, r = (n.y / CELL) | 0;
        if (!dentro(c, r)) continue;
        const k = idCella(c, r);
        if (n.fame >= 0.6) indigenti[k]++;
        if (n.fame > 0.7 && n.coraggio < 0.5 && !n._padrone) disperati[k]++;
      }
    },
    nessuno(conteggio, n) {
      const cx = (n.x / CELL) | 0, cy = (n.y / CELL) | 0;
      for (let gy = cy - 1; gy <= cy + 1; gy++) for (let gx = cx - 1; gx <= cx + 1; gx++) {
        if (!dentro(gx, gy)) continue;
        if (conteggio[idCella(gx, gy)] > 0) return false;
      }
      return true;
    },
  };
  // IL METRO. Prima di dire che un sottosistema e' lento bisogna sapere quanto costa il ciclo NUDO
  // su questa gente: attraversare l'array e chiedere a ognuno se e' vivo, e nient'altro. Se un
  // sottosistema costa quanto il metro, non c'e' niente da ottimizzare dentro di lui — il costo e'
  // la passata, non il lavoro.
  if (cro) fai("(ciclo nudo)", () => { let q = 0; for (const n of pop.npcs) if (n.vivo) q++; pop._nudo = q; });
  fai("trasferimenti", () => trasferimenti(pop, dt, vicini, zona));
  fai("norme", () => norme(pop, dt, vicini));
  fai("coercizione", () => coercizione(pop, dt, vicini, zona));
  fai("educazione", () => educazione(pop, dt, vicini));
  fai("voci", () => voci(pop, dt, vicini));
  fai("magazzini", () => magazzini(pop, dt));
  fai("miti", () => miti(pop, dt));
  fai("classi", () => classi(pop));
  if (cro) cro.passi = (cro.passi || 0) + 1;
}
