// ═══ M6 — L'AI DEI LEADER ═══════════════════════════════════════════════════════════════════
// Quando un popolo diventa abbastanza grande, il suo leader EMERGENTE smette di essere guidato da
// semplici euristiche e comincia a PENSARE: un LLM ne impersona la mente. Regole del design:
//
//  • NON è un dio: vede solo ciò che il suo popolo ha SCOPERTO (fog of war) e sa solo ciò che i
//    suoi gli riferiscono. Non conosce la mappa, né i pensieri altrui.
//  • NON ha un telecomando: emette EDITTI, e gli NPC obbediscono secondo lealtà/paura/bisogni
//    (orders.js). Se governa male, gli ordini vengono ignorati e il malcontento lo uccide.
//  • La sua PERSONALITÀ non è inventata: è quella del cittadino reale che è diventato capo
//    (i tratti genetici che il simulatore gli ha dato alla nascita). Un avido governerà da avido.
//  • IMPARA dal passato tramite il PROMPT: ogni nuovo capo riceve la cronaca dei predecessori —
//    cosa ordinarono, quanto durarono, come caddero. È memoria dinastica.
//  • Parla con gli altri popoli e PUÒ MENTIRE; gli altri possono non credergli. La fiducia
//    diplomatica emerge dal confronto fra ciò che è stato dichiarato e ciò che è accaduto.
//  • Può nominare RUOLI (generale, sacerdote, maestro...) che diventano a loro volta menti con
//    interessi propri: da lì nascono i conflitti interni (chiesa contro stato).
//
// Tutto asincrono: le chiamate non bloccano mai la simulazione. Se la rete o le chiavi non vanno,
// il leader torna a governare per euristica e il mondo continua a girare.

import { COMPITI, assegnaOrdini } from "./orders.js";
import { coortiDi } from "./coorti.js";

// Da che gesto viene un mestiere: serve solo per raccontare al capo quanto sono pratici i suoi.
const MESTIERE_AZIONE = {
  guerriero: "combattimento", guaritore: "cura", mercante: "commercio", raccoglitore: "raccolta",
  agricoltore: "coltura", artista: "opera", maestro: "insegnamento", cacciatore: "caccia",
  costruttore: "costruzione", inventore: "invenzione", esploratore: "esplorazione", sacerdote: "predicazione",
};
import { P } from "./params.js";

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// VOCABOLARIO DEL POTERE — un capo non può ordinare ciò che il suo popolo non ha MAI fatto.
// Non è una questione di intelligenza: è che le parole per dirlo non esistono ancora. I primi
// capi della storia sanno dire soltanto "raccogliete" e "state insieme"; "coltivate" diventa
// pensabile solo dopo che qualcuno, per conto suo, ha piantato un seme. Il lessico del comando
// CRESCE con la civiltà, e ogni popolo ha il suo.
function vocabolario(pop, f) {
  const v = new Set(["raccogliere", "difendere", "migrare"]);   // ciò che sa fare qualunque animale
  let coltura = 0, costruzione = 0, combattimento = 0, esplorazione = 0, inventori = 0, fedeli = 0, opere = 0;
  for (const m of f._membri) {
    const a = m.azioni || {};
    coltura += a.coltura || 0; costruzione += a.costruzione || 0;
    combattimento += a.combattimento || 0; esplorazione += a.esplorazione || 0;
    opere += a.opera || 0;
    if (m.inventore && m.sapere.size > 2) inventori++;
    if (m.credo != null) fedeli++;
  }
  if (coltura > 0) v.add("coltivare");
  if (costruzione > 0) v.add("costruire");
  if (combattimento > 0) v.add("attaccare");
  if (esplorazione > 0 || f._membri.some((m) => m._esplora)) v.add("esplorare");
  if (inventori > 0) v.add("studiare");
  if (fedeli > 2) v.add("pregare");
  if (opere > 0) v.add("festeggiare");
  if ((pop.baratti || 0) > 20) v.add("commerciare");
  // LEVE DEL POTERE: si sbloccano quando il capo ne ha bisogno o ne ha già visto l'uso.
  // Il motore non sa cosa sia una "dittatura": offre solo la possibilità di farsi proteggere,
  // di reprimere chi si oppone e di comprare fedeltà. Cosa costruirci sopra lo decide la mente.
  if (f.membri >= 15) v.add("proteggere");
  if ((pop.punizioni || 0) > 0 || combattimento > 0) v.add("reprimere");
  if ((pop.tributi || 0) > 0 || (pop.doni || 0) > 0) v.add("donare");
  return [...v];
}

// PERCEZIONE DISTORTA — la mente non riceve la verità, riceve ciò che quel capo riesce a
// vedere. Un uomo ottuso non ha numeri in testa: ha impressioni. Un uomo pieno di sé sottovaluta
// i nemici. Un pauroso li ingigantisce. Sono gli stessi bias che governano tutti gli altri.
function percepisci(L, valore, tipo) {
  const acume = L.intelligenza;
  if (acume > 0.62) return +valore.toFixed(2);          // il capo acuto ragiona in numeri
  const b = L.bias || {};
  let v = valore;
  if (tipo === "minaccia") v *= (1 + (b.sicumera || 0.4) * -0.5 + L.emo.paura * 0.6);
  if (tipo === "risorsa") v *= (1 + (b.sicumera || 0.4) * 0.3);
  // il capo ottuso non ha misure: ha parole
  return v < 0.2 ? "quasi nulla" : v < 0.45 ? "poco" : v < 0.7 ? "abbastanza" : v < 0.95 ? "molto" : "moltissimo";
}

// Un popolo diventa "Stato pensante" solo se è abbastanza grande da avere bisogno di governo.
const SOGLIA_STATO = () => P.aiSogliaStato;
const MAX_CHIAMATE_PARALLELE = () => P.aiParallele;
const INTERVALLO_ANNI = () => P.aiIntervallo;      // ogni quanti anni simulati un leader riflette

