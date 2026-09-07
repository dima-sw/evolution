// =================================================================================================
// LA STORIA, DISEGNATA.
//
// Tre tipi di figura, e ognuno risponde a una domanda diversa:
//
//   LINEA   — come è cambiata una cosa. Per i totali che crescono e basta (nascite, morti,
//             battaglie) non si disegna il totale ma il RITMO: «sono nati in tutto 1 400» non dice
//             niente, «nascono quanti ne muoiono» dice tutto.
//   PILA    — di che cosa è fatto un insieme. I ceti, le bestie: qui conta la proporzione, e una
//             linea per ognuno la nasconderebbe.
//   ISTOGRAMMA — com'è distribuita una cosa ADESSO. È il riquadro più importante di tutti, perché
//             una media non è una società: un popolo con metà gente sazia e metà che muore ha la
//             stessa fame media di uno in cui stanno tutti così così, e sono due mondi diversi.
//
// Niente librerie: Canvas e basta, come il resto del progetto.
// =================================================================================================

import { distribuzione } from "./storia.js";

const COL = {
  testo: "#d7dde6", muto: "#8b95a4", linea: "#2a3140", fondo: "#161b22",
  blu: "#4c8bf5", verde: "#4caf6a", ambra: "#e0a030", rosso: "#e5534b",
  viola: "#a273e8", ciano: "#3fc3d0", rosa: "#e06c9f", oliva: "#9bb04a",
};

