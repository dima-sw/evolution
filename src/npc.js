// Livello 4 — NPC. NESSUNA AI: solo statistiche + algoritmi.
// Gli esseri hanno bisogni (fame, energia) e tratti (curiosità, coraggio, forza...).
// Il comportamento emerge da una semplice logica a priorità basata sui bisogni.
import { BIOME, isWater } from "./world.js";
import { stepEsperienza, propensione, propensioneContesto, benessere } from "./experience.js";
import { stepTempra } from "./tempra.js";
import { raggruppa, coortiDi, esitoScontro } from "./coorti.js";
import { puo, stato, LIQUIDO, tieneLiquidi } from "./matter.js";
import { bonus, perizia, tara, scorda } from "./skill.js";
import { sapore, sazieta, dissete, valuta, assuefai, smaltisci, aggiornaBrama, brama, raro, riparoDi, qualitaCasa, splendoreDi, ostentabile } from "./desire.js";
import { P, FAME_RECUPERO, FAME_DANNO } from "./params.js";
import { mulberry32, hashSeed } from "./rng.js";
import { foundingGenes, childGenes, skinRGB } from "./genetics.js";
import { makeMaterial } from "./materials.js";
import { nomeGenere, physiology, combine, analyze, classify, classifyCulturale, AFF, mixColor, simulate, inventName, fuse, signature, PROCESSES } from "./chemistry.js";
import { maybeSpawnDisease } from "./animals.js";
import { igniteFire } from "./fire.js";
import { initEmotions } from "./emotions.js";
import { makeBuilding, canBuild } from "./buildings.js";
import { forseArtefatto } from "./society.js";
import { eseguiOrdine } from "./orders.js";

// Capacità di cibo (vegetazione) per bioma. L'acqua non dà cibo (dà da bere).
// Frazione di quota sopra il livello del mare (0 = battigia, 1 = vetta).
function quotaRel(w, i) {
  return Math.max(0, (w.elevation[i] - w.seaLevel) / Math.max(1e-4, 1 - w.seaLevel));
}

// CAPACITÀ VITALE di un luogo: quanta vegetazione può sostenere. Una campana attorno al clima
// mite, moltiplicata dall'acqua disponibile e smorzata dalla quota. Nessuna tabella per bioma:
// se domani il clima cambia, la mappa della fertilità cambia con lui, da sé.
export function capacitaVitale(w, i) {
  if (isWater(w.biome[i])) return 0;
  const calore = Math.exp(-Math.pow((w.temperature[i] - 0.56) / 0.30, 2));
  const acqua = Math.min(1, w.moisture[i] * 1.6);
  const aria = Math.max(0, 1 - Math.max(0, quotaRel(w, i) - 0.42) * 2.4);
  return Math.max(0, Math.min(1, calore * acqua * aria * 1.25));
}

// FATICA di attraversare un luogo: si somma tutto ciò che rende un passo più pesante — la salita,
// il fango, il gelo, la sabbia rovente, l'acquitrino.
export function faticaTerreno(w, i) {
  const t = w.temperature[i], q = quotaRel(w, i);
  let f = 1.05;
  f += Math.max(0, q - 0.32) * 7.5;              // arrampicarsi
  f += Math.max(0, w.moisture[i] - 0.55) * 2.4;  // terreno molle
  f += Math.max(0, 0.3 - t) * 11;                // neve e ghiaccio
  f += Math.max(0, t - 0.74) * 2.2;              // sabbia che brucia e rallenta
  if (w.stagnant && w.stagnant[i]) f += 3.5;     // acquitrino: ogni passo è una lotta
  return f;
}

let _nid = 0;

export class NPC {
  // Il generatore arriva da fuori: la stessa partita, con lo stesso seme, deve dare la stessa gente.
  constructor(x, y, sex, genes, rnd = Math.random) {
    this.id = ++_nid;
    this.x = x; this.y = y;          // posizione continua in coordinate-tile
    this.sex = sex;                  // 'M' | 'F'
    this.eta = 0;                    // in "anni" simulati
    this.genes = genes;              // pigmentazione + tratti (vedi genetics.js)
    const [r, g, b] = skinRGB(genes.melanina, genes.tint);
    this.color = `rgb(${r},${g},${b})`;
    // Bisogni (0 = sazio/riposato, 1 = critico)
    this.fame = 0.2 + rnd() * 0.2;
    this.sete = 0.2 + rnd() * 0.2;
    this.acquaNota = null;           // ricorda dove ha trovato acqua dolce
    this.luccicaNota = null;         // e dove ha trovato qualcosa che luccica: ci si torna
    this.stanchezza = 0.1;
    this.riparo = 0.2 + rnd() * 0.2; // esposizione (0 al riparo .. 1 esposto): spinge a costruire case
    this.salute = 1;
    // BIOLOGIA DEL CORPO (8.3). La DIETA non è "cibo" generico: i gruppi nutritivi sono DERIVATI
    // dalle proprietà dei materiali (proteine dalla carne, carboidrati dalle piante, grassi
    // dall'energia chimica, vitamine dal bioattivo, minerali dai sali conduttivi). Mangiare sempre
    // la stessa cosa → carenza → si sta male: emerge la necessità di una dieta VARIA (e quindi
    // di commercio, agricoltura, caccia insieme). Nessuna "ricetta della salute" scritta.
    this.dieta = { prot: 0.5, carb: 0.5, gras: 0.5, vit: 0.5, min: 0.5 };
    this.carenza = 0;                // gravità della carenza attuale
    this.dolore = 0;                 // sofferenza fisica: alimenta paura/tristezza, frena il lavoro
    this.immunita = 0.1;             // difese generiche (crescono con le malattie superate, calano con l'età)
    this.anticorpi = new Set();      // memoria immunitaria: malattie già superate (per ceppo)
    this.incinta = 0;                // gestazione in corso (tempo residuo)
    this.padreDelFiglio = null;
    // PERSONALITÀ (permanente, genetica): tratti + "vizi" che sono motori di comportamento.
    this.forza = genes.forza;
    this.intelligenza = genes.intelligenza;
    this.coraggio = genes.coraggio;
    this.aggressivita = genes.aggressivita;
    this.curiosita = genes.curiosita;
    this.resFreddo = genes.resFreddo;
    this.resCaldo = genes.resCaldo;
    this.empatia = genes.empatia ?? 0.5;
    this.onesta = genes.onesta ?? 0.5;
    this.lealtaT = genes.lealta ?? 0.5;   // lealtà come tratto (distinta dall'emozione)
    this.ambizione = genes.ambizione ?? 0.5;
    this.invidiaT = genes.invidia ?? 0.5; // predisposizione all'invidia
    this.avidita = genes.avidita ?? 0.5;
    this.iraT = genes.ira ?? 0.5;
    this.pigrizia = genes.pigrizia ?? 0.5;
    this.superbia = genes.superbia ?? 0.5;
    this.gola = genes.gola ?? 0.5;
    this.conformismo = genes.conformismo ?? 0.5;
    this.volonta = genes.volonta ?? 0.5;   // perseguire l'obiettivo anche quando è irrazionale
    this.pazienza = genes.pazienza ?? 0.5;
    this.creativita = genes.creativita ?? 0.5;
    this.socievolezza = genes.socievolezza ?? 0.5;
    this.crudelta = genes.crudelta ?? 0.3;
    this.spiritualita = genes.spiritualita ?? 0.5;
    // BIAS COGNITIVI: intensità personali dei bias (dai tratti). La percezione — non i fatti —
    // guida le scelte: conformisti imitano, diffidenti fanno tribalismo, superbi hanno sicumera.
    this.bias = {
      conferma: 0.3 + this.superbia * 0.4,
      cambiamento: 0.3 + (1 - this.curiosita) * 0.5,
      imitazione: this.conformismo,
      autorita: 0.3 + this.conformismo * 0.4 + (1 - this.intelligenza) * 0.3,
      disponibilita: 0.4,
      sicumera: this.superbia * 0.6 + this.coraggio * 0.3,
      sunkcost: this.avidita * 0.4 + (1 - this.pazienza) * 0.3,
      tribalismo: 0.3 + (1 - this.empatia) * 0.4 + this.conformismo * 0.3,
    };
    // FUNZIONE OBIETTIVO individuale: ogni essere massimizza ciò che DESIDERA (pesi dai geni),
    // secondo la sua percezione — NON la "decisione migliore". Due NPC = due funzioni diverse.
    this.motiv = {
      sopravvivenza: 0.4 + (1 - this.coraggio) * 0.4,
      ricchezza: this.avidita,
      potere: (this.ambizione + this.superbia) / 2,
      conoscenza: (this.curiosita + this.intelligenza) / 2,
      fama: (this.superbia * 2 + this.ambizione) / 3,
      appartenenza: (this.lealtaT + this.conformismo) / 2,
      vendetta: this.iraT,
      compassione: this.empatia,
    };
    this._massa = 0;                 // peso trasportato (Σ qta × densità): rallenta e affatica
    this._carro = false;             // conosce un Veicolo terrestre utile -> costi ridotti a terra
    this._barca = false;             // conosce un'Imbarcazione utile -> può attraversare l'acqua
    // Solo i più curiosi e intelligenti INVENTANO; gli altri usano il sapere comune.
    this.inventore = (genes.curiosita + genes.intelligenza) > P.sogliaInventore;
    this.fertilita = 0;              // matura con l'età
    // Sentimenti e vita sociale
    this.emo = initEmotions();
    this.malcontento = 0;
    this.ribelle = false;
    this.memoria = new Map();        // altroId -> relazione (-1 nemico .. +1 alleato)
    this.reputazione = {};           // etichette accumulate: violento, generoso, ladro, genio...
    this.sapere = new Set();         // firme delle ricette che QUESTO npc conosce (anti-hivemind)
    this.strumento = 0;              // qualità del miglior utensile noto (apre l'estrazione dei metalli)
    this.mestiere = null;            // ruolo emergente (guaritore, cacciatore, ...)
    this.figli = 0;                  // prole avuta (dimensione di confronto per l'invidia)
    this.generazione = 0;            // quante generazioni ti separano dai primi venuti al mondo
    this._prole = null;
    this.casaLivello = 0;            // grandezza della propria abitazione (0 = senza casa)
    this.casa = null;                // [x,y] della propria casa, se costruita
    this.migrante = false;           // sta emigrando verso terre nuove (colonizzazione)
    this.migMeta = null;             // meta della migrazione
    this._pressioneSpazio = 0;       // accumulo di affollamento+scarsità -> voglia di emigrare
    this.credo = null;               // religione a cui aderisce (id) o null
    this.identita = null;            // identità del gruppo sociale (persistente, con inerzia)
    this.fazione = null;             // = identita del cluster attuale (o null se non affiliato)
    this.memi = new Map();           // meme -> intensità personale assimilata
    // LINGUA (4.6): un valore continuo. I figli la ereditano con deriva; parlarsi la AVVICINA;
    // l'isolamento la fa DIVERGERE. Se due lingue sono troppo lontane, non ci si capisce più
    // (l'insegnamento fallisce): dopo generazioni separate, due popoli non comunicano.
    this.lingua = rnd();
    this.azioni = { cura: 0, caccia: 0, costruzione: 0, invenzione: 0, raccolta: 0, combattimento: 0, commercio: 0, insegnamento: 0, esplorazione: 0, opera: 0, predicazione: 0, coltura: 0 }; // per il mestiere
    // Stato interno
    this.tx = x; this.ty = y;        // tile obiettivo
    this.cooldownFiglio = 0;
    this.inventory = new Map();      // matId -> quantità
    this.oggettiCreati = 0;
    this.vivo = true;
    // ---------------------------------------------------------------------------------------
    // TUTTI NASCONO CON LA STESSA FORMA.
    //
    // Non e' una regola del mondo, e' una regola del motore — ma pesa piu' di quasi tutte le
    // altre. In JavaScript un oggetto non e' un sacco di proprieta': ha una MAPPA nascosta che
    // dice dove sta ogni campo, e due oggetti con mappe diverse non si leggono allo stesso modo.
    // Un punto del codice che vede piu' di quattro mappe smette di ottimizzare e si mette a
    // cercare il campo ogni volta.
    //
    // I campi qui sotto nascevano per strada: `_padrone` quando qualcuno veniva sottomesso,
    // `_deterrenza` quando assisteva a una punizione, `casaMat` quando costruiva, `assuefaz` al
    // primo pasto ripetuto. Ogni aggiunta creava una mappa nuova, e chi non l'aveva ancora
    // ricevuta ne aveva una diversa. Misurato su una partita vera:
    //
    //     1 345 persone  ->  966 MAPPE DIVERSE
    //     leggere una proprieta' in piu': 164 ns a persona invece di 4
    //
    // Dichiararli qui, tutti, sempre nello stesso ordine, li rende una mappa sola. I VALORI non
    // cambiano — `undefined` e' esattamente cio' che il codice trovava quando il campo non c'era,
    // e nel motore non c'e' un solo `Object.keys`, `in` o `JSON.stringify` su una persona che
    // possa accorgersi della differenza. Il mondo resta identico; solo lo si legge in fretta.
    // (`banco/forme.mjs` conta le mappe e ricava questo elenco da solo: se qualcuno aggiunge un
    //  campo per strada, quella sonda lo dice.)
    this._traccia = undefined; this._ben = undefined; this._tImp = undefined;
    this._disposizione = undefined; this._coibenza = undefined; this._att = undefined;
    this._utensile = undefined; this._vicini = undefined; this._sofferenza = undefined;
    this._iF = undefined; this._isLeader = undefined; this._agiatezza = undefined;
    this.classe = undefined; this._esitoMedio = undefined; this.esperienze = undefined;
    this._saBollire = undefined; this.strumentoNoto = undefined; this._sfarzo = undefined;
    this._scosso = undefined; this.casaMat = undefined; this._usura = undefined;
    this._deterrenza = undefined; this.assuefaz = undefined; this._ultimoCibo = undefined;
    this.infetto = undefined; this.immune = undefined; this._esplora = undefined;
    this._casaBase = undefined; this._bellicoso = undefined; this._commemorato = undefined;
    // Questi due non erano nell'elenco solo perche' in quella partita nessuno era stato
    // sottomesso: sono lazy come gli altri, e la prima schiavitu' avrebbe spaccato la forma.
    this._padrone = undefined; this.ribelle = undefined;
  }
  addMat(id, n = 1) {
    this.inventory.set(id, (this.inventory.get(id) || 0) + n);
    // Averla avuta per le mani basta perché entri nella traccia: se poco dopo starai bene o male,
    // sarà anche colpa sua. È così che si nasce superstiziosi.
    if (this._traccia) this._traccia.set('m' + id, Math.min(1, (this._traccia.get('m' + id) || 0) + 0.55));
  }
  hasMat(id, n) { return (this.inventory.get(id) || 0) >= n; }
}

