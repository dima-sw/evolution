// ═══ CREATURE — un solo tipo di essere vivente ══════════════════════════════════════════════
// Qui non esistono "erbivori", "predatori", "pesci": esistono CREATURE con un DNA. Cosa mangiano,
// da cosa scappano, dove possono vivere e chi possono uccidere non è deciso da un contenitore ma
// dai loro geni, letti a ogni istante. Le conseguenze:
//
//   • la NICCHIA può cambiare per evoluzione — se in una stirpe la carnivoria muta verso l'alto,
//     i discendenti cominciano a cacciare, e nessuno glielo ha detto;
//   • la catena alimentare ha PIÙ LIVELLI e si riorganizza da sola: chi è predatore per uno può
//     essere preda per un altro più grande, e basta che le taglie cambino perché i ruoli si
//     ribaltino;
//   • l'onnivoria non è una categoria a parte, è semplicemente una carnivoria di mezzo.
//
// Le etichette "erbivoro"/"predatore" sopravvivono solo dove serve MOSTRARE qualcosa a chi guarda:
// sono una lettura dei geni fatta a posteriori, non una proprietà dell'animale.
import { isWater } from "./world.js";
import { P } from "./params.js";
import { makeDNA, childDNA, dnaColor, dnaDrops } from "./species.js";

const SAFETY = () => P.tettoFauna;
let _aid = 0;

// Tutto ciò che una creatura È, derivato dai suoi geni. Niente è scritto per specie.
// Il generatore arriva da fuori: lo stesso seme deve dare le stesse bestie.
function makeCreatura(x, y, dna, neonato, rnd = Math.random) {
  const lifespan = 12 + dna.taglia * 20;
  const base = dna.aquatic ? 15.5 : 14.8;
  return {
    id: ++_aid, dna,
    colore: dnaColor(dna),
    size: 0.35 + dna.taglia * 0.65,
    // La velocita non dipende dal RUOLO ma dal corpo: piccolo = agile, e chi vive di carne e
    // fatto per lo scatto. Da qui nasce l'inseguimento: senza questo vantaggio genetico nessun
    // predatore prenderebbe mai una preda che fugge, e i carnivori si estinguerebbero.
    velocita: base * (1.3 - dna.taglia * 0.55) * (0.85 + dna.carnivoria * 0.5),
    lifespan,
    etaFertile: lifespan * (0.12 + dna.taglia * 0.12),
    etaSterile: lifespan * (0.72 + dna.taglia * 0.06),
    fameRate: P.faunaFameBase + dna.taglia * P.faunaFameTaglia,
    x, y, tx: x, ty: y,
    fame: 0.3 + rnd() * 0.2,
    // Un nato e nato: comincia da zero. L'eta sparsa serve solo al POPOLAMENTO INIZIALE, che
    // deve gia avere vecchi e giovani; darla anche ai figli accorciava la loro vita fertile.
    eta: neonato ? 0 : 1 + rnd() * lifespan * 0.3,
    sex: rnd() < 0.5 ? "M" : "F", cooldown: rnd() * 3, vivo: true,
  };
}

// ── Letture dei geni (nessuna categoria, solo domande sul DNA) ──────────────────────────────
const caccia = (a) => a.dna.carnivoria > 0.35;            // ha interesse per la carne viva
const bruca = (a) => a.dna.carnivoria < 0.75;             // può ancora ricavare nutrimento dalle piante
// Chi può uccidere chi: serve appetito per la carne e un vantaggio di stazza. Un predatore
// enorme arriva a prede quasi pari a lui; uno piccolo solo a molto più piccoli di sé.
function puoPredare(a, b) {
  if (a === b || !b.vivo || a.dna.aquatic !== b.dna.aquatic) return false;
  if (a.dna.carnivoria < 0.35) return false;
  // Contro un'altra bestia che a sua volta caccia serve un vantaggio di stazza ben piu netto:
  // un grande predatore puo uccidere un carnivoro piccolo, ma due pari non si attaccano.
  const margine = b.dna.carnivoria > 0.5 ? 0.45 : (0.55 + a.dna.carnivoria * 0.7);
  return b.dna.taglia < a.dna.taglia * margine;
}
// Etichetta descrittiva, solo per le statistiche e la scheda: una lettura, non un'identità.
export function ruoloDi(a) {
  if (a.dna.aquatic) return a.dna.carnivoria > 0.6 ? "predmarino" : "pesce";
  return a.dna.carnivoria > 0.6 ? "predatore" : a.dna.carnivoria > 0.35 ? "onnivoro" : "erbivoro";
}

function seed(pop, tiles, count, ruolo, aquatic) {
  let tries = 0, nati = 0;
  while (nati < count && tries < count * 20 && tiles.length) {
    tries++;
    const [x, y] = tiles[(pop.rng() * tiles.length) | 0];
    const tLocale = pop.world.temperature[pop.tileIdx(x, y)];
    const dna = makeDNA(pop.rng, Math.max(0, Math.min(1, tLocale)), ruolo, aquatic);
    pop.creature.push(makeCreatura(x + pop.rng(), y + pop.rng(), dna, false, pop.rng));
    nati++;
  }
}

