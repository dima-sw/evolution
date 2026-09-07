// =================================================================================================
// LA TEMPRA — quello che la vita fa a una persona.
//
// Fin qui uno nasceva con certi tratti e moriva con gli stessi. Poteva passare quarant'anni a
// spaccarsi la schiena senza cavarne niente, o vivere nel terrore, o comandare senza che nessuno
// osasse contraddirlo: alla fine era esattamente l'uomo di prima. È l'ultima cosa grossa che
// mancava, perché una vita che non ti cambia non è una vita.
//
// LA DISTINZIONE CHE REGGE TUTTO: i **geni** restano quelli della nascita — sono la stirpe, e i
// figli ereditano da quelli, non dal padre consumato. Quello che deriva è la **persona**. Il tratto
// si sposta, il genoma no, e quando la pressione cessa il tratto torna piano verso ciò che eri.
// Non è Lamarck: è che gli uomini si logorano e si rinfrancano, e i figli ricominciano.
//
// Sono tutte leggi di livello 3 (psicologia), e nessuna è inventata da me — sono cose osservate:
//
//   • L'IMPOTENZA APPRESA. Chi si sfianca a lungo senza cavarne niente smette di provarci: la
//     volontà cala. È il fenomeno meglio documentato di tutta la psicologia, e qui viene da sé —
//     basta guardare chi lavora tanto e resta povero.
//   • LA MENTE DELLA SCARSITÀ. Chi ha patito la fame a lungo diventa avido anche quando il pane
//     torna: l'ha imparato quando non c'era.
//   • IL PARADOSSO DEL POTERE. Chi è a lungo obbedito perde la capacità di mettersi nei panni
//     altrui, e monta in superbia. Non è cattiveria: è che non gli serve più capire nessuno.
//   • LA PAURA CHE RESTA. Vivere a lungo nel timore consuma il coraggio, e non torna con la calma.
//   • LA SICUREZZA CHE APRE. Chi sta al sicuro e sazio si mette a curiosare: si esplora quando non
//     si ha paura.
//
// E qui sta il perché di tutto questo. Un capo non è una scatola vuota che riceve un'indole a
// sorte: è **un uomo fatto dalla vita che ha avuto**. Uno cresciuto nel terrore diventa un capo che
// teme, e uno che teme reprime, e uno che reprime fa nascere la censura e la legge marziale —
// senza che nessuna di quelle parole sia scritta da nessuna parte.
// =================================================================================================

import { P } from "./params.js";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Come si chiama, nel genoma, un tratto che nella persona ha un altro nome.
const GENE = { lealtaT: "lealta", invidiaT: "invidia", iraT: "ira" };
function innato(npc, tratto) {
  const k = GENE[tratto] || tratto;
  const v = npc.genes ? npc.genes[k] : undefined;
  return v === undefined ? (npc[tratto] ?? 0.5) : v;   // se il gene non c'è, l'ancora è ciò che sei
}

// Quanto lontano può portarti la vita da ciò che eri. Oltre questo non si va: uno non diventa
// un altro uomo, diventa una versione di sé segnata.
const LIMITE = 0.32;

// Quanto in fretta. La costante di tempo è di una trentina d'anni: una persona non cambia in una
// stagione — chi cambia in una stagione non è cambiato, si è solo spaventato — ma in una vita sì.
// (Tarato dopo la misura: col valore di prima ci volevano cent'anni, e un regno di trenta arrivava
// appena a un quarto della deriva. La vita non faceva quasi in tempo a segnare nessuno.)
const RITMO = 0.035;

// Sposta un tratto verso `verso`, senza mai staccarsi troppo da com'era alla nascita.
export function piega(npc, tratto, verso, forza, dt) {
  const nato = innato(npc, tratto);
  const ora = npc[tratto] ?? nato;
  const meta = clamp01(nato + Math.max(-LIMITE, Math.min(LIMITE, verso * LIMITE)));
  npc[tratto] = clamp01(ora + (meta - ora) * forza * RITMO * dt);
}

// E quando la pressione cessa, si torna piano verso sé stessi. Non del tutto e non in fretta: le
// cicatrici restano, ma un uomo lasciato in pace si rinfranca.
function rinfranca(npc, tratto, dt) {
  const nato = innato(npc, tratto);
  const ora = npc[tratto] ?? nato;
  npc[tratto] = ora + (nato - ora) * 0.35 * RITMO * dt;
}

const TRATTI = ["volonta", "coraggio", "avidita", "superbia", "empatia", "curiosita",
  "lealtaT", "ambizione", "pazienza", "socievolezza"];