// -------------------------------------------------------------------------------------------------
// I RIQUADRI. Sono ordinati come si racconta una storia: prima chi c'è, poi come sta, poi come si è
// organizzato, poi che cosa sa, poi che cosa ha attorno.
// -------------------------------------------------------------------------------------------------
export const RIQUADRI = [
  { tipo: "linea", titolo: "Quanti sono", nota: "La curva di una civiltà: cresce finché la terra regge.",
    serie: [{ k: "vivi", nome: "Vivi", c: COL.blu }] },
  { tipo: "linea", titolo: "Nascite e morti", nota: "Il ritmo, non il totale. Quando le due si toccano, il popolo ha smesso di crescere.",
    serie: [{ k: "nascite", nome: "Nascite", c: COL.verde, ritmo: true }, { k: "morti", nome: "Morti", c: COL.rosso, ritmo: true }] },
  { tipo: "isto", quale: "eta", titolo: "Come sono distribuite le età", c: COL.blu,
    nota: "La forma di una popolazione. Una base larga è un popolo giovane; una gobba in mezzo è una generazione sopravvissuta a qualcosa." },
  { tipo: "isto", quale: "fame", titolo: "Come è distribuita la fame", c: COL.ambra,
    nota: "Il riquadro che una media non può darti. Due gobbe = c'è chi mangia e chi no." },
  { tipo: "linea", titolo: "Fame e sete medie", nota: "Le medie, per confronto con la distribuzione qui accanto.",
    serie: [{ k: "fame", nome: "Fame", c: COL.ambra }, { k: "sete", nome: "Sete", c: COL.ciano }] },
  { tipo: "pila", titolo: "I ceti", nota: "Non sono definiti da nessuna parte: sono la fotografia della disuguaglianza.",
    serie: [{ k: "nobili", nome: "Nobili", c: COL.ambra }, { k: "agiati", nome: "Agiati", c: COL.verde },
            { k: "poveri", nome: "Poveri", c: COL.blu }, { k: "servi", nome: "Servi", c: COL.rosso }] },
  { tipo: "isto", quale: "agiatezza", titolo: "Quanto ognuno sta sopra i suoi", c: COL.ambra,
    nota: "1 = come la media del suo popolo. La coda a destra è la ricchezza che si concentra." },
  { tipo: "linea", titolo: "Disuguaglianza", nota: "0 = tutti uguali. Sale quando la ricchezza si concentra in pochi.",
    serie: [{ k: "disug", nome: "Disuguaglianza", c: COL.rosso }] },
  { tipo: "linea", titolo: "Servitù: chi entra e chi esce", nota: "Dalla dipendenza si esce ribellandosi, o perché il padrone muore.",
    serie: [{ k: "costretti", nome: "Sottomessi", c: COL.rosso, ritmo: true },
            { k: "liberatisi", nome: "Ribellatisi", c: COL.verde, ritmo: true },
            { k: "orfani", nome: "Padrone morto", c: COL.muto, ritmo: true }] },
  { tipo: "linea", titolo: "Quanti popoli", nota: "Nascono dai legami, non da una regola: si uniscono e si spezzano.",
    serie: [{ k: "fazioni", nome: "Popoli", c: COL.viola }] },
  { tipo: "linea", titolo: "Dare e prendere", nota: "Il dono e il tributo sono lo stesso gesto con due moventi opposti.",
    serie: [{ k: "doni", nome: "Doni", c: COL.verde, ritmo: true }, { k: "tributi", nome: "Tributi", c: COL.ambra, ritmo: true },
            { k: "estorsioni", nome: "Estorsioni", c: COL.rosso, ritmo: true }] },
  { tipo: "linea", titolo: "La legge", nota: "La norma si rafforza quando qualcuno punisce, si sfalda quando nessuno lo fa.",
    serie: [{ k: "normaFurto", nome: "Quanto si sente", c: COL.blu },
            { k: "punizioni", nome: "Punizioni", c: COL.rosso, ritmo: true, asseDestro: true }] },
  { tipo: "linea", titolo: "La guerra", nota: "",
    serie: [{ k: "battaglie", nome: "Battaglie", c: COL.rosso, ritmo: true },
            { k: "razzie", nome: "Razzie", c: COL.ambra, ritmo: true },
            { k: "caseDistrutte", nome: "Case distrutte", c: COL.muto, ritmo: true }] },
  { tipo: "linea", titolo: "Che cosa si sa", nota: "Le materie non sono in un elenco: vengono scoperte combinando.",
    serie: [{ k: "materie", nome: "Materie", c: COL.ciano }, { k: "falseCredenze", nome: "False credenze", c: COL.rosso }] },
  { tipo: "linea", titolo: "Le lingue", nota: "Parlarsi avvicina, l'isolamento allontana. Quando divergono troppo non ci si capisce più.",
    serie: [{ k: "lessici", nome: "Lingue", c: COL.viola }, { k: "dialetti", nome: "Parlate", c: COL.rosa }] },
  { tipo: "isto", quale: "lingua", titolo: "Come è distribuita la lingua", c: COL.viola,
    nota: "Ogni gobba separata è un popolo che non capisce più gli altri." },
  { tipo: "linea", titolo: "Quel che resta", nota: "Miti, tradizioni, opere: la memoria che una civiltà si costruisce.",
    serie: [{ k: "miti", nome: "Miti", c: COL.ambra }, { k: "tradizioni", nome: "Tradizioni", c: COL.verde },
            { k: "artefatti", nome: "Artefatti", c: COL.viola }] },
  { tipo: "linea", titolo: "Le voci", nota: "Le chiacchiere si spengono in fretta, ma una voce persistente rovina una reputazione.",
    serie: [{ k: "voci", nome: "In giro", c: COL.rosa }, { k: "calunnie", nome: "Calunnie", c: COL.rosso, ritmo: true }] },
  { tipo: "pila", titolo: "Le bestie", nota: "Nessuno decide quanti predatori ci sono: lo decide quanti erbivori trovano.",
    serie: [{ k: "erbivori", nome: "Erbivori", c: COL.verde }, { k: "onnivori", nome: "Onnivori", c: COL.oliva },
            { k: "predatori", nome: "Predatori", c: COL.rosso }, { k: "pesci", nome: "Pesci", c: COL.ciano },
            { k: "predMarini", nome: "Pred. marini", c: COL.blu }] },
  { tipo: "linea", titolo: "Come stanno cambiando le bestie", nota: "Taglia e carnivoria non sono scelte: sono quel che è sopravvissuto.",
    serie: [{ k: "tagliaErb", nome: "Taglia erbivori", c: COL.verde }, { k: "tagliaPred", nome: "Taglia predatori", c: COL.rosso },
            { k: "carnivoria", nome: "Carnivoria", c: COL.ambra }] },
  { tipo: "linea", titolo: "La terra", nota: "La vegetazione cala dove si raccoglie troppo; la fertilità è la memoria di quel consumo.",
    serie: [{ k: "fertilita", nome: "Fertilità", c: COL.verde }, { k: "inquinamento", nome: "Cicatrici", c: COL.rosso },
            { k: "esplorato", nome: "Esplorato", c: COL.ciano }] },
  { tipo: "linea", titolo: "Quanto verde c'è", nota: "",
    serie: [{ k: "vegetazione", nome: "Vegetazione", c: COL.verde }] },
  { tipo: "linea", titolo: "Che gente è diventata", nota: "I tratti medi non sono impostati: sono quel che la selezione ha lasciato.",
    serie: [{ k: "aggressivita", nome: "Aggressività", c: COL.rosso }, { k: "empatia", nome: "Empatia", c: COL.verde },
            { k: "avidita", nome: "Avidità", c: COL.ambra }, { k: "onesta", nome: "Onestà", c: COL.blu },
            { k: "curiosita", nome: "Curiosità", c: COL.ciano }] },
  { tipo: "linea", titolo: "L'umore del mondo", nota: "",
    serie: [{ k: "gioia", nome: "Gioia", c: COL.verde }, { k: "paura", nome: "Paura", c: COL.viola },
            { k: "rabbia", nome: "Rabbia", c: COL.rosso }, { k: "lealta", nome: "Lealtà", c: COL.blu }] },
  { tipo: "linea", titolo: "Malattia", nota: "Il contagio dipende da quanto si sta vicini: le epidemie sono figlie delle città.",
    serie: [{ k: "infetti", nome: "Infetti", c: COL.rosso }, { k: "immunita", nome: "Immunità media", c: COL.verde, asseDestro: true }] },
  { tipo: "linea", titolo: "Il tetto e il focolare", nota: "",
    serie: [{ k: "conCasa", nome: "Con una casa", c: COL.ambra }, { k: "campi", nome: "Campi", c: COL.verde },
            { k: "strade", nome: "Sentieri", c: COL.muto }] },
  { tipo: "isto", quale: "sapere", titolo: "Quanto sa ognuno", c: COL.ciano,
    nota: "Se la coda a destra si allunga, il sapere si sta concentrando in pochi maestri." },
  { tipo: "isto", quale: "salute", titolo: "Come è distribuita la salute", c: COL.verde, nota: "" },
];

