// =================================================================================================
// DESIDERIO — perché uno prende questo e non quello.
//
// Fino a ieri qui dentro nessuno sceglieva: chi aveva fame mangiava la prima cosa commestibile che
// gli capitava, e ogni cosa commestibile toglieva la stessa fame. Un mondo così non ha né cucina,
// né commercio, né lusso, né avarizia — perché non ha *meglio* e *peggio*, ha solo *utile*.
//
// Questo modulo aggiunge il meglio e il peggio, e lo fa senza scrivere da nessuna parte quale cosa
// sia migliore. Aggiunge due sole leggi, e sono entrambe di livello 2 (biologia):
//
//   1. IL SAPORE. Un corpo trova buono ciò che per millenni gli è convenuto: l'energia densa, il
//      grasso, il sale, l'aroma di ciò che è vivo. Non è un capriccio, è una scorciatoia — il modo
//      in cui la biologia dice «questo ti conviene» senza dover ragionare. Ed è per questo che si
//      può INGANNARE: una cosa può sapere di buono e fare male, e allora si mangia lo stesso.
//
//   2. LA SAZIETÀ SPECIFICA. La stessa cosa, mangiata sempre, smette di piacere. È il motivo per
//      cui nessun animale onnivoro si accontenta di una fonte sola — e quindi, alla lunga, è il
//      motivo per cui si scambia, si va lontano, si coltiva più di una cosa.
//
// Poi c'è il resto, che non è una legge nuova ma l'uso di quelle che ci sono già: i VIZI. Gola,
// avidità, superbia, invidia, pigrizia, ira sono nei geni da sempre e finora non toccavano quasi
// niente. Qui diventano i PESI di una sola somma. Non sono comportamenti a parte — nessuno «agisce
// da avaro»: c'è che a un avaro le cose valgono di più, e da lì viene tutto il resto da sé.
// =================================================================================================

import { indossabile, stato, puo, SOLIDO, LIQUIDO, GASSOSO } from "./matter.js";
export { indossabile, stato, puo, SOLIDO, LIQUIDO, GASSOSO };

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// -------------------------------------------------------------------------------------------------
// IL SAPORE. Deriva dalle proprietà della materia, come tutto il resto. Un corpo non sa cosa sia
// lo zucchero: sa che certe cose gli danno una scossa e altre no.
// -------------------------------------------------------------------------------------------------
export function sapore(attr) {
  if (!attr) return 0;
  const densita = attr.nutriente || 0;        // quanto sostanzia
  const energia = attr.energiaChim || 0;      // quanta forza dà
  const sale = attr.conducibilita || 0;       // i sali conducono: è così che il corpo li riconosce
  const aroma = attr.bioattivo || 0;          // il segno di ciò che è vivo
  const amaro = attr.tossicita || 0;          // l'amaro è l'allarme del veleno — ma è solo un allarme
  return clamp01(densita * 0.42 + energia * 0.3 + sale * 0.16 + aroma * 0.22 - amaro * 0.35);
}

// Quanto a lungo tiene. Una cosa densa sazia per ore, una acquosa per poco: da qui la differenza
// fra un pasto e uno spuntino, che nessuno ha dovuto definire.
export function sazieta(attr) {
  if (!attr) return 0.3;
  return clamp01(0.18 + (attr.nutriente || 0) * 0.55 + (attr.energiaChim || 0) * 0.3
    + (attr.peso || 0) * 0.15);
}

// QUANTO DISSETA. L'acqua che una cosa contiene, meno il sale che ci trovi dentro — perché il sale
// l'acqua te la porta via invece di dartela, ed è per questo che il mare non si beve. Nessuno ha
// dovuto scrivere «l'uva disseta»: contiene acqua, e tanto basta.
export function dissete(attr) {
  if (!attr) return 0;
  return clamp01((attr.acquosita || 0) * (1 - (attr.conducibilita || 0) * 0.55)
    - (attr.tossicita || 0) * 0.4);
}

