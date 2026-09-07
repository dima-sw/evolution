// Livello 1 — Il mondo.
// Una matrice di tile. Ogni tile ha: altitudine, temperatura, umidità, tipo (acqua/terra), biome.
import { makeNoise2D } from "./noise.js";
import { hashSeed } from "./rng.js";

export const BIOME = {
  DEEP_WATER: 0, WATER: 1, SHALLOW: 2, BEACH: 3,
  DESERT: 4, GRASS: 5, FOREST: 6, JUNGLE: 7,
  TUNDRA: 8, SNOW: 9, ROCK: 10, MOUNTAIN: 11, SWAMP: 12,
};

// Colori base per biome (RGB).
export const BIOME_COLOR = {
  [BIOME.DEEP_WATER]: [18, 42, 84],
  [BIOME.WATER]:      [28, 66, 128],
  [BIOME.SHALLOW]:    [46, 104, 170],
  [BIOME.BEACH]:      [206, 190, 140],
  [BIOME.DESERT]:     [201, 176, 108],
  [BIOME.GRASS]:      [96, 150, 74],
  [BIOME.FOREST]:     [58, 110, 60],
  [BIOME.JUNGLE]:     [40, 96, 52],
  [BIOME.TUNDRA]:     [140, 150, 130],
  [BIOME.SNOW]:       [232, 236, 240],
  [BIOME.ROCK]:       [120, 116, 110],
  [BIOME.MOUNTAIN]:   [96, 92, 88],
  [BIOME.SWAMP]:      [70, 96, 74],
};

export const BIOME_NAME = {
  [BIOME.DEEP_WATER]: "Oceano profondo", [BIOME.WATER]: "Mare", [BIOME.SHALLOW]: "Acque basse",
  [BIOME.BEACH]: "Spiaggia", [BIOME.DESERT]: "Deserto", [BIOME.GRASS]: "Prateria",
  [BIOME.FOREST]: "Foresta", [BIOME.JUNGLE]: "Giungla", [BIOME.TUNDRA]: "Tundra",
  [BIOME.SNOW]: "Nevi", [BIOME.ROCK]: "Roccia", [BIOME.MOUNTAIN]: "Montagna",
  [BIOME.SWAMP]: "Palude",
};

export function isWater(biome) { return biome <= BIOME.SHALLOW; }