export class Population {
  constructor(world, registry, knowledge) {
    scorda();                       // il metro della perizia è di questo mondo, non del precedente
    this.world = world;
    this.registry = registry;
    this.knowledge = knowledge;
    this.npcs = [];
    this.food = new Float32Array(world.width * world.height);
    this.foodCap = new Float32Array(world.width * world.height);
    this.plankton = new Float32Array(world.width * world.height);   // cibo acquatico per i pesci
    this.planktonCap = new Float32Array(world.width * world.height);
    this.pollution = new Float32Array(world.width * world.height);   // "cicatrici": abbassa la fertilità
    // FERTILITÀ del suolo (0.15..1): SCARSITÀ EMERGENTE. Un tile sfruttato di continuo (tenuto
    // spoglio da raccolta/pascolo/coltura) si impoverisce; a riposo (vegetazione piena) recupera.
    // La vegetazione ricresce verso foodCap × fertilità: la terra ha una CAPACITÀ MASSIMA che il
    // sovrasfruttamento riduce → pressione a spostarsi ed espandersi. Nessun tetto scritto a mano.
    this.fertility = new Float32Array(world.width * world.height).fill(1);
    // Come era questo posto prima che ci mettessimo piede: serve da tetto alla ripresa e da
    // memoria di che cosa tornerebbe a essere, se lo si lasciasse in pace.
    this.moisture0 = Float32Array.from(world.moisture);
    this.biome0 = Uint8Array.from(world.biome);
    // SENTIERI EMERGENTI: il passaggio ripetuto consuma il terreno (traffic). Sopra soglia il
    // tile diventa un sentiero (fatica ridotta, passo più rapido); se abbandonato, decade.
    this.traffic = new Float32Array(world.width * world.height);
    this.strade = new Set(); // tile che al momento sono sentieri battuti
    // FOG OF WAR (4.8): l'umanità conosce solo ciò che qualcuno ha VISTO. La mappa si costruisce
    // lentamente coi passi di chi esplora (vista "Scoperto" nel renderer).
    this.scoperto = new Uint8Array(world.width * world.height);
    // Quanto vale la terra sotto i piedi. Non è un numero che ho scritto: è la somma di quel che
    // c'è nel sottosuolo, pesata da quanto quella roba si può ostentare. Si rifà ogni tanto perché
    // cambia — i giacimenti si consumano, e una terra ricca può diventare una terra spoglia.
    this.ricchezza = new Float32Array(world.width * world.height);
    this._ricchezzaT = 999;
    this.scopertoCount = 0;
    for (let i = 0; i < this.food.length; i++) {
      let c = capacitaVitale(world, i);
      // Le RIVE dei fiumi sono fertili: più vegetazione (le civiltà nascono sui fiumi).
      if (world.riverNear && world.riverNear[i] && c > 0) c = Math.min(1, c * P.rivaFertile + 0.12); // rive più fertili
      // SALE (svantaggio del mare): la terra a ridosso del mare salato è meno fertile (spruzzi
      // salini rovinano i raccolti) — a meno che non sia bagnata da acqua DOLCE (fiume). Così la
      // costa marina non è più la scelta migliore: le grandi civiltà nascono sui fiumi.
      if (c > 0 && !world.river[i] && this._nearSaltSea(world, i)) c *= P.malusSalino;
      this.foodCap[i] = c; this.food[i] = c;
      // Plancton: ricco sotto costa E in ACQUA DOLCE (fiumi, laghi, paludi/delta = ecosistemi
      // ricchissimi). Così i pesci vivono anche nell'entroterra, non solo sulla costa marina.
      let w = 0;
      if (isWater(world.biome[i])) {
        // Quanto è profondo qui, da 0 (bagnasciuga) a 1 (fondale). La luce non arriva in fondo, e
        // dove non arriva la luce non cresce niente: da qui, senza dirlo, la piattaforma costiera.
        const fondo = Math.max(0, (world.seaLevel - world.elevation[i]) / Math.max(1e-3, world.seaLevel));
        w = 0.48 * Math.exp(-fondo * 3.4);
      }
      // L'acqua ferma e quella corrente sono dolci, e l'acqua dolce è più fertile del mare perché
      // riceve dalla terra ciò che al mare aperto manca.
      if (world.river[i] || (world.stagnant && world.stagnant[i])) w = Math.max(w, 0.8);
      this.planktonCap[i] = w; this.plankton[i] = w;
    }
    // Somme di capacità per calcolare la frazione di risorsa rimasta (freno alla natalità).
    this.vegCapSum = 0; this.planktonCapSum = 0;
    for (let i = 0; i < this.foodCap.length; i++) { this.vegCapSum += this.foodCap[i]; this.planktonCapSum += this.planktonCap[i]; }
    // QUANTA GENTE PUÒ NUTRIRE QUESTA TERRA. Non è una stima: è la somma appena fatta qui sopra —
    // esisteva già e nessuno le aveva dato questo nome. Misurata, la resa per tile è costante
    // (0,23) e quindi la capienza è ESATTAMENTE proporzionale all'area: 192×192 nutre 8 411,
    // 320×320 ne nutre 23 845, 480×480 ne nutre 54 201. È questo il tetto vero della popolazione,
    // ed è per questo che la larghezza del mondo è l'unica manopola che conti davvero.
    this.capienzaTerra = this.vegCapSum;
    this.vegFraction = 1; this.planktonFraction = 1;
    this.anno = 0;
    this.nascite = 0; this.morti = 0; this.oggettiTot = 0;
    // Ecosistema
    this.creature = [];   // un solo popolo di viventi: la nicchia la dicono i geni
    this.predKills = 0; this.huntKills = 0; this.mortiMalattia = 0; this.fishKills = 0;
    this.disease = null;
    this.carcasse = new Map(); // tileIdx -> carne disponibile: gli animali morti la lasciano (spazzinaggio)
    this.spazzinate = 0;
    // AGRICOLTURA (3.2/0.1): campi coltivati. OCCUPANO un tile e producono molto cibo, ma
    // ESAURISCONO la fertilità più in fretta (monocoltura) → servono nuovi campi → pressione a
    // espandersi. tileIdx -> { crescita, owner, cropId }.
    this.campi = new Map(); this.raccolti = 0;
    this.libri = []; this.libriScritti = 0; this.letture = 0;
    this.ere = []; this.eredita_ = 0; this.generazioneMedia = 0;
    // Società ed edifici
    this.ribelli = 0; this.malcontentoMedio = 0; this.aiuti = 0; this.aggressioni = 0;
    this.insegnamenti = 0; this.furti = 0; this.copiature = 0; this.omicidi = 0;
    this.baratti = 0; this.accettazioni = new Map(); this.moneta = null; // economia emergente
    this.buildings = [];
    // Tempo, stagioni, storia
    this.stagione = "Primavera"; this.cronaca = []; this.milestonePop = 0; this.categorieViste = new Set();
    this.factions = []; this.factionNames = new Map(); this.identityNames = new Map(); this._identViste = null;
    // Cultura emergente: memi (convinzioni), religioni, e conflitti fra fazioni.
    this.memi = []; this.religioni = []; this.razzieTot = 0; this.guerreAttive = 0; this.mortiGuerra = 0;
    this.emigrazioni = 0; this.emigrati = 0; this.caseTot = 0;
    // Norme sociali emergenti (ospitalità per fazione) e rancori accumulati fra popoli (vendetta).
    this.ospitati = 0; this.scacciati = 0; this._norme = new Map(); this._rancori = new Map();
    // Fuoco: tileIdx -> intensità (0..1)
    this.fire = new Map(); this.roghiTot = 0; this.mortiFuoco = 0;
    this.rng = mulberry32(hashSeed(world.seed + "::pop"));
  }