export function spawnAnimals(pop, herbN, predN) {
  if (!pop.creature) pop.creature = [];
  const land = pop.landTiles();
  seed(pop, land, herbN, "erbivoro", false);
  seed(pop, land, predN, "carnivoro", false);
  const water = pop.waterTiles();
  seed(pop, water, Math.round(herbN * 0.8), "erbivoro", true);
  seed(pop, water, Math.round(predN * 0.6), "carnivoro", true);
  const fresh = pop.freshWaterTiles();
  if (fresh.length) seed(pop, fresh, Math.round(herbN * 0.7), "erbivoro", true);
}

// Selezione termica: chi vive lontano dal proprio clima ideale soffre. Guida l'adattamento.
function climaLetale(pop, a, dt) {
  const t = pop.world.temperature[pop.tileIdx(a.x, a.y)];
  const scarto = Math.abs(t - a.dna.tempIdeale) - a.dna.tolleranza;
  return scarto > 0 && pop.rng() < scarto * dt * P.faunaSelezione;
}

function dropMaterials(pop, animal, collector) {
  if (!animal.dna || !collector) return;
  for (const [nome, p, n] of dnaDrops(animal.dna)) {
    if (pop.rng() < p) {
      const mat = pop.registry.materials.find((m) => m.nome === nome);
      if (mat) collector.addMat(mat.id, n);
    }
  }
}

// CAROGNE: chi muore lascia carne. Chiunque abbia appetito per la carne può spazzinare.
function addCarcass(pop, x, y, amount) {
  const i = pop.tileIdx(x, y);
  pop.carcasse.set(i, Math.min(3, (pop.carcasse.get(i) || 0) + amount));
}
function findCarcass(pop, x, y) {
  const w = pop.world.width, cx = x | 0, cy = y | 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = cx + dx, ny = cy + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= pop.world.height) continue;
    const i = ny * w + nx;
    if ((pop.carcasse.get(i) || 0) > 0.05) return [i, nx, ny];
  }
  return null;
}

function moveOn(pop, a, tx, ty, dist, ok) {
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy) || 1;
  let nx = a.x + (dx / d) * dist, ny = a.y + (dy / d) * dist;
  if (!ok(nx, ny)) { if (ok(nx, a.y)) ny = a.y; else if (ok(a.x, ny)) nx = a.x; else return; }
  a.x = nx; a.y = ny;
}
function wanderOn(pop, a, speed, ok) {
  if (Math.hypot(a.tx - a.x, a.ty - a.y) < 1.2) {
    const ang = pop.rng() * Math.PI * 2, r = 3 + pop.rng() * 12;
    a.tx = a.x + Math.cos(ang) * r; a.ty = a.y + Math.sin(ang) * r;
  }
  moveOn(pop, a, a.tx, a.ty, speed, ok);
}

// ── Griglia spaziale UNICA: tutte le creature insieme, filtrate al momento della ricerca ────
const GRID_CELL = 12;
function buildGrid(list, ammesso) {
  const g = new Map();
  // LA BESTIA PIU' PICCOLA DI OGNI CELLA, separata fra terra e acqua.
  //
  // Serve a chi caccia. Una preda dev'essere PIU' PICCOLA di chi la insegue
  // (`b.taglia < a.taglia * margine`), quindi una cella la cui bestia piu' piccola e' gia' troppo
  // grande non puo' contenere prede — e si puo' saltare senza guardare in faccia nessuno.
  // Costa un confronto per bestia mentre la griglia si costruisce, e la griglia si costruisce una
  // volta ogni quattro battiti.
  const minT = new Map(), minA = new Map();
  for (const o of list) {
    if (!o.vivo || (ammesso && !ammesso(o))) continue;
    const k = ((o.x / GRID_CELL) | 0) + "," + ((o.y / GRID_CELL) | 0);
    let a = g.get(k); if (!a) { a = []; g.set(k, a); } a.push(o);
    const m = o.dna.aquatic ? minA : minT;
    const cur = m.get(k);
    if (cur === undefined || o.dna.taglia < cur) m.set(k, o.dna.taglia);
  }
  g.minT = minT; g.minA = minA;
  return g;
}
// Cerca la creatura più vicina che soddisfa un PREDICATO: è così che preda e minaccia diventano
// relazioni calcolate, invece che appartenenze a una lista.
// SI GUARDA VICINO PRIMA CHE LONTANO. Sia qui che in gridVicini si rastrellava tutto il
// riquadro di celle entro la vista e si squadrava ogni essere dentro: con ventimila bestie
// erano quasi duemila confronti per ogni singola occhiata, e il costo cresceva con la calca.
// Nessun animale fa cosi': si accorge di quello che ha addosso, e quando l'ha trovato smette
// di cercare. Qui si va per anelli concentrici e ci si ferma appena da piu' lontano non puo'
// piu' arrivare niente di meglio. Chi viene trovato e' esattamente lo stesso di prima.
// I CONTATORI DEL LAVORO, spenti finche' nessuno li appende. Servono a distinguere «e' lento» da
// «guarda troppa roba per trovare niente», che sono due problemi diversi con due rimedi diversi.
let _lav = null;
export function contaLavoroFauna(o) { _lav = o; }

