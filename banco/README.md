# Il banco di prova

> *Misurare prima di toccare — e assicurarsi che la misura sia una misura.*

Queste sono le sonde con cui il mondo è stato interrogato. Non sono test che passano o falliscono:
sono **domande al mondo**, e la risposta è un numero. Girano senza browser, direttamente su `../src`.

```bash
node banco/riproducibile.mjs
```

Alcune scrivono anche su file se si passa `LOG=nome.txt`. Quei file sono scarti di una corsa,
non sorgente: si buttano.

Quasi tutte accettano `<seme> <giri>`; il seme decide il mondo, e **lo stesso seme dà lo stesso
identico mondo** — senza quello nessun confronto varrebbe niente, ed è la prima cosa da ricontrollare
dopo qualunque modifica.

---

## Prima di ogni altra cosa

| sonda | che domanda fa |
|---|---|
| `riproducibile.mjs` | *Lo stesso seme dà lo stesso mondo?* Se no, fermarsi: nessun A/B ha senso. |
| `sim.mjs` | Non è una sonda: è il banco. Riproduce il ciclo di `main.js` senza DOM. |
| `regressione.mjs` | *Il mondo sta bene?* Vivi, fame, salute, fertilità ogni 500 battiti. `LOG=x.txt node banco/regressione.mjs <seme> <acqua%> <giri>` |

## Le prestazioni

| sonda | che domanda fa |
|---|---|
| `ab_adiacenza.mjs` | **Il modello di come si misura un'ottimizzazione qui.** Le due versioni della funzione nello stesso processo, sullo stesso mondo, alternate — e prima di cronometrare verifica che diano gli stessi identici risultati, altrimenti si ferma. Due giri diversi del banco su questa macchina differiscono del 10–15%: confrontarli non serve a niente. |
| `spazzatura.mjs` | *Quanto di quel tempo è allocazione?* Memoria consumata per battito e pausa di raccolta. `node --expose-gc banco/spazzatura.mjs` |
| `misura_societa.mjs` · `conta_vicini.mjs` | Come si è scoperto che la cache del vicinato non rendeva: 650 chiamate per passo su mille celle. |
| `scala.mjs` | *Come cresce il costo con la gente?* Dà l'**esponente** per modulo a 600 → 1 200 → 2 400 → 4 800 persone. È la misura che conta: un ^2 impianta il mondo, un ^1 no. |
| `capienza_mondo.mjs` | *Quanta gente può nutrire questa mappa?* Si conta, non si simula. `DIM=192 node capienza_mondo.mjs` |
| `profilo_dentro.mjs` | *Dentro `pop.step`, quale metodo costa?* Avvolge i metodi sospetti senza toccare il sorgente. |
| `fauna_dentro.mjs` | *Dentro il passo delle bestie, chi costa?* Separa le bestie (che scalano col numero di bestie) dalla caccia degli umani e dal contagio (che scalano con la gente). Sommarle dava esponenti senza senso. |
| `turni_fauna.mjs` | *Quanto costa restituire la reattività alle bestie?* Il passo della fauna è spezzato in turni: con 4, una bestia si accorge del predatore fino a tre battiti dopo. Qui si vede il prezzo di 2 e di 1. |
| `passo_fazioni.mjs` | *Conviene una griglia più fine per i legami sociali?* **No, e la misura lo dice:** celle da 1 costano il 14–19% in più, celle da 3 sono uguali a quelle da 2. Tenuto perché un risultato negativo serve a non ritentarlo. |
| `verifica_grigliapred.mjs` | *La griglia dei soli predatori dà le stesse risposte di quella piena?* 16 000 interrogazioni in quattro regimi. |
| `profilo_societa.mjs` | *Dentro la società, quale dei nove sottosistemi costa?* Se ne conosceva solo il totale. Conta i millisecondi **e il lavoro** — quante volte si chiede il vicinato e quanta gente ne esce — perché «lento» e «guarda troppa gente per fare pochissimo» sono due problemi diversi. Include **il metro**: un ciclo nudo che attraversa tutti e legge un campo solo, per sapere quanto costa non fare niente. |
| `ab_doni.mjs` | *Si può saltare una ricerca quando in giro non c'è nessuno da trovare?* Confronta le SCELTE, non i tempi, e si ferma se non coincidono. E **costruisce apposta il caso che conta**: riduce in miseria della gente a densità crescenti, perché prima il confronto dava `0 (potata 0) ✓` — due liste vuote coincidono sempre, e non è una verifica. |
| `conta_cibo.mjs` | *Quanto costa davvero cercare il cibo a occhio?* Risposta: 2,7% del battito, e il 99,8% delle ricerche trova qualcosa. Serviva prima di costruire una griglia grossolana del cibo: **non conviene**, e ora è misurato invece che intuito. |
| `forme.mjs` | *Quante forme nascoste hanno le persone?* La misura più redditizia del progetto: erano **966 su 1 345**, e ogni lettura di proprietà costava 164 ns invece di 4. Ricava da sola l'elenco dei campi che nascono per strada: se qualcuno ne aggiunge uno, questa sonda lo dice. `node --allow-natives-syntax banco/forme.mjs` |
| `verifica_anelli.mjs` | *La ricerca per anelli dà le stesse risposte della scansione a riquadro?* Confronto diretto su 9 000 interrogazioni in tre densità. |

