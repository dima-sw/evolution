// RENDERING — mondo e creature. Progettato attorno a tre idee:
//   1) CAMERA: si può zoomare (rotella) e spostarsi (trascinando). Il mondo non è più un
//      francobollo di puntini: si può scendere fino a vedere le singole persone.
//   2) LIVELLI DI DETTAGLIO (LOD): da lontano contano i TERRITORI e gli insediamenti; da vicino
//      compaiono corpi, case col tetto, campi arati, animali. Si disegna solo ciò che si vede.
//   3) LEGGIBILITÀ: rilievo ombreggiato per capire la forma della terra, colori distinti per ruolo,
//      etichette e icone solo quando c'è spazio, selezione con scheda dell'individuo.
import { BIOME_COLOR, BIOME, isWater } from "./world.js";
import { skinRGB } from "./genetics.js";
import { ruoloDi } from "./animals.js";


// COLORI DELLE ATTIVITÀ — a colpo d'occhio si legge COSA sta facendo ognuno. Non è un ruolo né un
// mestiere: è l'azione di questo istante, che cambia di continuo secondo i bisogni del momento.
export const COLORI_ATTIVITA = {
  "raccogliere": "#7ec850", "cercare cibo": "#b5d94a", "bere": "#49b6e8",
  "dormire": "#4a5fa8", "curarsi": "#e86fa8", "coltivare": "#e0b93a",
  "costruire": "#c08a4a", "sperimentare": "#c46ae0", "insegnare": "#f0d040",
  "creare": "#f08fd0", "commerciare": "#e8c060", "esplorare": "#40d8d0",
  "migrare": "#9a7ae0", "ribellarsi": "#ff8c1a", "combattere": "#ff3b30",
  "difendersi": "#ff7a45", "aggredire": "#e0342a", "riposare": "#6a7a90",
};
export const COLORE_ATT = (a) => (a && (COLORI_ATTIVITA[a] || (a.startsWith("ordine:") ? "#6fd3ff" : null))) || "#8b95a4";

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + h * 12) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [f(0), f(8), f(4)];
}

