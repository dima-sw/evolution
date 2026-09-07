// =================================================================================================
// LE COORTI — guardare una folla senza guardarla persona per persona.
//
// Il problema, misurato: a tremilasettecento persone un battito costa 317 ms contro i 33 del ritmo
// pieno, e il disegno ne prende solo 15. Non è il canvas: è che ogni sistema del gioco scorre tutta
// la gente, uno per uno, a ogni battito. E in uno spazio che non cresce il doppio delle persone
// significa il doppio dei vicini a testa, quindi il costo sale col quadrato.
//
// LA COORTE È UNO SGUARDO, NON UNA SOSTITUZIONE. In questa prima forma gli individui ci sono tutti
// quanti, con i loro geni, la loro storia e le loro paure: cambia soltanto CHI FA LA DOMANDA A CHI.
// Prima, per sapere quanti guerrieri avesse un popolo e con che esperienza, bisognava scorrere
// millecinquecento persone; adesso lo si chiede alla coorte, che lo sa già.
//
// PERCHÉ LE CLASSI. Una media sola perde le correlazioni: se una coorte ha forza media 0,5 e perizia
// media 0,3, non si sa più che *i forti erano gli esperti*, e pescandone uno ne esce un individuo
// mai esistito. Ma dentro una classe le persone si somigliano davvero — ed è questo che salva la
// fedeltà quando un giorno si vorrà buttare via l'elenco dei membri e tenere solo le distribuzioni.
// Le classi non le invento qui: esistono già (`npc.classe`), e nascono da come la ricchezza si
// distribuisce male.
//
// Il numero di classi è una manopola: più classi, più fedeltà, meno velocità. Non è una regola del
// mondo — è la distanza da cui lo si guarda.
// =================================================================================================

import { perizia } from "./skill.js";

// Quanto è grossa una contrada, in tile. Una coorte è gente dello stesso popolo che sta nello
// stesso posto e fa lo stesso mestiere: se uno si allontana, esce dal gruppo da solo.
const CONTRADA = 24;

const AZIONI = ["combattimento", "cura", "commercio", "raccolta", "coltura", "opera",
  "insegnamento", "caccia", "costruzione", "invenzione", "esplorazione", "predicazione"];

export class Coorte {
  constructor(chiave, popolo, mestiere) {
    this.chiave = chiave;
    this.popolo = popolo;               // a che gente appartiene
    this.mestiere = mestiere;           // che cosa sa fare (null = i più, che fanno un po' di tutto)
    this.membri = [];
    this.x = 0; this.y = 0;
    this.classi = new Map();            // classe -> statistiche di quella classe
    this.perizie = {};                  // mestiere -> perizia media
  }

  get n() { return this.membri.length; }

  // Rifà i conti. Una passata sola sui membri, e da lì tutti rispondono senza più toccarli.
  aggiorna() {
    const m = this.membri;
    if (!m.length) return;
    let x = 0, y = 0, sal = 0, fame = 0, mal = 0, lea = 0, eta = 0, forza = 0;
    const perClasse = new Map();
    for (const p of m) {
      x += p.x; y += p.y; sal += p.salute; fame += p.fame;
      mal += p.malcontento; lea += p.emo.lealta; eta += p.eta; forza += p.forza;
      const c = p.classe || "povero";
      let cl = perClasse.get(c);
      if (!cl) { cl = { n: 0, forza: 0, coraggio: 0, salute: 0, perizia: 0, eta: 0 }; perClasse.set(c, cl); }
      cl.n++; cl.forza += p.forza; cl.coraggio += p.coraggio; cl.salute += p.salute; cl.eta += p.eta;
      if (this.mestiere) cl.perizia += perizia(p, this.mestiere);
    }
    const k = m.length;
    this.x = x / k; this.y = y / k;
    this.salute = sal / k; this.fame = fame / k; this.malcontento = mal / k;
    this.lealta = lea / k; this.eta = eta / k; this.forza = forza / k;
    for (const [nome, cl] of perClasse) {
      cl.forza /= cl.n; cl.coraggio /= cl.n; cl.salute /= cl.n; cl.eta /= cl.n; cl.perizia /= cl.n;
    }
    this.classi = perClasse;
    // le perizie: quanto ne sa questa gente, mestiere per mestiere
    for (const a of AZIONI) {
      let s = 0;
      for (const p of m) s += perizia(p, a);
      this.perizie[a] = s / k;
    }
  }

  // QUANTO PESA IN BATTAGLIA. Il numero conta, ma non da solo: contano gli anni di mestiere che
  // questa gente ha addosso, la sua forza, la sua salute e il suo animo. Due schiere della stessa
  // grandezza non valgono lo stesso, ed è quello che si voleva.
  pesoInBattaglia() {
    if (!this.n) return 0;
    const esperienza = this.perizie.combattimento || 0;
    return this.n * (0.35 + this.forza * 0.5) * (0.6 + esperienza * 1.0)
      * (0.5 + this.salute * 0.5) * (0.7 + this.lealta * 0.45);
  }

  // Come si racconta, in una riga.
  descrizione() {
    const cl = [...this.classi].sort((a, b) => b[1].n - a[1].n)
      .map(([nome, c]) => `${nome} ×${c.n}`).join(", ");
    return `${this.n} ${this.mestiere || "che fanno di tutto"} — ${cl}`;
  }
}

// Raggruppa la gente viva per popolo + contrada + mestiere. Chi sta da solo o si allontana finisce
// in una coorte di uno: nessuno è costretto a stare in un gruppo.
export function raggruppa(pop) {
  const g = new Map();
  for (const n of pop.npcs) {
    if (!n.vivo) continue;
    const cella = ((n.x / CONTRADA) | 0) + "," + ((n.y / CONTRADA) | 0);
    const popolo = n.identita != null ? n.identita : "-";
    const chiave = popolo + "|" + cella + "|" + (n.mestiere || "-");
    let c = g.get(chiave);
    if (!c) { c = new Coorte(chiave, popolo, n.mestiere || null); g.set(chiave, c); }
    c.membri.push(n);
  }
  for (const c of g.values()) c.aggiorna();
  return g;
}

// Le coorti di un popolo, dalla più grossa alla più piccola.
export function coortiDi(coorti, popolo) {
  const out = [];
  for (const c of coorti.values()) if (c.popolo === popolo) out.push(c);
  out.sort((a, b) => b.n - a.n);
  return out;
}

// Chi vincerebbe, e quanto nettamente. Non decide niente: risponde soltanto, e chi vuole può
// usarlo — un capo per sapere se conviene attaccare, il motore per risolvere uno scontro senza
// far combattere mille persone una per una.
export function esitoScontro(a, b) {
  const pa = a.pesoInBattaglia(), pb = b.pesoInBattaglia();
  const tot = pa + pb;
  if (tot <= 0) return { chiVince: null, nettezza: 0 };
  const q = pa / tot;
  return {
    chiVince: q > 0.5 ? a : b,
    nettezza: Math.abs(q - 0.5) * 2,      // 0 = testa a testa, 1 = massacro
    quota: q,
  };
}