  landTiles() {
    const { width, height, biome } = this.world;
    const list = [];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (!isWater(biome[i]) && capacitaVitale(this.world, i) > 0.2) list.push([x, y]);
      }
    return list;
  }

  spawn(n) {
    const land = this.landTiles();
    if (!land.length) return;
    for (let k = 0; k < n; k++) {
      const [x, y] = land[Math.floor(this.rng() * land.length)];
      const sex = this.rng() < 0.5 ? "M" : "F";
      const genes = foundingGenes(this.world, x, y, this.rng);
      const npc = new NPC(x + this.rng(), y + this.rng(), sex, genes, this.rng);
      npc.eta = 15 + this.rng() * 15; // adulti all'avvio
      this.npcs.push(npc);
    }
  }

  reset(n) {
    this.npcs = [];
    this.creature = [];   // un solo popolo di viventi: la nicchia la dicono i geni
    this.predKills = 0; this.huntKills = 0; this.mortiMalattia = 0; this.fishKills = 0; this.disease = null;
    this.carcasse = new Map(); this.spazzinate = 0;
    this.campi = new Map(); this.raccolti = 0; this.acqueMalsane = 0;
    this.libri = []; this.libriScritti = 0; this.letture = 0;
    this.ribelli = 0; this.malcontentoMedio = 0; this.aiuti = 0; this.aggressioni = 0; this.insegnamenti = 0;
    this.furti = 0; this.copiature = 0; this.omicidi = 0;
    this.baratti = 0; this.accettazioni = new Map(); this.moneta = null;
    this.buildings = [];
    this.stagione = "Primavera"; this.cronaca = []; this.milestonePop = 0; this.categorieViste = new Set();
    this.factions = []; this.factionNames = new Map(); this.identityNames = new Map(); this._identViste = null;
    this.memi = []; this.religioni = []; this.razzieTot = 0; this.guerreAttive = 0; this.mortiGuerra = 0;
    this.emigrazioni = 0; this.emigrati = 0; this.caseTot = 0; this._eventoSaliente = null;
    this._guerreViste = null; this._relCount = 0;
    this.fire = new Map(); this.roghiTot = 0; this.mortiFuoco = 0;
    this.food.set(this.foodCap);
    this.plankton.set(this.planktonCap);
    this.pollution.fill(0);
    this.fertility.fill(1);
    this.traffic.fill(0); this.strade = new Set();
    this.scoperto.fill(0); this.scopertoCount = 0;
    this.ospitati = 0; this.scacciati = 0; this._norme = new Map(); this._rancori = new Map();
    this.incomprensioni = 0; this.curePrestate = 0; this.esperimentiGuidati = 0; this.propagande = 0;
    this.ora = null; this.pioggiaFino = -1; // il clima si reinizializza al primo passo (climate.js)
    this.norme = null;                      // idem per la società (society.js)
    this.lessici = null;
    this.entita = null; this.concetti = 0; this.concettiVivi = 0; this.entitaEstinte = 0;
    this.aiStati = null; this.aiLog = []; this.aiChiamate = 0; this.aiErrori = 0;
    this.aiOrdiniTot = 0; this.congiure = 0; this.sfide = 0; this.menzogneAI = 0;
    this.anno = 0; this.nascite = 0; this.morti = 0; this.oggettiTot = 0;
    _nid = 0;
    this.spawn(n);
  }

  // Come questo popolo chiama chi passa la vita a fare una certa cosa. Il mestiere esiste perché
  // qualcuno lo fa; la parola nasce dopo, e nasce diversa in ogni popolo.
  nomeMestiere(npc, azione) {
    const l = this.culturaDi(npc);
    if (!l.mestieri) l.mestieri = new Map();
    let nome = l.mestieri.get(azione);
    if (!nome) {
      nome = nomeGenere("mestiere:" + azione, l.seme);
      l.mestieri.set(azione, nome);
      this.mestieriConiati = (this.mestieriConiati || 0) + 1;
    }
    return nome;
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // QUELLO CHE HANNO RIPORTATO GLI ESPLORATORI.
  //
  // Un capo non vede la mappa: sente i racconti di chi è tornato. Quindi guarda solo le terre che
  // qualcuno dei suoi ha davvero calpestato (`pop.scoperto`), e di quelle sa le due cose che si
  // notano camminandoci: se ci si mangia, e se il terreno dà qualcosa che luccica.
  //
  // È il pezzo che mancava perché una mente al potere potesse ragionare su dove mandare la gente —
  // e da lì decidere per conto suo se colonizzare, se prendersi una terra occupata, o se restare
  // dov'è. Nessuna di queste tre cose è scritta da nessuna parte: gli si dà solo la notizia.
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  terreEsplorate(f, quante = 4) {
    const w = this.world, W = w.width, H = w.height;
    const passo = 12;                       // si racconta per contrade, non tile per tile
    const cx = f.capX ?? f.x, cy = f.capY ?? f.y;
    const zone = [];
    for (let by = 0; by < H; by += passo) {
      for (let bx = 0; bx < W; bx += passo) {
        let noti = 0, cibo = 0, ricco = 0, k = 0;
        for (let y = by; y < Math.min(H, by + passo); y += 3) {
          for (let x = bx; x < Math.min(W, bx + passo); x += 3) {
            const i = y * W + x;
            k++;
            if (!this.scoperto[i]) continue;
            noti++;
            cibo += this.foodCap[i];
            ricco += this.ricchezza[i];
          }
        }
        if (!k || noti < k * 0.5) continue;                   // se non l'hanno vista bene, non se ne parla
        const mx = bx + passo / 2, my = by + passo / 2;
        zone.push({ x: Math.round(mx), y: Math.round(my),
          cibo: cibo / noti, ricchezza: ricco / noti,
          dist: Math.hypot(mx - cx, my - cy) });
      }
    }
    if (!zone.length) return [];
    // Chi ci abita già: una terra buona ma occupata è un'altra faccenda, e deve saperlo.
    const abitanti = new Map();
    for (const o of this.npcs) {
      if (!o.vivo) continue;
      const k = ((o.x / passo) | 0) + "," + ((o.y / passo) | 0);
      const a = abitanti.get(k) || { n: 0, popoli: new Set() };
      a.n++; if (o.identita != null) a.popoli.add(o.identita);
      abitanti.set(k, a);
    }
    zone.sort((a, b) => (b.cibo + b.ricchezza * 1.6 - b.dist / 400) - (a.cibo + a.ricchezza * 1.6 - a.dist / 400));
    return zone.slice(0, quante).map((z) => {
      const a = abitanti.get(((z.x / passo) | 0) + "," + ((z.y / passo) | 0));
      const altrui = a && [...a.popoli].some((id) => id !== f.id);
      return {
        dove: { x: z.x, y: z.y }, giornate_di_cammino: Math.round(z.dist / 12),
        ci_si_mangia: +z.cibo.toFixed(2),
        il_terreno_da: +z.ricchezza.toFixed(2),
        ci_vive_gente: a ? a.n : 0,
        e_di_altri: !!altrui,
      };
    });
  }

  // Il ritratto di una cosa, per come la vedrebbe chiunque: la parte del desiderio che non dipende
  // da chi la guarda.
  ritrattoDi(m) {
    if (!this._ritratti) this._ritratti = new Map();
    let r = this._ritratti.get(m.id);
    if (r === undefined) {
      const ph = physiology(m.props);
      r = {
        nutre: ph.nutrimento, cura: ph.beneficio, nuoce: ph.danno,
        gusto: sapore(m.props), dissete: dissete(m.props),
        tiene: sazieta(m.props), ost: ostentabile(m),
        fatica: (m.props.peso || 0) * 0.22 + (m.durezzaEstrazione || 0) * 0.35,
        chiave: "m" + m.id,
      };
      this._ritratti.set(m.id, r);
    }
    // rarità e moda cambiano nel tempo: si rinfrescano quando cambia il giro della brama
    if (r._giro !== this._giroBrama) {
      r._giro = this._giroBrama;
      r.raro = raro(this, m.id);
      r.bramato = brama(this, m.id);
    }
    return r;
  }

  // Rifà la mappa della ricchezza minerale. Cara, quindi di rado: ogni vent'anni scarsi.
  aggiornaRicchezza(dt) {
    this._ricchezzaT += dt;
    if (this._ricchezzaT < 20) return;
    this._ricchezzaT = 0;
    const N = this.world.width * this.world.height;
    this.ricchezza.fill(0);
    for (const m of this.registry.materials) {
      if (m.rinnovabile || m.daAnimale || m.sintetico) continue;
      const v = ostentabile(m) + (m.props.durezza || 0) * 0.25;  // luccica, oppure serve a lavorare
      if (v < 0.12) continue;
      const d = this.registry.dist.get(m.id);
      if (!d) continue;
      for (let i = 0; i < N; i++) if (d[i] > 0.05) this.ricchezza[i] += d[i] * v;
    }
  }

  // DOVE ANDARE, quando si parte. Prima la meta era una direzione a caso: si colonizzava alla
  // cieca, e nessuno poteva mai puntare a una terra buona perché nessuno guardava.
  //
  // Ora si sceglie fra i posti DOVE IL PROPRIO POPOLO È GIÀ STATO — non si emigra verso l'ignoto,
  // si emigra verso ciò di cui si è sentito parlare. E fra quelli si prende quello che si desidera
  // di più, con la stessa somma di sempre: di che campare, da bere, e — per chi ci tiene — di che
  // farsi vedere. Un affamato punterà alla valle verde, un ambizioso alla montagna che luccica.
  //
  // Da qui, senza che nessuno l'abbia scritto: si esplora, si scopre una terra ricca, ci si va, e
  // se ci abita già qualcuno ci si trova vicini a chi non ci vuole.
  scegliMeta(npc, raggio) {
    let meglio = null, punteggio = -1e9;
    const vuoleLuccicare = npc.superbia * 0.55 + npc.avidita * 0.5 + npc.emo.invidia * 0.45;
    for (let k = 0; k < 14; k++) {
      const ang = this.rng() * Math.PI * 2;
      const r = raggio * (0.55 + this.rng() * 0.9);
      const x = npc.x + Math.cos(ang) * r, y = npc.y + Math.sin(ang) * r;
      if (!this.walkable(x, y)) continue;
      const i = this.tileIdx(x, y);
      if (i < 0) continue;
      // se non ci è mai stato nessuno dei suoi, non sa nemmeno che esiste
      const noto = this.scoperto[i] ? 1 : 0.12;
      let v = this.foodCap[i] * (1.1 + npc.fame * 1.4)
        + (this.world.riverNear && this.world.riverNear[i] ? 0.55 : 0)
        + this.ricchezza[i] * vuoleLuccicare * 1.6
        - this.pollution[i] * 0.6;
      v *= noto;
      v *= 0.75 + this.rng() * 0.5;                 // e un po' di caso: nessuno sa davvero
      if (v > punteggio) { punteggio = v; meglio = [x, y]; }
    }
    return meglio;
  }

  // Il lessico di un popolo: dove conserva i generi di cose che ha imparato a riconoscere.
  // Chi non appartiene a nessun gruppo usa (e alimenta) un lessico comune dei senza-popolo.
  culturaDi(npc) {
    if (!this.lessici) this.lessici = new Map();
    const k = npc.identita != null ? npc.identita : 0;
    let l = this.lessici.get(k);
    if (!l) { l = { seme: (k * 7919) % 1000 + 1, generi: new Map() }; this.lessici.set(k, l); }
    return l;
  }

  // Movimento accessibile ai moduli esterni (ordini del capo): paga gli STESSI costi di sempre.
  moveTowardPub(npc, x, y, dist) { this.moveToward(npc, x, y, dist); }

  // Un tile di terra confina col mare SALATO? (usato per il malus salino sulla fertilità costiera)
  _nearSaltSea(world, i) {
    const W = world.width, x = i % W, y = (i / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= world.height) continue;
      if (isWater(world.biome[ny * W + nx])) return true;
    }
    return false;
  }
  tileIdx(x, y) { return ((y | 0) * this.world.width + (x | 0)); }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.world.width && y < this.world.height; }
  isWaterAt(x, y) { return this.inBounds(x, y) && isWater(this.world.biome[this.tileIdx(x, y)]); }
  walkable(x, y) { return this.inBounds(x, y) && !isWater(this.world.biome[this.tileIdx(x, y)]); }
  // Acqua DOLCE navigabile dai pesci (fiumi, laghi, paludi): i pesci vivono anche nell'entroterra.
  // Si beve dove l'acqua è dolce — cioè dove scorre o dove ristagna sulla terra. Il mare è tutto
  // salato, sempre, anche alla foce dei fiumi.
  freshWaterAt(x, y) {
    if (!this.inBounds(x, y)) return false;
    const i = this.tileIdx(x, y);
    return !!this.world.river[i] || !!(this.world.stagnant && this.world.stagnant[i]);
  }
  swimmable(x, y) { return this.isWaterAt(x, y) || this.freshWaterAt(x, y); }

  waterTiles() {
    const { width, height, biome } = this.world;
    const list = [];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) if (isWater(biome[y * width + x])) list.push([x, y]);
    return list;
  }
  // Tile d'acqua DOLCE (fiumi/laghi/paludi): dove vivono i pesci d'acqua dolce.
  freshWaterTiles() {
    const { width, height, river, stagnant } = this.world;
    const list = [];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) { const i = y * width + x; if (river[i] || (stagnant && stagnant[i])) list.push([x, y]); }
    return list;
  }

  // Cerca in una finestra locale il tile con più cibo (griglia scelta). Ritorna [x,y] o null.
  bestCell(grid, cx, cy, R, minV = 0.15) {
    let best = null, bestV = minV;
    const x0 = Math.max(0, (cx | 0) - R), x1 = Math.min(this.world.width - 1, (cx | 0) + R);
    const y0 = Math.max(0, (cy | 0) - R), y1 = Math.min(this.world.height - 1, (cy | 0) + R);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const v = grid[y * this.world.width + x];
        if (v > bestV) { bestV = v; best = [x, y]; }
      }
    return best;
  }
  bestFood(cx, cy, R) { return this.bestCell(this.food, cx, cy, R); }
  bestPlankton(cx, cy, R) { return this.bestCell(this.plankton, cx, cy, R, 0.1); }

  // Tile di FIUME (acqua dolce) più vicino in una finestra locale. null se non c'è.
  bestRiver(cx, cy, R) {
    const w = this.world; let best = null, bd = Infinity;
    const x0 = Math.max(0, (cx | 0) - R), x1 = Math.min(w.width - 1, (cx | 0) + R);
    const y0 = Math.max(0, (cy | 0) - R), y1 = Math.min(w.height - 1, (cy | 0) + R);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        if (!w.river[y * w.width + x]) continue;
        const d2 = (x - cx) ** 2 + (y - cy) ** 2;
        if (d2 < bd) { bd = d2; best = [x, y]; }
      }
    return best;
  }

  // OGNI PASSO HA UN COSTO (B.1-B.4): distanza × terreno × pendenza × peso trasportato, pagato in
  // fame/sete/stanchezza. Attraversare il mondo senza provviste UCCIDE. Sentieri battuti e mezzi
  // (carro/imbarcazione) riducono il costo: è per questo che convengono, non per una regola.
  moveToward(npc, tx, ty, dist) {
    const dx = tx - npc.x, dy = ty - npc.y;
    const d = Math.hypot(dx, dy) || 1;
    let nx = npc.x + (dx / d) * dist, ny = npc.y + (dy / d) * dist;
    if (!this.inBounds(nx, ny)) return;
    if (this.isWaterAt(nx, ny) && !npc._barca) { // senza imbarcazione evita l'acqua: piccolo scarto
      if (this.walkable(nx, npc.y)) ny = npc.y;
      else if (this.walkable(npc.x, ny)) nx = npc.x;
      else return;
    }
    const i0 = this.tileIdx(npc.x, npc.y), i1 = this.tileIdx(nx, ny);
    const moved = Math.hypot(nx - npc.x, ny - npc.y);
    npc.x = nx; npc.y = ny;
    // --- costo del passo ---
    const w = this.world;
    let terr;
    if (this.isWaterAt(nx, ny)) terr = 0.5; // in barca si scivola
    else {
      terr = faticaTerreno(w, i1);
      if (this.traffic[i1] > 0.5) terr *= P.sentieroSconto;   // sentiero battuto: si cammina meglio
      if (npc._carro) terr *= P.bonusCarro;               // il mezzo esiste perché RIDUCE il costo
      // il passaggio ripetuto consuma il terreno → nasce il sentiero (B.9)
      this.traffic[i1] = Math.min(1.2, this.traffic[i1] + moved * P.sentieroCrescita);
    }
    const salita = i0 === i1 ? 0 : Math.max(0, w.elevation[i1] - w.elevation[i0]) * P.costoDislivello; // dislivello
    const peso = 1 + (npc._massa || 0) * 0.12;
    const costo = moved * terr * (1 + salita) * peso * P.costoMovimento;
    npc.fame = Math.min(1.4, npc.fame + costo * 0.5);
    npc.sete = Math.min(1.5, npc.sete + costo * 0.6);
    npc.stanchezza = Math.min(1.3, npc.stanchezza + costo);
  }

  step(dt) {
    this._battito = (this._battito || 0) + 1;   // serve a sapere quando l'indice di chi-sta-dove e' vecchio
    stepEsperienza(this, dt);
    stepTempra(this, dt);   // e la vita, piano, cambia chi la vive
    if (this._aridChk) this.seguiAridita(dt);
    aggiornaBrama(this, dt);
    this._giroBrama = this.brama ? this.brama.size + ((this.anno / 3) | 0) : 0;
    // Le coorti: la gente vista per gruppi invece che uno per uno. Si rifanno di rado — una
    // contrada non cambia faccia in una stagione.
    this._coortiT = (this._coortiT || 0) + dt;
    if (this._coortiT > 3 || !this.coorti) { this._coortiT = 0; this.coorti = raggruppa(this); }
    this.aggiornaRicchezza(dt);
    // L'usura tocca a un quinto della gente per volta, col tempo di tutti e cinque: la media e'
    // identica e costa un quinto (stessa "a turni" usata per la mappa e per la fauna).
    this._turnoUsura = ((this._turnoUsura || 0) + 1) % 5;
    for (let i = this._turnoUsura; i < this.npcs.length; i += 5) {
      const n = this.npcs[i];
      if (n && n.vivo) this.logora(n, dt * 5);
    }
    const w = this.world;
    this.anno += dt;

    // STAGIONI: un anno = 4 stagioni. D'inverno le piante crescono poco -> carestie,
    // scorte, migrazioni. Modula la rigenerazione della vegetazione.
    const seasonIdx = Math.floor(this.anno / 2) % 4;
    this.stagione = ["Primavera", "Estate", "Autunno", "Inverno"][seasonIdx];
    let seasonMult = [P.stagPrimavera, P.stagEstate, P.stagAutunno, P.stagInverno][seasonIdx];

    // PIOGGIA: ora è la conseguenza del CICLO DELL'ACQUA (climate.js): l'aria evapora dal mare,
    // si satura e precipita. Qui se ne raccolgono solo gli effetti sulla vegetazione.
    if (this.pioggia) seasonMult *= 1.6;
    // SICCITÀ (meteo): se non piove da troppo, la vegetazione stenta anche in stagione buona.
    if (this.siccita > 0.4) seasonMult *= Math.max(0.25, 1 - (this.siccita - 0.4) * 1.4);
    // CENERE vulcanica / ERA GLACIALE: meno luce e meno calore → il mondo intero cresce meno.
    if (this.cenere > 0 || this.eraGlaciale > 0) seasonMult *= Math.max(0.2, 1 - this.cenere * 0.5 - this.eraGlaciale * 0.4);

    // ALLUVIONE: durante le piogge lunghe i fiumi straripano e travolgono chi vive sulle rive.
    if (this.pioggia && this.rng() < dt * P.probAlluvione) {
      // Straripa un fiume, in un punto, e l'acqua arriva fin dove arriva.
      const ax = this.rng() * this.world.width, ay = this.rng() * this.world.height;
      const raggio = 22 + this.rng() * 36, r2 = raggio * raggio;
      let colpiti = 0, annegati = 0;
      for (const npc of this.npcs) {
        if (!npc.vivo) continue;
        if (((npc.x - ax) ** 2 + (npc.y - ay) ** 2) > r2) continue;   // troppo lontano: l'acqua non ci arriva
        if (this.world.riverNear[this.tileIdx(npc.x, npc.y)]) {
          npc.salute -= 0.22; npc.emo.paura = Math.min(1, npc.emo.paura + 0.5); colpiti++;
          if (npc.salute <= 0) { npc.vivo = false; this.morti++; annegati++; }
        }
      }
      if (colpiti > 3) {
        this.chronicle(`Un fiume straripa: ${colpiti} travolti${annegati ? `, ${annegati} annegati` : ""}`, 8);
        this._eventoSaliente = { evento: "l'alluvione", anno: this.anno };
      }
    }

    // TEMPESTE MARINE (svantaggio della costa aperta): d'estate/pioggia il mare può infuriare e
    // colpire chi vive a ridosso del mare SALATO (non i fiumi). Bilancia la comodità della costa.
    if ((this.pioggia || this.stagione === "Estate") && this.rng() < dt * P.probTempesta) {
      // Dove si scatena e quanto lontano arriva. Un tratto di costa, non il pianeta.
      const cx = this.rng() * this.world.width, cy = this.rng() * this.world.height;
      const portata = 26 + this.rng() * 42, p2 = portata * portata;
      let colpiti = 0, morti = 0;
      for (const npc of this.npcs) {
        if (!npc.vivo) continue;
        if ((npc.x - cx) ** 2 + (npc.y - cy) ** 2 > p2) continue;   // troppo lontano: non lo tocca
        const i = this.tileIdx(npc.x, npc.y);
        if (!this.world.river[i] && this._nearSaltSea(this.world, i)) {
          npc.salute -= 0.25; npc.emo.paura = Math.min(1, npc.emo.paura + 0.5); colpiti++;
          if (npc.salute <= 0) { npc.vivo = false; this.morti++; morti++; }
        }
      }
      if (colpiti > 3) {
        this.chronicle(`Tempesta di mare su un tratto di costa: ${colpiti} travolti${morti ? `, ${morti} annegati` : ""}`, 8);
        this._eventoSaliente = { evento: "la tempesta", anno: this.anno };
      }
    }

    // Rigenerazione di vegetazione e plancton (modulata dalla stagione),
    // e calcolo della frazione globale di risorsa rimasta.
    const FETTE = 4;
    this._fetta = ((this._fetta || 0) + 1) % FETTE;
    const dtF = dt * FETTE;                      // chi tocca il turno riceve il tempo di tutti
    const regen = P.vegRegen * dtF * seasonMult, regenP = P.planktonRegen * dtF * seasonMult;
    const pollDecay = P.inquinDecay * dtF;
    if (!this._acc) this._acc = { veg: 0, plank: 0, poll: 0, fert: 0, fertN: 0 };
    const acc = this._acc;
    let vegSum = 0, planktonSum = 0, pollSum = 0, fertSum = 0, fertN = 0;
    for (let i = this._fetta; i < this.food.length; i += FETTE) {
      // L'inquinamento ("cicatrice") abbassa la rigenerazione del tile: le piante ricrescono meno.
      const p = this.pollution[i];
      if (p > 0) { this.pollution[i] = Math.max(0, p - pollDecay); pollSum += p; }
      const fert = 1 - Math.min(0.95, p);
      const c = this.foodCap[i];
      if (c > 0) {
        // SCARSITÀ: la fertilità del suolo cala se il tile è tenuto SPOGLIO (sfruttato di continuo),
        // recupera se lasciato a RIPOSO (vegetazione piena). Determina la capacità effettiva del tile.
        let fe = this.fertility[i];
        // Il confronto è con quanto quel suolo può reggere ORA, non con quanto reggeva da intatto.
        // Altrimenti un terreno impoverito risulta per sempre "spoglio" — perché la sua vegetazione
        // piena È bassa — e continua a peggiorare anche se non ci mette piede nessuno per secoli.
        // Un posto lasciato in pace si riprende: è questo che distingue lo sfruttamento dal riposo.
        const ratio = this.food[i] / Math.max(1e-4, c * fe);   // 0 spoglio .. 1 al suo massimo attuale
        if (ratio < 0.35) {
          fe = Math.max(0.15, fe - P.fertDegrado * dtF * (0.35 - ratio));
          // Un suolo tenuto spoglio smette di trattenere l'acqua: le radici che la tenevano non ci
          // sono più e l'umidità se ne va. Nessuno "dichiara" che quel posto è diventato deserto —
          // il bioma si limita a seguire l'acqua che resta, come fa dappertutto.
          // Solo un suolo ORMAI ESAURITO perde l'acqua, e la perde lentissimamente: ci vogliono
          // secoli di sfruttamento senza tregua perché un posto cambi natura. Un terreno appena
          // magro non è un deserto in arrivo — è un terreno appena magro.
          if (fe < 0.2 && w.moisture[i] > 0.12) {
            w.moisture[i] = Math.max(0.1, w.moisture[i] - P.aridimento * dtF * (0.2 - fe));
            this._aridChk = 1;
          }
        }
        else if (ratio > 0.7) {
          fe = Math.min(1, fe + P.fertRecupero * dtF);
          // E se la vegetazione torna, l'acqua torna con lei: il processo è reversibile, e non può
          // spingersi oltre l'umidità che quel posto aveva in origine. Un deserto fatto dagli
          // uomini si può riavere indietro — se gli si lascia il tempo.
          if (this.moisture0 && w.moisture[i] < this.moisture0[i]) {
            w.moisture[i] = Math.min(this.moisture0[i], w.moisture[i] + P.aridimento * dtF * 0.5);
            this._aridChk = 1;
          }
        }
        this.fertility[i] = fe;
        fertSum += fe; fertN++;
        const effCap = c * fe;                                // capacità MASSIMA ridotta dal degrado
        if (this.food[i] < effCap) this.food[i] = Math.min(effCap, this.food[i] + regen * effCap * fert);
        else if (this.food[i] > effCap) this.food[i] = effCap; // se la fertilità è crollata, la veg. eccedente appassisce
      }
      const cp = this.planktonCap[i];
      if (this.plankton[i] < cp) this.plankton[i] = Math.min(cp, this.plankton[i] + regenP * cp);
      // SENTIERI: il traffico decade se il passaggio cessa; sopra soglia il tile è strada battuta.
      const tr = this.traffic[i];
      if (tr > 0) {
        this.traffic[i] = Math.max(0, tr - P.sentieroDecay * dtF);
        if (tr > 0.5) this.strade.add(i); else if (tr < 0.3) this.strade.delete(i);
      }
      vegSum += this.food[i]; planktonSum += this.plankton[i];
    }
    acc.veg += vegSum; acc.plank += planktonSum; acc.poll += pollSum;
    acc.fert += fertSum; acc.fertN += fertN;
    if (this._fetta === FETTE - 1) {                 // giro chiuso: i conti valgono per tutto il mondo
      this.inquinamentoTot = acc.poll;
      this.fertilitaMedia = acc.fertN ? acc.fert / acc.fertN : 1;
      this._vegSumTot = acc.veg; this._planktonSumTot = acc.plank;
      acc.veg = 0; acc.plank = 0; acc.poll = 0; acc.fert = 0; acc.fertN = 0;
    }
    if (this.rng() < 0.02) this.aggiornaMedieAzioni();   // il metro sociale si aggiorna di rado

    // CAMPI COLTIVATI: crescono col tempo/stagione consumando la fertilità del tile (più in fretta
    // del bruco selvatico). Maturi, riempiono il cibo del tile (raccolto concentrato). Se la
    // fertilità crolla, il campo è abbandonato → il contadino deve dissodarne un altro (espansione).
    if (this.campi.size) {
      for (const [i, campo] of this.campi) {
        const fe = this.fertility[i];
        if (fe < 0.2) { this.campi.delete(i); continue; }
        this.fertility[i] = Math.max(0.15, fe - 0.05 * dt * seasonMult); // la monocoltura sfrutta il suolo
        campo.crescita = Math.min(1, campo.crescita + 0.12 * dt * seasonMult * fe);
        // il campo maturo tiene il tile pieno di cibo domestico (resa alta finché è coltivato)
        this.food[i] = Math.max(this.food[i], campo.crescita * (0.8 + fe * 0.6));
      }
    }
    // Le frazioni valgono per TUTTO il mondo, quindi si leggono dal totale a giro chiuso: la somma
    // della sola fetta sarebbe un quarto del vero, e il mondo si crederebbe in carestia perenne.
    if (this._vegSumTot !== undefined) {
      this.vegFraction = this.vegCapSum ? this._vegSumTot / this.vegCapSum : 0;
      this.planktonFraction = this.planktonCapSum ? this._planktonSumTot / this.planktonCapSum : 0;
    }
    // Le risorse minerarie si esauriscono; le piante ricrescono (ogni tanto, per prestazioni).
    if (this.rng() < 0.25) this.registry.regenRenewables(dt * 4);

    const readyToMate = [];
    for (const npc of this.npcs) {
      if (!npc.vivo) continue;
      // Metabolismo
      npc.eta += dt * P.etaRate;
      npc.fame = Math.min(1.4, npc.fame + dt * P.fameRate);
      // SETE: solo acqua DOLCE (fiumi/laghi/pioggia). Il mare è salato: non si beve.
      npc.sete = Math.min(1.5, npc.sete + dt * P.seteRate);
      const tileNow = this.tileIdx(npc.x, npc.y);
      // FOG OF WAR (4.8): chi cammina SCOPRE il mondo — il tile calpestato e, a volte, i dintorni.
      if (!this.scoperto[tileNow]) { this.scoperto[tileNow] = 1; this.scopertoCount++; }
      if (this.rng() < 0.08) {
        const cx = npc.x | 0, cy = npc.y | 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x >= 0 && y >= 0 && x < w.width && y < w.height) {
            const i = y * w.width + x;
            if (!this.scoperto[i]) { this.scoperto[i] = 1; this.scopertoCount++; }
          }
        }
      }
      // LINGUA (4.6): deriva individuale lenta — l'isolamento fa divergere i dialetti.
      npc.lingua = Math.max(0, Math.min(1, npc.lingua + (this.rng() - 0.5) * 0.004 * dt));
      if (w.river[tileNow]) {
        npc.sete = Math.max(0, npc.sete - dt * 5); npc.acquaNota = [npc.x, npc.y];
        // ACQUA STAGNANTE (2.4+): dissetante ma malsana. Bere da uno stagno/palude può far
        // ammalare (colera-like) se non è bollita. La sfiducia verso quelle fonti emerge da sé.
        // Chi SA CUOCERE bolle l'acqua e non si ammala (scoperta appresa: fuoco → acqua potabile).
        if (w.stagnant[tileNow] && !npc.immune && npc.infetto == null && !npc._saBollire && this.rng() < dt * 0.4) {
          npc.infetto = 0; this.acqueMalsane = (this.acqueMalsane || 0) + 1;
          if (!this.disease) this.disease = { contagiosita: 0.35, mortalita: 0.28, incubazione: 1.5, curaDifficolta: 0.5, origine: "acqua stagnante" };
        }
      }
      else if (this.pioggia) npc.sete = Math.max(0, npc.sete - dt * 1.2); // beve la pioggia
      if (npc.sete > 1.05) npc.salute -= dt * P.dannoSete * (npc.sete - 1.05) * 8;
      npc.stanchezza = Math.min(1.2, npc.stanchezza + dt * P.stanchezzaRate);
      // ESPOSIZIONE al clima: cresce nel tempo; cala vicino alla propria casa o a un edificio.
      smaltisci(npc, dt);
      if (npc._disposizione) {
        npc.emo.paura = Math.max(0, Math.min(1, npc.emo.paura - npc._disposizione * dt * 0.9));
      }
      npc.riparo = Math.min(1, npc.riparo + dt * P.riparoRate);
      if (npc.casa && (npc.x - npc.casa[0]) ** 2 + (npc.y - npc.casa[1]) ** 2 < 40) {
        // Quanto ti ripara la tua casa dipende da com'è fatta, non da quanto è grande. Una tettoia
        // di frasche ti bagna lo stesso; quattro muri di pietra no.
        const qc = qualitaCasa(this, npc);
        npc._coibenza = qc.coibenza;
        npc.riparo = Math.max(0, npc.riparo - dt * (0.22 + qc.tenuta * 0.85));
      } else npc._coibenza = 0;
      npc.fertilita = npc.eta > P.etaFertileMin && npc.eta < P.etaFertileMax ? 1 : 0;
      if (npc.cooldownFiglio > 0) npc.cooldownFiglio -= dt;

      // Salute: la fame estrema fa male; il cibo la recupera.
      if (npc.fame > FAME_DANNO) npc.salute -= dt * P.dannoFame * (npc.fame - FAME_DANNO) * 10;
      else if (npc.fame < FAME_RECUPERO) npc.salute = Math.min(1, npc.salute + dt * P.recuperoSalute);

      // METABOLISMO (8.3): i gruppi nutritivi si consumano. Se uno resta a zero → CARENZA: la
      // salute non si rigenera e si deperisce (scorbuto/anemia emergenti). Mangiare vario paga.
      const d = npc.dieta;
      let minG = 1;
      for (const k in d) { d[k] = Math.max(0, d[k] - dt * P.consumoNutrienti); if (d[k] < minG) minG = d[k]; }
      // Carenza solo se un gruppo è DAVVERO esaurito a lungo: un malus lento, non una condanna.
      npc.carenza = Math.max(0, P.sogliaCarenza - minG) * 3;               // 0 = dieta completa, ~0.36 = grave
      if (npc.carenza > 0) npc.salute -= dt * npc.carenza * P.dannoCarenza;
      // IMMUNITÀ: dipende dalle difese accumulate, dalla dieta e dall'età (i vecchi e i denutriti
      // si ammalano di più). Decade lentamente da sola.
      npc.immunita = Math.max(0, Math.min(1, npc.immunita - dt * P.immunitaDecay - (npc.carenza * dt * 0.05)
        + (npc.carenza < 0.05 && npc.salute > 0.7 ? dt * P.immunitaCrescita : 0)));
      // DOLORE: dalla salute bassa e dalla malattia. Alimenta paura e tristezza, toglie voglia di fare.
      npc.dolore = Math.max(0, (1 - npc.salute) * 0.8 + (npc.infetto != null ? 0.3 : 0));
      if (npc.dolore > 0.4) { npc.emo.tristezza = Math.min(1, npc.emo.tristezza + dt * npc.dolore * 0.3); npc.emo.gioia = Math.max(0, npc.emo.gioia - dt * npc.dolore * 0.2); }

      // GRAVIDANZA REALE: la nascita non è più istantanea. La gestante è più affamata e più lenta;
      // se sta troppo male può perdere il bambino. Alla fine del termine nasce il figlio.
      if (npc.incinta > 0) {
        npc.incinta -= dt;
        npc.fame = Math.min(1.4, npc.fame + dt * 0.03);
        if (npc.salute < 0.3 && this.rng() < dt * 0.4) { npc.incinta = 0; npc.padreDelFiglio = null; npc.emo.tristezza = Math.min(1, npc.emo.tristezza + 0.6); }
        else if (npc.incinta <= 0) this.partorisci(npc);
      }

      // Disagio climatico: chi non è adattato soffre nei climi estremi.
      // -> pressione selettiva: i freddo-adattati restano al Nord, ecc.
      // La temperatura percepita include il clima GLOBALE del momento (cenere, era glaciale) e la
      // NOTTE (di notte fa più freddo: senza riparo si soffre di più).
      const temp = w.temperature[this.tileIdx(npc.x, npc.y)] + (this.tempOffset || 0) - (this.notte ? 0.06 : 0);
      // Il RIPARO amplifica/attutisce il clima: senza casa il freddo e la pioggia fanno male;
      // al riparo si sopravvive anche ai climi ostili. -> nelle terre rigide serve costruire.
      const esposto = (0.35 + 0.65 * npc.riparo) * (1 - (npc._coibenza || 0) * 0.45);
      const meteo = (this.stagione === "Inverno" ? 1.7 : 1) * (this.pioggia ? 1.35 : 1);
      const disc = (Math.max(0, 0.28 - temp) * (1 - npc.resFreddo)
                 + Math.max(0, temp - 0.72) * (1 - npc.resCaldo)) * esposto * meteo;
      if (disc > 0) npc.salute -= dt * disc * P.dannoClima;

      // Morte per fame/salute o vecchiaia (con un po' di varianza dai geni).
      const maxEta = P.longevitaBase + npc.genes.resistenza * P.longevitaGeni;
      if (npc.salute <= 0 || npc.eta > maxEta) {
        npc.vivo = false; this.morti++;
        // MORIRE DA SERVO. Va contato QUI e non altrove: i morti vengono compattati via ogni tanto
        // (poco piu' sotto), quindi guardando l'elenco dopo non se ne trova quasi nessuno — e si
        // conclude che dalla servitu' si esce ribellandosi. Non e' vero: e' la meta' delle uscite.
        if (npc._padrone != null) this.mortiDaServo = (this.mortiDaServo || 0) + 1;
        this.eredita(npc); continue;
      }

      // I cibi/materiali organici deperiscono nell'inventario; il mestiere emerge dalle azioni.
      if (this.rng() < 0.15) this.decayInventory(npc, dt * 6);
      if (this.rng() < 0.02) this.updateMestiere(npc);

      // OSSESSIONE (C.7): chi vive per scoprire sperimenta ANCHE affamato e stanco. È irrazionale —
      // ed è esattamente per questo che la storia non resta ferma al villaggio a mangiare bacche.
      if (npc.inventore && npc.volonta > 0.75 && npc.motiv.conoscenza > 0.65 && this.rng() < 0.01) this.experiment(npc);

      // SFINIMENTO: oltre il limite di stanchezza il corpo cede (obbliga a dormire, B.5).
      if (npc.stanchezza > 1.1) npc.salute -= dt * (npc.stanchezza - 1.1) * P.dannoSfinimento;

      // VELOCITÀ: il peso rallenta; il mezzo giusto accelera (nave in acqua ≠ carro a terra ≠ piedi);
      // sui sentieri battuti si cammina più spediti.
      const mezzo = npc._barca && this.isWaterAt(npc.x, npc.y) ? P.bonusBarca : npc._carro ? 1.35 : 1;
      const strada = this.traffic[tileNow] > 0.5 ? 1.15 : 1;
      const speed = (P.velocitaBase + npc.forza * P.velocitaForza) * dt * 6 * mezzo * strada / (1 + (npc._massa || 0) * P.pesoRallenta);

      // --- Logica a priorità BASATA SUL BISOGNO DEL MOMENTO ---
      // Ogni NPC capisce di cosa ha bisogno ORA: mangiare, curarsi, o (solo alcuni) inventare.
      if (npc.salute < 0.6) {
        // Bisogno: guarire. Usa una medicina che il popolo ritiene affidabile.
        this.useMedicine(npc);
        npc._att = "curarsi";
      }
      if (npc.sete > 0.8 && !this.pioggia) {
        npc._att = "bere";
        // Bisogno: BERE. Va dove ricorda l'acqua dolce; altrimenti la cerca.
        if (npc.acquaNota) this.moveToward(npc, npc.acquaNota[0], npc.acquaNota[1], speed * 1.1);
        else if (this.rng() < 0.4) {
          const t = this.bestRiver(npc.x, npc.y, 10);
          if (t) npc.acquaNota = [t[0] + 0.5, t[1] + 0.5];
          else this.wander(npc, speed);
        } else this.wander(npc, speed);
      } else if (npc.fame > 0.55) {
        npc._att = "cercare cibo";
        // Bisogno: mangiare. Prima prova un cibo già noto e disponibile, poi foraggia.
        if (!this.eatKnownFood(npc)) {
          const idx = this.tileIdx(npc.x, npc.y);
          if (this.food[idx] > 0.2) {
            const eaten = Math.min(this.food[idx], 0.5 * dt * 4);
            this.food[idx] -= eaten;
            this.foraggia(npc, idx, eaten);
          } else {
            const R = 4 + Math.round(npc.curiosita * 8);
            const target = this.bestFood(npc.x, npc.y, R);
            if (target) this.moveToward(npc, target[0] + 0.5, target[1] + 0.5, speed);
            else this.wander(npc, speed);
          }
        }
      } else if (npc.stanchezza > (this.notte ? 0.35 : 0.8)) {
        // DORMIRE: si dorme dove capita, ma al riparo si recupera davvero. Il rifugio nasce da qui:
        // non da una ricetta, ma perché dormire protetti fa sopravvivere di più. Di NOTTE si dorme
        // molto più volentieri (soglia bassa) e si recupera meglio: il ritmo circadiano emerge.
        npc._att = "dormire";
        const recupero = (0.2 + (1 - npc.riparo) * 0.4) * (this.notte ? 2.2 : 1);
        npc.stanchezza = Math.max(0, npc.stanchezza - dt * recupero);
      } else if (npc._esplora) {
        npc._att = "esplorare";
        // SPEDIZIONE: viaggia verso l'ignoto (scoprendo la mappa) e poi rientra.
        this.moveToward(npc, npc._esplora[0], npc._esplora[1], speed * 1.3);
      } else if (npc.migrante) {
        npc._att = "migrare";
        // COLONIZZAZIONE: spinto via da affollamento+scarsità, cerca terre nuove e vi si ferma.
        const dx = npc.migMeta[0] - npc.x, dy = npc.migMeta[1] - npc.y;
        if (dx * dx + dy * dy < 9 || !this.walkable(npc.migMeta[0], npc.migMeta[1])) {
          npc.migrante = false; npc._pressioneSpazio = 0; npc.casa = null; npc.casaLivello = 0; // rifonda qui
          this.emigrati = (this.emigrati || 0) + 1;
        } else this.moveToward(npc, npc.migMeta[0], npc.migMeta[1], speed * 1.5);
      } else if (npc.ribelle) {
        npc._att = "ribellarsi";
        // Un ribelle scontento migra lontano dal gruppo e non collabora/inventa.
        this.wander(npc, speed * 1.6);
      } else if (npc._ordine && (npc._att = "ordine: " + npc._ordine.tipo) && eseguiOrdine(this, npc, dt, speed)) {
        // ORDINE DEL CAPO (M6): eseguito SOLO ora, dopo i bisogni vitali — la biologia batte
        // sempre la politica. Se la fame stringe, l'ordine viene abbandonato (vedi orders.js).
      } else {
        // Bisogni soddisfatti e sereno: si costruisce un riparo, raccoglie e — se inventore — sperimenta.
        npc._att = "raccogliere";
        this.maybeScrivi(npc); this.maybeLeggi(npc);
        this.maybeFabbrica(npc);
        this.maybeBuildHouse(npc, dt);
        this.maybeFarm(npc, dt);
        this.gatherAndCraft(npc);
        // Si riproduce solo se abbastanza felice (il benessere guida la natalità).
        if (npc.fertilita && !npc.incinta && npc.cooldownFiglio <= 0 && npc.fame < 0.5 && npc.emo.gioia > 0.4) readyToMate.push(npc);
        // A pancia piena si va dove si vuole. Il vanitoso torna dove luccicava; gli altri girano
        // a caso, e nel girare a caso trovano da mangiare. Nessuno ha detto a nessuno che l'oro
        // vale la strada: è che a certuni pesa più il non averlo che le gambe.
        const vanita = npc.superbia * 0.6 + npc.avidita * 0.45 + npc.emo.invidia * 0.5;
        const meta = npc.luccicaNota;
        // Soglia alta di proposito: con tratti medi la vanità viene 0,57, e se la soglia è lì la
        // supera mezzo mondo — allora tutti inseguono la stessa cosa e quella cosa smette di
        // distinguere chiunque. Deve andarci soltanto chi ci tiene sul serio.
        if (meta && vanita > 0.85 && npc.fame < 0.45 && npc.sete < 0.45) {
          const d2 = (meta[0] - npc.x) ** 2 + (meta[1] - npc.y) ** 2;
          if (d2 > 9) {
            npc._att = "cercare";
            this.moveToward(npc, meta[0], meta[1], speed);
            this.cercheDiLusso = (this.cercheDiLusso || 0) + 1;
          } else {
            // È arrivato, e non c'è più niente: il posto si è esaurito mentre lui non c'era.
            // Se ne scorda, e da domani cercherà altrove. È così che si va a vedere più in là.
            npc.luccicaNota = null;
            this.filoniEsauriti = (this.filoniEsauriti || 0) + 1;
            this.wander(npc, speed * (0.7 + npc.curiosita * 0.8));
          }
        } else this.wander(npc, speed * (0.6 + npc.curiosita * 0.6));
      }
    }

    this.reproduce(readyToMate, dt);

    // Rimuovi i morti ogni tanto (compattazione).
    // Sembrava pura manutenzione — ogni tanto si butta via chi è morto — ma compattare l'elenco
    // CAMBIA GLI INDICI, e i passi a turni scorrono per indice: deciderebbe chi tocca in quale
    // turno. Va col seme anche questo, o lo stesso mondo non si ripete.
    if (this.morti && this.npcs.length && (this.npcs.length > 50) && this.rng() < 0.2) {
      this.npcs = this.npcs.filter((n) => n.vivo);
    }

    // Un fatto che ha segnato tutti apre un'epoca: sono gli stessi eventi da cui nascono le
    // religioni — cio che una generazione non riesce a dimenticare diventa il modo in cui conta
    // il tempo. Il vincolo dei quarant'anni dentro apriEra evita che ogni disgrazia faccia epoca.
    if (this._eventoSaliente && !this._eventoSaliente._era) {
      let segnati = 0, quanti = 0;
      for (const n2 of this.npcs) {
        if (!n2.vivo || n2.eta < 6) continue;
        quanti++;
        if (n2.emo.paura > 0.45 || n2.emo.tristezza > 0.45) segnati++;
      }
      // Serve che almeno un terzo dei vivi se lo porti addosso. Altrimenti passa e non fa storia.
      if (quanti > 20 && segnati / quanti > 0.33) {
        this._eventoSaliente._era = true;
        this.apriEra(this._eventoSaliente.evento);
      } else if (this.anno - this._eventoSaliente.anno > 6) {
        this._eventoSaliente._era = true;    // scaduto: non ha fatto epoca
        this.ereMancate = (this.ereMancate || 0) + 1;
      }
    }

    // CRONACHE: registra eventi storici notevoli.
    const vivi = this.npcs.reduce((s, n) => s + (n.vivo ? 1 : 0), 0);
    for (const soglia of [100, 250, 500, 1000, 2000]) {
      if (vivi >= soglia && this.milestonePop < soglia) { this.milestonePop = soglia; this.chronicle(`La popolazione supera i ${soglia} individui`); }
    }
    if (this.vegFraction < 0.12 && this.stagione === "Inverno") {
      this.chronicle("Grande carestia invernale", 30);
      this._eventoSaliente = { evento: "la carestia", anno: this.anno };
      this.apriEra("la grande fame");
    }
  }

  // Apre una nuova era: il nome nasce dall'evento che l'ha aperta, non da un calendario nostro.
  apriEra(causa) {
    const ultima = this.ere[this.ere.length - 1];
    if (ultima && this.anno - ultima.inizio < 40) return;   // le epoche non si aprono ogni stagione
    if (ultima) ultima.fine = Math.floor(this.anno);
    const sillabe = ["kar", "vel", "nor", "tas", "mid", "olu", "bre", "sun", "dai", "fer"];
    const s = Math.abs(Math.floor(this.anno) * 2654435761) >>> 0;
    const nome = sillabe[s % sillabe.length] + sillabe[(s >>> 8) % sillabe.length];
    this.ere.push({
      nome: nome.charAt(0).toUpperCase() + nome.slice(1),
      causa, inizio: Math.floor(this.anno), fine: null,
      generazione: this.generazioneMedia | 0,
    });
    if (this.ere.length > 12) this.ere.shift();
    this.chronicle(`Comincia un'era nuova, che i vivi chiameranno «${this.ere[this.ere.length - 1].nome}»: ${causa}`, 30);
  }

  // Quando uno muore, le sue cose restano dove sono cadute. Non c'è nessun ordine di successione
  // scritto da nessuna parte: se le prende chi è lì, e fra quelli che sono lì se le prende chi ci
  // teneva di più e chi è più avido. Che a ereditare siano quasi sempre i figli non è una legge
  // del mondo — è che i figli stanno vicino e sono legati. Se un popolo un giorno deciderà che
  // deve andare diversamente, dovrà inventarsi una norma per farlo rispettare.
  eredita(morto) {
    if (!morto.inventory.size && !morto.casa) return;
    let erede = null, meglio = 0;
    for (const o of this.npcs) {
      if (!o.vivo || o === morto) continue;
      const d2 = (o.x - morto.x) ** 2 + (o.y - morto.y) ** 2;
      if (d2 > 256) continue;                       // le cose non volano: bisogna essere lì
      const legame = Math.max(0, o.memoria.get(morto.id) || 0);
      const peso = (0.2 + legame) * (0.4 + o.avidita) / (4 + d2);
      if (peso > meglio) { meglio = peso; erede = o; }
    }
    if (!erede) return;
    for (const [id, q] of morto.inventory) if (q > 0) erede.addMat(id, q);
    if (morto.casa && !erede.casa) {
      erede.casa = [morto.casa[0], morto.casa[1]];
      erede.casaLivello = morto.casaLivello;
      if (morto.casaMat) erede.casaMat = new Map(morto.casaMat);
    }
    this.eredita_ = (this.eredita_ || 0) + 1;
  }

  // Registra un evento nella cronaca (evita spam ravvicinati dello stesso testo).
  chronicle(testo, cooldownAnni = 0) {
    const ultimo = this.cronaca[this.cronaca.length - 1];
    if (ultimo && ultimo.testo === testo && this.anno - ultimo.anno < (cooldownAnni || 1)) return;
    this.cronaca.push({ anno: Math.floor(this.anno), testo });
    if (this.cronaca.length > 200) this.cronaca.shift();
  }

  // I materiali organici si deteriorano nell'inventario (carne marcisce, erbe appassiscono).
  // QUANTO LIQUIDO RIESCE A PORTARSI DIETRO. La somma di ciò che ha in mano e che, per fisica, un
  // liquido lo tiene. Non c'è nessun oggetto chiamato «recipiente»: c'è roba che lo tiene e roba
  // che no, e chi si ritrova ad avere la prima si accorge che l'acqua non gli sparisce più.
  capienza(npc, temperatura) {
    let c = 0;
    for (const [id, q] of npc.inventory) {
      if (q <= 0) continue;
      const mat = this.registry.mat(id);
      if (!mat) continue;
      c += tieneLiquidi(mat.props, temperatura) * q * P.capienzaPerPezzo;
    }
    return c;
  }

  decayInventory(npc, dt) {
    const temp = this.world.temperature[this.tileIdx(npc.x, npc.y)];
    let capienza = null;                       // si conta una volta sola, e solo se serve
    for (const [id, n] of npc.inventory) {
      if (n <= 0) continue;
      const mat = this.registry.mat(id);
      if (!mat) continue;
      // UN LIQUIDO SENZA NIENTE CHE LO TENGA SE NE VA. Non è deperimento: è che l'acqua non si
      // porta nelle mani. Fin qui un liquido nell'inventario stava lì come un sasso — ed era
      // esattamente il motivo per cui nessuno ha mai avuto ragione di inventarsi un vaso.
      if (stato(mat.props, temp) === LIQUIDO) {
        if (capienza === null) capienza = this.capienza(npc, temp);
        const eccesso = n - capienza;
        if (eccesso > 0 && this.rng() < 0.55) {
          const versato = Math.min(n, Math.max(1, Math.ceil(eccesso * 0.5)));
          const resto = n - versato;
          if (resto <= 0) npc.inventory.delete(id); else npc.inventory.set(id, resto);
          this.versato = (this.versato || 0) + versato;
          continue;
        }
      }
      if (mat.deperibilita < 0.05) continue;
      if (this.rng() < mat.deperibilita * dt * 0.5) {
        const nn = n - 1;
        if (nn <= 0) npc.inventory.delete(id); else npc.inventory.set(id, nn);
      }
    }
  }

  // Il MESTIERE emerge dall'attività DISTINTIVA dell'NPC. Le specializzazioni (rare) hanno
  // la priorità; "raccoglitore" è il ruolo generico di chi non si è specializzato in altro.
  // Medie delle attività nella popolazione viva: il metro con cui si giudica chi spicca.
  // Ricalcolate di rado (sono un fondo lentamente mobile, non un dato istantaneo).
  aggiornaMedieAzioni() {
    const somma = {}; let n = 0;
    for (const p of this.npcs) {
      if (!p.vivo || p.eta < 12) continue;
      n++;
      for (const k in p.azioni) somma[k] = (somma[k] || 0) + p.azioni[k];
    }
    this._medieAzioni = {};
    for (const k in somma) this._medieAzioni[k] = n ? somma[k] / n : 0;
    tara(this._medieAzioni);   // la perizia si misura sul metro dei propri, non su un numero mio
  }

  // CHI C'E' QUI INTORNO. Prima ogni cosa che avesse bisogno di un pubblico — un'opera d'arte,
  // la morte di un eroe, un'usanza che si diffonde — scorreva TUTTA la popolazione per trovare
  // le poche persone a portata di voce. Fatto una volta e' O(n); fatto per ogni artista e per
  // ogni morto illustre e' O(n²), e infatti cultura e societa' crescevano piu' che linearmente.
  // L'indice si costruisce una volta per battito e se lo prestano tutti. Chi risponde e' lo
  // stesso di prima: si cambia solo il modo di cercarlo.
  vicini(x, y, raggio) {
    const CELLA = 12;
    // GRIGLIA PIATTA, NIENTE CHIAVI-STRINGA. Ogni `g.get(gx + "," + gy)` costruiva una stringa e
    // la sminuzzava per l'hash, e qui gli accessi sono venticinque per interrogazione. Il numero
    // della cella basta. Il margine c'è perché la mappa a stringhe non aveva confini: chi finisse
    // sul bordo deve restare nella SUA cella, non essere accorpato a quella accanto.
    if (this._vicinatoT !== this._battito || !this._vicinato) {   // anche al primo giro, prima che il battito esista
      this._vicinatoT = this._battito;
      const MARG = 4;
      const COL = Math.ceil(this.world.width / CELLA) + MARG * 2;
      const RIG = Math.ceil(this.world.height / CELLA) + MARG * 2;
      const g = new Array(COL * RIG).fill(null);
      for (const p of this.npcs) {
        if (!p.vivo) continue;
        const c = ((p.x / CELLA) | 0) + MARG, r = ((p.y / CELLA) | 0) + MARG;
        if (c < 0 || r < 0 || c >= COL || r >= RIG) continue;
        const k = r * COL + c;
        (g[k] || (g[k] = [])).push(p);
      }
      this._vicinato = g; this._vicCol = COL; this._vicRig = RIG; this._vicMarg = MARG;
    }
    const g = this._vicinato, COL = this._vicCol, RIG = this._vicRig, MARG = this._vicMarg;
    const R2 = raggio * raggio, out = [];
    const cx = (x / CELLA) | 0, cy = (y / CELLA) | 0, span = Math.ceil(raggio / CELLA);
    for (let gy = cy - span; gy <= cy + span; gy++) {
      const r = gy + MARG;
      if (r < 0 || r >= RIG) continue;
      for (let gx = cx - span; gx <= cx + span; gx++) {
        const c = gx + MARG;
        if (c < 0 || c >= COL) continue;
        const arr = g[r * COL + c]; if (!arr) continue;
        for (const p of arr) if ((p.x - x) ** 2 + (p.y - y) ** 2 <= R2) out.push(p);
      }
    }
    return out;
  }

  updateMestiere(npc) {
    const a = npc.azioni;
    if (!this._medieAzioni) this.aggiornaMedieAzioni();
    const med = this._medieAzioni;
    // Quanto quest'uomo supera i suoi in ogni cosa che sa fare. Chi non supera nessuno in nulla
    // non ha un mestiere: fa un po' di tutto, come la maggior parte della gente.
    let miglior = null, quanto = 2.2;   // serve distinguersi di piu del doppio dalla media
    for (const k in a) {
      const v = a[k] || 0;
      if (v < 2) continue;                              // due gesti non fanno un mestiere
      const rapporto = v / Math.max(0.35, med[k] || 0);
      if (rapporto > quanto) { quanto = rapporto; miglior = k; }
    }
    const NOMI = {
      combattimento: "guerriero", predicazione: "sacerdote", insegnamento: "maestro",
      opera: "artista", esplorazione: "esploratore", commercio: "mercante",
      costruzione: "costruttore", coltura: "agricoltore", invenzione: "inventore",
      cura: "guaritore", caccia: "cacciatore", raccolta: "raccoglitore",
    };
    npc.mestiere = miglior ? (P.affordanceTotale ? this.nomeMestiere(npc, miglior) : (NOMI[miglior] || null)) : null;
    // STRUMENTO: la qualità del miglior utensile/arma che l'NPC sa fabbricare.
    // È ciò che gli permette di estrarre materiali via via più duri (le Ere tecnologiche).
    let str = 0;
    npc._carro = false; npc._barca = false; npc._saBollire = false;
    for (const sig of npc.sapere) {
      const b = this.knowledge.beliefs.get(sig);
      if (!b || b.edificio || !b.attr) continue;
      // Uno strumento è tale perché TAGLIA o REGGE, non perché lo chiamiamo "arma".
      if (AFF.taglia(b) || AFF.regge(b)) str = Math.max(str, b.attr.taglio, b.attr.durezza * 0.7);
      if (b.processo === "cuocere") npc._saBollire = true; // sa usare il fuoco → bolle l'acqua
      // MEZZI NOTI (B.8): chi sa costruire un veicolo/imbarcazione viaggia con costi ridotti;
      // la barca apre l'ACQUA (migrazioni oltremare). Il mezzo conviene → si diffonde da sé.
      if (b.verdetto === "utile") {
        // Una cosa porta sull'acqua perché GALLEGGIA; porta a terra perché è dura e non affonda.
        if (AFF.galleggia(b)) npc._barca = true;
        else if (AFF.rotola(b)) npc._carro = true;
      }
    }
    // SAPER FARE UN'ASCIA NON È AVERE UN'ASCIA. Fin qui `strumento` veniva solo da quello che uno
    // SA fabbricare: bastava conoscere la ricetta e i metalli si estraevano per sempre, senza mai
    // che nulla si consumasse. Adesso il sapere è il TETTO — il meglio che potresti fare — e
    // quello che hai davvero in mano è un'altra cosa, che si logora e si rifà.
    npc.strumentoNoto = str;
    npc.strumento = this.utensile(npc);
    // MASSA trasportata (B.4): Σ quantità × densità. Più carichi = più lenti e affamati.
    let massa = 0;
    const perdite = [];
    const tQui = this.world.temperature[this.tileIdx(npc.x, npc.y)] || 0.5;
    for (const [id, n] of npc.inventory) {
      const m = this.registry.mat(id);
      if (!m) continue;
      massa += n * (m.props.peso || 0);
      // Quanto se ne riesce a portare via senza perderlo: un solido tutto, un liquido quasi niente.
      const tenuta = puo("trasportare", m.props, tQui);
      if (tenuta < 0.9 && n > 0) perdite.push([id, n * (1 - tenuta) * 0.35]);
    }
    npc._massa = massa;

    // Quel che non si riesce a tenere in mano se ne va per strada.
    if (perdite.length) {
      for (const [id, quanto] of perdite) {
        const resta = (npc.inventory.get(id) || 0) - quanto;
        if (resta > 0.001) npc.inventory.set(id, resta); else npc.inventory.delete(id);
        this.versato = (this.versato || 0) + quanto;
      }
    }

    // SFARZO: quanto di te si vede da lontano. Non è la ricchezza — è la parte di ricchezza che
    // salta all'occhio. Poche unità bastano a farsi notare: il decimo anello non luccica più del
    // terzo, e chi si copre d'oro non risulta dieci volte più splendente, solo splendente.
    let sfarzo = 0;
    for (const [id, q] of npc.inventory) {
      if (q <= 0) continue;
      const m = this.registry.mat(id);
      if (!m) continue;
      const v = ostentabile(m);
      if (v < 0.25) continue;                    // o non luccica, o non te lo metti addosso
      // La rarità è quasi tutto: se ce l'hanno tutti non impressioni nessuno. E siccome la rarità
      // si misura da quanti ce l'hanno, un bene che si diffonde smette DA SOLO di dare prestigio.
      // Nessun tetto: chi ne ha di più risplende di più, sempre. Ma non in proporzione — la radice
      // è la saturazione dell'occhio (Weber-Fechner): il decimo anello si nota meno del terzo, e il
      // centesimo quasi per niente. È percezione, non una regola del gioco.
      // Poi la rarità, che pesa quanto tutto il resto: una cosa che hanno tutti non fa colpo su
      // nessuno. Ed è il freno naturale della moda — un bene che si diffonde smette da solo di dare
      // prestigio, e chi vuole distinguersi deve cercarsi altro.
      sfarzo += Math.sqrt(q) * 1.6 * v * (0.2 + raro(this, id) * 0.8);
    }
    npc._sfarzo = sfarzo;

    // La soglia oltre la quale si comincia a posare roba. L'avidità la alza moltissimo.
    const sopporta = 4 + npc.avidita * 16;
    if (massa > sopporta && npc.inventory.size > 1) {
      let peggiore = null, minimo = 1e9;
      for (const [id, q] of npc.inventory) {
        if (q <= 0) continue;
        const m = this.registry.mat(id);
        if (!m) continue;
        const ph = physiology(m.props);
        // quanto ci tiene: la solita voglia, meno quanto gli pesa portarselo
        const v = valuta(npc, {
          id: "m" + id, nutre: ph.nutrimento, cura: ph.beneficio, nuoce: ph.danno,
          gusto: sapore(m.props), dissete: dissete(m.props),
          raro: raro(this, id), bramato: brama(this, id), fatica: (m.props.peso || 0) * q * 0.12,
        }, propensione(npc, "m" + id)) + ostentabile(m) * (npc.avidita * 0.5 + npc.superbia * 0.6);
        if (v < minimo) { minimo = v; peggiore = id; }
      }
      if (peggiore != null) {
        // si posa a manciate, non un pezzo per volta: chi è troppo carico si alleggerisce davvero
        const q = npc.inventory.get(peggiore);
        const giu = Math.max(1, Math.ceil(q * 0.35));
        npc.inventory.set(peggiore, q - giu);
        if (npc.inventory.get(peggiore) <= 0) npc.inventory.delete(peggiore);
        this.posato = (this.posato || 0) + giu;
      }
    }
  }

  wander(npc, speed) {
    if (Math.hypot(npc.tx - npc.x, npc.ty - npc.y) < 1.2) {
      const a = this.rng() * Math.PI * 2;
      const r = 3 + this.rng() * 10;
      npc.tx = npc.x + Math.cos(a) * r;
      npc.ty = npc.y + Math.sin(a) * r;
    }
    this.moveToward(npc, npc.tx, npc.ty, speed);
  }

  // L'ATTREZZO CHE HAI IN MANO. Non è un oggetto a parte con una sua scheda: è la materia
  // migliore che hai addosso fra quelle che tagliano o reggono, lavorata fin dove arriva il tuo
  // sapere. Si consuma usandola, e quanto duri lo dice di che cos'è fatta — la stessa `durata`
  // che serve per le case, perché è la stessa domanda: quanto resiste prima di tornare polvere.
  //
  // Da qui vengono tre cose che nessuno ha scritto: i metalli servono di continuo e non una volta
  // sola; chi resta senza materia dura retrocede da solo all'era della pietra anche sapendo tutto;
  // e un ferro ben fatto sopravvive a chi l'ha fatto — che è la definizione di cimelio.
  utensile(npc) {
    // NESSUN TETTO SUL SAPERE, e la misura mi ha corretto: avevo limitato l'attrezzo a quello che
    // uno SA fabbricare, e veniva fuori il contrario di quel che volevo (chi non aveva ancora un
    // mestiere si ritrovava senza limite). Ma soprattutto era sbagliato in sé: raccogliere una
    // selce tagliente e usarla non richiede nessuna ricetta — l'hanno fatto per un milione d'anni.
    // Il sapere entra da un'altra porta, ed è quella giusta: sapere fabbricare mette in mano
    // MATERIE MIGLIORI, e quelle diventano attrezzi migliori da sé.
    const u = npc._utensile;
    if (u && u.vita > 0) return u.q;
    // rotto o mai avuto: si rifà con quel che si ha in mano
    let miglior = null, mv = 0;
    for (const [id, q] of npc.inventory) {
      if (q <= 0) continue;
      const m = this.registry.mat(id);
      if (!m) continue;
      // Un attrezzo serve perché TAGLIA, e solo in seconda battuta perché è duro: con la sabbia
      // non ci scavi niente. (Prima la soglia era così bassa che la gente si faceva utensili di
      // gesso e di sabbia — la misura l'ha detto subito.)
      const v = Math.max(m.props.taglio || 0, (m.props.durezza || 0) * 0.55);
      if (v > mv) { mv = v; miglior = m; }
    }
    if (!miglior || mv < 0.3) { npc._utensile = null; return 0; }
    npc.inventory.set(miglior.id, npc.inventory.get(miglior.id) - 1);
    const r = riparoDi(miglior.props);          // la durata: quanto resiste prima di sfarsi
    npc._utensile = {
      q: mv,
      vita: 1,
      logorio: 0.055 * (1.2 - r.durata),        // il ferro dura, la selce no
      di: miglior.id,
    };
    this.utensiliRifatti = (this.utensiliRifatti || 0) + 1;
    return npc._utensile.q;
  }

  // Usarlo lo consuma. Chi lavora molto rompe molto: è il motivo per cui la materia dura non basta
  // trovarla una volta.
  consumaUtensile(npc, quanto = 1) {
    const u = npc._utensile;
    if (!u) return;
    u.vita -= u.logorio * quanto;
    if (u.vita <= 0) { npc._utensile = null; this.utensiliRotti = (this.utensiliRotti || 0) + 1; }
  }

  gatherAndCraft(npc) {
    const idx = this.tileIdx(npc.x, npc.y);
    // RICORSIONE TECNOLOGICA: le risorse dure (metalli) servono strumenti per essere estratte.
    // Senza utensili raccogli solo materia di superficie (legno, selce...). Con utensili migliori
    // accedi a più materiali -> emergono le Ere (pietra -> metalli). Nessuna regola scritta a mano.
    // L'attrezzo si guarda ADESSO, non all'ultimo cambio di mestiere: si rompe scavando, e chi
    // resta senza deve poterlo rifare subito se ha di che, non fra otto anni.
    npc.strumento = this.utensile(npc);
    const soglia = 0.5 + npc.strumento * 0.5;
    if (npc.strumento > 0 && this.rng() < 0.2) this.consumaUtensile(npc);   // scavare consuma la lama
    // Solo ciò che c'è DAVVERO sotto i piedi, non l'intero catalogo del mondo.
    for (const idMat of this.registry.presenzeAt(idx)) {
      const m = this.registry.mat(idMat);
      if (!m) continue;
      if (m.durezzaEstrazione > soglia) continue;
      // Uno non tocca ciò di cui ha una brutta esperienza — sua o raccontata. Non c'è nessun
      // divieto: c'è che gli fa ribrezzo, e il ribrezzo vince sul bisogno finché la fame non
      // diventa disperata. È da qui che nascono i cibi che "non si mangiano" in un popolo e si
      // mangiano in quello accanto.
      const avversione = propensione(npc, "m" + m.id);
      if (avversione < -0.2 && npc.fame < 0.8 + avversione * 0.5) continue;
      const c = this.registry.concentrationAt(m.id, idx);
      if (c <= 0.02) continue;                       // qui non ne è rimasto proprio niente
      // PRIMO TEMPO: il dado col caso più favorevole. Chi non passa nemmeno con l'appetibilità al
      // massimo non passerebbe mai, e non vale la pena chiedersi quanto la desidera.
      const resa0 = Math.min(1, c * 1.15);
      const facilita0 = resa0 * resa0 * (0.55 + npc.curiosita * 0.75);
      const soglia0 = 0.19 * (0.4 + npc.curiosita) * facilita0 * 2.4;
      if (this.rng() >= soglia0) continue;

      // SECONDO TEMPO: ora sì che conviene pensarci.
      // QUANTO LA VUOLE. Un affamato si china sul commestibile e ignora la pietra; un superbo fa
      // il contrario; chi è stufo di una cosa cerca l'altra. Nessuno di questi comportamenti è
      // scritto: sono tutti la stessa somma, con pesi diversi perché le persone sono diverse.
      const r = this.ritrattoDi(m);
      const voglia = valuta(npc, r, avversione)
        + r.ost * (npc.avidita * 0.5 + npc.superbia * 0.6);
      // Si normalizza attorno a 1 perché il ritmo della raccolta resti quello di sempre: quello
      // che cambia è la scelta, non la quantità. Un fondo resta sempre — anche senza volerlo,
      // qualcosa in mano ci finisce.
      const appetibilita = Math.max(0.2, Math.min(2.4, 0.75 + voglia * 0.85));
      // La quota che resta dopo il primo dado: insieme, i due tiri danno esattamente la probabilità
      // di prima. (La difficoltà dovuta a quel che resta del giacimento è già entrata nel primo.)
      if (this.rng() < appetibilita / 2.4) {
        const got = this.registry.deplete(m.id, idx, 0.04); // consuma la risorsa
        if (got > 0) {
          npc.addMat(m.id, 1); npc.azioni.raccolta++; this.pollution[idx] = Math.min(1, this.pollution[idx] + 0.01);
          // Un posto dove si è trovato qualcosa di bello non si scorda.
          if (splendoreDi(m) > 0.45) npc.luccicaNota = [npc.x, npc.y];
          if (m.nome === "Ferro" && !this.etaMetalli) {
        this.etaMetalli = true;
        this.chronicle("Inizia l'Età dei Metalli: il primo ferro è estratto");
        this.apriEra("il primo ferro strappato alla terra");
      }
        }
      }
    }
    // Solo gli INVENTORI sperimentano cose nuove, e di rado. Gli altri vivono col sapere comune.
    // La spinta non è l'utilità: è la FUNZIONE OBIETTIVO (conoscenza × volontà) — si scopre
    // perché si VUOLE scoprire (C.1/C.7).
    if (npc.inventore && this.rng() < P.probEsperimento * (0.3 + npc.curiosita + npc.intelligenza) * (0.5 + npc.motiv.conoscenza * npc.volonta)) this.experiment(npc);
    // Un inventore può anche FONDERE due invenzioni note in un edificio e costruirlo.
    if (npc.inventore && this.rng() < P.probFusione * (0.3 + npc.intelligenza)) this.fuseAndBuild(npc);
  }

  // Ricette che l'NPC CONOSCE personalmente (dal suo sapere), lette dal registro.
  ricetteNote(npc) {
    const out = [];
    for (const sig of npc.sapere) { const b = this.knowledge.beliefs.get(sig); if (b) out.push(b); }
    return out;
  }

  // Fonde due invenzioni NOTE ALL'NPC (una strutturale + una funzionale) in un edificio.
  fuseAndBuild(npc) {
    if (!canBuild(this, npc.x, npc.y)) return;
    const list = this.ricetteNote(npc).filter((b) => !b.edificio && b.verdetto === "utile");
    if (list.length < 2) return;
    const a = list[(this.rng() * list.length) | 0];
    const b = list[(this.rng() * list.length) | 0];
    if (a === b) return;
    const progetto = fuse(a, b, this.registry);
    if (!progetto) return;
    const { nuovo } = this.knowledge.learnBuilding(progetto, this.anno);
    npc.sapere.add(progetto.signature);
    this.buildings.push(makeBuilding(npc.x, npc.y, progetto, npc.id));
    npc.azioni.costruzione++;
    npc.emo.soddisfazione = Math.min(1, npc.emo.soddisfazione + 0.2);
    if (nuovo) this.edificiScoperti = (this.edificiScoperti || 0) + 1;
  }

  // L'USURA. Fin qui una casa, una volta alzata, restava in piedi per sempre: solo un terremoto o
  // una guerra potevano portarla via. Ma niente resta: la pioggia entra, il gelo spacca, il sole
  // cuoce, e quello che nessuno rimette a posto torna polvere. Quanto ci mette lo dice di che cosa
  // e' fatta — `durata` era gia' calcolata in riparoDi() e non la leggeva nessuno.
  //
  // Non e' manutenzione del codice: e' il pezzo che mancava perche' la ricchezza costi. Prima chi
  // si era fatto una casa una volta era a posto per la vita, e la disuguaglianza si accumulava e
  // basta. Adesso la pietra dura e la paglia no, tenere una casa grande costa fatica ogni anno, e
  // chi smette di curarla la perde. Da qui vengono le rovine — e il cimelio, che e' semplicemente
  // la cosa fatta cosi' bene da durare piu' di chi l'ha fatta.
  logora(npc, dt) {
    if (!npc.casa || npc.casaLivello <= 0) return;
    const q = qualitaCasa(this, npc);
    const i = this.tileIdx(npc.x, npc.y);
    // Il tempo che fa morde: dove piove molto e dove il caldo e il gelo si danno il cambio, prima.
    const intemperie = 0.6 + (this.world.moisture[i] || 0) * 0.6
      + Math.abs((this.world.temperature[i] || 0.5) - 0.5) * 0.5 + (this.pioggia ? 0.25 : 0);
    npc._usura = (npc._usura || 0) + dt * P.usuraCase * (1.15 - q.durata) * intemperie;
    if (npc._usura < 1) return;
    npc._usura = 0;
    npc.casaLivello--;
    // Se ne va anche un po' di quello con cui era fatta: quel che e' tornato polvere non c'e' piu'.
    if (npc.casaMat && npc.casaMat.size) {
      const chiavi = [...npc.casaMat.keys()];
      const k = chiavi[(this.rng() * chiavi.length) | 0];
      const r = npc.casaMat.get(k) - 1;
      if (r > 0) npc.casaMat.set(k, r); else npc.casaMat.delete(k);
    }
    if (npc.casaLivello <= 0) {
      npc.casa = null; npc.casaLivello = 0; npc.casaMat = null;
      this.caseTot = Math.max(0, (this.caseTot || 1) - 1);
      this.caseSfatte = (this.caseSfatte || 0) + 1;
      npc.riparo = Math.min(1, npc.riparo + 0.4);   // e si torna a dormire allo scoperto
    }
  }

  // RIPARO: costruisce/ingrandisce la propria abitazione quando è esposto e ha materiali adatti.
  // "Materiale da costruzione" non è scritto a mano: è ciò che nell'inventario è duro+pesante.
  // L'invidia/ambizione/superbia spingono a case più grandi (motore di disuguaglianza sociale).
  maybeBuildHouse(npc, dt) {
    if (npc.riparo < 0.45 && npc.casaLivello > 0) return;
    if (this.rng() > 0.05 * (0.5 + npc.riparo)) return;
    let matId = null, meglio = -1e9;
    for (const [id, q] of npc.inventory) {
      if (q <= 0) continue;
      const m = this.registry.mat(id);
      if (!m) continue;
      // Deve reggersi in piedi: serve che sia solido (fisica) e che abbia corpo abbastanza.
      if (puo("costruire", m.props, this.world.temperature[this.tileIdx(npc.x, npc.y)]) <= 0) continue;
      if ((m.props.durezza + m.props.peso) <= 0.7) continue;
      const r = riparoDi(m.props);
      // Vale quanto ripara — più quanto è bello, per chi ci tiene a essere visto.
      const v = valuta(npc, {
        id: "m" + id, nutre: 0, cura: 0, nuoce: 0,
        gusto: r.coibenza * 0.55 + r.tenuta * 0.45,
        raro: raro(this, id), bramato: brama(this, id),
        fatica: (m.props.peso || 0) * 0.45,
      }, propensione(npc, "m" + id)) + ostentabile(m) * npc.superbia * 1.1;
      if (v > meglio) { meglio = v; matId = id; }
    }
    if (matId == null) return;
    npc.inventory.set(matId, npc.inventory.get(matId) - 1);
    // La casa si ricorda di che cosa è fatta: è quello, e non un numero, a dire quanto ripara.
    if (!npc.casaMat) npc.casaMat = new Map();
    npc.casaMat.set(matId, (npc.casaMat.get(matId) || 0) + 1);
    npc._att = "costruire";
    if (!npc.casa) { npc.casa = [npc.x, npc.y]; this.caseTot = (this.caseTot || 0) + 1; }
    else { npc.casa[0] = npc.x; npc.casa[1] = npc.y; }
    const spinta = 0.5 + npc.ambizione * 0.5 + npc.superbia * 0.4 + npc.emo.invidia * 0.6;
    if (npc.casaLivello < 5 && this.rng() < 0.4 * spinta) npc.casaLivello++;
    npc.riparo = Math.max(0, npc.riparo - 0.35);
    npc.emo.soddisfazione = Math.min(1, npc.emo.soddisfazione + 0.1);
  }

  // SCRIVERE: chi sa molto e ha mente per ordinarlo fissa il proprio sapere in un oggetto, che
  // resta dov'è anche quando lui non c'è più. Nessuno gli ha insegnato a "scrivere": ha soltanto
  // trovato il modo di lasciare una traccia che altri sapranno rileggere.
  maybeScrivi(npc) {
    // Nessuno qui dentro «sa scrivere». C'è chi ha qualcosa da dire, un motivo per non lasciarlo
    // morire con sé, e la pazienza di inciderlo. Il motivo è la vanità (che il proprio nome resti
    // dopo di te) oppure la paura (che quel che sai vada perduto) — e la seconda cresce con gli
    // anni, perché a vent'anni non ci pensi e a sessanta sì.
    const daDire = npc.sapere.size;
    if (daDire < 4) return;
    const vuoleRestare = npc.motiv.fama * 0.6 + npc.superbia * 0.45;
    const temeDiPerdere = npc.emo.paura * 0.35 + Math.min(1, npc.eta / 65) * 0.55;
    const capace = npc.intelligenza * 0.7 + (npc.pazienza || 0.5) * 0.3;
    const spinta = (vuoleRestare + temeDiPerdere) * capace * Math.min(1, daDire / 7);
    if (this.rng() > 0.0007 * spinta) return;
    // serve qualcosa su cui lasciare il segno: un materiale durevole e non deperibile
    let supporto = null;
    for (const [id, q] of npc.inventory) {
      if (q <= 0) continue;
      const m = this.registry.mat(id);
      if (m && m.deperibilita < 0.15 && (m.props.durezza || 0) > 0.2) { supporto = m; break; }
    }
    if (!supporto) return;
    npc.inventory.set(supporto.id, npc.inventory.get(supporto.id) - 1);
    this.libri.push({
      x: npc.casa ? npc.casa[0] : npc.x, y: npc.casa ? npc.casa[1] : npc.y,
      sapere: new Set(npc.sapere), autore: npc.id, anno: Math.floor(this.anno),
      materia: supporto.nome, letture: 0,
    });
    if (this.libri.length > 120) this.libri.shift();
    npc._att = "scrivere";
    npc.reputazione.scriba = (npc.reputazione.scriba || 0) + 1;
    this.libriScritti = (this.libriScritti || 0) + 1;
    if (this.libriScritti === 1) this.chronicle("Qualcuno lascia il proprio sapere impresso su " + supporto.nome + ": nasce la scrittura");
  }

  // LEGGERE: chi passa vicino a un libro e ha la testa per capirlo ne ricava ciò che non sa.
  // Il sapere torna in circolo anche a secoli di distanza da chi lo aveva trovato.
  maybeLeggi(npc) {
    if (!this.libri.length) return;
    // Chi non ha testa né curiosità passa accanto ai segni senza vederli. Non è vietato: è che
    // non gli dicono niente.
    if (this.rng() > 0.09 * (npc.intelligenza * 0.6 + npc.curiosita * 0.55)) return;
    for (const l of this.libri) {
      if ((l.x - npc.x) ** 2 + (l.y - npc.y) ** 2 > 25) continue;
      const nuove = [...l.sapere].filter((s) => !npc.sapere.has(s));
      if (!nuove.length) continue;
      npc.sapere.add(nuove[(this.rng() * nuove.length) | 0]);
      l.letture++;
      npc._att = "leggere";
      this.letture = (this.letture || 0) + 1;
      return;
    }
  }

  // AGRICOLTURA (3.2): un NPC stanziale con dei SEMI (un materiale molto nutriente in inventario)
  // dissoda un campo su un tile fertile vicino a casa, quando la selva intorno rende poco. Nessuna
  // regola "coltiva": emerge da chi ha semi, una casa e fame di resa. Occupa spazio e sfrutta il suolo.
  maybeFarm(npc, dt) {
    if (!npc.casa || npc.pigrizia > 0.75) return;
    if (this.rng() > 0.03 * (0.4 + npc.intelligenza)) return;
    // trova un seme: un materiale nutriente posseduto
    let seme = null;
    for (const [id, q] of npc.inventory) {
      if (q <= 0) continue;
      const m = this.registry.mat(id);
      if (m && (m.props.nutriente || 0) > 0.5) { seme = id; break; }
    }
    if (seme == null) return;
    // cerca un tile fertile e non già campo attorno alla casa
    const cx = npc.casa[0] | 0, cy = npc.casa[1] | 0;
    for (let tries = 0; tries < 6; tries++) {
      const x = cx + ((this.rng() * 7) | 0) - 3, y = cy + ((this.rng() * 7) | 0) - 3;
      if (!this.walkable(x, y)) continue;
      const i = this.tileIdx(x, y);
      if (this.campi.has(i) || this.foodCap[i] < 0.3 || this.fertility[i] < 0.55) continue;
      // ROTAZIONE DELLE COLTURE: se il tile è stato coltivato di recente con QUESTO seme, il
      // terreno rende meno; chi se ne accorge (intelligenza) alterna la semente e il suolo si
      // riprende. La pratica agronomica emerge dal degrado, non da una regola.
      if (this._ultimaColtura && this._ultimaColtura.get(i) === seme) {
        if (npc.intelligenza > 0.5) continue;               // il contadino accorto cambia campo/seme
        this.fertility[i] = Math.max(0.15, this.fertility[i] - 0.08); // monocoltura: sfrutta il suolo
      } else if (this._ultimaColtura && this._ultimaColtura.has(i)) {
        this.fertility[i] = Math.min(1, this.fertility[i] + 0.05);    // rotazione: il suolo si ristora
        this.rotazioni = (this.rotazioni || 0) + 1;
      }
      if (!this._ultimaColtura) this._ultimaColtura = new Map();
      this._ultimaColtura.set(i, seme);
      this.campi.set(i, { crescita: 0.1, owner: npc.id, cropId: seme });
      npc._att = "coltivare";
      npc.inventory.set(seme, npc.inventory.get(seme) - 1); // semina
      npc.azioni.raccolta++; if (!npc.azioni.coltura) npc.azioni.coltura = 0; npc.azioni.coltura++;
      return;
    }
  }

  // NUTRIZIONE (8.3): i gruppi nutritivi sono DERIVATI dalle proprietà fondamentali del materiale,
  // non sono attributi scritti. Carne/pesce → proteine; piante → carboidrati e fibre; energia
  // chimica → grassi; bioattivo → vitamine; sali conduttivi → minerali.
  nutriDaMateriale(npc, mat, q = 1) {
    if (!mat) return;
    const p = mat.props, n = (p.nutriente || 0) * q;
    if (n <= 0 && !(p.bioattivo > 0.1)) return;
    const d = npc.dieta;
    if (mat.daAnimale) { d.prot = Math.min(1, d.prot + n * 0.7); d.gras = Math.min(1, d.gras + (p.energiaChim || 0) * q * 0.6); }
    else { d.carb = Math.min(1, d.carb + n * 0.6); d.gras = Math.min(1, d.gras + (p.energiaChim || 0) * q * 0.4); }
    d.vit = Math.min(1, d.vit + (p.bioattivo || 0) * q * 0.5);
    d.min = Math.min(1, d.min + (p.conducibilita || 0) * q * 0.3);
  }
  // Foraggiare vegetazione selvatica: soprattutto carboidrati e un filo di vitamine.
  nutriDaVegetazione(npc, quanto) {
    const d = npc.dieta;
    d.carb = Math.min(1, d.carb + quanto * 1.2);
    d.vit = Math.min(1, d.vit + quanto * 0.9);   // frutti ed erbe: vitamine
    d.min = Math.min(1, d.min + quanto * 0.6);   // le piante portano sali dal suolo
    d.prot = Math.min(1, d.prot + quanto * 0.25); // un po' di proteine vegetali
    d.gras = Math.min(1, d.gras + quanto * 0.2);
  }

  // Il cibo selvatico non è «vegetazione»: è la pianta che cresce QUI. Finora era un numero solo,
  // uguale in tutto il mondo — e un mondo dove ogni boccone è identico non può avere né cucine, né
  // erboristi, né bacche di cui i vecchi dicono «quella no».
  //
  // Ora fra ciò che cresce in questo posto si mangia ciò che si desidera di più, e quel che si
  // mangia lascia il segno due volte: nel corpo (nutre, cura o avvelena secondo le sue proprietà)
  // e nella memoria (finisce nella traccia, e se poco dopo starai male sarà lei a prendersi la
  // colpa). Da qui vengono da soli i piatti di una regione, i rimedi e le superstizioni.
  foraggia(npc, idx, eaten) {
    const w = this.world;
    let best = null, bv = -1e9;
    for (const m of this.registry.materials) {
      if (!m.rinnovabile || m.sintetico) continue;        // si coglie solo ciò che ricresce
      const c = this.registry.concentrationAt(m.id, idx);
      if (c < 0.12) continue;
      const ph = physiology(m.props);
      if (ph.nutrimento < 0.03 && ph.beneficio < 0.1) continue;
      // Non si mastica l'aria. Che una cosa si possa mandare giù è fisica, non gusto — e quanto
      // valga la pena farlo è tutt'altra questione, che decide la fame.
      const giu = puo("mangiare", m.props, w.temperature[idx]);
      if (giu <= 0) continue;
      const chiave = "m" + m.id;
      const v = valuta(npc, {
        id: chiave, nutre: ph.nutrimento, cura: ph.beneficio, nuoce: ph.danno,
        gusto: sapore(m.props), dissete: dissete(m.props), raro: 0, bramato: brama(this, m.id), fatica: 0,
      }, propensione(npc, chiave)) * (0.55 + c) * giu;
      if (v > bv) { bv = v; best = m; }
    }
    // Dove non cresce niente di riconoscibile si bruca quel che c'è, e si campa poco. Qui c'era
    // scritto 2,2: brucare scarti toglieva PIÙ fame che mangiare un cibo mediocre, e conveniva
    // non riconoscere niente. Adesso riempie appena, come deve.
    if (!best) {
      npc.fame = Math.max(0, npc.fame - eaten * 0.9);
      this.nutriDaVegetazione(npc, eaten * 1.5);
      return;
    }
    const ph = physiology(best.props);
    const chiave = "m" + best.id;
    // QUANTO TI SFAMA. Prima c'era un 1,05 fisso: qualunque cosa passasse il filtro del
    // commestibile toglieva quasi la stessa fame, e il nutrimento contava poco. Ma sono due cose
    // diverse — la pancia si tacita col volume, il corpo si regge su quello che riesce a
    // digerire — e sono già misurate tutt'e due. Il volume resta (una cosa pesante riempie
    // davvero), ma è breve; a reggere è il nutrimento. Così la segatura riempie e non nutre, e
    // chi campa di roba che riempie e non nutre lo paga con la carenza.
    npc.fame = Math.max(0, npc.fame - eaten * (0.25 + sazieta(best.props) * 0.9 + ph.nutrimento * 1.9));
    // Bere non è mangiare qualcosa di bagnato: da un liquido si tira giù molta più acqua che
    // spremendo un frutto. La differenza la fa lo stato, non la ricetta.
    const bevuta = puo("bere", best.props, w.temperature[idx]);
    npc.sete = Math.max(0, npc.sete - eaten * dissete(best.props) * (1.2 + bevuta * 2.2));
    this.nutriDaMateriale(npc, best, eaten * 2);
    if (ph.danno > 0.01) {
      npc.salute = Math.max(0, npc.salute - ph.danno * eaten * 1.7);
      npc.dolore = Math.min(1, npc.dolore + ph.danno * eaten * 1.2);
    }
    if (ph.beneficio > 0.01) npc.salute = Math.min(1, npc.salute + ph.beneficio * eaten * 0.9);
    const g = sapore(best.props);
    if (g > 0.28) npc.emo.gioia = Math.min(1, npc.emo.gioia + (g - 0.28) * 0.35);
    assuefai(npc, chiave, 0.2);
    if (npc._traccia) npc._traccia.set(chiave, 1);
    npc._ultimoCibo = best.nome;
    this.foraggiato = (this.foraggiato || 0) + 1;
  }

  // Bisogno "mangiare". Non si prende più la prima cosa commestibile che capita: si guarda cosa si
  // ha, si valuta, e si sceglie quella che si DESIDERA di più — che non è sempre la più nutriente,
  // perché a scegliere non è un contabile ma un affamato con dei vizi. Da qui, e solo da qui, viene
  // che esistano cibi pregiati e cibi da poveri: nessuno li ha marchiati così, li ha scelti la gente.
  eatKnownFood(npc) {
    let scelta = null, meglio = -1e9;
    for (const b of this.ricetteNote(npc)) {
      if (b.edificio || !AFF.nutre(b) || b.verdetto !== "utile") continue;
      if (!b.ingredienti.every((i) => npc.hasMat(i.matId, i.qta))) continue;
      // Che cosa È questo piatto, secondo le proprietà di ciò che ci sta dentro.
      let gusto = 0, tiene = 0, nuoce = 0, rar = 0, bram = 0, peso = 0, q = 0, acq = 0, primo = null;
      for (const i of b.ingredienti) {
        const m = this.registry.mat(i.matId);
        if (!m) continue;
        if (!primo) primo = m;
        gusto += sapore(m.props) * i.qta; tiene += sazieta(m.props) * i.qta;
        acq += dissete(m.props) * i.qta;
        nuoce += (m.props.tossicita || 0) * i.qta;
        rar += raro(this, m.id) * i.qta; bram += brama(this, m.id) * i.qta;
        peso += i.qta; q += i.qta;
      }
      if (!q) continue;
      gusto /= q; tiene /= q; nuoce /= q; rar /= q; bram /= q; acq /= q;
      const chiave = primo ? "m" + primo.id : null;
      const v = valuta(npc, {
        id: chiave, nutre: (b.eff && b.eff.effNutrimento) || 0, cura: (b.eff && b.eff.effCura) || 0, nuoce,
        gusto, dissete: acq, raro: rar, bramato: bram, fatica: peso * 0.03,
      }, chiave ? propensione(npc, chiave) : 0);
      if (v > meglio) { meglio = v; scelta = { b, gusto, tiene, acq, chiave }; }
    }
    // Se tutto ciò che ha in mano gli ripugna, digiuna — finché la fame non lo costringe.
    if (!scelta || (meglio < 0 && npc.fame < 0.75)) return false;
    const { b, gusto, tiene, acq, chiave } = scelta;
    for (const i of b.ingredienti) {
      npc.inventory.set(i.matId, npc.inventory.get(i.matId) - i.qta);
      this.nutriDaMateriale(npc, this.registry.mat(i.matId), i.qta);
      assuefai(npc, "m" + i.matId, 0.26);
    }
    // Quanto sazia dipende da cosa hai mangiato: una cosa densa tiene, una acquosa passa subito.
    npc.fame = Math.max(0, npc.fame - (0.22 + tiene * 0.62));
    if (acq > 0.05) npc.sete = Math.max(0, npc.sete - acq * 0.5);
    // E aver mangiato bene mette di buon umore — anche questo è biologia, non un premio.
    if (gusto > 0.5) npc.emo.gioia = Math.min(1, npc.emo.gioia + (gusto - 0.5) * 0.5);
    if (chiave) npc._traccia && npc._traccia.set(chiave, 1);
    return true;
  }

  // AFFORDANCE (c) — LE POSSIBILITÀ: ogni scoperta suggerisce le prossime. Un inventore esperto
  // non mescola a caso: parte da una cosa NOTA e utile e la VARIA (un ingrediente in più, una
  // quantità diversa, un altro processo). "Il tronco galleggia → due tronchi → zattera → vela":
  // ogni passo nasce dal precedente. Più conoscenza = più possibilità = scoperte più probabili.
  guidedIngredients(npc) {
    const note = [];
    for (const sig of npc.sapere) {
      const b = this.knowledge.beliefs.get(sig);
      if (b && !b.edificio && b.verdetto === "utile" && b.ingredienti.length) note.push(b);
    }
    if (!note.length) return null;
    const base = note[(this.rng() * note.length) | 0];
    const ings = base.ingredienti.map((i) => ({ matId: i.matId, qta: i.qta }));
    const owned = [...npc.inventory.entries()].filter(([, n]) => n > 0).map(([id]) => id)
      .filter((id) => !ings.some((i) => i.matId === id));
    if (owned.length && this.rng() < 0.7 && ings.length < 3) {
      ings.push({ matId: owned[(this.rng() * owned.length) | 0], qta: 1 }); // nuovo ingrediente
    } else {
      ings[(this.rng() * ings.length) | 0].qta = 1 + ((this.rng() * 3) | 0); // dose diversa
    }
    if (!ings.every((i) => npc.hasMat(i.matId, i.qta))) return null; // deve possederli davvero
    return ings;
  }

  // Sceglie fino a 3 materiali distinti dall'inventario per un esperimento.
  pickIngredients(npc, max = 3) {
    const owned = [...npc.inventory.entries()].filter(([, n]) => n > 0).map(([id]) => id);
    if (owned.length < 2) return null;
    // mescola
    for (let i = owned.length - 1; i > 0; i--) { const j = (this.rng() * (i + 1)) | 0; [owned[i], owned[j]] = [owned[j], owned[i]]; }
    const k = 2 + ((this.rng() * (max - 1)) | 0);
    return owned.slice(0, Math.min(k, owned.length)).map((id) => ({ matId: id, qta: 1 }));
  }

  experiment(npc) {
    // Prima le POSSIBILITÀ (variazioni del noto, ∝ intelligenza), poi il caso puro.
    let ings = null;
    if (npc.sapere.size && this.rng() < P.probGuidato + npc.intelligenza * 0.4) {
      ings = this.guidedIngredients(npc);
      if (ings) this.esperimentiGuidati = (this.esperimentiGuidati || 0) + 1;
    }
    if (!ings) ings = this.pickIngredients(npc);
    if (!ings) return;
    for (const i of ings) npc.inventory.set(i.matId, npc.inventory.get(i.matId) - i.qta); // consuma
    // Sceglie anche un PROCESSO (spesso grezzo; a volte lavora la materia): +intelligenza -> più processi.
    const proc = this.rng() < 0.35 * (0.4 + npc.intelligenza) ? PROCESSES[(this.rng() * PROCESSES.length) | 0].id : "grezzo";
    const c = combine(ings, this.registry, proc);
    const attr = c.attr;
    const eff = analyze(c);
    // Con l'affordance totale il nome della cosa non lo dà il motore: lo dà il POPOLO di chi
    // sta sperimentando, e popoli diversi arrivano a nomi (e a confini) diversi.
    const { categoria } = P.affordanceTotale
      ? classifyCulturale(attr, this.culturaDi(npc))
      : classify(attr);
    const esito = simulate(attr, eff, this.rng);
    // Effetto sulla salute di chi sperimenta.
    npc.salute = Math.max(0, Math.min(1, npc.salute + esito.beneficio - esito.danno));
    // Un esperimento tossico/esplosivo INQUINA il territorio (cicatrice sul mondo).
    const scoria = (attr.tossicita || 0) + (attr.energiaChim || 0) * (attr.reattivita || 0);
    if (scoria > 0.3) { const i = this.tileIdx(npc.x, npc.y); this.pollution[i] = Math.min(1, this.pollution[i] + scoria * 0.15); }
    // Un'ESPLOSIONE può appiccare un incendio reale che si propaga.
    if (esito.incidente === "è esploso") {
      if (igniteFire(this, this.tileIdx(npc.x, npc.y), 0.5 + (attr.energiaChim || 0) * 0.5)) this.roghiTot++;
    }
    const { belief } = this.knowledge.record({
      ingredienti: ings, categoria, colore: mixColor(ings, this.registry), processo: proc,
      attr, eff, esito, nome: inventName(ings, this.registry, proc), anno: this.anno, autore: "npc" + npc.id,
    });
    // Un'opera eccezionale di un artefice eccezionale diventa un ARTEFATTO unico (9.16).
    if (esito.riuscito) forseArtefatto(this, npc, belief);
    // E se la cosa è riuscita ed è stabile, da adesso ESISTE: entra nel mondo come materia, con le
    // proprietà che le ha dato la lavorazione. Da qui in poi si può tenere in mano, barattare,
    // lasciare in eredità, portare addosso — e se è liscia e luccica, ostentare. È il motivo per
    // cui l'oro lavorato può valere più dell'oro grezzo: non è più lo stesso oggetto.
    if (esito.riuscito) this.forseNuovaMateria(npc, belief, ings, proc);
    npc._att = "sperimentare";
    npc.sapere.add(signature(ings, proc)); // l'inventore IMPARA ciò che ha scoperto
    npc.azioni.invenzione++;
    npc.oggettiCreati++; this.oggettiTot++;
    // Cronaca: prima volta che il mondo scopre questa categoria.
    if (esito.riuscito && !this.categorieViste.has(categoria.nome)) {
      this.categorieViste.add(categoria.nome);
      this.chronicle(`Prima scoperta: ${categoria.nome} (${inventName(ings, this.registry, proc)})`);
    }
    // Un esperimento DANNOSO (veleno/esplosione a contatto) può generare un'epidemia,
    // con mortalità/contagio/difficoltà di cura derivati dagli attributi della miscela.
    // Un contatto pericoloso può generare un'epidemia: pericoloso lo dicono gli EFFETTI.
    if (!esito.riuscito || AFF.nuoce({ attr, eff })) {
      maybeSpawnDisease(this, npc, attr, eff);
    }
  }

  // Che cosa si è perso. Si conta quanti pezzi ne girano ancora: quella di cui non resta niente in
  // mano a nessuno non la sa più fare nessuno, e sparisce dal mondo — la ricetta resta nei libri e
  // nelle teste, ma la cosa non c'è più finché qualcuno non la rifà.
  dimenticaUnaMateria() {
    const inGiro = new Map();
    for (const npc of this.npcs) {
      if (!npc.vivo) continue;
      for (const [id, q] of npc.inventory) if (q > 0) inGiro.set(id, (inGiro.get(id) || 0) + q);
    }
    let vittima = null, firmaVittima = null, minimo = Infinity;
    for (const [firma, id] of this._sintetiche) {
      const q = inGiro.get(id) || 0;
      if (q < minimo) { minimo = q; vittima = id; firmaVittima = firma; }
    }
    if (vittima == null || minimo > 2) return false;    // se girano tutte, non si butta niente
    this._sintetiche.delete(firmaVittima);
    this.registry.rimuovi(vittima);
    for (const npc of this.npcs) if (npc.inventory.has(vittima)) npc.inventory.delete(vittima);
    this.materiePerdute = (this.materiePerdute || 0) + 1;
    return true;
  }

  // FARE. Non scoprire: fare.
  //
  // C'era solo l'invenzione — le cose venivano fuori per caso e non si producevano mai. Ma chi sa
  // già come si fa una cosa e ha di che farla, la rifà: è la differenza fra l'inventore e
  // l'artigiano, ed è quella che riempie un mondo di oggetti invece di lasciarlo pieno di idee.
  //
  // Si rifà ciò che si VUOLE, con la solita somma: il vanitoso rifà quel che luccica, chi non ha
  // attrezzi rifà quel che è duro abbastanza da servirgli. Nessuno «produce per la comunità».
  maybeFabbrica(npc) {
    if (!this._sintetiche || !this._sintetiche.size) return;
    if (this.rng() > 0.06 * (0.35 + (npc.pazienza || 0.5))) return;
    let scelta = null, meglio = 0.08;
    for (const b of this.ricetteNote(npc)) {
      if (b.edificio || b.verdetto !== "utile" || !b.eff) continue;
      const id = this._sintetiche.get(b.signature);
      if (id == null) continue;
      if (!b.ingredienti.every((i) => npc.hasMat(i.matId, i.qta))) continue;
      const mm = this.registry.mat(id);
      if (!mm) continue;
      const v = ostentabile(mm) * (0.35 + npc.superbia * 0.9 + npc.avidita * 0.5)
        + (mm.props.durezza || 0) * 0.55 * (1 - npc.strumento)
        + (mm.props.taglio || 0) * 0.4 * (1 - npc.strumento);
      if (v > meglio) { meglio = v; scelta = { b, id }; }
    }
    if (!scelta) return;
    for (const i of scelta.b.ingredienti) {
      npc.inventory.set(i.matId, npc.inventory.get(i.matId) - i.qta);
    }
    npc.addMat(scelta.id, 1);
    // A un artigiano di lungo corso capita di farne due invece che una: non è magia, è mestiere.
    if (this.rng() < perizia(npc, "opera") * 0.45) npc.addMat(scelta.id, 1);
    npc._att = "fabbricare";
    npc.azioni.opera = (npc.azioni.opera || 0) + 1;
    npc.reputazione.artefice = (npc.reputazione.artefice || 0) + 1;
    this.fabbricati = (this.fabbricati || 0) + 1;
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // QUANDO UNA COSA FATTA DIVENTA UNA COSA.
  //
  // Finora quel che si fabbricava restava un'idea: una ricetta nella testa di chi l'aveva trovata.
  // L'inventario conteneva solo materia grezza, e perfino gli attrezzi erano un numero derivato da
  // ciò che uno sapeva fare — non un arnese che si teneva in mano. Così l'oro lavorato splendeva di
  // più *in teoria*, e nessuno poteva portarselo al collo.
  //
  // Adesso una scoperta stabile si iscrive fra le materie del mondo. Non ha giacimenti: non sta
  // sottoterra, esiste solo finché c'è qualcuno capace di rifarla. Ma per tutto il resto è materia
  // come le altre — e tutte le leggi scritte finora le si applicano senza dover aggiungere niente.
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  forseNuovaMateria(npc, belief, ings, proc) {
    if (proc === "grezzo") return;                       // se non l'hai lavorata, non hai fatto nulla
    if (!belief.eff || belief.eff.stabilita < 0.55) return; // ciò che non tiene insieme non è una cosa
    if (!this._sintetiche) this._sintetiche = new Map();
    const firma = belief.signature || signature(ings, proc);
    const gia = this._sintetiche.get(firma);
    if (gia) { npc.addMat(gia, 1); return; }             // già conosciuta: se ne fa un altro pezzo
    // Il mondo non può riempirsi all'infinito di cose diverse. Ma un tetto secco congelerebbe la
    // novità per sempre — dopo le prime quarantotto, nessuna invenzione potrebbe più diventare una
    // cosa. Invece cede il posto quella che non fa più nessuno: se di una cosa non ne resta un
    // pezzo in mano a nessuno e nessuno la rifà, quella cosa si è persa, ed è giusto così.
    if (this._sintetiche.size >= 48 && !this.dimenticaUnaMateria()) return;

    const mat = makeMaterial({
      nome: belief.nome || "cosa", descrizione: "Fatta da qualcuno, non trovata.",
      rarita: "rarissimo", ambiente: "terra", colore: belief.colore || "#c0c0c0",
      props: belief.attr, sintetico: true,
    });
    this.registry.add(mat);
    this._sintetiche.set(firma, mat.id);
    npc.addMat(mat.id, 1);
    npc.reputazione.artefice = (npc.reputazione.artefice || 0) + 1;
    this.materieCreate = (this.materieCreate || 0) + 1;
    if (this.materieCreate === 1) this.chronicle("Qualcuno fabbrica una cosa che in natura non esiste");
  }

  // Usa una medicina che l'NPC CONOSCE e ritiene "utile", se ha gli ingredienti.
  useMedicine(npc) {
    for (const b of this.ricetteNote(npc)) {
      if (b.edificio || !b.eff) continue; // gli edifici non hanno effetti-miscela
      if (b.verdetto !== "utile" || b.affidabilita < 0.4) continue;
      if (b.eff.effCura <= b.eff.effVeleno) continue;
      if (!b.ingredienti.every((i) => npc.hasMat(i.matId, i.qta))) continue;
      for (const i of b.ingredienti) npc.inventory.set(i.matId, npc.inventory.get(i.matId) - i.qta);
      const esito = simulate(b.attr, b.eff, this.rng);
      // Chi ha curato mille volte sbaglia meno la dose: lo stesso rimedio, in mani esperte, giova
      // di più e avvelena di meno.
      const mano = bonus(npc, "cura", 0.7, 0.7);
      npc.salute = Math.max(0, Math.min(1, npc.salute + esito.beneficio * mano - esito.danno / mano));
      npc.azioni.cura++;
      this.knowledge.record({ ingredienti: b.ingredienti, categoria: b.categoria, colore: b.colore, attr: b.attr, eff: b.eff, esito, anno: this.anno });
      return;
    }
  }

  reproduce(ready, dt) {
    // IL SALVAGENTE NON DEVE MAI FARE DA REGOLA. Sta a 20 000 e la terra ne nutriva 23 845: si
    // toccavano, e un numero messo lì per non far morire il browser finiva per decidere la storia.
    // Adesso vale il più alto fra quello che hai messo tu e quello che la terra regge davvero:
    // così il freno resta sempre e solo la fame.
    const salvagente = Math.max(P.tettoPopolazione, Math.ceil((this.capienzaTerra || 0) * 1.5));
    if (this.npcs.length > salvagente) return;
    const males = ready.filter((n) => n.sex === "M");
    const females = ready.filter((n) => n.sex === "F");
    for (const f of females) {
      // Cerca un maschio pronto abbastanza vicino.
      let partner = null, meglio = -1e9;
      for (const m of males) {
        if (m.cooldownFiglio > 0) continue;
        const d = (m.x - f.x) ** 2 + (m.y - f.y) ** 2;
        if (d > 36) continue;                       // deve essere lì: nessuno attraversa il mondo
        const legame = (f.memoria.get(m.id) || 0) + (m.memoria.get(f.id) || 0);
        const v = -d / 36 + legame * 1.7;
        if (v > meglio) { meglio = v; partner = m; }
      }
      if (!partner) continue;
      // CONCEPIMENTO (non nascita): inizia la gestazione. Il figlio nascerà mesi dopo (partorisci).
      f.incinta = P.gestazione + this.rng() * 0.25;
      f.padreDelFiglio = partner;
      // il cooldown è più breve di prima: ora è la GESTAZIONE stessa a distanziare le nascite
      f.cooldownFiglio = P.cooldownFiglio; partner.cooldownFiglio = P.cooldownFiglio * 0.7;
      f.stanchezza = Math.min(1.2, f.stanchezza + 0.3);
    }
  }

  // PARTO: al termine della gestazione nasce il figlio, che eredita geni, casa, credo e lingua.
  partorisci(madre) {
    const padre = madre.padreDelFiglio;
    madre.incinta = 0; madre.padreDelFiglio = null;
    if (!padre) return;
    const genes = childGenes(madre.genes, padre.genes, this.rng);
    const sex = this.rng() < 0.5 ? "M" : "F";
    const child = new NPC(madre.x + (this.rng() - 0.5), madre.y + (this.rng() - 0.5), sex, genes, this.rng);
    // Il parto è rischioso: costa salute alla madre (mortalità puerperale emergente).
    madre.salute = Math.max(0.05, madre.salute - P.costoParto - this.rng() * 0.1);
    madre.stanchezza = Math.min(1.2, madre.stanchezza + 0.4);
    if (madre.casa) {
      child.casa = [madre.casa[0], madre.casa[1]]; child.casaLivello = Math.max(1, madre.casaLivello - 1);
      if (madre.casaMat) child.casaMat = new Map(madre.casaMat);
    }
    child.credo = madre.credo != null ? madre.credo : padre.credo;
    child.generazione = Math.max(madre.generazione, padre.generazione) + 1;
    // La lingua si EREDITA (media dei genitori + deriva): le lingue divergono per generazioni.
    child.lingua = Math.max(0, Math.min(1, (madre.lingua + padre.lingua) / 2 + (this.rng() - 0.5) * 0.03));
    // I figli ereditano un po' delle difese immunitarie della madre (immunità passiva).
    child.immunita = Math.min(0.5, madre.immunita * 0.5);
    this.npcs.push(child);
    this.nascite++;
    madre.figli++; padre.figli++;
    // Aver fatto un figlio insieme lega. È attaccamento — biologia, non un istituto: non c'è
    // nessuna soglia da superare, nessun vincolo che scatta, e il legame può crescere con più di
    // una persona o spegnersi col tempo come qualunque altro.
    const lega = (a, b) => a.memoria.set(b.id, Math.min(1, (a.memoria.get(b.id) || 0) + 0.26 + a.empatia * 0.3));
    lega(madre, padre); lega(padre, madre);
    (madre._prole || (madre._prole = [])).push(child.id);
    (padre._prole || (padre._prole = [])).push(child.id);
  }

  // Quante persone hanno, in questo momento, un legame reciproco così forte da sembrare una coppia
  // a chi le guarda. Non è uno stato civile: è una misura, e domani può essere un altro numero.
  contaLegamiForti() {
    let c = 0;
    const idx = new Map();
    for (const a of this.npcs) if (a.vivo) idx.set(a.id, a);
    for (const a of this.npcs) {
      if (!a.vivo || a.eta < 12) continue;
      for (const [id, v] of a.memoria) {
        if (v < 0.8 || id < a.id) continue;
        const b = idx.get(id);
        if (b && b.vivo && (b.memoria.get(a.id) || 0) >= 0.8) c++;
      }
    }
    return c;
  }

  mediaEsperienze() {
    let s = 0, k = 0;
    for (const a of this.npcs) if (a.vivo && a.esperienze) { s += a.esperienze.size; k++; }
    return k ? +(s / k).toFixed(1) : 0;
  }

  // Il bioma non è un'etichetta appiccicata alla nascita del mondo: è ciò che quel posto È, adesso,
  // date la sua acqua e il suo calore. Se cambia l'acqua, cambia il posto — e cambia in entrambe le
  // direzioni. Passata di rado e a scaglioni, perché è cara.
  seguiAridita(dt) {
    if (!this.moisture0) return;
    const w = this.world, N = w.width * w.height;
    this._aridCur = (this._aridCur || 0);
    const quanti = Math.min(N, 3000);
    for (let k = 0; k < quanti; k++) {
      const i = (this._aridCur = (this._aridCur + 1) % N);
      if (isWater(this.biome0[i])) continue;              // il mare non si desertifica
      // Non si confronta l'umidità con una soglia assoluta — sarebbe riclassificare il mondo con
      // un metro mio. Si confronta con quanta acqua aveva QUEL posto: cambia solo ciò che abbiamo
      // cambiato noi, e torna com'era appena smettiamo.
      const caduta = this.moisture0[i] - w.moisture[i];
      const secco = caduta > 0.07 && w.moisture[i] < 0.26 && w.temperature[i] > 0.42;
      const umido = caduta < 0.02;
      if (secco && w.biome[i] !== BIOME.DESERT) {
        // anche qui la resa cambia, e con lei quanta gente questa terra può nutrire
        w.biome[i] = BIOME.DESERT; this.capienzaTerra -= this.foodCap[i]; this.foodCap[i] = capacitaVitale(w, i); this.capienzaTerra += this.foodCap[i];
        this.desertificati = (this.desertificati || 0) + 1;
        if (this.desertificati === 200) this.chronicle("Le terre spremute troppo a lungo si sono fatte deserto", 40);
      } else if (umido && w.biome[i] === BIOME.DESERT && this.biome0[i] !== BIOME.DESERT) {
        w.biome[i] = this.biome0[i]; this.capienzaTerra -= this.foodCap[i]; this.foodCap[i] = capacitaVitale(w, i); this.capienzaTerra += this.foodCap[i];
        this.desertificati = Math.max(0, (this.desertificati || 0) - 1);
        this.rinverditi = (this.rinverditi || 0) + 1;
      }
    }
  }

  // Statistiche aggregate per l'interfaccia.
  stats() {
    let vivi = 0, sommaEta = 0, m = 0, fFem = 0, fameSum = 0, seteSum = 0, infetti = 0, immuni = 0;
    for (const n of this.npcs) {
      if (!n.vivo) continue;
      vivi++; sommaEta += n.eta; fameSum += n.fame; seteSum += n.sete;
      if (n.sex === "M") m++; else fFem++;
      if (n.infetto != null) infetti++;
      if (n.immune) immuni++;
    }
    let emoSum = { gioia: 0, paura: 0, rabbia: 0, lealta: 0 };
    const mestieri = {}; const saputeVive = new Set(); let strumentoSum = 0;
    let riparoSum = 0, conCasa = 0, casaLivSum = 0, migranti = 0, credenti = 0;
    let carenzaSum = 0, immunitaSum = 0, gravide = 0, doloreSum = 0, genSum = 0;
    const dialetti = new Set(); // bucket di lingua occupati = quante "parlate" convivono
    // Valori culturali = media dei tratti della popolazione (emergono, non imposti).
    const val = { aggressivita: 0, empatia: 0, avidita: 0, ambizione: 0, onesta: 0, invidia: 0, curiosita: 0 };
    for (const n of this.npcs) {
      if (!n.vivo) continue;
      emoSum.gioia += n.emo.gioia; emoSum.paura += n.emo.paura; emoSum.rabbia += n.emo.rabbia; emoSum.lealta += n.emo.lealta;
      if (n.mestiere) mestieri[n.mestiere] = (mestieri[n.mestiere] || 0) + 1;
      strumentoSum += n.strumento || 0;
      riparoSum += n.riparo || 0; if (n.casa) { conCasa++; casaLivSum += n.casaLivello; }
      if (n.migrante) migranti++; if (n.credo != null) credenti++;
      dialetti.add((n.lingua / 0.08) | 0);
      genSum += n.generazione || 0;
      carenzaSum += n.carenza || 0; immunitaSum += n.immunita || 0; doloreSum += n.dolore || 0;
      if (n.incinta > 0) gravide++;
      val.aggressivita += n.aggressivita; val.empatia += n.empatia; val.avidita += n.avidita;
      val.ambizione += n.ambizione; val.onesta += n.onesta; val.invidia += n.invidiaT; val.curiosita += n.curiosita;
      for (const s of n.sapere) saputeVive.add(s);
    }
    if (vivi) for (const k in val) val[k] /= vivi;
    this.generazioneMedia = vivi ? genSum / vivi : 0;
    let erb = 0, pred = 0, pesci = 0, predM = 0, inventori = 0, onnivori = 0;
    let tagliaErbSum = 0, tempErbSum = 0, tagliaPredSum = 0, carnSum = 0, creature = 0;
    // I "tipi" di fauna non esistono nel motore: qui vengono LETTI dai geni solo per mostrarli.
    for (const a of this.creature) {
      if (!a.vivo) continue;
      creature++; carnSum += a.dna.carnivoria;
      if (a.dna.aquatic) { if (a.dna.carnivoria > 0.6) predM++; else pesci++; continue; }
      if (a.dna.carnivoria > 0.6) { pred++; tagliaPredSum += a.dna.taglia; }
      else if (a.dna.carnivoria > 0.35) onnivori++;
      else { erb++; tagliaErbSum += a.dna.taglia; tempErbSum += a.dna.tempIdeale; }
    }
    for (const n of this.npcs) if (n.vivo && n.inventore) inventori++;
    let vegSum = 0;
    for (let i = 0; i < this.food.length; i++) vegSum += this.food[i];
    return {
      vivi, maschi: m, femmine: fFem, inventori,
      etaMedia: vivi ? sommaEta / vivi : 0,
      fameMedia: vivi ? fameSum / vivi : 0,
      seteMedia: vivi ? seteSum / vivi : 0,
      pioggia: !!this.pioggia,
      nascite: this.nascite, morti: this.morti,
      oggetti: this.oggettiTot, anno: this.anno,
      erbivori: erb, predatori: pred, pesci, predatoriMarini: predM, onnivori, creature,
      carnivoriaMedia: creature ? carnSum / creature : 0, vegetazione: vegSum,
      faunaTagliaErb: erb ? tagliaErbSum / erb : 0, faunaTempErb: erb ? tempErbSum / erb : 0,
      faunaTagliaPred: pred ? tagliaPredSum / pred : 0,
      inquinamento: this.inquinamentoTot || 0,
      fertilita: this.fertilitaMedia != null ? this.fertilitaMedia : 1,
      riparoMedio: vivi ? riparoSum / vivi : 0, conCasa, casaLivMedio: conCasa ? casaLivSum / conCasa : 0,
      migranti, emigrati: this.emigrati || 0,
      strade: this.strade.size, ospitati: this.ospitati || 0, scacciati: this.scacciati || 0,
      propagande: this.propagande || 0,
      esplorato: this.scopertoCount / this.scoperto.length,
      campi: this.campi.size, carogne: this.carcasse.size, spazzinate: this.spazzinate || 0,
      acqueMalsane: this.acqueMalsane || 0,
libri: this.libri ? this.libri.length : 0, libriScritti: this.libriScritti || 0,
      letture: this.letture || 0, eredita: this.eredita_ || 0,
      coppie: this.contaLegamiForti(), esperienzeMedie: this.mediaEsperienze(),
      generazione: this.generazioneMedia || 0,
      era: this.ere && this.ere.length ? this.ere[this.ere.length - 1].nome : null,
      ere: this.ere ? this.ere.length : 0,
      generiCulturali: this.lessici ? [...this.lessici.values()].reduce((s, l) => s + l.generi.size, 0) : 0,
      lessici: this.lessici ? this.lessici.size : 0,
      repressioni: this.repressioni || 0, elargizioni: this.elargizioni || 0,
      congiureSventate: this.congiureSventate || 0,
      caseDistrutte: this.caseDistrutte || 0, edificiDistrutti: this.edificiDistrutti || 0,
      battaglie: this.battaglie || 0,
      opere: this.opere || 0, tradizioni: this.tradizioni ? this.tradizioni.size : 0, scismi: this.scismi || 0,
      spedizioni: this.spedizioni || 0, esplorazioni: this.esplorazioni || 0, rotazioni: this.rotazioni || 0,
      riavvicinamenti: this.riavvicinamenti || 0,
      falseCredenze: [...this.knowledge.beliefs.values()].filter((b) => b.falsaCredenza).length,
      tributi: this.tributi || 0, doni: this.doni || 0, estorsioni: this.estorsioni || 0,
      punizioni: this.punizioni || 0, processi: this.processi || 0, costretti: this.costretti || 0,
      normaFurto: this.norme ? this.norme.furto : 0, classi: this.classi || {},
      disuguaglianza: this.disuguaglianza || 0, maestri: this.insegnamentiMaestro || 0,
      miti: (this.miti || []).length, voci: (this.voci || []).length, calunnie: this.calunnie || 0,
      artefatti: (this.artefatti || []).length, scorte: this.scorteTot || 0,
      carenza: vivi ? carenzaSum / vivi : 0, immunitaMedia: vivi ? immunitaSum / vivi : 0,
      gravide, dolore: vivi ? doloreSum / vivi : 0,
      notte: !!this.notte, ora: this.ora || 0, luna: this.luna || 0, eclissi: this.eclissi > 0,
      umidita: this.umiditaAria || 0, siccita: this.siccita || 0, vento: this.vento || 0,
      cenere: this.cenere || 0, eraGlaciale: this.eraGlaciale || 0,
      terremoti: this.terremoti || 0, eruzioni: this.eruzioni || 0, frane: this.frane || 0,
      grandinate: this.grandinate || 0, eclissiTot: this.eclissiTot || 0, comete: this.comete || 0,
      dialetti: dialetti.size, incomprensioni: this.incomprensioni || 0,
      curePrestate: this.curePrestate || 0, esperimentiGuidati: this.esperimentiGuidati || 0,
      credenti, religioni: (this.religioni || []).length, memi: (this.memi || []).length,
      guerre: this.guerreAttive || 0, razzie: this.razzieTot || 0,
      incendiAttivi: this.fire.size, roghiTot: this.roghiTot || 0, mortiFuoco: this.mortiFuoco || 0,
      infetti, immuni, mortiMalattia: this.mortiMalattia, epidemieNate: this.epidemieNate || 0,
      malattiaAttiva: this.disease && infetti > 0 ? this.disease : null,
      predKills: this.predKills, huntKills: this.huntKills, fishKills: this.fishKills,
      ribelli: this.ribelli || 0, malcontento: this.malcontentoMedio || 0,
      aiuti: this.aiuti || 0, aggressioni: this.aggressioni || 0, insegnamenti: this.insegnamenti || 0,
      furti: this.furti || 0, copiature: this.copiature || 0, omicidi: this.omicidi || 0,
      baratti: this.baratti || 0, moneta: this.moneta != null ? (this.registry.mat(this.moneta) || {}).nome : null,
      valori: val,
      edifici: this.buildings.length, edificiScoperti: this.edificiScoperti || 0,
      stagione: this.stagione, mestieri,
      conoscenzeVive: saputeVive.size, conoscenzeTotali: this.knowledge.size,
      strumentoMedio: vivi ? strumentoSum / vivi : 0, etaMetalli: !!this.etaMetalli,
      emo: vivi ? { gioia: emoSum.gioia / vivi, paura: emoSum.paura / vivi, rabbia: emoSum.rabbia / vivi, lealta: emoSum.lealta / vivi } : null,
    };
  }
}