// -------------------------------------------------------------------------------------------------
// LO SPLENDORE. Prima qui c'era un numero che avevo scritto io materiale per materiale (`valore`,
// «pregio»): decidevo a mano che l'oro fosse prezioso, e allora il lusso non era emerso — era stato
// deciso in una tabella.
//
// Ma l'attrazione per ciò che luccica è un ISTINTO, non un giudizio: una gazza raccoglie cose
// lucenti senza avere un'opinione sul loro prezzo. E ciò che luccica si può calcolare, perché è
// fisica:
//
//   • il COLORE — chiaro e saturo si vede da lontano, scuro e smorto no;
//   • la CONDUCIBILITÀ — un metallo riflette *perché* conduce: gli elettroni liberi rimandano
//     indietro la luce. È il motivo per cui i metalli hanno quel lucido che la pietra non ha;
//   • la TRASPARENZA — il gioco della luce dentro una gemma;
//   • la FINITURA — e questa è la parte che cambia tutto: una superficie liscia riflette, una
//     porosa o scheggiata no. Lavorare una cosa (martellarla, fonderla, temprarla) ne abbassa la
//     fragilità e la porosità e ne alza la durezza — quindi **la fa splendere di più**, senza che
//     nessun processo debba dichiarare «questo rende prezioso». L'oro lavorato batte l'oro grezzo
//     perché è più liscio, e basta.
//
// Da questo esce la gerarchia classica (diamante, oro, argento, rame, ferro, quarzo) senza che
// nessuno l'abbia scritta — e insieme qualche sorpresa: l'avorio non luccica, e forse questa
// civiltà non lo prezierà mai.
// -------------------------------------------------------------------------------------------------
function occhio(hex) {
  const h = (hex || "#808080").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  if (!(r >= 0) || !(g >= 0) || !(b >= 0)) return { lum: 0.5, sat: 0 };
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const lum = (max + min) / 2;
  const den = 1 - Math.abs(2 * lum - 1);
  return { lum, sat: max === min || den <= 0 ? 0 : (max - min) / den };
}

// Quanto è liscia la superficie. È qui che la lavorazione entra: chi martella o fonde alza la
// durezza e abbassa fragilità e porosità, e si ritrova in mano una cosa che riflette.
export function finitura(attr) {
  if (!attr) return 0.35;
  return clamp01(0.35 + (attr.durezza || 0) * 0.35 - (attr.porosita || 0) * 0.5 - (attr.fragilita || 0) * 0.35);
}

export function splendore(attr, colore) {
  if (!attr) return 0;
  const e = occhio(colore);
  const brillanza = e.lum * 0.4 + e.sat * 0.25 + (attr.conducibilita || 0) * 0.55;
  return clamp01(brillanza * (0.4 + finitura(attr) * 0.8) + (attr.trasparenza || 0) * 0.35);
}

// Quanto una cosa si presta a essere OSTENTATA: deve splendere *e* stare addosso. Due condizioni
// indipendenti, e servono entrambe — il mercurio splende e non si porta, il piombo si porta e non
// splende. Nessuno dei due farà mai un ornamento.
export function ostentabile(m) {
  if (!m) return 0;
  if (m._ost === undefined) m._ost = splendoreDi(m) * indossabile(m.props);
  return m._ost;
}

// Lo splendore di un materiale del registro, calcolato una volta sola: sta in un ciclo caldo.
export function splendoreDi(m) {
  if (!m) return 0;
  if (m._spl === undefined) m._spl = splendore(m.props, m.colore);
  return m._spl;
}

// -------------------------------------------------------------------------------------------------
// LA SAZIETÀ SPECIFICA. Ogni volta che mangi una cosa, quella cosa ti stufa un po'; col tempo la
// voglia torna. Non c'è nessuna regola sulla «dieta varia»: c'è solo che il pane del decimo giorno
// non è più il pane del primo.
// -------------------------------------------------------------------------------------------------
export function stufo(npc, id) {
  const a = npc.assuefaz && npc.assuefaz.get(id);
  return a ? a.v : 0;
}

export function assuefai(npc, id, quanto = 0.3) {
  if (!npc.assuefaz) npc.assuefaz = new Map();
  const a = npc.assuefaz.get(id) || { v: 0 };
  a.v = clamp01(a.v + quanto);
  npc.assuefaz.set(id, a);
}

export function smaltisci(npc, dt) {
  if (!npc.assuefaz) return;
  for (const [id, a] of npc.assuefaz) {
    a.v -= dt * 0.025;
    if (a.v <= 0.01) npc.assuefaz.delete(id);
  }
}

