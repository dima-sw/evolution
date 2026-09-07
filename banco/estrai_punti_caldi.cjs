// Estrae i punti caldi veri nel file da passare ad altre AI. Prende il codice DAL SORGENTE, così
// non c'è rischio che diverga da quello che gira davvero.
const fs = require("fs");
const S = __dirname + "/../src/";

function blocco(file, daRiga, aRiga) {
  const righe = fs.readFileSync(S + file, "utf8").replace(/\r\n/g, "\n").split("\n");
  return righe.slice(daRiga - 1, aRiga).map((l, i) => String(daRiga + i).padStart(4) + " | " + l).join("\n");
}
function trova(file, ago, quante) {
  const righe = fs.readFileSync(S + file, "utf8").replace(/\r\n/g, "\n").split("\n");
  const i = righe.findIndex((l) => l.includes(ago));
  if (i < 0) throw new Error("non trovato in " + file + ": " + ago);
  return blocco(file, i + 1, i + quante);
}
const pezzi = {
  fazioniAdiacenza: trova("factions.js", "const adj = new Map();", 46),
  fazioniPolity: trova("factions.js", "const candidati = membri.slice()", 40),
  societaVicini: trova("society.js", "export function stepSocietyAdvanced", 24),
  societaChiamanti: trova("society.js", "function educazione(pop, dt, vicini)", 22),
  faunaCreatura: trova("animals.js", "function stepCreatura(pop, a, dt, grid, branco)", 30),
  faunaPascolo: trova("animals.js", "// 3) PASCOLO", 32),
  faunaGrid: trova("animals.js", "function gridNearest(grid, x, y, R, ok)", 24),
  emozioniPasso: trova("emotions.js", "const grid = buildHumanGrid(pop.npcs", 22),
  npcVicini: trova("npc.js", "  vicini(x, y, raggio) {", 22),
  npcBestCell: trova("npc.js", "  bestCell(grid, cx, cy, R, minV = 0.15)", 14),
};
fs.writeFileSync(
  __dirname + "/pezzi.json",
  JSON.stringify(pezzi, null, 1));
console.log("estratti " + Object.keys(pezzi).length + " blocchi");
for (const k in pezzi) console.log("  " + k.padEnd(20) + pezzi[k].split("\n").length + " righe");