export function generateWorld({ seed, width = 320, height = 320, waterPct = 70 }) {
  const seedInt = hashSeed(seed);
  const elevNoise = makeNoise2D(seedInt);
  const moistNoise = makeNoise2D(seedInt ^ 0x9e3779b9);
  const tempNoise = makeNoise2D(seedInt ^ 0x517cc1b7);

  const n = width * height;
  const elevation = new Float32Array(n);
  const temperature = new Float32Array(n);
  const moisture = new Float32Array(n);
  const biome = new Uint8Array(n);

  const scale = 3.2; // quante "unità di rumore" attraversano la mappa -> dimensione dei continenti
  const cx = 0.5, cy = 0.5;

  // 1) Altitudine grezza con maschera radiale (bordi = oceano) per avere continenti centrati.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const nx = x / width, ny = y / height;
      let e = elevNoise.fbm(nx * scale, ny * scale, 6);
      e = (e + 1) / 2; // -> [0,1]
      // gradiente radiale: abbassa le coste esterne
      const dx = (nx - cx) * 2, dy = (ny - cy) * 2;
      const d = Math.sqrt(dx * dx + dy * dy); // 0 al centro, ~1.4 agli angoli
      const falloff = Math.max(0, 1 - Math.pow(d * 0.92, 2.2));
      e = e * 0.72 + falloff * 0.28;
      elevation[i] = e;

      // Umidità
      let m = (moistNoise.fbm(nx * scale * 1.5 + 10, ny * scale * 1.5 + 10, 4) + 1) / 2;
      moisture[i] = m;

      // Temperatura: dipende dalla latitudine (poli freddi) + rumore + quota
      const lat = Math.abs(ny - 0.5) * 2; // 0 equatore, 1 poli
      let t = 1 - lat;
      t += (tempNoise.fbm(nx * 2 + 5, ny * 2 + 5, 3)) * 0.15;
      temperature[i] = t; // verrà corretta con la quota dopo aver fissato il livello del mare
    }
  }

  // 2) Livello del mare come percentile -> percentuale d'acqua garantita.
  const sorted = Float32Array.from(elevation).sort();
  const seaIdx = Math.min(n - 1, Math.floor((waterPct / 100) * n));
  const seaLevel = sorted[seaIdx];
  const maxElev = sorted[n - 1];

  // 3) Classificazione in biomi.
  // (le stesse regole vivono anche in biomaDi, in fondo al file: quando la terra si muove
  //  davvero — una frana, una faglia, un cono che cresce — il posto va riclassificato con
  //  gli stessi criteri con cui era nato, non con la memoria di com'era.)
  for (let i = 0; i < n; i++) {
    const e = elevation[i];
    if (e < seaLevel) {
      const depth = (seaLevel - e) / (seaLevel || 1);
      if (depth > 0.55) biome[i] = BIOME.DEEP_WATER;
      else if (depth > 0.18) biome[i] = BIOME.WATER;
      else biome[i] = BIOME.SHALLOW;
      continue;
    }
    // Terra: altezza normalizzata sopra il livello del mare
    const land = (e - seaLevel) / Math.max(1e-4, maxElev - seaLevel); // [0,1]
    // correzione temperatura con la quota
    const t = temperature[i] - land * 0.5;
    temperature[i] = t;
    const m = moisture[i];

    if (land < 0.02) { biome[i] = BIOME.BEACH; continue; }
    if (land > 0.82) { biome[i] = BIOME.SNOW; continue; }
    if (land > 0.66) { biome[i] = t < 0.25 ? BIOME.SNOW : BIOME.MOUNTAIN; continue; }
    if (land > 0.52) { biome[i] = BIOME.ROCK; continue; }

    if (t < 0.18) biome[i] = BIOME.SNOW;
    else if (t < 0.32) biome[i] = BIOME.TUNDRA;
    else if (t > 0.72) biome[i] = m > 0.55 ? BIOME.JUNGLE : BIOME.DESERT;
    else if (m < 0.32) biome[i] = t > 0.55 ? BIOME.DESERT : BIOME.GRASS;
    else if (m > 0.6) biome[i] = BIOME.FOREST;
    else biome[i] = BIOME.GRASS;
  }

  // 4) FIUMI: nascono in alta quota e scendono seguendo la pendenza fino al mare.
  //    river[i]=1 -> acqua DOLCE potabile; il mare resta SALATO (non si beve).
  //    stagnant[i]=1 -> acqua FERMA (stagno/palude): dolce ma CONTAMINABILE (rischio malattia).
  const river = new Uint8Array(n);
  const stagnant = new Uint8Array(n);
  const rand = (() => { let s = seedInt ^ 0x2545f491; return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
  // Sorgenti: tile di terra molto elevati.
  const springs = [];
  for (let tries = 0; tries < 4000 && springs.length < 14; tries++) {
    const i = (rand() * n) | 0;
    if (!isWater(biome[i]) && elevation[i] > seaLevel + (1 - seaLevel) * 0.55) springs.push(i);
  }
  for (const s of springs) {
    let cur = s;
    for (let step = 0; step < 600; step++) {
      // Il MARE È TUTTO SALATO: la foce non va marcata come acqua dolce, altrimenti si potrebbe
      // bere dal mare proprio dove il fiume ci finisce. L'acqua dolce esiste SOLO sulla terra
      // (fiumi, laghi di conca, paludi).
      if (isWater(biome[cur])) break; // sbocca nel mare: qui l'acqua torna salata
      river[cur] = 1;
      // Scendi verso il vicino più basso (8 direzioni, con un filo di casualità).
      const cx = cur % width, cy = (cur / width) | 0;
      let best = -1, bestE = elevation[cur] + 0.002;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const ni = ny * width + nx;
        const e = elevation[ni] + rand() * 0.004;
        if (e < bestE) { bestE = e; best = ni; }
      }
      if (best < 0) { stagnant[cur] = 1; break; } // conca: nasce uno STAGNO (acqua ferma, contaminabile)
      cur = best;
    }
  }
  // PALUDI: terra bassa, calda e molto umida = acquitrino. Acqua dolce ferma ma malsana.
  for (let i = 0; i < n; i++) {
    if (isWater(biome[i]) || river[i]) continue;
    const land = (elevation[i] - seaLevel) / Math.max(1e-4, maxElev - seaLevel);
    if (land < 0.12 && moisture[i] > 0.62 && temperature[i] > 0.45 && rand() < 0.5) {
      stagnant[i] = 1; river[i] = 1; biome[i] = BIOME.SWAMP; // acquitrino: bioma vero, acqua ferma
    }
  }
  // riverNear: fiume o adiacente (per fertilità delle rive e alluvioni).
  const riverNear = new Uint8Array(n);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (!river[i]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < width && ny < height) riverNear[ny * width + nx] = 1;
    }
  }

  // Statistiche utili
  let landCount = 0;
  for (let i = 0; i < n; i++) if (!isWater(biome[i])) landCount++;

  return {
    seed, width, height, waterPct,
    elevation, temperature, moisture, biome, seaLevel, maxElev,
    river, riverNear, stagnant,
    landRatio: landCount / n,
    idx: (x, y) => y * width + x,
  };
}


// CHE COS'E' UN POSTO, ADESSO. Stesse regole della generazione, applicate a un tile solo e senza
// modificare niente. Serve da quando il paesaggio si muove: un fondale che riemerge non deve
// tornare a essere "quello che era all'inizio" — all'inizio era mare, e un pezzo di terra
// asciutta marcato come mare non si potrebbe ne' calpestare ne' coltivare. Deve diventare cio'
// che quel clima e quella quota comportano, oggi.
export function biomaDi(w, i) {
  const e = w.elevation[i], seaLevel = w.seaLevel;
  if (e < seaLevel) {
    const depth = (seaLevel - e) / (seaLevel || 1);
    return depth > 0.55 ? BIOME.DEEP_WATER : depth > 0.18 ? BIOME.WATER : BIOME.SHALLOW;
  }
  const maxElev = w.maxElev || 1;
  const land = (e - seaLevel) / Math.max(1e-4, maxElev - seaLevel);
  // la temperatura memorizzata e' gia' quella del posto; la quota la raffredda, ma il calcolo
  // resta locale: se lo si riscrivesse nell'array, ogni riclassifica raffredderebbe di nuovo.
  const t = w.temperature[i] - land * 0.5;
  const m = w.moisture[i];
  if (land < 0.02) return BIOME.BEACH;
  if (land > 0.82) return BIOME.SNOW;
  if (land > 0.66) return t < 0.25 ? BIOME.SNOW : BIOME.MOUNTAIN;
  if (land > 0.52) return BIOME.ROCK;
  if (t < 0.18) return BIOME.SNOW;
  if (t < 0.32) return BIOME.TUNDRA;
  if (t > 0.72) return m > 0.55 ? BIOME.JUNGLE : BIOME.DESERT;
  if (m < 0.32) return t > 0.55 ? BIOME.DESERT : BIOME.GRASS;
  if (m > 0.6) return BIOME.FOREST;
  return BIOME.GRASS;
}