// ═══ MONDO ══════════════════════════════════════════════════════════════════════════════════
export class WorldRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.off = document.createElement("canvas");   // terreno alla risoluzione dei tile
    this.offCtx = this.off.getContext("2d");
    this.view = "biome";
    this.world = null; this.registry = null; this.selectedMat = null; this.pop = null;
    // CAMERA: centro in coordinate-mondo + pixel per tile.
    this.cam = { x: 160, y: 160, zoom: 3 };
    this.minZoom = 1; this.maxZoom = 40;
    this.dirtyTerrain = true;
  }

  setWorld(world, registry) {
    this.world = world; this.registry = registry;
    this.off.width = world.width; this.off.height = world.height;
    this.buffer = this.offCtx.createImageData(world.width, world.height);
    this.cam.x = world.width / 2; this.cam.y = world.height / 2;
    this.dirtyTerrain = true;
    this.resize();
  }

  // Il canvas riempie tutto lo spazio disponibile (niente più scala a numeri interi).
  resize() {
    if (!this.world) return;
    const wrap = this.canvas.parentElement, stage = wrap.parentElement;
    const cssW = Math.max(320, stage.clientWidth - 24), cssH = Math.max(320, stage.clientHeight - 24);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [this.canvas, this.agents]) {
      if (!c) continue;
      c.width = Math.round(cssW * dpr); c.height = Math.round(cssH * dpr);
      c.style.width = cssW + "px"; c.style.height = cssH + "px";
    }
    wrap.style.width = cssW + "px"; wrap.style.height = cssH + "px";
    this.dpr = dpr; this.cssW = cssW; this.cssH = cssH;
    // zoom minimo = quello che fa entrare tutto il mondo nello schermo
    this.minZoom = Math.min(cssW / this.world.width, cssH / this.world.height);
    if (this.cam.zoom < this.minZoom) this.cam.zoom = this.minZoom;
    this.clampCam();
    this.draw();
    if (this.onResize) this.onResize();
  }

  clampCam() {
    const w = this.world; if (!w) return;
    const halfW = this.cssW / (2 * this.cam.zoom), halfH = this.cssH / (2 * this.cam.zoom);
    this.cam.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.cam.zoom));
    this.cam.x = Math.max(Math.min(halfW, w.width / 2), Math.min(w.width - halfW, this.cam.x));
    this.cam.y = Math.max(Math.min(halfH, w.height / 2), Math.min(w.height - halfH, this.cam.y));
    if (w.width * this.cam.zoom <= this.cssW) this.cam.x = w.width / 2;
    if (w.height * this.cam.zoom <= this.cssH) this.cam.y = w.height / 2;
  }

  // Conversioni schermo ↔ mondo (usate da zoom, pan, tooltip e selezione).
  worldToScreen(wx, wy) {
    return [(wx - this.cam.x) * this.cam.zoom + this.cssW / 2, (wy - this.cam.y) * this.cam.zoom + this.cssH / 2];
  }
  screenToWorld(sx, sy) {
    return [(sx - this.cssW / 2) / this.cam.zoom + this.cam.x, (sy - this.cssH / 2) / this.cam.zoom + this.cam.y];
  }
  zoomAt(sx, sy, fattore) {
    const [wx, wy] = this.screenToWorld(sx, sy);
    this.cam.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.cam.zoom * fattore));
    const [nx, ny] = this.screenToWorld(sx, sy);
    this.cam.x += wx - nx; this.cam.y += wy - ny;   // il punto sotto il cursore resta fermo
    this.clampCam(); this.dirtyTerrain = true; this.draw();
  }
  pan(dxPx, dyPx) {
    this.cam.x -= dxPx / this.cam.zoom; this.cam.y -= dyPx / this.cam.zoom;
    this.clampCam(); this.draw();
  }

  // ---- colore del terreno (con le viste tematiche) ----
  baseColor(i) {
    const w = this.world;
    if (this.view === "elevation") {
      const e = w.elevation[i];
      if (e < w.seaLevel) { const v = 30 + 120 * (e / w.seaLevel); return [v * 0.4, v * 0.6, v]; }
      const t = (e - w.seaLevel) / (1 - w.seaLevel);
      const g = 60 + 180 * t; return [g, g * 0.92, g * 0.8];
    }
    if (this.view === "temperature") {
      const t = Math.max(0, Math.min(1, w.temperature[i]));
      return [40 + 200 * t, 60, 200 - 160 * t];
    }
    if (this.view === "inquinamento" && this.pop) {
      const p = this.pop.pollution[i], base = BIOME_COLOR[w.biome[i]];
      if (p < 0.05) return [base[0] * 0.5, base[1] * 0.5, base[2] * 0.5];
      return [60 + 160 * p, 50 * (1 - p), 30 * (1 - p)];
    }
    if (this.view === "territorio" && this.pop && this.pop.terrCell) {
      const P = this.pop, TS = P.terrSize, TW = P.terrW;
      const owner = P.terrCell[(((i / w.width) | 0) / TS | 0) * TW + ((i % w.width) / TS | 0)];
      const base = isWater(w.biome[i]) ? [16, 26, 44] : BIOME_COLOR[w.biome[i]];
      if (owner < 0 || isWater(w.biome[i])) return [base[0] * 0.55, base[1] * 0.55, base[2] * 0.55];
      const f = P.factions.find((x) => x.id === owner);
      if (!f) return base;
      const m = f.colore.match(/hsl\((\d+)/); const rgb = hslToRgb((m ? +m[1] : 0) / 360, 0.55, 0.5);
      return [base[0] * 0.35 + rgb[0] * 0.65, base[1] * 0.35 + rgb[1] * 0.65, base[2] * 0.35 + rgb[2] * 0.65];
    }
    if (this.view === "attivita" && this.pop) {
      // sfondo desaturato: contano solo le persone e i loro colori
      const b = isWater(w.biome[i]) ? [14, 22, 38] : BIOME_COLOR[w.biome[i]];
      return [b[0] * 0.45 + 20, b[1] * 0.45 + 20, b[2] * 0.45 + 20];
    }
    if (this.view === "scoperto" && this.pop) {
      if (!this.pop.scoperto[i]) return [12, 14, 20];
      return BIOME_COLOR[w.biome[i]];
    }
    if (this.view === "regioni") {
      if (isWater(w.biome[i])) return [12, 20, 34];
      const temp = Math.max(0, Math.min(1, w.temperature[i]));
      return skinRGB(temp * 0.9 + 0.05, (i % w.width) / w.width * 2 - 1);
    }
    if (w.stagnant && w.stagnant[i] && !isWater(w.biome[i])) return [70, 110, 78];
    if (w.river && w.river[i] && !isWater(w.biome[i])) return [72, 134, 214];
    return BIOME_COLOR[w.biome[i]];
  }

  // Ridisegna la texture del terreno (solo quando serve): colore + RILIEVO OMBREGGIATO.
  // L'ombreggiatura è ciò che rende finalmente leggibile la forma della terra: montagne, valli,
  // coste e pendii si distinguono a colpo d'occhio invece di essere macchie piatte.
  rebuildTerrain() {
    const w = this.world, data = this.buffer.data;
    const sel = this.selectedMat;
    const selDist = sel && this.registry ? this.registry.dist.get(sel.id) : null;
    const selRgb = sel ? hexToRgb(sel.colore) : null;
    const tematica = this.view === "temperature" || this.view === "elevation" || this.view === "regioni";
    for (let y = 0; y < w.height; y++) {
      for (let x = 0; x < w.width; x++) {
        const i = y * w.width + x;
        let [r, g, b] = this.baseColor(i);
        if (!tematica) {
          // luce da nord-ovest: confronto con la quota del vicino in alto a sinistra
          const ix = x > 0 ? i - 1 : i, iy = y > 0 ? i - w.width : i;
          const dz = (w.elevation[i] - (w.elevation[ix] + w.elevation[iy]) / 2);
          const acqua = isWater(w.biome[i]);
          const luce = 1 + Math.max(-0.55, Math.min(0.55, dz * (acqua ? 6 : 26)));
          r *= luce; g *= luce; b *= luce;
          if (acqua) { // l'acqua profonda si scurisce: si legge la batimetria
            const prof = Math.max(0, (w.seaLevel - w.elevation[i]) / (w.seaLevel || 1));
            r *= 1 - prof * 0.35; g *= 1 - prof * 0.3; b *= 1 - prof * 0.1;
          }
        }
        // GRANA NATURALE: piccola variazione cromatica per tile (deterministica). Senza questa,
        // da vicino il mondo è una scacchiera di quadrati identici; con questa sembra terreno.
        if (!tematica) {
          const n = Math.imul(i ^ 0x9e3779b9, 668265263);
          const v = 1 + ((((n ^ (n >>> 13)) >>> 0) / 4294967296) - 0.5) * 0.14;
          r *= v; g *= v; b *= v;
        }
        if (selDist) {
          const c = selDist[i];
          if (c > 0.08) { const a = Math.min(0.92, 0.25 + c * 0.7); r = r * (1 - a) + selRgb[0] * a; g = g * (1 - a) + selRgb[1] * a; b = b * (1 - a) + selRgb[2] * a; }
          else { r *= 0.5; g *= 0.5; b *= 0.5; }
        }
        const p = i * 4;
        data[p] = Math.max(0, Math.min(255, r)); data[p + 1] = Math.max(0, Math.min(255, g));
        data[p + 2] = Math.max(0, Math.min(255, b)); data[p + 3] = 255;
      }
    }
    this.offCtx.putImageData(this.buffer, 0, 0);
    this.dirtyTerrain = false;
  }


  draw() {
    if (!this.world) return;
    if (this.dirtyTerrain) this.rebuildTerrain();
    const ctx = this.ctx, z = this.cam.zoom, dpr = this.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    // porzione di mondo visibile
    const sw = this.cssW / z, sh = this.cssH / z;
    const sx = this.cam.x - sw / 2, sy = this.cam.y - sh / 2;
    ctx.imageSmoothingEnabled = z < 2;   // da lontano ammorbidisce, da vicino pixel netti
    ctx.drawImage(this.off, sx, sy, sw, sh, 0, 0, this.cssW, this.cssH);
    this.viewport = { sx, sy, sw, sh };
  }

  setView(v) { this.view = v; this.dirtyTerrain = true; this.draw(); }
  setSelected(mat) { this.selectedMat = mat; this.dirtyTerrain = true; this.draw(); }
  invalidate() { this.dirtyTerrain = true; }
}

