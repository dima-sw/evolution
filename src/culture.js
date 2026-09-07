import { P } from "./params.js";
import { bonus, periziaMedia } from "./skill.js";
import { impara, propensione } from "./experience.js";
// CULTURA — memi, religione e guerra fra fazioni. NESSUNA AI, NESSUN HARDCODING della storia:
// solo forze che si diffondono per RETE SOCIALE (come una malattia) e conseguenze emergenti.
//
//  • MEMI: convinzioni "AMA/ODIA <bersaglio>" (non verità). Il bersaglio EMERGE (chi ti fa del
//    male, o un materiale prezioso). Si diffondono per contatto; il CONFORMISMO decide quanto
//    ciascuno le assimila; intelligenza/diffidenza le frenano. I memi modificano DESIDERI e ODI,
//    non il comportamento: "ODIA pelle scura" → ostilità verso chi ha quell'aspetto → CASUS BELLI.
//  • RELIGIONE: nasce quando un NPC carismatico SOPRAVVIVE a un evento saliente e lo interpreta
//    come segno. Si diffonde per rete (no confini): due popoli in guerra possono condividerla, un
//    popolo può averne più d'una, alcuni la RIFIUTANO (alta razionalità + bassa paura). Dà coesione.
//  • GUERRA: l'ostilità fra fazioni emerge da odio-memi + invidia collettiva + competizione per le
//    risorse (attenuata da religione condivisa). Sopra soglia → stato di guerra → RAZZIE ai confini.

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Marcatore visibile di un individuo (l'"altro" si riconosce dall'aspetto: la xenofobia emerge così).
function skinTag(npc) {
  const mel = npc.genes ? npc.genes.melanina : 0.5;
  return mel < 0.4 ? "pelle chiara" : mel < 0.7 ? "pelle olivastra" : "pelle scura";
}

// Un NPC "corrisponde" al bersaglio di un meme?
function matches(npc, meme) {
  if (meme.dominio === "aspetto") return skinTag(npc) === meme.bersaglio;
  if (meme.dominio === "materiale") return false; // i materiali non si "odiano" tra persone
  return false;
}

let _memeId = 0, _relId = 0;

// ---------------------------------------------------------------------------------------------
// NASCITA DEI MEMI — coniati da una fazione a partire dalla propria esperienza.
function coinMemes(pop, idMap, dt) {
  if (!pop.factions.length) return;
  if (pop.rng() > P.probMeme * dt * 6) return; // raro
  const f = pop.factions[(pop.rng() * pop.factions.length) | 0];
  if (!f._membri || f._membri.length < 8) return;

  // ODIA: cristallizza sull'ASPETTO dei nemici (chi i membri ricordano male) o, in mancanza, del
  // forestiero più vicino. È l'in-group/out-group che diventa pregiudizio condiviso.
  const conteggio = new Map();
  for (const m of f._membri) {
    if (!m.memoria) continue;
    for (const [altroId, rel] of m.memoria) {
      if (rel > -0.3) continue;
      const altro = idMap.get(altroId);
      if (!altro || !altro.vivo || altro.fazione === f.id) continue;
      const tag = skinTag(altro);
      conteggio.set(tag, (conteggio.get(tag) || 0) + 1);
    }
  }
  let bersaglio = null, bc = 0;
  for (const [tag, c] of conteggio) if (c > bc) { bc = c; bersaglio = tag; }

  if (bersaglio && bc >= 3) {
    if (!hasMeme(pop, "odia", "aspetto", bersaglio)) {
      pop.memi.push({ id: ++_memeId, tipo: "odia", dominio: "aspetto", bersaglio, intensita: 0.5,
        origine: f.nome, anno: pop.anno | 0, diffusione: 0 });
      f._leader && f._leader.memi.set(_memeId, 0.7); // il capo lo cavalca per primo
      if (pop.chronicle) pop.chronicle(`${f.nome} coltiva l'odio verso chi ha «${bersaglio}»`, 8);
    }
  } else if (pop.moneta != null && pop.rng() < 0.5) {
    // AMA: un bene prezioso/scarso (spesso la moneta) diventa oggetto di desiderio culturale.
    const mat = pop.registry.mat(pop.moneta);
    if (mat && !hasMeme(pop, "ama", "materiale", mat.nome)) {
      pop.memi.push({ id: ++_memeId, tipo: "ama", dominio: "materiale", bersaglio: mat.nome, intensita: 0.5,
        origine: f.nome, anno: pop.anno | 0, diffusione: 0 });
      f._leader && f._leader.memi.set(_memeId, 0.7);
    }
  }
  if (pop.memi.length > 24) pop.memi.shift(); // tetto: i memi vecchi si estinguono
}
function hasMeme(pop, tipo, dominio, bersaglio) {
  return pop.memi.some((m) => m.tipo === tipo && m.dominio === dominio && m.bersaglio === bersaglio);
}

