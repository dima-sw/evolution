# Evolution — dove se ne va il tempo quando la gente è tanta

> **A chi legge (umano o AI).** Questo file è autosufficiente: contiene le misure, il codice vero dei
> punti caldi, e — soprattutto — **cosa è già stato provato e cosa ha fallito**. Leggi la sezione 5
> prima di proporre qualcosa: ci sono tre idee ovvie già misurate e scartate, e ripeterle costa tempo.

## 0. Che cosa è questo programma, in dieci righe

Simulatore 2D di civiltà emergente. JavaScript puro, moduli ES, nessuna libreria, nessun build:
`node server.js` e si apre su `localhost:5188`. ~10 800 righe in 29 moduli.

Il ciclo di simulazione (un «battito») è **seriale e sincrono**, e ogni battito tocca in ordine:
clima → persone → bestie → emozioni → edifici → fuoco, e ogni ~3 battiti anche
fazioni → cultura → società → entità → menti.

Vincoli non negoziabili, che escludono molte ottimizzazioni classiche:

1. **Il mondo deve restare riproducibile.** Stesso seme ⇒ stesso mondo, fino alla somma della fame
   di ogni persona. Niente `Math.random()`, niente ordini di iterazione non deterministici, niente
   parallelismo che cambi l'ordine delle scritture.
2. **Le ottimizzazioni non devono cambiare il mondo.** Ogni intervento fatto finora è stato
   verificato o con un test differenziale (stesse risposte) o con l'impronta di una partita intera
   (stessi numeri fino al quarto decimale).
3. **Gli individui restano individui.** Non si possono sostituire con medie: legami personali,
   avversioni imparate e memoria di chi ti ha fatto del male sono il contenuto del gioco.

---

## 0.1 ⚠️ LEGGI QUESTO PRIMA DI PROPORRE OTTIMIZZAZIONI SULLE ALLOCAZIONI

La strada che viene in mente per prima — togliere allocazioni: buffer riusati al posto degli array
temporanei, chiavi numeriche al posto delle stringhe, API a iteratore al posto delle liste, niente
`Map` e `Set` dentro i cicli caldi — **ha un tetto misurato, ed è basso**.

```
node --expose-gc banco/spazzatura.mjs

gente 5 660 · bestie 13 510
ms per battito ................. 754,7
memoria consumata per battito ... 0,93 MB   (0,17 KB a persona)
pausa di raccolta ............... 46,6 ms
```

> **La raccolta della spazzatura pesa il 6% del battito.** Anche azzerando *ogni* allocazione — cosa
> impossibile — si guadagnerebbe al massimo quello.

Questo non vuol dire che quelle modifiche siano inutili: una l'ho fatta e rende (−10% sulla
costruzione dei legami). Vuol dire che **non c'è un 30–50% nascosto lì dentro**, e che chi propone
un piano fondato sulle allocazioni sta puntando su un tetto del 6%.

Il tempo se ne va altrove: **conti veri**. Distanze fra migliaia di coppie, letture di proprietà,
l'inserimento ordinato dei K vicini, la scansione della finestra del cibo. Per andare più veloci
bisogna fare **meno lavoro**, non allocare di meno — e fare meno lavoro, in questo progetto,
significa quasi sempre toccare qualcosa del mondo (vedi §7).

---

## 1. Le misure: dove va il tempo

Banco headless, stesse condizioni, mappa 320×320, 58% acqua. Tempo per battito.

> ⚠️ **PRIMA DI MISURARE QUALSIASI COSA, LEGGI QUESTO.**
>
> **Su questa macchina due giri identici del banco differiscono del 10–15%.** Dopo ore di carico la
> stessa misura torna sistematicamente più lenta. Questo significa che **quasi nessuna ottimizzazione
> si può validare confrontando due giri diversi**: il rumore è più grande dell'effetto.
>
> L'unico confronto affidabile è **dentro lo stesso processo**: le due versioni della funzione nello
> stesso file, sullo stesso mondo, alternate — e con i *risultati* confrontati, non solo i tempi. Il
> modello è `banco/ab_adiacenza.mjs`, che prima di cronometrare verifica che le due versioni
> producano le stesse identiche adiacenze e si ferma se non è così.
>
> Ci sono cascato due volte in una sera: ho annunciato un −20% che era rumore, e ho misurato come
> «più lenta» una versione che non lo era.

### ✅ DOVE SIAMO ADESSO — rimisurato daccapo

Queste sono le uniche misure prese sul motore **come è oggi**: con la potatura geometrica, la
potatura semantica, la forma unica, la servitù che funziona e `affordanceTotale` acceso.

| gente | bestie | totale | fauna | emozioni | umani | fazioni | cultura | società |
|---|---|---|---|---|---|---|---|---|
| 601 | 8 820 | **32,6 ms** | 6,7 | 5,8 | 15,1 | 3,4 | 0,6 | 0,8 |
| 1 202 | 29 915 | **85,4 ms** | 31,8 | 29,5 | 18,5 | 3,2 | 0,8 | 1,3 |
| 2 403 | 26 103 | **154,4 ms** | 57,8 | 52,0 | 28,1 | 9,9 | 2,8 | 3,3 |
| 4 803 | 16 921 | **254,2 ms** | **112,9** | 52,9 | 51,0 | 21,6 | 8,1 | 7,0 |

*(le stesse taglie prima della potatura della caccia: 45,1 · 93,3 · 164,3 · **298,3** ms, con la
fauna a 143,3 — vedi §6.6)*

| modulo | esponente | lettura |
|---|---|---|
| cultura | ^1,59 | il più ripido, ma piccolo in assoluto |
| **fazioni** | **^1,31** | era ^1,63 |
| **società** | **^1,30** | era ^1,72, ed era il peggiore |
| **fauna** | **^0,97** | **il più caro in assoluto: 113 ms, il 44% del battito** |
| umani | ^0,92 | |
| emozioni | ^0,11 | |
| **TOTALE** | **^0,72** | **sublineare** — era ^1,06 |

**Il collo di bottiglia è cambiato.** Prima erano `fazioni` e `umani` (202 e 198 ms); adesso è la
**fauna**, da sola quasi metà del battito, e i due vecchi colpevoli sono scesi a 24 e 55. Chi vuole
guadagnare tempo da qui in avanti deve guardare lì — con l'avvertenza di §5, che la fauna è già
stata ottimizzata parecchio e che il suo costo segue **le bestie, non la gente**.

> ⚠️ **Non confrontare questa tabella con quelle vecchie per dedurne un guadagno.** Fra l'una e le
> altre il MONDO è cambiato due volte (la servitù che prima non scattava mai, e `affordanceTotale`
> acceso), e cambia anche quante bestie ci sono a parità di gente — 29 915 contro 27 659 a 1 200
> persone. Sono misure di due mondi diversi. I guadagni veri stanno in §6.3, §6.4 e §6.5, dove il
> mondo era tenuto fermo apposta.

### Le misure di un tempo, per riferimento storico

Il primo confronto dopo la forma unica, quando il mondo era ancora quello vecchio:

| gente | bestie | totale **prima** | totale **allora** | |
|---|---|---|---|---|
| 600 | 8 913 | 59,2 ms | **29,8 ms** | −50% |
| 1 201 | 27 659 | 162,2 ms | **81,0 ms** | −50% |
| 2 401 | 23 080 | 374,9 ms | **175,1 ms** | −53% |
| 4 806 | 13 107 | 780,5 ms | **248,3 ms** | **−68%** |

Modulo per modulo, a 4 806 persone:

| modulo | prima | adesso | | esponente prima | dopo |
|---|---|---|---|---|---|
| fazioni | 202,7 | **21,5** | −89% | ^1,63 | **^1,13** |
| umani | 197,7 | **49,7** | −75% | ^0,96 | ^0,72 |
| fauna | 173,8 | **116,7** | −33% | ^0,74 | ^0,44 |
| emozioni | 92,7 | **47,1** | −49% | ^0,48 | ^0,12 |
| società | 65,0 | **6,0** | −91% | ^1,72 | **^1,22** |
| cultura | 44,3 | **6,8** | −85% | ^1,52 | ^1,55 |

