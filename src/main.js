// Bootstrap Milestone 1: collega mondo, materiali, rendering e interfaccia.
import { generateWorld, BIOME_NAME, isWater } from "./world.js";
import { MaterialRegistry, makeMaterial, defaultMaterials, PROPS } from "./materials.js";
import { WorldRenderer, AgentsRenderer, COLORE_ATT } from "./render.js";
import { physiology, KnowledgeBase, combine, analyze, classify, mixColor, signature, inventName, simulate, PROCESSES } from "./chemistry.js";
import { Population } from "./npc.js";
import { spawnAnimals, stepEcosystem, seedOutbreak, predatorThreatQuery } from "./animals.js";
import { stepSociety } from "./emotions.js";
import { stepBuildings, buildingCounts } from "./buildings.js";
import { stepFire, igniteFire } from "./fire.js";
import { updateFactions } from "./factions.js";
import { qualitaCasa, splendoreDi } from "./desire.js";
import { segnata, comeLHaCambiata } from "./tempra.js";
import { stato, indossabile, puo } from "./matter.js";
import { updateMoneta } from "./economy.js";
import { stepCulture } from "./culture.js";
import { stepClimate } from "./climate.js";
import { stepSocietyAdvanced } from "./society.js";
import { stepAI, aiStats } from "./ai.js";
// Erano scritte e non le leggeva nessuno: quello che un popolo ha imparato ad amare e a temere e'
// la cosa piu' notevole che questo motore produca, e non si vedeva da nessuna parte.
import { inclinazioni, avversioni } from "./experience.js";
import { gradoDi, perizia } from "./skill.js";
import { stepEntities, entitaStats } from "./entities.js";
import { P, DEF, SCHEMA, resetParams, paramModificati } from "./params.js";
import { makeRng } from "./rng.js";
import { Storia } from "./storia.js";
import { Grafici } from "./grafici.js";

const $ = (id) => document.getElementById(id);
const status = (msg) => { $("status").textContent = msg; };

const canvas = $("world");
const renderer = new WorldRenderer(canvas);
const agentsRenderer = new AgentsRenderer($("agents"), null);
const registry = new MaterialRegistry();
let population = null;
// LA MEMORIA DEL MONDO. Vive accanto alla popolazione e muore con lei: un mondo nuovo e' una
// storia nuova, e mescolare le due farebbe grafici che raccontano una partita che non e' mai stata.
let storia = null;
let grafici = null;
let schedaAttiva = "mappa";
renderer.agents = $("agents");          // il renderer dimensiona anche il livello delle creature
agentsRenderer.bind(renderer);          // stessa camera per mondo e creature
renderer.onResize = () => agentsRenderer.draw();

// Carica materiali salvati (localStorage) o quelli di default.
function loadMaterials() {
  try {
    // v6: proprietà FONDAMENTALI (niente più cura/veleno/nutrimento). I salvataggi v5 sono
    // incompatibili (attributi antropocentrici) e vengono ignorati: si riparte dai default.
    const raw = localStorage.getItem("evo.materials.v6");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr.map((m) => makeMaterial(m));
    }
  } catch (e) { /* ignora */ }
  return defaultMaterials();
}
function saveMaterials() {
  const arr = registry.materials.map(({ nome, descrizione, rarita, ambiente, colore, props }) =>
    ({ nome, descrizione, rarita, ambiente, colore, props }));
  localStorage.setItem("evo.materials.v6", JSON.stringify(arr));
}

registry.materials = loadMaterials();

let knowledge = new KnowledgeBase();
const labRng = makeRng("laboratorio");

let world = null;
function regenerate() {
  const seed = $("seed").value || "terra";
  const waterPct = parseInt($("waterPct").value, 10);
  status("Genero il mondo…");
  // timeout 0 per lasciar aggiornare lo status
  setTimeout(() => {
    const dim = parseInt(($("dimMondo") || {}).value || 320, 10);
    world = generateWorld({ seed, width: dim, height: dim, waterPct });
    registry.bindWorld(world);
    renderer.setWorld(world, registry);
    if (renderer.selectedMat && !registry.mat(renderer.selectedMat.id)) {
      renderer.selectedMat = null;
    }
    // Nuovo mondo -> nuova conoscenza collettiva e nuova popolazione.
    knowledge = new KnowledgeBase();
    population = new Population(world, registry, knowledge);
    storia = new Storia();
    renderer.pop = population; // per la vista inquinamento
    population.spawn(parseInt($("popStart").value, 10));
    spawnAnimals(population, parseInt($("herbStart").value, 10), parseInt($("predStart").value, 10));
    agentsRenderer.setWorld(world);
    agentsRenderer.setPopulation(population);
    renderer.draw();
    renderer.resize(); // sincronizza dimensioni + agents canvas
    updatePopStats();
    renderBeliefs();
    status(`Mondo "${seed}" · terra ${(world.landRatio * 100).toFixed(1)}% · pop. ${population.npcs.length}`);
  }, 10);
}

// ---- Lista materiali ----
function renderMatList() {
  const ul = $("matList");
  ul.innerHTML = "";
  for (const m of registry.materials) {
    const li = document.createElement("li");
    if (renderer.selectedMat && renderer.selectedMat.id === m.id) li.classList.add("active");
    // Lo stato lo si guarda a un clima medio: è quello di gran parte delle terre abitate.
    const st = stato(m.props, 0.5);
    const spl = splendoreDi(m), ind = indossabile(m.props, 0.5);
    const segno = st === "liquido" ? "💧" : st === "gassoso" ? "☁️" : "";
    li.innerHTML = `
      <span class="swatch" style="background:${m.colore}"></span>
      <span class="name">${m.nome}${segno}</span>
      ${spl > 0.45 ? `<span class="luce" title="quanto cattura l'occhio: ${(spl * 100) | 0}%">✦</span>` : ""}
      <span class="rarity">${m.rarita}</span>`;
    li.title = (m.descrizione || "") + `\n— ${st}` +
      `\n— splende ${(spl * 100) | 0}%` +
      `\n— ${ind > 0.5 ? "si porta addosso" : ind > 0.05 ? "si porta a fatica" : "non si porta addosso"}` +
      `\n— ${puo("bere", m.props, 0.5) > 0.5 ? "si beve" : "non si beve"}, ` +
      `${puo("costruire", m.props, 0.5) > 0.5 ? "ci si costruisce" : "non ci si costruisce"}`;
    li.addEventListener("click", () => {
      const same = renderer.selectedMat && renderer.selectedMat.id === m.id;
      renderer.setSelected(same ? null : m);
      renderMatList();
      status(same ? "Nessun materiale selezionato." : `Giacimenti di ${m.nome} evidenziati.`);
    });
    ul.appendChild(li);
  }
}

// ---- Modal nuovo materiale ----
function buildPropSliders() {
  const grid = $("mProps");
  grid.innerHTML = "";
  for (const { key, label } of PROPS) {
    const row = document.createElement("label");
    row.className = "bar";
    row.innerHTML = `<span class="bl">${label}</span>
      <input type="range" min="0" max="100" value="20" data-prop="${key}" style="flex:1" />
      <span class="bv" data-out="${key}">.20</span>`;
    const inp = row.querySelector("input");
    const out = row.querySelector("[data-out]");
    inp.addEventListener("input", () => { out.textContent = (inp.value / 100).toFixed(2).slice(1); });
    grid.appendChild(row);
  }
}
function readPropSliders() {
  const props = {};
  $("mProps").querySelectorAll("input[data-prop]").forEach((inp) => {
    props[inp.dataset.prop] = inp.value / 100;
  });
  return props;
}
function openModal() { buildPropSliders(); $("matModal").classList.remove("hidden"); $("mNome").focus(); }
function closeModal() { $("matModal").classList.add("hidden"); }

$("addMatBtn").addEventListener("click", openModal);
$("mAnnulla").addEventListener("click", closeModal);
$("mSalva").addEventListener("click", () => {
  const nome = $("mNome").value.trim();
  if (!nome) { $("mNome").focus(); return; }
  const mat = makeMaterial({
    nome,
    descrizione: $("mDesc").value.trim(),
    rarita: $("mRarita").value,
    ambiente: $("mAmbiente").value,
    colore: $("mColore").value,
    props: readPropSliders(),
  });
  registry.add(mat);
  saveMaterials();
  renderMatList();
  buildLabRows();
  closeModal();
  $("mNome").value = ""; $("mDesc").value = "";
  renderer.setSelected(mat);
  renderMatList();
  status(`Materiale "${nome}" creato e distribuito nel mondo.`);
});

// ---- Laboratorio: combina materiali -> oggetto ----
let labIngredienti = [{ matId: null, qta: 1 }];

function buildLabRows() {
  const wrap = $("labRows");
  wrap.innerHTML = "";
  labIngredienti.forEach((ing, idx) => {
    const row = document.createElement("div");
    row.className = "lab-row";
    const opts = registry.materials
      .map((m) => `<option value="${m.id}" ${ing.matId === m.id ? "selected" : ""}>${m.nome}</option>`)
      .join("");
    row.innerHTML = `
      <select data-i="${idx}"><option value="">— materiale —</option>${opts}</select>
      <input type="number" min="1" max="99" value="${ing.qta}" data-q="${idx}" />
      <button class="rm" data-rm="${idx}">✕</button>`;
    row.querySelector("select").addEventListener("change", (e) => {
      labIngredienti[idx].matId = e.target.value ? parseInt(e.target.value, 10) : null;
      updateLabResult();
    });
    row.querySelector("input").addEventListener("input", (e) => {
      labIngredienti[idx].qta = Math.max(1, parseInt(e.target.value, 10) || 1);
      updateLabResult();
    });
    row.querySelector(".rm").addEventListener("click", () => {
      labIngredienti.splice(idx, 1);
      if (!labIngredienti.length) labIngredienti.push({ matId: null, qta: 1 });
      buildLabRows(); updateLabResult();
    });
    wrap.appendChild(row);
  });
  updateLabResult();
}

