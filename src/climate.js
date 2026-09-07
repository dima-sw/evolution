import { P } from "./params.js";
import { capacitaVitale } from "./npc.js";
import { BIOME, biomaDi } from "./world.js";
// IL MONDO FISICO CHE VIVE — luce, acqua, aria, terra. Sono LEGGI (livello 1 dell'hardcoding
// ammesso), non contenuto: nessun evento è scritto nella storia, tutti emergono da variabili che
// si influenzano a vicenda.
//   • LUCE (8.7): ciclo giorno/notte, fasi lunari, ECLISSI. Di notte si vede poco → si caccia male,
//     si ha più paura, si dorme. L'eclissi è un evento saliente: da lì possono nascere religioni.
//   • CICLO DELL'ACQUA (8.6): mare → EVAPORAZIONE (∝ temperatura) → nuvole → PIOGGIA → fiumi → mare.
//     La pioggia non è più un dado stagionale: è la conseguenza dell'umidità accumulata nell'aria.
//   • METEO (8.4): vento (che sposta le nuvole e attizza gli incendi), SICCITÀ quando l'aria resta
//     secca a lungo, grandine che rovina i raccolti.
//   • GEOLOGIA (8.5): terremoti (crollano le case), frane in montagna, VULCANI che eruttano
//     (cenere che oscura il cielo e raffredda il clima, ma lascia terra fertilissima).
//   • EVENTI MONDIALI (9.17): comete, glaciazioni. Rari, cambiano la storia di tutti.

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function initClimate(pop) {
  pop.ora = 0;              // frazione del giorno (0..1)
  pop.notte = false;
  pop.luna = 0;             // fase lunare 0..1 (0 = luna nuova, 0.5 = piena)
  pop.eclissi = 0;          // durata residua di un'eclissi
  pop.umiditaAria = 0.4;    // vapore acqueo accumulato: quando è alto, piove
  pop.vento = 0.3;          // intensità del vento
  pop.ventoDir = 0;
  pop.siccita = 0;          // 0..1: quanto dura l'assenza di pioggia
  pop.cenere = 0;           // cenere vulcanica in atmosfera: oscura e raffredda
  pop.eraGlaciale = 0;      // 0..1: raffreddamento globale prolungato
  pop.terremoti = 0; pop.eruzioni = 0; pop.frane = 0; pop.grandinate = 0; pop.eclissiTot = 0;
  pop.comete = 0;
  // I VULCANI sono i punti più alti del mondo: la geologia esiste già nella forma del terreno.
  pop.vulcani = [];
  const w = pop.world;
  const cand = [];
  for (let i = 0; i < w.elevation.length; i++) if (w.biome[i] === 11 /* MOUNTAIN */) cand.push(i);
  for (let k = 0; k < 6 && cand.length; k++) pop.vulcani.push(cand[(pop.rng() * cand.length) | 0]);
}

// Il giorno dura 1/12 di "anno" simulato: abbastanza lento da vedersi, abbastanza veloce da contare.
const GIORNI_PER_ANNO = () => P.giorniPerAnno;