// `limite` e' facoltativo: {min: Map cella->taglia piu' piccola, soglia}. Quando c'e', una cella
// la cui bestia piu' piccola non e' sotto soglia viene saltata SENZA guardarci dentro. E' esatta,
// non approssimata: `ok` scarterebbe comunque ognuno di quelli, poche righe piu' sotto.
function gridNearest(grid, x, y, R, ok, limite) {
  const R2 = R * R, cx = (x / GRID_CELL) | 0, cy = (y / GRID_CELL) | 0, span = Math.ceil(R / GRID_CELL);
  let best = null, bd = R2;
  for (let r = 0; r <= span; r++) {
    // da un anello piu' esterno non puo' venire nessuno piu' vicino di (r-1) celle
    if (best) { const minFuori = (r - 1) * GRID_CELL; if (minFuori > 0 && minFuori * minFuori >= bd) break; }
    for (let gy = cy - r; gy <= cy + r; gy++) for (let gx = cx - r; gx <= cx + r; gx++) {
      if (r > 0 && Math.abs(gx - cx) !== r && Math.abs(gy - cy) !== r) continue;   // solo il bordo
      const kc = gx + "," + gy;
      if (limite) { const mt = limite.min.get(kc); if (mt === undefined || !(mt < limite.soglia)) continue; }
      const arr = grid.get(kc);
      if (_lav) {
        _lav.celle++; if (arr) _lav.esaminate += arr.length;
        if (_lav.fase === "caccia") { _lav.celleCaccia++; if (arr) _lav.esamCaccia += arr.length; }
        else if (_lav.fase === "fuga") { _lav.celleFuga++; if (arr) _lav.esamFuga += arr.length; }
      }
      if (!arr) continue;
      for (const o of arr) {
        if (!o.vivo || (ok && !ok(o))) continue;
        const d2 = (o.x - x) ** 2 + (o.y - y) ** 2;
        if (d2 < bd) { bd = d2; best = o; }
      }
    }
  }
  return best ? { a: best, d2: bd } : null;
}