function activeIngredienti() {
  return labIngredienti.filter((i) => i.matId && i.qta > 0);
}

function bar(label, v) {
  return `<div class="bar"><span class="bl">${label}</span>
    <span class="bt"><span class="bf" style="width:${Math.round(v * 100)}%"></span></span>
    <span class="bv">${v.toFixed(2).slice(1)}</span></div>`;
}

// Barra che può superare 1 (attributi additivi): cap grafico a 1, valore reale a lato.
function barX(label, v, danger) {
  const w = Math.min(100, Math.round(v * 100));
  return `<div class="bar"><span class="bl">${label}</span>
    <span class="bt"><span class="bf" style="width:${w}%;${danger ? "background:var(--danger)" : ""}"></span></span>
    <span class="bv">${v.toFixed(2)}</span></div>`;
}

function stabColor(s) { return s > 0.66 ? "#4caf6a" : s > 0.4 ? "#e0a030" : "var(--danger)"; }

function updateLabResult() {
  const box = $("labResult");
  const ings = activeIngredienti();
  if (ings.length === 0) {
    box.className = "lab-result empty";
    box.textContent = "Combina materiali: la categoria e la stabilità emergono dagli attributi.";
    $("discover").disabled = true;
    return;
  }
  const proc = $("labProc").value || "grezzo";
  const c = combine(ings, registry, proc);
  const attr = c.attr;
  const eff = analyze(c);
  const { categoria } = classify(attr);
  const colore = mixColor(ings, registry);
  const known = knowledge.beliefs.get(signature(ings, proc));

  const s = eff.stabilita;
  const nome = inventName(ings, registry, proc);
  const relevant = PROPS.filter((p) => attr[p.key] > 0.02);
  box.className = "lab-result";
  box.innerHTML = `
    <div class="arch">
      <span class="ico">${categoria.icona}</span>
      <span class="obj-swatch" style="background:${colore}"></span>
      <span class="nm">${nome}</span>
      <span class="badge">${categoria.nome}</span>
      <span class="aff" style="color:${stabColor(s)}">stab. ${(s * 100) | 0}%</span>
    </div>
    <div class="stab-warn">${s < 0.4 ? "⚠️ Molto instabile: rischio di esplosione/rottura/avvelenamento." : ""}</div>
    ${relevant.map((p) => barX(p.label, attr[p.key], (p.key === "tossicita" || p.key === "energiaChim" || p.key === "fragilita") && s < 0.5)).join("")}
    ${known ? `<div class="belief-line">La popolazione lo ritiene <b>${known.verdetto}</b> · affidabilità ${(known.affidabilita * 100) | 0}% (${known.prove} prove)</div>` : ""}`;
  $("discover").disabled = false;
}

$("addIng").addEventListener("click", () => {
  labIngredienti.push({ matId: null, qta: 1 });
  buildLabRows();
});

// Popola il selettore dei processi e aggiorna il risultato al cambio.
$("labProc").innerHTML = PROCESSES.map((p) => `<option value="${p.id}">${p.icona} ${p.nome}</option>`).join("");
$("labProc").addEventListener("change", updateLabResult);

// "Prova esperimento": simula un uso, con esito casuale pesato dalla stabilità,
// e registra la prova nelle Conoscenze (l'affidabilità cresce con le prove).
$("discover").addEventListener("click", () => {
  const ings = activeIngredienti();
  if (!ings.length) return;
  const proc = $("labProc").value || "grezzo";
  const c = combine(ings, registry, proc);
  const attr = c.attr;
  const eff = analyze(c);
  const { categoria } = classify(attr);
  const esito = simulate(attr, eff, labRng);
  const { belief } = knowledge.record({
    ingredienti: ings, categoria, colore: mixColor(ings, registry), processo: proc,
    attr, eff, esito, nome: inventName(ings, registry, proc), anno: population ? population.anno : 0, autore: "Laboratorio",
  });
  renderBeliefs();
  updateLabResult();
  const esitoTxt = esito.riuscito
    ? (esito.positivo ? "effetto benefico ✓" : "riuscito ma dannoso")
    : `fallito: ${esito.incidente} ✗`;
  status(`Esperimento (${categoria.nome}): ${esitoTxt}. Affidabilità ${(belief.affidabilita * 100) | 0}%.`);
});

// ---- Fazioni ----
function renderFactions() {
  if (!population) return;
  const facs = population.factions || [];
  $("facCount").textContent = facs.length;
  const ul = $("facList");
  // Quanto ne sa di armi ogni popolo, e in che mestiere è più forte: dalle coorti, che li tengono
  // già raggruppati per luogo e specializzazione.
  const armi = new Map(), mestieriDi = new Map();
  if (population.coorti) {
    for (const co of population.coorti.values()) {
      const a = armi.get(co.popolo) || { s: 0, n: 0 };
      a.s += (co.perizie.combattimento || 0) * co.n; a.n += co.n;
      armi.set(co.popolo, a);
      if (co.mestiere) {
        const mm = mestieriDi.get(co.popolo) || new Map();
        mm.set(co.mestiere, (mm.get(co.mestiere) || 0) + co.n);
        mestieriDi.set(co.popolo, mm);
      }
    }
  }
  const gradoArmi = (v) => v < 0.15 ? "non sanno battersi" : v < 0.35 ? "qualcuno ha combattuto"
    : v < 0.6 ? "gente d'arme" : "veterani";

  ul.innerHTML = facs.slice(0, 10).map((f) => {
    const c = f.cultura;
    const a = armi.get(f.id);
    const perArmi = a && a.n ? a.s / a.n : 0;
    const mm = mestieriDi.get(f.id);
    const mestTxt = mm ? [...mm].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => `${k} ×${v}`).join(", ") : "nessuna specializzazione";
    const indole = c.aggressivita > 0.58 ? "bellicosa" : c.empatia > 0.58 ? "solidale" : c.avidita > 0.58 ? "avida" : c.ambizione > 0.58 ? "ambiziosa" : "equilibrata";
    const d = f.dnaCulturale || {};
    const dnaTxt = Object.entries(d).map(([k, v]) => `${k} ${(v * 100) | 0}`).join(" · ");
    return `<li title="Leader ${f.archetipo || "capo"}: int ${(f.leaderTratti.intelligenza*100)|0} · forza ${(f.leaderTratti.forza*100)|0} · ambiz ${(f.leaderTratti.ambizione*100)|0}
Coesione ${((f.coesione||0)*100)|0}% · territorio ${f.territorio||0} celle
Indole ${indole}
Armi: ${gradoArmi(perArmi)} (perizia media ${(perArmi * 100) | 0}%)
Specializzati: ${mestTxt}
DNA culturale: ${dnaTxt}">
      <span class="swatch" style="background:${f.colore}"></span>
      <span class="name">${f.nome} <span style="color:var(--muted);font-size:11px">${f.taglia} · ${f.archetipo || ""}</span></span>
      <span class="rarity" style="color:${(f.coesione||0) < 0.3 ? "var(--danger)" : "inherit"}">${f.membri} · ⚭${((f.coesione||0)*100)|0}%${perArmi > 0.3 ? ` · <span title="quanto sa battersi questa gente" style="color:#e0a030">⚔${(perArmi * 100) | 0}</span>` : ""}</span></li>`;
  }).join("");
}