export function initAI(pop) {
  pop.aiStati = new Map();       // identità -> stato del governo
  pop.aiAttiva = false;          // acceso dall'interfaccia
  pop.aiInVolo = 0;
  pop.aiChiamate = 0; pop.aiErrori = 0; pop.aiOrdiniTot = 0;
  pop.aiLog = [];                // diario delle decisioni (mostrato nell'UI)
  pop.aiProvider = null;
  // IL DIARIO DELLE MENTI. Un LLM sta fuori dalla macchina: interrogato due volte sullo stesso
  // identico stato può rispondere in modo diverso, e quella risposta diventa editti, lavoro,
  // guerra. Quindi con le menti accese il mondo NON è riproducibile, e non serve fingere che lo
  // sia. Ma si può avere la cosa che conta quasi quanto: la **rigiocabilità**.
  //
  // Qui si registra ogni risposta col battito esatto in cui è stata applicata. Rimettendo il
  // diario al posto della rete, quella partita torna identica — e la differenza fra «non posso
  // ripetere l'esperimento» e «posso ripetere quella partita» è tutta la differenza che serve
  // per confrontare due mondi con dentro una mente.
  pop.diarioMenti = [];        // quello che è successo, da salvare
  pop.mentiRegistrate = null;  // quello che si rimette, per rigiocare
  pop._daRigiocare = null;
}

// Rimette un diario salvato: da qui in poi le menti non chiamano più la rete, ripetono.
export function rigioca(pop, diario) {
  pop.mentiRegistrate = Array.isArray(diario) ? diario.slice() : [];
  pop._daRigiocare = pop.mentiRegistrate.slice().sort((x, y) => x.battito - y.battito);
  pop.aiAttiva = true;
  return pop._daRigiocare.length;
}

function log(pop, testo, tipo = "info") {
  pop.aiLog.push({ anno: Math.floor(pop.anno), testo, tipo });
  if (pop.aiLog.length > 60) pop.aiLog.shift();
}

// ---------------------------------------------------------------------------------------------
// PERSONALITÀ — non la inventiamo: la LEGGIAMO dal cittadino che è diventato capo.
function personalita(l) {
  const t = [];
  const add = (c, s) => { if (c) t.push(s); };
  add(l.empatia > 0.65, "compassionevole");
  add(l.empatia < 0.3, "spietato");
  add(l.avidita > 0.65, "avido");
  add(l.aggressivita > 0.65, "bellicoso");
  add(l.aggressivita < 0.3, "pacifico");
  add(l.superbia > 0.65, "orgoglioso");
  add(l.onesta > 0.7, "leale alla parola data");
  add(l.onesta < 0.3, "menzognero");
  add(l.curiosita > 0.65, "curioso del mondo");
  add(l.intelligenza > 0.7, "acuto");
  add(l.intelligenza < 0.35, "ottuso");
  add(l.coraggio > 0.7, "coraggioso");
  add(l.coraggio < 0.3, "timoroso");
  add((l.crudelta || 0) > 0.6, "crudele");
  add((l.spiritualita || 0) > 0.65, "devoto");
  add((l.pazienza || 0) > 0.65, "paziente");
  add(l.volonta > 0.7, "di volontà incrollabile");
  if (!t.length) t.push("di indole comune");
  return t.join(", ");
}
function motivazioniTxt(l) {
  const m = l.motiv || {};
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, v]) => `${k} ${(v * 100) | 0}`).join(", ");
}

