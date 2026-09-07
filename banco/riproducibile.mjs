// Lo stesso seme dà lo stesso mondo? Senza questo, nessun confronto vale niente.
import { corri } from "./sim.mjs";

const impronta = (pop) => {
  const vivi = pop.npcs.filter((n) => n.vivo);
  const somma = (f) => +vivi.reduce((s, n) => s + f(n), 0).toFixed(4);
  return {
    vivi: vivi.length, anno: pop.anno | 0, nascite: pop.nascite, morti: pop.morti,
    bestie: pop.creature.filter((a) => a.vivo).length,
    sommaX: somma((n) => n.x), sommaFame: somma((n) => n.fame),
    sommaLingua: somma((n) => n.lingua), sommaSalute: somma((n) => n.salute),
    razzie: pop.razzieTot || 0, materie: pop.registry.materials.length,
  };
};

const a = impronta((await corri("stessoSeme", 61, 420)).pop);
const b = impronta((await corri("stessoSeme", 61, 420)).pop);
const c = impronta((await corri("altroSeme", 61, 420)).pop);

const uguali = JSON.stringify(a) === JSON.stringify(b);
console.log("stesso seme, due volte:", uguali ? "IDENTICI ✓" : "DIVERSI ✗");
if (!uguali) {
  for (const k of Object.keys(a)) if (a[k] !== b[k]) console.log("  differisce:", k, a[k], "vs", b[k]);
}
console.log("seme diverso:", JSON.stringify(a) === JSON.stringify(c) ? "identico (sospetto!)" : "diverso ✓");
console.log("\nimpronta:", JSON.stringify(a));