**Emozioni, umani e fauna non sono mai stati toccati**, e sono scesi del 33–75%. Non è
un'ottimizzazione di un modulo: è una tassa tolta a tutto il motore (§6.4).

Su una partita più fitta — 8 827 persone — il battito intero è passato da **1 701,6 a 301,1 ms**,
con i contatori del lavoro identici al millesimo: 270,3 chiamate a `vicini()`, 81 514 persone
esaminate, 15 181 giudici. Stesso identico lavoro, solo letto in fretta.

### Le misure di partenza, per riferimento

| gente | bestie | totale | fazioni | umani | fauna | emozioni | società | cultura |
|---|---|---|---|---|---|---|---|---|
| 600 | 8 913 | 59,2 ms | 5,6 | 31,2 | 8,7 | 8,8 | 2,5 | 1,1 |
| 1 201 | 27 659 | 162,2 ms | 20,8 | 52,5 | 38,8 | 36,6 | 7,4 | 5,1 |
| 2 401 | 23 080 | 374,9 ms | 65,6 | 101,5 | 103,6 | 66,4 | 19,7 | 15,5 |
| 4 806 | 13 107 | 780,5 ms | **202,7** | **197,7** | 173,8 | 92,7 | 65,0 | 44,3 |

**Esponenti** sull'ultimo raddoppio (2 401 → 4 806 persone):

| modulo | esponente | lettura |
|---|---|---|
| **società** | **^1,72** | il più ripido |
| **fazioni** | **^1,63** | il più caro in assoluto |
| cultura | ^1,52 | |
| entità | ^1,32 | piccolo in assoluto |
| umani | ^0,96 | lineare, ma è il secondo costo |
| fauna | ^0,74 | segue le bestie, non la gente |
| emozioni | ^0,48 | |
| **TOTALE** | **^1,06** | quasi lineare |

Il totale è flattato dalle bestie che calano nell'ultimo tratto. **Le cose che scalano con la sola
gente sono fazioni e società**, ed è lì che sta il problema vero.

A 4 806 persone un battito costa 780 ms: **~1,3 battiti al secondo**. È il limite pratico attuale.

---

## 2. Il punto più caro: `factions.js` — costruire i legami sociali

**202,7 ms a 4 806 persone, ^1,63.** Dal profilo interno, la costruzione dell'adiacenza è **~72%**
di questo tempo.

### Che cosa fa

Per ogni persona trova le **K più vicine** entro un raggio (`raggioLegame`, default 7), scartando
chi la odia. Da quel grafo escono i popoli (union-find) e i governi (flood dal capo).

K non è costante: `K = cerchiaBase + intelligenza·cerchiaTesta + socievolezza·cerchiaIndole`
(default 10 + 14·i + 10·s, quindi **~22 in media, fino a 34**).

### Il codice

```js
  46 |   const adj = new Map();
  47 |   // LA CERCHIA E' FINITA, E SI GUARDA VICINO PRIMA CHE LONTANO.
  48 |   // Prima ognuno si legava a CHIUNQUE fosse nel raggio, e per farlo doveva comunque squadrare
  49 |   // tutti: in una folla fitta erano centinaia di confronti a testa, e il costo cresceva col
  50 |   // quadrato della gente (misurato: la sola costruzione dei legami faceva ^2,28).
  51 |   // Ma il limite non e' un espediente di calcolo. Nessuno tiene davvero in mente mezzo villaggio:
  52 |   // quante facce ci stiano dipende da chi sei — testa e voglia di gente — e nessuno scruta la
  53 |   // piazza intera per scegliersele, guarda chi ha intorno e si ferma quando ne ha abbastanza.
  54 |   // Qui si fa esattamente questo: anelli concentrici dal punto in cui sei, e si smette appena
  55 |   // la cerchia e' piena di gente piu' vicina di quanta ne possa ancora arrivare da fuori.
  56 |   // Conseguenza voluta nel mondo: una massa densa non diventa un solo blocco per forza di
  57 |   // numeri: si spezza dove finisce la portata di ciascuno.
  58 |   for (const n of npcs) {
  59 |     const cx = (n.x / PASSO) | 0, cy = (n.y / PASSO) | 0;
  60 |     const en = world.elevation[((n.y | 0) * world.width + (n.x | 0))];
  61 |     const K = (P.cerchiaBase + n.intelligenza * P.cerchiaTesta + (n.socievolezza || 0.5) * P.cerchiaIndole) | 0;
  62 |     const vic = [], dis = [];   // lista corta tenuta ordinata per vicinanza
  63 |     for (let r = 0; r <= ANELLI; r++) {
  64 |       // Da un anello piu' esterno non puo' arrivare nessuno piu' vicino di cosi': se la cerchia
  65 |       // e' gia' piena di gente piu' stretta, cercare oltre e' fiato sprecato.
  66 |       if (vic.length >= K) { const minFuori = (r - 1) * PASSO; if (minFuori > 0 && minFuori * minFuori >= dis[K - 1]) break; }
  67 |       for (let gy = cy - r; gy <= cy + r; gy++) for (let gx = cx - r; gx <= cx + r; gx++) {
  68 |         if (r > 0 && Math.abs(gx - cx) !== r && Math.abs(gy - cy) !== r) continue;  // solo il bordo
  69 |         const arr = grid.get(gx + "," + gy); if (!arr) continue;
  70 |         for (const m of arr) {
  71 |           if (m === n) continue;
  72 |           const d2 = (m.x - n.x) ** 2 + (m.y - n.y) ** 2; if (d2 > R2) continue;
  73 |           if (vic.length >= K && d2 >= dis[vic.length - 1]) continue;
  74 |           let j = vic.length < K ? vic.length : K - 1;
  75 |           while (j > 0 && dis[j - 1] > d2) { dis[j] = dis[j - 1]; vic[j] = vic[j - 1]; j--; }
  76 |           dis[j] = d2; vic[j] = m;
  77 |         }
  78 |       }
  79 |     }
  80 |     // Solo adesso si guarda chi si odia: e' la parte cara (due letture di memoria per coppia)
  81 |     // e ora la si paga su una manciata di persone invece che su tutta la folla.
  82 |     const out = [];
  83 |     for (let k = 0; k < vic.length; k++) {
  84 |       const m = vic[k];
  85 |       if ((n.memoria.get(m.id) || 0) + (m.memoria.get(n.id) || 0) <= -0.2) continue;
  86 |       const em = world.elevation[((m.y | 0) * world.width + (m.x | 0))];
  87 |       out.push([m, Math.sqrt(dis[k]) * (1 + Math.abs(em - en) * 12)]);
  88 |     }
  89 |     adj.set(n, out);
  90 |   }
  91 | 
```

### Perché è caro

Il costo è `n × (quante persone stanno davvero entro il raggio)`. In un villaggio fitto sono
centinaia. L'uscita anticipata per anelli aiuta solo quando la cerchia si riempie **prima** di
esaurire il raggio — e con K≈22 spesso non succede.

### La seconda metà: assegnare i governi

**~13% del tempo di fazioni.** Per ogni grumo connesso si assegna un capo, poi si «inonda» il grafo
dal capo entro un budget di distanza. Il ciclo esterno gira finché restano abbastanza persone senza
capo.