export function stepTempra(pop, dt) {
  if (P.tempraSpenta) return;
  const TURNI = 4;                    // come tutto il resto del lavoro per-persona: a turni
  pop._turnoTempra = ((pop._turnoTempra || 0) + 1) % TURNI;
  const passo = dt * TURNI;

  for (let i = pop._turnoTempra; i < pop.npcs.length; i += TURNI) {
    const npc = pop.npcs[i];
    if (!npc || !npc.vivo || npc.eta < 8) continue;   // i bambini non si sono ancora fatti

    // Le pressioni che uno ha addosso in questo momento, ognuna fra 0 e 1.
    const sfinito = clamp01(npc.stanchezza - 0.55) * 2;
    const senzaFrutto = clamp01(0.45 - (npc.emo.soddisfazione || 0.4)) * 2;
    const timore = clamp01(npc.emo.paura - 0.3) * 1.6;
    const digiuno = clamp01(npc.fame - 0.5) * 2;
    const sazioESicuro = clamp01(0.35 - npc.fame) * clamp01(0.3 - npc.emo.paura) * 6;
    const obbedito = npc._isLeader ? clamp01(0.4 + (npc._consenso ?? 0.5)) : 0;
    const calpestato = clamp01(npc.malcontento - 0.4) * 1.7;

    let toccato = false;

    // L'IMPOTENZA APPRESA: fatica tanta, frutto nessuno. Smette di volere.
    const vano = Math.min(sfinito, senzaFrutto);
    if (vano > 0.05) { piega(npc, "volonta", -1, vano, passo); piega(npc, "pazienza", -0.6, vano, passo); toccato = true; }

    // LA PAURA CHE RESTA.
    if (timore > 0.05) { piega(npc, "coraggio", -1, timore, passo); piega(npc, "socievolezza", -0.5, timore, passo); toccato = true; }

    // LA MENTE DELLA SCARSITÀ: chi ha patito la fame la tiene addosso anche da sazio.
    if (digiuno > 0.05) { piega(npc, "avidita", 1, digiuno, passo); toccato = true; }

    // LA SICUREZZA CHE APRE.
    if (sazioESicuro > 0.05) { piega(npc, "curiosita", 1, sazioESicuro * 0.7, passo); toccato = true; }

    // IL PARADOSSO DEL POTERE: chi è a lungo obbedito smette di capire gli altri.
    if (obbedito > 0.05) {
      piega(npc, "superbia", 1, obbedito, passo);
      piega(npc, "empatia", -0.8, obbedito, passo);
      piega(npc, "ambizione", 0.6, obbedito, passo);
      toccato = true;
    }

    // CHI VIENE CALPESTATO smette di essere leale, e non torna indietro solo perché smettono.
    if (calpestato > 0.05) { piega(npc, "lealtaT", -1, calpestato, passo); toccato = true; }

    // E se non gli sta succedendo niente, si rinfranca.
    if (!toccato) for (const t of TRATTI) rinfranca(npc, t, passo);
  }
}

// Quanto una persona si è allontanata da com'era nata: serve solo a raccontarlo.
export { innato };

export function segnata(npc) {
  if (!npc.genes) return 0;
  let s = 0, n = 0;
  for (const t of TRATTI) {
    const nato = innato(npc, t);
    s += Math.abs((npc[t] ?? nato) - nato); n++;
  }
  return n ? s / n : 0;
}

// Che cosa la vita le ha fatto, in parole: per l'interfaccia.
export function comeLHaCambiata(npc) {
  if (!npc.genes) return null;
  let peggio = null, delta = 0;
  for (const t of TRATTI) {
    const nato = innato(npc, t);
    const d = (npc[t] ?? nato) - nato;
    if (Math.abs(d) > Math.abs(delta)) { delta = d; peggio = t; }
  }
  if (!peggio || Math.abs(delta) < 0.04) return null;
  const NOMI = {
    volonta: ["si è arreso", "si è indurito"], coraggio: ["ha imparato la paura", "ha trovato coraggio"],
    avidita: ["ha imparato a stringere", "ha imparato a lasciare"],
    superbia: ["si è insuperbito", "si è fatto umile"],
    empatia: ["ha smesso di capire gli altri", "ha imparato a capire"],
    curiosita: ["ha smesso di guardarsi intorno", "ha preso a guardarsi intorno"],
    lealtaT: ["non si fida più", "ha imparato a fidarsi"],
    ambizione: ["ha smesso di volere", "ha preso gusto al comando"],
    pazienza: ["ha perso la pazienza", "ha imparato ad aspettare"],
    socievolezza: ["si è chiuso", "si è aperto"],
  };
  const voce = NOMI[peggio];
  return voce ? voce[delta < 0 ? 0 : 1] : null;
}
