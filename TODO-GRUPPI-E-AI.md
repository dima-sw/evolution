# Tetti, gruppi, mestieri e libertà dell'AI

Quattro cose distinte, che vale la pena non confondere. Una è un equivoco d'interfaccia, una è
prestazioni, una è libertà dell'AI, e una è un limite vero.

---

## A. I mestieri: non è un bug, è un'etichetta che inganna

**La domanda:** 1 457 vivi ma solo ~410 con un mestiere. *«Gli altri che fanno?»*

**La risposta, verificata nel codice** (`updateMestiere`): il mestiere si assegna solo a chi supera
di **2,2 volte la media del proprio popolo** in un'attività. Per costruzione la maggioranza sta
nella media, quindi non ha etichetta. Ma non è disoccupata: raccoglie, coltiva, costruisce, cura,
combatte — un po' di tutto.

«Mestiere» qui vuol dire **specialista**, non *impiegato*. Ed è la correzione che avevamo fatto
apposta: prima usciva «raccoglitore ×900», che non è un mestiere — raccogliere lo fanno tutti.

Quindi il motore ha ragione e l'interfaccia mente. Da fare:

- [x] **A1.** ✅ Mostrare *che cosa sta facendo la gente ADESSO* (`npc._att`, che la vista «Attività»
  già colora ma nessun pannello conta): «raccoglie ×340 · coltiva ×210 · costruisce ×95 …». Così si
  vede a colpo d'occhio che nessuno è fermo.
- [x] **A2.** ✅ Rinominare la voce in **«specializzazioni emerse»** e aggiungere **«generalisti: N»**,
  che è la maggioranza e deve esserlo.
- [x] **A3.** ✅ Verificare che sia vero: contare quanti hanno `_att` nullo in un istante qualunque. Se
  qualcuno è davvero fermo, *quello* è un bug — ma va misurato prima di crederci.

---

## B. Togliere i tetti — e come aggregare senza perdere niente

I tetti sono `tettoPopolazione: 1400` e `tettoFauna: 3000`. Non sono regole del mondo: la
descrizione del parametro lo dice già («Limite per non bloccare il browser»). Sono lì perché ogni
essere costa un aggiornamento per passo.

### La proposta e perché ne ho una migliore

L'idea era: sostituire il gruppo con **un'entità che tiene le probabilità di ogni attributo**.
Funziona, ma **perde le correlazioni fra i geni**. Se un branco ha taglia media 0,5 e carnivoria
media 0,3, non si può più sapere che *i grossi erano i carnivori*. E quando il branco si divide, ne
escono individui incoerenti — con combinazioni di proprietà che non erano mai esistite.

Tutto questo progetto sta in piedi sul fatto che ogni essere è **un fascio coerente di proprietà**.
Sostituirlo con delle medie sarebbe la stessa perdita che abbiamo passato la notte a togliere
altrove: sarebbe una *categoria* al posto di un insieme di individui.

### L'alternativa: il branco è uno SGUARDO, non una sostituzione

Gli individui restano tutti. Quando molti esseri simili stanno stretti nello stesso posto:

1. **si disegnano come uno solo**, con il numero accanto e le caratteristiche del gruppo — che è
   esattamente quello che si voleva vedere;
2. **si aggiornano con un conto solo invece di N**, perché stanno nello stesso tile, con lo stesso
   clima, lo stesso cibo, le stesse minacce: quasi tutto il lavoro per individuo è identico e viene
   rifatto N volte per niente.

Non si perde nulla, è reversibile, e un singolo può staccarsi in qualunque momento. E costa **meno**
lavoro che costruire le distribuzioni, perché non serve inventare come ricomporre gli individui.

- [x] **B1. Disegno.** ✅ Raggruppare in `AgentsRenderer` gli esseri simili e vicini: un glifo, il
  numero, e nel tooltip la composizione. Nessun rischio, guadagno visivo immediato.
- [—] **B2. Passo condiviso.** **Ritirato dopo la misura** — Per un gruppo compatto e omogeneo, calcolare una volta ciò che
  dipende dal *posto* (clima, cibo del tile, minacce, fatica del terreno) e applicarlo a tutti,
  lasciando individuale solo ciò che dipende dai geni. È qui che si guadagna davvero.