// Legenda dei colori delle attività: compare quando si guarda la mappa "Attività".
function renderLegenda() {
  const box = $("legenda"); if (!box) return;
  if (renderer.view !== "attivita") { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  const conteggio = {};
  if (population) for (const n of population.npcs) if (n.vivo) {
    const a = n._att ? (n._att.startsWith("ordine:") ? "agli ordini" : n._att) : "in cammino";
    conteggio[a] = (conteggio[a] || 0) + 1;
  }
  const voci = Object.entries(conteggio).sort((a, b) => b[1] - a[1]);
  box.innerHTML = "<b>Cosa stanno facendo</b>" + voci.map(([a, n]) =>
    `<div class="lg"><span class="pt" style="background:${COLORE_ATT(a === "agli ordini" ? "ordine:x" : a)}"></span>${a} <b>${n}</b></div>`).join("");
}

// Le parole che i capi hanno messo in giro, e quante hanno fatto presa. Non e' una statistica di
// servizio: e' l'unico posto in cui si vede che una lingua si sta formando da sola.
function parole() {
  const lex = population && population.significati;
  if (!lex || !lex.size) return { tot: 0, radicate: 0 };
  let radicate = 0;
  const distinte = new Set();
  for (const v of lex.values()) { distinte.add(v.parola); if (v.forza > 0.4) radicate++; }
  return { tot: distinte.size, radicate };
}

// ---- M6: le menti al potere ----
function renderAI() {
  if (!population) return;
  const s = aiStats(population);
  if (!s) return;
  $("aiState").textContent = s.attiva ? (s.inVolo ? `pensa… (${s.provider || "?"})` : `attiva · ${s.provider || "—"}`) : "spenta";
  $("aiStats").innerHTML = `
    <div class="stat"><div class="k">🏛 Governi</div><div class="v">${s.governi.length}</div></div>
    <div class="stat"><div class="k">📜 Editti emessi</div><div class="v">${s.ordini}</div></div>
    <div class="stat"><div class="k">🧠 Riflessioni</div><div class="v" style="font-size:13px">${s.chiamate}${s.errori ? ` · ${s.errori} ko` : ""}</div></div>
    <div class="stat"><div class="k">🗡 Congiure · sfide</div><div class="v" style="font-size:13px">${s.congiure} · ${s.sfide}</div></div>
    <div class="stat"><div class="k">🤥 Menzogne</div><div class="v">${s.menzogne}</div></div>
    <div class="stat"><div class="k">🛡 Congiure sventate</div><div class="v">${population.congiureSventate || 0}</div></div>
    <div class="stat"><div class="k">⛓ Repressioni · 🎁 elargiz.</div><div class="v" style="font-size:13px">${population.repressioni || 0} · ${population.elargizioni || 0}</div></div>
    <div class="stat" title="Parole che i capi hanno ordinato e che il mondo non conosceva. Chi le riceve le intende come può; il senso si assesta a maggioranza, e se hanno portato bene si radicano."><div class="k">🗣 Parole coniate</div><div class="v" style="font-size:13px">${parole().tot} <span style="color:var(--muted);font-size:11px">di cui ${parole().radicate} radicate</span></div></div>
    <div class="stat" title="Cariche che nessuno aveva mai sentito nominare, inventate da un capo. Il mondo non sa che cosa dovrebbero fare: portano la voce del capo dove lui non arriva, e valgono finché la gente attorno a chi le porta sta bene."><div class="k">🎖 Cariche inventate</div><div class="v">${population.caricheInventate || 0}</div></div>`;
  $("aiGov").innerHTML = s.governi.map((g) => {
    const col = g.consenso < 0.3 ? "var(--danger)" : g.consenso > 0.6 ? "#4caf6a" : "#e0a030";
    return `<li title="${g.personalita || ""}\nEditti: ${g.editti.join(", ") || "nessuno"}\nObbediti ${g.eseguiti} · ignorati ${g.ignorati}\nDinastia: ${g.dinastia} predecessori${g.ruoli.length ? "\nRuoli: " + g.ruoli.join(", ") : ""}">
      <span class="swatch" style="background:${col}"></span>
      <span class="name">${g.popolo} <span style="color:var(--muted);font-size:11px">${g.archetipo || ""}</span>
        ${g.pensiero ? `<div style="font-size:11px;color:var(--muted);font-style:italic">"${g.pensiero}"</div>` : ""}</span>
      <span class="rarity" style="color:${col}">${(g.consenso * 100) | 0}%</span></li>`;
  }).join("") || `<li class="hint" style="padding:6px">Nessun popolo è ancora abbastanza grande da darsi un governo.</li>`;
  const tipoCol = { congiura: "var(--danger)", tradimento: "var(--danger)", errore: "var(--danger)", sfida: "#e0a030", diplomazia: "#6fa8dc", propaganda: "#c9a227", nascita: "#4caf6a", successione: "#e0a030" };
  $("aiLog").innerHTML = s.log.slice(-12).reverse().map((e) =>
    `<li><span class="cron-anno">Anno ${e.anno}</span> <span style="color:${tipoCol[e.tipo] || "inherit"}">${e.testo}</span></li>`).join("");
}

// ---- IL META-LIVELLO: entità e istituzioni inventate dagli NPC ----
function renderEntita() {
  if (!population) return;
  const s = entitaStats(population);
  if (!s) return;
  $("entCount").textContent = s.inventate;
  $("entStats").innerHTML = `
    <div class="stat"><div class="k">Entità nel mondo</div><div class="v">${s.totali}</div></div>
    <div class="stat"><div class="k">Categorie inventate</div><div class="v" style="color:${s.inventate ? "var(--ok)" : "inherit"}">${s.inventate}</div></div>
    <div class="stat"><div class="k">Istituzioni vive</div><div class="v">${population.concettiVivi || 0}</div></div>
    <div class="stat"><div class="k">Dimenticate</div><div class="v">${s.estinte}</div></div>
    <div class="stat" style="grid-column:1/3"><div class="k">Di che genere</div><div class="v" style="font-size:11px">${Object.entries(s.perTipo).map(([t, n]) => `${t} ×${n}`).join(" · ")}</div></div>`;
  $("entList").innerHTML = s.istituzioni.map((e) => {
    const col = e.beneficio > 0.05 ? "var(--ok)" : e.beneficio < -0.1 ? "var(--danger)" : "var(--muted)";
    return `<li title="Nata nell'anno ${e.anno} unendo: ${e.da.join(" + ") || "?"}
Effetti: ${e.assi.join(" · ") || "nessuno rilevante"}
Costo ${(e.costo * 100) | 0} · prestigio ${(e.prestigio * 100) | 0}
Beneficio osservato: ${e.beneficio > 0 ? "conviene" : e.beneficio < -0.1 ? "pesa più di quanto renda" : "incerto"}">
      <span class="swatch" style="background:${col}"></span>
      <span class="name">${e.nome} <span style="color:var(--muted);font-size:10.5px">${e.da.join(" + ")}</span></span>
      <span class="rarity" style="color:${col}">${e.portatori}</span></li>`;
  }).join("") || '<li class="hint" style="padding:6px">Nessuno ha ancora avuto un\'idea abbastanza nuova.</li>';
}

// ---- Cultura: memi e religioni emergenti ----
function renderCultura() {
  if (!population) return;
  const ul = $("cultList");
  const memi = population.memi || [];
  const rel = population.religioni || [];
  $("cultCount").textContent = memi.length + rel.length;
  const items = [];
  for (const r of rel.slice().sort((a, b) => b.credenti - a.credenti)) {
    items.push(`<li title="Fondata nell'anno ${r.anno} dopo ${r.evento}">
      <span class="swatch" style="background:#c9a227"></span>
      <span class="name">🙏 ${r.nome}</span>
      <span class="rarity">${r.credenti} fedeli</span></li>`);
  }
  for (const m of memi.slice().sort((a, b) => b.diffusione - a.diffusione)) {
    const col = m.tipo === "odia" ? "var(--danger)" : "#4caf6a";
    const ico = m.tipo === "odia" ? "💢" : "💛";
    items.push(`<li title="Coniato da ${m.origine} nell'anno ${m.anno}">
      <span class="swatch" style="background:${col}"></span>
      <span class="name">${ico} ${m.tipo === "odia" ? "Odia" : "Ama"} ${m.bersaglio}</span>
      <span class="rarity">${m.diffusione}</span></li>`);
  }
  ul.innerHTML = items.join("") || `<li class="hint" style="padding:6px">Nessun meme o religione ancora.</li>`;
}

// ---- Cronache storiche ----
function renderCronache() {
  if (!population) return;
  const ul = $("cronList");
  const cron = population.cronaca;
  $("cronCount").textContent = cron.length;
  ul.innerHTML = cron.slice(-14).reverse().map((e) =>
    `<li><span class="cron-anno">Anno ${e.anno}</span> ${e.testo}</li>`).join("");
}

// ---- Conoscenze (credenze con affidabilità) ----
function renderBeliefs() {
  const ul = $("objList");
  ul.innerHTML = "";
  // Diffusione: quanti NPC vivi conoscono ogni ricetta (anti-hivemind).
  const noto = new Map();
  if (population) for (const n of population.npcs) if (n.vivo) for (const sig of n.sapere) noto.set(sig, (noto.get(sig) || 0) + 1);
  const list = knowledge.list.sort((a, b) => (noto.get(b.signature) || 0) - (noto.get(a.signature) || 0) || b.prove - a.prove);
  $("knowCount").textContent = list.length;
  for (const b of list) {
    const ingTxt = b.ingredienti.map((i) => {
      const m = registry.materials.find((mm) => mm.id === i.matId);
      return `${m ? m.nome : "?"}×${i.qta}`;
    }).join(" + ");
    const diff = noto.get(b.signature) || 0;
    const li = document.createElement("li");
    const col = diff === 0 ? "var(--muted)" : b.verdetto === "utile" ? "#4caf6a" : "var(--danger)";
    const diffTxt = diff === 0 ? "perduta" : `noto a ${diff}`;
    li.innerHTML = `
      <span class="swatch" style="background:${b.colore};${diff === 0 ? "opacity:.4" : ""}"></span>
      <span class="name" style="${diff === 0 ? "color:var(--muted)" : ""}">${b.categoria.icona} ${b.nome || b.categoria.nome}</span>
      <span class="rarity" style="color:${col}">${diffTxt}</span>`;
    li.title = `${b.categoria.nome} · ${ingTxt}\n${b.prove} prove · ${b.benefici} ok / ${b.danni} ko · verdetto ${b.verdetto} ${(b.affidabilita * 100) | 0}%${b.livello ? ` · livello: ${b.livello}` : ""}`;
    li.addEventListener("click", () => {
      labIngredienti = b.ingredienti.map((i) => ({ matId: i.matId, qta: i.qta }));
      buildLabRows();
      status(`Miscela ${b.categoria.nome} caricata nel laboratorio.`);
    });
    ul.appendChild(li);
  }
}

// ---- Simulazione: loop, controlli, statistiche ----
let running = false;
let lastT = 0;
let statTimer = 0;

// ═══ PANNELLI INFORMATIVI (sidebar sinistra) ═══════════════════════════════════════════════
// Un'unica funzione riempie tutte le sezioni: ogni voce è [etichetta, valore, colore?].
function riempi(id, voci) {
  const el = $(id); if (!el) return;
  el.innerHTML = voci.filter(Boolean).map(([k, v, col, wide]) =>
    `<div class="stat"${wide ? ' style="grid-column:1/3"' : ''}><div class="k">${k}</div><div class="v"${col ? ` style="color:${col};font-size:12.5px"` : ""}>${v}</div></div>`).join("");
}
let _quantiMateriali = 0;
const pct = (v) => `${Math.round((v || 0) * 100)}%`;
const ROSSO = "var(--danger)", VERDE = "var(--ok)", GIALLO = "var(--warn)";

// Che cosa sta facendo la gente ADESSO. È il colpo d'occhio che mancava: la vista «Attività» già
// colorava ognuno secondo quel che fa, ma nessun pannello lo contava, e così sembrava che la
// maggioranza girasse a vuoto.
function attivitaOra(p) {
  const c = new Map();
  let vivi = 0;
  for (const n of p.npcs) {
    if (!n.vivo) continue;
    vivi++;
    const a = n._att || "in cammino";
    c.set(a, (c.get(a) || 0) + 1);
  }
  if (!vivi) return "nessuno";
  return [...c].sort((a, b) => b[1] - a[1]).slice(0, 9)
    .map(([k, v]) => `${k} <i>×${v}</i>`).join(" · ");
}

// QUELLO CHE LA VITA HA FATTO A QUESTA GENTE. Sono osservazioni: si guarda quanto ognuno si è
// allontanato da com'era nato, e si contano le storie che ne escono.
function renderVite(p) {
  const box = $("viteStats");
  if (!box) return;
  const vivi = [];
  for (const n of p.npcs) if (n.vivo) vivi.push(n);
  if (!vivi.length) return;

  const storie = new Map();
  let segn = 0, segnMax = 0, segnatoPiu = null;
  for (const n of vivi) {
    const s = segnata(n);
    segn += s;
    if (s > segnMax) { segnMax = s; segnatoPiu = n; }
    const t = comeLHaCambiata(n);
    if (t) storie.set(t, (storie.get(t) || 0) + 1);
  }

  // le coorti: la gente per gruppi, con dentro le classi
  const co = p.coorti ? [...p.coorti.values()].sort((a, b) => b.n - a.n) : [];
  const grosse = co.filter((c) => c.n >= 8);

  riempi("viteStats", [
    ["Quanto la vita li ha segnati", pct(segn / vivi.length * 6)],
    segnatoPiu ? ["Il più segnato di tutti", `${segnatoPiu.eta | 0} anni — ${comeLHaCambiata(segnatoPiu) || "quasi com'era nato"}`, null, true] : null,
    co.length ? ["Gruppi di gente", `${co.length} — ${grosse.length} contano almeno otto persone`] : null,
    co.length && co[0] ? ["Il gruppo più grosso", co[0].descrizione(), null, true] : null,
  ]);

  const liste = $("viteListe");
  if (!liste) return;
  const voci = [...storie].sort((a, b) => b[1] - a[1]).slice(0, 7);
  liste.innerHTML = voci.length
    ? `<div class="mini-lista"><b>Che cosa la vita ha fatto loro</b><div>${
        voci.map(([k, v]) => `${k} <i>×${v}</i>`).join(" · ")}</div></div>`
    : "";
}

function renderGusti(p) {
  const box = $("gustiStats"), liste = $("gustiListe");
  if (!box) return;
  const vivi = p.npcs.filter((n) => n.vivo);
  if (!vivi.length) { box.innerHTML = ""; if (liste) liste.innerHTML = ""; return; }
  const nomeDi = (k) => {
    const mm = p.registry.mat(+k.slice(1));
    return mm ? mm.nome : k;
  };

  // Il giudizio del popolo su ogni cosa: la media delle esperienze personali. Nessuno gliel'ha
  // insegnato, e può benissimo essere sbagliato.
  const giud = new Map();
  for (const n of vivi) {
    if (!n.esperienze) continue;
    for (const [k, e] of n.esperienze) {
      if (k[0] !== "m" || e.n < 2) continue;
      const g = giud.get(k) || { s: 0, n: 0 };
      g.s += e.v; g.n++; giud.set(k, g);
    }
  }
  const matDi = (k) => p.registry.mat(+k.slice(1));
  // Una cosa è INUTILE se non fa niente al corpo e non serve a lavorare. Che poi sia desiderata
  // lo stesso è precisamente il punto.
  const inutile = (mm) => {
    if (!mm) return false;
    const ph = physiology(mm.props);
    return ph.nutrimento < 0.05 && ph.beneficio < 0.08 && ph.danno < 0.08
      && (mm.props.taglio || 0) < 0.3 && (mm.props.durezza || 0) < 0.45;   // troppo tenero per tagliare o reggere
  };
  const opin = [...giud].filter(([, g]) => g.n > vivi.length * 0.04)
    .map(([k, g]) => ({ nome: nomeDi(k), v: g.s / g.n, quanti: g.n, inutile: inutile(matDi(k)) }))
    .sort((a, b) => b.v - a.v);
  const mode = opin.filter((o) => o.v > 0.02 && o.inutile).slice(0, 5);

  // Che cosa si mangia: quanti hanno in corpo, adesso, il ricordo di quella cosa.
  const cibi = new Map();
  for (const n of vivi) {
    if (!n.assuefaz) continue;
    for (const [k, a] of n.assuefaz) if (a.v > 0.05) cibi.set(k, (cibi.get(k) || 0) + 1);
  }
  const menu = [...cibi].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Le case: quanto ripara la migliore e quanto la peggiore. È la disuguaglianza che si vede.
  let tMin = 9, tMax = -9, tSum = 0, pSum = 0, k = 0;
  for (const n of vivi) {
    if (!n.casaMat || !n.casaMat.size) continue;
    const q = qualitaCasa(p, n);
    tSum += q.tenuta; pSum += q.pregio; k++;
    if (q.tenuta < tMin) tMin = q.tenuta;
    if (q.tenuta > tMax) tMax = q.tenuta;
  }
  // Quanto si vede addosso alla gente: è la parte di ricchezza che salta all'occhio, e senza
  // occhi che la vedano il lusso non esisterebbe.
  let sfarzoMed = 0, sfarzoMax = 0;
  for (const n of vivi) {
    const s = n._sfarzo || 0;
    sfarzoMed += s; if (s > sfarzoMax) sfarzoMax = s;
  }
  sfarzoMed /= Math.max(1, vivi.length);

  const cnt = $("gustiCount");
  if (cnt) cnt.textContent = opin.length ? opin.length + " opinioni" : "—";

  riempi("gustiStats", [
    ["Cose su cui hanno un'opinione", opin.length],
    ["Associazioni per testa", (vivi.reduce((a, n) => a + (n.esperienze ? n.esperienze.size : 0), 0) / vivi.length).toFixed(1)],
    k ? ["Riparo delle case (peggiore → migliore)", pct(tMin) + " → " + pct(tMax)] : null,
    k ? ["Pregio medio delle case", pct(pSum / k)] : null,
    ["Legami da una vita", p.contaLegamiForti ? p.contaLegamiForti() : 0],
    sfarzoMax > 0.2 ? ["Sfarzo (medio → massimo)", sfarzoMed.toFixed(2) + " → " + sfarzoMax.toFixed(2)] : null,
    ["Sguardi d'invidia", p.sguardiInvidiosi || 0],
  ]);

  if (!liste) return;
  const riga = (titolo, voci) => voci.length
    ? `<div class="mini-lista"><b>${titolo}</b><div>${voci.join(" · ")}</div></div>` : "";
  liste.innerHTML =
    riga("Ciò che hanno imparato ad amare", opin.slice(0, 5).filter((o) => o.v > 0.03)
      .map((o) => `<span class="tag buono">${o.nome}</span>`))
    + riga("Ciò che hanno imparato a temere", opin.slice(-5).reverse().filter((o) => o.v < -0.03)
      .map((o) => `<span class="tag cattivo">${o.nome}</span>`))
    + riga("Che cosa mangiano", menu.map(([kk, c]) => `${nomeDi(kk)} <i>×${c}</i>`))
    + riga("Mode — amate pur non servendo a nulla",
      mode.map((o) => `<span class="tag moda">${o.nome}</span>`));
}

function updatePopStats() {
  if (!population) return;
  const s = population.stats();
  const p = population;
  // UN CAMPIONE DI STORIA, qui e non altrove: `stats()` e' appena stata calcolata, quindi
  // ricordarla costa una scrittura per serie. Si registra SEMPRE, anche a scheda chiusa —
  // altrimenti si aprirebbe la storia e non ci sarebbe niente da vedere. Il DISEGNO invece si fa
  // solo se la scheda e' aperta: e' li' che sta il costo vero.
  if (storia) storia.campiona(p, s);
  if (grafici && schedaAttiva === "storia") {
    const _tG = performance.now();
    grafici.disegna();
    _perf.graf += performance.now() - _tG;
  }

  // — POPOLAZIONE —
  riempi("popStats", [
    ["Vivi", s.vivi], ["Maschi / femmine", `${s.maschi} / ${s.femmine}`],
    ["Età media", s.etaMedia.toFixed(0)], ["Anno · stagione", `${s.anno.toFixed(0)} · ${s.stagione}`],
    ["Nascite", s.nascite], ["Morti", s.morti],
    ["Generazione", (s.generazione||0).toFixed(1)], s.era ? ["Era in corso", s.era, VERDE] : null,
    ["Gravidanze", s.gravide || 0], ["Inventori", s.inventori],
    ["Che cosa stanno facendo ora", attivitaOra(p), null, true],
    ["Specializzati (≥2,2× la media dei suoi)", Object.entries(s.mestieri || {}).sort((a,b)=>b[1]-a[1]).map(([m,n])=>`${m} ×${n}`).join(" · ") || "nessuno", null, true],
    ["Generalisti (fanno un po' di tutto)", (s.vivi - Object.values(s.mestieri || {}).reduce((a,b)=>a+b,0)) + " — non è ozio: la specializzazione è il frutto di una vita, e i giovani non l'hanno ancora", null, true],
    s.classi ? ["Ceti (disug. " + pct(s.disuguaglianza) + ")", `👑 ${s.classi.nobili||0} · 🏠 ${s.classi.agiati||0} · 🍞 ${s.classi.poveri||0} · ⛓ ${s.classi.servi||0}`, null, true] : null,
  ]);

  // — CORPO E SALUTE —
  riempi("corpoStats", [
    ["Fame media", pct(s.fameMedia), s.fameMedia > 0.7 ? ROSSO : null],
    ["Sete media", pct(s.seteMedia), s.seteMedia > 0.7 ? ROSSO : null],
    ["Esposizione al clima", pct(s.riparoMedio)],
    ["Con una casa", `${s.conCasa || 0} (liv. ${(s.casaLivMedio || 0).toFixed(1)})`],
    ["Carenza alimentare", pct(s.carenza), s.carenza > 0.3 ? ROSSO : null],
    ["Immunità media", pct(s.immunitaMedia), s.immunitaMedia > 0.5 ? VERDE : null],
    ["Dolore medio", pct(s.dolore)],
    ["Scorte comuni", s.scorte || 0],
  ]);

  // — CIELO E CLIMA —
  riempi("climaStats", [
    [s.notte ? "🌙 È notte" : "☀️ È giorno", `ora ${(s.ora * 24).toFixed(0)}:00${s.eclissi ? " · 🌑 ECLISSI" : ""}`, s.eclissi ? GIALLO : null],
    ["Fase lunare", s.luna < 0.25 || s.luna > 0.85 ? "nuova" : s.luna < 0.6 ? "piena" : "calante"],
    ["Umidità dell'aria", pct(s.umidita)], ["Piove", s.pioggia ? "sì" : "no", s.pioggia ? "#6fa8dc" : null],
    ["Siccità", pct(s.siccita), s.siccita > 0.6 ? ROSSO : null],
    ["Vento", pct(s.vento)],
    ["Cenere in cielo", pct(s.cenere), s.cenere > 0.2 ? ROSSO : null],
    ["Era glaciale", pct(s.eraGlaciale), s.eraGlaciale > 0 ? ROSSO : null],
  ]);

  // — GEOLOGIA E CATASTROFI —
  riempi("geoStats", [
    ["Terremoti", s.terremoti], ["Eruzioni", s.eruzioni],
    ["Frane", s.frane], ["Grandinate", s.grandinate],
    ["Comete", s.comete], ["Eclissi", s.eclissiTot],
    ["Incendi attivi", s.incendiAttivi, s.incendiAttivi > 0 ? "#ff8c1a" : null],
    ["Roghi · morti nel fuoco", `${s.roghiTot} · ${s.mortiFuoco}`],
  ]);

  // — ECOSISTEMA E TERRITORIO —
  riempi("ecoStats", [
    ["🦌 Erbivori", s.erbivori], ["🐺 Predatori", s.predatori],
    ["🐗 Onnivori", s.onnivori || 0], ["Carnivoria media", pct(s.carnivoriaMedia)],
    ["🐟 Pesci", s.pesci], ["🦈 Pred. marini", s.predatoriMarini],
    ["Taglia fauna (erb/pred)", `${(s.faunaTagliaErb*100).toFixed(0)} / ${(s.faunaTagliaPred*100).toFixed(0)}`],
    ["Vegetazione", `${(s.vegetazione/1000).toFixed(1)}k`],
    ["Fertilità del suolo", pct(s.fertilita), s.fertilita < 0.5 ? ROSSO : null],
    ["Inquinamento", (s.inquinamento||0).toFixed(0)],
    ["Carogne · spazzinaggi", `${s.carogne||0} · ${s.spazzinate||0}`],
    ["Campi coltivati", s.campi || 0],
    ["Rotazioni colturali", s.rotazioni || 0],
    ["🏜 Tile desertificati", s.desertificati || 0, s.desertificati > 50 ? ROSSO : null],
    ["🌱 Tile rinverditi", population.rinverditi || 0, population.rinverditi ? VERDE : null],
    ["⛏ Filoni esauriti", population.filoniEsauriti || 0, population.filoniEsauriti > 0 ? GIALLO : null],
    // Il soffitto vero, quello che nessuno ha scritto: la somma di quanto rende ogni tile.
    ["🌾 Quanta gente può nutrire questa terra", Math.round(population.capienzaTerra || 0), null, true],
    ["Mondo esplorato", pct(s.esplorato)],
    ["Sentieri battuti", s.strade || 0],
    ["Coloni · emigrati", `${s.migranti||0} · ${s.emigrati||0}`],
    ["🏚 Case tornate polvere", population.caseSfatte || 0, population.caseSfatte > 0 ? GIALLO : null],
    ["Spedizioni", s.spedizioni || 0],
  ]);

  // — MALATTIE —
  const mal = [
    ["Infetti", s.infetti, s.infetti > 0 ? ROSSO : null], ["Immuni", s.immuni],
    ["Morti per malattia", s.mortiMalattia], ["Epidemie nate", s.epidemieNate],
    ["Contagi da acqua", s.acqueMalsane || 0],
  ];
  if (s.malattiaAttiva) {
    const d = s.malattiaAttiva;
    mal.push(["Malattia attiva (" + d.origine + ")", `mortalità ${pct(d.mortalita)} · contagio ${pct(d.contagiosita)} · curabilità ${pct(1-(d.curaDifficolta||0))}`, ROSSO, true]);
  }
  riempi("malStats", mal);

  // — SOCIETÀ E SENTIMENTI —
  const em = s.emo || {};
  riempi("socStats", [
    ["✊ Ribelli", s.ribelli, s.ribelli > s.vivi * 0.15 ? ROSSO : null],
    ["Malcontento", pct(s.malcontento), s.malcontento > 0.5 ? ROSSO : null],
    ["😊 Gioia", pct(em.gioia)], ["😨 Paura", pct(em.paura)],
    ["😠 Rabbia", pct(em.rabbia)], ["🛡 Lealtà", pct(em.lealta)],
    ["🤝 Aiuti · 🗡 furti", `${s.aiuti} · ${s.furti}`],
    ["⚔ Aggressioni · 💀 omicidi", `${s.aggressioni} · ${s.omicidi}`],
    ["📋 Copiature", s.copiature], ["⚖ Baratti", s.baratti],
    ["🪙 Moneta", s.moneta || "—"], ["🏛 Edifici", s.edifici],
    ["🗣 Dialetti · incompr.", `${s.dialetti||0} · ${s.incomprensioni||0}`],
    ["🚪 Ospitati · scacciati", `${s.ospitati||0} · ${s.scacciati||0}`],
    ["⚔️ Guerre · razzie", `${s.guerre||0} · ${s.razzie||0}`, s.guerre > 0 ? ROSSO : null],
    ["🏚 Case · edifici distrutti", `${s.caseDistrutte||0} · ${s.edificiDistrutti||0}`, s.edificiDistrutti > 0 ? ROSSO : null],
    ["⚔ Battaglie coordinate", s.battaglie || 0],
    ["Clima culturale", Object.entries(s.valori||{}).map(([k,v])=>`${k.slice(0,6)} ${(v*100)|0}`).join(" · "), null, true],
  ]);

  // — ISTITUZIONI —
  // Le materie del mondo cambiano da sole, adesso: la gente inventa cose e ne dimentica altre.
  // La lista va rinfrescata quando il conto cambia, non solo quando la tocchi tu dal laboratorio.
  if (registry.materials.length !== _quantiMateriali) {
    _quantiMateriali = registry.materials.length;
    renderMatList();
    buildLabRows();
    const mc = $("matCount"); if (mc) mc.textContent = _quantiMateriali;
  }

  const _pf = perfLeggi();
  if (_pf) {
    const tot = _pf.sim + _pf.dis + _pf.mappa + _pf.graf;
    riempi("perfStats", [
      ["Simulare un battito", _pf.sim.toFixed(1) + " ms", tot > 33 && _pf.sim > _pf.dis ? GIALLO : null],
      ["Disegnare gli esseri", _pf.dis.toFixed(1) + " ms", tot > 33 && _pf.dis > _pf.sim ? GIALLO : null],
      ["Ridisegnare la mappa", _pf.mappa.toFixed(1) + " ms"],
      _pf.graf > 0.01 ? ["Disegnare i grafici", _pf.graf.toFixed(1) + " ms"] : null,
      ["In tutto (33 è il ritmo pieno)", tot.toFixed(1) + " ms", tot > 33 ? ROSSO : "#4caf6a"],
      ["Chi rallenta", tot < 33 ? "nessuno: gira a pieno ritmo"
        : _pf.dis + _pf.mappa + _pf.graf > _pf.sim ? "il disegno" : "il motore", null, true],
    ]);
  }

  renderVite(p);
  renderGusti(p);

  riempi("istStats", [
    ["👑 Tributi", s.tributi || 0], ["🎁 Doni", s.doni || 0],
    ["🗡 Estorsioni", s.estorsioni || 0, s.estorsioni > 0 ? ROSSO : null],
    ["⛓ Sottomessi", s.costretti || 0, s.costretti > 0 ? ROSSO : null],
    ["⚖️ Pene · processi", `${s.punizioni||0} · ${s.processi||0}`],
    ["Norma sul furto", pct(s.normaFurto)],
    ["🎓 Maestri", s.maestri || 0],
    ["💞 Legami da una vita", s.coppie || 0], ["🎁 Cose passate ai vivi", s.eredita || 0], ["🩺 Cure prestate", s.curePrestate || 0],
    ["🗣 Voci · calunnie", `${s.voci||0} · ${s.calunnie||0}`],
    ["🏺 Artefatti · 📜 miti", `${s.artefatti||0} · ${s.miti||0}`],
    ["📢 Propagande", s.propagande || 0],
    ["🎭 Opere · tradizioni", `${s.opere||0} · ${s.tradizioni||0}`],
    ["⛪ Religioni · fedeli", `${s.religioni||0} · ${s.credenti||0}`],
    ["Scismi", s.scismi || 0], ["🧠 Memi in circolo", s.memi || 0], ["🧩 Associazioni a testa", s.esperienzeMedie || 0],
    ["🤝 Riavvicinamenti", s.riavvicinamenti || 0],
    // NESSUNO HA SCRITTO QUESTE DUE RIGHE NEL MONDO: escono dall'unica legge dell'esperienza.
    // Le "maniere di fare" sono circostanze che al popolo sono andate bene o male; i tabu' sono
    // cose che gli sono andate male abbastanza volte da farsele evitare da tutti. E qualcuno di
    // quei tabu' e' sbagliato — se non potesse sbagliare non sarebbe apprendimento.
    ["🧭 Come si trovano meglio", (() => {
      const inc = inclinazioni(population);
      if (!inc.length) return "non hanno ancora un'indole";
      return inc.map((i) => `${i.nome} ${i.v > 0 ? "↑" : "↓"}`).join(" · ");
    })(), null, true],
    ["🚫 Cose che evitano", (() => {
      const av = avversioni(population, registry);
      if (!av.length) return "niente li ha ancora segnati";
      return av.map((a) => `${a.nome} (${Math.round(a.quota * 100)}%)`).join(" · ");
    })(), null, true],
  ]);

  // — CONOSCENZA —
  riempi("conStats", [
    ["Conoscenze vive", s.conoscenzeVive],
    ["Perdute", s.conoscenzeTotali - s.conoscenzeVive, s.conoscenzeTotali > s.conoscenzeVive ? GIALLO : null],
    ["Esperimenti", s.oggetti], ["…di cui guidati", s.esperimentiGuidati || 0],
    ["False credenze", s.falseCredenze || 0, s.falseCredenze > 0 ? GIALLO : null],
    s.generiCulturali ? ["Generi battezzati", `${s.generiCulturali} in ${s.lessici} lessici`, VERDE] : null,
    ["Insegnamenti", s.insegnamenti],
    ["🕳 Materie che nessuno sa più fare", population.materiePerdute || 0, population.materiePerdute > 0 ? GIALLO : null],
    // Uno zero qui non vuol dire "non ne hanno coniate": vuol dire che il motore sta ancora
    // dicendo lui come si chiamano i mestieri. Meglio dirlo che mostrare un numero che inganna.
    ["🗣 Parole coniate per i mestieri", P.affordanceTotale
      ? (population.mestieriConiati || 0)
      : "spento — i nomi li dà ancora il motore",
      P.affordanceTotale && population.mestieriConiati ? VERDE : null, !P.affordanceTotale],
    ["Libri · letture", (s.libri||0)+" · "+(s.letture||0), s.libri ? VERDE : null],
    ["Qualità utensili", pct(s.strumentoMedio)],
    ["Era tecnologica", s.etaMetalli ? "⚙ Metalli" : "🪨 Pietra"],
    ["Costruzioni", Object.entries(buildingCounts(population)).map(([t,n])=>`${t}×${n}`).join(" · ") || "nessuna", null, true],
  ]);

  renderCronache(); renderFactions(); renderCultura(); renderAI(); renderScheda(); renderLegenda(); renderEntita();
  $("matCount") && ($("matCount").textContent = registry.materials.length);
}

// ═══ PARAMETRI (sidebar destra) ════════════════════════════════════════════════════════════
// I controlli sono GENERATI dallo schema in params.js: aggiungere una manopola là la fa
// comparire qui, senza toccare l'interfaccia.
function buildParams() {
  const wrap = $("paramGroups");
  wrap.innerHTML = SCHEMA.map((g) => `
    <details class="sez" data-grp="${g.id}"><summary>${g.icona} ${g.nome} <span class="conta" id="cnt-${g.id}"></span></summary>
      <div class="sez-body">${g.voci.map(([k, lab, min, max, step, hint]) => `
        <div class="par" data-par="${k}" data-cerca="${(lab + " " + hint).toLowerCase()}">
          <div class="par-top">
            <span class="par-lab">${lab}</span>
            <span class="par-val" id="v-${k}"></span>
            <button class="par-reset" data-reset="${k}" title="Ripristina il valore bilanciato (${DEF[k]})">↺</button>
          </div>
          <input type="range" id="p-${k}" min="${min}" max="${max}" step="${step}" value="${P[k]}" />
          <div class="par-hint">${hint}</div>
        </div>`).join("")}</div>
    </details>`).join("");

  for (const g of SCHEMA) for (const [k] of g.voci) {
    const inp = $("p-" + k);
    inp.addEventListener("input", () => { P[k] = parseFloat(inp.value); aggiornaParam(k); });
    wrap.querySelector(`[data-reset="${k}"]`).addEventListener("click", () => {
      P[k] = DEF[k]; inp.value = DEF[k]; aggiornaParam(k);
    });
    aggiornaParam(k, true);
  }
}
function aggiornaParam(k, muto) {
  const el = $("v-" + k); if (!el) return;
  const v = P[k];
  el.textContent = Math.abs(v) < 0.01 && v !== 0 ? v.toFixed(4) : v % 1 === 0 ? v : v.toFixed(3).replace(/0+$/, "");
  const box = el.closest(".par");
  box.classList.toggle("modificato", P[k] !== DEF[k]);
  // conteggio modifiche per gruppo e globale
  for (const g of SCHEMA) {
    const n = g.voci.filter(([kk]) => P[kk] !== DEF[kk]).length;
    const c = $("cnt-" + g.id); if (c) c.textContent = n ? n + " modif." : "";
  }
  const tot = paramModificati();
  $("paramReset").textContent = tot ? `↺ Tutto (${tot})` : "↺ Tutto";
  if (!muto) status(tot ? `${tot} parametri modificati rispetto ai valori bilanciati.` : "Tutti i parametri sono ai valori bilanciati.");
}

// Filtro di ricerca su una sidebar: nasconde le voci che non combaciano.
function filtra(inputId, selettore, dentroSezioni) {
  const q = $(inputId).value.trim().toLowerCase();
  document.querySelectorAll(selettore).forEach((el) => {
    const testo = (el.dataset.cerca || el.textContent || "").toLowerCase();
    el.style.display = !q || testo.includes(q) ? "" : "none";
  });
  // apri le sezioni che contengono risultati, chiudi le vuote
  document.querySelectorAll(dentroSezioni).forEach((sez) => {
    if (!q) { sez.classList.remove("nascosta"); return; }
    const visibili = [...sez.querySelectorAll(selettore)].some((e) => e.style.display !== "none");
    const titolo = sez.querySelector("summary").textContent.toLowerCase().includes(q);
    sez.classList.toggle("nascosta", !visibili && !titolo);
    if (visibili || titolo) sez.open = true;
  });
}

// Avanza la simulazione di `simDt` anni. La parte PESANTE (ecosistema con migliaia di
// animali) gira UNA volta per tick; solo la logica leggera degli NPC viene suddivisa in
// sotto-passi per fluidità. Così il tick resta sotto il budget anche ad alta velocità.
function advance(simDt) {
  const sub = Math.max(1, Math.min(3, Math.ceil(simDt / 0.25)));
  stepClimate(population, simDt); // luce, acqua, aria, terra: prima di tutto (gli altri ne dipendono)
  for (let i = 0; i < sub; i++) population.step(simDt / sub);
  stepEcosystem(population, simDt);
  stepSociety(population, simDt, predatorThreatQuery(population));
  stepBuildings(population, simDt);
  stepFire(population, simDt);
  population._cultDt = (population._cultDt || 0) + simDt; // accumulo per il passo culturale (throttlato)
}

// Conteggio vivi ECONOMICO (evita stats() completa, che somma l'intera griglia del cibo).
function nessunoVivo() {
  for (const n of population.npcs) if (n.vivo) return false;
  return true;
}

// Clock della simulazione: setInterval a timestep FISSO. È robusto — a differenza di
// requestAnimationFrame non si ferma se la scheda perde il focus (rAF viene throttlato).
// Il tick è protetto: un errore non blocca più l'intera simulazione.
// Quanto tempo se ne va, e dove. Media sugli ultimi battiti, non sul totale, così segue il presente.
const _perf = { sim: 0, dis: 0, mappa: 0, graf: 0, n: 0 };
function perfLeggi() {
  if (!_perf.n) return null;
  const r = { sim: _perf.sim / _perf.n, dis: _perf.dis / _perf.n, mappa: _perf.mappa / _perf.n, graf: _perf.graf / _perf.n, n: _perf.n };
  if (_perf.n > 90) { _perf.sim = 0; _perf.dis = 0; _perf.mappa = 0; _perf.graf = 0; _perf.n = 0; }
  return r;
}

const TICK_MS = 33;
let erroriDiSeguito = 0;   // di seguito: un inciampo isolato non deve fermare il mondo
setInterval(() => {
  if (!running || !population) return;
  try {
    const speed = parseInt($("simSpeed").value, 10);
    const _tA = performance.now();
    advance(0.033 * speed);
    const _tB = performance.now();
    // NON SI DISEGNA UNA MAPPA CHE NESSUNO GUARDA. Con la storia aperta il canvas degli esseri e'
    // nascosto, e disegnarci sopra migliaia di persone costava piu' di cento millisecondi a battito
    // per pixel che nessuno vede — cioe' tempo rubato alla simulazione per niente.
    if (schedaAttiva === "mappa") agentsRenderer.draw();
    const _tC = performance.now();
    _perf.sim += _tB - _tA; _perf.dis += _tC - _tB; _perf.n++;
    statTimer += 0.033;
    if (statTimer > 0.35) {
      statTimer = 0; updateFactions(population); updateMoneta(population);
      const cdt = population._cultDt || 0.35;
      stepCulture(population, cdt); stepSocietyAdvanced(population, cdt); stepAI(population, cdt);
      stepEntities(population, cdt);
      population._cultDt = 0;
      updatePopStats(); renderBeliefs();
      const _tD = performance.now();
      if (schedaAttiva === "mappa" && (renderer.view === "inquinamento" || renderer.view === "scoperto" || renderer.view === "territorio" || renderer.view === "attivita")) renderer.draw(); // viste dinamiche
      _perf.mappa += performance.now() - _tD;
    }
    erroriDiSeguito = 0;                 // il giro è andato: si riparte da zero
    if (nessunoVivo()) { running = false; $("playBtn").textContent = "▶ Avvia"; status("La popolazione si è estinta."); }
  } catch (e) {
    // UN MONDO ROTTO NON DEVE SEMBRARE SANO. Prima l'errore finiva in console e la simulazione
    // tirava avanti come niente fosse: e questo è peggio di un crash, perché tutto continua a
    // muoversi mentre un pezzo intero è spento. È successo per davvero — un cronometro scritto
    // con l'orologio di node aveva spento l'INTERO ecosistema, e a schermo non si vedeva nulla:
    // la gente cresceva, gli anni passavano, e le bestie erano ferme allo stesso numero.
    console.error("Errore nel tick della simulazione:", e);
    erroriDiSeguito++;
    if (erroriDiSeguito >= 5) {
      running = false;
      $("playBtn").textContent = "▶ Avvia";
      status("Qualcosa si è rotto nel giro della simulazione — fermata. Guarda la console: " + e.message);
    }
  }
}, TICK_MS);

$("playBtn").addEventListener("click", () => {
  running = !running;
  $("playBtn").textContent = running ? "⏸ Pausa" : "▶ Avvia";
});
$("stepBtn").addEventListener("click", () => {
  if (!population) return;
  for (let i = 0; i < 3; i++) { stepClimate(population, 0.16); population.step(0.16); stepEcosystem(population, 0.16); stepSociety(population, 0.16, predatorThreatQuery(population)); stepBuildings(population, 0.16); stepFire(population, 0.16); }
  updateFactions(population); updateMoneta(population); stepCulture(population, 0.48);
  stepSocietyAdvanced(population, 0.48); stepAI(population, 0.48); stepEntities(population, 0.48);
  agentsRenderer.draw();
  updatePopStats();
  renderBeliefs();
});
$("resetPop").addEventListener("click", () => {
  if (!population) return;
  population.reset(parseInt($("popStart").value, 10));
  agentsRenderer.draw();
  updatePopStats();
  status(`Ripopolato con ${population.npcs.length} esseri.`);
});
$("simSpeed").addEventListener("input", (e) => { $("simSpeedOut").textContent = e.target.value; });
$("popStart").addEventListener("input", (e) => { $("popStartOut").textContent = e.target.value; });
$("herbStart").addEventListener("input", (e) => { $("herbStartOut").textContent = e.target.value; });
$("predStart").addEventListener("input", (e) => { $("predStartOut").textContent = e.target.value; });

$("respawnAnimals").addEventListener("click", () => {
  if (!population) return;
  population.creature = [];
  spawnAnimals(population, parseInt($("herbStart").value, 10), parseInt($("predStart").value, 10));
  agentsRenderer.draw(); updatePopStats();
  status(`Fauna ripopolata: ${population.creature.length} creature.`);
});
// ---- Controlli M6 ----
$("aiToggle").addEventListener("click", () => {
  if (!population) return;
  population.aiAttiva = !population.aiAttiva;
  $("aiToggle").textContent = population.aiAttiva ? "🧠 Spegni le menti" : "🧠 Accendi le menti";
  status(population.aiAttiva
    ? "Le menti sono accese: i capi dei popoli grandi cominceranno a pensare e a dare ordini."
    : "Menti spente: i capi tornano a governare d'istinto.");
  renderAI();
});
$("aiPing").addEventListener("click", async () => {
  status("Interrogo i provider…");
  try {
    const st = await (await fetch("/api/llm/status")).json();
    const t0 = performance.now();
    const r = await fetch("/api/llm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "Rispondi SOLO con JSON.", user: 'Rispondi {"ok":true}', maxTokens: 40 }),
    });
    const j = await r.json();
    status(r.ok
      ? `Provider attivo: ${j.provider} (${Math.round(performance.now() - t0)} ms). Configurati: ${st.disponibili.join(", ")}.`
      : `Nessun provider risponde: ${(j.dettagli || []).slice(0, 3).join(" · ")}`);
  } catch (e) { status("Errore nel contattare il proxy: " + e.message); }
});