// ── IL COMPORTAMENTO DI UNA CREATURA — uno solo, per tutte ──────────────────────────────────
function stepCreatura(pop, a, dt, grid, branco) {
  const acqua = a.dna.aquatic;
  const ok = acqua ? (x, y) => pop.swimmable(x, y) : (x, y) => pop.walkable(x, y);
  const speed = a.velocita * dt;
  a.eta += dt * 0.28;
  a.fame += dt * a.fameRate * (caccia(a) ? 0.75 : 1);
  if (a.cooldown > 0) a.cooldown -= dt;
  if (a.fame > 1.32 || a.eta > a.lifespan || climaLetale(pop, a, dt)) {
    a.vivo = false;
    // Solo chi non è un gran cacciatore lascia carogna sfruttabile: altrimenti i predatori si
    // sosterrebbero a vicenda in un circolo chiuso, senza mai dipendere davvero dalle prede.
    if (a.dna.carnivoria < 0.6) addCarcass(pop, a.x, a.y, a.size);
    return;
  }

  // FUGA: si scappa da chiunque possa mangiarti. La vista dice quanto lontano te ne accorgi —
  // e questo resta personale: il branco ha già guardato, ma chi ha gli occhi buoni vede più in là.
  const raggioAllarme = 5 + (a.dna.vista || 0.5) * 8;
  let minaccia = null;
  // IL BRANCO NON È UNA CELLA DELLA GRIGLIA: È CHI STA INSIEME. Il gruppo ha già guardato per
  // tutti — molte pari di occhi vedono prima di una sola — ma quel vantaggio tocca a chi il
  // gruppo se lo tiene stretto. Chi è schivo se ne sta per conto suo e deve guardarsi da sé.
  //
  // Fin qui la socialita era un gene che si ereditava, mutava a ogni generazione e non faceva
  // NIENTE. Un gene senza conseguenze non si può selezionare: derivava a caso. Adesso ha un
  // prezzo e un premio, e sono in tensione fra loro — stare in gruppo ti fa vedere il predatore
  // prima, ma vi contendete la stessa erba. Dove i predatori abbondano converrà stringersi,
  // dove scarseggiano converrà sparpagliarsi, e non l'ha deciso nessuno.
  const gregario = (a.dna.socialita || 0.5) > 0.35;
  if (gregario && branco && branco.vicini) {
    const r2 = raggioAllarme * raggioAllarme;
    for (const c of branco.vicini) {
      if (c.a === a || !c.a.vivo) continue;
      const d2 = (c.a.x - a.x) ** 2 + (c.a.y - a.y) ** 2;
      if (d2 > r2) continue;
      if (!puoPredare(c.a, a)) continue;           // può mangiare proprio ME?
      if (!minaccia || d2 < minaccia.d2) minaccia = { a: c.a, d2 };
    }
  } else {
    // Chi sta per conto suo deve guardarsi da sé — ma anche lui può guardare solo dove i predatori
    // possono essere. È la stessa cura del branco: la griglia dei soli predatori è un sovrainsieme
    // di chi può mangiarlo, quindi la risposta è identica e le celle sono quasi vuote.
    if (_lav) { _lav.fase = "fuga"; _lav.chiamateFuga++; }
    minaccia = gridNearest(pop._gridPredatori || grid, a.x, a.y, raggioAllarme, (o) => puoPredare(o, a));
    if (_lav) _lav.fase = null;
  }
  if (minaccia) {
    moveOn(pop, a, 2 * a.x - minaccia.a.x, 2 * a.y - minaccia.a.y,
      speed * (1.05 + (a.dna.intelligenza || 0) * 0.3), ok);   // lo scatto non dura: si fugge, non si vola
    return;
  }

  if (a.fame > 0.32) {
    // 1) CACCIA — solo se i geni danno appetito per la carne.
    if (caccia(a)) {
      const reach = 1.3 + a.dna.taglia * 0.6 + a.dna.aggressivita * 0.3;
      const R = 10 + ((a.dna.vista || 0.5) + (a.dna.olfatto || 0.5)) * 9;
      if (_lav) { _lav.fase = "caccia"; _lav.chiamateCaccia++; }
      // LE CELLE DOVE NON C'E' NIENTE DI ABBASTANZA PICCOLO NON SI GUARDANO.
      //
      // Il codice qui accanto aveva gia' curato la FUGA — cercare i predatori su una griglia di
      // soli predatori invece che su tutte le bestie — e aveva lasciato scoperta la CACCIA, che e'
      // la stessa cosa nell'altro verso. Misurato: 1 339 ricerche a battito che guardano in faccia
      // 472 168 bestie, e nel 73% dei casi per non trovare niente. E' il costo che faceva sembrare
      // che una bestia costasse dieci volte tanto quando la gente cresce: non era la bestia, era
      // il predatore che rastrella un mondo dove le prede si sono diradate.
      //
      // Il margine piu' largo che `puoPredare` possa concedere a questo cacciatore e'
      // `0.55 + carnivoria * 0.7` (l'altro ramo, 0.45, e' sempre piu' stretto). Se la bestia piu'
      // piccola di una cella non e' sotto `taglia * quel margine`, li' dentro non c'e' preda
      // possibile per NESSUN valore di margine — e la cella si salta.
      const limite = { min: a.dna.aquatic ? grid.minA : grid.minT,
                       soglia: a.dna.taglia * (0.55 + a.dna.carnivoria * 0.7) };
      const preda = gridNearest(grid, a.x, a.y, R, (o) => puoPredare(a, o), limite.min ? limite : null);
      if (_lav) { _lav.fase = null; if (!preda) _lav.cacciaAVuoto++; }
      if (preda && (preda.a.dna.mimetismo || 0) <= pop.rng() * 1.4) {
        if (preda.d2 < reach * reach) {
          const pd = preda.a.dna;
          if (pop.rng() < (pd.corazza || 0) * 0.5) {           // la corazza regge il colpo
            moveOn(pop, a, 2 * a.x - preda.a.x, 2 * a.y - preda.a.y, speed, ok);
            return;
          }
          preda.a.vivo = false;
          a.fame = Math.max(0, a.fame - 0.85 * (0.55 + a.dna.carnivoria * 0.45) + (pd.veleno || 0) * 0.6);
          if ((pd.veleno || 0) > 0.6 && pop.rng() < 0.3) a.vivo = false;   // preda velenosa
          pop.predKills++;
        } else moveOn(pop, a, preda.a.x, preda.a.y, speed, ok);
        return;
      }
    }
    // 2) CAROGNE — chi mangia carne le sfrutta quando non trova di meglio.
    if (a.dna.carnivoria > 0.25) {
      const car = findCarcass(pop, a.x, a.y);
      if (car) {
        const reach = 1.3 + a.dna.taglia * 0.6;
        if ((a.x - car[1]) ** 2 + (a.y - car[2]) ** 2 < reach * reach) {
          const e = Math.min(pop.carcasse.get(car[0]), 0.5);
          pop.carcasse.set(car[0], pop.carcasse.get(car[0]) - e);
          if (pop.carcasse.get(car[0]) <= 0.05) pop.carcasse.delete(car[0]);
          a.fame = Math.max(0.45, a.fame - e * 1.1);
          pop.spazzinate++;
          return;
        }
        moveOn(pop, a, car[1] + 0.5, car[2] + 0.5, speed, ok);
        return;
      }
    }
    // 3) PASCOLO — le piante nutrono in proporzione a quanto poco si è carnivori.
    if (bruca(a)) {
      const griglia = acqua ? pop.plankton : pop.food;
      const idx = pop.tileIdx(a.x, a.y);
      const resa = 1 - a.dna.carnivoria * 0.9;
      if (griglia[idx] > 0.13) {
        const e = Math.min(griglia[idx], 0.55 * dt * 4);
        griglia[idx] -= e;
        a.fame = Math.max(caccia(a) ? 0.25 : 0, a.fame - e * 2.2 * resa);
      } else {
        const t = acqua ? pop.bestPlankton(a.x, a.y, 8) : pop.bestFood(a.x, a.y, 8);
        if (t) {
          // UN GREGARIO NON CERCA L'ERBA MIGLIORE: CERCA L'ERBA MIGLIORE VICINO AI SUOI.
          // La prima versione faceva stringere il branco solo da sazi, e non si vedeva niente
          // (misurato: distanza dal centro del gruppo 4,32 per i gregari contro 4,34 per gli
          // schivi — identica). Ovvio col senno di poi: quasi nessuno è mai sazio, e il pascolo
          // governa tutto il movimento. È QUI che si decide se un branco esiste.
          //
          // E qui il gene si paga davvero: chi resta col gruppo mangia peggio ma viene visto
          // prima dal predatore; chi si stacca trova l'erba buona e se la vede da solo.
          let tx = t[0] + 0.5, ty = t[1] + 0.5;
          if (branco && branco.n > 2) {
            const tira = Math.max(-0.5, Math.min(0.5, ((a.dna.socialita || 0.5) - 0.45) * 1.2));
            tx += (branco.x - tx) * tira;
            ty += (branco.y - ty) * tira;
          }
          moveOn(pop, a, tx, ty, speed, ok);
        } else wanderOn(pop, a, speed, ok);
      }
      return;
    }
    wanderOn(pop, a, speed, ok);
    return;
  }

  // SAZIA: adesso che non preme niente si vede che animale sei. Chi cerca i suoi si stringe al
  // gruppo, chi non li sopporta se ne allontana — ed è QUESTO che fa esistere davvero un branco,
  // invece di lasciarlo essere un accidente di come è tagliata la griglia.
  if (branco && branco.n > 1) {
    const soc = a.dna.socialita || 0.5;
    const dx = branco.x - a.x, dy = branco.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d > 1.5) {
      const verso = soc - 0.45;                       // positivo: verso i suoi. negativo: via da loro.
      if (Math.abs(verso) > 0.08) {
        const passo = speed * Math.min(1, Math.abs(verso) * 2.2);
        moveOn(pop, a, a.x + (dx / d) * Math.sign(verso) * 4, a.y + (dy / d) * Math.sign(verso) * 4, passo, ok);
      } else wanderOn(pop, a, speed, ok);
    } else wanderOn(pop, a, speed, ok);
  } else wanderOn(pop, a, speed, ok);
  // Quanta erba c'è QUI: è tutto quello che una bestia può sapere del mondo.
  const iQui = pop.tileIdx(a.x, a.y);
  const griglia0 = acqua ? pop.plankton : pop.food;
  const cap0 = acqua ? pop.planktonCap[iQui] : pop.foodCap[iQui];
  const abbondanza = cap0 > 0.01 ? Math.min(1, griglia0[iQui] / cap0) : 0;
  const sogliaFame = caccia(a) ? 0.3 : 0.4;
  const fertile = a.eta >= a.etaFertile && a.eta <= a.etaSterile;
  if (a.cooldown > 0 || a.fame > sogliaFame || !fertile || pop.creature.length >= SAFETY()) return;
  // Chi caccia si riproduce solo se è davvero ben nutrito (la carne scarseggia sempre); chi bruca
  // segue l'abbondanza del pascolo. Nessun tetto: l'equilibrio lo fa il cibo.
  // Chi vive di carne fa pochi figli ma li fa quando sta bene: e il lungo intervallo fra un
  // parto e l'altro a limitarlo, non il caso. Chi bruca segue invece l'abbondanza del pascolo:
  // annate grasse, molti nati; annate magre, nessuno.
  const prob = caccia(a) ? 1 : Math.max(0, abbondanza - 0.45) * 2 * a.dna.prolificita * P.faunaProlificita;
  if (pop.rng() < prob) {
    pop.creature.push(makeCreatura(a.x + (pop.rng() - 0.5), a.y + (pop.rng() - 0.5), childDNA(a.dna, pop.rng), true, pop.rng));
    a.cooldown = caccia(a) ? 7 : 4;
    a.fame += 0.38;
  }
}