// Chi ha una paura forte la racconta, e chi ascolta se la prende un po'. Quanto se la prende
// dipende da quanto è portato a credere agli altri (imitazione) e da quanto teme il nuovo. Basta
// questo perché, dopo qualche generazione, un popolo intero eviti una cosa che nessuno ricorda più
// perché si evita: è così che si fanno i divieti, e nessuno li ha mai decisi.
function contagiaAvversioni(da, a) {
  if (!da.esperienze || !a.esperienze) return;
  const credulita = (a.bias.imitazione * 0.6 + a.bias.autorita * 0.2 + (1 - a.intelligenza) * 0.25)
    * (1 + (a._scosso || 0) * 0.7);   // chi è appena stato male crede a tutto
  if (credulita < 0.2) return;
  for (const [k, e] of da.esperienze) {
    if (k[0] !== "m" || e.n < 3) continue;
    if (Math.abs(e.v) < 0.3) continue;
    const mio = a.esperienze.get(k);
    // il bias di conferma: se già la penso diversamente, quello che mi dici mi scivola addosso
    const attrito = mio && Math.sign(mio.v) !== Math.sign(e.v) ? (1 - a.bias.conferma * 0.8) : 1;
    impara(a, k, e.v, 0.32 * credulita * attrito);
  }
}

// ---------------------------------------------------------------------------------------------
// DIFFUSIONE DEI MEMI — dentro la rete sociale (fazione), in modo logistico (come un contagio).
function spreadMemes(pop, dt) {
  if (!pop.memi.length || !pop.factions.length) return;
  const memeById = new Map(pop.memi.map((m) => [m.id, m]));
  for (const m of pop.memi) m.diffusione = 0;

  for (const f of pop.factions) {
    if (!f._membri) continue;
    const nm = f._membri.length;
    // pressione = frazione di membri che già portano ciascun meme
    const port = new Map();
    for (const npc of f._membri) for (const id of npc.memi.keys()) port.set(id, (port.get(id) || 0) + 1);

    for (const npc of f._membri) {
      // assimilazione: alto conformismo → assorbe tutto; intelligenza/diffidenza frenano.
      // BIAS: la percezione, non i fatti, decide. IMITAZIONE (effetto gregge) e conformismo aprono
      // all'assimilazione; l'intelligenza frena. Un meme d'ODIO attecchisce di più su chi ha
      // TRIBALISMO alto (noi-contro-loro). È così che i capi "controllano le masse".
      const b = npc.bias || {};
      const apertura = clamp01(((b.imitazione || 0.5) * 0.6 + npc.conformismo * 0.4)
        * (1.1 - npc.intelligenza * 0.3) * (1 - (b.conferma || 0.4) * 0.4));
      for (const [id, cnt] of port) {
        if (npc.memi.has(id)) continue;
        const meme = memeById.get(id);
        // NON si assimila l'odio verso il PROPRIO aspetto: così l'odio si differenzia per gruppo
        // (i chiari odiano gli scuri, non se stessi) → emergono pregiudizi regionali distinti.
        if (meme && meme.tipo === "odia" && matches(npc, meme)) continue;
        let pull = apertura;
        if (meme && meme.tipo === "odia") pull *= (0.5 + (b.tribalismo || 0.5));
        const pressione = cnt / nm;
        if (pop.rng() < pressione * pull * dt * P.diffusioneMemi) npc.memi.set(id, 0.4 + npc.conformismo * 0.4);
      }
      // i poco conformisti (ribelli/eretici) lasciano cadere i memi nel tempo
      if (npc.conformismo < 0.4) for (const [id, v] of npc.memi) {
        const nv = v - dt * 0.1; if (nv <= 0.05) npc.memi.delete(id); else npc.memi.set(id, nv);
      }
    }
  }
  // conta diffusione totale e purga i memi ormai morti (nessun credente)
  for (const npc of pop.npcs) { if (!npc.vivo) continue; for (const id of npc.memi.keys()) { const m = memeById.get(id); if (m) m.diffusione++; else npc.memi.delete(id); } }
  pop.memi = pop.memi.filter((m) => m.diffusione > 0 || (pop.anno - m.anno) < 4);
}

