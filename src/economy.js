import { valuta, sapore, brama, raro, splendoreDi } from "./desire.js";
import { perizia } from "./skill.js";
import { physiology } from "./chemistry.js";
import { propensione } from "./experience.js";
// ECONOMIA EMERGENTE — valore SOGGETTIVO, baratto e denaro che nasce da solo.
// Niente prezzi scritti, niente «oro = soldi». Il valore di una cosa dipende da quanto
// SERVE a quel NPC in quel momento e da quanta ne ha già (utilità marginale). Il denaro
// EMERGE: il materiale non deperibile più accettato negli scambi diventa moneta.

// Quanto vale una cosa per questo qui, adesso. Non è un prezzo: è la stessa voglia che lo guida a
// tavola e quando si sceglie di che tirare su la casa — con in più le due cose che contano solo
// quando si tratta con un altro: che serva a lavorare, e che sia moneta.
export function desiderabilita(npc, mat, qty, moneta, pop) {
  const ph = physiology(mat.props);
  const chiave = "m" + mat.id;
  let util = valuta(npc, {
    id: chiave, nutre: ph.nutrimento, cura: ph.beneficio, nuoce: ph.danno,
    gusto: sapore(mat.props),
    raro: pop ? raro(pop, mat.id) : 0,
    bramato: pop ? brama(pop, mat.id) : 0,
    fatica: 0,                                    // in uno scambio la fatica l'ha già fatta un altro
  }, propensione(npc, chiave));
  util += (mat.props.durezza || 0) * 0.3 * (1 - npc.strumento);  // serve a lavorare, se non hai attrezzi
  // Chi ha trattato mille volte sa quel che ha in mano: sopravvaluta meno il proprio e riconosce
  // meglio il valore dell'altrui. Da qui il mercante di lungo corso spunta scambi migliori.
  util *= 1 + perizia(npc, "commercio") * 0.35;
  if (moneta && mat.id === moneta) util += 0.6;   // la moneta la vogliono tutti perché tutti la vogliono
  return Math.max(0, util + 0.15) / (1 + qty * 0.5);             // utilità marginale decrescente
}

// Prova uno scambio 1:1 tra a e b: avviene solo se ENTRAMBI ci guadagnano (desiderabilità).
export function tentaBaratto(pop, a, b) {
  const reg = pop.registry, moneta = pop.moneta;
  const matOf = (id) => reg.mat(id);
  let bestGain = 0.1, give = null, get = null;
  for (const [idA, qA] of a.inventory) {
    if (qA <= 0) continue; const mA = matOf(idA); if (!mA) continue;
    const dA_own = desiderabilita(a, mA, qA, moneta, pop);        // quanto A tiene a ciò che darebbe
    const dB_get = desiderabilita(b, mA, b.inventory.get(idA) || 0, moneta, pop); // quanto B lo vuole
    if (dB_get - dA_own <= 0) continue;
    for (const [idB, qB] of b.inventory) {
      if (qB <= 0 || idB === idA) continue; const mB = matOf(idB); if (!mB) continue;
      const dB_own = desiderabilita(b, mB, qB, moneta, pop);
      const dA_get = desiderabilita(a, mB, a.inventory.get(idB) || 0, moneta, pop);
      const gainA = dA_get - dA_own, gainB = dB_get - dB_own;
      if (gainA > 0.05 && gainB > 0.05 && gainA + gainB > bestGain) { bestGain = gainA + gainB; give = idA; get = idB; }
    }
  }
  if (give == null) return false;
  a.inventory.set(give, a.inventory.get(give) - 1); b.addMat(give, 1);
  b.inventory.set(get, b.inventory.get(get) - 1); a.addMat(get, 1);
  pop.baratti = (pop.baratti || 0) + 1;
  // I materiali NON DEPERIBILI scambiati costruiscono la loro "accettazione" -> candidati moneta.
  for (const id of [give, get]) { const m = matOf(id); if (m && m.deperibilita < 0.1) pop.accettazioni.set(id, (pop.accettazioni.get(id) || 0) + 1); }
  return true;
}

const RARITA = { comune: 0.2, frequente: 0.4, raro: 0.75, rarissimo: 1 };
// Idoneità di un materiale a fare da moneta: NON deperibile + RARO + di VALORE (+ divisibile).
function monetarieta(m) {
  return (1 - m.deperibilita) * (0.3 + splendoreDi(m) * 0.7) * (0.3 + (RARITA[m.rarita] || 0.4) * 0.7);
}

// Il DENARO emerge: vince il materiale più accettato PESATO per la sua idoneità monetaria.
// Così non diventa moneta l'argilla comune, ma qualcosa di raro, prezioso e duraturo.
export function updateMoneta(pop) {
  if (!pop.accettazioni) return;
  let best = null, bv = 8;
  for (const [id, c] of pop.accettazioni) {
    const m = pop.registry.mat(id); if (!m) continue;
    const score = c * monetarieta(m);
    if (score > bv) { bv = score; best = id; }
  }
  if (best == null || best === pop.moneta) return;
  // ISTERESI: una nuova moneta subentra solo se supera NETTAMENTE quella in carica,
  // altrimenti la moneta stabilita resta (evita oscillazioni continue).
  if (pop.moneta != null) {
    const cur = pop.registry.mat(pop.moneta);
    if (cur) { const curScore = (pop.accettazioni.get(pop.moneta) || 0) * monetarieta(cur); if (bv < curScore * 1.35) return; }
  }
  pop.moneta = best;
  const m = pop.registry.mat(best);
  if (pop.chronicle && m) pop.chronicle(`Nasce il denaro: il ${m.nome} viene accettato come moneta di scambio`);
}
