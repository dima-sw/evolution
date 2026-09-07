// =================================================================================================
// LA PERIZIA — quello che si impara facendo.
//
// Fino a ora un guerriero valeva quanto la sua forza e la sua rabbia: uno che si batteva da dieci
// anni colpiva esattamente come uno al primo scontro. E lo stesso per tutto il resto — il mercante
// che aveva trattato mille volte spuntava gli stessi prezzi del ragazzo al primo baratto, il
// maestro alla millesima lezione insegnava come alla prima.
//
// Ma il mondo contava già tutto: `npc.azioni` tiene il conto di ogni gesto fatto in vita, dodici
// voci, da sempre. Non serviva inventare niente — serviva farlo contare.
//
// DUE COSE DA TENERE FERME:
//
//   • NON È L'ETÀ. Un vecchio che non ha mai impugnato niente non sa combattere, e un ragazzo che
//     ha passato la vita a battersi sì. Conta quello che hai FATTO, non quanto sei durato.
//
//   • RENDIMENTI CALANTI. I primi dieci colpi insegnano moltissimo, i millesimi quasi niente. È
//     così che funziona imparare, ed è anche ciò che impedisce a un veterano di diventare
//     invincibile: la distanza fra un anno e dieci è enorme, quella fra dieci e cinquanta è poca.
//
// Da qui viene da sé la cosa che si voleva: due eserciti che si scontrano non si giocano solo il
// numero, ma gli anni di mestiere che hanno addosso — e nessuno ha scritto una regola sugli eserciti.
// =================================================================================================

// QUANTO CI VUOLE A ESSERE BRAVI — e non lo decido io.
//
// La prima versione aveva un numero solo per tutto, e si è vista subito la crepa: in un mondo in
// pace il più battagliero di tutti aveva quattro scontri in vita, mentre il raccoglitore medio
// arrivava a trecento gesti. Con una scala unica i guerrieri restavano eternamente inetti e i
// raccoglitori erano tutti maestri — non perché fosse vero, ma perché avevo scelto male un numero.
//
// La scala giusta è quella che usa già il mestiere: **sei bravo rispetto a quanto e normale fra i
// tuoi**. In un mondo dove nessuno combatte, chi ha combattuto quattro volte è un veterano; in un
// mondo in guerra perpetua, quattro scontri non sono niente. La stessa cifra, due significati —
// ed è il mondo a deciderlo, non la tabella.
const _scale = new Map();
const MINIMO = 15;          // sotto questo non si scende: due gesti non fanno un maestro di niente

// Chiamata da aggiornaMedieAzioni(): il metro sociale che il mondo già teneva per i mestieri.
// Si dimentica tutto: un mondo nuovo non eredita il metro di quello vecchio.
export function scorda() { _scale.clear(); }

export function tara(medie) {
  if (!medie) return;
  for (const k in medie) _scale.set(k, Math.max(MINIMO, (medie[k] || 0) * 12));
}

export function perizia(npc, azione) {
  const n = (npc.azioni && npc.azioni[azione]) || 0;
  if (n <= 0) return 0;
  const scala = _scale.get(azione) || 240;
  return Math.min(1, Math.log1p(n) / Math.log1p(scala));
}

// Quanto la perizia moltiplica quello che fai. Uno che non ha mai fatto niente non è azzerato —
// è solo scarso: parte da `minimo` e arriva a `minimo + guadagno`.
export function bonus(npc, azione, minimo = 0.65, guadagno = 0.9) {
  return minimo + perizia(npc, azione) * guadagno;
}

// La perizia media di un gruppo in una certa cosa: serve a guardare due eserciti e capire, prima
// che si tocchino, come andrà a finire.
export function periziaMedia(gente, azione) {
  let s = 0, n = 0;
  for (const p of gente) { if (!p || !p.vivo) continue; s += perizia(p, azione); n++; }
  return n ? s / n : 0;
}

// Da quanti gesti in poi si può dire che uno «ci sa fare»: solo per l'interfaccia, per raccontare
// una perizia con una parola invece che con un numero.
export function gradoDi(v) {
  return v < 0.15 ? "alle prime armi"
    : v < 0.35 ? "pratico"
    : v < 0.6 ? "esperto"
    : v < 0.82 ? "maestro"
    : "insuperato";
}