// ---------------------------------------------------------------------------------------------
// PROPAGANDA / CAPRO ESPIATORIO (C.5) — un capo assetato di potere e senza empatia, col popolo
// scontento, NON risolve il problema: addita un nemico ("è colpa di chi ha la pelle X"). I
// conformisti assorbono il meme e la loro RABBIA cambia bersaglio (valvola di sfogo del regime).
function propaganda(pop, dt) {
  for (const f of pop.factions) {
    if (!f._leader || !f._membri || f._membri.length < 10) continue;
    const L = f._leader;
    if (!L.motiv || L.motiv.potere < 0.6 || L.empatia > 0.35) continue; // serve un capo cinico
    let mal = 0; for (const m of f._membri) mal += m.malcontento || 0; mal /= f._membri.length;
    if (mal < 0.4) continue;               // il popolo deve essere scontento (rischio rivolta)
    if (pop.rng() > dt * 0.8) continue;
    const skins = ["pelle chiara", "pelle olivastra", "pelle scura"];
    const own = factionSkin(f);
    const bersaglio = skins.filter((x) => x !== own)[(pop.rng() * 2) | 0];
    let meme = pop.memi.find((x) => x.tipo === "odia" && x.dominio === "aspetto" && x.bersaglio === bersaglio);
    if (!meme) {
      meme = { id: ++_memeId, tipo: "odia", dominio: "aspetto", bersaglio, intensita: 0.7, origine: f.nome, anno: pop.anno | 0, diffusione: 0 };
      pop.memi.push(meme);
    }
    for (const m of f._membri) {
      if (matches(m, meme)) continue;
      if (pop.rng() < m.conformismo * 0.5) {
        m.memi.set(meme.id, Math.max(m.memi.get(meme.id) || 0, 0.5 + m.conformismo * 0.4));
        m.emo.rabbia = Math.max(0, m.emo.rabbia - 0.15); // la rabbia ora ha un bersaglio esterno
      }
    }
    pop.propagande = (pop.propagande || 0) + 1;
    if (pop.chronicle) pop.chronicle(`Il capo di ${f.nome} addita chi ha «${bersaglio}» come causa dei mali`, 6);
  }
}

// ---------------------------------------------------------------------------------------------
// RELIGIONE — nascita su evento saliente + diffusione sociale + effetto coesione.
const carisma = (npc) => npc.intelligenza * 0.4 + npc.superbia * 0.35 + npc.ambizione * 0.25;

// Chiamato dagli eventi salienti (epidemia, carestia, alluvione, incendio) con un sopravvissuto.
export function maybeFoundReligion(pop, sopravvissuto, evento) {
  if (!sopravvissuto || !sopravvissuto.vivo) return false;
  if ((pop.religioni || []).length >= 6) return false;
  if (carisma(sopravvissuto) < 0.5) return false;
  if (pop.rng() > P.probReligione) return false;
  const id = (pop._relCount = (pop._relCount || 0) + 1);
  const nome = relName(id);
  const rel = {
    id, nome, fondatore: sopravvissuto.id, anno: pop.anno | 0, evento,
    fervore: 0.6, dogmaPaura: clamp01(0.3 + sopravvissuto.emo.paura * 0.5), credenti: 1,
  };
  pop.religioni.push(rel);
  sopravvissuto.credo = id;
  // PRIMI DISCEPOLI: alcuni vicini suscettibili (paurosi/conformisti/poco razionali) si convertono
  // subito, dando alla fede un nucleo vitale da cui diffondersi per rete sociale.
  let seguaci = 0;
  for (const n of pop.npcs) {
    if (seguaci >= 6) break;
    if (!n.vivo || n === sopravvissuto || n.credo != null) continue;
    if ((n.x - sopravvissuto.x) ** 2 + (n.y - sopravvissuto.y) ** 2 > 18 * 18) continue;
    const suscett = 0.45 * n.emo.paura + 0.4 * n.conformismo + rel.dogmaPaura * 0.3 - 0.5 * n.intelligenza;
    if (suscett > 0.15 && pop.rng() < 0.7) { n.credo = id; seguaci++; }
  }
  if (pop.chronicle) pop.chronicle(`Nasce una fede: «${nome}» — un profeta interpreta ${evento} come un segno`, 10);
  return true;
}
function relName(id) {
  const a = ["Sol", "Luna", "Terra", "Fiam", "Acqua", "Cael", "Umbra", "Vent", "Mont", "Mar"];
  const b = ["ismo", "eria", "anza", "ita", "oran", "eden"];
  return a[(id * 7) % a.length] + b[(id * 3) % b.length];
}

