import { P } from "./params.js";
// Edifici/istituzioni costruiti dagli NPC fondendo invenzioni. Ogni edificio dà un
// EFFETTO D'AREA agli NPC vicini. Emergono dall'iniziativa degli NPC, non sono piazzati
// da noi. Effetti derivati dal tipo (che a sua volta emerge dagli attributi fusi).
// Quanto sta largo un edificio: sotto questa distanza si darebbero fastidio. È la sola cosa che
// limita quanti se ne possono fare.
const DISTANZA_MINIMA = 9;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function makeBuilding(x, y, progetto, autore) {
  return {
    x, y, tipo: progetto.tipo, icona: progetto.icona, effetto: progetto.effetto,
    nome: progetto.nome, colore: progetto.colore, raggio: 22, autore, eta: 0,
  };
}

// Si può costruire QUI? Non «ne abbiamo già troppi», ma «questo posto è libero». Il numero che il
// mondo regge non lo scrive nessuno: viene fuori da quanta terra c'è.
export function canBuild(pop, x, y) {
  if (x === undefined) return true;               // domanda generica: sì, se c'è spazio da qualche parte
  const d2 = DISTANZA_MINIMA * DISTANZA_MINIMA;
  for (const e of pop.buildings) {
    if ((e.x - x) ** 2 + (e.y - y) ** 2 < d2) return false;
  }
  // e un tetto larghissimo che non è una regola ma un salvagente: se un mondo arrivasse a decine di
  // migliaia di edifici sarebbe rotto qualcos'altro, non questo.
  return pop.buildings.length < 20000;
}

// Applica gli effetti di tutti gli edifici agli NPC (e al mondo) nel loro raggio.
export function stepBuildings(pop, dt) {
  if (!pop.buildings || !pop.buildings.length) return;
  for (const b of pop.buildings) {
    b.eta += dt;
    const r2 = b.raggio * b.raggio;
    // Granaio: fa crescere la vegetazione intorno (deposito/coltivazione).
    if (b.effetto === "cibo") {
      const cx = b.x | 0, cy = b.y | 0, R = 6, w = pop.world.width;
      for (let y = Math.max(0, cy - R); y <= Math.min(pop.world.height - 1, cy + R); y++)
        for (let x = Math.max(0, cx - R); x <= Math.min(w - 1, cx + R); x++) {
          const i = y * w + x; const cap = pop.foodCap[i];
          if (cap > 0) pop.food[i] = Math.min(1, pop.food[i] + 0.4 * dt);
        }
    }
    for (const npc of pop.npcs) {
      if (!npc.vivo) continue;
      if ((npc.x - b.x) ** 2 + (npc.y - b.y) ** 2 > r2) continue;
      switch (b.effetto) {
        case "cura":   npc.salute = Math.min(1, npc.salute + 0.06 * dt); if (npc.infetto != null && pop.rng() < 0.05 * dt) { npc.infetto = null; npc.immune = true; } break;
        case "cibo":   npc.fame = Math.max(0, npc.fame - 0.05 * dt); break;
        case "morale": npc.emo.gioia = clamp01(npc.emo.gioia + 0.05 * dt); npc.emo.lealta = clamp01(npc.emo.lealta + 0.06 * dt); npc.emo.paura = clamp01(npc.emo.paura - 0.04 * dt); break;
        case "difesa": npc.emo.paura = clamp01(npc.emo.paura - 0.06 * dt); npc._difeso = true; break;
        case "ingegno": npc._officina = true; break;
        default: break;
      }
    }
  }
}

// Conteggio per tipo, per le statistiche.
export function buildingCounts(pop) {
  const c = {};
  for (const b of pop.buildings || []) c[b.tipo] = (c[b.tipo] || 0) + 1;
  return c;
}