- [x] **B3. Alzare i tetti.** ✅ Misurato il costo a 3 224 persone e 5 881 bestie: si può, ma prima va tolto il collo di bottiglia vero (le fazioni). Vedi sotto.
- [x] **B4. I solitari restano solitari.** ✅ Il difetto vero era peggio di quel che c'era scritto:
  `socialita` si ereditava, mutava a ogni generazione e **non faceva assolutamente niente**. Un gene
  senza conseguenze non si può selezionare — derivava a caso. Adesso ha un premio e un prezzo, in
  tensione fra loro: chi sta col gruppo riceve le molte paia d'occhi del branco (vede il predatore
  prima), ma pascola dove pascolano gli altri e mangia peggio; chi è schivo trova l'erba buona e se
  la vede da sé. Misurato in un mondo rado (1 894 bestie): un solitario sta il **18% più lontano**
  dal suo vicino più stretto (3,15 contro 2,67). A 3 386 bestie il divario scende al 6%, a 21 000
  sparisce — ed è giusto così: in un mondo saturo nessuno *può* stare solo.

---

## C. L'AI libera

**Il problema, e ha ragione:** oggi `vocabolario(pop, f)` in `ai.js` limita gli ordini a **ciò che
quel popolo ha già fatto almeno una volta**, e `validaEditti` scarta il resto. Era nato per farla
partire ignorante, ma è la forma sbagliata di ignoranza: è una **lista bianca**, e una lista bianca
la fa sembrare un bot.

L'ignoranza giusta è un'altra: **poter ordinare qualunque cosa, e scoprire che non succede** perché
nessuno sa come si fa, o nessuno vuole. Il limite deve stare nel mondo, non nel prompt.

- [x] **C1. Via la lista bianca.** ✅ Qualunque ordine si può impartire. Se il popolo non sa fare quella
  cosa, l'ordine cade nel vuoto — e il capo lo legge nel rapporto. Impara sbagliando, come tutti.