// L'uomo affamato caccia ciò che può prendere: qualunque creatura abbastanza piccola e vicina.
function humansHunt(pop, dt, grid) {
  for (const npc of pop.npcs) {
    if (!npc.vivo || npc.fame < 0.7) continue;
    const suTerra = gridNearest(grid, npc.x, npc.y, 5, (o) => !o.dna.aquatic && o.dna.taglia < 0.92);
    if (suTerra) {
      if (suTerra.d2 < 2.2) {
        suTerra.a.vivo = false; dropMaterials(pop, suTerra.a, npc);
        npc.fame = Math.max(0, npc.fame - 0.9);
        if (npc.dieta) { npc.dieta.prot = Math.min(1, npc.dieta.prot + 0.5); npc.dieta.gras = Math.min(1, npc.dieta.gras + 0.35); }
        if (npc.azioni) npc.azioni.caccia++;
        pop.huntKills++; continue;
      }
      const d = Math.hypot(suTerra.a.x - npc.x, suTerra.a.y - npc.y) || 1;
      npc.x += (suTerra.a.x - npc.x) / d * dt * 8; npc.y += (suTerra.a.y - npc.y) / d * dt * 8;
      continue;
    }
    const inAcqua = gridNearest(grid, npc.x, npc.y, 4, (o) => o.dna.aquatic);
    if (inAcqua && inAcqua.d2 < 6) {
      inAcqua.a.vivo = false; dropMaterials(pop, inAcqua.a, npc);
      npc.fame = Math.max(0, npc.fame - 0.85);
      if (npc.dieta) { npc.dieta.prot = Math.min(1, npc.dieta.prot + 0.45); npc.dieta.min = Math.min(1, npc.dieta.min + 0.3); }
      if (npc.azioni) npc.azioni.caccia++;
      pop.fishKills++;
    }
  }
}