// -------------------------------------------------------------------------------------------------
// LA SOMMA. Tutto ciò che uno può volere passa di qui: cibo, arnesi, case, ornamenti. L'oggetto
// arriva descritto SOLO da ciò che fa e da com'è — mai da come si chiama.
//
//   nutre, cura, nuoce : cosa fa al corpo (da physiology)
//   gusto              : quanto sa di buono (da sapore)
//   tiene              : quanto a lungo sazia
//   fatica             : quanto costa averla
//   raro               : quanto è difficile da trovare (0 comune .. 1 introvabile)
//   bramato            : quanti altri, qui intorno, la vogliono
//   id                 : per l'assuefazione e per l'esperienza personale
// -------------------------------------------------------------------------------------------------
export function valuta(npc, o, esperienza = 0) {
  const fame = npc.fame, sete = npc.sete;

  // IL BISOGNO. Vale tanto quanto ti manca: a stomaco pieno il pane non vale niente, a stomaco
  // vuoto vale tutto.
  //
  // Ma la sazietà specifica non toglie solo il gusto: toglie proprio la VOGLIA di quella cosa lì.
  // È la differenza fra «non mi va» e «non mi piace» — e vale solo finché si può scegliere: chi
  // ha davvero fame mangia ciò che ha stufato da un pezzo, e non fa storie.
  const noia = stufo(npc, o.id);
  const stanchezzaDiQuesto = 1 - noia * 0.62 * (1 - fame * 0.85);
  let v = (o.nutre || 0) * fame * 2.2 * stanchezzaDiQuesto
    + (o.dissete || 0) * sete * 2.4 + (o.cura || 0) * npc.dolore * 1.8;

  // LA GOLA. Chi è goloso vuole il sapore, non il nutrimento — e lo vuole ANCHE DA SAZIO. È la
  // prima cosa in questo mondo che si desidera senza che serva a niente, ed è da lì che comincia
  // tutto il resto: la cucina, il commercio delle spezie, l'eccesso.
  const gusto = (o.gusto || 0) * (1 - noia * 0.85);
  v += gusto * (0.25 + npc.gola * 1.5) * (0.35 + fame * 0.65);
  if (npc.gola > 0.6 && fame < 0.3) v += gusto * (npc.gola - 0.6) * 1.2;   // mangia per piacere

  // IL DANNO. Lo si evita — ma non tutti allo stesso modo: chi è temerario ci passa sopra, chi ha
  // fame nera ci passa sopra lo stesso. È così che si finisce avvelenati.
  v -= (o.nuoce || 0) * (2.6 - npc.coraggio * 0.8) * (1 - fame * 0.55);

  // L'AVIDITÀ. All'avaro le cose valgono in sé, anche quelle che non gli servono. Da qui
  // l'accumulo, e quindi la disuguaglianza, e quindi tutto ciò che ne segue.
  v += (0.12 + (o.raro || 0) * 0.5) * npc.avidita * 1.1;

  // LA SUPERBIA. Il superbo non vuole ciò che è buono: vuole ciò che gli altri non hanno. È il
  // seme del lusso — una cosa può diventare preziosa solo perché è rara, senza servire a nulla.
  v += (o.raro || 0) * npc.superbia * 1.4;

  // L'INVIDIA. Si vuole ciò che vogliono gli altri. Basta questa riga perché nasca la moda: una
  // cosa desiderata diventa più desiderabile, e il desiderio si alimenta da solo.
  v += (o.bramato || 0) * (npc.invidiaT * 0.9 + npc.bias.imitazione * 0.5);

  // LA PIGRIZIA. La fatica si sconta — e il pigro la sconta moltissimo. Ecco perché il pigro
  // mangia peggio, e perché l'operoso arriva più lontano a prendersi il meglio.
  v -= (o.fatica || 0) * (0.4 + npc.pigrizia * 1.6);

  // L'ESPERIENZA. Quello che gli è successo l'ultima volta che l'ha toccata, e quello che gli
  // hanno raccontato. Può essere del tutto sbagliato: conta lo stesso, anzi conta di più.
  v += esperienza * (1.2 + npc.bias.conferma * 0.6);

  return v;
}