// -------------------------------------------------------------------------------------------------
// DISEGNO
// -------------------------------------------------------------------------------------------------
const nf = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
const fmt = (v) => (Math.abs(v) >= 1000 ? nf.format(Math.round(v)) : nf.format(Math.round(v * 100) / 100));

// Tacche "tonde": un asse che dice 0 · 250 · 500 si legge, uno che dice 0 · 237 · 474 no.
function tacche(min, max, quante = 4) {
  if (!(max > min)) { max = min + 1; }
  const grezzo = (max - min) / quante;
  const mag = Math.pow(10, Math.floor(Math.log10(grezzo)));
  const n = grezzo / mag;
  const passo = (n >= 7.5 ? 10 : n >= 3.5 ? 5 : n >= 1.5 ? 2 : 1) * mag;
  const out = [];
  for (let v = Math.ceil(min / passo) * passo; v <= max + 1e-9; v += passo) out.push(v);
  return out;
}

function pulisci(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
}

// La cornice comune: assi, griglia, e le ERE segnate come linee verticali. Un salto in un grafico
// senza il fatto che l'ha causato è solo una curva strana.
function cornice(ctx, box, xMin, xMax, yMin, yMax, eventi, yDestro) {
  const { x, y, w, h } = box;
  ctx.strokeStyle = COL.linea; ctx.lineWidth = 1;
  ctx.fillStyle = COL.muto; ctx.font = "10px Segoe UI, system-ui, sans-serif";
  for (const t of tacche(yMin, yMax)) {
    const py = Math.round(y + h - (t - yMin) / (yMax - yMin || 1) * h) + 0.5;
    ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke();
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.fillText(fmt(t), x - 5, py);
  }
  if (yDestro) {
    ctx.fillStyle = yDestro.c;
    for (const t of tacche(yDestro.min, yDestro.max)) {
      const py = Math.round(y + h - (t - yDestro.min) / (yDestro.max - yDestro.min || 1) * h) + 0.5;
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(fmt(t), x + w + 5, py);
    }
  }
  // le ere
  if (eventi && eventi.length && xMax > xMin) {
    ctx.save();
    ctx.setLineDash([2, 3]);
    for (const e of eventi) {
      if (e.anno < xMin || e.anno > xMax) continue;
      const px = Math.round(x + (e.anno - xMin) / (xMax - xMin) * w) + 0.5;
      ctx.strokeStyle = "#3d4657";
      ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + h); ctx.stroke();
    }
    ctx.restore();
  }
  // asse x
  ctx.fillStyle = COL.muto; ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText("anno " + fmt(xMin), x, y + h + 4);
  ctx.textAlign = "right";
  ctx.fillText(fmt(xMax), x + w, y + h + 4);
}