$("outbreak").addEventListener("click", () => {
  if (!population) return;
  seedOutbreak(population, 5);
  agentsRenderer.draw(); updatePopStats();
  status("Epidemia scatenata: 5 contagiati iniziali. Osserva la diffusione.");
});
$("sparkFire").addEventListener("click", () => {
  if (!population) return;
  // Appicca un fuoco su un tile vegetato a caso.
  for (let tries = 0; tries < 40; tries++) {
    const idx = (Math.random() * population.food.length) | 0;
    if (population.food[idx] > 0.5 && igniteFire(population, idx, 0.7)) {
      population.roghiTot++;
      status("Un incendio è divampato. Guarda come si propaga (d'estate corre).");
      break;
    }
  }
  agentsRenderer.draw(); updatePopStats();
});

// ---- Controlli mondo ----
$("regen").addEventListener("click", regenerate);
$("randomSeed").addEventListener("click", () => {
  const words = ["terra", "gaia", "eden", "pangea", "aurora", "nova", "mundo", "orbis", "vita", "kosmos"];
  $("seed").value = words[(Math.random() * words.length) | 0] + "-" + Math.floor(Math.random() * 100000);
  regenerate();
});
$("waterPct").addEventListener("input", (e) => { $("waterPctOut").textContent = e.target.value; });
// La larghezza del mondo: è questo il numero che decide quanto può crescere una civiltà senza
// rallentare — molto più dei tetti sulla popolazione. In uno spazio fisso il doppio della gente
// vuol dire il doppio dei vicini a testa, e il costo cresce col quadrato.
$("dimMondo").addEventListener("input", (e) => { $("dimMondoVal").textContent = e.target.value; });
// ---- LE DUE SCHEDE: dove sta il mondo, e da dove viene ----------------------------------------
// I bottoni delle viste (Biomi, Rilievo, Clima...) sono della MAPPA: nella storia non vogliono dire
// niente, quindi spariscono invece di restare li' a fingere di funzionare.
function mostraScheda(quale) {
  schedaAttiva = quale;
  const storiaAperta = quale === "storia";
  $("canvasWrap").classList.toggle("hidden", storiaAperta);
  $("graficiWrap").classList.toggle("hidden", !storiaAperta);
  $("viewModes").style.display = storiaAperta ? "none" : "";
  [...$("schede").children].forEach((b) => b.classList.toggle("active", b.dataset.scheda === quale));
  if (storiaAperta) {
    if (!grafici) grafici = new Grafici($("graficiWrap"), () => storia, () => population);
    grafici.disegna(true);
  } else {
    // Tornando alla mappa va ridimensionata: mentre era nascosta il canvas aveva larghezza zero.
    renderer.resize();
    renderer.draw();
  }
}
$("schede").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-scheda]");
  if (btn) mostraScheda(btn.dataset.scheda);
});
window.addEventListener("resize", () => { if (schedaAttiva === "storia" && grafici) grafici.disegna(true); });

