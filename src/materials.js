// Livello 2 (parte 1) — Materiali.
// L'utente definisce solo: nome, descrizione, rarità, ambiente, colore.
// Il sistema decide DOVE concentrarli: pochi centri (giacimenti) con caduta gaussiana,
// così un materiale nasce quasi tutto in zone specifiche del mondo.
import { mulberry32, hashSeed } from "./rng.js";
import { isWater } from "./world.js";

// rarità -> quanti giacimenti, quanto sono ampi, concentrazione di picco
const VUOTO = [];   // elenco condiviso per i tile dove non c'è niente

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const RARITY = {
  comune:    { deposits: 18, radius: 0.075, peak: 0.95 },
  frequente: { deposits: 10, radius: 0.060, peak: 0.80 },
  raro:      { deposits: 4,  radius: 0.040, peak: 0.65 },
  rarissimo: { deposits: 2,  radius: 0.028, peak: 0.55 },
};

// Attributi 0..1 — LE LEGGI DEL MONDO. Non esistono ricette: gli oggetti nascono
// combinando questi attributi. `mode` dice come si combinano nella miscela:
//   add = si accumulano (più ne metti, più potenza, ma più instabilità)
//   avg = qualità media del materiale (durezza, elasticità...)
// SOLO PROPRIETÀ FONDAMENTALI (oggettive). Nessun attributo "d'uso": una pietra non "sa" di essere
// un'arma, una pianta non "sa" di essere una medicina. L'USO è INTERPRETAZIONE degli esseri viventi
// (vedi physiology()/classify() in chemistry.js). Niente più "cura/veleno/nutrimento": la reazione
// di un organismo EMERGE dalla biochimica (nutrienti, tossine, principio bioattivo).
export const PROPS = [
  // — FISICHE —
  { key: "durezza",       label: "Durezza",       mode: "avg" },
  { key: "peso",          label: "Densità",       mode: "add" },
  { key: "elasticita",    label: "Elasticità",    mode: "avg" },
  { key: "fragilita",     label: "Fragilità",     mode: "avg" },
  { key: "taglio",        label: "Taglio",        mode: "add" }, // capacità di far filo/punta
  { key: "conducibilita", label: "Conducibilità", mode: "avg" },
  { key: "galleggiamento",label: "Galleggiamento",mode: "avg" },
  { key: "portanza",      label: "Portanza",      mode: "avg" },
  { key: "attrito",       label: "Attrito",       mode: "avg" }, // frizione: accende il fuoco, frena
  { key: "porosita",      label: "Porosità",      mode: "avg" }, // assorbe liquidi (filtri, spugne)
  { key: "viscosita",     label: "Viscosità",     mode: "avg" }, // per i fluidi: colle, oli
  { key: "tempFusione",   label: "Temp. fusione", mode: "avg" }, // quanto calore serve a fonderlo
  { key: "magnetismo",    label: "Magnetismo",    mode: "avg" }, // bussole, calamite
  { key: "trasparenza",   label: "Trasparenza",   mode: "avg" }, // vetro, lenti
  // — CHIMICHE —
  { key: "energiaChim",   label: "Energia chim.", mode: "add" }, // energia immagazzinata (brucia/nutre/esplode)
  { key: "reattivita",    label: "Reattività",    mode: "avg" }, // quanto reagisce: con l'energia → esplosione
  { key: "acidita",       label: "Acidità",       mode: "add" }, // acidi: corrodono, sciolgono
  { key: "volatilita",    label: "Volatilità",    mode: "avg" }, // evapora: profumi, distillati, alcol
  // — BIOLOGICHE (l'effetto sul corpo NON è qui: emerge dalla fisiologia) —
  { key: "nutriente",     label: "Nutrienti",     mode: "add" }, // sostanze bio-disponibili
  { key: "digeribilita",  label: "Digeribilità",  mode: "avg" }, // quanto di quella sostanza il corpo riesce a tirare fuori
  { key: "tossicita",     label: "Tossine",       mode: "add" }, // alcaloidi/tossine
  { key: "bioattivo",     label: "Bioattivo",     mode: "add" }, // principio attivo (medicina o veleno secondo la dose)
  // — STRUTTURALI —
  { key: "legame",        label: "Legame",        mode: "avg" }, // coesione con gli altri: alza la stabilità
  { key: "stabilizzante", label: "Stabilizzante", mode: "add" },
  { key: "acquosita",     label: "Acqua contenuta", mode: "avg" }, // quanto è succoso/bagnato
  // — NICCHIA (solo per ciò che è vivo: dove riesce a crescere) —
  { key: "caldoIdeale",   label: "Calore ideale",  mode: "avg" }, // a che temperatura sta bene
  { key: "acquaIdeale",   label: "Acqua ideale",   mode: "avg" }, // quanta umidità le serve
  { key: "adattabilita",  label: "Adattabilità",   mode: "avg" }, // quanto sopporta di stare fuori posto
  // — PREGIO (lucentezza/rarità percepita: la cultura ne fa "valore") —
  { key: "valore",        label: "Pregio",        mode: "add" },
];

function defaultProps(p = {}) {
  const out = {};
  const RIPOSO = { legame: 0.3, caldoIdeale: 0.5, acquaIdeale: 0.5, adattabilita: 0.5, digeribilita: 0.8 };
  for (const { key } of PROPS) out[key] = p[key] != null ? p[key] : (RIPOSO[key] !== undefined ? RIPOSO[key] : 0);
  return out;
}