function spreadReligion(pop, dt) {
  if (!pop.religioni || !pop.religioni.length) return;
  const relById = new Map(pop.religioni.map((r) => [r.id, r]));
  for (const r of pop.religioni) r.credenti = 0;

  // CONTAGIO SOCIALE per PROSSIMITÀ (come una malattia): la fede NON ha confini, viaggia da
  // persona a persona a prescindere dalla fazione. Due popoli in guerra possono condividerla.
  const CELL = 10, grid = new Map();
  for (const n of pop.npcs) {
    if (!n.vivo || n.credo == null) continue;
    const k = ((n.x / CELL) | 0) + "," + ((n.y / CELL) | 0);
    let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(n);
  }
  for (const npc of pop.npcs) {
    if (!npc.vivo || npc.credo != null) continue;
    const cx = (npc.x / CELL) | 0, cy = (npc.y / CELL) | 0;
    const conta = new Map();
    for (let gy = cy - 1; gy <= cy + 1; gy++) for (let gx = cx - 1; gx <= cx + 1; gx++) {
      const arr = grid.get(gx + "," + gy); if (!arr) continue;
      for (const o of arr) if ((o.x - npc.x) ** 2 + (o.y - npc.y) ** 2 <= CELL * CELL) conta.set(o.credo, (conta.get(o.credo) || 0) + 1);
    }
    if (!conta.size) continue;
    let rid = null, bc = 0; for (const [k, v] of conta) if (v > bc) { bc = v; rid = k; }
    const rel = relById.get(rid); if (!rel) continue;
    const pressione = Math.min(1, bc / 5);
    // si crede per PAURA + CONFORMISMO + bias di AUTORITÀ (fiducia nel profeta) + (ir)razionalità;
    // si RIFIUTA con alta razionalità e poca paura. La percezione conta più dei fatti.
    const b = npc.bias || {};
    // Il bias di CONFERMA rende quasi impermeabili: chi ha già una spiegazione del mondo non ne
    // cerca un'altra. Vale anche per chi non crede in nulla — l'incredulità è essa stessa una
    // convinzione da difendere.
    const conferma = (b.conferma || 0.4);
    const propensione = clamp01(0.4 * npc.emo.paura + 0.35 * npc.conformismo + 0.3 * rel.dogmaPaura
      + 0.25 * (b.autorita || 0.5) - 0.55 * npc.intelligenza - conferma * 0.35);
    if (propensione > 0.05 && pop.rng() < pressione * propensione * dt * P.diffusioneFede) npc.credo = rid;
  }
  // effetto della fede: COESIONE (morale/lealtà su, paura giù) — le dà valore adattivo → persiste.
  for (const npc of pop.npcs) {
    if (!npc.vivo || npc.credo == null) continue;
    const rel = relById.get(npc.credo); if (!rel) { npc.credo = null; continue; }
    rel.credenti++;
    npc.emo.lealta = clamp01(npc.emo.lealta + 0.03 * dt);
    npc.emo.gioia = clamp01(npc.emo.gioia + 0.02 * dt);
    if (npc._ruolo === "sacerdote") npc.azioni.predicazione += 0.05;
    npc.emo.paura = clamp01(npc.emo.paura - 0.03 * dt);
  }
  pop.religioni = pop.religioni.filter((r) => r.credenti > 0 || (pop.anno - r.anno) < 10);
}

// ---------------------------------------------------------------------------------------------
// ERESIE E SCISMI (9.15) — nessun evento "scisma". Un credente CARISMATICO e poco conformista che
// vive lontano dal cuore della fede (o è scontento) interpreta il dogma a modo suo: nasce una setta
// derivata, che si diffonde come la madre e le fa concorrenza. Le fedi si ramificano da sole.
function eresie(pop, dt) {
  if (!pop.religioni.length || pop.religioni.length >= 8) return;
  if (pop.rng() > dt * P.probEresia) return;
  const madre = pop.religioni[(pop.rng() * pop.religioni.length) | 0];
  if (!madre || madre.credenti < 12) return;
  // cerca un eretico: crede, ma è indipendente, carismatico e insoddisfatto
  let eretico = null, best = 0;
  for (let k = 0; k < 80; k++) {
    const n = pop.npcs[(pop.rng() * pop.npcs.length) | 0];
    if (!n || !n.vivo || n.credo !== madre.id) continue;
    const s = carisma(n) + (1 - n.conformismo) * 0.6 + n.malcontento * 0.4 + (n.spiritualita || 0.5) * 0.3;
    if (s > best) { best = s; eretico = n; }
  }
  if (!eretico || best < 1.05) return;
  const id = (pop._relCount = (pop._relCount || 0) + 1);
  const setta = {
    id, nome: madre.nome + "-" + relName(id).slice(0, 3), fondatore: eretico.id, anno: pop.anno | 0,
    evento: `uno scisma da ${madre.nome}`, madre: madre.id,
    fervore: 0.8, dogmaPaura: clamp01(madre.dogmaPaura + (pop.rng() - 0.5) * 0.4), credenti: 1,
  };
  pop.religioni.push(setta);
  eretico.credo = id;
  // trascina con sé i vicini meno conformisti (i primi seguaci dell'eresia)
  let seguaci = 0;
  for (const n of pop.npcs) {
    if (seguaci >= 8) break;
    if (!n.vivo || n.credo !== madre.id) continue;
    if ((n.x - eretico.x) ** 2 + (n.y - eretico.y) ** 2 > 20 * 20) continue;
    if (n.conformismo < 0.55 || n.malcontento > 0.5) { n.credo = id; seguaci++; }
  }
  pop.scismi = (pop.scismi || 0) + 1;
  if (pop.chronicle) pop.chronicle(`Scisma religioso: nasce «${setta.nome}» dalle ceneri di ${madre.nome}`, 8);
}