$("viewModes").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-view]");
  if (!btn) return;
  [...e.currentTarget.children].forEach((b) => b.classList.toggle("active", b === btn));
  renderer.setView(btn.dataset.view);
});

// ---- CAMERA: zoom con la rotella, spostamento trascinando, selezione col clic ----
const tooltip = $("tooltip");
const layer = $("agents");               // il livello superiore riceve gli eventi
let trascino = null, mosso = 0;

layer.addEventListener("wheel", (ev) => {
  if (!world) return;
  ev.preventDefault();
  const rect = layer.getBoundingClientRect();
  renderer.zoomAt(ev.clientX - rect.left, ev.clientY - rect.top, ev.deltaY < 0 ? 1.18 : 1 / 1.18);
  agentsRenderer.draw();
  mostraZoom();
}, { passive: false });

layer.addEventListener("mousedown", (ev) => { trascino = { x: ev.clientX, y: ev.clientY }; mosso = 0; layer.style.cursor = "grabbing"; });
window.addEventListener("mouseup", () => { trascino = null; layer.style.cursor = "crosshair"; });
window.addEventListener("mousemove", (ev) => {
  if (!trascino) return;
  const dx = ev.clientX - trascino.x, dy = ev.clientY - trascino.y;
  mosso += Math.abs(dx) + Math.abs(dy);
  trascino = { x: ev.clientX, y: ev.clientY };
  renderer.pan(dx, dy); agentsRenderer.draw();
});