let _id = 0;
export function makeMaterial({ nome, descrizione = "", rarita = "raro", ambiente = "terra", colore = "#e0a030", props, rinnovabile = false, daAnimale = false, sintetico = false }) {
  const p = defaultProps(props);
  // Deperibilità (0 imperituro .. 1 marcisce in fretta) DEDOTTA: la roba organica deperisce.
  let deperibilita;
  if (daAnimale) deperibilita = 0.25 + (p.nutriente || 0) * 0.7;            // carne/grasso marciscono
  else if (rinnovabile) deperibilita = p.bioattivo > 0.2 ? 0.4 : p.nutriente > 0.3 ? 0.3 : 0.1; // piante appassiscono
  else deperibilita = 0.02;                                                  // minerali quasi eterni
  // Difficoltà di ESTRAZIONE (0 raccolta a mani nude .. 1 serve un ottimo strumento).
  // Deriva dalla durezza per i minerali; l'organico e i materiali di superficie sono facili.
  let durezzaEstrazione;
  if (daAnimale || rinnovabile) durezzaEstrazione = 0.05;                    // si raccoglie a mano
  else durezzaEstrazione = Math.max(0.2, (p.durezza || 0) * 0.85);           // roccia/metalli: più duri = più difficili
  const mat = { id: ++_id, nome, descrizione, rarita, ambiente, colore, rinnovabile, daAnimale, deperibilita, durezzaEstrazione, props: p };
  // GENI DELLE PIANTE (3.2): le rinnovabili sono organismi con un DNA botanico che evolve
  // (clima ideale in npc via regenRenewables; qui i tratti di forma). Presenti come "cose",
  // pronti per rese/rotazioni/domesticazione. Dedotti dai loro attributi, poi mutano.
  if (rinnovabile) {
    mat.geniPianta = {
      crescita: 0.5, radici: 0.4, dispersione: 0.5,
      resFreddo: 0.5, resCaldo: 0.5,
      produttivita: 0.4 + (p.nutriente || 0) * 0.4,
      tossicita: (p.tossicita || 0),
      durataVita: 0.5,
    };
  }
  mat.sintetico = sintetico;   // non sta nel terreno: esiste solo se qualcuno la fa
  return mat;
}