// ---------------------------------------------------------------------------------------------
// CULTURA ESPRESSIVA (9.5 / 4.7) — arte, canti, riti, feste. Non c'è un elenco di opere: un NPC
// CREATIVO con i bisogni soddisfatti produce un'OPERA (ne emerge il tipo dai suoi tratti); chi la
// vede ne trae gioia e coesione. Le opere ripetute nello stesso luogo diventano TRADIZIONI (feste
// ricorrenti) del gruppo: la cultura esiste perché aumenta il morale, non perché l'abbiamo scritta.
const FORME = ["canto", "danza", "pittura", "racconto", "rito", "scultura", "festa"];
function arte(pop, dt) {
  for (const npc of pop.npcs) {
    if (!npc.vivo || npc.fame > 0.5 || npc.salute < 0.5) continue;
    const spinta = (npc.creativita || 0.5) * 0.6 + (npc.spiritualita || 0.5) * 0.25 + npc.emo.gioia * 0.3;
    if (spinta < 0.6 || pop.rng() > dt * P.probArte * spinta) continue;
    // la FORMA emerge dai tratti: chi è spirituale fa riti, chi è socievole feste, ecc.
    const idx = Math.min(FORME.length - 1, Math.floor(
      ((npc.spiritualita || 0.5) * 3 + (npc.socievolezza || 0.5) * 3 + npc.intelligenza * 1.5) % FORME.length));
    const forma = FORME[idx];
    npc.reputazione.artista = (npc.reputazione.artista || 0) + 1;
    npc.azioni.opera++; npc._att = "creare";
    npc.emo.soddisfazione = clamp01(npc.emo.soddisfazione + 0.25);
    let pubblico = 0;
    for (const o of pop.vicini(npc.x, npc.y, 10)) {   // chi e' a portata di voce, non tutto il mondo
      if (o === npc) continue;
      o.emo.gioia = clamp01(o.emo.gioia + 0.12);
      o.emo.lealta = clamp01(o.emo.lealta + 0.06);   // l'arte condivisa fa gruppo
      o.emo.tristezza = clamp01(o.emo.tristezza - 0.08);
      pubblico++;
    }
    pop.opere = (pop.opere || 0) + 1;
    if (pubblico >= 5) {
      // una forma che raduna gente attecchisce: diventa TRADIZIONE del popolo
      if (!pop.tradizioni) pop.tradizioni = new Map();
      const chiave = forma + (npc.fazione != null ? "@" + npc.fazione : "");
      const t = (pop.tradizioni.get(chiave) || 0) + 1;
      pop.tradizioni.set(chiave, t);
      if (t === 6 && pop.chronicle) pop.chronicle(`Si afferma una tradizione: il ${forma} del popolo`, 10);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// GUERRA — ostilità fra fazioni (istantanea, robusta agli id instabili) e razzie ai confini.
function factionSkin(f) {
  let s = 0, n = 0;
  for (const m of f._membri) { s += (m.genes ? m.genes.melanina : 0.5); n++; }
  const mel = n ? s / n : 0.5;
  return mel < 0.4 ? "pelle chiara" : mel < 0.7 ? "pelle olivastra" : "pelle scura";
}
function factionFaith(f) {
  const c = new Map();
  for (const m of f._membri) if (m.credo != null) c.set(m.credo, (c.get(m.credo) || 0) + 1);
  let best = null, bc = 0; for (const [k, v] of c) if (v > bc) { bc = v; best = k; }
  return bc > f._membri.length * 0.3 ? best : null;
}
// Quanto la fazione A odia l'aspetto B (per i memi che porta)?
function hateToward(pop, f, tagB) {
  let h = 0;
  for (const npc of f._membri) {
    for (const [mid, v] of npc.memi) {
      const m = pop.memi.find((x) => x.id === mid);
      if (m && m.tipo === "odia" && m.dominio === "aspetto" && m.bersaglio === tagB) h += v;
    }
  }
  return h / Math.max(1, f._membri.length);
}

// Quanto il capo di una fazione DESIDERA la guerra (per sé: gloria, potere, follia).
function leaderGloria(f) {
  const L = f._leader;
  if (!L || !L.motiv) return 0;
  let g = (L.motiv.potere + L.superbia + L.aggressivita) / 3;
  // SICUMERA (bias): il capo SOVRASTIMA la propria forza → cerca guerre che non dovrebbe (errore di
  // valutazione). E un outlier crudele senza empatia porta la follia al comando.
  if (L.bias) g += (L.bias.sicumera || 0) * 0.25;
  if (L.aggressivita > 0.88 && L.empatia < 0.12) g += 0.5;
  return Math.min(1, g);
}

function warfare(pop, idMap, dt) {
  const facs = pop.factions.filter((f) => f._membri && f._membri.length >= 8);
  pop.guerreAttive = 0; pop.fronti = [];
  if (facs.length < 2) return;
  // precompute
  for (const f of facs) { f._skin = factionSkin(f); f._faith = factionFaith(f); }

  for (let i = 0; i < facs.length; i++) for (let j = i + 1; j < facs.length; j++) {
    const A = facs[i], B = facs[j];
    const dx = A.x - B.x, dy = A.y - B.y, dist2 = dx * dx + dy * dy;
    if (dist2 > 90 * 90) continue; // troppo lontane per confliggere
    const vicinanza = clamp01(1 - Math.sqrt(dist2) / 90);

    // OSTILITÀ = odio reciproco (memi) + invidia collettiva del più forte + competizione per terra,
    // attenuata da RELIGIONE condivisa (ma non azzerata: stessa fede può comunque farsi guerra).
    const odio = hateToward(pop, A, B._skin) + hateToward(pop, B, A._skin);
    // L'INVIDIA COLLETTIVA GUARDA ANCHE QUANTO HANNO, NON SOLO QUANTI SONO.
    //
    // Qui c'era solo `Math.abs(A.membri - B.membri)`: la differenza di NUMERO. Misurato su 1 150
    // coppie di popoli vicini con 787 guerre in corso, il divario di ricchezza non prediceva
    // niente (correlazione 0,018; divario medio 0,380 fra chi si fa la guerra contro 0,371 fra chi
    // sta in pace — rumore), mentre quello di numero prediceva forte (0,405; 0,632 contro 0,306).
    // Cioè: i poveri NON guardavano i ricchi, e non poteva succedere da solo perché la ricchezza
    // non entrava proprio nel conto.
    //
    // Non è una legge nuova: è la stessa che già funziona sul singolo — si vuole ciò che si vede
    // addosso a un altro — applicata a un soggetto più grande. E chi invidia è **chi ha meno**,
    // pesato dalla SUA invidia, non una media dei due: un ricco non invidia il povero.
    const perNumero = (Math.abs(A.membri - B.membri) / Math.max(A.membri, B.membri))
      * ((A.cultura.invidia + B.cultura.invidia) / 2);
    const rA = A.ricchezza ?? 1, rB = B.ricchezza ?? 1;
    const povero = rA < rB ? A : B, ricco = rA < rB ? B : A;
    const perRoba = ((ricco.ricchezza ?? 1) - (povero.ricchezza ?? 1)) / Math.max(ricco.ricchezza ?? 1, 1e-6)
      * (povero.cultura.invidia || 0.4);
    // Il termine del NUMERO resta intero. Alla prima prova l'avevo pesato 0,6 per far posto a
    // quello della roba, e la misura mi ha punito: non ho fatto guardare i ricchi ai poveri, ho
    // solo **diluito l'unico segnale che c'era** — entrambe le correlazioni sono crollate a zero
    // e le guerre sono scese dal 68% al 51% delle coppie. Si aggiunge, non si scambia.
    const invidiaColl = clamp01(perNumero + Math.max(0, perRoba) * 0.8);
    // Competizione per le risorse: pesa SOLO quando la terra scarseggia davvero (fertilità bassa).
    // Così le guerre di conquista nascono dalla scarsità, non dalla semplice vicinanza.
    const scarsita = 1 - (pop.fertilitaMedia != null ? pop.fertilitaMedia : 1);
    const competizione = vicinanza * scarsita * 1.5;
    const stessaFede = (A._faith != null && A._faith === B._faith) ? 0.35 : 0;
    const aggro = (A.cultura.aggressivita + B.cultura.aggressivita) / 2;
    // VENDETTA (C.6): le razzie passate lasciano RANCORI fra popoli che covano per generazioni.
    const chiave = [A.nome, B.nome].sort().join("⚔");
    const rancore = Math.min(1, (pop._rancori.get(chiave) || 0) / 40);
    // GLORIA/FOLLIA del capo: un leader guerrafondaio (potere+superbia+aggressività) — o un
    // outlier crudele senza empatia — cerca la guerra per sé, non per il popolo.
    const gloria = Math.max(leaderGloria(A), leaderGloria(B)) * 0.3;
    // L'ostilità nasce da GRIEVANCE e da CHI COMANDA: odio-memi, invidia collettiva, scarsità,
    // vendetta, gloria. L'aggressività culturale amplifica ma da sola non basta.
    const ostilita = clamp01(odio * P.pesoOdio + invidiaColl * 0.7 + competizione + rancore * P.pesoRancore + gloria + aggro * 0.15 - stessaFede);

    if (ostilita > P.sogliaOstilita) {
      pop.guerreAttive++;
      (pop.fronti || (pop.fronti = [])).push({ ax: A.x, ay: A.y, bx: B.x, by: B.y, a: A.nome, b: B.nome, intensita: ostilita });
      if (!pop._guerreViste) pop._guerreViste = new Set();
      const chiave = [A.nome, B.nome].sort().join("⚔");
      if (!pop._guerreViste.has(chiave) && pop.chronicle) {
        pop._guerreViste.add(chiave);
        pop.chronicle(`Scoppia la guerra tra ${A.nome} e ${B.nome}${stessaFede ? " (stessa fede)" : ""}`, 6);
      }
      raid(pop, A, B, ostilita, dt);
    } else if (ostilita < 0.15 && vicinanza > 0.5) {
      // RIUNIFICAZIONE (0.D.4): due popoli vicini, senza rancori, con fede e lingua affini si
      // frequentano: i legami di confine si RAFFORZANO finché il grafo torna un cluster unico.
      // Nessun evento "fusione": è la rete sociale che si ricuce da sola.
      const stessaLingua = Math.abs(mediaLingua(A) - mediaLingua(B)) < 0.12;
      if (!stessaLingua && A._faith !== B._faith) continue;
      for (let k = 0; k < 3; k++) {
        const a = A._membri[(pop.rng() * A._membri.length) | 0];
        const b = B._membri[(pop.rng() * B._membri.length) | 0];
        if (!a || !b || !a.vivo || !b.vivo) continue;
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 > 15 * 15) continue;
        a.memoria.set(b.id, clamp01(((a.memoria.get(b.id) || 0) + 0.25)));
        b.memoria.set(a.id, clamp01(((b.memoria.get(a.id) || 0) + 0.25)));
        contagiaAvversioni(a, b); contagiaAvversioni(b, a);
        pop.riavvicinamenti = (pop.riavvicinamenti || 0) + 1;
      }
    }
  }
}
function mediaLingua(f) { let s = 0; for (const m of f._membri) s += m.lingua; return s / f._membri.length; }

// GUERRA — livello 1 (caos: razzie di confine) + livello 2 (TATTICA: un leader capace organizza
// attacchi COORDINATI verso il fronte nemico, più forti). L'organizzazione emerge dall'abilità del
// leader (intelligenza/ambizione) e dal MORALE (una fazione demoralizzata combatte peggio).
function raid(pop, A, B, ostilita, dt) {
  const chiave = [A.nome, B.nome].sort().join("⚔");
  pop._rancori.set(chiave, (pop._rancori.get(chiave) || 0) + 1);
  const L = A._leader;
  const organiz = L ? (L.intelligenza * 0.6 + L.ambizione * 0.4) : 0.3; // capacità tattica del capo
  const intensita = ostilita * dt * P.intensitaRazzia * (0.7 + organiz);
  let colpi = Math.min(9, Math.floor(intensita * 10) + (pop.rng() < intensita ? 1 : 0));

  // LIVELLO 2: con un buon condottiero, l'attacco si CONCENTRA presso il leader nemico (assalto al
  // centro) invece di essere sparso — più efficace e destabilizzante.
  const coordinato = pop.rng() < organiz;
  const bersaglioX = coordinato ? B._leader.x : null, bersaglioY = coordinato ? B._leader.y : null;
  while (colpi-- > 0) {
    const att = A._membri[(pop.rng() * A._membri.length) | 0];
    let dif;
    if (coordinato) { // scegli un difensore vicino al bersaglio (il fronte concentrato)
      dif = B._membri[(pop.rng() * B._membri.length) | 0];
      for (let t = 0; t < 3; t++) { const c = B._membri[(pop.rng() * B._membri.length) | 0]; if (((c.x - bersaglioX) ** 2 + (c.y - bersaglioY) ** 2) < ((dif.x - bersaglioX) ** 2 + (dif.y - bersaglioY) ** 2)) dif = c; }
    } else dif = B._membri[(pop.rng() * B._membri.length) | 0];
    if (!att || !dif || !att.vivo || !dif.vivo) continue;
    if ((att.x - dif.x) ** 2 + (att.y - dif.y) ** 2 > 22 * 22) continue;
    // il MORALE (lealtà/gioia) del difensore ne alza la resistenza; l'organizzazione dell'attaccante la supera
    // Chi si batte da una vita colpisce meglio di chi è al primo scontro — e chi ha imparato a
    // difendersi incassa meglio. Non è l'età: è quante volte l'hai già fatto.
    const forza = (0.25 + att.forza * 0.4 + att.aggressivita * 0.2) * (0.8 + organiz * 0.5)
      * bonus(att, "combattimento", 0.6, 1.0);
    dif.salute -= forza / bonus(dif, "combattimento", 0.85, 0.5);
    // chi combatte lo fa DAVVERO: si registra come attività, e da lì può emergere il mestiere
    att.azioni.combattimento++; att._att = "combattere"; dif._att = "difendersi";
    // SCONTRO VISIBILE: il punto dello scontro viene segnato per il rendering (lampi sulla mappa)
    (pop.scontri || (pop.scontri = [])).push({ x: (att.x + dif.x) / 2, y: (att.y + dif.y) / 2, t: pop.anno, mortale: false });
    if (pop.scontri.length > 60) pop.scontri.shift();
    dif.emo.paura = clamp01(dif.emo.paura + 0.5); dif.emo.rabbia = clamp01(dif.emo.rabbia + 0.4);
    dif.emo.lealta = clamp01(dif.emo.lealta - 0.05); // la guerra logora il morale
    if (dif.memoria) dif.memoria.set(att.id, -1);
    for (const [id, q] of dif.inventory) { if (q > 0) { dif.inventory.set(id, q - 1); att.addMat(id, 1); break; } }
    pop.razzieTot = (pop.razzieTot || 0) + 1;
    if (dif.salute <= 0) {
      dif.vivo = false; pop.morti++; pop.omicidi = (pop.omicidi || 0) + 1;
      pop.mortiGuerra = (pop.mortiGuerra || 0) + 1;
      att.reputazione.guerriero = (att.reputazione.guerriero || 0) + 1;
      att.emo.gioia = clamp01(att.emo.gioia + 0.05); // il veterano vittorioso
      if (pop.scontri.length) pop.scontri[pop.scontri.length - 1].mortale = true;
    }
  }
  // SACCHEGGIO — ciò che è stato costruito può essere DISTRUTTO. Le case bruciano (chi le abitava
  // resta senza riparo) e gli edifici del nemico crollano: la guerra cancella il lavoro di anni.
  const dannoStrutture = ostilita * dt * (0.6 + organiz);
  if (pop.rng() < dannoStrutture) {
    const dif = B._membri[(pop.rng() * B._membri.length) | 0];
    if (dif && dif.casa) {
      const vicino = A._membri.some((a) => a.vivo && (a.x - dif.casa[0]) ** 2 + (a.y - dif.casa[1]) ** 2 < 24 * 24);
      if (vicino) {
        dif.casa = null; dif.casaLivello = 0; dif.riparo = 1;
        dif.emo.rabbia = clamp01(dif.emo.rabbia + 0.5); dif.malcontento = clamp01(dif.malcontento + 0.15);
        pop.caseDistrutte = (pop.caseDistrutte || 0) + 1;
      }
    }
    // un edificio (istituzione) dentro il territorio nemico può essere raso al suolo
    if (pop.buildings.length && pop.rng() < 0.25) {
      for (let k = 0; k < pop.buildings.length; k++) {
        const b = pop.buildings[k];
        const suoNemico = B._membri.some((m) => (m.x - b.x) ** 2 + (m.y - b.y) ** 2 < 18 * 18);
        const raggiunto = A._membri.some((a) => a.vivo && (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < 20 * 20);
        if (suoNemico && raggiunto) {
          pop.buildings.splice(k, 1);
          pop.edificiDistrutti = (pop.edificiDistrutti || 0) + 1;
          pop.chronicle && pop.chronicle(`${A.nome} rade al suolo un edificio di ${B.nome}`, 5);
          break;
        }
      }
    }
  }
  if (coordinato) pop.battaglie = (pop.battaglie || 0) + 1;

}

// ---------------------------------------------------------------------------------------------
export function stepCulture(pop, dt) {
  if (!pop.memi) pop.memi = [];
  if (!pop.religioni) pop.religioni = [];
  if (!pop.factions || !pop.factions.length) return;
  // mappa id→npc una volta sola (O(n))
  const idMap = new Map();
  for (const n of pop.npcs) if (n.vivo) idMap.set(n.id, n);

  // RELIGIONE: dopo un evento saliente (carestia/alluvione/pestilenza) un sopravvissuto carismatico
  // e spaventato può fondare una fede, interpretando la propria sopravvivenza come un segno.
  if (pop._eventoSaliente && (pop.anno - pop._eventoSaliente.anno) < 3 && pop.npcs.length) {
    let cand = null, best = 0;
    for (let k = 0; k < 60; k++) {
      const n = pop.npcs[(pop.rng() * pop.npcs.length) | 0];
      if (!n || !n.vivo || n.credo != null) continue;
      const sc = carisma(n) + n.emo.paura * 0.3;
      if (sc > best) { best = sc; cand = n; }
    }
    // Se qualcuno fonda la fede, l'evento è "consumato"; altrimenti resta finché la finestra è aperta.
    if (maybeFoundReligion(pop, cand, pop._eventoSaliente.evento)) pop._eventoSaliente = null;
  }

  coinMemes(pop, idMap, dt);
  propaganda(pop, dt);
  spreadMemes(pop, dt);
  spreadReligion(pop, dt);
  eresie(pop, dt);
  arte(pop, dt);
  warfare(pop, idMap, dt);
}