// Clic: seleziona l'essere più vicino (se non si stava trascinando).
layer.addEventListener("click", (ev) => {
  if (!world || mosso > 6) return;
  const rect = layer.getBoundingClientRect();
  const [wx, wy] = renderer.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
  const trovato = agentsRenderer.pick(wx, wy, Math.max(1.5, 22 / renderer.cam.zoom));
  agentsRenderer.selected = trovato;
  agentsRenderer.draw();
  renderScheda();
});

function mostraZoom() { $("zoomLabel").textContent = `${renderer.cam.zoom.toFixed(1)}×`; }

// Scheda dell'individuo selezionato: chi è, cosa prova, cosa sta facendo.
function renderScheda() {
  const box = $("scheda"), sel = agentsRenderer.selected;
  if (!sel || !sel.o.vivo) { box.innerHTML = `<p class="hint">Clicca su un essere per osservarlo da vicino. Rotella per zoomare, trascina per spostarti.</p>`; return; }
  const o = sel.o;
  if (sel.tipo !== "npc") {
    const d = o.dna;
    box.innerHTML = `<div class="t-title">${sel.tipo} <span style="color:var(--muted)">#${o.id}</span></div>
      <div class="bar"><span class="bl">Fame</span><span class="bv">${(o.fame * 100) | 0}%</span></div>
      <div class="bar"><span class="bl">Età</span><span class="bv">${o.eta.toFixed(0)} / ${o.lifespan.toFixed(0)}</span></div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">carnivoria ${(d.carnivoria*100)|0} · taglia ${(d.taglia*100)|0} · vista ${((d.vista||0)*100)|0} · mimetismo ${((d.mimetismo||0)*100)|0} · corazza ${((d.corazza||0)*100)|0} · veleno ${((d.veleno||0)*100)|0}</div>`;
    return;
  }
  const f = population.factions.find((x) => x.id === o.fazione);
  const rel = population.religioni.find((r) => r.id === o.credo);
  const st = f && population.aiStati?.get(f.id);
  const capo = f && f.leader === o.id;
  const riga = (k, v, col) => `<div class="bar"><span class="bl">${k}</span><span class="bv" style="color:${col || "inherit"}">${v}</span></div>`;
  box.innerHTML = `
    <div class="t-title">${capo ? "♔ " : ""}Essere #${o.id} <span style="color:var(--muted)">${o.sex} · ${o.eta.toFixed(0)} anni${o.mestiere ? " · " + o.mestiere : ""}</span></div>
    ${f ? `<div style="font-size:12px;margin-bottom:4px">popolo <b style="color:${f.colore}">${f.nome}</b>${capo ? ` — <b>è il capo</b> (${f.archetipo})` : ""}${o.classe ? ` · ${o.classe}` : ""}</div>` : ""}
    ${riga("Salute", `${(o.salute * 100) | 0}%`, o.salute < 0.5 ? "var(--danger)" : "#4caf6a")}
    ${riga("Fame · sete", `${(o.fame * 100) | 0}% · ${(o.sete * 100) | 0}%`)}
    ${riga("Stanchezza · riparo", `${(o.stanchezza * 100) | 0}% · ${(o.riparo * 100) | 0}%`)}
    ${riga("Malcontento", `${(o.malcontento * 100) | 0}%`, o.malcontento > 0.6 ? "var(--danger)" : "")}
    ${o._ordine ? riga("Ordine del capo", `${o._ordine.tipo}`, "#6fd3ff") : ""}
    ${(() => {
      // QUANTO È BRAVO, DETTO A PAROLE. `perizia()` e `gradoDi()` c'erano da sempre e non le
      // guardava nessuno: un numero non dice se uno è un maestro, una parola sì. E la scala se la
      // dà il mondo — «insuperato» vuol dire insuperato *fra i suoi*, non in assoluto.
      const az = Object.keys(o.azioni || {}).filter((k) => (o.azioni[k] || 0) >= 2);
      if (!az.length) return "";
      const migliori = az.map((k) => ({ k, v: perizia(o, k) })).sort((a, b) => b.v - a.v).slice(0, 2);
      if (!migliori.length || migliori[0].v < 0.05) return "";
      return riga("Perizia", migliori.map((m) => `${m.k} — <b>${gradoDi(m.v)}</b>`).join(" · "), "#c9a227");
    })()}
    ${o._utensile ? riga("Ha in mano", `${(registry.mat(o._utensile.di) || {}).nome || "qualcosa"} (${Math.round(o._utensile.vita * 100)}%)`) : ""}
    ${o.incinta > 0 ? riga("Gravidanza", "in corso", "#ff9ad5") : ""}
    ${o._padrone ? riga("Sottomesso a", "#" + o._padrone, "var(--danger)") : ""}
    <div style="font-size:11px;color:var(--muted);margin-top:5px">
      int ${(o.intelligenza*100)|0} · for ${(o.forza*100)|0} · cor ${(o.coraggio*100)|0} · emp ${(o.empatia*100)|0} · amb ${(o.ambizione*100)|0} · conf ${(o.conformismo*100)|0} · vol ${((o.volonta||0)*100)|0}
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:3px">
      ${rel ? `crede in <b>${rel.nome}</b> · ` : "senza fede · "}sa ${o.sapere.size} tecniche · ${o.figli} figli${o.casaLivello ? ` · casa liv.${o.casaLivello}` : " · senza casa"}
    </div>
    ${st && capo && st.pensiero ? `<div style="font-size:11px;font-style:italic;color:#9fd0ff;margin-top:5px">"${st.pensiero}"</div>` : ""}`;
}