// Materiali di default: minerali, metalli, pietre, stabilizzatori e piante.
// I valori sono le "proprietà chimico-fisiche" da cui emerge tutto il resto.
export function defaultMaterials() {
  return [
    makeMaterial({ nome: "Legno",  descrizione: "Fibra vegetale; leggera e galleggia.", rarita: "comune", ambiente: "terra", colore: "#7a5230", rinnovabile: true,
      props: { digeribilita: 0.04, tempFusione: 0.75, acquosita: 0.3, caldoIdeale: 0.5, acquaIdeale: 0.62, adattabilita: 0.75, durezza: .35, peso: .30, elasticita: .55, fragilita: .30, energiaChim: .50, reattivita: .35, nutriente: .05, galleggiamento: .85, portanza: .15, legame: .50, valore: .10 } }),
    makeMaterial({ nome: "Pietra", descrizione: "Roccia comune, dura ma greggia.", rarita: "comune", ambiente: "terra", colore: "#9a938a",
      props: { tempFusione: 0.85, durezza: .80, peso: .70, fragilita: .45, taglio: .10, legame: .30, valore: .10 } }),
    makeMaterial({ nome: "Selce",  descrizione: "Si scheggia in lame taglienti.", rarita: "frequente", ambiente: "terra", colore: "#7d7268",
      props: { tempFusione: 0.85, taglio: .70, durezza: .55, fragilita: .70, peso: .20, legame: .20, valore: .20 } }),
    makeMaterial({ nome: "Rame",   descrizione: "Metallo malleabile dei monti.", rarita: "frequente", ambiente: "terra", colore: "#d08a3e",
      props: { tempFusione: 0.55, durezza: .50, peso: .80, elasticita: .35, taglio: .35, fragilita: .20, reattivita: .30, conducibilita: .90, legame: .60, valore: .45 } }),
    makeMaterial({ nome: "Ferro",  descrizione: "Metallo duro delle profondità.", rarita: "raro", ambiente: "terra", colore: "#b0563a",
      props: { durezza: .90, peso: .85, taglio: .50, fragilita: .35, reattivita: .35, conducibilita: .70, magnetismo: .85, tempFusione: 0.8, legame: .60, valore: .55 } }),
    makeMaterial({ nome: "Stagno",  descrizione: "Metallo molle; col rame fa il bronzo.", rarita: "raro", ambiente: "terra", colore: "#9aa0a6",
      props: { durezza: .40, peso: .75, reattivita: .30, conducibilita: .60, tempFusione: 0.25, legame: .60, valore: .40 } }),
    makeMaterial({ nome: "Argento", descrizione: "Metallo lucente e conduttivo.", rarita: "rarissimo", ambiente: "terra", colore: "#cfd6dd",
      props: { durezza: .35, peso: .90, conducibilita: .98, reattivita: .10, tempFusione: 0.6, legame: .50, valore: .80 } }),
    makeMaterial({ nome: "Piombo",  descrizione: "Pesante, molle e velenoso.", rarita: "raro", ambiente: "terra", colore: "#6b7076",
      props: { durezza: .30, peso: .95, tossicita: .40, tempFusione: 0.25, conducibilita: .4, legame: .40, valore: .20 } }),
    makeMaterial({ nome: "Mercurio", descrizione: "Metallo liquido, tossico e volatile.", rarita: "rarissimo", ambiente: "terra", colore: "#b8c0c8",
      props: { acquosita: 0.05, peso: .95, tossicita: .70, conducibilita: .60, viscosita: .30, volatilita: .50, tempFusione: 0.02, valore: .55 } }),
    makeMaterial({ nome: "Salnitro", descrizione: "Sale reattivo: ossidante per la polvere.", rarita: "raro", ambiente: "terra", colore: "#e8e4d0",
      props: { tempFusione: 0.3, energiaChim: .55, reattivita: .90, tossicita: .15, acidita: .1, legame: .25, valore: .35 } }),
    makeMaterial({ nome: "Calcare", descrizione: "Roccia tenera: calce e cemento.", rarita: "comune", ambiente: "terra", colore: "#cfc7b4",
      props: { digeribilita: 0.03, tempFusione: 0.78, durezza: .45, peso: .60, fragilita: .30, porosita: .3, acidita: .05, legame: .55, valore: .12 } }),
    makeMaterial({ nome: "Marmo",   descrizione: "Pietra pregiata da scultura.", rarita: "raro", ambiente: "terra", colore: "#e6e2dc",
      props: { tempFusione: 0.82, durezza: .70, peso: .78, fragilita: .30, legame: .35, valore: .55 } }),
    makeMaterial({ nome: "Quarzo",  descrizione: "Cristallo duro e trasparente.", rarita: "frequente", ambiente: "terra", colore: "#d8dbe0",
      props: { tempFusione: 0.88, durezza: .78, fragilita: .45, trasparenza: .65, conducibilita: .05, legame: .25, valore: .38 } }),
    makeMaterial({ nome: "Ossidiana", descrizione: "Vetro vulcanico dal filo micidiale.", rarita: "raro", ambiente: "terra", colore: "#2a2630",
      props: { tempFusione: 0.8, taglio: .95, durezza: .60, fragilita: .80, trasparenza: .15, peso: .30, legame: .15, valore: .35 } }),
    makeMaterial({ nome: "Diamante", descrizione: "Il minerale più duro; splendente.", rarita: "rarissimo", ambiente: "terra", colore: "#dff2ff",
      props: { tempFusione: 0.95, durezza: 1.0, fragilita: .20, trasparenza: .80, taglio: .6, legame: .30, valore: .95 } }),
    makeMaterial({ nome: "Gesso",   descrizione: "Tenero e poroso: stucchi e calchi.", rarita: "comune", ambiente: "terra", colore: "#eae6df",
      props: { digeribilita: 0.02, tempFusione: 0.7, durezza: .30, peso: .40, porosita: .60, fragilita: .4, legame: .50, valore: .10 } }),
    makeMaterial({ nome: "Petrolio", descrizione: "Liquido nero: energia e veleno.", rarita: "raro", ambiente: "terra", colore: "#20242a",
      props: { tempFusione: 0.015, acquosita: 0.05, energiaChim: .95, reattivita: .50, viscosita: .70, volatilita: .55, tossicita: .30, legame: .30, valore: .40 } }),
    makeMaterial({ nome: "Carbone",descrizione: "Combustibile; lega e indurisce le leghe.", rarita: "frequente", ambiente: "terra", colore: "#333138",
      props: { digeribilita: 0.02, tempFusione: 0.9, energiaChim: .70, reattivita: .40, stabilizzante: .45, durezza: .20, fragilita: .00, legame: .85, valore: .15 } }),
    makeMaterial({ nome: "Oro",    descrizione: "Prezioso, inerte e stabile.", rarita: "rarissimo", ambiente: "terra", colore: "#f2c94c",
      props: { tempFusione: 0.58, durezza: .30, peso: .95, elasticita: .40, reattivita: .02, conducibilita: .95, stabilizzante: .30, legame: .50, valore: 1.0 } }),
    makeMaterial({ nome: "Sale",   descrizione: "Cristalli disciolti nei mari.", rarita: "frequente", ambiente: "acqua", colore: "#dfe6ee", rinnovabile: true,
      props: { tempFusione: 0.55, caldoIdeale: 0.78, acquaIdeale: 0.9, adattabilita: 0.3, conducibilita: .20, nutriente: .10, tossicita: .10, legame: .30, valore: .30 } }),
    // --- Piante (rinnovabili: ricrescono nel tempo) ---
    makeMaterial({ nome: "Erba medica", descrizione: "Erba dal ricco principio attivo, poco tossica.", rarita: "frequente", ambiente: "terra", colore: "#5fae54", rinnovabile: true,
      props: { digeribilita: 0.5, tempFusione: 0.55, acquosita: 0.55, caldoIdeale: 0.48, acquaIdeale: 0.55, adattabilita: 0.7, bioattivo: .55, nutriente: .30, tossicita: .05, legame: .40, valore: .15 } }),
    makeMaterial({ nome: "Belladonna",  descrizione: "Bacche bellissime, ricche di alcaloidi.", rarita: "raro", ambiente: "terra", colore: "#6b3b6e", rinnovabile: true,
      props: { digeribilita: 0.35, tempFusione: 0.55, acquosita: 0.52, caldoIdeale: 0.4, acquaIdeale: 0.72, adattabilita: 0.25, bioattivo: .55, tossicita: .80, energiaChim: .10, reattivita: .20, legame: .20, valore: .20 } }),
    makeMaterial({ nome: "Grano",       descrizione: "Cereale nutriente, coltivabile.", rarita: "comune", ambiente: "terra", colore: "#d8c26a", rinnovabile: true,
      props: { digeribilita: 0.88, tempFusione: 0.6, acquosita: 0.12, caldoIdeale: 0.52, acquaIdeale: 0.5, adattabilita: 0.3, nutriente: .80, legame: .40, valore: .20 } }),
    makeMaterial({ nome: "Miele",       descrizione: "Dolce e bioattivo; lega e stabilizza le misture.", rarita: "raro", ambiente: "terra", colore: "#e6a83a", rinnovabile: true,
      props: { digeribilita: 0.96, tempFusione: 0.06, acquosita: 0.18, caldoIdeale: 0.56, acquaIdeale: 0.58, adattabilita: 0.4, stabilizzante: .40, bioattivo: .25, tossicita: .03, nutriente: .40, legame: .75, valore: .30 } }),
    makeMaterial({ nome: "Lino",        descrizione: "Fibra leggera: tele, vele, ali.", rarita: "frequente", ambiente: "terra", colore: "#cfd0a8", rinnovabile: true,
      props: { digeribilita: 0.05, tempFusione: 0.65, acquosita: 0.35, caldoIdeale: 0.36, acquaIdeale: 0.62, adattabilita: 0.35, peso: .08, elasticita: .5, portanza: .8, galleggiamento: .3, legame: .45, nutriente: .05, valore: .2 } }),
    makeMaterial({ nome: "Argilla",     descrizione: "Si modella: mattoni e vasi.", rarita: "comune", ambiente: "terra", colore: "#b07a55",
      props: { digeribilita: 0.02, tempFusione: 0.72, durezza: .40, peso: .50, fragilita: .35, legame: .65, valore: .10 } }),
    makeMaterial({ nome: "Zolfo",       descrizione: "Giallo, reattivo e ricco di energia.", rarita: "raro", ambiente: "terra", colore: "#d9c93a",
      props: { tempFusione: 0.2, energiaChim: .90, reattivita: .85, tossicita: .35, fragilita: .30, legame: .15, valore: .30 } }),
    makeMaterial({ nome: "Sabbia",      descrizione: "Con il calore diventa vetro.", rarita: "comune", ambiente: "terra", colore: "#e0d3a0",
      props: { digeribilita: 0.01, tempFusione: 0.86, durezza: .20, peso: .40, fragilita: .55, conducibilita: .10, trasparenza: .3, attrito: .5, legame: .25, valore: .10 } }),
    makeMaterial({ nome: "Uva",     descrizione: "Dolce; fermentando dà il vino.", rarita: "frequente", ambiente: "terra", colore: "#5a3d6b", rinnovabile: true,
      props: { digeribilita: 0.9, tempFusione: 0.4, acquosita: 0.78, caldoIdeale: 0.68, acquaIdeale: 0.34, adattabilita: 0.3, nutriente: .45, bioattivo: .10, volatilita: .10, legame: .35, valore: .25 } }),
    makeMaterial({ nome: "Papavero", descrizione: "Fiore dal potente principio attivo.", rarita: "raro", ambiente: "terra", colore: "#c1443a", rinnovabile: true,
      props: { digeribilita: 0.35, tempFusione: 0.55, acquosita: 0.4, caldoIdeale: 0.58, acquaIdeale: 0.42, adattabilita: 0.3, bioattivo: .75, tossicita: .40, nutriente: .05, legame: .20, valore: .35 } }),
    makeMaterial({ nome: "Aloe",     descrizione: "Pianta grassa, lenitiva.", rarita: "frequente", ambiente: "terra", colore: "#6fae72", rinnovabile: true,
      props: { digeribilita: 0.55, tempFusione: 0.05, acquosita: 0.7, caldoIdeale: 0.82, acquaIdeale: 0.12, adattabilita: 0.35, bioattivo: .55, nutriente: .10, tossicita: .02, viscosita: .3, legame: .40, valore: .20 } }),
    makeMaterial({ nome: "Cotone",   descrizione: "Fibra morbida per tessuti.", rarita: "frequente", ambiente: "terra", colore: "#eee9e0", rinnovabile: true,
      props: { digeribilita: 0.04, tempFusione: 0.68, acquosita: 0.3, caldoIdeale: 0.72, acquaIdeale: 0.55, adattabilita: 0.3, peso: .05, elasticita: .55, portanza: .55, porosita: .5, legame: .40, valore: .25 } }),
    makeMaterial({ nome: "Canapa",   descrizione: "Fibra robusta: corde e tele.", rarita: "frequente", ambiente: "terra", colore: "#b9c08a", rinnovabile: true,
      props: { digeribilita: 0.05, tempFusione: 0.68, acquosita: 0.35, caldoIdeale: 0.5, acquaIdeale: 0.52, adattabilita: 0.72, peso: .10, elasticita: .60, portanza: .35, legame: .60, valore: .20 } }),
    makeMaterial({ nome: "Bambù",    descrizione: "Fusto cavo: leggero e resistente.", rarita: "frequente", ambiente: "terra", colore: "#93a850", rinnovabile: true,
      props: { digeribilita: 0.06, tempFusione: 0.72, acquosita: 0.45, caldoIdeale: 0.66, acquaIdeale: 0.78, adattabilita: 0.35, durezza: .50, elasticita: .60, peso: .20, galleggiamento: .45, legame: .40, valore: .20 } }),
    makeMaterial({ nome: "Olio",     descrizione: "Grasso vegetale: cibo e lampade.", rarita: "raro", ambiente: "terra", colore: "#c7b24a", rinnovabile: true,
      props: { digeribilita: 0.9, tempFusione: 0.02, acquosita: 0.1, caldoIdeale: 0.72, acquaIdeale: 0.28, adattabilita: 0.25, energiaChim: .50, nutriente: .30, viscosita: .55, volatilita: .15, bioattivo: .10, legame: .35, valore: .30 } }),
    makeMaterial({ nome: "Tabacco",  descrizione: "Foglia aromatica e nociva.", rarita: "raro", ambiente: "terra", colore: "#8a6a3a", rinnovabile: true,
      props: { digeribilita: 0.3, tempFusione: 0.58, acquosita: 0.45, caldoIdeale: 0.74, acquaIdeale: 0.62, adattabilita: 0.22, bioattivo: .30, tossicita: .50, volatilita: .2, legame: .30, valore: .30 } }),
    // --- Materiali di origine ANIMALE (si ottengono dalle prede, non dai giacimenti) ---
    makeMaterial({ nome: "Carne",     descrizione: "Tessuto animale, molto nutriente.", rarita: "comune", daAnimale: true, colore: "#b5544e",
      props: { digeribilita: 0.9, tempFusione: 0.45, acquosita: 0.6, nutriente: .75, tossicita: .05, legame: .30, valore: .10 } }),
    makeMaterial({ nome: "Pelle",     descrizione: "Cuoio: vestiti e armature.", rarita: "frequente", daAnimale: true, colore: "#9a6b43",
      props: { digeribilita: 0.12, tempFusione: 0.6, durezza: .30, elasticita: .60, fragilita: .10, peso: .20, legame: .55, valore: .25 } }),
    makeMaterial({ nome: "Osso",      descrizione: "Duro e appuntito: utensili.", rarita: "frequente", daAnimale: true, colore: "#e6e0cf",
      props: { digeribilita: 0.05, tempFusione: 0.78, durezza: .60, taglio: .35, fragilita: .40, peso: .30, legame: .35, valore: .20 } }),
    makeMaterial({ nome: "Pelliccia", descrizione: "Calda: protegge dal freddo.", rarita: "frequente", daAnimale: true, colore: "#8a6a4a",
      props: { digeribilita: 0.06, tempFusione: 0.58, peso: .10, elasticita: .40, portanza: .10, legame: .35, valore: .30 } }),
    makeMaterial({ nome: "Grasso",    descrizione: "Riserva di energia chimica, commestibile.", rarita: "frequente", daAnimale: true, colore: "#e8dca0",
      props: { digeribilita: 0.92, tempFusione: 0.09, acquosita: 0.12, energiaChim: .60, reattivita: .25, nutriente: .35, legame: .40, valore: .15 } }),
    makeMaterial({ nome: "Avorio",    descrizione: "Prezioso, dai grandi animali.", rarita: "rarissimo", daAnimale: true, colore: "#efe8d8",
      props: { digeribilita: 0.03, tempFusione: 0.8, durezza: .55, fragilita: .20, legame: .45, valore: .85 } }),
    makeMaterial({ nome: "Squame",    descrizione: "Scaglie di pesce, resistenti.", rarita: "frequente", daAnimale: true, colore: "#9fc0b0",
      props: { digeribilita: 0.06, tempFusione: 0.7, durezza: .40, elasticita: .35, galleggiamento: .35, legame: .40, valore: .20 } }),
    makeMaterial({ nome: "Lana",      descrizione: "Vello caldo e filabile.", rarita: "frequente", daAnimale: true, colore: "#e3ddcf",
      props: { digeribilita: 0.05, tempFusione: 0.6, peso: .12, elasticita: .50, portanza: .10, porosita: .4, legame: .45, valore: .35 } }),
    makeMaterial({ nome: "Corno",     descrizione: "Duro e appuntito, come l'osso.", rarita: "raro", daAnimale: true, colore: "#c9bda0",
      props: { digeribilita: 0.04, tempFusione: 0.76, durezza: .65, taglio: .30, fragilita: .30, peso: .30, legame: .40, valore: .30 } }),
    makeMaterial({ nome: "Tendine",   descrizione: "Fibra elastica: corde d'arco.", rarita: "frequente", daAnimale: true, colore: "#d8c7b0",
      props: { digeribilita: 0.25, tempFusione: 0.62, elasticita: .85, peso: .05, portanza: .2, legame: .65, valore: .25 } }),
  ];
}