// ---------------------------------------------------------------------------------------------
// STATO PERCEPITO — ciò che il capo SA. Non la verità del mondo: solo il suo punto di vista.
function costruisciStato(pop, f, st) {
  const L = f._leader;
  let fame = 0, sete = 0, salute = 0, malcontento = 0, lealta = 0, ribelli = 0, feriti = 0;
  let bambini = 0, anziani = 0, armati = 0, carenza = 0;
  const mestieri = {};
  for (const m of f._membri) {
    fame += m.fame; sete += m.sete; salute += m.salute; malcontento += m.malcontento;
    lealta += m.emo.lealta; carenza += m.carenza || 0;
    if (m.ribelle) ribelli++;
    if (m.salute < 0.6) feriti++;
    if (m.eta < 14) bambini++; else if (m.eta > 50) anziani++;
    if (m.strumento > 0.4) armati++;
    if (m.mestiere) mestieri[m.mestiere] = (mestieri[m.mestiere] || 0) + 1;
  }
  const n = f._membri.length;
  // Risorse note: solo i materiali che qualcuno del popolo possiede davvero.
  const risorse = {};
  for (const m of f._membri) for (const [id, q] of m.inventory) {
    if (q > 0) { const mat = pop.registry.mat(id); if (mat) risorse[mat.nome] = (risorse[mat.nome] || 0) + q; }
  }
  // Vicini CONOSCIUTI: gli altri popoli visibili a distanza ragionevole (non tutta la mappa).
  const vicini = [];
  for (const o of pop.factions) {
    if (o.id === f.id) continue;
    const d = Math.hypot(o.x - f.x, o.y - f.y);
    // chi non ha curiosità non si informa su chi sta lontano: per lui quel popolo non esiste
    const portata = 45 + L.curiosita * 90;
    if (d > portata) continue;
    const chiave = [f.nome, o.nome].sort().join("⚔");
    vicini.push({
      popolo: o.nome, distanza: Math.round(d),
      forza: L.intelligenza > 0.62 ? o.membri : percepisci(L, Math.min(1, o.membri / Math.max(1, f.membri)), "minaccia"),
      rancore: pop._rancori?.get(chiave) || 0,
      // Che gente sia, quella: non un numero, un'impressione. Chi ha poca testa la sbaglia.
      gente_che_sa_battersi: (() => {
        if (!pop.coorti) return "non se ne sa niente";
        let s = 0, k = 0;
        for (const c of pop.coorti.values()) {
          if (c.popolo !== o.id) continue;
          s += (c.perizie.combattimento || 0) * c.n; k += c.n;
        }
        if (!k) return "non se ne sa niente";
        return percepisci(L, s / k, "minaccia");
      })(),
      fiducia: Math.round((st.fiducia?.[o.nome] ?? 0.5) * 100),
      guidato_da: o.archetipo || "ignoto",
    });
  }
  const rel = pop.religioni.find((r) => r.id === L.credo);
  const dna = f.dnaCulturale || {};
  return {
    tu_sei: { popolo: f.nome, taglia: f.taglia, anno: Math.floor(pop.anno) },
    popolazione: { totale: n, bambini, anziani, guerrieri_potenziali: armati, ribelli, feriti },
    condizioni: {
      fame: percepisci(L, fame / n, "bisogno"), sete: percepisci(L, sete / n, "bisogno"),
      salute: percepisci(L, salute / n, "risorsa"), cibo_poco_vario: percepisci(L, carenza / n, "bisogno"),
      malcontento: percepisci(L, malcontento / n, "minaccia"),
      lealta_verso_di_te: percepisci(L, lealta / n, "risorsa"),
      consenso: percepisci(L, st.consenso ?? 0.5, "risorsa"),
      consenso_di_prima: st.consensoPrec != null ? percepisci(L, st.consensoPrec, "risorsa") : null,
    },
    territorio: {
      celle_controllate: f.territorio || 0, coesione: +((f.coesione || 0)).toFixed(2),
      capitale: { x: Math.round(f.capX ?? f.x), y: Math.round(f.capY ?? f.y) },
      mondo_esplorato_pct: Math.round((pop.scopertoCount / pop.scoperto.length) * 100),
      campi_coltivati: pop.campi.size, scorte_comuni: pop.scorteTot || 0,
    },
    ambiente: {
      stagione: pop.stagione, piove: !!pop.pioggia, siccita: +(pop.siccita || 0).toFixed(2),
      notte: !!pop.notte, cibo_selvatico: +(pop.vegFraction || 0).toFixed(2),
      fertilita_suolo: +(pop.fertilitaMedia ?? 1).toFixed(2),
      calamita_recenti: pop.cronaca.slice(-4).map((c) => c.testo),
    },
    cultura: { religione: rel ? rel.nome : null, fedeli: rel ? rel.credenti : 0, mestieri, dna_culturale: dna },
    risorse_del_popolo: risorse,
    popoli_vicini: vicini,
    messaggi_ricevuti: (st.postaIn || []).map((m) => ({ da: m.da, testo: m.testo })),
    // Quel che hanno riportato quelli che sono andati a vedere. Solo terre calpestate dai suoi.
    terre_di_cui_ti_hanno_parlato: pop.terreEsplorate ? pop.terreEsplorate(f, 4) : [],
    // La tua gente per gruppi, non come massa: dove stanno, che sanno fare, quanto sono pratici.
    // È da qui che si decide a chi ordinare che cosa, e quanti mandarne.
    le_tue_schiere: (() => {
      if (!pop.coorti) return [];
      const mie = coortiDi(pop.coorti, f.id);
      return mie.slice(0, 6).map((c) => ({
        dove: { x: Math.round(c.x), y: Math.round(c.y) },
        quanti: c.n,
        sanno_fare: c.mestiere || "un po' di tutto",
        pratica_nelle_armi: +(c.perizie.combattimento || 0).toFixed(2),
        pratica_nel_mestiere: c.mestiere ? +(c.perizie[MESTIERE_AZIONE[c.mestiere]] || 0).toFixed(2) : null,
        salute: +c.salute.toFixed(2),
        malcontento: +c.malcontento.toFixed(2),
        ceti: Object.fromEntries([...c.classi].map(([k, v]) => [k, v.n])),
      }));
    })(),
    cose_che_il_tuo_popolo_ha_inventato: (() => {
      // Entità nate dall'ingegno della gente: hanno i NOMI che si sono dati, e nessuno ha mai
      // spiegato a cosa servano. Sta al capo capire che farsene, dai loro effetti.
      if (!pop.entita) return [];
      const mie = [];
      for (const e of pop.entita.values()) {
        if (e.tipo !== "istituzione" || !e.portatori.size) continue;
        if (![...e.portatori].some((pid) => f._membri.some((m) => m.id === pid))) continue;
        mie.push({ nome: e.nome, quanti_la_praticano: e.portatori.size,
          pare_che: e.beneficioOsservato > 0.05 ? "giovi" : e.beneficioOsservato < -0.1 ? "costi più di quel che rende" : "non si capisca ancora" });
      }
      return mie.slice(0, 6);
    })(),
    // LE PAROLE CHE HAI MESSO IN GIRO. Un capo puo' ordinare qualunque cosa, anche con parole
    // sue; ma nessuno gliele spiega, e la sua gente le interpreta come puo'. Qui vede il
    // risultato: che cosa e' diventata ogni sua parola, e se ha fatto presa o si sta sfaldando.
    // E' l'unico modo che ha di imparare a parlare la lingua del suo popolo invece della propria
    // — e se sbaglia parola due volte, la seconda volta lo sa.
    le_tue_parole: (() => {
      if (!pop.significati) return [];
      const out = [];
      for (const [k, v] of pop.significati) {
        if (k.slice(0, k.indexOf("|")) !== String(f.id)) continue;
        out.push({
          parola: v.parola,
          l_hanno_intesa_come: v.gesto,
          volte: v.usi,
          ha_fatto_presa: v.forza > 0.45 ? "si e' radicata" : v.forza < 0.12 ? "si sta sfaldando" : "incerta",
        });
      }
      return out.slice(-8);
    })(),
    ruoli_che_hai_nominato: Object.entries(st.ruoli || {}).map(([r, v]) => ({ ruolo: r, nome: v.nome, potere: +(v.potere).toFixed(2), fedele: v.lealta > 0.4 })),
  };
}