function traccia(ctx, box, xs, ys, xMin, xMax, yMin, yMax, colore, riempi) {
  if (xs.length < 2) return;
  const { x, y, w, h } = box;
  const px = (v) => x + (xMax > xMin ? (v - xMin) / (xMax - xMin) : 0) * w;
  const py = (v) => y + h - (yMax > yMin ? (v - yMin) / (yMax - yMin) : 0) * h;
  ctx.beginPath();
  ctx.moveTo(px(xs[0]), py(ys[0]));
  for (let i = 1; i < xs.length; i++) ctx.lineTo(px(xs[i]), py(ys[i]));
  if (riempi) {
    ctx.lineTo(px(xs[xs.length - 1]), y + h);
    ctx.lineTo(px(xs[0]), y + h);
    ctx.closePath();
    ctx.fillStyle = riempi; ctx.fill();
  } else {
    ctx.strokeStyle = colore; ctx.lineWidth = 1.6; ctx.lineJoin = "round"; ctx.stroke();
  }
}

function legenda(ctx, box, voci) {
  let x = box.x, y = box.y - 14;
  ctx.font = "10.5px Segoe UI, system-ui, sans-serif";
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  for (const v of voci) {
    ctx.fillStyle = v.c;
    ctx.fillRect(x, y - 3, 8, 3);
    ctx.fillStyle = COL.muto;
    ctx.fillText(v.nome, x + 12, y);
    x += 12 + ctx.measureText(v.nome).width + 14;
  }
}