// Ambiente compatibile col tile?
function envMatch(ambiente, water) {
  if (ambiente === "entrambi") return true;
  return ambiente === "acqua" ? water : !water;
}

// =================================================================================================
// DOVE SI TROVA UNA COSA — geologia dedotta, non scritta.
//
// Prima i giacimenti cadevano a caso: l'oro poteva stare in una palude e il carbone in cima a una
// montagna. Ma **dove una sostanza si trova dipende dalle condizioni che l'hanno formata**, e
// quelle condizioni sono leggibili nelle sue proprietà. Nessun elenco di nomi entra qui dentro:
// il motore non sa che cos'è «il carbone», sa che una cosa piena di energia chimica e di residui
// di ciò che era vivo si è formata dove la vita si è accumulata e poi è stata sepolta.
//
//   • IGNEO — chi fonde solo a temperature altissime ed è duro si è formato nel fuoco, in
//     profondità. Lo trovi dove la roccia profonda è venuta a galla: le alture e i fianchi ripidi.
//   • SEDIMENTARIO — chi è poroso, tenero e fragile è polvere che si è posata sul fondo. Lo trovi
//     in basso, in piano, dove l'acqua ha rallentato.
//   • ORGANICO — chi porta energia chimica e nutrimento è vita sepolta. Lo trovi nelle conche
//     umide e calde, dove per millenni si è accumulato ciò che moriva.
//   • EVAPORITICO — chi è fatto di sali (conduce, è acido) e non è vivo resta quando l'acqua se ne
//     va. Lo trovi dove fa caldo e secco, e dove c'era del mare.
//   • DENSO — e in più, ciò che è pesante l'acqua lo lascia cadere per prima: si concentra lungo i
//     corsi d'acqua e nelle conche. È il motivo per cui l'oro si cerca nei fiumi.
// =================================================================================================
function indoleGeologica(p) {
  const fonde = p.tempFusione !== undefined ? p.tempFusione : 0.5;
  const vivo = (p.nutriente || 0) + (p.bioattivo || 0) * 0.6 + (p.energiaChim || 0) * 0.5;
  return {
    igneo: clamp01(fonde * 1.15 + (p.durezza || 0) * 0.5 - vivo * 0.9 - (p.porosita || 0) * 0.6 - 0.45),
    sedimentario: clamp01((p.porosita || 0) * 0.9 + (p.fragilita || 0) * 0.6 - (p.durezza || 0) * 0.5 - vivo * 0.5 + 0.1),
    organico: clamp01(vivo * 0.95 - (p.conducibilita || 0) * 0.4 - 0.1),
    evaporitico: clamp01(((p.conducibilita || 0) * 0.5 + (p.acidita || 0) * 0.8) * (1 - clamp01(vivo)) - 0.05),
    denso: clamp01((p.peso || 0) - 0.45),
  };
}