// Report: cosa è successo DEI TUOI ORDINI. Senza questo un capo non potrebbe correggersi.
function costruisciReport(pop, f, st) {
  if (!st.ultimoOrdine) return "È la tua prima decisione: nessun precedente.";
  const r = [];
  r.push(`Dei tuoi ultimi editti: ${st.eseguiti || 0} obbediti, ${st.ignorati || 0} IGNORATI.`);
  if ((st.ignorati || 0) > (st.eseguiti || 0)) r.push("Il popolo ti sta disobbedendo: la tua autorità vacilla.");
  const morti = pop.morti - (st.mortiAllUltimo || 0);
  const nati = pop.nascite - (st.natiAllUltimo || 0);
  r.push(`Da allora: ${nati} nati, ${morti} morti.`);
  // Il capo osserva anche COME STA IL SUO POTERE. È da qui che una mente può capire, da sola,
  // che le conviene farsi proteggere, comprare fedeltà o togliere di mezzo chi la minaccia.
  if (st.consensoPrec != null) {
    const d = (st.consenso ?? 0.5) - st.consensoPrec;
    r.push(d < -0.05 ? "La tua presa sul potere si sta allentando."
      : d > 0.05 ? "La tua presa sul potere si è rafforzata." : "La tua presa sul potere non è cambiata.");
  }
  const guardie = st.guardie || 0;
  if (guardie) r.push(`${guardie} uomini ti fanno la guardia.`);
  const ribelli = f._membri.filter((m) => m.ribelle).length;
  if (ribelli > 2) r.push(`${ribelli} dei tuoi non ti riconoscono più.`);
  // Che ne è stato di ogni singolo ordine. È qui che si impara se un azzardo ha pagato.
  if (st.esitoEditti && st.esitoEditti.length) {
    const righe = st.esitoEditti.map((e) => {
      if (e.raccolto === 0) {
        return e.inedito
          ? `«${e.tipo}» — nessuno l'ha mai fatto prima e nessuno ha saputo cominciare: lettera morta`
          : `«${e.tipo}» — nessuno si è mosso`;
      }
      return `«${e.tipo}» — l'hanno raccolto in ${e.raccolto}${e.inedito ? ", ed era cosa mai vista" : ""}`;
    });
    r.push("Dei singoli ordini: " + righe.join("; ") + ".");
  }
  if (st.ultimoPensiero) r.push(`Allora pensasti: "${st.ultimoPensiero}"`);
  return r.join(" ");
}

// Memoria dinastica: come sono finiti i tuoi predecessori (l'unico modo in cui un LLM "impara").
function memoriaDinastia(st) {
  if (!st.dinastia?.length) return "Sei il primo a guidare questo popolo: nessuno prima di te.";
  return st.dinastia.slice(-4).map((d) =>
    `• ${d.nome} (${d.personalita.split(",")[0]}) governò ${d.anni} anni, ordinò soprattutto "${d.stile}", e ${d.fine}.`).join("\n");
}

// ---------------------------------------------------------------------------------------------
const SYSTEM = `Sei la mente di un capo in un mondo simulato primitivo. NON sei un assistente: SEI quel capo, con la sua indole, le sue ambizioni e i suoi limiti.
Governi un popolo reale: se sbagli, la gente muore di fame, si ribella e ti uccide. Se governi bene, il popolo cresce e ti ricorderà.

REGOLE DEL MONDO:
- I tuoi editti sono ORDINI, non magie: chi ha fame o è sleale non ti obbedirà.
- Non vedi il mondo intero: conosci solo ciò che il tuo popolo ha esplorato.
- Le distanze contano: ordinare qualcosa di lontano costa fatica e vite.
- Puoi mentire agli altri popoli. Loro possono mentire a te.
- Puoi ordinare QUALUNQUE cosa, anche con parole tue. Ma nessuno te la spiegherà: chi riceve un
  ordine che non capisce fa la cosa che gli sembra più sensata, e da quella la parola prende senso
  presso il tuo popolo. Le parole che portano bene attecchiscono, le altre si sfaldano.

Rispondi SEMPRE E SOLO con un oggetto JSON di questa forma (niente testo fuori dal JSON):
{
 "pensiero": "max 160 caratteri, in prima persona, il tuo vero ragionamento",
 "editti": [{"tipo":"<qualunque cosa tu voglia ordinare, anche con parole tue>", "quanti": <numero di persone>, "x": <coord opzionale>, "y": <coord opzionale>, "durata": <anni, 2-10>, "bersaglio": "<popolo o materiale>"}],
 "propaganda": {"tipo":"odia"|"ama", "bersaglio":"<aspetto o materiale>"} oppure null,
 "messaggi": [{"a":"<nome popolo vicino>", "testo":"<max 120 caratteri>", "sincero": true|false}],
 "nomina": "<chi porti la tua voce dove non arrivi: generale, sacerdote, maestro, mercante — o una carica tua>" oppure null
}
Massimo 3 editti e 2 messaggi. Sii concreto e coerente con la TUA indole.`;

// Ogni indole riceve un'istruzione diversa: due menti davanti allo stesso popolo non devono
// arrivare alle stesse conclusioni. Non è una maschera stilistica — cambia cosa considerano
// un problema e cosa una soluzione.
const INDOLE = {
  dittatore: "Il potere è tuo e non lo dividi. Chi mormora va zittito prima che parli. Non ti importa se ti amano: ti basta che ti temano.",
  stratega: "Pensi in anticipo. Ogni mossa deve prepararne un'altra. Non sprechi vite né tempo in gesti inutili.",
  visionario: "Ti interessa ciò che nessuno ha ancora visto. Il presente ti sta stretto: vuoi che il tuo popolo scopra, provi, vada oltre.",
  burocrate: "Ti fidi di ciò che ha già funzionato. Ordine, scorte, continuità: le novità ti sembrano rischi mal calcolati.",
  demagogo: "Sai che conta ciò che la gente CREDE, non ciò che è. Un nemico da odiare tiene un popolo unito meglio di mille granai.",
  riformatore: "Ti fa male vedere soffrire i tuoi. Vuoi che stiano meglio, anche a costo del tuo potere.",
  capo: "Vai a istinto, giorno per giorno.",
};