// ---- Malattie e contagi ----
export function seedOutbreak(pop, n = 4, opts = {}) {
  pop.disease = pop.disease || { contagiosita: 0.5, mortalita: 0.35, incubazione: 2, curaDifficolta: 0.4, origine: "manuale", ...opts };
  const vivi = pop.npcs.filter((x) => x.vivo && !x.immune);
  for (let k = 0; k < n && vivi.length; k++) vivi[(pop.rng() * vivi.length) | 0].infetto = 0;
  pop._eventoSaliente = { evento: "la pestilenza", anno: pop.anno };
}

export function maybeSpawnDisease(pop, npc, attr, eff) {
  const danger = eff.effVeleno + eff.effEnergia;
  if (danger < 0.3) return;
  if (pop.rng() > danger * 0.1) return;
  const giaAttiva = pop.disease && pop.npcs.some((n) => n.vivo && n.infetto != null);
  if (giaAttiva) return;
  pop.disease = {
    contagiosita: Math.min(0.9, 0.25 + ((attr.tossicita || 0) + (attr.energiaChim || 0)) * 0.3),
    mortalita: Math.min(0.92, 0.15 + eff.effVeleno * 0.45 + eff.effEnergia * 0.4),
    incubazione: 1 + (1 - eff.stabilita) * 3,
    curaDifficolta: Math.min(0.9, 1 - eff.stabilita),
    origine: "esperimento",
  };
  npc.infetto = 0;
  pop.epidemieNate = (pop.epidemieNate || 0) + 1;
  pop._eventoSaliente = { evento: "la pestilenza", anno: pop.anno };
  if (pop.chronicle) pop.chronicle(`Scoppia un'epidemia (mortalità ${(pop.disease.mortalita * 100) | 0}%)`, 20);
}

function stepDisease(pop, dt) {
  const d = pop.disease; if (!d) return;
  const ceppo = d.origine || "ignoto";
  const infetti = pop.npcs.filter((n) => n.vivo && n.infetto != null);
  for (const npc of infetti) {
    npc.infetto += dt;
    if (npc.infetto > d.incubazione) {
      const fragilita = 1 - npc.immunita * 0.6 + (npc.carenza || 0) * 0.5;
      npc.salute -= dt * d.mortalita * 0.25 * Math.max(0.2, fragilita);
      const guarigione = dt * 0.12 * (0.5 + npc.salute) * (0.5 + npc.immunita) * (1 - (d.curaDifficolta || 0) * 0.7);
      if (pop.rng() < guarigione) {
        npc.infetto = null; npc.anticorpi.add(ceppo);
        npc.immunita = Math.min(1, npc.immunita + 0.25); npc.immune = true;
        continue;
      }
      if (npc.salute <= 0) { npc.vivo = false; npc.infetto = null; pop.mortiMalattia++; continue; }
    }
    // IL CONTAGIO DIPENDE DA QUANTA GENTE HAI ADDOSSO. Qui c'era il difetto più importante di
    // tutto il modello delle malattie, e stava nascosto in un `break`: un malato scorreva TUTTA
    // la popolazione e contagiava **al massimo una persona** — per giunta la prima che capitava
    // nell'ordine dell'elenco, non la più vicina. Chi stava in mezzo a cinquecento contagiava
    // esattamente quanto un eremita.
    //
    // È una legge di livello 2, e non è un dettaglio: la densità che si paga con la malattia è
    // storicamente IL freno delle città affollate. Senza, un mondo può ammassare ventimila
    // persone su una mappa e la malattia non se ne accorge nemmeno.
    //
    // (E toglie anche una quadratica: si chiede all'indice del vicinato invece di scorrere tutti.)
    if (pop.rng() < d.contagiosita * dt) {
      const attorno = pop.vicini(npc.x, npc.y, 3);
      for (const o of attorno) {
        if (o === npc || !o.vivo || o.infetto != null || o.anticorpi.has(ceppo)) continue;
        // ognuno ha la sua occasione di prendersela: più gente attorno, più contagi
        if (pop.rng() < 0.35 && pop.rng() > o.immunita * 0.7) o.infetto = 0;
      }
    }
  }
}

