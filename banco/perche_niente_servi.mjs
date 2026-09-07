// PERCHÉ NON NASCE MAI IL LAVORO FORZATO.
//
// Il motore sa fare la sottomissione: un forte con roba in mano prende un debole affamato e senza
// niente, e da lì potrebbe nascere il lavoro forzato. Su otto semi diversi non succede mai —
// `costretti: 0`, `servi: 0`. Una legge scritta che non produce niente.
//
// Le condizioni sono cinque, in AND. Contarle insieme dice solo che il totale è zero; contarle
// UNA PER UNA dice quale non si avvera mai. È l'unico modo di sapere se la soglia è troppo alta o
// se è il mondo a non produrre quella condizione.
//
// uso: node banco/perche_niente_servi.mjs [seed] [tick]
import { corri } from "./sim.mjs";
const B = "../src/";
const { P } = await import(B + "params.js");

const { pop } = await corri(process.argv[2] || "scala", 58, +(process.argv[3] || 420));
const vivi = pop.npcs.filter((n) => n.vivo);
console.log("gente " + vivi.length + "\n");

const q = (etichetta, quanti) =>
  console.log("  " + etichetta.padEnd(46) + String(quanti).padStart(6) +
    "  " + (quanti * 100 / vivi.length).toFixed(1) + "%");

console.log("CHI POTREBBE SOTTOMETTERE");
const ricchi = vivi.filter((n) => n.inventory.size >= 4);
q("ha almeno 4 cose in mano", ricchi.length);
const dom = (n) => n.aggressivita * 0.4 + n.avidita * 0.4 + (n.crudelta || 0.3) * 0.4 - n.empatia * 0.5;
q("...ed è un dominatore (>0,4)", ricchi.filter((n) => dom(n) >= 0.4).length);

console.log("\nCHI POTREBBE ESSERE SOTTOMESSO — una condizione alla volta");
q("non ha NIENTE in mano", vivi.filter((n) => n.inventory.size === 0).length);
q("ha molta fame (>0,7)", vivi.filter((n) => n.fame > 0.7).length);
q("ha poco coraggio (<0,5)", vivi.filter((n) => n.coraggio < 0.5).length);
q("non ha già un padrone", vivi.filter((n) => !n._padrone).length);

console.log("\n...e ora in AND, aggiungendone una alla volta");
let c = vivi.filter((n) => n.inventory.size === 0);
q("niente in mano", c.length);
c = c.filter((n) => n.fame > 0.7);
q("+ molta fame", c.length);
c = c.filter((n) => n.coraggio < 0.5);
q("+ poco coraggio", c.length);
c = c.filter((n) => !n._padrone);
q("+ senza padrone", c.length);

// l'ultima condizione è di COPPIA: il debole dev'essere più debole di chi lo prende, e devono
// essere vicini. Non si può contarla su una persona sola.
console.log("\nE L'ULTIMA È DI COPPIA: `altro.forza < npc.forza`, e devono essere VICINI");
const forti = ricchi.filter((n) => dom(n) >= 0.4);
let coppie = 0, vicinanze = 0;
for (const n of forti) {
  for (const altro of pop.vicini(n.x, n.y, 10)) {
    if (altro === n || !altro.vivo) continue;
    if (altro.inventory.size !== 0 || !(altro.fame > 0.7) || !(altro.coraggio < 0.5) || altro._padrone) continue;
    vicinanze++;
    if (altro.forza < n.forza) coppie++;
  }
}
console.log("  candidati deboli trovati vicino a un dominatore: " + vicinanze);
console.log("  ...di cui anche più deboli di lui:               " + coppie);

// Le distribuzioni, per capire DOVE sta il muro invece che quanto è alto.
const perc = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, (s.length * p) | 0)]; };
const fami = vivi.map((n) => n.fame), cor = vivi.map((n) => n.coraggio), inv = vivi.map((n) => n.inventory.size);
console.log("\nCOM'È FATTA QUESTA GENTE (percentili)");
for (const [nome, a, d] of [["fame", fami, 3], ["coraggio", cor, 3], ["cose in mano", inv, 0]])
  console.log("  " + nome.padEnd(14) + [0.05, 0.25, 0.5, 0.75, 0.95, 0.99].map((p) =>
    perc(a, p).toFixed(d).padStart(7)).join("") + "     (5·25·50·75·95·99)");
console.log("\n  soglia della fame per la sottomissione: 0,7 · per il dono: 0,6");
console.log("  probCoercizione: " + P.probCoercizione + " · probDono: " + P.probDono);
