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
| `verifica_anelli.mjs` | *La ricerca per anelli dà le stesse risposte della scansione a riquadro?* Confronto diretto su 9 000 interrogazioni in tre densità. |

## Le leggi del mondo

| sonda | che domanda fa |
|---|---|
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
