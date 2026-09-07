// PERCHÉ UNA BESTIA COSTA DIECI VOLTE TANTO QUANDO LA GENTE CRESCE.
//
// Il profilo dice una cosa che non torna: il costo PER BESTIA passa da 0,87 a 8,80 µs mentre le
// bestie DIMINUISCONO (26 103 → 16 921). Quel che cresce nel frattempo è la gente (3 081 → 5 845).
// Quindi dentro il passo di una bestia c'è qualcosa che scala con gli umani.
//
// Due ipotesi già cadute, misurate e archiviate:
//   • i cadaveri nell'array — sono lo 0,4-0,7%, e a fine partita zero;
//   • le chiavi-stringa della griglia — costano uguale a qualunque popolazione.
//
// La terza: la gente SPOGLIA LA VEGETAZIONE, quindi le bestie non trovano più da mangiare e
// rifanno la ricerca a ogni turno invece che una volta ogni tanto. Sarebbe un costo che nasce dal
// mondo e non dal codice — e allora non è un difetto da ottimizzare, è una carestia che si vede
// nel profilo.
//
// uso: node banco/perche_la_fauna_rallenta.mjs [seed]
import { corri } from "./sim.mjs";
const B = "../src/";
const { Population } = await import(B + "npc.js");
const { stepEcosystem } = await import(B + "animals.js");

const SEME = process.argv[2] || "scala";
const vero = Population.prototype.bestCell;
const c = { chiamate: 0, nulle: 0, tile: 0 };
Population.prototype.bestCell = function (grid, cx, cy, R, minV = 0.15) {
  const r = vero.call(this, grid, cx, cy, R, minV);
  c.chiamate++; if (!r) c.nulle++;
  c.tile += (2 * R + 1) * (2 * R + 1);
  return r;
};

console.log("tick   gente   bestie   vegetazione   ricerche/battito   per bestia   a vuoto");
for (const tick of [300, 500, 700, 900]) {
  const { pop } = await corri(SEME, 58, tick);
  const bestie = pop.creature.filter((a) => a.vivo).length;
  const gente = pop.npcs.filter((n) => n.vivo).length;
  // quanto verde c'è: è la variabile che lega la gente alle bestie
  let veg = 0;
  for (let i = 0; i < pop.food.length; i++) veg += pop.food[i];
  c.chiamate = 0; c.nulle = 0; c.tile = 0;
  const BATTITI = 24;
  for (let t = 0; t < BATTITI; t++) stepEcosystem(pop, 0.165);
  const perBattito = c.chiamate / BATTITI;
  console.log(
    String(tick).padStart(4) + String(gente).padStart(8) + String(bestie).padStart(9) +
    veg.toFixed(0).padStart(14) + perBattito.toFixed(0).padStart(19) +
    (perBattito / Math.max(1, bestie)).toFixed(3).padStart(13) +
    ((c.nulle * 100 / Math.max(1, c.chiamate)).toFixed(1) + "%").padStart(10));
}
console.log("\nSe «per bestia» sale mentre le bestie calano, la ricerca del cibo si ripete perché");
console.log("non trova: e allora il costo non e' del codice, e' del mondo che si e' spogliato.");