// IL POSTO DI UNA SOSTANZA. Non una media di preferenze — quella spalmava tutto al centro e ogni
// cosa finiva per stare un po' ovunque — ma un LUOGO PROPRIO: una certa quota, una certa umidità,
// un certo calore, con caduta netta man mano che te ne allontani.
//
// Ogni indole tira verso il suo posto, e la sostanza finisce dove la portano le sue indoli messe
// insieme. Chi non ha un'indole marcata resta indeciso — e allora la sua campana è larga, cioè si
// trova un po' dappertutto ma non è mai abbondante. Il che è giusto: sono le cose banali.
function nicchiaGeologica(p) {
  const g = indoleGeologica(p);
  const tot = g.igneo + g.sedimentario + g.organico + g.evaporitico + 0.02;
  //                     igneo  sediment. organico evapor.
  const q = (g.igneo * 0.88 + g.sedimentario * 0.18 + g.organico * 0.12 + g.evaporitico * 0.30 + 0.02 * 0.4) / tot;
  const u = (g.igneo * 0.40 + g.sedimentario * 0.66 + g.organico * 0.82 + g.evaporitico * 0.16 + 0.02 * 0.5) / tot;
  const c = (g.igneo * 0.45 + g.sedimentario * 0.45 + g.organico * 0.68 + g.evaporitico * 0.86 + 0.02 * 0.5) / tot;
  const carattere = Math.max(g.igneo, g.sedimentario, g.organico, g.evaporitico);
  return { q, u, c, fiume: g.denso, largh: 0.17 + (1 - carattere) * 0.30 };
}

