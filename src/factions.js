import { P } from "./params.js";
// GRUPPI SOCIALI EMERGENTI — nessuno "stato" scritto a mano. La società È il GRAFO SOCIALE: nodi
// (individui) e archi (prossimità + fiducia/non-inimicizia). Le "nazioni" sono solo cluster molto
// connessi, di dimensione QUALUNQUE (niente livelli amministrativi fissi: le etichette taglia sono
// solo un descrittore). Due leggi chiave, entrambe emergenti:
//   • IDENTITÀ con INERZIA: un cluster tramanda la propria identità (nome) finché la rete non si
//     spezza davvero. Roma resta Roma anche con 100 leader. Niente più nome che cambia ogni frame.
//   • CONTROLLO limitato dalla DISTANZA: il governo si irradia dal leader e si attenua col percorso;
//     oltre la "portata" le province si STACCANO (secessione) → gli imperi non coprono tutta la
//     mappa e collassano ai bordi quando muore un grande leader. Nessun if(pop>N) rebellion().
// Qui si innesteranno gli LLM (M6): ogni AI impersona il leader di un cluster.

let _identSeed = 1;
function syllable(id) {
  const c = "bcdfglmnprstv", v = "aeiou";
  let s = "", x = (id * 2654435761) >>> 0;
  for (let i = 0; i < 3; i++) { s += c[x % c.length]; x = (x / 13) | 0; s += v[x % v.length]; x = (x / 7) | 0; }
  return s.charAt(0).toUpperCase() + s.slice(1);
}
// Descrittore di taglia (SOLO estetico: il gruppo è illimitato, non un "livello" con regole diverse).
function tagliaNome(n) {
  return n < 30 ? "tribù" : n < 100 ? "villaggio" : n < 300 ? "città" : n < 1000 ? "regno" : n < 4000 ? "impero" : "egemonia";
}