// — un riquadro a linee ————————————————————————————————————————————————————————————————————————
function disegnaLinee(ctx, W, H, r, storia, finestra) {
  const box = { x: 44, y: 22, w: W - (r.serie.some((s) => s.asseDestro) ? 88 : 56), h: H - 44 };
  const dati = [];
  let yMin = Infinity, yMax = -Infinity, xMin = Infinity, xMax = -Infinity;
  let dMin = Infinity, dMax = -Infinity, colDestro = COL.muto;
  const passo = Math.max(1, Math.ceil(finestra / Math.max(60, box.w)));
  for (const s of r.serie) {
    const d = s.ritmo ? storia.leggiRitmo(s.k, finestra, passo) : storia.leggi(s.k, finestra, passo);
    dati.push({ ...s, ...d });
    for (const v of d.x) { if (v < xMin) xMin = v; if (v > xMax) xMax = v; }
    for (const v of d.y) {
      if (s.asseDestro) { if (v < dMin) dMin = v; if (v > dMax) dMax = v; }
      else { if (v < yMin) yMin = v; if (v > yMax) yMax = v; }
    }
    if (s.asseDestro) colDestro = s.c;
  }
  if (!isFinite(yMin)) { yMin = 0; yMax = 1; }
  if (!isFinite(xMin)) return null;
  // Lo zero va SEMPRE incluso quando i numeri sono positivi: un asse che parte da 980 fa sembrare
  // una catastrofe una variazione dell'1%.
  if (yMin > 0) yMin = 0;
  if (yMax <= yMin) yMax = yMin + 1;
  yMax += (yMax - yMin) * 0.08;
  const yDestro = isFinite(dMin) ? { min: dMin > 0 ? 0 : dMin, max: dMax > dMin ? dMax * 1.08 : dMin + 1, c: colDestro } : null;
  cornice(ctx, box, xMin, xMax, yMin, yMax, storia.eventi, yDestro);
  for (const d of dati) {
    const a = d.asseDestro ? yDestro.min : yMin, b = d.asseDestro ? yDestro.max : yMax;
    traccia(ctx, box, d.x, d.y, xMin, xMax, a, b, d.c);
  }
  legenda(ctx, box, r.serie.map((s) => ({ nome: s.nome + (s.ritmo ? " (ritmo)" : "") + (s.asseDestro ? " →" : ""), c: s.c })));
  return { box, xMin, xMax, yMin, yMax, dati, yDestro };
}

// — un riquadro a pila ——————————————————————————————————————————————————————————————————————————
function disegnaPila(ctx, W, H, r, storia, finestra) {
  const box = { x: 44, y: 22, w: W - 56, h: H - 44 };
  const passo = Math.max(1, Math.ceil(finestra / Math.max(60, box.w)));
  const dati = r.serie.map((s) => ({ ...s, ...storia.leggi(s.k, finestra, passo) }));
  if (!dati.length || !dati[0].x.length) return null;
  const n = Math.min(...dati.map((d) => d.y.length));
  const xs = dati[0].x.slice(0, n);
  const xMin = xs[0], xMax = xs[n - 1];
  const cum = new Array(n).fill(0);
  let yMax = 0;
  for (let i = 0; i < n; i++) { let t = 0; for (const d of dati) t += d.y[i]; if (t > yMax) yMax = t; }
  if (yMax <= 0) yMax = 1;
  cornice(ctx, box, xMin, xMax, 0, yMax, storia.eventi, null);
  // dal basso verso l'alto, ognuna sopra la precedente
  for (const d of dati) {
    const sotto = cum.slice();
    for (let i = 0; i < n; i++) cum[i] += d.y[i];
    const px = (v) => box.x + (xMax > xMin ? (v - xMin) / (xMax - xMin) : 0) * box.w;
    const py = (v) => box.y + box.h - v / yMax * box.h;
    ctx.beginPath();
    ctx.moveTo(px(xs[0]), py(sotto[0]));
    for (let i = 0; i < n; i++) ctx.lineTo(px(xs[i]), py(cum[i]));
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(px(xs[i]), py(sotto[i]));
    ctx.closePath();
    ctx.fillStyle = d.c + "cc"; ctx.fill();
    ctx.strokeStyle = d.c; ctx.lineWidth = 1; ctx.stroke();
  }
  legenda(ctx, box, r.serie);
  return { box, xMin, xMax, yMin: 0, yMax, dati, pila: true };
}