// Query per la paura degli umani: c'è vicino qualcosa di grosso e carnivoro?
export function predatorThreatQuery(pop) {
  const grid = buildGrid(pop.creature || []);
  return (x, y) => !!gridNearest(grid, x, y, 6, (o) => !o.dna.aquatic && o.dna.carnivoria > 0.5 && o.dna.taglia > 0.35);
}

// Il pericolo che incombe su un posto: chi, fra i predatori vicini, è il più prossimo. Si calcola
// una volta per branco e lo si passa a tutti i suoi.
function pericoliPerBranco(pop, gridPred) {
  const CELLA = 9;
  const branchi = new Map();
  for (const a of pop.creature) {
    if (!a.vivo) continue;
    const k = ((a.x / CELLA) | 0) + "," + ((a.y / CELLA) | 0) + "," +
      (a.dna.aquatic ? "a" : "t") + "," + ((a.dna.carnivoria * 4) | 0);
    let b = branchi.get(k);
    if (!b) { b = { x: 0, y: 0, n: 0, vista: 0 }; branchi.set(k, b); }
    b.x += a.x; b.y += a.y; b.n++;
    const v = a.dna.vista || 0.5;
    if (v > b.vista) b.vista = v;                  // il raggio del più attento del gruppo
  }
  for (const [k, b] of branchi) {
    b.x /= b.n; b.y /= b.n;
    // I tre pericoli più vicini: ognuno poi si chiederà se QUELLO può mangiare proprio lui.
    b.vicini = gridPred ? gridVicini(gridPred, b.x, b.y, 5 + b.vista * 8 + CELLA, 3) : [];
    b.chiave = k;
  }
  return branchi;
}

// I primi `quanti` esseri capaci di predare che si trovano nel raggio: una scansione sola.
function gridVicini(grid, x, y, r, quanti) {
  const out = [];                                  // tenuto corto e in ordine di vicinanza
  const R2 = r * r, cx = (x / GRID_CELL) | 0, cy = (y / GRID_CELL) | 0;
  const span = Math.ceil(r / GRID_CELL);
  for (let anello = 0; anello <= span; anello++) {
    if (out.length >= quanti) {
      const minFuori = (anello - 1) * GRID_CELL;
      if (minFuori > 0 && minFuori * minFuori >= out[out.length - 1].d2) break;
    }
    for (let gy = cy - anello; gy <= cy + anello; gy++) for (let gx = cx - anello; gx <= cx + anello; gx++) {
      if (anello > 0 && Math.abs(gx - cx) !== anello && Math.abs(gy - cy) !== anello) continue;
      const arr = grid.get(gx + "," + gy);
      if (!arr) continue;
      for (const o of arr) {
        if (!o.vivo) continue;                       // la griglia contiene già solo chi può predare
        const d2 = (o.x - x) ** 2 + (o.y - y) ** 2;
        if (d2 > R2) continue;
        if (out.length >= quanti && d2 >= out[out.length - 1].d2) continue;
        let j = out.length < quanti ? out.length : quanti - 1;
        while (j > 0 && out[j - 1].d2 > d2) { out[j] = out[j - 1]; j--; }
        out[j] = { a: o, d2 };
        if (out.length > quanti) out.length = quanti;
      }
    }
  }
  return out;
}

// A QUANTI TURNI VA LA FAUNA. Spezzare il lavoro in fette non è gratis: chi tocca il turno riceve
// il tempo di tutti, quindi si muove a scatti più lunghi e reagisce più tardi. Per ciò che si
// accumula è identico, per ciò che capita a caso il ritmo medio è lo stesso — ma la *reattività* si
// perde davvero. Adesso che il passo delle bestie costa molto meno, quanto tenerne è una scelta da
// misurare, non una costante da nascondere: sta nel pannello.
const turniFauna = () => Math.max(1, Math.round(P.turniFauna || 4));