export function updateFactions(pop) {
  const npcs = [];
  for (const n of pop.npcs) if (n.vivo) npcs.push(n);
  if (!npcs.length) { pop.factions = []; return; }
  if (!pop.identityNames) pop.identityNames = new Map();

  // Griglia spaziale + ADIACENZA precalcolata UNA volta: archi verso i vicini non-nemici, col
  // costo di percorrenza (distanza × dislivello). Riusata da union-find e dalle flood di governo.
  const world = pop.world;
  const R2 = P.raggioLegame * P.raggioLegame;
  // La griglia e' FINE (celle piccole), non larga quanto il raggio: serve a poter guardare
  // vicino prima che lontano. Con celle larghe si finiva per esaminare tutta la folla comunque.
  // Quanto fini sono le celle. Non cambia MAI il risultato — le K più vicine sono le K più vicine
  // qualunque griglia si usi — cambia solo quanto presto ci si può fermare: con celle piccole si
  // esce prima nella calca, ma si interrogano più celle vuote nel rado. Si misura, non si deduce
  // (banco/passo_fazioni.mjs).
  const PASSO = Math.max(1, Math.round(P.passoFazioni || P.raggioLegame / 3));
  const ANELLI = Math.ceil(P.raggioLegame / PASSO);
  // GRIGLIA PIATTA, NIENTE CHIAVI-STRINGA. Ogni accesso costruiva una stringa ("12,7"), la
  // sminuzzava per l'hash e lasciava spazzatura, e qui gli accessi sono decine per persona.
  // Con una mappa 320×320 il numero della cella basta. Il margine serve perché la mappa a stringhe
  // non aveva confini: chi finisse sul bordo deve restare nella SUA cella, non essere accorpato.
  const MARG = 2;
  const COL = Math.ceil(world.width / PASSO) + MARG * 2;
  const RIG = Math.ceil(world.height / PASSO) + MARG * 2;
  const cellaId = (c, r) => (r + MARG) * COL + (c + MARG);
  const dentroG = (c, r) => c + MARG >= 0 && r + MARG >= 0 && c + MARG < COL && r + MARG < RIG;
  const grid = new Array(COL * RIG).fill(null);
  // Ogni persona riceve un indice stabile PER QUESTA CHIAMATA: serve a tenere l'adiacenza in un
  // array invece che in una Map con chiave oggetto, e le Map con chiave oggetto sono la cosa più
  // cara che si possa mettere dentro un ciclo caldo.
  for (let i = 0; i < npcs.length; i++) {
    const n = npcs[i];
    n._iF = i;
    const c = (n.x / PASSO) | 0, r = (n.y / PASSO) | 0;
    if (!dentroG(c, r)) continue;
    const k = cellaId(c, r);
    (grid[k] || (grid[k] = [])).push(n);
  }

  const adj = new Array(npcs.length);
  // I DUE ELENCHI DELLA RICERCA SI RIUSANO. Prima si allocavano `vic` e `dis` da capo per ogni
  // persona: a cinquemila persone sono diecimila array a battito, tutti da raccogliere. La
  // dimensione massima si sa in anticipo (la cerchia più larga possibile con questi parametri),
  // quindi bastano due buffer riempiti e svuotati con un contatore.
  const K_MAX = ((P.cerchiaBase + P.cerchiaTesta + P.cerchiaIndole) | 0) + 2;
  const vic = new Array(K_MAX);
  const dis = new Float64Array(K_MAX);
  // LA CERCHIA E' FINITA, E SI GUARDA VICINO PRIMA CHE LONTANO.
  // Prima ognuno si legava a CHIUNQUE fosse nel raggio, e per farlo doveva comunque squadrare
  // tutti: in una folla fitta erano centinaia di confronti a testa, e il costo cresceva col
  // quadrato della gente (misurato: la sola costruzione dei legami faceva ^2,28).
  // Ma il limite non e' un espediente di calcolo. Nessuno tiene davvero in mente mezzo villaggio:
  // quante facce ci stiano dipende da chi sei — testa e voglia di gente — e nessuno scruta la
  // piazza intera per scegliersele, guarda chi ha intorno e si ferma quando ne ha abbastanza.
  // Qui si fa esattamente questo: anelli concentrici dal punto in cui sei, e si smette appena
  // la cerchia e' piena di gente piu' vicina di quanta ne possa ancora arrivare da fuori.
  // Conseguenza voluta nel mondo: una massa densa non diventa un solo blocco per forza di
  // numeri: si spezza dove finisce la portata di ciascuno.
  for (const n of npcs) {
    const cx = (n.x / PASSO) | 0, cy = (n.y / PASSO) | 0;
    const en = world.elevation[((n.y | 0) * world.width + (n.x | 0))];
    const K = (P.cerchiaBase + n.intelligenza * P.cerchiaTesta + (n.socievolezza || 0.5) * P.cerchiaIndole) | 0;
    let nv = 0;                 // quanti ne ha in mano: i buffer sono riusati, non riallocati
    for (let r = 0; r <= ANELLI; r++) {
      // Da un anello piu' esterno non puo' arrivare nessuno piu' vicino di cosi': se la cerchia
      // e' gia' piena di gente piu' stretta, cercare oltre e' fiato sprecato.
      if (nv >= K) { const minFuori = (r - 1) * PASSO; if (minFuori > 0 && minFuori * minFuori >= dis[K - 1]) break; }
      for (let gy = cy - r; gy <= cy + r; gy++) for (let gx = cx - r; gx <= cx + r; gx++) {
        if (r > 0 && Math.abs(gx - cx) !== r && Math.abs(gy - cy) !== r) continue;  // solo il bordo
        if (!dentroG(gx, gy)) continue;
        const arr = grid[cellaId(gx, gy)]; if (!arr) continue;
        // SI SALTANO LE CELLE IMPOSSIBILI, non solo gli anelli. Per ogni cella si calcola quanto
        // possa avvicinarsi AL MASSIMO un suo punto qualsiasi: se gia' quel minimo e' peggiore del
        // K-esimo che si ha in mano, nessuno di la' dentro potrebbe entrare nella cerchia, e la si
        // salta senza calcolare una sola distanza.
        //
        // E' esatta, non approssimata: poche righe piu' sotto un candidato viene scartato con
        // `d2 >= dis[nv-1]`, e ogni candidato di una cella saltata avrebbe per forza
        // d2 >= minimo >= dis[nv-1]. Stesso esito, meno conti.
        // Misurato in A/B nello stesso processo: **-18%** sulla costruzione dei legami, con zero
        // differenze su 170 193 archi.
        if (nv >= K) {
          const x0 = gx * PASSO, y0 = gy * PASSO;
          const ddx = n.x < x0 ? x0 - n.x : (n.x > x0 + PASSO ? n.x - x0 - PASSO : 0);
          const ddy = n.y < y0 ? y0 - n.y : (n.y > y0 + PASSO ? n.y - y0 - PASSO : 0);
          if (ddx * ddx + ddy * ddy >= dis[nv - 1]) continue;
        }
        for (const m of arr) {
          if (m === n) continue;
          const d2 = (m.x - n.x) ** 2 + (m.y - n.y) ** 2; if (d2 > R2) continue;
          if (nv >= K && d2 >= dis[nv - 1]) continue;
          let j = nv < K ? nv : K - 1;
          while (j > 0 && dis[j - 1] > d2) { dis[j] = dis[j - 1]; vic[j] = vic[j - 1]; j--; }
          dis[j] = d2; vic[j] = m;
          if (nv < K) nv++;
        }
      }
    }
    // Solo adesso si guarda chi si odia: e' la parte cara (due letture di memoria per coppia)
    // e ora la si paga su una manciata di persone invece che su tutta la folla.
    const out = [];
    for (let k = 0; k < nv; k++) {
      const m = vic[k];
      if ((n.memoria.get(m.id) || 0) + (m.memoria.get(n.id) || 0) <= -0.2) continue;
      const em = world.elevation[((m.y | 0) * world.width + (m.x | 0))];
      out.push([m, Math.sqrt(dis[k]) * (1 + Math.abs(em - en) * 12)]);
    }
    adj[n._iF] = out;
  }

  // 1) CLUSTER GREZZI: union-find sugli archi di adiacenza.
  const parent = new Map();
  for (const n of npcs) parent.set(n.id, n.id);
  const find = (a) => { while (parent.get(a) !== a) { parent.set(a, parent.get(parent.get(a))); a = parent.get(a); } return a; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  for (const n of npcs) for (const [m] of adj[n._iF]) if (m.id > n.id) union(n.id, m.id);
  const groups = new Map();
  for (const n of npcs) { const r = find(n.id); let a = groups.get(r); if (!a) { a = []; groups.set(r, a); } a.push(n); }

  // 2) CONTROLLO LIMITATO DALLA DISTANZA: da ogni cluster carvo le "polity" governabili. Il governo
  //    fluisce dal leader lungo la rete e paga un costo (distanza × dislivello); oltre il budget le
  //    province si staccano e formano un'altra polity (secessione). Un leader capace governa più
  //    lontano; un leader debole tiene un dominio piccolo → collasso ai bordi al cambio di leader.
  // INERZIA DEL POTERE: chi già comanda ha un vantaggio enorme (è "il capo", ha la rete di
  // fedeli e il prestigio). Senza questo bonus il trono cambierebbe a ogni frame per fluttuazioni
  // minime — e i governi (M6) non farebbero in tempo a governare. Un rivale deve superarlo NETTAMENTE.
  const authority = (m) => m.intelligenza + m.forza + m.ambizione + m.superbia * 0.5
    + Math.min(1, m.eta / 40) + (m._isLeader ? P.inerziaLeader : 0);
  const polities = [];
  for (const membri of groups.values()) {
    if (membri.length < P.minCluster) { for (const m of membri) { m.fazione = null; m.identita = null; m._isLeader = false; } continue; }
    let remaining = new Set(membri);
    // I CANDIDATI SI ORDINANO UNA VOLTA SOLA. Prima, per ogni trono da assegnare, si ripassava
    // in rassegna tutta la massa rimasta a cercare il piu' autorevole: con quaranta troni e
    // migliaia di persone erano milioni di confronti, e il costo cresceva col quadrato (^2,35).
    // Il risultato non cambia di una virgola — comanda sempre il piu' autorevole fra chi non ha
    // ancora un capo — cambia solo che la classifica si stila una volta invece che quaranta.
    const candidati = membri.slice().sort((x, y) => authority(y) - authority(x));
    let ci = 0, guard = 0;
    // Il vecchio tetto di quaranta popoli per grumo non era una legge, era prudenza: lasciava
    // senza stato le masse grandi. Ogni giro toglie comunque qualcuno da "rimasti", quindi il
    // ciclo finisce da se'; il tetto resta solo come rete di sicurezza.
    while (remaining.size >= P.minCluster && guard++ < membri.length) {
      let leader = null;
      while (ci < candidati.length && !remaining.has(candidati[ci])) ci++;
      if (ci >= candidati.length) break;
      leader = candidati[ci];
      const budget = P.portataGoverno + leader.intelligenza * P.portataIntelligenza + leader.ambizione * 16;   // portata (distanza) di governo
      // SPAN OF CONTROL: un leader può reggere solo un numero FINITO di persone — oltre, gli ordini
      // non arrivano, la fiducia cala, la periferia ignora il centro. Cresce con le sue capacità.
      // Così anche una massa compatta si spezza in più stati, non un unico super-impero.
      const maxGov = P.spanControlBase + (leader.intelligenza * P.spanControlIntelligenza + leader.ambizione * 110 + leader.forza * 45) | 0;
      // FLOOD a coda dal leader entro budget e maxGov (senza re-rilassamento → O(archi)).
      const governed = new Set([leader]);
      const cost = new Map([[leader.id, 0]]);
      const q = [leader]; let qi = 0;
      while (qi < q.length && governed.size < maxGov) {
        const cur = q[qi++], cc = cost.get(cur.id);
        for (const [nb, ec] of adj[cur._iF]) {
          if (!remaining.has(nb) || cost.has(nb.id)) continue;
          const nc = cc + ec;
          if (nc <= budget) { cost.set(nb.id, nc); governed.add(nb); q.push(nb); if (governed.size >= maxGov) break; }
        }
      }
      if (governed.size < P.minCluster) { for (const m of governed) { m.fazione = null; m.identita = null; m._isLeader = false; remaining.delete(m); } continue; }
      polities.push({ leader, membri: [...governed] });
      for (const m of governed) remaining.delete(m);
    }
    for (const m of remaining) { m.fazione = null; m.identita = null; m._isLeader = false; }
  }

  // 3) IDENTITÀ con INERZIA: ogni polity adotta l'identità tramandata dalla maggioranza dei suoi
  //    membri; se nessuna prevale (o è già presa da una polity più grande) ne conia una nuova →
  //    è così che una colonia che si stacca diventa "un altro popolo", senza evento dedicato.
  polities.sort((a, b) => b.membri.length - a.membri.length);
  const usate = new Set();
  const factions = [];
  for (const P of polities) {
    const conteggio = new Map();
    for (const m of P.membri) if (m.identita != null) conteggio.set(m.identita, (conteggio.get(m.identita) || 0) + 1);
    let ident = null, best = 0;
    for (const [id, c] of conteggio) if (c > best) { best = c; ident = id; }
    if (ident == null || best < P.membri.length * 0.4 || usate.has(ident)) ident = _identSeed++; // nuova identità
    usate.add(ident);
    if (!pop.identityNames.has(ident)) pop.identityNames.set(ident, syllable(ident * 2654435761));

    const leader = P.leader;
    leader._isLeader = true;
    const cult = { aggressivita: 0, empatia: 0, avidita: 0, ambizione: 0, invidia: 0, onesta: 0 };
    let cx = 0, cy = 0, ricc = 0;
    for (const m of P.membri) {
      cx += m.x; cy += m.y;
      // QUANTO STA BENE QUESTO POPOLO. La ricchezza per persona esisteva già (`_agiatezza`, quanto
      // uno sta sopra la media del mondo) e nessuno l'aveva mai sommata: un popolo sapeva quanti
      // era, non quanto aveva.
      ricc += m._agiatezza ?? 1;
      cult.aggressivita += m.aggressivita; cult.empatia += m.empatia; cult.avidita += m.avidita;
      cult.ambizione += m.ambizione; cult.invidia += m.invidiaT; cult.onesta += m.onesta;
      m.identita = ident; m.fazione = ident; if (m !== leader) m._isLeader = false;
    }
    const nm = P.membri.length; cx /= nm; cy /= nm;
    for (const k in cult) cult[k] /= nm;
    const ricchezza = ricc / nm;

    // ARCHETIPO DEL LEADER (9.12): non è un ruolo scelto, è la lettura dei suoi pesi-motivazione.
    // Lo stesso trono produce storie diversissime secondo chi ci si siede.
    const M = leader.motiv || {};
    // (gli offset normalizzano le scale: senza, un archetipo con più addendi vincerebbe sempre)
    const arche = [
      ["dittatore", M.potere * 1.2 + leader.aggressivita * 0.6 - leader.empatia + 0.40],
      ["stratega", M.potere * 0.6 + leader.intelligenza * 1.1 - leader.superbia * 0.3 + 0.10],
      ["visionario", M.conoscenza * 1.2 + (leader.creativita || 0.5) * 0.8 - 0.20],
      ["burocrate", (leader.pazienza || 0.5) * 1.2 + leader.conformismo * 0.8 - M.fama * 0.5 - 0.05],
      ["demagogo", M.fama * 1.1 + leader.superbia * 0.7 + (1 - leader.onesta) * 0.6 - 0.40],
      ["riformatore", leader.empatia * 1.1 + M.compassione * 0.8 + (1 - leader.conformismo) * 0.5 - 0.40],
    ];
    let archetipo = "capo", av = -1e9;
    for (const [k, v] of arche) if (v > av) { av = v; archetipo = k; }

    // COESIONE (0.D.2): quanto il gruppo TIENE. Non è il controllo: un impero può essere vasto e
    // sfaldato, o piccolo e granitico. Emerge da lealtà, benessere, fede/lingua comuni e compattezza.
    let lealtaSum = 0, gioiaSum = 0, linguaSum = 0, credenti = 0;
    for (const m of P.membri) { lealtaSum += m.emo.lealta; gioiaSum += m.emo.gioia; linguaSum += m.lingua; if (m.credo != null) credenti++; }
    const linguaMedia = linguaSum / nm;
    let varLingua = 0;
    for (const m of P.membri) varLingua += (m.lingua - linguaMedia) ** 2;
    varLingua = Math.sqrt(varLingua / nm);
    let sprawl = 0;
    for (const m of P.membri) sprawl += Math.hypot(m.x - cx, m.y - cy);
    sprawl /= nm;
    const coesione = Math.max(0, Math.min(1,
      0.4 * (lealtaSum / nm) + 0.2 * (gioiaSum / nm) + 0.2 * (credenti / nm)
      - 0.8 * varLingua - Math.min(0.35, sprawl / 160)));
    factions.push({ ricchezza,
      id: ident, nome: pop.identityNames.get(ident), membri: nm, taglia: tagliaNome(nm),
      leader: leader.id, leaderTratti: { intelligenza: leader.intelligenza, forza: leader.forza, ambizione: leader.ambizione, aggressivita: leader.aggressivita },
      lx: leader.x, ly: leader.y, x: cx, y: cy, cultura: cult,
      archetipo, coesione,
      colore: `hsl(${(ident * 47) % 360}, 60%, 55%)`,
      _membri: P.membri, _leader: leader,
    });
  }
  factions.sort((a, b) => b.membri - a.membri);

  // Cronache: nascita e secessione (l'identità è stabile → i log non spammano più a ogni frame).
  if (!pop._identViste) pop._identViste = new Set();
  for (const f of factions) {
    if (pop._identViste.has(f.id)) continue;
    pop._identViste.add(f.id);
    if (f.membri >= 40 && pop.chronicle) pop.chronicle(`Nasce un nuovo popolo: ${f.nome} (${f.membri} anime)`);
  }

  // DNA CULTURALE DALLA STORIA (0.9): i valori di un popolo NON sono la media dei tratti — sono il
  // sedimento di ciò che ha VISSUTO. Una civiltà che ha attraversato cinque carestie diventa
  // prudente; una che ha vinto guerre diventa militarista. Media mobile lentissima: la cultura
  // cambia nell'arco di generazioni, non di stagioni. Nessuna regola "diventa militarista".
  if (!pop.dnaCulturale) pop.dnaCulturale = new Map();
  for (const f of factions) {
    let dna = pop.dnaCulturale.get(f.id);
    if (!dna) { dna = { militarismo: 0.3, spiritualita: 0.3, commercio: 0.3, prudenza: 0.3, innovazione: 0.3, tradizionalismo: 0.5 }; pop.dnaCulturale.set(f.id, dna); }
    let fedeli = 0, inventori = 0, etaSum = 0, feriti = 0;
    for (const m of f._membri) { if (m.credo != null) fedeli++; if (m.inventore) inventori++; etaSum += m.eta; if (m.salute < 0.6) feriti++; }
    const nm2 = f._membri.length;
    const spinta = {
      militarismo: (pop.guerreAttive > 0 ? 0.8 : 0.05) + f.cultura.aggressivita * 0.3,
      spiritualita: fedeli / nm2,
      commercio: Math.min(1, (pop.baratti || 0) / Math.max(50, pop.npcs.length * 4)),
      prudenza: (pop.vegFraction < 0.35 ? 0.8 : 0.1) + (feriti / nm2) * 0.5,
      innovazione: Math.min(1, (inventori / nm2) * 2.2),
      tradizionalismo: Math.min(1, (etaSum / nm2) / 55),
    };
    for (const k in dna) dna[k] = Math.max(0, Math.min(1, dna[k] + (spinta[k] - dna[k]) * 0.02));
    f.dnaCulturale = dna;
  }
  // pulizia delle identità estinte
  if (pop.dnaCulturale.size > 60) { const vive = new Set(factions.map((f) => f.id)); for (const k of pop.dnaCulturale.keys()) if (!vive.has(k)) pop.dnaCulturale.delete(k); }

  // INFLUENZA TERRITORIALE CONTINUA (0.D.1/0.D.4): il territorio è una CONSEGUENZA, non l'entità.
  // Rasterizzo la presenza dei membri su una griglia grossolana: ogni cella "appartiene" alla
  // fazione che vi esercita più influenza. → territori continui, anche DISCONTINUI (isole, enclavi).
  // La CAPITALE emerge come punto di massima convergenza (la cella più popolata di ogni fazione).
  const TS = 8, TW = Math.ceil(world.width / TS), TH = Math.ceil(world.height / TS);
  if (!pop.terrCell || pop.terrW !== TW) { pop.terrCell = new Int32Array(TW * TH); pop.terrW = TW; pop.terrH = TH; pop.terrSize = TS; }
  pop.terrCell.fill(-1);
  const cellCount = new Map(); // cellIdx -> Map(identita -> conteggio)
  for (const f of factions) for (const m of f._membri) {
    const ci = ((m.y / TS) | 0) * TW + ((m.x / TS) | 0);
    let mm = cellCount.get(ci); if (!mm) { mm = new Map(); cellCount.set(ci, mm); }
    mm.set(f.id, (mm.get(f.id) || 0) + 1);
  }
  const capBest = new Map(); // identita -> {count, ci}
  for (const [ci, mm] of cellCount) {
    let owner = -1, best = 0;
    for (const [id, c] of mm) if (c > best) { best = c; owner = id; }
    pop.terrCell[ci] = owner;
    const cb = capBest.get(owner);
    if (!cb || best > cb.count) capBest.set(owner, { count: best, ci });
  }
  const terrConta = new Map();
  for (let i = 0; i < pop.terrCell.length; i++) if (pop.terrCell[i] >= 0) terrConta.set(pop.terrCell[i], (terrConta.get(pop.terrCell[i]) || 0) + 1);
  for (const f of factions) {
    f.territorio = terrConta.get(f.id) || 0;
    const cb = capBest.get(f.id);
    if (cb) { f.capX = (cb.ci % TW) * TS + TS / 2; f.capY = ((cb.ci / TW) | 0) * TS + TS / 2; }
    else { f.capX = f.x; f.capY = f.y; }
  }

  pop.factions = factions;
}
