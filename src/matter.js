// =================================================================================================
// GLI STATI DELLA MATERIA — e che cosa ci si può fare.
//
// Questo file è hardcodato apposta, ed è il tipo di hardcoding che la regola d'oro ammette: è
// FISICA. Non dice che l'oro è prezioso né che il pane si mangia; dice che **non si indossa l'aria**
// e **non si beve il legno**. Sono cose vere in qualunque mondo, per chiunque, da sempre.
//
// La distinzione da tenere ferma è questa:
//
//   • CHE COSA È POSSIBILE lo decide la fisica, e sta scritto qui. Un liquido si beve e si versa,
//     un solido si indossa e ci si costruisce, un gas si respira. Nessuna cultura può cambiarlo.
//
//   • CHE COSA SI FA, fra le cose possibili, non sta scritto da nessuna parte. Che un popolo beva
//     una cosa e un altro la rifiuti, che l'oro si porti al collo o resti nel terreno, che il legno
//     lo si mangi quando c'è la fame: quello lo decidono la fame, i vizi, l'esperienza e gli altri.
//
// Il legno si può mangiare — è solido e ha un po' di nutrimento. Non è una gran cosa da mangiare, e
// infatti nessuno lo fa finché non è disperato. Ma non è VIETATO, perché nella realtà non lo è: è
// solo cattivo. Questa differenza fra «impossibile» e «pessimo» è tutto il senso del file.
// =================================================================================================

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const SOLIDO = "solido", LIQUIDO = "liquido", GASSOSO = "gassoso";

// -------------------------------------------------------------------------------------------------
// IN CHE STATO SI TROVA, QUI.
//
// È una gara fra il punto di fusione della sostanza e il calore del posto in cui ti trovi. Per
// questo lo stato dipende da DOVE sei: il mercurio gela in montagna, il miele e il grasso colano
// nel deserto — e nessuno ha dovuto scrivere due materiali diversi per dirlo.
// -------------------------------------------------------------------------------------------------
// La temperatura del mondo (0..1) copre soltanto la fetta più bassa della scala di fusione: sotto
// 0,12. Sopra quella soglia una cosa resta soda anche nel deserto; sotto, cola. È il motivo per cui
// il mercurio è liquido dappertutto e lo stagno è sodo dappertutto, pur fondendo facile sul fuoco.
export const FASCIA_AMBIENTE = 0.12;

export function stato(attr, temperatura = 0.5) {
  if (!attr) return SOLIDO;
  const fonde = attr.tempFusione !== undefined ? attr.tempFusione : 0.5;
  const qui = temperatura * FASCIA_AMBIENTE;      // quanto calore c'è, sulla scala della fusione
  // Per essere aria bisogna evaporare, e non essere né denso né vischioso: un vapore pesante
  // ricade, una cosa vischiosa non si alza da terra.
  if ((attr.volatilita || 0) > 0.45 && (attr.viscosita || 0) < 0.45
      && (attr.peso || 0) < 0.35 && fonde < qui * 2) return GASSOSO;
  // Sopra il proprio punto di fusione, cola. Sotto, tiene la forma — e la tiene meglio se è anche
  // dura: un solido appena appena solido (la pece, la resina) sta nel mezzo.
  if (fonde < qui) return LIQUIDO;
  if ((attr.viscosita || 0) > 0.45 && (attr.durezza || 0) < 0.15) return LIQUIDO;
  return SOLIDO;
}

// Quanto è «di quello stato»: serve per le vie di mezzo, che esistono (il miele, la resina, la
// pece). Torna 0..1 e non una casella secca.
export function quantoSolido(attr, temperatura = 0.5) {
  if (!attr) return 1;
  const fonde = attr.tempFusione !== undefined ? attr.tempFusione : 0.5;
  const qui = temperatura * FASCIA_AMBIENTE;
  const margine = (fonde - qui) / FASCIA_AMBIENTE;   // quanto sei lontano dal fondere
  return clamp01(margine * 1.4 + 0.35) * clamp01(1 - (attr.viscosita || 0) * 0.8);
}

// -------------------------------------------------------------------------------------------------
// CHE COSA SI PUÒ FARE CON QUALCOSA CHE SI TROVA IN QUELLO STATO.
//
// Questa tabella è l'unica cosa «scritta» del modulo, e sono leggi fisiche: 1 vuol dire che si può,
// 0 che è impossibile, e i valori in mezzo vogliono dire «si può ma male». Non c'è nessun giudizio
// culturale qui dentro — non dice che cosa è buono, dice che cosa è possibile.
// -------------------------------------------------------------------------------------------------
export const AZIONI = {
  // te lo metti addosso e ci resta
  indossare: { [SOLIDO]: 1, [LIQUIDO]: 0, [GASSOSO]: 0 },
  // lo mandi giù senza masticare
  bere: { [SOLIDO]: 0, [LIQUIDO]: 1, [GASSOSO]: 0 },
  // lo mastichi e lo inghiotti — anche un liquido si può mandare giù, e un solido si mastica
  mangiare: { [SOLIDO]: 0.85, [LIQUIDO]: 1, [GASSOSO]: 0 },
  // ci tiri su qualcosa che sta in piedi
  costruire: { [SOLIDO]: 1, [LIQUIDO]: 0, [GASSOSO]: 0 },
  // gli dai una forma e la tiene
  lavorare: { [SOLIDO]: 1, [LIQUIDO]: 0.15, [GASSOSO]: 0 },
  // lo travasi, lo spargi, lo fai colare
  versare: { [SOLIDO]: 0.1, [LIQUIDO]: 1, [GASSOSO]: 0.35 },
  // te lo trovi nei polmoni che tu lo voglia o no
  respirare: { [SOLIDO]: 0, [LIQUIDO]: 0.1, [GASSOSO]: 1 },
  // lo porti con te da un posto all'altro senza perderlo per strada
  trasportare: { [SOLIDO]: 1, [LIQUIDO]: 0.25, [GASSOSO]: 0 },
};

