// Le chiavi di aiStati combaciano con gli id delle fazioni, un battito dopo?
import { corri } from "./sim.mjs";
const B = "../src/";
const { stepAI } = await import(B + "ai.js");
const { updateFactions } = await import(B + "factions.js");
const { pop } = await corri(process.argv[2] || "menti", 58, +(process.argv[3] || 420));
stepAI(pop, 0.4);
const chiavi = [...(pop.aiStati || new Map()).keys()];
const idsOra = new Set((pop.factions || []).map((f) => f.id));
const combacianoOra = chiavi.filter((k) => idsOra.has(k)).length;
updateFactions(pop);
const idsDopo = new Set((pop.factions || []).map((f) => f.id));
const combacianoDopo = chiavi.filter((k) => idsDopo.has(k)).length;
console.log(JSON.stringify({
  governi: chiavi.length, fazioni: (pop.factions || []).length,
  "chiavi che combaciano ADESSO": combacianoOra,
  "chiavi che combaciano dopo un updateFactions": combacianoDopo,
  "esempio chiave": chiavi[0], "esempio id fazione": (pop.factions || [])[0] ? (pop.factions||[])[0].id : null,
}, null, 1));