// — un istogramma ————————————————————————————————————————————————————————————————————————————————
function disegnaIsto(ctx, W, H, r, pop) {
  const box = { x: 44, y: 22, w: W - 56, h: H - 44 };
  const d = distribuzione(pop, r.quale);
  if (!d.n) return null;
  const yMax = Math.max(...d.conti) || 1;
  cornice(ctx, box, d.min, d.max, 0, yMax, null, null);
  const larg = box.w / d.conti.length;
  for (let i = 0; i < d.conti.length; i++) {
    const h = d.conti[i] / yMax * box.h;
    ctx.fillStyle = (r.c || COL.blu) + "cc";
    ctx.fillRect(box.x + i * larg + 0.5, box.y + box.h - h, Math.max(1, larg - 1.5), h);
  }
  // la mediana: dove sta la metà della gente. Dice più della media quando la forma è storta.
  let cum = 0, mediana = d.min;
  const meta = d.n / 2;
  for (let i = 0; i < d.conti.length; i++) {
    cum += d.conti[i];
    if (cum >= meta) { mediana = d.bordi[i] + (d.bordi[i + 1] - d.bordi[i]) / 2; break; }
  }
  const px = box.x + (mediana - d.min) / (d.max - d.min || 1) * box.w;
  ctx.strokeStyle = COL.testo; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = COL.testo; ctx.font = "10px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = px > box.x + box.w * 0.7 ? "right" : "left"; ctx.textBaseline = "top";
  ctx.fillText(" metà sta qui: " + fmt(mediana), px, box.y + 2);
  return { box, isto: d };
}

// -------------------------------------------------------------------------------------------------
// IL PANNELLO
// -------------------------------------------------------------------------------------------------
export class Grafici {
  constructor(contenitore, prendiStoria, prendiPop) {
    this.el = contenitore;
    this.storia = prendiStoria;
    this.pop = prendiPop;
    this.finestra = 4000;             // quanti campioni indietro guardare
    this.carte = [];
    this.visibili = new Set();
    this.costruisci();
  }

  costruisci() {
    this.el.innerHTML = "";
    const barra = document.createElement("div");
    barra.className = "gr-barra";
    barra.innerHTML =
      '<span class="gr-tit">La storia di questo mondo</span>' +
      '<span class="gr-sub" id="grSub"></span>' +
      '<span class="tb-group segmented" id="grFinestra">' +
      '<button data-f="200">Ultimo tratto</button>' +
      '<button data-f="1000">Ultimo tempo</button>' +
      '<button data-f="4000" class="active">Tutto</button></span>';
    this.el.appendChild(barra);
    barra.querySelectorAll("#grFinestra button").forEach((b) => {
      b.addEventListener("click", () => {
        barra.querySelectorAll("#grFinestra button").forEach((o) => o.classList.remove("active"));
        b.classList.add("active");
        this.finestra = +b.dataset.f;
        this.disegna(true);
      });
    });

    const griglia = document.createElement("div");
    griglia.className = "gr-griglia";
    this.el.appendChild(griglia);

    const oss = new IntersectionObserver((voci) => {
      // NON SI DISEGNA CIÒ CHE NON SI VEDE. Con trenta riquadri, disegnarli tutti a ogni
      // aggiornamento vorrebbe dire rubare tempo alla simulazione per pixel che nessuno guarda.
      for (const v of voci) {
        if (v.isIntersecting) this.visibili.add(v.target._i);
        else this.visibili.delete(v.target._i);
      }
    }, { root: this.el, rootMargin: "150px" });

    RIQUADRI.forEach((r, i) => {
      const carta = document.createElement("div");
      carta.className = "gr-carta";
      carta._i = i;
      const h = document.createElement("div");
      h.className = "gr-h";
      h.innerHTML = "<b>" + r.titolo + "</b>" + (r.nota ? "<i>" + r.nota + "</i>" : "");
      const cv = document.createElement("canvas");
      const leg = document.createElement("div");
      leg.className = "gr-val";
      carta.append(h, cv, leg);
      griglia.appendChild(carta);
      oss.observe(carta);
      this.carte.push({ r, carta, cv, leg, ctx: cv.getContext("2d"), ultimo: null });
      cv.addEventListener("mousemove", (e) => this.punta(i, e));
      cv.addEventListener("mouseleave", () => { this.carte[i].leg.textContent = ""; this.disegnaUna(i); });
    });
  }

