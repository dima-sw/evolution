// UN CAPO CHE INVENTA PAROLE. Si costruisce un mondo vero, si mettono in bocca ai capi ordini che
// nella lingua del mondo NON esistono, e poi si lascia girare il mondo INTERO — non solo gli
// ordini: altrimenti il benessere delle persone non si muove, e il giudizio sulle parole si basa
// su un numero fermo. (Ci sono cascato una volta: la prima versione di questa sonda chiamava gli
// ordini a parte, e tutte le parole risultavano ne' buone ne' cattive.)
import { corri } from "./sim.mjs";
const B = "../src/";
const { assegnaOrdini, COMPITI } = await import(B + "orders.js");
const { stepEcosystem, predatorThreatQuery } = await import(B + "animals.js");
const { stepSociety } = await import(B + "emotions.js");
const { stepSocietyAdvanced } = await import(B + "society.js");
const { stepCulture } = await import(B + "culture.js");
const { stepEntities } = await import(B + "entities.js");
const { stepBuildings } = await import(B + "buildings.js");
const { stepClimate } = await import(B + "climate.js");
const { stepFire } = await import(B + "fire.js");
const { updateFactions } = await import(B + "factions.js");

const { pop } = await corri(process.argv[2] || "parole", 58, +(process.argv[3] || 450));
const fazioni = (pop.factions || []).filter((f) => f._membri && f._membri.length >= 12);
console.log("anno " + (pop.anno | 0) + " — vivi " + pop.npcs.filter((n) => n.vivo).length +
  ", popoli abbastanza grandi: " + fazioni.length);
if (!fazioni.length) { console.log("nessun popolo: niente da provare"); process.exit(0); }

const INVENTATE = ["fortificare", "silenzio", "censura", "tributo", "legge marziale", "vendetta"];
console.log("delle " + INVENTATE.length + " parole inventate, il mondo ne conosceva " +
  INVENTATE.filter((p) => COMPITI.includes(p)).length);
if (!pop.aiStati) pop.aiStati = new Map();
const parolaDi = new Map();
for (let i = 0; i < fazioni.length; i++) parolaDi.set(fazioni[i].id, INVENTATE[i % INVENTATE.length]);

function rinnovaEditti() {
  for (const f of pop.factions || []) {
    const parola = parolaDi.get(f.id);
    if (!parola || !f._membri || f._membri.length < 8) continue;
    f._leader = f._leader || f._membri[0];
    let st = pop.aiStati.get(f.id);
    if (!st) { st = { consenso: 0.6, eseguiti: 0, ignorati: 0, esitoEditti: [] }; pop.aiStati.set(f.id, st); }
    st.editti = [{ tipo: parola, quanti: 40, durata: 5, x: f.capX ?? f.x, y: f.capY ?? f.y,
                   bersaglio: null, fino: pop.anno + 5 }];
  }
}

const dt = 0.165;
let acc = 0;
for (let t = 0; t < +(process.env.GIRI || 900); t++) {
  if (t % 25 === 0) rinnovaEditti();
  stepClimate(pop, dt); pop.step(dt); stepEcosystem(pop, dt);
  stepSociety(pop, dt, predatorThreatQuery(pop));
  stepBuildings(pop, dt); stepFire(pop, dt);
  for (const f of pop.factions || []) assegnaOrdini(pop, f, dt);
  acc += dt;
  if (acc > 0.35) { try { updateFactions(pop); } catch (e) {} stepCulture(pop, acc); stepSocietyAdvanced(pop, acc); stepEntities(pop, acc); acc = 0; }
}

let presi = 0;
for (const st of pop.aiStati.values()) presi += st.eseguiti || 0;
const lex = pop.significati || new Map();
const perParola = new Map();
for (const v of lex.values()) {
  let m = perParola.get(v.parola);
  if (!m) { m = new Map(); perParola.set(v.parola, m); }
  m.set(v.gesto, (m.get(v.gesto) || 0) + 1);
}
console.log("\nanno " + (pop.anno | 0) + " — ordini presi in carico: " + presi +
  " | parole nate: " + (pop.paroleNate || 0) + " | sensi cambiati strada facendo: " + (pop.paroleCambiate || 0));
console.log("\nche cosa hanno capito, popolo per popolo:");
for (const [parola, gesti] of perParola) {
  const tot = [...gesti.values()].reduce((a, b) => a + b, 0);
  console.log("  «" + parola + "» → " + [...gesti.entries()].sort((a, b) => b[1] - a[1])
    .map(([g, n]) => g + " (" + ((n / tot) * 100).toFixed(0) + "%)").join(", "));
}
const forze = [...lex.values()].map((v) => v.forza);
if (forze.length) {
  console.log("\nquanto hanno attecchito: media " + (forze.reduce((a, b) => a + b, 0) / forze.length).toFixed(2) +
    " | radicate (>0.4) " + forze.filter((v) => v > 0.4).length +
    " | incerte " + forze.filter((v) => v >= 0.1 && v <= 0.4).length +
    " | sfaldate (<0.1) " + forze.filter((v) => v < 0.1).length + "  su " + forze.length);
}
