// I DELEGATI SERVONO A QUALCOSA? Si prende un popolo vero, si guarda quanto obbedisce la gente
// lontana dal capo, poi si mette un delegato in mezzo a loro e si riguarda. Se il numero non si
// muove, il delegato è un ornamento.
import { corri } from "./sim.mjs";
const B = "../src/";
const { obbedienza } = await import(B + "orders.js");

const { pop } = await corri(process.argv[2] || "delegati", 58, +(process.argv[3] || 400));
const f = (pop.factions || []).filter((x) => x._membri && x._membri.length >= 25)
  .sort((a, b) => b._membri.length - a._membri.length)[0];
if (!f) { console.log("nessun popolo abbastanza grande"); process.exit(0); }
const capo = f._leader || f._membri[0];
const editto = { tipo: "raccogliere", quanti: 40, durata: 4, x: capo.x, y: capo.y };

// i più lontani dal capo: sono loro che non lo sentono
const lontani = f._membri.filter((m) => m.vivo && m !== capo)
  .map((m) => ({ m, d: Math.hypot(m.x - capo.x, m.y - capo.y) }))
  .sort((a, b) => b.d - a.d).slice(0, 20);
const media = (v) => v.reduce((s, x) => s + x, 0) / Math.max(1, v.length);

if (!pop.aiStati) pop.aiStati = new Map();
pop.aiStati.set(f.id, { ruoli: {}, consenso: 0.6 });
const senza = lontani.map((o) => obbedienza(pop, o.m, editto, capo));

// ora il capo nomina qualcuno che sta PROPRIO LÌ
const delegato = lontani[Math.floor(lontani.length / 2)].m;
delegato._potereRuolo = 0.3;
pop.aiStati.get(f.id).ruoli = { generale: { id: delegato.id, potere: 0.3, _npc: delegato } };
const con = lontani.map((o) => obbedienza(pop, o.m, editto, capo));

// e per controllo: chi sta ADDOSSO al capo non deve cambiare di niente
const vicini = f._membri.filter((m) => m.vivo && m !== capo)
  .map((m) => ({ m, d: Math.hypot(m.x - capo.x, m.y - capo.y) }))
  .sort((a, b) => a.d - b.d).slice(0, 20);
const viciniCon = vicini.map((o) => obbedienza(pop, o.m, editto, capo));

console.log(JSON.stringify({
  popolo: f.nome, membri: f._membri.length,
  "distanza media dei lontani": +media(lontani.map((o) => o.d)).toFixed(1),
  "obbedienza dei lontani, senza delegato": +media(senza).toFixed(3),
  "obbedienza dei lontani, col delegato in mezzo a loro": +media(con).toFixed(3),
  "quanti obbedirebbero (su 20) senza": senza.filter((v) => v > 0.25).length,
  "quanti obbedirebbero (su 20) col delegato": con.filter((v) => v > 0.25).length,
  "controllo — chi sta addosso al capo": +media(viciniCon).toFixed(3),
  "distanza media dei vicini": +media(vicini.map((o) => o.d)).toFixed(1),
}, null, 1));