// Tooltip: cosa c'è sotto il mouse (tile + eventuale creatura)
layer.addEventListener("mousemove", (ev) => {
  if (!world || trascino) { tooltip.classList.add("hidden"); return; }
  const rect = layer.getBoundingClientRect();
  const [wx, wy] = renderer.screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top);
  const x = Math.floor(wx), y = Math.floor(wy);
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) { tooltip.classList.add("hidden"); return; }
  const i = y * world.width + x;
  const mats = registry.materialsAt(i);
  const matLine = mats.length
    ? mats.slice(0, 3).map((o) => `${o.mat.nome} <span class="t-mat">${Math.round(o.c * 100)}%</span>`).join(", ")
    : "<span style='color:#8b95a4'>nessun materiale</span>";
  const vicino = agentsRenderer.pick(wx, wy, Math.max(1.5, 18 / renderer.cam.zoom));
  const extra = population ? `<div>vegetazione ${(population.food[i] * 100) | 0}% · fertilità ${(population.fertility[i] * 100) | 0}%</div>` : "";
  tooltip.innerHTML = `
    <div class="t-title">${BIOME_NAME[world.biome[i]]}${world.stagnant?.[i] ? " (stagnante)" : world.river?.[i] ? " · fiume" : ""}</div>
    <div>temp ${(world.temperature[i]).toFixed(2)} · quota ${(world.elevation[i]).toFixed(2)}</div>
    ${extra}<div>${matLine}</div>
    ${vicino ? `<div style="margin-top:3px;color:#9fd0ff">▸ ${vicino.tipo === "npc" ? "una persona" : vicino.tipo} — clicca per osservarla</div>` : ""}`;
  tooltip.style.left = Math.min(rect.width - 220, ev.clientX - rect.left + 14) + "px";
  tooltip.style.top = (ev.clientY - rect.top + 14) + "px";
  tooltip.classList.remove("hidden");
});
layer.addEventListener("mouseleave", () => tooltip.classList.add("hidden"));