```js
 119 |     const candidati = membri.slice().sort((x, y) => authority(y) - authority(x));
 120 |     let ci = 0, guard = 0;
 121 |     // Il vecchio tetto di quaranta popoli per grumo non era una legge, era prudenza: lasciava
 122 |     // senza stato le masse grandi. Ogni giro toglie comunque qualcuno da "rimasti", quindi il
 123 |     // ciclo finisce da se'; il tetto resta solo come rete di sicurezza.
 124 |     while (remaining.size >= P.minCluster && guard++ < membri.length) {
 125 |       let leader = null;
 126 |       while (ci < candidati.length && !remaining.has(candidati[ci])) ci++;
 127 |       if (ci >= candidati.length) break;
 128 |       leader = candidati[ci];
 129 |       const budget = P.portataGoverno + leader.intelligenza * P.portataIntelligenza + leader.ambizione * 16;   // portata (distanza) di governo
 130 |       // SPAN OF CONTROL: un leader può reggere solo un numero FINITO di persone — oltre, gli ordini
 131 |       // non arrivano, la fiducia cala, la periferia ignora il centro. Cresce con le sue capacità.
 132 |       // Così anche una massa compatta si spezza in più stati, non un unico super-impero.
 133 |       const maxGov = P.spanControlBase + (leader.intelligenza * P.spanControlIntelligenza + leader.ambizione * 110 + leader.forza * 45) | 0;
 134 |       // FLOOD a coda dal leader entro budget e maxGov (senza re-rilassamento → O(archi)).
 135 |       const governed = new Set([leader]);
 136 |       const cost = new Map([[leader.id, 0]]);
 137 |       const q = [leader]; let qi = 0;
 138 |       while (qi < q.length && governed.size < maxGov) {
 139 |         const cur = q[qi++], cc = cost.get(cur.id);
 140 |         for (const [nb, ec] of adj.get(cur)) {
 141 |           if (!remaining.has(nb) || cost.has(nb.id)) continue;
 142 |           const nc = cc + ec;
 143 |           if (nc <= budget) { cost.set(nb.id, nc); governed.add(nb); q.push(nb); if (governed.size >= maxGov) break; }
 144 |         }
 145 |       }
 146 |       if (governed.size < P.minCluster) { for (const m of governed) { m.fazione = null; m.identita = null; m._isLeader = false; remaining.delete(m); } continue; }
 147 |       polities.push({ leader, membri: [...governed] });
 148 |       for (const m of governed) remaining.delete(m);
 149 |     }
 150 |     for (const m of remaining) { m.fazione = null; m.identita = null; m._isLeader = false; }
 151 |   }
 152 | 
 153 |   // 3) IDENTITÀ con INERZIA: ogni polity adotta l'identità tramandata dalla maggioranza dei suoi
 154 |   //    membri; se nessuna prevale (o è già presa da una polity più grande) ne conia una nuova →
 155 |   //    è così che una colonia che si stacca diventa "un altro popolo", senza evento dedicato.
 156 |   polities.sort((a, b) => b.membri.length - a.membri.length);
 157 |   const usate = new Set();
 158 |   const factions = [];
```

---

## 3. Il più ripido: `society.js` — `stepSocietyAdvanced`

**65 ms a 4 806 persone, ^1,72.** Gira ogni ~3 battiti.

Costruisce una griglia (celle da 10) e la presta a sei sottosistemi: trasferimenti, norme,
coercizione, educazione, voci, miti.

```js
 334 | export function stepSocietyAdvanced(pop, dt) {
 335 |   if (!pop.norme) initSociety(pop);
 336 |   // griglia dei vicini (riusata da tutti i sottosistemi: O(n))
 337 |   const grid = new Map();
 338 |   for (const n of pop.npcs) {
 339 |     if (!n.vivo) continue;
 340 |     const k = ((n.x / CELL) | 0) + "," + ((n.y / CELL) | 0);
 341 |     let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(n);
 342 |   }
 343 |   const vicini = (n) => {
 344 |     const out = [], cx = (n.x / CELL) | 0, cy = (n.y / CELL) | 0;
 345 |     for (let gy = cy - 1; gy <= cy + 1; gy++) for (let gx = cx - 1; gx <= cx + 1; gx++) {
 346 |       // NON con lo spread: `push(...arr)` passa ogni elemento come argomento, ed è lento su un
 347 |       // array grande — oltre a poter far saltare lo stack in una cella molto affollata.
 348 |       const arr = grid.get(gx + "," + gy);
 349 |       if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
 350 |     }
 351 |     return out;
 352 |   };
 353 |   trasferimenti(pop, dt, vicini);
 354 |   norme(pop, dt, vicini);
 355 |   coercizione(pop, dt, vicini);
 356 |   educazione(pop, dt, vicini);
 357 |   voci(pop, dt, vicini);
```

**Il sospetto principale, non ancora misurato:** `vicini(n)` **alloca un array nuovo** con *tutti*
i vicini in un blocco 30×30 tile, a ogni chiamata. In un mondo fitto sono centinaia di elementi. E
alcuni chiamanti ne usano **uno solo** — per esempio `voci()` ne pesca uno a caso.

