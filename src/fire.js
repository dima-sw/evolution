// FUOCO SIMULATO — non è un oggetto: è una simulazione.
// Il fuoco vive sulla griglia: ha intensità, consuma il COMBUSTIBILE (la vegetazione),
// si PROPAGA ai tile vicini (più in fretta d'estate), DANNEGGIA esseri e animali,
// e quando si spegne lascia una CICATRICE (inquinamento -> fertilità ridotta).
// Si innesca da solo (fulmini estivi) o dagli esperimenti esplosivi degli NPC.
import { isWater } from "./world.js";

// Accende un fuoco in un tile (se è terra con un minimo di combustibile).
export function igniteFire(pop, idx, intensity = 0.5) {
  if (isWater(pop.world.biome[idx])) return false;
  if (pop.food[idx] < 0.1 && intensity < 0.7) return false; // niente da bruciare
  const cur = pop.fire.get(idx) || 0;
  pop.fire.set(idx, Math.min(1, Math.max(cur, intensity)));
  return true;
}

export function stepFire(pop, dt) {
  const w = pop.world.width, h = pop.world.height;

  // FULMINI: d'estate un fulmine può incendiare la vegetazione secca.
  if (pop.stagione === "Estate" && pop.rng() < dt * 0.10) {
    for (let tries = 0; tries < 12; tries++) {
      const idx = (pop.rng() * pop.food.length) | 0;
      if (!isWater(pop.world.biome[idx]) && pop.food[idx] > 0.5) {
        if (igniteFire(pop, idx, 0.5)) { pop.roghiTot = (pop.roghiTot || 0) + 1; break; }
      }
    }
  }

  if (!pop.fire.size) return;

  // Propagazione più aggressiva d'estate (secco), quasi nulla d'inverno (neve/umido).
  const spreadMult = { Primavera: 0.8, Estate: 1.6, Autunno: 0.9, Inverno: 0.3 }[pop.stagione] || 1;

  const updates = [];
  for (const [idx, f] of pop.fire) {
    const fuel = pop.food[idx];
    // Consuma il combustibile e cicatrizza il terreno.
    const burn = Math.min(fuel, dt * 1.4 * f);
    if (burn > 0) pop.food[idx] = fuel - burn;
    pop.pollution[idx] = Math.min(1, pop.pollution[idx] + dt * 0.12 * f);

    // Intensità: cresce finché c'è combustibile, poi muore. La PIOGGIA lo spegne.
    let nf = fuel > 0.06 ? Math.min(1, f + dt * 0.9) : f - dt * 1.6;
    if (pop.pioggia) nf -= dt * 2.4;

    // Propagazione ai 4 vicini con combustibile.
    if (nf > 0.25 && pop.rng() < nf * spreadMult * dt * 2.2) {
      const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][(pop.rng() * 4) | 0];
      const nx = (idx % w) + dir[0], ny = ((idx / w) | 0) + dir[1];
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) {
        const ni = ny * w + nx;
        if (!pop.fire.has(ni) && !isWater(pop.world.biome[ni]) && pop.food[ni] > 0.15) updates.push([ni, 0.35]);
      }
    }
    updates.push([idx, nf]);
  }
  for (const [idx, f] of updates) {
    if (f <= 0) pop.fire.delete(idx);
    else pop.fire.set(idx, f);
  }

  // Il fuoco FA MALE: umani e animali sui tile in fiamme si ustionano o muoiono.
  for (const npc of pop.npcs) {
    if (!npc.vivo) continue;
    const f = pop.fire.get(pop.tileIdx(npc.x, npc.y));
    if (f) {
      npc.salute -= dt * f * 1.6;
      npc.emo.paura = Math.min(1, npc.emo.paura + 0.5);
      // Fuggi dal fuoco: scatto in direzione casuale.
      const a = pop.rng() * Math.PI * 2;
      const nx = npc.x + Math.cos(a) * 2, ny = npc.y + Math.sin(a) * 2;
      if (pop.walkable(nx, ny)) { npc.x = nx; npc.y = ny; }
      if (npc.salute <= 0) { npc.vivo = false; pop.morti++; pop.mortiFuoco = (pop.mortiFuoco || 0) + 1; }
    }
  }
  const burnAnimals = (list) => {
    for (const a of list) {
      if (!a.vivo) continue;
      const f = pop.fire.get(pop.tileIdx(a.x, a.y));
      if (f && pop.rng() < f * dt * 2.5) a.vivo = false;
    }
  };
  burnAnimals(pop.creature || []);

  // Cronaca dei grandi incendi.
  if (pop.fire.size > 40) pop.chronicle("Un grande incendio devasta le terre", 15);
}