  // Il valore sotto il dito. Un grafico che non si può interrogare è un disegno, non uno strumento.
  punta(i, e) {
    const c = this.carte[i];
    if (!c.ultimo || !c.ultimo.box) return;
    const rect = c.cv.getBoundingClientRect();
    const mx = (e.clientX - rect.left);
    const { box, xMin, xMax, dati, isto } = c.ultimo;
    if (isto) {
      const f = (mx - box.x) / box.w;
      const j = Math.max(0, Math.min(isto.conti.length - 1, (f * isto.conti.length) | 0));
      c.leg.innerHTML = "<span>" + fmt(isto.bordi[j]) + " – " + fmt(isto.bordi[j + 1]) + "</span> · <b>" +
        isto.conti[j] + "</b> persone";
      return;
    }
    if (!dati || !dati.length) return;
    const f = Math.max(0, Math.min(1, (mx - box.x) / box.w));
    const anno = xMin + f * (xMax - xMin);
    let j = 0, best = Infinity;
    for (let k = 0; k < dati[0].x.length; k++) {
      const d = Math.abs(dati[0].x[k] - anno);
      if (d < best) { best = d; j = k; }
    }
    c.leg.innerHTML = "<span>anno " + fmt(dati[0].x[j]) + "</span> · " +
      dati.map((d) => '<b style="color:' + d.c + '">' + d.nome + " " + fmt(d.y[j] || 0) + "</b>").join(" · ");
    this.disegnaUna(i);
    // il filo verticale
    const ctx = c.ctx, px = box.x + (dati[0].x[j] - xMin) / (xMax - xMin || 1) * box.w;
    ctx.save(); ctx.strokeStyle = "#5a657a"; ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(px, box.y); ctx.lineTo(px, box.y + box.h); ctx.stroke(); ctx.restore();
  }

  dimensiona(c) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.carta.clientWidth - 20, h = 150;
    if (w <= 0) return false;
    if (c.cv.width !== (w * dpr) | 0 || c.cv.height !== (h * dpr) | 0) {
      c.cv.width = (w * dpr) | 0; c.cv.height = (h * dpr) | 0;
      c.cv.style.width = w + "px"; c.cv.style.height = h + "px";
    }
    c.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    c._w = w; c._h = h;
    return true;
  }

  disegnaUna(i) {
    const c = this.carte[i];
    if (!this.dimensiona(c)) return;
    const st = this.storia(), pop = this.pop();
    pulisci(c.ctx, c._w, c._h);
    if (!pop) return;
    if (c.r.tipo === "isto") c.ultimo = disegnaIsto(c.ctx, c._w, c._h, c.r, pop);
    else if (st && !st.vuota()) {
      c.ultimo = c.r.tipo === "pila"
        ? disegnaPila(c.ctx, c._w, c._h, c.r, st, this.finestra)
        : disegnaLinee(c.ctx, c._w, c._h, c.r, st, this.finestra);
    } else {
      c.ctx.fillStyle = COL.muto; c.ctx.font = "11px Segoe UI, system-ui, sans-serif";
      c.ctx.textAlign = "center"; c.ctx.textBaseline = "middle";
      c.ctx.fillText("la storia comincia quando il mondo si muove", c._w / 2, c._h / 2);
      c.ultimo = null;
    }
  }

  disegna(tutto = false) {
    const st = this.storia();
    const sub = document.getElementById("grSub");
    if (sub && st) {
      sub.textContent = st.n + " istanti registrati" + (st.n > st.cap ? " (i più vecchi si perdono)" : "") +
        (st.eventi.length ? " · " + st.eventi.length + " ere" : "");
    }
    for (let i = 0; i < this.carte.length; i++) {
      if (tutto || this.visibili.has(i)) this.disegnaUna(i);
    }
  }
}