Esempio di chiamante (l'insegnamento):

```js
 204 | function educazione(pop, dt, vicini) {
 205 |   for (const m of pop.npcs) {
 206 |     if (!m.vivo || m.eta < 30 || m.sapere.size < 3) continue;
 207 |     if (pop.rng() > dt * P.probEducazione) continue;
 208 |     for (const g of vicini(m)) {
 209 |       if (g === m || !g.vivo || g.eta > 18 || g.eta < 4) continue;
 210 |       if (Math.abs(g.lingua - m.lingua) > 0.15) continue;         // devono capirsi
 211 |       const nuove = [...m.sapere].filter((s) => !g.sapere.has(s));
 212 |       if (!nuove.length) continue;
 213 |       // l'apprendista impara di più se è intelligente e il maestro è paziente
 214 |       const quante = 1 + ((m.pazienza + g.intelligenza) > 1.1 ? 1 : 0);
 215 |       for (let k = 0; k < quante && nuove.length; k++) g.sapere.add(nuove[(pop.rng() * nuove.length) | 0]);
 216 |       pop.insegnamentiMaestro++;
 217 |       g.memoria.set(m.id, clamp01((g.memoria.get(m.id) || 0) + 0.2));
 218 |       m.reputazione.maestro = (m.reputazione.maestro || 0) + 1;
 219 |       break;
 220 |     }
 221 |   }
 222 | }
 223 | 
 224 | // ---------------------------------------------------------------------------------------------
 225 | // MEMORIA DELLA CIVILTÀ (9.9) — quando muore qualcuno di NOTEVOLE, i vivi lo ricordano. Non c'è
```

---

## 4. Il secondo costo assoluto: `npc.js` — il ciclo per-persona

**197,7 ms a 4 806 persone, ma ^0,96: è lineare.** Non è un problema di complessità, è che ogni
persona fa parecchie cose per battito. Parte del lavoro è già spezzata a turni (un terzo della gente
per battito per l'esperienza, un quinto per l'usura) o dietro un dado (`rng() < 0,15` per il
deperimento, `< 0,02` per il mestiere).

C'è un indice del vicinato condiviso, costruito una volta per battito:

```js
1148 |   vicini(x, y, raggio) {
1149 |     const CELLA = 12;
1150 |     if (this._vicinatoT !== this._battito || !this._vicinato) {   // anche al primo giro, prima che il battito esista
1151 |       this._vicinatoT = this._battito;
1152 |       const g = new Map();
1153 |       for (const p of this.npcs) {
1154 |         if (!p.vivo) continue;
1155 |         const k = ((p.x / CELLA) | 0) + "," + ((p.y / CELLA) | 0);
1156 |         let a = g.get(k); if (!a) { a = []; g.set(k, a); } a.push(p);
1157 |       }
1158 |       this._vicinato = g;
1159 |     }
1160 |     const R2 = raggio * raggio, out = [];
1161 |     const cx = (x / CELLA) | 0, cy = (y / CELLA) | 0, span = Math.ceil(raggio / CELLA);
1162 |     for (let gy = cy - span; gy <= cy + span; gy++) for (let gx = cx - span; gx <= cx + span; gx++) {
1163 |       const arr = this._vicinato.get(gx + "," + gy); if (!arr) continue;
1164 |       for (const p of arr) if ((p.x - x) ** 2 + (p.y - y) ** 2 <= R2) out.push(p);
1165 |     }
1166 |     return out;
1167 |   }
1168 | 
1169 |   updateMestiere(npc) {
```

E una scansione a finestra sulla griglia del cibo, usata sia dalle persone sia dalle bestie —
**289 tile letti per chiamata** con R=8:

```js
 544 |   bestCell(grid, cx, cy, R, minV = 0.15) {
 545 |     let best = null, bestV = minV;
 546 |     const x0 = Math.max(0, (cx | 0) - R), x1 = Math.min(this.world.width - 1, (cx | 0) + R);
 547 |     const y0 = Math.max(0, (cy | 0) - R), y1 = Math.min(this.world.height - 1, (cy | 0) + R);
 548 |     for (let y = y0; y <= y1; y++)
 549 |       for (let x = x0; x <= x1; x++) {
 550 |         const v = grid[y * this.world.width + x];
 551 |         if (v > bestV) { bestV = v; best = [x, y]; }
 552 |       }
 553 |     return best;
 554 |   }
 555 |   bestFood(cx, cy, R) { return this.bestCell(this.food, cx, cy, R); }
 556 |   bestPlankton(cx, cy, R) { return this.bestCell(this.plankton, cx, cy, R, 0.1); }
 557 | 
```

---

## 5. LA FAUNA — e le tre cose già provate

**173,8 ms a 4 806 persone.** Ma qui il numero da guardare è il **costo per bestia**, perché il
totale segue quante bestie ci sono, non quanta gente.

Il passo delle bestie è spezzato in turni (`turniFauna`, default **2**): chi tocca il turno riceve
il tempo di tutti.

```js
 177 | function stepCreatura(pop, a, dt, grid, branco) {
 178 |   const acqua = a.dna.aquatic;
 179 |   const ok = acqua ? (x, y) => pop.swimmable(x, y) : (x, y) => pop.walkable(x, y);
 180 |   const speed = a.velocita * dt;
 181 |   a.eta += dt * 0.28;
 182 |   a.fame += dt * a.fameRate * (caccia(a) ? 0.75 : 1);
 183 |   if (a.cooldown > 0) a.cooldown -= dt;
 184 |   if (a.fame > 1.32 || a.eta > a.lifespan || climaLetale(pop, a, dt)) {
 185 |     a.vivo = false;
 186 |     // Solo chi non è un gran cacciatore lascia carogna sfruttabile: altrimenti i predatori si
 187 |     // sosterrebbero a vicenda in un circolo chiuso, senza mai dipendere davvero dalle prede.
 188 |     if (a.dna.carnivoria < 0.6) addCarcass(pop, a.x, a.y, a.size);
 189 |     return;
 190 |   }
 191 | 
 192 |   // FUGA: si scappa da chiunque possa mangiarti. La vista dice quanto lontano te ne accorgi —
 193 |   // e questo resta personale: il branco ha già guardato, ma chi ha gli occhi buoni vede più in là.
 194 |   const raggioAllarme = 5 + (a.dna.vista || 0.5) * 8;
 195 |   let minaccia = null;
 196 |   // IL BRANCO NON È UNA CELLA DELLA GRIGLIA: È CHI STA INSIEME. Il gruppo ha già guardato per
 197 |   // tutti — molte pari di occhi vedono prima di una sola — ma quel vantaggio tocca a chi il
 198 |   // gruppo se lo tiene stretto. Chi è schivo se ne sta per conto suo e deve guardarsi da sé.
 199 |   //
 200 |   // Fin qui la socialita era un gene che si ereditava, mutava a ogni generazione e non faceva
 201 |   // NIENTE. Un gene senza conseguenze non si può selezionare: derivava a caso. Adesso ha un
 202 |   // prezzo e un premio, e sono in tensione fra loro — stare in gruppo ti fa vedere il predatore
 203 |   // prima, ma vi contendete la stessa erba. Dove i predatori abbondano converrà stringersi,
 204 |   // dove scarseggiano converrà sparpagliarsi, e non l'ha deciso nessuno.
 205 |   const gregario = (a.dna.socialita || 0.5) > 0.35;
 206 |   if (gregario && branco && branco.vicini) {
```

Il pascolo, che è il ramo più battuto (quasi nessuna bestia è mai sazia):

```js
 265 |     // 3) PASCOLO — le piante nutrono in proporzione a quanto poco si è carnivori.
 266 |     if (bruca(a)) {
 267 |       const griglia = acqua ? pop.plankton : pop.food;
 268 |       const idx = pop.tileIdx(a.x, a.y);
 269 |       const resa = 1 - a.dna.carnivoria * 0.9;
 270 |       if (griglia[idx] > 0.13) {
 271 |         const e = Math.min(griglia[idx], 0.55 * dt * 4);
 272 |         griglia[idx] -= e;
 273 |         a.fame = Math.max(caccia(a) ? 0.25 : 0, a.fame - e * 2.2 * resa);
 274 |       } else {
 275 |         const t = acqua ? pop.bestPlankton(a.x, a.y, 8) : pop.bestFood(a.x, a.y, 8);
 276 |         if (t) {
 277 |           // UN GREGARIO NON CERCA L'ERBA MIGLIORE: CERCA L'ERBA MIGLIORE VICINO AI SUOI.
 278 |           // La prima versione faceva stringere il branco solo da sazi, e non si vedeva niente
 279 |           // (misurato: distanza dal centro del gruppo 4,32 per i gregari contro 4,34 per gli
 280 |           // schivi — identica). Ovvio col senno di poi: quasi nessuno è mai sazio, e il pascolo
 281 |           // governa tutto il movimento. È QUI che si decide se un branco esiste.
 282 |           //
 283 |           // E qui il gene si paga davvero: chi resta col gruppo mangia peggio ma viene visto
 284 |           // prima dal predatore; chi si stacca trova l'erba buona e se la vede da solo.
 285 |           let tx = t[0] + 0.5, ty = t[1] + 0.5;
 286 |           if (branco && branco.n > 2) {
 287 |             const tira = Math.max(-0.5, Math.min(0.5, ((a.dna.socialita || 0.5) - 0.45) * 1.2));
 288 |             tx += (branco.x - tx) * tira;
 289 |             ty += (branco.y - ty) * tira;
 290 |           }
 291 |           moveOn(pop, a, tx, ty, speed, ok);
 292 |         } else wanderOn(pop, a, speed, ok);
 293 |       }
 294 |       return;
 295 |     }
 296 |     wanderOn(pop, a, speed, ok);
```

La ricerca spaziale, già ottimizzata ad anelli concentrici con uscita anticipata:

```js
 157 | function gridNearest(grid, x, y, R, ok) {
 158 |   const R2 = R * R, cx = (x / GRID_CELL) | 0, cy = (y / GRID_CELL) | 0, span = Math.ceil(R / GRID_CELL);
 159 |   let best = null, bd = R2;
 160 |   for (let r = 0; r <= span; r++) {
 161 |     // da un anello piu' esterno non puo' venire nessuno piu' vicino di (r-1) celle
 162 |     if (best) { const minFuori = (r - 1) * GRID_CELL; if (minFuori > 0 && minFuori * minFuori >= bd) break; }
 163 |     for (let gy = cy - r; gy <= cy + r; gy++) for (let gx = cx - r; gx <= cx + r; gx++) {
 164 |       if (r > 0 && Math.abs(gx - cx) !== r && Math.abs(gy - cy) !== r) continue;   // solo il bordo
 165 |       const arr = grid.get(gx + "," + gy); if (!arr) continue;
 166 |       for (const o of arr) {
 167 |         if (!o.vivo || (ok && !ok(o))) continue;
 168 |         const d2 = (o.x - x) ** 2 + (o.y - y) ** 2;
 169 |         if (d2 < bd) { bd = d2; best = o; }
 170 |       }
 171 |     }
 172 |   }
 173 |   return best ? { a: best, d2: bd } : null;
 174 | }
 175 | 
 176 | // ── IL COMPORTAMENTO DI UNA CREATURA — uno solo, per tutte ──────────────────────────────────
 177 | function stepCreatura(pop, a, dt, grid, branco) {
 178 |   const acqua = a.dna.aquatic;
 179 |   const ok = acqua ? (x, y) => pop.swimmable(x, y) : (x, y) => pop.walkable(x, y);
 180 |   const speed = a.velocita * dt;
```

### ⚠️ Già provato sulla fauna — non riproporlo

| intervento | esito |
|---|---|
| **Anelli concentrici + uscita anticipata** al posto della scansione a riquadro | ✅ **fatto.** Verificato su 9 000 interrogazioni in tre densità: **zero differenze**, 4–6× più veloce nella calca. |
| **Griglia dei soli predatori** invece di quella di tutte le bestie | ✅ **fatto, ed è stato il guadagno grosso.** A 27 659 bestie: **164,8 → 35,5 ms**. Risposta identica (`puoPredare` scarta chiunque abbia carnivoria < 0,35, che è esattamente il criterio della griglia). Verificato su 16 000 interrogazioni **e** con l'impronta di una partita intera identica al quarto decimale. |
| Metterla solo nel branco e non anche nei solitari | ⚠️ rendeva **il 10%**. Il grosso stava nel percorso dei solitari. |
| Sospettare che il costo fosse la caccia degli umani o il contagio | ❌ **smentito misurando**: caccia 0,6 → 3,5 ms, contagio 1 → 9 ms. Irrilevanti. Era il costo per bestia. |

---

## 6. ⚠️ TUTTO QUELLO CHE È GIÀ STATO PROVATO — leggere prima di proporre

| idea | esito misurato |
|---|---|
| **Cerchia sociale finita** (ognuno tiene in mente K persone, non tutte) | ✅ fazioni da **^2,30 a ^1,73**. |
| **Ordinare i candidati capo una volta sola** invece che a ogni trono | ✅ la fase «chi governa chi» da **^2,35 a ^1,79**. |
| **Griglia più fine per le fazioni** (celle da 1 invece di 2) | ❌ **peggio del 14–19%.** Celle da 3 sono uguali a celle da 2. I popoli risultano identici in tutte e tre le prove, quindi la griglia non cambia mai il risultato: non è quella la leva. |
| **Unificare le cinque griglie spaziali** (emozioni, società, fazioni, fauna, gente) | ❌ scartato **con la ragione**: il costo di quei moduli sta nel lavoro *per persona*, non nel costruire la griglia (costruirne una su 5 000 persone è dell'ordine del millisecondo contro i 92 ms del passo delle emozioni). In più `cellNeighbors` restituisce un **riquadro** e `pop.vicini` un **cerchio**: scambiarli cambierebbe quanta gente ciascuno frequenta. Sarebbe una modifica di comportamento travestita da ottimizzazione. |
| **Indice id→persona** al posto di `npcs.find()` dentro i cicli | ✅ fatto in `entities.js`. |
| **`push(...arr)` → ciclo** in `cellNeighbors` | ✅ fatto: lo spread è lento su array grandi e **può far saltare lo stack** in una cella affollata. |
| **Web Worker / multithreading** | ❌ **non fatto, e con una ragione misurata.** Disegnare costa **13 ms** su 4 000 persone contro **383 ms** di simulazione: il collo non è mai stato lo schermo. Un worker toglierebbe il blocco dell'interfaccia ma non farebbe passare un anno in più al secondo. E il modello è fittamente interdipendente (persona → società → fazione → economia → cultura → ambiente → persona): dividerlo a regioni rompe l'emergenza sulle cuciture, e in JS si condividono solo numeri nudi (SharedArrayBuffer), il che vorrebbe dire riscrivere tutto in struct-of-arrays. |
| **Togliere una quadratica vale più di N cuori** | Portare le fazioni da ^2,30 a ^1,52 significa che raddoppiando la gente il costo si moltiplica per 2,9 invece che per 4,9: un guadagno che **cresce** con la civiltà. Otto cuori danno un fattore fisso 8, una volta sola, e poi la curva riprende a salire come prima. |

---

## 6.1 Fatte dopo la prima stesura di questo file

Due interventi, tutt'e due con la stessa prova: **l'impronta della partita è rimasta identica**
(`vivi 1256 · sommaX 187869,332 · sommaFame 453,2463 …`, gli stessi numeri prima e dopo). Non
«equivalente»: lo stesso identico mondo.

### ❌ `society.js` — la cache per cella NON rende (provata e tolta)

Sembrava l'ottimizzazione ovvia, ed è la prima cosa che consiglierebbe chiunque guardi il codice:
`vicini(n)` restituisce il blocco 3×3 attorno alla **cella** di n, quindi tutti quelli che stanno
nella stessa cella ricevono la lista **identica** — costruirla una volta e prestarla pare gratis.

**Misurato: non rende, anzi rende un po' peggio** (180,6 ms contro 171,8 con 5 595 persone).

Il perché sta in un numero solo, ed è il numero che nessuno pensa a misurare:

> con 5 595 persone `vicini()` viene chiamata **650 volte per passo**, su circa **mille celle**.

Cioè meno di una volta per cella: i chiamanti stanno tutti dietro dadi a bassa probabilità
(`if (rng() > dt * probEducazione) continue`), quindi due chiamate non cadono quasi mai nella
stessa cella. Una cache che non colpisce è solo memoria da allocare.

**La cache è stata tolta.** È rimasta la griglia piatta (chiavi numeriche invece che stringhe), che
serve comunque perché le inserzioni sono una per persona a ogni passo.

*(Curiosità trovata leggendo il codice: uno dei chiamanti costruisce l'intera lista dei vicini e poi
fa `break` alla **prima** iterazione. Lì una API che si ferma al primo utile renderebbe — ma è un
chiamante solo, e va misurato prima.)*

### ✅ `factions.js` — si saltano le celle impossibili (**la più grossa**)

Non basta uscire dagli **anelli** quando la cerchia è piena: si può saltare **ogni singola cella**
che non possa contenere un candidato migliore.

Per ogni cella si calcola quanto possa avvicinarsi *al massimo* un suo punto qualsiasi. Se già quel
minimo è peggiore del K-esimo vicino che si ha in mano, nessuno di lì dentro potrebbe entrare nella
cerchia — e la si salta senza calcolare **una sola distanza**.

```js
if (nv >= K) {
  const x0 = gx * PASSO, y0 = gy * PASSO;
  const ddx = n.x < x0 ? x0 - n.x : (n.x > x0 + PASSO ? n.x - x0 - PASSO : 0);
  const ddy = n.y < y0 ? y0 - n.y : (n.y > y0 + PASSO ? n.y - y0 - PASSO : 0);
  if (ddx * ddx + ddy * ddy >= dis[nv - 1]) continue;   // cella impossibile
}
```

**È esatta, non approssimata.** Poche righe sotto un candidato viene scartato con
`d2 >= dis[nv-1]`, e ogni candidato di una cella saltata avrebbe per forza
`d2 >= minimo >= dis[nv-1]`: stesso esito, meno conti. E non tocca né la griglia né l'ordine di
visita — è tutt'altra cosa dalla «griglia più fine», che era stata provata e peggiorava.

### ✅ `factions.js` e `npc.js` — griglie piatte, buffer riusati, adiacenza indicizzata

Chiavi di cella numeriche invece che stringhe, `vic`/`dis` riusati invece che riallocati per ogni
persona, `adj` in un array indicizzato invece che in una `Map` con chiave-oggetto.

### I numeri, misurati come si deve

A/B nello stesso processo, sullo stesso mondo, alternate, con i risultati confrontati
(`banco/ab_adiacenza.mjs`, 8 827 persone):

| versione | ms | contro l'originale |
|---|---|---|
| originale | 1 308,7 | — |
| + griglie piatte, buffer, adiacenza indicizzata | 1 136,7 | **−13%** |
| **+ celle impossibili saltate** | **933,1** | **−29%** |

**Zero differenze su 170 193 archi** per entrambe. E l'impronta del mondo intero è quella che aveva
**prima di qualunque ottimizzazione** — `vivi 1241 · sommaX 193648,6455`: stesso identico mondo,
tre ottimizzazioni dopo.

> ⚠️ **Prima avevo scritto −20%, ed era sbagliato.** Quel numero veniva dal confronto fra due giri
> diversi del banco, e su questa macchina **due giri identici differiscono del 10–15%** — dopo ore
> di carico la stessa identica misura torna più lenta. Il rumore era più grande dell'effetto.
>
> Vale anche per la scala completa: l'ultimo giro (887,6 ms a 4 806 persone) è *più lento* del
> precedente (780,5 ms) **anche nei moduli che non ho toccato** — emozioni +17%, cultura +5%. Non
> sono le modifiche: è la macchina.

- chiavi di cella da stringa (`"12,7"`) a numero: niente costruzione di stringhe né hash;
- `vic`/`dis` non si riallocano per ogni persona: due buffer di dimensione massima nota
  (la cerchia più larga possibile con quei parametri) riempiti con un contatore;
- `adj` da `Map` con chiave-oggetto a un array indicizzato: ogni persona riceve un indice stabile
  per quella chiamata.

**Un dettaglio che sembra pedanteria e non lo è:** la mappa a chiavi-stringa non aveva confini,
quindi chi finiva esattamente sul bordo del mondo aveva comunque la sua cella. Una griglia piatta
senza margine lo scarterebbe o lo accorperebbe alla cella accanto — e sarebbe **un cambiamento del
mondo travestito da ottimizzazione**. Tutte le griglie piatte qui hanno un margine.

---

## 6.2 Sulla griglia grossolana del cibo — attenzione al verso dell'invalidazione

L'idea di una `maxFood[blocco]` per potare la finestra 17×17 di `bestCell` è buona, ma **come
viene di solito formulata è scorretta**, e vale la pena dire perché.

La potatura è: *salta il blocco se il suo massimo è ≤ del migliore trovato finora.* Perché sia
lecita, il valore memorizzato dev'essere un **limite SUPERIORE** del massimo vero:

- se il valore memorizzato è **più alto** del vero, si scende in un blocco che non serviva:
  si perde un po' di potatura, ma la risposta resta giusta;
- se è **più basso** del vero, si salta un blocco che conteneva il massimo: **la risposta cambia**,
  e con essa il mondo.

E qui sta la trappola: **la vegetazione ricresce**. Una cache costruita e poi lasciata invecchiare
diventa un *sotto*-stima appena l'erba ricresce — cioè esattamente il caso pericoloso. Il consumo,
al contrario, la rende una sovrastima, che è innocua.

Due vie corrette:

1. **ricostruire la cache dopo la ricrescita, dentro lo stesso battito** — ma la ricrescita è
   spezzata a turni proprio per non scorrere tutta la mappa, e ricostruire la cache la riscorrerebbe;
2. **usare `foodCap` come limite superiore** — è statico (il cibo non supera mai la sua capacità) e
   quindi sempre valido, ma pota molto meno in un mondo già spoglio, che è proprio quando servirebbe.

Una terza via, da misurare: aggiornare il massimo del blocco **in modo incrementale** dove il cibo
cambia (ricrescita, pascolo, raccolta), tenendo il valore come limite superiore e ricalcolandolo
per intero solo quando il massimo del blocco viene consumato. Non è banale, e prima di scriverla
misurerei quanto costa davvero `bestCell` oggi: `npc.js` scala **^0,96**, quindi non è lui a
rompere la scala — è solo caro in assoluto.

---

## 6.3 Dentro la società: dove vanno i millisecondi, e la potatura SEMANTICA

Di `stepSocietyAdvanced` si conosceva un numero solo — il totale. Dentro ci sono nove sottosistemi,
e non si può togliere lavoro inutile senza sapere quale lo stia facendo. La sonda è
`banco/profilo_societa.mjs`: appende un cronometro al motore (spento per tutti gli altri — senza
`pop._cronoSoc` non si fa una misura in più), lo fa girare **normalmente**, e conta i millisecondi
**e il lavoro**: quante volte ogni sottosistema chiede il vicinato e quanta gente ne riceve.

> ## ⚠️ I NUMERI DI QUESTA SEZIONE SONO STORIA, NON LO STATO ATTUALE
>
> Sono stati misurati **prima** della forma unica (§6.4), che ha tolto una tassa pagata da ogni
> lettura di proprietà. I due guadagni **non si sommano**: la forma unica si è portata via quasi
> tutto ciò che questa potatura risparmiava.
>
> | la stessa identica sezione di codice | allora | adesso |
> |---|---|---|
> | senza potatura | 195,43 ms | **8,24 ms** |
> | con potatura | 13,23 ms | **0,59 ms** |
> | | −93% | **−93%** |
>
> Il rapporto è identico; la posta in gioco è ventiquattro volte più piccola. **Valore attuale
> della potatura semantica: ~7,7 ms per passo di società — cioè società −14%, battito −0,8%.**
> Resta giusta e resta accesa, ma non è più la modifica grossa: lo è §6.4.
>
> La lezione è generale, e vale per chiunque legga questo file: **l'ordine in cui si applicano due
> ottimizzazioni cambia quanto vale ciascuna.** Se avessi fatto prima la forma unica, questa
> potatura avrebbe reso il 14% invece del 46%, e forse non l'avrei nemmeno cercata.

### I numeri di allora, 8 827 persone

| sottosistema | prima | dopo | |
|---|---|---|---|
| **coercizione** | 229,2 ms | **54,4 ms** | **−76%** |
| **trasferimenti** | 214,4 ms | **109,8 ms** | **−49%** |
| classi | 70,2 | 75,4 | |
| miti | 66,9 | 70,6 | |
| norme | 64,8 | 62,8 | |
| educazione | 21,7 | 24,6 | |
| griglia | 17,0 | 18,3 | |
| voci | 9,1 | 9,0 | |
| magazzini | 0,01 | 0,00 | |
| **tutta la società** | **787,4 ms** | **425,0 ms** | **−46%** |

Impronta del mondo: **identica** (`vivi 1241 · sommaX 193648,6455`).

### L'idea: non «più veloce», ma «non può cambiare niente, quindi non si fa»

Il contatore del lavoro ha mostrato una cosa che i millisecondi da soli non dicevano:

```
donoTentano         669      ← quanti si guardano intorno
donoCandidati   168 103      ← quante persone esaminano
                             = 251 a testa, cioè TUTTO il vicinato, ogni volta
```

Duecentocinquantuno significa che il ciclo **non si ferma quasi mai**: quasi nessuno trova ciò che
cerca. E `coercizione` faceva lo stesso — 405 ricerche, 101 104 persone guardate in faccia.

Tutt'e due cercano la stessa figura: **un indigente**, chi non ha niente in mano e ha fame. In un
mondo che funziona è raro. Il motore spendeva un terzo del tempo della società per scoprire,
duecentocinquanta facce alla volta, che lì attorno non c'era nessuno da aiutare né da sottomettere.

La potatura è la stessa delle fazioni, spostata **dalla distanza al contenuto**: si tiene un conto
per cella di quanti indigenti ci sono, e se le nove celle attorno ne hanno zero non si guarda
nessuno.

```js
zona.censimento();                                  // una passata, risponde a tutt'e due
...
if (zona.nessuno(zona.indigenti, npc)) continue;    // nove letture invece di duecentocinquanta
```

**A/B nello stesso processo** (`banco/ab_doni.mjs`, che confronta le SCELTE e si ferma se non
coincidono):

```
tentano un dono 439 · tentano di sottomettere 228
doni scelti 10 (potata 10) · sottomissioni 0 (potata 0)  ✓
ricerche saltate: doni 429/439 · sottomissioni 228/228

prima  195,43 ms
dopo    13,23 ms   (censimento incluso) — −93%
```

Sul motore di oggi, stesso banco, stesso mondo: **8,24 → 0,59 ms**, di nuovo −93%.

Nel motore vero il ciclo interno della coercizione **non gira più affatto**: `coercCandidati` da
101 104 a **0**.

### Tre cose che la rendono esatta invece che quasi

1. **Il censimento si rifà due volte, non una.** Prima dei doni, perché i tributi appena riscossi
   possono aver lasciato qualcuno a mani vuote. E prima delle sottomissioni, perché in mezzo passa
   la giustizia, che qualcuno lo uccide.
2. **Il conto resta un limite SUPERIORE.** Troppo alto non fa danno: si guarda e non si trova, come
   prima. Troppo basso salterebbe una ricerca che avrebbe trovato qualcuno. Per questo durante il
   giro non si decrementa mai. È lo stesso verso dell'errore di §6.2.
3. **Non tocca i dadi.** L'estrazione avviene *prima* della ricerca, quindi la sequenza casuale è
   identica: è per questo che l'impronta non si muove.

### ⚠️ La verifica che NON era una verifica

Il primo A/B diceva `sottomissioni 0 (potata 0) ✓`. **Due liste vuote coincidono sempre.** In quel
mondo la coercizione non riesce mai — `coercCandidati` era già 0 — quindi né l'impronta né l'A/B
potevano accorgersi di un errore nella potatura della coercizione: era argomentata, non provata.

Adesso il banco **forza il caso che conta**: riduce in miseria della gente a caso (niente in mano,
fame, poco coraggio, nessun padrone) e rifà il confronto a densità crescenti.

```
con dei disperati veri nel mondo:
  ~   1 in miseria · doni  12 (potata  12) · sottomissioni    1 (potata    1)  ✓
  ~  10 in miseria · doni 127 (potata 127) · sottomissioni   14 (potata   14)  ✓
  ~ 100 in miseria · doni 389 (potata 389) · sottomissioni  126 (potata  126)  ✓
  ~1000 in miseria · doni 439 (potata 439) · sottomissioni  209 (potata  209)  ✓
  ~5000 in miseria · doni 439 (potata 439) · sottomissioni  224 (potata  224)  ✓
```

> **Regola generale:** un confronto fra due risultati **vuoti** non prova niente. Se il caso che la
> modifica tocca non si verifica mai nel mondo di prova, va **costruito**.

### Il caso peggiore, che va detto

In un mondo di miseria diffusa la potatura non salta più niente e paga solo il censimento: la
sezione passa da 1,10 a 2,33 ms (**+112%**), perché la ricerca senza potatura trova la vittima al
primo colpo ed esce subito. Sono ~1,2 ms per passo contro i ~7,7 che risparmia nel mondo normale:
il saldo resta positivo, ma non è gratis in ogni mondo.

### ⚠️ Due lezioni di metodo, tutt'e due imparate sbagliando

**Il contatore era un `Proxy`, e misurava se stesso.** Ogni `L.donoCandidati++` passava per una
trappola `get` e una `set`, centosessantottomila volte a passo: `trasferimenti` da 214 a 289 ms e
`coercizione` da 229 a 248, solo per il fatto di essere osservate. I *conti* restavano validi
(contare non cambia il mondo), i *tempi* no. Un contatore dev'essere una proprietà che esiste già
su un oggetto normale.

**Serve un METRO, o si insegue un fantasma.** `miti` costa 71 ms per attraversare 10 495 persone:
sembrava impossibile per due letture di proprietà, e l'ipotesi ovvia era che fosse la passata a
costare (l'array contiene anche i morti). Due misure l'hanno smontata:

```
array npcs 8951 · di cui vivi 8827      ← i morti sono l'1,4%: non c'è niente da guadagnare
(ciclo nudo)  9,12 ms                   ← attraversare tutti e chiedere solo `n.vivo`
```

Il ciclo nudo costa **9 ms**, non 70. Quindi il costo di `miti` è lavoro vero (86 commemorazioni a
passo, ognuna con una `pop.vicini(...)` di raggio **30**), e i tre sottosistemi «sospetti» non
hanno niente da ottimizzare nel ciclo. Il metro è rimasto nella sonda: **prima di dire che qualcosa
è lento, bisogna sapere quanto costa non fare niente.**

---

## 6.4 ⚠️ LA COSA PIÙ GROSSA DI TUTTE: le persone avevano 966 forme diverse

Questa non è una legge del mondo, è una legge del motore JavaScript — ma pesa più di quasi tutte
le altre messe insieme, e nessuna lettura del codice la può vedere: **non è nel codice, è nella
forma dei dati a mezza partita**.

In V8 un oggetto non è un sacco di proprietà: ha una **mappa nascosta** che dice a quale offset sta
ogni campo. Due oggetti con la stessa mappa si leggono con un accesso diretto; un punto del codice
che ne vede più di quattro diventa *megamorfico* e smette di ottimizzare — ogni lettura torna a
essere una ricerca.

Nel progetto i campi delle persone **nascevano per strada**: `_padrone` quando qualcuno veniva
sottomesso, `_deterrenza` quando assisteva a una punizione, `casaMat` quando costruiva, `assuefaz`
al primo pasto ripetuto, `_commemorato` quando moriva. Ogni aggiunta creava una mappa nuova, e chi
non l'aveva ancora ricevuta ne aveva una diversa.

```
node --allow-natives-syntax banco/forme.mjs scala 400

persone nell'array 1345
FORME DIVERSE: 966
      17 persone · 102 campi
      10 persone ·  98 campi · in meno: casaMat,_usura,assuefaz,_ultimoCibo
       9 persone · 103 campi · in più:  _scosso
  … e altre 958 forme
```

**Quasi ogni persona aveva una forma sua.** Il prezzo, misurato sulle stesse identiche persone:

| venti passate sull'array | 966 forme | 1 forma | |
|---|---|---|---|
| `n.vivo && !n._padrone` | 0,34 ms | **0,07 ms** | **−79%** |
| `n.vivo && n.inventory.size` | 0,41 ms | **0,11 ms** | **−73%** |
| `n.vivo && n.empatia` | 0,37 ms | **0,09 ms** | **−76%** |

Leggere **una** proprietà costava **164 ns a persona** invece di quattro.

### Perché spiega misure che sembravano assurde

`norme` pagava 4,2 µs a persona per quattro moltiplicazioni e una lettura di `Map`. Il ciclo nudo
(`n.vivo` e basta) costava 9 ms mentre i sottosistemi che fanno «poco di più» ne costavano 70. Non
era il lavoro: era che **ogni accesso a una proprietà di una persona era una ricerca**. E non
riguardava `society.js` — riguardava ogni ciclo del motore, perché ogni ciclo del motore legge
proprietà di persone.

### Il rimedio, e perché è esatto

Dichiarare nel costruttore **tutti** i campi che nascevano per strada, sempre nello stesso ordine,
tutti a `undefined` — che è esattamente ciò che il codice trovava quando il campo non c'era.

```
campi dichiarati alla nascita: 111
campi che nascono per strada: 0
FORME DIVERSE: 1
```

È invisibile al mondo perché nel motore **non c'è un solo `Object.keys`, `in`, spread o
`JSON.stringify` su una persona** (verificato: l'unico `for…in` è su `npc.azioni`, un
sotto-oggetto). Un campo dichiarato a `undefined` si legge come un campo assente, si confronta come
un campo assente, e `JSON.stringify` lo omette lo stesso.

**Impronta identica**: `vivi 1241 · sommaX 193648,6455`.

### Quanto vale, misurato su tutto il motore

| | prima | adesso | |
|---|---|---|---|
| battito intero, 8 827 persone | 1 701,6 ms | **301,1 ms** | **−82%** |
| tutta la società | 425,0 ms | **48,3 ms** | −89% |
| il ciclo nudo (`n.vivo` e basta) | 9,12 ms | **0,38 ms** | **−96%** |

Il ciclo nudo è la misura pulita: attraversare 10 495 persone e leggere **un** campo. Quei 8,7 ms
di differenza sono il costo puro delle 966 mappe, e li pagava ogni ciclo del motore.

E la conferma indipendente, su `banco/scala.mjs`, che misura moduli mai toccati:
**emozioni −49%, umani −75%, fauna −33%** (vedi la tabella in §1).

### Le bestie stavano già bene

Controllate per confronto: **26 162 creature, 1 forma sola, 18 campi**. Ed è anche il motivo per
cui le misure sulla fauna tornavano pulite e quelle sulla gente no.

> **Per chi legge questo file per proporre ottimizzazioni:** prima di ottimizzare un ciclo,
> chiedetevi quante mappe vede. `banco/forme.mjs` lo conta, e ricava da solo l'elenco dei campi che
> nascono per strada — se qualcuno ne aggiunge uno, quella sonda lo dice. Un campo lazy costa più
> di mille micro-ottimizzazioni.

---

## 6.5 La prova che vale per tutte: otto semi, due motori

Ogni verifica di questo file aveva lo stesso limite, ed era il difetto più serio del metodo: **un
seme solo**. Un'ottimizzazione può lasciare intatta l'impronta di *quella* partita e romperne
un'altra — basta che la strada che sbaglia non venga mai percorsa lì dentro. È esattamente ciò che
rendeva vuota la verifica della coercizione (§6.3), e non c'era ragione di credere che fosse
l'unico caso.

Allora si è ricostruito il **motore di prima**: una copia dei sorgenti con le tre ottimizzazioni
tolte chirurgicamente — la forma unica, la potatura semantica, la potatura geometrica — e si sono
fatti girare gli **stessi otto semi** su tutt'e due.

```
node banco/multiseme.mjs ../src            uno,due,tre,...,otto 420 > dopo.txt
node banco/multiseme.mjs .../src_prima     uno,due,tre,...,otto 420 > prima.txt
diff prima.txt dopo.txt

NESSUNA DIFFERENZA SU 8 SEMI ✓
```

L'impronta di questa sonda è più severa di quella di `riproducibile.mjs`: diciotto grandezze, prese
apposta da **strade diverse del codice** — dove sta la gente (x e y), quanta fame ha, quanto si
capiscono, quanto sanno, quanti servi, quanti doni, quanti costretti, quante punizioni, quante
fazioni, quante razzie, quante materie inventate, quanti miti. Sono somme su tutti, non medie: una
media nasconde due errori che si compensano, una somma no.

> **Come rifarla dopo ogni ottimizzazione.** Copiare `src/`, togliere la modifica dalla copia, e
> confrontare le due liste. Se una sola cifra si muove su un solo seme, la modifica non è esatta —
> per bella che sia la spiegazione.

### ⚠️ E un avvertimento che è costato un falso allarme

Il primo giro ha detto `DIFFERENZE TROVATE`. Non erano differenze: il motore ricostruito non era
nemmeno partito, perché il taglio nella copia aveva portato via una graffa di troppo — e siccome
l'errore era finito in `2>/dev/null`, `diff` ha confrontato un file **vuoto** con otto righe.

**Non si silenzia mai lo stderr di una misura.** Un file vuoto e un file diverso si assomigliano
troppo, e nella stessa serata questo ha nascosto due guasti diversi.

### Una cosa sul mondo, non sulle prestazioni

Su tutti e otto i semi: `costretti: 0`, `servi: 0`. **La coercizione non scatta mai.** Il lavoro
forzato è scritto nel motore ma non emerge in nessun mondo misurato — la condizione che richiede
(qualcuno senza niente, molto affamato, poco coraggioso, più debole, e con accanto un dominatore
ricco) non si presenta mai insieme. È una legge scritta che non produce niente, e va guardata:
o la condizione è troppo stretta, o quel mondo non produce abbastanza miseria concentrata.

---

## 6.6 La fauna: quattro ipotesi sbagliate prima di quella giusta

Il profilo diceva una cosa che non poteva essere vera: **il costo per bestia passava da 0,87 a 8,80
µs mentre le bestie DIMINUIVANO** (26 103 → 16 921). Quel che cresceva nel frattempo era la gente.
Quindi dentro il passo di una bestia c'era qualcosa che scalava con gli umani.

Vale la pena elencare le ipotesi cadute, perché ognuna sembrava ovvia e ognuna è costata una misura:

| ipotesi | misura | esito |
|---|---|---|
| i cadaveri riempiono l'array | 0,4–0,7%, e a fine partita **zero** | ✗ |
| le chiavi-stringa della griglia | costano uguale a qualunque popolazione | ✗ |
| il cibo non si trova più e si ricerca | le ricerche falliscono lo **0%** | ✗ |
| troppi branchi, ognuno con la sua ricerca | 3,8–6,5 ms su 126 | ✗ |
| **la caccia rastrella un mondo dove le prede si sono diradate** | **472 168 bestie guardate a battito, 73% a vuoto** | ✓ |

E il difetto era già stato **diagnosticato e curato in una sola direzione**. Il commento nel codice
spiega perché la FUGA debba cercare su una griglia di soli predatori: *«l'uscita anticipata scatta
solo quando si trovano, e in un mondo di erbivori non si trovano»*. La CACCIA è la stessa cosa
nell'altro verso, ed era rimasta scoperta.

### Il rimedio: la potatura per TAGLIA

Una preda dev'essere più piccola di chi la insegue. Quindi si tiene, per ogni cella, **la bestia più
piccola** (separando terra e acqua), e una cella la cui più piccola è già troppo grande non può
contenere prede: si salta senza guardare nessuno.

```js
const limite = { min: a.dna.aquatic ? grid.minA : grid.minT,
                 soglia: a.dna.taglia * (0.55 + a.dna.carnivoria * 0.7) };
```

**È esatta.** Il margine più largo che `puoPredare` possa concedere è `0.55 + carnivoria * 0.7`
(l'altro ramo, `0.45`, è sempre più stretto); se la più piccola della cella non sta sotto
`taglia × quel margine`, lì dentro non c'è preda per **nessun** valore di margine — e `ok()` le
scarterebbe comunque tutte poche righe più sotto. È la stessa idea della potatura geometrica delle
fazioni, spostata dalla distanza alla **taglia**.

| | prima | dopo | |
|---|---|---|---|
| passo delle bestie (9 442 bestie, 8 548 persone) | 71,8 ms | **52,8 ms** | **−26%** |
| celle rastrellate dalla caccia | 30 902 | 19 820 | −36% |
| bestie guardate in faccia | 472 168 | 398 218 | −16% |

**Impronta identica su 6 semi** (`banco/multiseme.mjs` contro una copia dei sorgenti con *solo*
questa modifica tolta).

### Quel che resta lì, per chi continua

Si salta il 36% delle celle ma solo il 16% delle bestie guardate: **il limite è debole perché basta
una bestia piccola in una cella per doverla guardare tutta**. Due strade, in ordine di resa attesa:

1. **Separare la griglia per ambiente.** `puoPredare` scarta subito chi non vive nello stesso
   elemento (`a.dna.aquatic !== b.dna.aquatic`), e adesso quel controllo viene fatto una bestia alla
   volta. Due griglie invece di una lo farebbero una volta sola per interrogazione.
2. **Ordinare ogni cella per taglia.** Con la lista ordinata si smette di scorrere appena si supera
   la soglia, invece di guardare fino in fondo. Costa un ordinamento per cella a ogni ricostruzione
   (una ogni quattro battiti) e va misurato: potrebbe non valere.

---

## 7. Che cosa si può ancora cambiare, e a che prezzo

Tre leve esistono, ma **cambiano il mondo**, quindi non sono ottimizzazioni:

- **Raggio dei legami** (`raggioLegame`, 7): meno raggio = meno candidati = molto più veloce, ma i
  popoli si formano diversamente.
- **Cerchia** (K≈22): meno facce in mente = meno lavoro. Ha anche un senso nel mondo (i legami
  stretti umani sono ~15), ma cambia come si aggregano i popoli.
- **Frequenza del rebuild del grafo sociale** (ora ogni ~3 battiti): ricostruirlo meno spesso rende
  i legami stantii.

E una quarta, progettata ma non fatta, dove **la qualità rischia sul serio**: sciogliere in
distribuzioni statistiche le coorti lontane e omogenee (`TODO-COORTI.md`, Fase 3). Si guadagna
molto e si perdono i legami personali e le avversioni imparate di chi si dissolve.

---

## 8. Come misurare, se provi qualcosa

Le sonde stanno in `banco/` e girano senza browser.

```bash
node banco/riproducibile.mjs      # PRIMA di tutto: lo stesso seme dà lo stesso mondo?
node banco/scala.mjs              # gli esponenti per modulo a 600 → 1200 → 2400 → 4800
node banco/profilo_dentro.mjs     # dentro pop.step, quale metodo costa
node banco/fauna_dentro.mjs       # bestie / caccia / contagio, separati
node banco/passo_fazioni.mjs      # la prova (fallita) sulla griglia più fine
```

**La regola:** un'ottimizzazione è accettabile solo se l'impronta della partita resta identica, o se
un test differenziale mostra zero differenze sulle risposte. Se il mondo cambia, non è
un'ottimizzazione: è una modifica di gioco, e va valutata come tale.

**E un avvertimento pagato caro:** in questi moduli non entrano API di un solo ambiente. Un
cronometro scritto con `process.hrtime` funzionava headless e **spegneva l'intero ecosistema nel
browser**, senza che a schermo si vedesse nulla. Usare `performance.now()`, che c'è di qua e di là.