- [x] **C2. Ordini con numeri e luoghi.** ✅ (c'erano già `quanti` e `x,y`: mancava che il capo sapesse di poterli usare) «40 persone: addestrarsi alle armi», «50: coltivare fra x e
  y». Oggi un editto vale per tutti indistintamente. Serve poter dire *quanti* e *dove*, e lasciare
  che l'obbedienza decida chi davvero obbedisce.
- [x] **C3. Delegati.** ✅ Non è servita nessuna gerarchia: la legge c'era già — la voce del capo si
  spegne con la distanza. Ora l'obbedienza si misura sulla **voce più vicina** fra il capo e i suoi
  nominati, e quella di un delegato vale meno (0,55 più il potere che ha messo insieme). Misurato su
  un popolo di 170: chi sta a 45 passi dal capo passa da **0,581 a 0,760** di obbedienza quando il
  capo mette qualcuno in mezzo a loro; chi gli sta addosso resta a 0,965. È il motivo per cui gli
  imperi hanno sempre avuto governatori — e il rovescio è che un delegato lontano e molto ascoltato
  è esattamente la stoffa di cui è fatto un usurpatore.
- [x] **C4. Quello che sa.** ✅ (risorse e messaggi c'erano già; mancavano i rapporti degli esploratori) Deve avere davanti: che cosa possiede il regno (materie, cibo, armi),
  che cosa hanno riportato gli esploratori, che cosa dicono i vicini — **menzogne comprese**, senza
  che nessuno gli dica quali. Sta a lui decidere a chi credere.
- [x] **C5. Le tendenze restano.** ✅ La lista chiusa in `validaEditti` è caduta: passa qualunque
  parola. `INDOLE{}` continua a piegare quello che *gli viene in mente*, ma non decide più che cosa
  gli è *permesso*. Una parola che il mondo non conosce viene **interpretata** da chi la riceve
  (`interpreta()` in `orders.js`), il senso si assesta a maggioranza fra i primi otto, e l'esito la
  radica o la sfalda. Misurato dentro la simulazione completa: 29 912 ordini presi in carico con parole prima
  scartate al 100%, 257 significati nati, 84 radicati e 12 sfaldati.

---

## D. Il limite vero che resta sotto tutto

- [x] **D1. L'usura.** ✅ Le case si sfanno: `logora()` legge la `durata` che `riparoDi()` calcolava
  già e che non leggeva nessuno, e la pesa col tempo che fa in quel punto (umidità, sbalzi, pioggia).
  La pietra dura, la paglia no; chi smette di curare una casa la perde e torna a dormire allo
  scoperto. È il pezzo che mancava perché **la ricchezza costi** invece di accumularsi e basta.
  *(Resta da fare l'usura degli oggetti portati addosso, non solo delle case.)*
- [x] **D2. Il recipiente.** ✅ Rovesciato: il difetto non era che i liquidi si perdessero — era che
  **non si perdevano affatto**, e stavano nell'inventario come sassi. Ora un liquido senza niente che
  lo tenga si versa. E non serviva una proprietà nuova: `tieneLiquidi()` in `matter.js` risponde con
  quelle che c'erano già — deve stare in piedi (durezza + coesione), non bere né sbriciolarsi, e
  potersi cavare in una delle tre maniere vere (si plasma, si cola, si scava). Misurato: Stagno 0,98,
  Bambù 0,90, Rame 0,89, Argilla 0,74, Pelle 0,69 — e fuori grano, carne, sabbia, diamante.

---

## La regola di lavoro

Quella che ha funzionato tutta la notte, e che vale anche qui: **misurare prima di toccare**. Tre
delle cose che sembravano mancare — le emozioni da riscrivere, le rotte commerciali, i mestieri —
si sono rivelate o già presenti o non difetti. Ogni voce di questo elenco si chiude solo con un
numero misurato accanto.


---

## Misurato — A (i mestieri)

**Nessuno è fermo.** Su 1 418 vivi, la voce «(nessuna attività)» non compare nemmeno:

> raccogliere ×924 · dormire ×117 · commerciare ×104 · cercare cibo ×102 · migrare ×80 ·
> insegnare ×49 · leggere ×29 · fabbricare ×5 · costruire ×4 · coltivare ×3 · ribellarsi ×1

E c'è una cosa che non sapevo e che non ha scritto nessuno: **gli specialisti hanno 51,6 anni di
media contro i 34,5 dei generalisti**, e 184 gesti in vita contro 81. Il mestiere è il frutto di
una vita — i giovani non si sono ancora specializzati. Il motore aveva ragione, mentiva l'etichetta.

## Misurato — C (l'AI libera)

Tolta la lista bianca, i capi hanno cominciato a comandare per davvero. Editti osservati in gioco:

> `attaccare×120, raccogliere×80, coltivare×60` — un capo che manda **120 persone all'attacco**
> `commerciare×4, coltivare×30, proteggere×20`
> `attaccare×40, raccogliere×10`

È l'esempio chiesto, alla lettera. In un centinaio d'anni: 114 editti, 41 riflessioni, 22 menzogne,
38 repressioni, 53 elargizioni, e un capo che si è nominato un **generale**. L'obbedienza resta
parziale (269 obbediti contro 375 ignorati): gli ordini restano **influenza**, non comandi.

E il rapporto ora dice al capo, ordine per ordine, che cosa è stato raccolto e che cosa è caduto nel
vuoto — con la nota «nessuno l'ha mai fatto prima» quando ha azzardato. Senza quello la libertà
sarebbe stata solo rumore: uno che comanda a caso e non se ne accorge.

## Misurato — C4 (i rapporti degli esploratori)

Il capo riceve ora notizie come: «a 3 giornate di cammino: ci si mangia 0,36, il terreno da 1,70,
ci vive gente — **e di altri**» oppure «a 7 giornate: ci si mangia 0,81, il terreno da 1,61,
**non ci vive nessuno**». Solo terre che i suoi hanno davvero calpestato (58% del mondo, in prova).

E nessuno gli dice che farsene: colonizzare il vuoto fertile, prendersi il ricco occupato, o restare
dov'e. E soltanto la notizia.


---

## Misurato — B: dove va davvero il tempo

Il profilo ha ribaltato l'assunto di partenza, ed è per questo che vale la pena misurare prima.

**A popolazione normale** (1 409 umani, 2 978 bestie):

| | ms/giro | quota |
|---|---|---|
| umani (`pop.step`) | 95,6 | **46%** |
| società/emozioni | 40,6 | 20% |
| **fauna** | **29,1** | **14%** |

**Un umano costa 7 volte un animale.** Aggregare i branchi avrebbe limato il 14% — la cosa
sbagliata. Per questo **B2 è ritirato**: il disegno a branchi (B1) resta, perché serviva all'occhio
e quello lo risolve; il passo condiviso non risolverebbe niente di misurabile.

### Due correzioni sicure sugli umani: −14%

- [x] **L'indice delle presenze.** Ogni persona chiedeva a *tutti* i materiali del mondo «quanto ce
  n'è qui?»: 65 000 domande a battito, quasi tutte con risposta «niente». I giacimenti stanno fermi,
  quindi l'elenco di cosa c'è in un posto si scrive una volta e si riusa.
- [x] **La mappa a turni.** Un ciclo passava su tutti i 102 400 tile a ogni battito — un milione e
  mezzo di conti, e **indipendenti dalla popolazione**: un mondo deserto costava quanto uno pieno.
  Ricrescita, stanchezza del suolo e sentieri sono processi lenti e lisci: ora se ne aggiorna un
  quarto per volta con quattro volte il passo. Stessa fisica, guardata a turni.
  *(Ci stava per scappare un bug: `vegFraction` calcolata sulla somma della sola fetta sarebbe stata
  un quarto del vero, e il mondo si sarebbe creduto in carestia perenne.)*

`pop.step`: **95,6 → 82,6 ms**. E dopo, il profilo interno dice che non resta un singolo collo di
bottiglia: `gatherAndCraft` 13,7 ms, movimento ~10, il resto sparso su decine di piccole
valutazioni. Limare oltre darebbe pochi millisecondi per molto rischio.

### Il collo di bottiglia vero: le fazioni

Raddoppiando i tetti (**3 224 umani, 5 881 bestie**) il quadro cambia del tutto:

| | 1 400 | 3 224 | fattore |
|---|---|---|---|
| umani | 82,6 | 165,5 | 2,0× |
| società | 47,8 | 91,4 | 1,9× |
| fauna | 32,6 | 108,7 | 3,3× |
| **fazioni** | **21,8** | **117,0** | **5,4×** |

La popolazione cresce di 2,3 volte e le fazioni costano **5,4 volte tanto**: crescono col quadrato.
**È quello a impedire di alzare i tetti** — non gli animali, non la gente.

- [x] **La cella tarata sul raggio.** La griglia spaziale usava celle da 10 mentre il raggio dei
  legami è 7: si scandagliava un blocco di 30×30 tile per trovare la gente entro 7. Diciotto volte
  più candidati del necessario, e in un mondo che si riempie il costo cresce col quadrato della
  densità. Ora la cella vale quanto il raggio.
  **Non è un'approssimazione:** con cella 7 il blocco 3×3 copre ±10,5 dal centro, e una persona sta
  al più a 3,5 dal centro — i vicini entro 7 sono sempre tutti coperti. Trova esattamente le stesse
  persone, guardandone molte meno.


### Il costo seguiva l'AREA, non la civiltà

La scoperta che ha cambiato la risposta. Un mondo **512×512 con sole 500 persone** costava più di uno
320×320 con millequattrocento: quindi buona parte del lavoro non dipendeva da quanta gente ci fosse,
ma da quanti tile avesse la mappa — un mondo deserto costava quanto un mondo pieno.

- [x] **Anche la ricrescita delle piante va a turni.** Passava su ogni tile per ogni specie: con
  quindici piante e un mondo grande sono milioni di conti a chiamata. Stesso rimedio del ciclo della
  vegetazione, e per la stessa ragione: è un processo lento e liscio, quindi un quarto di mappa per
  volta col quadruplo del passo. **`pop.step` a 512×512: 57,1 → 41,2 ms** (−28%).

### La risposta vera a «togliere i limiti»: un mondo più grande

- [x] **La larghezza del mondo è ora un cursore** (192–640, sotto «Generazione del mondo»). Era
  ferma a 320×320 solo perché nessuno aveva esposto quel numero: il motore era già indipendente
  dalla dimensione, verificato a 512×512.

  È questo — non i tetti sulla popolazione — a decidere quanto può crescere una civiltà. In uno
  spazio fisso il doppio della gente vuol dire il doppio dei **vicini a testa**, e ogni domanda «chi
  ho intorno?» costa il doppio: è quadratico per forza di cose e non si lima via. Più spazio invece
  significa più gente alla **stessa densità**, quindi allo stesso costo a testa.

### Riepilogo delle misure (banco headless, condizioni confrontabili)

| intervento | prima | dopo |
|---|---|---|
| `pop.step` — indice presenze + mappa a turni (320², 1 400 persone) | 95,6 ms | **82,6 ms** |
| `fazioni` — cella tarata sul raggio (3 224 persone) | 117,0 ms | **76,9 ms** |
| `pop.step` — ricrescita a turni (512², 500 persone) | 57,1 ms | **41,2 ms** |

**Una nota onesta sul metodo.** Avevo riportato anche misure di «anni al secondo» prese dal browser
(3,2 contro 0,32) e **non valgono**: la scheda risultava `document.hidden`, e in quello stato il
browser strozza `setInterval`. Me ne sono accorto solo quando un mondo di 175 persone ha dato lo
stesso identico ritmo di uno da 3 410 — un numero troppo uguale per essere vero. Le cifre qui sopra
vengono tutte dal banco headless, prese nelle stesse condizioni.

---

## Misurato — l'esponente, e le cose che la misura dice di NON fare

Sapere che un modulo rallenta non basta: serve **come** rallenta. A 600 → 1 200 → 2 400 → 4 800
persone, tre moduli erano superlineari e la causa era sempre la stessa — *si scorreva tutta la folla
per trovare le poche persone vicine.*

| | prima | dopo |
|---|---|---|
| fazioni, costruzione dei legami | ^2,28 | **^1,72** |
| fazioni, chi governa chi | ^2,35 | **^1,79** |
| fazioni in tutto, a 4 800 persone | 296,6 ms | **168 ms** |
| fauna, a 2 400 persone | 154 ms | **117 ms** |

Gli anelli concentrici danno **esattamente** le stesse risposte della scansione a riquadro —
verificato su 9 000 interrogazioni in tre regimi di densità, zero differenze — e sono 4–6 volte più
veloci nella calca.

### E due cose che ho deciso di NON fare, con la ragione

- **Unificare le cinque griglie spaziali** (emozioni, società, fazioni, fauna, gente). Sembra un
  guadagno ovvio, ma il costo di quei moduli sta nel lavoro *per persona*, non nel costruire la
  griglia: costruirne una su cinquemila persone è dell'ordine del millisecondo contro i 111 ms del
  passo delle emozioni. In più `cellNeighbors` restituisce un **riquadro** di celle e `pop.vicini`
  un **cerchio**: non sono la stessa cosa, e scambiarli cambierebbe quanta gente ciascuno frequenta.
  Sarebbe una modifica di comportamento travestita da ottimizzazione, per un guadagno che non c'è.

- **La Fase 3 delle coorti** (sciogliere in distribuzioni le coorti lontane e omogenee) resta il
  guadagno grosso non fatto, ed è anche l'unico posto dove la qualità rischia davvero. Va affrontata
  con la stessa disciplina: misurare prima cosa si perde, non solo quanto si guadagna.

### E una che la misura ha imposto

Il **contagio** non sentiva la calca. Dentro un `break` a `animals.js:405` c'era che un malato
contagiava **al massimo una persona** — per giunta la prima nell'ordine dell'elenco, non la più
vicina. Chi stava in mezzo a cinquecento contagiava quanto un eremita. È una legge di livello 2, e
non è un dettaglio: la densità che si paga con la malattia è storicamente *il* freno delle città.