export function stepClimate(pop, dt) {
  if (pop.ora == null) initClimate(pop);
  const w = pop.world;

  // ---- LUCE: giorno/notte, luna, eclissi -------------------------------------------------
  pop.ora = (pop.anno * GIORNI_PER_ANNO()) % 1;
  pop.notte = pop.ora > 0.62 || pop.ora < 0.08;
  pop.luna = (pop.anno * GIORNI_PER_ANNO() / 29) % 1; // ciclo lunare ~29 giorni
  if (pop.eclissi > 0) pop.eclissi -= dt;
  // ECLISSI: possibile solo a luna nuova, rara. Il cielo si oscura a mezzogiorno: terrore.
  else if (pop.luna < 0.02 && !pop.notte && pop.rng() < dt * P.probEclissi) {
    pop.eclissi = 0.05;
    pop.eclissiTot++;
    pop.chronicle && pop.chronicle("Il sole si oscura in pieno giorno: sgomento fra le genti", 5);
    pop._eventoSaliente = { evento: "l'oscuramento del sole", anno: pop.anno };
    for (const n of pop.npcs) if (n.vivo) n.emo.paura = clamp01(n.emo.paura + 0.6 * (1 - n.intelligenza * 0.5));
  }
  // Buio = paura e riposo (la notte cambia il comportamento: vedi npc.js e animals.js).
  // LUCE CONTINUA (0 = notte fonda, 1 = pieno giorno) con ALBA e TRAMONTO graduali, invece di un
  // interruttore acceso/spento. Serve alla resa grafica: il renderer la insegue in modo morbido,
  // così il cielo cambia colore senza lampeggiare anche quando la simulazione corre veloce.
  const o = pop.ora;
  pop.luce = o < 0.06 ? 0                                  // notte fonda
    : o < 0.16 ? (o - 0.06) / 0.10                          // alba
    : o < 0.58 ? 1                                          // giorno pieno
    : o < 0.70 ? 1 - (o - 0.58) / 0.12                      // tramonto
    : 0;                                                    // notte
  if (pop.eclissi > 0) pop.luce *= 0.15;
  pop.luce = Math.max(0, pop.luce - pop.cenere * 0.35);      // la cenere vulcanica oscura il cielo
  // 1 mentre il sole sorge/tramonta: serve a tingere il cielo di arancio all'orizzonte
  pop.crepuscolo = (o > 0.05 && o < 0.20) || (o > 0.55 && o < 0.74) ? 1 : 0;
  pop.buio = (pop.notte ? 0.8 : 0) + (pop.eclissi > 0 ? 0.9 : 0) + pop.cenere * 0.5;

  // ---- CICLO DELL'ACQUA: evaporazione → nuvole → pioggia ---------------------------------
  // Evapora tanto più quanto è caldo (e col vento). L'umidità si accumula finché non satura → piove.
  const stagCaldo = { Primavera: 1, Estate: 1.5, Autunno: 0.9, Inverno: 0.45 }[pop.stagione] || 1;
  const raffredda = 1 - pop.cenere * 0.5 - pop.eraGlaciale * 0.5;
  const evapora = P.evaporazione * dt * stagCaldo * Math.max(0.15, raffredda) * (0.7 + pop.vento * 0.6);
  pop.umiditaAria = clamp01(pop.umiditaAria + evapora);
  if (pop.pioggiaFino == null) pop.pioggiaFino = -1;
  if (pop.anno < pop.pioggiaFino) {
    pop.pioggia = true;
    pop.umiditaAria = Math.max(0, pop.umiditaAria - 0.5 * dt); // piovendo, l'aria si asciuga
  } else {
    pop.pioggia = false;
    // Più l'aria è satura, più è probabile che precipiti (soglia morbida): niente dado stagionale.
    const p = Math.max(0, pop.umiditaAria - P.sogliaPioggia) * 4;
    if (pop.rng() < p * dt * 3) { pop.pioggiaFino = pop.anno + 0.15 + pop.rng() * P.durataPioggia; pop.pioggia = true; }
  }
  // SICCITÀ: se non piove a lungo l'aria resta secca e la terra si spacca.
  pop.siccita = clamp01(pop.siccita + (pop.pioggia ? -0.5 * dt : P.siccitaRate * dt));
  if (pop.siccita > 0.75 && pop.rng() < dt * 0.4) {
    pop.chronicle && pop.chronicle("Lunga siccità: la terra si screpola", 25);
    pop._eventoSaliente = { evento: "la siccità", anno: pop.anno };
  }

  // ---- VENTO: gira lentamente; forte alimenta gli incendi e porta le tempeste --------------
  pop.ventoDir += (pop.rng() - 0.5) * dt;
  pop.vento = clamp01(pop.vento + (pop.rng() - 0.5) * dt * P.ventoDeriva);

  // GRANDINE: pioggia + freddo → rovina i raccolti (i campi coltivati soffrono di più).
  if (pop.pioggia && (pop.stagione === "Inverno" || pop.stagione === "Autunno") && pop.rng() < dt * P.probGrandine) {
    let colpiti = 0;
    for (const [i, campo] of pop.campi) { campo.crescita *= 0.55; colpiti++; }
    for (let k = 0; k < 400; k++) { const i = (pop.rng() * pop.food.length) | 0; pop.food[i] *= 0.7; }
    pop.grandinate++;
    if (colpiti > 5) pop.chronicle && pop.chronicle(`Grandinata: ${colpiti} campi devastati`, 10);
  }

// RIMODELLARE. Cambia la quota di un tile e aggiorna quel che ne dipende. È l'unico punto in cui
// il terreno si tocca, così non ci sono due modi diversi di farlo.
function rimodella(pop, i, delta) {
  const w = pop.world;
  const prima = w.elevation[i];
  const dopo = Math.max(0, Math.min(1, prima + delta));
  if (dopo === prima) return;
  w.elevation[i] = dopo;
  // Se ha attraversato il livello del mare, quel posto è diventato un'altra cosa: terra che
  // affonda o fondale che riemerge. Nessuno lo dichiara — segue l'acqua, come tutto il resto.
  const eraAcqua = prima < w.seaLevel, oraAcqua = dopo < w.seaLevel;   // stessa soglia del mondo: il mare e' sotto il livello, non a filo
  if (eraAcqua !== oraAcqua) {
    // Che cosa diventa lo decide il clima di adesso, non il ricordo di com'era: un fondale che
    // riemerge non puo' tornare "mare" (sarebbe terra asciutta che nessuno puo' calpestare),
    // diventa la spiaggia o la prateria che quella quota e quel calore comportano.
    w.biome[i] = biomaDi(w, i);
    if (oraAcqua) {
      // Il mare e' tutto salato, sempre. Se un fiume o un acquitrino finisce sott'acqua smette
      // di essere acqua da bere: senza spegnere anche l'acqua ferma, si berrebbe dal mare
      // esattamente dove il mare se l'e' preso.
      w.river[i] = 0;
      if (w.riverNear) w.riverNear[i] = 0;
      if (w.stagnant) w.stagnant[i] = 0;
    }
    pop.terraCambiata = (pop.terraCambiata || 0) + 1;
  }
  // La terra ha cambiato resa: la capienza del mondo cambia con lei. Si tiene aggiornata per
  // differenza — è esatto e non costa niente. Senza, il numero mostrato («quanta gente può
  // nutrire questa terra») resterebbe quello del primo giorno, mentre frane, faglie e coni ne
  // hanno cambiato il 26% in seicento anni.
  const resaPrima = pop.foodCap[i];
  pop.foodCap[i] = capacitaVitale(w, i);
  pop.capienzaTerra = (pop.capienzaTerra || 0) + (pop.foodCap[i] - resaPrima);
  if (pop.food[i] > pop.foodCap[i]) pop.food[i] = pop.foodCap[i];
}

  // ---- GEOLOGIA: terremoti, frane, eruzioni ----------------------------------------------
  // TERREMOTO: colpisce una regione; crollano le case, la gente muore o resta senza riparo.
  if (pop.rng() < dt * P.probTerremoto) {
    const cx = pop.rng() * w.width, cy = pop.rng() * w.height, R2 = 45 * 45;
    let vittime = 0, caseCrollate = 0;
    for (const n of pop.npcs) {
      if (!n.vivo) continue;
      if ((n.x - cx) ** 2 + (n.y - cy) ** 2 > R2) continue;
      n.emo.paura = clamp01(n.emo.paura + 0.7);
      if (n.casa && pop.rng() < 0.5) { n.casa = null; n.casaLivello = 0; n.riparo = 1; caseCrollate++; }
      if (pop.rng() < 0.25) { n.salute -= 0.3 + pop.rng() * 0.4; if (n.salute <= 0) { n.vivo = false; pop.morti++; vittime++; } }
    }
    // LA FAGLIA. Un terremoto è due pezzi di crosta che si spostano l'uno rispetto all'altro: da un
    // lato la terra si solleva, dall'altro sprofonda. Si sceglie una direzione e si piega il
    // terreno attorno a quella linea — poco, ma per sempre.
    {
      const ang = pop.rng() * Math.PI, ax = Math.cos(ang), ay = Math.sin(ang);
      const forza = 0.004 + pop.rng() * 0.012;
      const R = 45;
      for (let dy = -R; dy <= R; dy += 1) {
        for (let dx = -R; dx <= R; dx += 1) {
          const d2 = dx * dx + dy * dy;
          if (d2 > R * R) continue;
          const x = (cx + dx) | 0, y = (cy + dy) | 0;
          if (x < 0 || y < 0 || x >= w.width || y >= w.height) continue;
          const lato = dx * ax + dy * ay;              // da che parte della faglia sei
          const vicino = 1 - Math.sqrt(d2) / R;
          rimodella(pop, y * w.width + x, Math.sign(lato) * forza * vicino * vicino);
        }
      }
    }
    pop.terremoti++;
    if (caseCrollate + vittime > 2) {
      pop.chronicle && pop.chronicle(`Terremoto: ${caseCrollate} case crollate, ${vittime} morti`, 10);
      pop._eventoSaliente = { evento: "il terremoto", anno: pop.anno };
    }
  }
  // FRANA: in montagna, dopo le piogge. Travolge chi sta sui pendii ripidi.
  if (pop.pioggia && pop.rng() < dt * P.probFrana) {
    // Una frana accade in un versante, non su tutte le montagne del mondo nello stesso istante.
    const fx = pop.rng() * w.width, fy = pop.rng() * w.height, R2 = 14 * 14;
    let travolti = 0, terraMossa = 0;
    // LA TERRA SCENDE. È la definizione stessa di frana: quello che stava in alto finisce più in
    // basso. Il pendio si addolcisce, e a valle si accumula suolo — che è pure più fertile, perché
    // è la terra buona che si è portata via.
    for (let dy = -14; dy <= 14; dy++) {
      for (let dx = -14; dx <= 14; dx++) {
        if (dx * dx + dy * dy > R2) continue;
        const x = (fx + dx) | 0, y = (fy + dy) | 0;
        if (x < 1 || y < 1 || x >= w.width - 1 || y >= w.height - 1) continue;
        const i = y * w.width + x;
        if (w.elevation[i] <= w.seaLevel) continue;
        // dove scivolerebbe: il vicino più basso
        let giu = -1, minQ = w.elevation[i];
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = (y + oy) * w.width + (x + ox);
          if (w.elevation[j] < minQ) { minQ = w.elevation[j]; giu = j; }
        }
        if (giu < 0) continue;
        const salto = w.elevation[i] - minQ;
        if (salto < 0.012) continue;                   // troppo piatto: niente frana
        const quanta = Math.min(salto * 0.35, 0.02);
        rimodella(pop, i, -quanta);
        rimodella(pop, giu, quanta * 0.8);             // un po' si perde per strada
        pop.fertility[i] = Math.max(0.15, pop.fertility[i] - 0.25);   // resta la roccia nuda
        pop.fertility[giu] = Math.min(1, pop.fertility[giu] + 0.2);   // a valle arriva la terra buona
        terraMossa++;
      }
    }
    for (const n of pop.npcs) {
      if (!n.vivo) continue;
      if ((n.x - fx) ** 2 + (n.y - fy) ** 2 > R2) continue;
      const i = pop.tileIdx(n.x, n.y);
      if (w.biome[i] !== 11 && w.biome[i] !== 10) continue; // montagna/roccia
      n.salute -= 0.5; n.emo.paura = clamp01(n.emo.paura + 0.6);
      if (n.salute <= 0) { n.vivo = false; pop.morti++; travolti++; }
    }
    if (terraMossa) pop.frane++;
    if (travolti) pop.chronicle && pop.chronicle(`Frana in montagna: ${travolti} travolti`, 12);
  }
  // ERUZIONE VULCANICA: cenere in atmosfera (oscura e RAFFREDDA il clima), lava che brucia intorno,
  // ma il suolo intorno diventa fertilissimo → dopo la catastrofe si torna a viverci.
  if (pop.vulcani.length && pop.rng() < dt * P.probEruzione) {
    const vi = pop.vulcani[(pop.rng() * pop.vulcani.length) | 0];
    const vx = vi % w.width, vy = (vi / w.width) | 0;
    pop.cenere = Math.min(1, pop.cenere + 0.5);
    pop.eruzioni++;
    let vittime = 0;
    for (const n of pop.npcs) {
      if (!n.vivo) continue;
      const d2 = (n.x - vx) ** 2 + (n.y - vy) ** 2;
      if (d2 > 30 * 30) continue;
      n.emo.paura = clamp01(n.emo.paura + 0.8);
      if (d2 < 14 * 14) { n.salute -= 0.8; if (n.salute <= 0) { n.vivo = false; pop.morti++; vittime++; } }
    }
    // IL CONO CRESCE. Un vulcano che erutta si costruisce: la lava si posa e la montagna sale.
    // Dopo abbastanza eruzioni quel punto è diventato una vetta, e nessuno l'aveva disegnata.
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > 36) continue;
      const x = vx + dx, y = vy + dy;
      if (x < 0 || y < 0 || x >= w.width || y >= w.height) continue;
      rimodella(pop, y * w.width + x, 0.02 * (1 - Math.sqrt(d2) / 6));
    }
    // ceneri = terra fertile intorno
    for (let dy = -18; dy <= 18; dy++) for (let dx = -18; dx <= 18; dx++) {
      const x = vx + dx, y = vy + dy;
      if (x < 0 || y < 0 || x >= w.width || y >= w.height) continue;
      if (dx * dx + dy * dy > 18 * 18) continue;
      const i = y * w.width + x;
      if (pop.foodCap[i] > 0) pop.fertility[i] = Math.min(1, pop.fertility[i] + 0.5);
    }
    pop.chronicle && pop.chronicle(`Eruzione vulcanica: il cielo si oscura di cenere${vittime ? `, ${vittime} morti` : ""}`, 15);
    pop._eventoSaliente = { evento: "l'eruzione del monte di fuoco", anno: pop.anno };
  }
  pop.cenere = Math.max(0, pop.cenere - dt * P.cenereDecay); // la cenere ricade lentamente

  // ---- EVENTI MONDIALI (rari): comete e glaciazioni ---------------------------------------
  if (pop.rng() < dt * P.probCometa) {
    pop.comete++;
    pop.chronicle && pop.chronicle("Una stella con la coda attraversa il cielo", 20);
    pop._eventoSaliente = { evento: "la stella con la coda", anno: pop.anno };
    for (const n of pop.npcs) if (n.vivo) n.emo.paura = clamp01(n.emo.paura + 0.35 * (1 - n.intelligenza * 0.5));
  }
  // GLACIAZIONE: un raffreddamento lungo che stringe la fascia abitabile (poi rientra).
  if (pop.eraGlaciale > 0) pop.eraGlaciale = Math.max(0, pop.eraGlaciale - dt * 0.008);
  else if (pop.rng() < dt * P.probGlaciazione) {
    pop.eraGlaciale = 0.8;
    pop.chronicle && pop.chronicle("Il freddo si fa più duro di anno in anno: è iniziata un'era glaciale", 60);
    pop._eventoSaliente = { evento: "il grande freddo", anno: pop.anno };
  }
  // Effetto climatico globale: la temperatura percepita cala con cenere ed era glaciale.
  pop.tempOffset = -(pop.cenere * 0.12 + pop.eraGlaciale * 0.14);
}