## Che il mondo sia rimasto lo stesso

| sonda | che domanda fa |
|---|---|
| `multiseme.mjs` | **La prova che vale per tutte.** Prende una cartella di sorgenti QUALSIASI e stampa l'impronta di N semi: facendola girare sul motore di adesso e su una copia con l'ottimizzazione tolta, le due liste devono coincidere riga per riga. Un'ottimizzazione può lasciare intatta l'impronta di *quella* partita e romperne un'altra — basta che la strada che sbaglia non venga mai percorsa lì dentro. `node banco/multiseme.mjs ../src "uno,due,tre" 420` |
| `prova_storia.mjs` | *I grafici dicono il vero?* Un grafico sbagliato non sembra rotto: sembra un fatto. Controlla l'anello (i vecchi si perdono, i superstiti restano in ordine), che il «ritmo» sia una derivata sul TEMPO e non sui campioni, che nessuna serie produca valori non finiti, e — con un `Proxy` che spia chi legge cosa — che **ogni serie legga campi che esistono davvero**: una serie a zero può essere un fenomeno non ancora accaduto o un nome scritto male, e dal valore le due cose sono indistinguibili. |

## Le leggi del mondo

| sonda | che domanda fa |
|---|---|
| `carestia.mjs` | *La fame emerge, o è il mondo a non produrla?* Fa girare lo stesso mondo con la ricrescita della vegetazione da abbondanza a carestia. Conta gli **episodi** di fame, non l'istante finale: chi ha fame o mangia o muore, e in una fotografia non lo vedi mai. Stampa anche **la quadratura** delle uscite dalla servitù — entrati = ribellati + orfani + morti + ancora servi — perché un totale che non torna è l'unico modo affidabile per scoprire un meccanismo che non sai di avere. |
| `perche_niente_servi.mjs` | *Quale delle cinque condizioni blocca tutto?* Contarle insieme dice solo che il totale è zero; contarle una per una dice quale non si avvera mai. |
| `affordanza.mjs` | *E se il motore smettesse di dire che cosa sono le cose?* Stessa partita due volte. La domanda che decide: i popoli arrivano a nomi **diversi** per la stessa materia, o convergono tutti sugli stessi — che vorrebbe dire categorie note con un vestito nuovo? (24 su 24 diversi.) |
| `mare.mjs` | *Il mare è davvero tutto salato, anche dopo secoli di frane?* Conta le incoerenze terra/mare. |
| `vasi.mjs` | *Che cosa tiene un liquido?* Nessun recipiente è dichiarato: si guarda solo la fisica. |
| `attrezzi.mjs` | *Gli attrezzi si consumano, e di che se li fanno?* |
| `ere.mjs` | *L'attrezzo che si consuma blocca il progresso?* (l'era dei metalli si raggiunge ancora?) |
| `branchi.mjs` | *La socialità conta davvero?* Un solitario sta più lontano dai suoi di un gregario? |
| `usanze.mjs` | *Un'usanza che giova si diffonde?* |

## Il potere

| sonda | che domanda fa |
|---|---|
| `parole.mjs` | *Un capo può ordinare una parola che il mondo non conosce?* Che senso le danno popoli diversi? |
| `delegati.mjs` | *Un delegato estende davvero la portata della voce del capo?* |

## Rigenerare il rapporto sulle prestazioni

`PRESTAZIONI.md` (nella radice) non si scrive a mano: si genera, così il codice che contiene non può
divergere da quello che gira davvero.

```bash
node banco/estrai_punti_caldi.cjs && node banco/costruisci_prestazioni.cjs
```

Il primo estrae i blocchi caldi dal sorgente, il secondo li impagina insieme alle misure. Se sposti
una funzione, aggiorna le àncore in `estrai_punti_caldi.cjs`.

## Causa o effetto

| sonda | che domanda fa |
|---|---|
| `invidia.mjs` | La **fotografia**: che cosa sta insieme a che cosa, adesso. |
| `invidia_prima.mjs` | Il **film**: il divario registrato *prima*, la guerra osservata *dopo*. |

Queste due meritano una riga in più, perché il progetto ci ha sbattuto contro.

La fotografia diceva che i popoli in guerra hanno divari di taglia grandi, e sembrava ovvio leggerlo
come «i grandi attaccano i piccoli». Il film dice il contrario: **a farsi la guerra sono i vicini
alla pari** (divario 0,211 contro 0,406), ed è la guerra a creare il divario — uno vince, l'altro si
assottiglia. Lo stesso per la ricchezza: chi si batte da tempo è povero *perché* si batte.

> Quando una correlazione riguarda qualcosa che il mondo può cambiare — ricchezza, taglia, salute —
> la domanda da farsi è sempre: **l'ho misurato prima o dopo?**