// Quanto quel posto è «casa» per questa sostanza: 1 dove le condizioni sono le sue, giù in fretta
// appena ci si allontana. E ciò che è pesante l'acqua lo lascia cadere lungo la sua strada — per
// questo l'oro si cerca nei fiumi, e nessuno ha dovuto scriverlo.
function affinita(world, i, n) {
  const { elevation, seaLevel, moisture, temperature, riverNear } = world;
  const quota = clamp01((elevation[i] - seaLevel) / Math.max(1e-3, 1 - seaLevel));
  const dq = (quota - n.q) / n.largh;
  const du = (moisture[i] - n.u) / (n.largh * 1.7);
  const dc = (temperature[i] - n.c) / (n.largh * 1.7);
  let a = Math.exp(-0.5 * (dq * dq + du * du + dc * dc));
  if (n.fiume > 0.08) {
    const lungoAcqua = riverNear && riverNear[i] ? 1 : 0.12;
    a = a * (1 - n.fiume * 0.55) + n.fiume * 0.55 * lungoAcqua;
  }
  return clamp01(a);
}

// Genera la concentrazione (Float32 0..1) di UN materiale su tutto il mondo.
// I centri dei giacimenti sono posti solo su tile dell'ambiente giusto, e la
// concentrazione preferisce zone coerenti (es. metalli vicino ai rilievi).
// QUANTO QUEL POSTO LE SI ADDICE. Zero significa «qui non ce la fa», uno «qui è a casa sua».
// L'adattabilità allarga la campana: una specie tenace vive quasi ovunque e non è mai rigogliosa,
// una specialista è splendida nel suo angolo e altrove non c'è. Nessuna delle due è «migliore» —
// e la differenza fra le due strategie basta a fare flore diverse in posti diversi.
function agio(world, mat, i) {
  const p = mat.props;
  const largh = 0.1 + (p.adattabilita !== undefined ? p.adattabilita : 0.5) * 0.42;
  const dc = (world.temperature[i] - (p.caldoIdeale !== undefined ? p.caldoIdeale : 0.5)) / largh;
  const da = (world.moisture[i] - (p.acquaIdeale !== undefined ? p.acquaIdeale : 0.5)) / largh;
  return Math.exp(-0.5 * (dc * dc + da * da));
}