export function stepEcosystem(pop, dt) {
  const _t0 = performance.now();   // portatile: c'e' nel browser E in node. L'orologio di
                                 // node non c'e' nel browser, e qui l'ho gia' pagata cara.
  if (!pop.creature) pop.creature = [];
  const TURNI_FAUNA = turniFauna();
  pop._turnoFauna = ((pop._turnoFauna || 0) + 1) % TURNI_FAUNA;
  // A inizio giro si rifà la mappa di chi sta dove; per i tre battiti seguenti si riusa.
  const _cr = pop._cronoFauna || (pop._cronoFauna = { bestie: 0, caccia: 0, malattia: 0 });
  if (pop._turnoFauna === 0 || !pop._gridFauna) {
    // TRE COSE, DI NUOVO, SOTTO UN NOME SOLO. Dentro «bestie» c'erano le due griglie (che scalano
    // col numero di bestie), il censimento dei branchi (che scala col numero di BRANCHI, ed e' una
    // cosa diversa: piu' le bestie si diradano piu' branchi distinti ci sono) e il passo di
    // ognuna. Il totale diceva che una bestia costava dieci volte tanto: non era vero di nessuna
    // delle tre.
    const _tg = performance.now();
    pop._gridFauna = buildGrid(pop.creature);
    // UNA GRIGLIA DEI SOLI PREDATORI. Cercare i tre pericoli più vicini costava carissimo per una
    // ragione che la misura ha svelato: l'uscita anticipata scatta solo QUANDO SI TROVANO, e in un
    // mondo di erbivori non si trovano — così si rastrellavano venticinque celle piene di prede per
    // concludere che non c'era nessun predatore. Misurato: il costo per bestia saliva da 1,75 a
    // 8,32 µs mentre le bestie crescevano.
    // Su una griglia che contiene solo chi può predare quelle stesse celle sono quasi vuote, e la
    // risposta è **identica**: non si approssima niente, si smette solo di guardare le prede.
    pop._gridPredatori = buildGrid(pop.creature, (o) => o.dna.carnivoria >= 0.35);
    _cr.griglie = (_cr.griglie || 0) + (performance.now() - _tg);
    const _tb = performance.now();
    pop._branchiFauna = pericoliPerBranco(pop, pop._gridPredatori);
    _cr.branchi = (_cr.branchi || 0) + (performance.now() - _tb);
    _cr.nBranchi = pop._branchiFauna.size;
    _cr.nBestie = pop._gridFauna.size;
  }
  const grid = pop._gridFauna, branchi = pop._branchiFauna;
  const CELLA = 9;
  const dtF = dt * TURNI_FAUNA;            // chi tocca il turno riceve il tempo di tutti
  for (let i = pop._turnoFauna; i < pop.creature.length; i += TURNI_FAUNA) {
    const a = pop.creature[i];
    if (!a || !a.vivo) continue;
    const k = ((a.x / CELLA) | 0) + "," + ((a.y / CELLA) | 0) + "," +
      (a.dna.aquatic ? "a" : "t") + "," + ((a.dna.carnivoria * 4) | 0);
    stepCreatura(pop, a, dtF, grid, branchi.get(k));
  }
  // TRE COSE DIVERSE SOTTO UN NOME SOLO. Il profilo diceva «fauna», e dentro c'erano le bestie
  // (che scalano col numero di bestie), la caccia degli umani e il contagio (che scalano con la
  // GENTE). Leggendo un totale solo si finisce per credere che la fauna sia esplosa quando invece
  // sono cresciuti i cacciatori. Costa sei letture d'orologio a battito: si tengono separate.
  const _c = _cr;
  _c.bestie += (performance.now() - _t0);
  let _t = performance.now();
  humansHunt(pop, dt, grid);
  _c.caccia += (performance.now() - _t);
  _t = performance.now();
  stepDisease(pop, dt);
  _c.malattia += (performance.now() - _t);

  if (pop.carcasse.size) {
    for (const [i, v] of pop.carcasse) {
      const nv = v - dt * P.carcasseDecay;
      if (nv <= 0.03) pop.carcasse.delete(i); else pop.carcasse.set(i, nv);
    }
  }
  // RICOLONIZZAZIONE: se una forma di vita quasi sparisce mentre il suo cibo abbonda, qualche
  // individuo arriva da fuori. L'estinzione resta possibile, ma non è una condanna definitiva.
  if (pop.rng() < P.ricolonizzazione * dt * 6) {
    let brucanti = 0, cacciatori = 0;
    for (const a of pop.creature) {
      if (!a.vivo || a.dna.aquatic) continue;
      if (a.dna.carnivoria > 0.5) cacciatori++; else brucanti++;
    }
    if (brucanti < 6 && pop.vegFraction > 0.4) seed(pop, pop.landTiles(), 4, "erbivoro", false);
    if (cacciatori < 4 && brucanti > 40) seed(pop, pop.landTiles(), 3, "carnivoro", false);
  }
  // Come per la gente: compattare cambia gli indici, e gli indici decidono i turni.
  if (pop.rng() < 0.15) pop.creature = pop.creature.filter((a) => a.vivo);
}