// ═══ CREATURE, INSEDIAMENTI, EVENTI ═════════════════════════════════════════════════════════
export class AgentsRenderer {
  constructor(canvas, world) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.world = world; this.pop = null; this.wr = null;
    this.selected = null;          // NPC selezionato (scheda)
    this.hover = null;
  }
  setWorld(world) { this.world = world; }
  setPopulation(pop) { this.pop = pop; this.selected = null; }
  bind(worldRenderer) { this.wr = worldRenderer; }

  // Trova l'essere più vicino a un punto del mondo (per selezione e tooltip).
  pick(wx, wy, raggio = 3) {
    if (!this.pop) return null;
    let best = null, bd = raggio * raggio;
    const prova = (lista, tipo) => {
      for (const o of lista) {
        if (!o.vivo) continue;
        const d = (o.x - wx) ** 2 + (o.y - wy) ** 2;
        if (d < bd) { bd = d; best = { o, tipo }; }
      }
    };
    prova(this.pop.npcs, "npc");
    for (const o of this.pop.creature || []) {
      if (!o.vivo) continue;
      const d = (o.x - wx) ** 2 + (o.y - wy) ** 2;
      if (d < bd) { bd = d; best = { o, tipo: ruoloDi(o) }; }
    }
    return best;
  }

  // Disegna la "vegetazione minuta" del paesaggio. Puramente estetico: non tocca la simulazione.
  dettagliTerreno(ctx, wr, vp, z, LOD) {
    const w = this.pop.world, W = w.width;
    const x0 = Math.max(0, Math.floor(vp.sx)), x1 = Math.min(W - 1, Math.ceil(vp.sx + vp.sw));
    const y0 = Math.max(0, Math.floor(vp.sy)), y1 = Math.min(w.height - 1, Math.ceil(vp.sy + vp.sh));
    if ((x1 - x0) * (y1 - y0) > 9000) return;               // troppi tile: salta (siamo lontani)
    const rnd = (i, k) => { const t = Math.imul(i ^ (k * 374761393), 668265263); return ((t ^ (t >>> 13)) >>> 0) / 4294967296; };
    const food = this.pop.food, fert = this.pop.fertility;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x, b = w.biome[i];
        const [px, py] = wr.worldToScreen(x, y);
        const veg = food ? food[i] : 0.5;
        if (b === BIOME.FOREST || b === BIOME.JUNGLE) {
          // ALBERI: numero proporzionale alla vegetazione rimasta (un bosco tagliato si spoglia)
          const n = veg > 0.6 ? 3 : veg > 0.25 ? 2 : 1;
          for (let k = 0; k < n; k++) {
            const ax = px + rnd(i, k + 1) * z, ay = py + rnd(i, k + 9) * z;
            const h = z * (0.3 + rnd(i, k + 5) * 0.22);
            ctx.fillStyle = "rgba(60,42,26,.85)";
            ctx.fillRect(ax - z * 0.03, ay - h * 0.3, Math.max(0.7, z * 0.07), h * 0.35);
            ctx.fillStyle = b === BIOME.JUNGLE ? "rgba(28,84,40,.92)" : "rgba(38,96,46,.92)";
            ctx.beginPath(); ctx.moveTo(ax, ay - h); ctx.lineTo(ax + h * 0.42, ay - h * 0.2); ctx.lineTo(ax - h * 0.42, ay - h * 0.2); ctx.closePath(); ctx.fill();
          }
        } else if (b === BIOME.GRASS || b === BIOME.TUNDRA) {
          // CIUFFI D'ERBA: spariscono dove il suolo è sfruttato → il degrado si VEDE
          const n = veg > 0.5 ? 3 : veg > 0.2 ? 2 : 0;
          ctx.strokeStyle = b === BIOME.TUNDRA ? "rgba(120,140,110,.6)" : `rgba(70,120,50,${0.35 + veg * 0.4})`;
          ctx.lineWidth = Math.max(0.6, z * 0.05);
          for (let k = 0; k < n; k++) {
            const ax = px + rnd(i, k + 2) * z, ay = py + rnd(i, k + 7) * z;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + z * 0.05, ay - z * 0.16); ctx.stroke();
          }
        } else if (b === BIOME.DESERT || b === BIOME.BEACH) {
          if (rnd(i, 3) > 0.55) { // dune/sassolini
            ctx.strokeStyle = "rgba(150,125,80,.45)"; ctx.lineWidth = Math.max(0.6, z * 0.05);
            const ax = px + rnd(i, 4) * z, ay = py + rnd(i, 6) * z;
            ctx.beginPath(); ctx.arc(ax, ay, z * 0.18, 0.15, Math.PI - 0.15); ctx.stroke();
          }
        } else if (b === BIOME.ROCK || b === BIOME.MOUNTAIN) {
          const n = b === BIOME.MOUNTAIN ? 3 : 2;             // massi
          for (let k = 0; k < n; k++) {
            if (rnd(i, k + 11) < 0.45) continue;
            const ax = px + rnd(i, k + 12) * z, ay = py + rnd(i, k + 15) * z, r = z * (0.08 + rnd(i, k + 18) * 0.1);
            ctx.fillStyle = "rgba(120,116,110,.75)"; ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(180,178,175,.45)"; ctx.beginPath(); ctx.arc(ax - r * 0.3, ay - r * 0.3, r * 0.5, 0, Math.PI * 2); ctx.fill();
          }
        } else if (b === BIOME.SNOW) {
          if (rnd(i, 21) > 0.5) { ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.arc(px + rnd(i, 22) * z, py + rnd(i, 23) * z, z * 0.09, 0, Math.PI * 2); ctx.fill(); }
        } else if (b === BIOME.SWAMP) {
          ctx.strokeStyle = "rgba(90,120,70,.75)"; ctx.lineWidth = Math.max(0.6, z * 0.05);   // canne
          for (let k = 0; k < 3; k++) {
            const ax = px + rnd(i, k + 31) * z, ay = py + rnd(i, k + 34) * z;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + z * 0.03, ay - z * 0.3); ctx.stroke();
          }
        } else if (isWater(b)) {
          if (LOD >= 3 && rnd(i, 41) > 0.6) {                  // increspature dell'onda
            ctx.strokeStyle = "rgba(255,255,255,.16)"; ctx.lineWidth = Math.max(0.6, z * 0.05);
            const ax = px + rnd(i, 42) * z, ay = py + rnd(i, 43) * z;
            ctx.beginPath(); ctx.arc(ax, ay, z * 0.2, 0.3, Math.PI - 0.3); ctx.stroke();
          }
        }
        // acqua dolce che attraversa la terra: luccichio del fiume
        if (w.river[i] && !isWater(b) && LOD >= 3 && rnd(i, 51) > 0.5) {
          ctx.strokeStyle = "rgba(190,225,255,.35)"; ctx.lineWidth = Math.max(0.6, z * 0.06);
          ctx.beginPath(); ctx.moveTo(px + z * 0.2, py + z * 0.5); ctx.lineTo(px + z * 0.8, py + z * 0.45); ctx.stroke();
        }
      }
    }
  }

  draw() {
    if (!this.pop || !this.wr) return;
    const ctx = this.ctx, wr = this.wr, z = wr.cam.zoom, dpr = wr.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, wr.cssW, wr.cssH);
    const vp = wr.viewport; if (!vp) return;
    const S = (wx, wy) => wr.worldToScreen(wx, wy);
    const visibile = (x, y, m = 2) => x >= vp.sx - m && x <= vp.sx + vp.sw + m && y >= vp.sy - m && y <= vp.sy + vp.sh + m;
    // LIVELLI DI DETTAGLIO
    const LOD = z < 1.6 ? 0 : z < 4 ? 1 : z < 9 ? 2 : 3;
    const w = this.pop.world.width;

    // — DETTAGLIO PROCEDURALE DEL TERRENO — da vicino i tile smettono di essere quadrati piatti:
    // spuntano alberi, ciuffi d'erba, sassi, onde, canne. Le posizioni derivano da un hash del
    // tile (deterministico): i dettagli restano fermi tra un fotogramma e l'altro, non "ballano".
    if (LOD >= 2) this.dettagliTerreno(ctx, wr, vp, z, LOD);

    // — SENTIERI e CAMPI (sotto tutto) —
    if (this.pop.strade?.size && LOD >= 1) {
      ctx.fillStyle = "rgba(196,168,116,.5)";
      for (const idx of this.pop.strade) {
        const x = idx % w, y = (idx / w) | 0;
        if (!visibile(x, y)) continue;
        const [px, py] = S(x, y); ctx.fillRect(px, py, z, z);
      }
    }
    if (this.pop.campi?.size) {
      for (const [i, campo] of this.pop.campi) {
        const x = i % w, y = (i / w) | 0;
        if (!visibile(x, y)) continue;
        const [px, py] = S(x, y);
        const m = campo.crescita;
        ctx.fillStyle = `rgb(${(110 + m * 100) | 0},${(120 + m * 80) | 0},${(50 + m * 20) | 0})`;
        ctx.fillRect(px, py, z, z);
        if (LOD >= 3) { // solchi arati
          ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 1;
          for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(px, py + (z * k) / 4); ctx.lineTo(px + z, py + (z * k) / 4); ctx.stroke(); }
        }
      }
    }

    // — FUOCO —
    if (this.pop.fire?.size) {
      for (const [idx, f] of this.pop.fire) {
        const x = idx % w, y = (idx / w) | 0;
        if (!visibile(x, y)) continue;
        const [px, py] = S(x, y);
        const fl = 0.7 + Math.random() * 0.3;
        ctx.fillStyle = `rgba(255,${Math.round(70 + 120 * f * fl)},20,${0.5 + f * 0.5})`;
        ctx.fillRect(px, py, z, z);
        if (LOD >= 2) { // bagliore
          const g = ctx.createRadialGradient(px + z / 2, py + z / 2, 0, px + z / 2, py + z / 2, z * 2);
          g.addColorStop(0, "rgba(255,140,26,.5)"); g.addColorStop(1, "rgba(255,140,26,0)");
          ctx.fillStyle = g; ctx.fillRect(px - z * 1.5, py - z * 1.5, z * 4, z * 4);
        }
      }
    }

    // — CASE (con tetto quando si è vicini) —
    for (const npc of this.pop.npcs) {
      if (!npc.vivo || !npc.casa) continue;
      const [hx, hy] = npc.casa;
      if (!visibile(hx, hy)) continue;
      const [px, py] = S(hx, hy);
      const s = Math.max(2, z * (0.55 + npc.casaLivello * 0.3));
      if (LOD >= 2) {
        ctx.fillStyle = "#6b4a2f"; ctx.fillRect(px - s / 2, py - s / 2, s, s);          // corpo
        ctx.fillStyle = "#8d5a3b";                                                       // tetto
        ctx.beginPath(); ctx.moveTo(px - s * 0.62, py - s / 2); ctx.lineTo(px, py - s); ctx.lineTo(px + s * 0.62, py - s / 2); ctx.closePath(); ctx.fill();
        if (LOD >= 3 && npc.casaLivello > 1) { ctx.fillStyle = "rgba(255,220,140,.85)"; ctx.fillRect(px - s * 0.14, py - s * 0.1, s * 0.28, s * 0.3); } // finestra
      } else { ctx.fillStyle = "rgba(130,90,55,.9)"; ctx.fillRect(px - s / 2, py - s / 2, s, s); }
    }

    // — EDIFICI/ISTITUZIONI —
    for (const b of this.pop.buildings || []) {
      if (!visibile(b.x, b.y)) continue;
      const [px, py] = S(b.x, b.y);
      const s = Math.max(4, z * 2);
      ctx.fillStyle = "rgba(240,215,150,.95)"; ctx.fillRect(px - s / 2, py - s / 2, s, s);
      ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.lineWidth = 1; ctx.strokeRect(px - s / 2, py - s / 2, s, s);
      if (LOD >= 2) { ctx.font = `${Math.round(s * 0.85)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(b.icona, px, py); }
    }

    // — FAUNA —
    //
    // Il BRANCO non è un'entità del motore: è uno SGUARDO. Gli individui restano tutti quanti, con
    // i loro geni e la loro storia; è solo il disegno che, quando molti esseri simili stanno
    // stretti nello stesso posto, ne traccia uno solo col numero accanto invece di trenta puntini
    // sovrapposti che non dicono niente.
    //
    // Si raggruppa per: posto (una cella grossa), acqua o terra, e nicchia alimentare a scaglioni.
    // Due erbivori vicini fanno branco; un erbivoro e un predatore no, per quanto siano attaccati.
    // E chi si allontana esce dal branco da solo, senza che nessuno lo decida.
    const branchi = (lista) => {
      const cella = Math.max(3, 26 / Math.max(0.35, z));   // in tile: da lontano si aggrega di più
      const g = new Map();
      for (const a of lista) {
        if (!a.vivo || !visibile(a.x, a.y)) continue;
        const k = ((a.x / cella) | 0) + "," + ((a.y / cella) | 0) + ","
          + (a.dna.aquatic ? "a" : "t") + "," + ((a.dna.carnivoria * 3) | 0);
        let b = g.get(k);
        if (!b) { b = { n: 0, x: 0, y: 0, size: 0, tx: 0, ty: 0, capo: a }; g.set(k, b); }
        b.n++; b.x += a.x; b.y += a.y; b.size += a.size; b.tx += a.tx; b.ty += a.ty;
        if (a.size > b.capo.size) b.capo = a;              // il più grosso dà colore e forma
      }
      const out = [];
      for (const b of g.values()) {
        b.x /= b.n; b.y /= b.n; b.size /= b.n; b.tx /= b.n; b.ty /= b.n;
        out.push(b);
      }
      return out;
    };

    // — FAUNA — corpo ovale + testa quando si è vicini
    const disegnaFauna = (lista) => {
      for (const a of lista) {
        if (!a.vivo || !visibile(a.x, a.y)) continue;
        const [px, py] = S(a.x, a.y);
        const r = Math.max(1, z * 0.19 * (0.6 + a.size));
        ctx.fillStyle = a.colore || "#c9b98a";
        if (LOD >= 2) {
          ctx.save(); ctx.translate(px, py);
          const ang = Math.atan2(a.ty - a.y, a.tx - a.x); ctx.rotate(ang);
          ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r, 0, 0, Math.PI * 2); ctx.fill();   // corpo
          ctx.beginPath(); ctx.arc(r * 1.5, 0, r * 0.62, 0, Math.PI * 2); ctx.fill();       // testa
          if (a.dna.aquatic) { ctx.beginPath(); ctx.moveTo(-r * 1.5, 0); ctx.lineTo(-r * 2.4, -r * 0.7); ctx.lineTo(-r * 2.4, r * 0.7); ctx.closePath(); ctx.fill(); } // coda
          ctx.restore();
        } else { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); }
      }
    };
    // Da vicino si guardano uno per uno; da lontano si guardano i branchi. La soglia è la stessa
    // che regola il resto del dettaglio: quando non distingueresti comunque i corpi, non ha senso
    // disegnarli tutti sovrapposti.
    if (LOD >= 2) {
      disegnaFauna(this.pop.creature || []);
    } else {
      for (const b of branchi(this.pop.creature || [])) {
        const [px, py] = S(b.x, b.y);
        const a = b.capo;
        // Il branco si vede grosso quanto è numeroso, ma con la radice: trenta bestie non occupano
        // trenta volte lo spazio di una — stanno insieme.
        const r0 = Math.max(1, z * 0.19 * (0.6 + b.size));
        const rr = Math.max(1.6, r0 * Math.min(3.4, Math.sqrt(b.n)) * 1.45);
        ctx.fillStyle = a.colore || "#c9b98a";
        ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
        if (b.n > 1) {
          // un alone appena accennato per dire «qui sono in tanti», e il numero se c'è spazio
          ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(px, py, rr + 2, 0, Math.PI * 2); ctx.stroke();
          if (rr > 3.4) {
            ctx.fillStyle = "rgba(255,255,255,.8)";
            ctx.font = `${Math.max(8, Math.round(rr * 0.9))}px system-ui, sans-serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(b.n, px, py);
          }
        }
      }
    }

    // — UMANI — il cuore della scena: forma, ruolo e stato leggibili
    for (const npc of this.pop.npcs) {
      if (!npc.vivo || !visibile(npc.x, npc.y)) continue;
      const [px, py] = S(npc.x, npc.y);
      const bimbo = npc.eta < 14;
      const r = Math.max(1.3, z * (bimbo ? 0.22 : 0.32));
      if (LOD >= 2) {
        ctx.fillStyle = "rgba(0,0,0,.22)";                                   // ombra
        ctx.beginPath(); ctx.ellipse(px, py + r * 1.1, r * 1.1, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        // corpo e testa, con contorno scuro: la figura umana resta leggibile su qualunque fondo
        ctx.strokeStyle = "rgba(20,14,10,.65)"; ctx.lineWidth = Math.max(0.7, z * 0.05);
        ctx.fillStyle = wr.view === "attivita" ? COLORE_ATT(npc._att) : npc.color;
        ctx.beginPath(); ctx.moveTo(px, py - r * 1.4); ctx.lineTo(px + r * 0.85, py + r); ctx.lineTo(px - r * 0.85, py + r); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(px, py - r * 1.7, r * 0.72, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = wr.view === "attivita" ? COLORE_ATT(npc._att) : npc.color;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
      // ANELLO DELL'ATTIVITÀ: dice cosa sta facendo adesso. La malattia ha la precedenza (è la
      // cosa più urgente da vedere), poi ciò che l'essere sta effettivamente facendo.
      let anello = null;
      if (npc.infetto != null) anello = "#ff2fd0";
      else if (npc._att) anello = COLORE_ATT(npc._att);
      else if (npc.ribelle) anello = "#ff8c1a";
      else if (npc.immune && LOD >= 2) anello = "rgba(60,220,220,.75)";
      if (anello) { ctx.strokeStyle = anello; ctx.lineWidth = Math.max(0.8, z * 0.09); ctx.beginPath(); ctx.arc(px, py - (LOD >= 2 ? r * 0.6 : 0), r * 1.9, 0, Math.PI * 2); ctx.stroke(); }
      // Icona del mestiere e barra della salute solo molto da vicino
      if (LOD >= 3) {
        const ico = { guaritore: "✚", cacciatore: "🏹", costruttore: "🔨", inventore: "✦", agricoltore: "🌾", raccoglitore: "" }[npc.mestiere];
        if (ico) { ctx.font = `${Math.round(z * 0.5)}px serif`; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillText(ico, px, py - r * 3); }
        if (npc.salute < 0.85) {
          const bw = r * 2.4;
          ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(px - bw / 2, py + r * 1.8, bw, Math.max(1, z * 0.09));
          ctx.fillStyle = npc.salute > 0.5 ? "#4caf6a" : "#d9534f";
          ctx.fillRect(px - bw / 2, py + r * 1.8, bw * npc.salute, Math.max(1, z * 0.09));
        }
      }
    }

    // — CONFINI DEI POPOLI — Il territorio è una CONSEGUENZA delle persone, non un poligono
    // disegnato: qui si traccia il bordo delle celle dove l'influenza cambia padrone. I confini
    // possono quindi essere frastagliati, discontinui (isole, enclavi) e cambiare di continuo.
    if (this.pop.terrCell && this.pop.factions?.length) {
      const TS = this.pop.terrSize, TW = this.pop.terrW, TH = this.pop.terrH;
      const cella = this.pop.terrCell;
      const colori = new Map(this.pop.factions.map((f) => [f.id, f.colore]));
      ctx.lineWidth = Math.max(1.5, Math.min(4, z * 0.5));
      ctx.lineCap = "round";
      for (let cy = 0; cy < TH; cy++) {
        for (let cx = 0; cx < TW; cx++) {
          const own = cella[cy * TW + cx];
          if (own < 0) continue;
          const col = colori.get(own); if (!col) continue;
          const wx = cx * TS, wy = cy * TS;
          if (!visibile(wx, wy, TS * 2)) continue;
          const [px, py] = S(wx, wy), lato = TS * z;
          ctx.strokeStyle = col;
          ctx.beginPath();
          // disegna solo i lati che confinano con un padrone DIVERSO (o col nulla)
          if (cy === 0 || cella[(cy - 1) * TW + cx] !== own) { ctx.moveTo(px, py); ctx.lineTo(px + lato, py); }
          if (cy === TH - 1 || cella[(cy + 1) * TW + cx] !== own) { ctx.moveTo(px, py + lato); ctx.lineTo(px + lato, py + lato); }
          if (cx === 0 || cella[cy * TW + cx - 1] !== own) { ctx.moveTo(px, py); ctx.lineTo(px, py + lato); }
          if (cx === TW - 1 || cella[cy * TW + cx + 1] !== own) { ctx.moveTo(px + lato, py); ctx.lineTo(px + lato, py + lato); }
          ctx.stroke();
          // velo tenue all'interno del territorio, per leggere l'estensione a colpo d'occhio
          if (wr.view !== "territorio") {
            ctx.fillStyle = col.replace("hsl", "hsla").replace("55%)", "55%,0.09)");
            ctx.fillRect(px, py, lato, lato);
          }
        }
      }
    }

    // — CAPI, CAPITALI, NOMI DEI POPOLI —
    if (this.pop.factions?.length) {
      for (const f of this.pop.factions) {
        if (!visibile(f.x, f.y, 40)) continue;
        const [cx, cy] = S(f.x, f.y);
        // capitale
        if (f.capX != null && visibile(f.capX, f.capY, 10)) {
          const [kx, ky] = S(f.capX, f.capY);
          ctx.fillStyle = "#ffd24a"; ctx.font = `${Math.max(10, z * 1.6)}px serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("★", kx, ky);
        }
        // corona sul leader
        if (visibile(f.lx, f.ly, 4)) {
          const [lx, ly] = S(f.lx, f.ly);
          const rr = Math.max(2, z * 0.34);
          ctx.strokeStyle = "#ffe08a"; ctx.lineWidth = Math.max(1, z * 0.1);
          ctx.beginPath(); ctx.arc(lx, ly - (LOD >= 2 ? rr : 0), rr * 2.3, 0, Math.PI * 2); ctx.stroke();
          if (LOD >= 2) { ctx.fillStyle = "#ffe08a"; ctx.font = `${Math.max(8, z * 0.9)}px serif`; ctx.textAlign = "center"; ctx.fillText("♔", lx, ly - rr * 3.2); }
        }
        // nome del popolo (con alone scuro per leggibilità)
        const label = `${f.nome} · ${f.membri}`;
        const fs = Math.max(10, Math.min(18, 7 + z));
        ctx.font = `600 ${fs}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        const rad = Math.max(12, Math.sqrt(f.membri) * z * 0.55);
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.75)"; ctx.strokeText(label, cx, cy - rad);
        ctx.fillStyle = f.colore; ctx.fillText(label, cx, cy - rad);
      }
    }

    // — LA GUERRA SI VEDE — Due segni distinti: il FRONTE (una linea rossa pulsante fra due
    // popoli in guerra, per capire chi sta combattendo contro chi) e gli SCONTRI (lampi nei punti
    // dove è appena avvenuto un fatto d'arme, rossi se qualcuno ci ha lasciato la vita).
    if (this.pop.fronti?.length) {
      const puls = 0.5 + 0.5 * Math.sin(performance.now() / 260);
      for (const fr of this.pop.fronti) {
        if (!visibile(fr.ax, fr.ay, 120) && !visibile(fr.bx, fr.by, 120)) continue;
        const [ax, ay] = S(fr.ax, fr.ay), [bx, by] = S(fr.bx, fr.by);
        ctx.strokeStyle = `rgba(255,60,45,${0.25 + puls * 0.45})`;
        ctx.lineWidth = 1.5 + fr.intensita * 2.5;
        ctx.setLineDash([9, 7]); ctx.lineDashOffset = -(performance.now() / 45) % 16;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ctx.setLineDash([]);
        // spadine sul punto medio
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        ctx.font = `${Math.max(13, z * 1.6)}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = `rgba(255,90,70,${0.6 + puls * 0.4})`;
        ctx.fillText("⚔", mx, my);
      }
    }
    if (this.pop.scontri?.length) {
      const ora = this.pop.anno;
      for (const sc of this.pop.scontri) {
        const eta = ora - sc.t;
        if (eta > 2.5 || !visibile(sc.x, sc.y, 3)) continue;
        const a = Math.max(0, 1 - eta / 2.5);
        const [sx2, sy2] = S(sc.x, sc.y);
        const rr = Math.max(4, z * (sc.mortale ? 1.1 : 0.7)) * (1 + (1 - a) * 1.6);
        const g = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, rr);
        g.addColorStop(0, `rgba(255,${sc.mortale ? 40 : 150},40,${a * 0.9})`);
        g.addColorStop(1, "rgba(255,80,40,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx2, sy2, rr, 0, Math.PI * 2); ctx.fill();
        if (sc.mortale && LOD >= 2) {
          ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.font = `${Math.max(9, z)}px serif`;
          ctx.textAlign = "center"; ctx.fillText("✚", sx2, sy2 - rr);
        }
      }
    }

    // — SELEZIONE —
    if (this.selected && this.selected.o.vivo) {
      const o = this.selected.o;
      const [px, py] = S(o.x, o.y);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(px, py, Math.max(8, z * 0.9), 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      // linea verso l'obiettivo dell'ordine
      if (o._ordine && o._ordine.x != null) {
        const [tx, ty] = S(o._ordine.x, o._ordine.y);
        ctx.strokeStyle = "rgba(111,211,255,.75)"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // — LUCE DEL GIORNO — Il ciclo giorno/notte, per essere VISTO, non può essere un interruttore:
    // a velocità alta la simulazione attraversa decine di giorni al secondo e il mondo lampeggerebbe.
    // Quindi la luce viene INSEGUITA con un rate limitato in tempo REALE: se il ciclo è più veloce
    // di quanto l'occhio possa seguire, il velo si assesta su una penombra media invece di sfarfallare.
    const oraReale = performance.now();
    const dtReale = Math.min(0.2, (oraReale - (this._tPrec || oraReale)) / 1000);
    this._tPrec = oraReale;
    const luceObiettivo = this.pop.luce != null ? this.pop.luce : (this.pop.notte ? 0 : 1);
    if (this._luce == null) { this._luce = luceObiettivo; this._oraPrec = this.pop.ora; }

    // Quanto in fretta scorre il giorno, misurato in cicli al SECONDO REALE. È questo che decide
    // se l'occhio può seguire l'alternanza o se vedrebbe solo uno sfarfallio.
    let d = Math.abs((this.pop.ora ?? 0) - (this._oraPrec ?? 0));
    if (d > 0.5) d = 1 - d;                       // il contatore si è azzerato a mezzanotte
    this._oraPrec = this.pop.ora;
    const cicliAlSec = dtReale > 0 ? d / dtReale : 0;
    this._cicliSec = (this._cicliSec || 0) * 0.9 + cicliAlSec * 0.1;   // media mobile

    // AMPIEZZA ADATTIVA: se il giorno dura abbastanza (sotto ~0.6 cicli al secondo) si mostra il
    // ciclo pieno, dal buio della notte alla luce del mezzogiorno. Se invece la simulazione corre
    // e il sole sorge e tramonta decine di volte al secondo, l'escursione viene COMPRESSA verso una
    // penombra media: si perde il dettaglio, ma il mondo non lampeggia. È l'unico compromesso
    // possibile fra una scala di anni-al-secondo e un fenomeno che dura un giorno.
    const ampiezza = Math.max(0, Math.min(1, 1 - (this._cicliSec - 0.25) / 1.2));
    const target = 1 - (1 - luceObiettivo) * ampiezza;
    // insegue rapidamente quando il ciclo è lento (transizioni nitide), piano quando è veloce
    const passo = Math.min(1, dtReale * (3 + this._cicliSec * 4));
    this._luce += (target - this._luce) * passo;
    const L = this._luce;
    if (L < 0.995) {
      const buio = (1 - L) * (this.pop.eclissi > 0 ? 0.7 : 0.5);
      // di notte il blu profondo, all'alba/tramonto una luce calda radente
      const caldo = this.pop.crepuscolo ? Math.min(1, (1 - Math.abs(L - 0.5) * 2)) : 0;
      const g = ctx.createLinearGradient(0, 0, 0, wr.cssH);
      g.addColorStop(0, `rgba(${10 + caldo * 90 | 0},${16 + caldo * 40 | 0},${40 + caldo * 10 | 0},${buio})`);
      g.addColorStop(1, `rgba(${6 + caldo * 60 | 0},${10 + caldo * 20 | 0},${34},${buio * 1.06})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, wr.cssW, wr.cssH);
    }
  }
}