export function distributeMaterial(world, mat) {
  const { width, height, biome, elevation, seaLevel } = world;
  const n = width * height;
  const conc = new Float32Array(n);
  if (mat.daAnimale) return conc; // i materiali animali non hanno giacimenti: vengono dalle prede
  if (mat.sintetico) return conc; // e ciò che si fabbrica non sta sottoterra: esiste solo se lo fai
  const cfg = RARITY[mat.rarita] || RARITY.raro;

  // RNG dedicato: dipende dal seed del mondo E dal materiale -> stabile ma vario
  const rand = mulberry32(hashSeed(world.seed + "::" + mat.nome));
  const nicchia = nicchiaGeologica(mat.props);

  // Scegli i centri dei giacimenti su tile validi.
  const centers = [];
  let attempts = 0;
  let ripiego = -1, ripiegoA = -1;
  while (centers.length < cfg.deposits && attempts < cfg.deposits * 200) {
    attempts++;
    const x = Math.floor(rand() * width);
    const y = Math.floor(rand() * height);
    const i = y * width + x;
    const water = isWater(biome[i]);
    if (!envMatch(mat.ambiente, water)) continue;
    // Ciò che è vivo non attecchisce dove non sta bene: si riprova altrove.
    if (mat.rinnovabile && rand() > agio(world, mat, i)) continue;
    // Dove nasce un giacimento lo decide l'indole della sostanza, non una regola sui metalli.
    const a = affinita(world, i, nicchia);
    if (a > ripiegoA) { ripiegoA = a; ripiego = i; }
    if (rand() > a) continue;
    centers.push({ x, y, r: cfg.radius * (0.6 + rand() * 0.8) });
  }
  // Nessun posto le è andato a genio: si accontenta del migliore che ha trovato cercando.
  if (!centers.length && ripiego >= 0) {
    centers.push({ x: ripiego % width, y: (ripiego / width) | 0, r: cfg.radius * 0.7 });
  }

  const rw = 1 / width, rh = 1 / height;
  for (const c of centers) {
    const rad = c.r;
    const px = Math.floor(c.x * 1), py = Math.floor(c.y * 1);
    const span = Math.ceil(rad * Math.max(width, height)) + 1;
    const x0 = Math.max(0, px - span), x1 = Math.min(width - 1, px + span);
    const y0 = Math.max(0, py - span), y1 = Math.min(height - 1, py + span);
    const inv2r2 = 1 / (2 * rad * rad);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * width + x;
        if (!envMatch(mat.ambiente, isWater(biome[i]))) continue;
        const dx = (x - c.x) * rw, dy = (y - c.y) * rh;
        const d2 = dx * dx + dy * dy;
        let g = Math.exp(-d2 * inv2r2) * cfg.peak;
        if (mat.rinnovabile) g *= agio(world, mat, i);   // rada dove fa fatica, fitta dove sta bene
        else g *= 0.2 + affinita(world, i, nicchia) * 1.0;   // ricca dove le condizioni tornano
        if (g > conc[i]) conc[i] = g; // il giacimento più vicino domina
      }
    }
  }

  // Un pizzico di rumore per bordi meno perfetti.
  for (let i = 0; i < n; i++) {
    if (conc[i] > 0) conc[i] = Math.min(1, conc[i] * (0.85 + rand() * 0.3));
  }
  return conc;
}

// Registro: tiene i materiali e la loro distribuzione, e sa dire cosa c'è in un tile.
export class MaterialRegistry {
  constructor() {
    this.materials = [];
    this.byId = new Map();          // id -> materiale: le ricerche stanno dentro cicli caldi
    this.dist = new Map();    // id -> concentrazione ATTUALE (si esaurisce)
    this.distCap = new Map(); // id -> concentrazione originale (per la ricrescita)
    this.world = null;
  }
  _install(mat) {
    const d = distributeMaterial(this.world, mat);
    this.dist.set(mat.id, d);
    this.distCap.set(mat.id, Float32Array.from(d));
  }
  // Il materiale con quell'id, senza scorrere l'elenco.
  mat(id) { return this.byId.get(id); }