// Controlli di zoom espliciti (per chi non ha la rotella)
$("zoomIn").addEventListener("click", () => { renderer.zoomAt(renderer.cssW / 2, renderer.cssH / 2, 1.5); agentsRenderer.draw(); mostraZoom(); });
$("zoomOut").addEventListener("click", () => { renderer.zoomAt(renderer.cssW / 2, renderer.cssH / 2, 1 / 1.5); agentsRenderer.draw(); mostraZoom(); });
$("zoomFit").addEventListener("click", () => { renderer.cam.zoom = renderer.minZoom; renderer.clampCam(); renderer.invalidate(); renderer.draw(); agentsRenderer.draw(); mostraZoom(); });
// Segui il popolo più grande
$("zoomCapo").addEventListener("click", () => {
  if (!population?.factions?.length) return;
  const f = population.factions[0];
  renderer.cam.x = f.capX ?? f.x; renderer.cam.y = f.capY ?? f.y;
  renderer.cam.zoom = Math.max(renderer.cam.zoom, 8);
  renderer.clampCam(); renderer.invalidate(); renderer.draw(); agentsRenderer.draw(); mostraZoom();
  status(`Inquadrato ${f.nome} (${f.membri} anime).`);
});

window.addEventListener("resize", () => renderer.resize());

// Accesso di debug agli interni della simulazione (utile per test).
window.__sim = { renderer, agentsRenderer, get pop() { return population; }, get world() { return world; }, get registry() { return registry; }, get knowledge() { return knowledge; } };

// ---- Controlli delle due barre laterali ----
$("paramReset").addEventListener("click", () => {
  resetParams();
  for (const g of SCHEMA) for (const [k] of g.voci) { $("p-" + k).value = P[k]; aggiornaParam(k, true); }
  aggiornaParam(SCHEMA[0].voci[0][0]);
  status("Tutti i parametri riportati ai valori bilanciati.");
});
$("paramFiltro").addEventListener("input", () => filtra("paramFiltro", ".par", "#sidebarRight .sez"));
$("infoFiltro").addEventListener("input", () => filtra("infoFiltro", "#sidebarLeft .stat", "#sidebarLeft .sez"));
$("infoEspandi").addEventListener("click", () => document.querySelectorAll("#sidebarLeft .sez").forEach((d) => (d.open = true)));
$("infoComprimi").addEventListener("click", () => document.querySelectorAll("#sidebarLeft .sez").forEach((d) => (d.open = false)));

// Avvio
buildParams();
renderMatList();
buildLabRows();
renderBeliefs();
regenerate();
