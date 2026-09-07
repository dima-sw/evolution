const fs = require("fs");
const P = JSON.parse(fs.readFileSync(__dirname + "/pezzi.json", "utf8"));
const OUT = __dirname + "/../PRESTAZIONI.md";

const doc = `# Evolution — dove se ne va il tempo quando la gente è tanta

> **A chi legge (umano o AI).** Questo file è autosufficiente: contiene le misure, il codice vero dei
> punti caldi, e — soprattutto — **cosa è già stato provato e cosa ha fallito**. Leggi la sezione 5
> prima di proporre qualcosa: ci sono tre idee ovvie già misurate e scartate, e ripeterle costa tempo.

## 0. Che cosa è questo programma, in dieci righe

Simulatore 2D di civiltà emergente. JavaScript puro, moduli ES, nessuna libreria, nessun build:
\`node server.js\` e si apre su \`localhost:5188\`. ~10 800 righe in 29 moduli.

Il ciclo di simulazione (un «battito») è **seriale e sincrono**, e ogni battito tocca in ordine:
clima → persone → bestie → emozioni → edifici → fuoco, e ogni ~3 battiti anche
fazioni → cultura → società → entità → menti.

Vincoli non negoziabili, che escludono molte ottimizzazioni classiche:

1. **Il mondo deve restare riproducibile.** Stesso seme ⇒ stesso mondo, fino alla somma della fame
   di ogni persona. Niente \`Math.random()\`, niente ordini di iterazione non deterministici, niente
   parallelismo che cambi l'ordine delle scritture.
2. **Le ottimizzazioni non devono cambiare il mondo.** Ogni intervento fatto finora è stato
   verificato o con un test differenziale (stesse risposte) o con l'impronta di una partita intera
   (stessi numeri fino al quarto decimale).
3. **Gli individui restano individui.** Non si possono sostituire con medie: legami personali,
   avversioni imparate e memoria di chi ti ha fatto del male sono il contenuto del gioco.

---

## 1. Le misure: dove va il tempo

Banco headless, stesse condizioni, mappa 320×320, 58% acqua. Tempo per battito.

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

## 2. Il punto più caro: \`factions.js\` — costruire i legami sociali

**202,7 ms a 4 806 persone, ^1,63.** Dal profilo interno, la costruzione dell'adiacenza è **~72%**
di questo tempo.

### Che cosa fa

Per ogni persona trova le **K più vicine** entro un raggio (\`raggioLegame\`, default 7), scartando
chi la odia. Da quel grafo escono i popoli (union-find) e i governi (flood dal capo).

K non è costante: \`K = cerchiaBase + intelligenza·cerchiaTesta + socievolezza·cerchiaIndole\`
(default 10 + 14·i + 10·s, quindi **~22 in media, fino a 34**).

### Il codice

\`\`\`js
${P.fazioniAdiacenza}
\`\`\`

### Perché è caro

Il costo è \`n × (quante persone stanno davvero entro il raggio)\`. In un villaggio fitto sono
centinaia. L'uscita anticipata per anelli aiuta solo quando la cerchia si riempie **prima** di
esaurire il raggio — e con K≈22 spesso non succede.

### La seconda metà: assegnare i governi

**~13% del tempo di fazioni.** Per ogni grumo connesso si assegna un capo, poi si «inonda» il grafo
dal capo entro un budget di distanza. Il ciclo esterno gira finché restano abbastanza persone senza
capo.

\`\`\`js
${P.fazioniPolity}
\`\`\`

---

## 3. Il più ripido: \`society.js\` — \`stepSocietyAdvanced\`

**65 ms a 4 806 persone, ^1,72.** Gira ogni ~3 battiti.

Costruisce una griglia (celle da 10) e la presta a sei sottosistemi: trasferimenti, norme,
coercizione, educazione, voci, miti.

\`\`\`js
${P.societaVicini}
\`\`\`

**Il sospetto principale, non ancora misurato:** \`vicini(n)\` **alloca un array nuovo** con *tutti*
i vicini in un blocco 30×30 tile, a ogni chiamata. In un mondo fitto sono centinaia di elementi. E
alcuni chiamanti ne usano **uno solo** — per esempio \`voci()\` ne pesca uno a caso.

Esempio di chiamante (l'insegnamento):

\`\`\`js
${P.societaChiamanti}
\`\`\`

---

## 4. Il secondo costo assoluto: \`npc.js\` — il ciclo per-persona

**197,7 ms a 4 806 persone, ma ^0,96: è lineare.** Non è un problema di complessità, è che ogni
persona fa parecchie cose per battito. Parte del lavoro è già spezzata a turni (un terzo della gente
per battito per l'esperienza, un quinto per l'usura) o dietro un dado (\`rng() < 0,15\` per il
deperimento, \`< 0,02\` per il mestiere).

C'è un indice del vicinato condiviso, costruito una volta per battito:

\`\`\`js
${P.npcVicini}
\`\`\`

E una scansione a finestra sulla griglia del cibo, usata sia dalle persone sia dalle bestie —
**289 tile letti per chiamata** con R=8:

\`\`\`js
${P.npcBestCell}
\`\`\`

---

## 5. LA FAUNA — e le tre cose già provate

**173,8 ms a 4 806 persone.** Ma qui il numero da guardare è il **costo per bestia**, perché il
totale segue quante bestie ci sono, non quanta gente.

Il passo delle bestie è spezzato in turni (\`turniFauna\`, default **2**): chi tocca il turno riceve
il tempo di tutti.

\`\`\`js
${P.faunaCreatura}
\`\`\`

Il pascolo, che è il ramo più battuto (quasi nessuna bestia è mai sazia):

\`\`\`js
${P.faunaPascolo}
\`\`\`

La ricerca spaziale, già ottimizzata ad anelli concentrici con uscita anticipata:

\`\`\`js
${P.faunaGrid}
\`\`\`

### ⚠️ Già provato sulla fauna — non riproporlo

| intervento | esito |
|---|---|
| **Anelli concentrici + uscita anticipata** al posto della scansione a riquadro | ✅ **fatto.** Verificato su 9 000 interrogazioni in tre densità: **zero differenze**, 4–6× più veloce nella calca. |
| **Griglia dei soli predatori** invece di quella di tutte le bestie | ✅ **fatto, ed è stato il guadagno grosso.** A 27 659 bestie: **164,8 → 35,5 ms**. Risposta identica (\`puoPredare\` scarta chiunque abbia carnivoria < 0,35, che è esattamente il criterio della griglia). Verificato su 16 000 interrogazioni **e** con l'impronta di una partita intera identica al quarto decimale. |
| Metterla solo nel branco e non anche nei solitari | ⚠️ rendeva **il 10%**. Il grosso stava nel percorso dei solitari. |
| Sospettare che il costo fosse la caccia degli umani o il contagio | ❌ **smentito misurando**: caccia 0,6 → 3,5 ms, contagio 1 → 9 ms. Irrilevanti. Era il costo per bestia. |

---

## 6. ⚠️ TUTTO QUELLO CHE È GIÀ STATO PROVATO — leggere prima di proporre

| idea | esito misurato |
|---|---|
| **Cerchia sociale finita** (ognuno tiene in mente K persone, non tutte) | ✅ fazioni da **^2,30 a ^1,73**. |
| **Ordinare i candidati capo una volta sola** invece che a ogni trono | ✅ la fase «chi governa chi» da **^2,35 a ^1,79**. |
| **Griglia più fine per le fazioni** (celle da 1 invece di 2) | ❌ **peggio del 14–19%.** Celle da 3 sono uguali a celle da 2. I popoli risultano identici in tutte e tre le prove, quindi la griglia non cambia mai il risultato: non è quella la leva. |
| **Unificare le cinque griglie spaziali** (emozioni, società, fazioni, fauna, gente) | ❌ scartato **con la ragione**: il costo di quei moduli sta nel lavoro *per persona*, non nel costruire la griglia (costruirne una su 5 000 persone è dell'ordine del millisecondo contro i 92 ms del passo delle emozioni). In più \`cellNeighbors\` restituisce un **riquadro** e \`pop.vicini\` un **cerchio**: scambiarli cambierebbe quanta gente ciascuno frequenta. Sarebbe una modifica di comportamento travestita da ottimizzazione. |
| **Indice id→persona** al posto di \`npcs.find()\` dentro i cicli | ✅ fatto in \`entities.js\`. |
| **\`push(...arr)\` → ciclo** in \`cellNeighbors\` | ✅ fatto: lo spread è lento su array grandi e **può far saltare lo stack** in una cella affollata. |
| **Web Worker / multithreading** | ❌ **non fatto, e con una ragione misurata.** Disegnare costa **13 ms** su 4 000 persone contro **383 ms** di simulazione: il collo non è mai stato lo schermo. Un worker toglierebbe il blocco dell'interfaccia ma non farebbe passare un anno in più al secondo. E il modello è fittamente interdipendente (persona → società → fazione → economia → cultura → ambiente → persona): dividerlo a regioni rompe l'emergenza sulle cuciture, e in JS si condividono solo numeri nudi (SharedArrayBuffer), il che vorrebbe dire riscrivere tutto in struct-of-arrays. |
| **Togliere una quadratica vale più di N cuori** | Portare le fazioni da ^2,30 a ^1,52 significa che raddoppiando la gente il costo si moltiplica per 2,9 invece che per 4,9: un guadagno che **cresce** con la civiltà. Otto cuori danno un fattore fisso 8, una volta sola, e poi la curva riprende a salire come prima. |

---

## 7. Che cosa si può ancora cambiare, e a che prezzo

Tre leve esistono, ma **cambiano il mondo**, quindi non sono ottimizzazioni:

- **Raggio dei legami** (\`raggioLegame\`, 7): meno raggio = meno candidati = molto più veloce, ma i
  popoli si formano diversamente.
- **Cerchia** (K≈22): meno facce in mente = meno lavoro. Ha anche un senso nel mondo (i legami
  stretti umani sono ~15), ma cambia come si aggregano i popoli.
- **Frequenza del rebuild del grafo sociale** (ora ogni ~3 battiti): ricostruirlo meno spesso rende
  i legami stantii.

E una quarta, progettata ma non fatta, dove **la qualità rischia sul serio**: sciogliere in
distribuzioni statistiche le coorti lontane e omogenee (\`TODO-COORTI.md\`, Fase 3). Si guadagna
molto e si perdono i legami personali e le avversioni imparate di chi si dissolve.

---

## 8. Come misurare, se provi qualcosa

Le sonde stanno in \`banco/\` e girano senza browser.

\`\`\`bash
node banco/riproducibile.mjs      # PRIMA di tutto: lo stesso seme dà lo stesso mondo?
node banco/scala.mjs              # gli esponenti per modulo a 600 → 1200 → 2400 → 4800
node banco/profilo_dentro.mjs     # dentro pop.step, quale metodo costa
node banco/fauna_dentro.mjs       # bestie / caccia / contagio, separati
node banco/passo_fazioni.mjs      # la prova (fallita) sulla griglia più fine
\`\`\`

**La regola:** un'ottimizzazione è accettabile solo se l'impronta della partita resta identica, o se
un test differenziale mostra zero differenze sulle risposte. Se il mondo cambia, non è
un'ottimizzazione: è una modifica di gioco, e va valutata come tale.

**E un avvertimento pagato caro:** in questi moduli non entrano API di un solo ambiente. Un
cronometro scritto con \`process.hrtime\` funzionava headless e **spegneva l'intero ecosistema nel
browser**, senza che a schermo si vedesse nulla. Usare \`performance.now()\`, che c'è di qua e di là.
`;

fs.writeFileSync(OUT, doc);
console.log("scritto: " + OUT + "  (" + doc.split("\n").length + " righe)");