// -------------------------------------------------------------------------------------------------
// QUANTO SI È BRAMATA UNA COSA, QUI INTORNO. Non è un valore di mercato deciso da me: è il conto di
// quanti ce l'hanno e quanti la vogliono, rifatto ogni tanto. Se una cosa piace a molti, chi la
// vede addosso a un altro la vuole di più — ed è tutto ciò che serve perché nasca la moda.
// -------------------------------------------------------------------------------------------------
export function aggiornaBrama(pop, dt) {
  pop._bramaT = (pop._bramaT || 0) + dt;
  if (pop._bramaT < 3) return;
  pop._bramaT = 0;
  const conta = new Map();
  let vivi = 0;
  for (const n of pop.npcs) {
    if (!n.vivo) continue;
    vivi++;
    for (const [id, q] of n.inventory) if (q > 0) conta.set(id, (conta.get(id) || 0) + 1);
  }
  if (!vivi) return;
  if (!pop.brama) pop.brama = new Map();
  if (!pop.rarita) pop.rarita = new Map();
  for (const m of pop.registry.materials) {
    const quanti = conta.get(m.id) || 0;
    const diffusione = quanti / vivi;
    // RARITÀ: quanto è difficile averla. Nessuno l'ha deciso — è quanta ce n'è in giro.
    pop.rarita.set(m.id, clamp01(1 - diffusione * 6));
    // BRAMA: una cosa che hanno in pochi ma che chi ce l'ha tiene stretta. Il prodotto fa da solo
    // la curva giusta: ciò che è comunissimo non si brama, ciò che nessuno ha nemmeno.
    const b = pop.brama.get(m.id) || 0;
    const bersaglio = clamp01(diffusione * 4) * clamp01(1 - diffusione * 3);
    pop.brama.set(m.id, b + (bersaglio - b) * 0.25);
  }
}

export function brama(pop, id) { return (pop.brama && pop.brama.get(id)) || 0; }
export function raro(pop, id) { return (pop.rarita && pop.rarita.get(id)) || 0; }

// =================================================================================================
// LA QUALITÀ DELLE COSE FATTE. Stesso principio del sapore, applicato al riparo: una casa non è
// «una casa di livello 3», è un mucchio di materia messa fra te e il tempo. Quanto ti protegge
// dipende da che materia è — e questo non lo decido io, lo dicono le sue proprietà.
//
// Una capanna di frasche e una casa di pietra non sono lo stesso oggetto con un numero diverso:
// sono due cose diverse, e chi ha la seconda vive più a lungo. È da qui che nasce la differenza
// fra chi può permettersi la pietra e chi no — cioè la disuguaglianza vera, quella che si vede.
// =================================================================================================
export function riparoDi(attr) {
  if (!attr) return { coibenza: 0.2, tenuta: 0.2, durata: 0.2 };
  const massa = (attr.peso || 0);
  // COIBENZA: tiene dentro il calore. Ciò che conduce lo disperde; ciò che è massiccio lo trattiene.
  // È il motivo per cui si sta al caldo dentro la pietra e si gela dentro il metallo.
  const coibenza = clamp01((1 - (attr.conducibilita || 0)) * 0.55 + massa * 0.3
    + (attr.porosita || 0) * 0.2);
  // TENUTA: tiene fuori il tempo. Serve che sia duro e che i pezzi stiano insieme; se è fragile,
  // o se beve l'acqua, non tiene niente.
  const tenuta = clamp01(0.15 + (attr.durezza || 0) * 0.5 + (attr.legame || 0) * 0.35
    - (attr.fragilita || 0) * 0.35 - (attr.porosita || 0) * 0.25);
  // DURATA: quanto resiste prima di tornare polvere.
  const durata = clamp01(0.35 + (attr.durezza || 0) * 0.45 - (attr.fragilita || 0) * 0.45
    - (attr.reattivita || 0) * 0.25 - (attr.acidita || 0) * 0.2);
  return { coibenza, tenuta, durata };
}

// Quanto vale, come riparo, la casa che uno si è fatto: la media di ciò con cui l'ha tirata su,
// pesata da quanto ne ha messo. Chi ha costruito con quel che capitava avrà una media mediocre.
export function qualitaCasa(pop, npc) {
  if (!npc.casaMat || !npc.casaMat.size) return { coibenza: 0.15, tenuta: 0.15, durata: 0.2, pregio: 0 };
  let co = 0, te = 0, du = 0, pr = 0, tot = 0;
  for (const [id, q] of npc.casaMat) {
    const m = pop.registry.mat(id);
    if (!m) continue;
    const r = riparoDi(m.props);
    co += r.coibenza * q; te += r.tenuta * q; du += r.durata * q;
    pr += splendoreDi(m) * q;
    tot += q;
  }
  if (!tot) return { coibenza: 0.15, tenuta: 0.15, durata: 0.2, pregio: 0 };
  return { coibenza: co / tot, tenuta: te / tot, durata: du / tot, pregio: pr / tot };
}