export function puo(azione, attr, temperatura = 0.5) {
  const t = AZIONI[azione];
  if (!t) return 1;
  return t[stato(attr, temperatura)] || 0;
}

// -------------------------------------------------------------------------------------------------
// INDOSSABILE. Essere solido è la condizione necessaria, non quella sufficiente: c'è anche il
// solido che si sbriciola (la sabbia scorre via dalle dita) e il solido così denso che una quantità
// che si veda non te la porti addosso.
// -------------------------------------------------------------------------------------------------
export function indossabile(attr, temperatura = 0.5) {
  if (!attr) return 0;
  const base = puo("indossare", attr, temperatura);
  if (base <= 0) return 0;
  // E non basta essere solidi: una cosa vicina al proprio punto di fusione è molle e tiene male la
  // forma. La cera d'ape al freddo si intaglia, d'estate si accascia — ed è la stessa cera.
  const soda = 0.45 + quantoSolido(attr, temperatura) * 0.55;
  const polvere = clamp01((attr.fragilita || 0) * 1.1 - (attr.legame || 0) * 0.9 - (attr.durezza || 0) * 0.5);
  const pesa = clamp01(((attr.peso || 0) - 0.55) * 1.5);
  return clamp01(base * soda * (1 - polvere) * (1 - pesa * 0.45));
}


// -------------------------------------------------------------------------------------------------
// QUESTA COSA TIENE UN LIQUIDO?
//
// Mancava, e senza di essa un liquido nell'inventario si comportava come un sasso: nessuno può
// portare l'acqua nelle mani, eppure la si portava. Il recipiente NON è una categoria che si
// dichiara: è la risposta a tre domande di fisica, e la risposta la danno le proprietà.
//
//   • sta in piedi?      dev'essere solido QUI (una cosa che cola non contiene niente);
//   • non beve?          se è porosa il liquido se ne va attraverso le pareti;
//   • si può cavare?     e qui ci sono tre strade, e sono le tre vere:
//                          — si plasma  (cede senza rompersi: l'argilla, i metalli battuti)
//                          — si cola    (fonde a poco e si versa in forma: vetro, stagno, bronzo)
//                          — si scava   (tenera abbastanza da svuotarla: legno, pietra dolce)
//
// Nessuno ha scritto «vaso», «otre», «anfora». Chi ha in mano qualcosa che risponde di sì a tutt'e
// tre può tenersi un liquido; chi non ce l'ha se lo perde per strada, e prima o poi qualcuno
// noterà che con certe cose in tasca l'acqua non se ne va.
export function tieneLiquidi(attr, temperatura = 0.5) {
  if (!attr) return 0;
  if (stato(attr, temperatura) !== SOLIDO) return 0;            // ciò che cola non contiene
  if (quantoSolido(attr) < 0.4) return 0;                       // né la polvere né la sabbia

  // 1) DEVE REGGERE LA PROPRIA FORMA. È il requisito che avevo dimenticato, e la misura me l'ha
  //    sbattuto in faccia: senza, il grano e la carne risultavano recipienti perfetti (0,96)
  //    perché sono teneri e quindi «facili da scavare». Ma una cosa che non sta su non contiene
  //    niente: ci vuole corpo, cioè durezza e coesione.
  const corpo = clamp01((attr.durezza || 0) * 0.7 + (attr.legame || 0) * 0.5);
  if (corpo < 0.3) return 0;

  // 2) NON DEVE BERE quel che ci metti dentro, né sbriciolarsi.
  //    (La porosità nel mondo di partenza è a zero quasi ovunque — resta qui perché le cose
  //     fabbricate la ereditano dalle miscele, e per quelle conta davvero.)
  const tenuta = (1 - (attr.porosita || 0)) * (1 - (attr.fragilita || 0) * 0.8);

  // 3) E DEVE POTERSI CAVARE. Tre strade, e sono le tre vere:
  const plasma = (attr.elasticita || 0) * (1 - (attr.fragilita || 0));            // cede senza rompersi
  const fonde = attr.tempFusione !== undefined ? attr.tempFusione : 0.5;
  const cola = clamp01(1 - fonde * 1.6);                                          // si versa in forma
  // scavare vuole una durezza DI MEZZO: il sasso è troppo duro, la carne troppo molle.
  const d = (attr.durezza || 0) - 0.42;
  const scava = Math.exp(-(d * d) / (2 * 0.28 * 0.28));
  const cavabile = Math.max(plasma, cola, scava);

  return clamp01(corpo * tenuta * cavabile * 1.7);
}