  // CHE COSA C'È SOTTO QUESTO TILE.
  //
  // Prima, per sapere che cosa poteva raccogliere, ogni persona scorreva TUTTI i materiali del
  // mondo chiedendo a ognuno «quanto ce n'è qui?»: millequattrocento persone per quarantasei
  // materiali, sessantacinquemila domande a ogni battito, quasi tutte con risposta «niente».
  //
  // I giacimenti però stanno fermi: si consumano, ma non si spostano e non ne compaiono di nuovi.
  // Quindi l'elenco di che cosa c'è in un posto si può scrivere una volta e riusare. Che sia un po'
  // vecchio non fa danno: chi raccoglie ricontrolla comunque quanto ne è rimasto, e un filone
  // esaurito che resta nell'elenco costa solo una lettura in più.
  presenzeAt(i) {
    if (!this._presenze) this.indicizzaPresenze();
    return this._presenze[i] || VUOTO;
  }

  indicizzaPresenze(soglia = 0.02) {
    if (!this.world) return;
    const N = this.world.width * this.world.height;
    const out = new Array(N);
    for (const mat of this.materials) {
      if (mat.sintetico) continue;                 // le cose fatte non stanno sottoterra
      const d = this.dist.get(mat.id);
      if (!d) continue;
      for (let i = 0; i < N; i++) {
        if (d[i] <= soglia) continue;
        (out[i] || (out[i] = [])).push(mat.id);
      }
    }
    this._presenze = out;
  }

  // Toglie una materia dal mondo: serve solo per le cose fabbricate che nessuno fa più.
  rimuovi(id) {
    const i = this.materials.findIndex((m) => m.id === id);
    if (i < 0) return false;
    this.materials.splice(i, 1);
    this.byId.delete(id);
    this.dist.delete(id); this.distCap.delete(id);
    return true;
  }

  bindWorld(world) {
    this.world = world;
    // Un dado legato al seme: la deriva climatica delle piante deve ripetersi identica.
    this.rng = mulberry32(hashSeed((world.seed || "") + "::flora"));
    this._presenze = null;                          // il sottosuolo è cambiato: si rifà l'indice
    if (this.byId.size !== this.materials.length) {
      this.byId.clear();
      for (const mm of this.materials) this.byId.set(mm.id, mm);
    }
    this.dist.clear(); this.distCap.clear();
    for (const m of this.materials) this._install(m);
  }
  add(mat) {
    if (!mat.sintetico) this._presenze = null;      // un materiale nuovo nel terreno invalida l'indice
    this.materials.push(mat);
    this.byId.set(mat.id, mat);
    if (this.world) this._install(mat);
    return mat;
  }
  concentrationAt(matId, i) {
    const d = this.dist.get(matId);
    return d ? d[i] : 0;
  }
  // Estrazione: consuma il giacimento nel tile. Ritorna la quantità estratta.
  deplete(matId, i, amount) {
    const d = this.dist.get(matId);
    if (!d) return 0;
    const took = Math.min(d[i], amount);
    d[i] -= took;
    return took;
  }
  // Le risorse rinnovabili (piante) ricrescono verso la capacità. EVOLUZIONE (3.2): ogni pianta
  // ha un CLIMA IDEALE; ricresce bene dove il clima combacia, appassisce dove è ostile. L'ideale
  // DERIVA lentamente verso i luoghi in cui la pianta prospera ORA (+ mutazione) → adattamento
  // regionale emergente: la stessa specie diverge in ceppi caldi/freddi. Nessuna regola scritta.
  regenRenewables(dt) {
    const temp = this.world && this.world.temperature;
    const FETTE = 4;
    this._fettaVeg = ((this._fettaVeg || 0) + 1) % FETTE;
    dt *= FETTE;                       // chi tocca il turno riceve il tempo di tutti
    for (const m of this.materials) {
      if (!m.rinnovabile) continue;
      const d = this.dist.get(m.id), cap = this.distCap.get(m.id);
      if (!d || !cap) continue;
      if (m.tempIdeale == null) { m.tempIdeale = 0.5; m.tolleranza = 0.28; }
      const rate = 0.03 * dt;
      let wTemp = 0, wSum = 0;
      for (let i = this._fettaVeg; i < d.length; i += FETTE) {
        if (temp) {
          const scarto = Math.abs(temp[i] - m.tempIdeale) - m.tolleranza;
          const match = scarto <= 0 ? 1 : Math.max(0, 1 - scarto * 2);
          if (d[i] < cap[i]) d[i] = Math.min(cap[i], d[i] + rate * cap[i] * match);
          else if (match < 0.25 && d[i] > 0) d[i] = Math.max(0, d[i] - rate * 0.6 * cap[i]); // fuori clima appassisce
          if (d[i] > 0) { wTemp += temp[i] * d[i]; wSum += d[i]; }
        } else if (d[i] < cap[i]) d[i] = Math.min(cap[i], d[i] + rate * cap[i]);
      }
      if (temp && wSum > 0 && (this.rng || Math.random)() < 0.1) {
        const target = wTemp / wSum;
        m.tempIdeale = Math.max(0, Math.min(1, m.tempIdeale + (target - m.tempIdeale) * 0.05 + (((this.rng || Math.random)()) - 0.5) * 0.01));
      }
    }
  }
  // Materiali presenti in un tile, ordinati per concentrazione (soglia minima).
  materialsAt(i, threshold = 0.12) {
    const out = [];
    for (const m of this.materials) {
      const c = this.concentrationAt(m.id, i);
      if (c >= threshold) out.push({ mat: m, c });
    }
    return out.sort((a, b) => b.c - a.c);
  }
}