function costruisciPrompt(pop, f, st) {
  const L = f._leader;
  return `LA TUA IDENTITÀ
Sei ${st.nomeLeader}, capo di ${f.nome}. Indole: ${personalita(L)}. Ti muove soprattutto: ${motivazioniTxt(L)}.
${INDOLE[f.archetipo] || INDOLE.capo}
${L.intelligenza < 0.62 ? "Non sei uomo di numeri: vedi il mondo per impressioni, e puoi sbagliarti." : "Hai mente lucida: sai misurare ciò che vedi."}

QUELLO CHE PUOI ORDINARE
Ordini che il mondo capisce senza pensarci: ${COMPITI.join(", ")}. Ma non sei tenuto a questi.
Ogni ordine vuole: tipo, quanti (a quante persone), e dove (x, y) se il posto conta.
Puoi ordinare QUALUNQUE di queste cose a QUANTE persone vuoi e DOVE vuoi. Nessuno ti ferma.

Ma bada: la tua gente ha già fatto queste cose — ${vocabolario(pop, f).join(", ")} — e solo queste.
Il resto non l'ha mai fatto nessuno. Puoi ordinarlo lo stesso, e forse ci riusciranno, e forse
resterà lettera morta: lo leggerai nel rapporto della prossima volta. Comandare una cosa che
nessuno sa fare non è vietato — è solo un rischio, e sta a te decidere se corrorlo.

CHI TI HA PRECEDUTO
${memoriaDinastia(st)}

COSA È SUCCESSO DEI TUOI ORDINI
${costruisciReport(pop, f, st)}

CIÒ CHE SAI ORA
${JSON.stringify(costruisciStato(pop, f, st))}

Decidi. Ricorda chi sei.`;
}

// Estrae il primo oggetto JSON valido da una risposta (gli LLM aggiungono spesso testo attorno).
function parseOrdini(testo) {
  if (!testo) return null;
  let t = testo.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if (i < 0 || j <= i) return null;
  try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { return null; }
}

