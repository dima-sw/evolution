// IL MARE E' DAVVERO TUTTO SALATO? Non basta il commento: si conta, dopo secoli di frane e
// terremoti, quanti tile d'acqua salata risultano ancora "da bere", e quanta terra asciutta
// risulta ancora marcata come mare.
import { corri } from "./sim.mjs";
const B = "../src/";
const { isWater } = await import(B + "world.js");
const { pop, world } = await corri(process.argv[2] || "mare", 58, +(process.argv[3] || 3500), +(process.env.GENTE || 240));
const N = world.width * world.height;
let salatoBevibile = 0, terraMarcataMare = 0, mareSopraLivello = 0, acquaSottoSecca = 0;
for (let i = 0; i < N; i++) {
  const acquaBioma = isWater(world.biome[i]);
  const dolce = !!world.river[i] || !!(world.stagnant && world.stagnant[i]);
  const sottoLivello = world.elevation[i] < world.seaLevel;   // stessa soglia del mondo
  if (acquaBioma && dolce && sottoLivello) salatoBevibile++;
  if (!sottoLivello && acquaBioma) terraMarcataMare++;
  if (sottoLivello && !acquaBioma) acquaSottoSecca++;
}
console.log(JSON.stringify({
  anno: pop.anno | 0, vivi: pop.npcs.filter((n) => n.vivo).length,
  terremoti: pop.terremoti || 0, frane: pop.frane || 0, eruzioni: pop.eruzioni || 0,
  "terra emersa o affondata": pop.terraCambiata || 0,
  "mare che si potrebbe bere": salatoBevibile,
  "terra asciutta marcata mare": terraMarcataMare,
  "fondale marcato terra": acquaSottoSecca,
}, null, 1));