// Validazione severa: un ordine incomprensibile è un ORDINE CONFUSO, e viene scartato.
function validaEditti(pop, f, o) {
  const out = [];
  const lessico = vocabolario(pop, f);
  for (const e of (Array.isArray(o.editti) ? o.editti : []).slice(0, 3)) {
    // NESSUNA LISTA CHIUSA. Prima passava solo cio' che stava fra i quattordici compiti noti:
    // il capo era libero a parole e in pratica poteva dire quattordici cose, e quelle fuori lista
    // venivano scartate in silenzio mentre il resoconto gli diceva che erano state eseguite.
    // Ora passa QUALUNQUE parola. Se il mondo non ha un gesto pronto per quella parola, sara'
    // chi la riceve a darle un senso (interpreta, in orders.js) — e l'esito dira' se il senso regge.
    if (!e || typeof e.tipo !== "string") continue;
    const tipo = e.tipo.toLowerCase().trim().slice(0, 24).replace(/[^\p{L}\p{N} '-]/gu, "");
    if (!tipo) continue;
    const inedito = !COMPITI.includes(tipo) || !lessico.includes(tipo);
    const ed = {
      tipo,
      quanti: Math.max(1, Math.min(200, parseInt(e.quanti, 10) || 5)),
      durata: Math.max(2, Math.min(10, parseFloat(e.durata) || 4)),
      bersaglio: typeof e.bersaglio === "string" ? e.bersaglio.slice(0, 24) : null,
    };
    const x = parseFloat(e.x), y = parseFloat(e.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      ed.x = Math.max(0, Math.min(pop.world.width - 1, x));
      ed.y = Math.max(0, Math.min(pop.world.height - 1, y));
    } else { ed.x = f.capX ?? f.x; ed.y = f.capY ?? f.y; }
    ed.fino = pop.anno + ed.durata;
    ed.inedito = inedito;              // per dirgli, dopo, che aveva ordinato una cosa mai vista
    if (inedito) pop.ordiniInediti = (pop.ordiniInediti || 0) + 1;
    out.push(ed);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// APPLICAZIONE DELLE DECISIONI
function applica(pop, f, st, o) {
  st.editti = validaEditti(pop, f, o);
  st.pensiero = typeof o.pensiero === "string" ? o.pensiero.slice(0, 200) : "";
  st.ultimoPensiero = st.pensiero;
  st.ultimoOrdine = pop.anno;
  st.eseguiti = 0; st.ignorati = 0; st.esitoEditti = [];
  st.mortiAllUltimo = pop.morti; st.natiAllUltimo = pop.nascite;
  st.consensoPrec = st.consenso ?? 0.5;
  st.ordiniTot = (st.ordiniTot || 0) + st.editti.length;
  pop.aiOrdiniTot += st.editti.length;
  if (st.editti.length) st.stile = st.editti[0].tipo;
  log(pop, `${f.nome} — ${st.nomeLeader}: "${st.pensiero}" → ${st.editti.map((e) => `${e.tipo}×${e.quanti}`).join(", ") || "nessun editto"}`, "ordine");

  // PROPAGANDA: il capo può coniare un meme e imporlo al suo popolo (riusa il sistema dei memi).
  if (o.propaganda && (o.propaganda.tipo === "odia" || o.propaganda.tipo === "ama") && typeof o.propaganda.bersaglio === "string") {
    const bers = o.propaganda.bersaglio.slice(0, 30);
    let meme = pop.memi.find((m) => m.tipo === o.propaganda.tipo && m.bersaglio === bers);
    if (!meme) {
      meme = { id: Date.now() % 100000 + pop.memi.length, tipo: o.propaganda.tipo, dominio: /pelle/i.test(bers) ? "aspetto" : "materiale", bersaglio: bers, intensita: 0.7, origine: f.nome, anno: pop.anno | 0, diffusione: 0 };
      pop.memi.push(meme);
      if (pop.memi.length > 24) pop.memi.shift();
    }
    // il capo lo impone per primo ai più conformisti
    for (const m of f._membri) if (pop.rng() < m.conformismo * 0.5) m.memi.set(meme.id, 0.6);
    pop.propagande = (pop.propagande || 0) + 1;
    log(pop, `${f.nome} proclama: ${o.propaganda.tipo === "odia" ? "ODIATE" : "AMATE"} ${bers}`, "propaganda");
  }

  // DIPLOMAZIA: i messaggi partono. Chi mente lascia una traccia che i fatti potranno smentire.
  for (const m of (Array.isArray(o.messaggi) ? o.messaggi : []).slice(0, 2)) {
    if (!m || typeof m.a !== "string" || typeof m.testo !== "string") continue;
    const dest = pop.factions.find((x) => x.nome.toLowerCase() === m.a.toLowerCase().trim());
    if (!dest || dest.id === f.id) continue;
    const dst = pop.aiStati.get(dest.id);
    if (!dst) continue;
    const msg = { da: f.nome, daId: f.id, testo: m.testo.slice(0, 160), sincero: m.sincero !== false, anno: pop.anno };
    (dst.postaIn || (dst.postaIn = [])).push(msg);
    if (dst.postaIn.length > 4) dst.postaIn.shift();
    st.inviati = (st.inviati || 0) + 1;
    if (!msg.sincero) { st.menzogne = (st.menzogne || 0) + 1; pop.menzogneAI = (pop.menzogneAI || 0) + 1; }
    // promessa registrata: se dichiara pace e poi attacca, la bugia verrà scoperta (vedi verificaPromesse)
    if (/pace|allea|amic|non .*attacc/i.test(msg.testo)) st.promessePace = { a: dest.nome, anno: pop.anno };
    log(pop, `${f.nome} → ${dest.nome}: "${msg.testo}"${msg.sincero ? "" : " (menzogna)"}`, "diplomazia");
  }

  // NOMINA DI RUOLI → sub-menti con interessi propri (chiesa/esercito/scuola/mercato).
  if (typeof o.nomina === "string" && f.membri >= 40) nominaRuolo(pop, f, st, o.nomina.trim().toLowerCase());
}

// I ruoli non sono decorativi: il nominato ACCUMULA POTERE e può diventare un rivale.
function nominaRuolo(pop, f, st, ruolo) {
  // ANCHE I RUOLI SI POSSONO INVENTARE. Qui c'era l'ultima lista chiusa rimasta, della stessa
  // forma di quella caduta per gli editti: si potevano nominare quattro cose e basta, e il resto
  // veniva scartato in silenzio. Ma un capo che si inventa una carica non ha bisogno che il mondo
  // sappia cosa sia — ha bisogno di qualcuno che porti la sua voce dove lui non arriva, e quel
  // meccanismo c'è già (i delegati). Il nome se lo tiene lui.
  //
  // Per le quattro parole che il mondo conosce si sceglie ancora chi è più tagliato: un generale
  // aggressivo, un sacerdote spirituale. Per una parola inventata si sceglie chi già SPICCA fra i
  // suoi — perché è quello che si fa davvero quando si crea una carica che non è mai esistita.
  const validi = { generale: "aggressivita", sacerdote: "spiritualita", maestro: "intelligenza", mercante: "avidita" };
  if (!ruolo || ruolo.length > 24) return;
  const inedito = !validi[ruolo];
  if (!st.ruoli) st.ruoli = {};
  if (st.ruoli[ruolo] && st.ruoli[ruolo].vivo !== false) return;
  if (Object.keys(st.ruoli).length >= 5) return;     // nemmeno un capo può nominare tutti
  // sceglie il più adatto fra i membri (non il capo)
  let best = null, bv = -1;
  for (const m of f._membri) {
    if (m === f._leader || !m.vivo) continue;
    const v = inedito
      ? m.ambizione * 0.5 + m.intelligenza * 0.4 + m.forza * 0.3 + m.emo.lealta * 0.4
      : (m[validi[ruolo]] || 0.4) + m.ambizione * 0.3 + m.intelligenza * 0.2;
    if (v > bv) { bv = v; best = m; }
  }
  if (!best) return;
  if (inedito) pop.caricheInventate = (pop.caricheInventate || 0) + 1;
  best._ruolo = ruolo;
  best._potereRuolo = 0.2;
  // Si tiene anche la persona, non solo il suo numero: è a lei che la gente obbedisce quando il
  // capo è troppo lontano per farsi sentire (vedi obbedienza, in orders.js).
  st.ruoli[ruolo] = { id: best.id, nome: "n" + best.id, potere: 0.2, lealta: best.emo.lealta, ambizione: best.ambizione, _npc: best };
  log(pop, `${f.nome}: nominato un ${ruolo}`, "nomina");
}

// ---------------------------------------------------------------------------------------------
// CHIAMATA ASINCRONA (non blocca mai la simulazione)
async function consulta(pop, f, st) {
  st.inCorso = true; pop.aiInVolo++;
  try {
    const r = await fetch("/api/llm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: SYSTEM, user: costruisciPrompt(pop, f, st),
        temperature: P.aiTemperatura + (f._leader.volonta || 0.5) * 0.5,   // i volitivi sono più imprevedibili
        maxTokens: 700,
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.errore || "errore LLM");
    pop.aiProvider = j.provider;
    const ordini = parseOrdini(j.testo);
    if (!ordini) { st.confusi = (st.confusi || 0) + 1; log(pop, `${f.nome}: ordini incomprensibili, il capo si contraddice`, "errore"); return; }
    // il popolo può essere cambiato mentre l'AI pensava: riaggancio la fazione per identità
    const viva = pop.factions.find((x) => x.id === f.id);
    if (viva) {
      applica(pop, viva, st, ordini);
      // si registra il TESTO e il battito in cui è stato applicato: non basta la risposta, serve
      // anche il quando — una risposta uguale applicata un battito dopo dà un mondo diverso.
      (pop.diarioMenti || (pop.diarioMenti = [])).push({
        battito: pop._battito || 0, anno: +(pop.anno.toFixed(3)),
        fazione: f.id, provider: j.provider, testo: j.testo,
      });
    }
    pop.aiChiamate++;
  } catch (e) {
    pop.aiErrori++;
    st.offline = true;
    if (pop.aiErrori <= 2) log(pop, `Nessuna mente disponibile (${e.message}): i capi governano d'istinto`, "errore");
  } finally {
    st.inCorso = false; pop.aiInVolo--;
    st.ultimaChiamata = pop.anno;
  }
}

// ---------------------------------------------------------------------------------------------
// SUCCESSIONE, POTERE INTERNO, VERIFICA DELLE PROMESSE
function aggiornaGoverno(pop, f, st, dt) {
  const L = f._leader;
  // — cambio di leader: la dinastia registra come è finito il predecessore —
  if (st.leaderId !== L.id) {
    if (st.leaderId != null) {
      const morto = !st.leaderVivo;
      const durata = Math.max(1, Math.round(pop.anno - (st.inizioRegno || pop.anno)));
      const fine = morto ? (st.uccisoDa ? `fu ucciso da un suo suddito` : "morì") : "fu esautorato";
      (st.dinastia || (st.dinastia = [])).push({
        nome: st.nomeLeader, personalita: st.personalitaTxt || "ignota",
        anni: durata, stile: st.stile || "nulla di memorabile", fine,
      });
      if (st.dinastia.length > 8) st.dinastia.shift();
      // Si annota solo la caduta di chi ha davvero REGNATO: i passaggi di mano istantanei dovuti
      // al rimescolarsi dei cluster non sono "storia" e intaserebbero le cronache.
      if (durata >= 3 || morto) {
        log(pop, `${f.nome}: ${st.nomeLeader} ${fine} dopo ${durata} anni. Sale al potere un nuovo capo.`, "successione");
        pop.chronicle && pop.chronicle(`${f.nome}: cade ${st.nomeLeader}, ${fine}`, 5);
      }
    }
    st.leaderId = L.id; st.nomeLeader = "n" + L.id; st.personalitaTxt = personalita(L);
    st.inizioRegno = pop.anno; st.editti = []; st.consenso = 0.5; st.uccisoDa = null;
  }
  st.leaderVivo = L.vivo;

  // — il capo è un uomo: il malcontento può UCCIDERLO (già previsto dal motore dell'invidia) —
  // qui aggiungiamo la pressione politica: consenso basso + malcontento alto = congiura.
  let mal = 0; for (const m of f._membri) mal += m.malcontento;
  mal /= f._membri.length;
  st.consenso = clamp01((st.consenso ?? 0.5) + (mal > 0.5 ? -0.02 : 0.01) * dt * 3);
  // Quanti uomini stanno facendo la guardia al capo in questo momento.
  st.guardie = f._membri.filter((m) => m.vivo && m._guardia > pop.anno).length;
  if (mal > 0.55 && st.consenso < 0.25 && pop.rng() < dt * 0.15) {
    // congiura: un ambizioso (o un ruolo potente) colpisce il capo
    let sicario = null, bv = 0;
    for (const m of f._membri) {
      if (m === L || !m.vivo) continue;
      const v = m.ambizione * 0.5 + m.malcontento * 0.6 + (m._ruolo ? 0.4 : 0) + m.aggressivita * 0.3 - m.emo.lealta * 0.5;
      if (v > bv) { bv = v; sicario = m; }
    }
    // Le guardie fanno da scudo: più sono, più è probabile che la congiura fallisca — e chi ci
    // prova lo paga. Un capo che ha capito questo può reggersi a lungo anche essendo odiato.
    if (sicario && st.guardie > 0 && pop.rng() < 1 - Math.pow(0.55, st.guardie)) {
      sicario.salute -= 0.8;
      sicario.emo.paura = clamp01(sicario.emo.paura + 0.7);
      sicario.malcontento = clamp01(sicario.malcontento - 0.2);
      if (sicario.salute <= 0) { sicario.vivo = false; pop.morti++; pop.omicidi = (pop.omicidi || 0) + 1; }
      pop.congiureSventate = (pop.congiureSventate || 0) + 1;
      log(pop, `${f.nome}: una congiura contro ${st.nomeLeader} è stata sventata dalle sue guardie`, "congiura");
      return;
    }
    if (sicario && bv > 0.9) {
      L.salute -= 0.9;
      if (L.salute <= 0) {
        L.vivo = false; pop.morti++; pop.omicidi = (pop.omicidi || 0) + 1;
        st.uccisoDa = sicario.id; sicario.reputazione.regicida = (sicario.reputazione.regicida || 0) + 1;
        pop.congiure = (pop.congiure || 0) + 1;
        log(pop, `${f.nome}: CONGIURA! ${st.nomeLeader} è stato ucciso${sicario._ruolo ? ` dal suo ${sicario._ruolo}` : ""}`, "congiura");
        pop.chronicle && pop.chronicle(`Congiura di palazzo in ${f.nome}: il capo è assassinato`, 4);
      }
    }
  }

  // — RUOLI: accumulano potere; se superano il capo ed è ambizioso, nasce il conflitto interno —
  for (const [ruolo, r] of Object.entries(st.ruoli || {})) {
    if (r._npc && r._npc.vivo) r._npc._potereRuolo = r.potere;   // quanto pesa la sua voce, adesso
    const npc = f._membri.find((m) => m.id === r.id);
    if (!npc || !npc.vivo) { delete st.ruoli[ruolo]; continue; }
    // il potere cresce se il ruolo "serve" (guerra→generale, fede→sacerdote, sapere→maestro)
    // Per le cariche che il mondo conosce, «servire» ha un metro suo: un generale serve se c'è
    // guerra, un sacerdote se c'è fede, un maestro se c'è sapere. Per una carica INVENTATA nessuno
    // sa cosa dovrebbe fare — nemmeno il motore — e allora si guarda l'unica cosa che si può
    // guardare davvero: la gente attorno a chi la porta sta meglio o peggio? Una carica che non
    // serve a niente si spegne da sé, senza che nessuno debba dichiararlo.
    const utile = ruolo === "generale" ? (pop.guerreAttive > 0 ? 1 : 0.2)
      : ruolo === "sacerdote" ? clamp01((pop.religioni.reduce((s, x) => s + x.credenti, 0)) / Math.max(1, f.membri))
      : ruolo === "maestro" ? clamp01(npc.sapere.size / 12)
      : ruolo === "mercante" ? clamp01((pop.baratti || 0) / Math.max(60, pop.npcs.length * 3))
      : (() => {
          const attorno = pop.vicini(npc.x, npc.y, 14);
          if (attorno.length < 4) return 0.3;
          let mal = 0, n = 0;
          for (const o of attorno) { if (!o.vivo) continue; mal += o.malcontento || 0; n++; }
          return n ? clamp01(1 - (mal / n) * 1.6) : 0.3;
        })();
    r.potere = clamp01(r.potere + (utile - 0.35) * 0.02 * dt * 3);
    r.lealta = npc.emo.lealta;
    // CONFLITTO INTERNO: un ruolo potente, ambizioso e poco leale sfida il capo.
    if (r.potere > 0.7 && npc.ambizione > 0.6 && npc.emo.lealta < 0.4 && pop.rng() < dt * 0.1) {
      st.consenso = clamp01(st.consenso - 0.15);
      npc.malcontento = clamp01(npc.malcontento + 0.2);
      // trascina i suoi fedeli (chi condivide la sua fede/mestiere) nel malcontento
      for (const m of f._membri) if (m !== npc && (m.credo === npc.credo || m.mestiere === npc.mestiere) && pop.rng() < 0.3) m.malcontento = clamp01(m.malcontento + 0.1);
      pop.sfide = (pop.sfide || 0) + 1;
      log(pop, `${f.nome}: il ${ruolo} sfida apertamente il capo — il popolo si divide`, "sfida");
      pop.chronicle && pop.chronicle(`In ${f.nome} il ${ruolo} contende il potere al capo`, 6);
    }
  }

  // — VERIFICA DELLE PROMESSE: se hai promesso pace e poi hai razziato, si saprà —
  if (st.promessePace && pop.anno - st.promessePace.anno < 12) {
    const chiave = [f.nome, st.promessePace.a].sort().join("⚔");
    const rancore = pop._rancori?.get(chiave) || 0;
    if (rancore > (st.rancoreAllaPromessa ?? rancore)) {
      const vittima = pop.factions.find((x) => x.nome === st.promessePace.a);
      const vst = vittima && pop.aiStati.get(vittima.id);
      if (vst) {
        vst.fiducia = vst.fiducia || {};
        vst.fiducia[f.nome] = clamp01((vst.fiducia[f.nome] ?? 0.5) - 0.4);
        log(pop, `${st.promessePace.a} scopre il tradimento di ${f.nome}: la fiducia crolla`, "tradimento");
      }
      st.promessePace = null;
    }
  }
}

// ---------------------------------------------------------------------------------------------
export function stepAI(pop, dt) {
  if (!pop.aiStati) initAI(pop);
  if (!pop.factions?.length) return;

  for (const f of pop.factions) {
    if (f.membri < SOGLIA_STATO()) continue;
    let st = pop.aiStati.get(f.id);
    if (!st) {
      st = { editti: [], consenso: 0.5, fiducia: {}, postaIn: [], dinastia: [], ruoli: {}, ultimaChiamata: -999 };
      pop.aiStati.set(f.id, st);
      log(pop, `${f.nome} è abbastanza grande da avere un governo: nasce uno Stato pensante`, "nascita");
      pop.chronicle && pop.chronicle(`${f.nome} si dà un governo: il capo comincia a comandare`, 8);
    }
    aggiornaGoverno(pop, f, st, dt);
    assegnaOrdini(pop, f, dt);   // gli editti cercano braccia: chi obbedisce e chi no

    // riflessione periodica (asincrona, con budget di chiamate parallele)
    if (!pop.aiAttiva || st.inCorso) continue;
    if (pop._daRigiocare) continue;      // si sta rigiocando: le risposte arrivano dal diario
    if (pop.aiInVolo >= MAX_CHIAMATE_PARALLELE()) continue;
    const urgenza = st.consenso < 0.3 || pop.guerreAttive > 0 ? 0.5 : 1;
    if (pop.anno - st.ultimaChiamata < INTERVALLO_ANNI() * urgenza) continue;
    st.ultimaChiamata = pop.anno;   // segna subito per non ri-lanciare mentre è in volo
    consulta(pop, f, st);           // volutamente NON awaited: la simulazione prosegue
  }

  // RIGIOCATA: si applicano le risposte registrate quando torna il loro battito. Niente rete,
  // niente attesa, niente capriccio del modello: la stessa partita, di nuovo.
  if (pop._daRigiocare) {
    const ora = pop._battito || 0;
    while (pop._daRigiocare.length && pop._daRigiocare[0].battito <= ora) {
      const v = pop._daRigiocare.shift();
      const f = pop.factions.find((x) => x.id === v.fazione);
      const st = pop.aiStati.get(v.fazione);
      // Una voce che non si può rimettere NON deve sparire in silenzio: il popolo a cui era
      // destinata può essersi sciolto nel frattempo, ed è un fatto da sapere, non da nascondere.
      // (È la stessa lezione dell'ecosistema spento: un pezzo che non funziona deve dirlo.)
      if (!f || !st) { pop.rigiocateCadute = (pop.rigiocateCadute || 0) + 1; continue; }
      const ordini = parseOrdini(v.testo);
      if (!ordini) { pop.rigiocateIlleggibili = (pop.rigiocateIlleggibili || 0) + 1; continue; }
      applica(pop, f, st, ordini);
      pop.aiChiamate++;
      pop.rigiocateApplicate = (pop.rigiocateApplicate || 0) + 1;
    }
    if (!pop._daRigiocare.length) pop._daRigiocare = null;   // diario finito: si torna liberi
  }

  // pulizia degli stati di popoli estinti
  if (pop.aiStati.size > 40) {
    const vive = new Set(pop.factions.map((f) => f.id));
    for (const k of pop.aiStati.keys()) if (!vive.has(k)) pop.aiStati.delete(k);
  }
}

// Riepilogo per l'interfaccia.
export function aiStats(pop) {
  if (!pop.aiStati) return null;
  const governi = [];
  for (const f of pop.factions) {
    const st = pop.aiStati.get(f.id);
    if (!st) continue;
    governi.push({
      popolo: f.nome, archetipo: f.archetipo, leader: st.nomeLeader,
      personalita: st.personalitaTxt, consenso: st.consenso ?? 0.5,
      pensiero: st.pensiero || "", editti: (st.editti || []).map((e) => `${e.tipo}×${e.quanti}`),
      eseguiti: st.eseguiti || 0, ignorati: st.ignorati || 0,
      dinastia: (st.dinastia || []).length, menzogne: st.menzogne || 0,
      ruoli: Object.keys(st.ruoli || {}),
    });
  }
  return {
    attiva: pop.aiAttiva, provider: pop.aiProvider, chiamate: pop.aiChiamate,
    errori: pop.aiErrori, inVolo: pop.aiInVolo, ordini: pop.aiOrdiniTot,
    congiure: pop.congiure || 0, sfide: pop.sfide || 0, menzogne: pop.menzogneAI || 0,
    governi, log: pop.aiLog,
  };
}
