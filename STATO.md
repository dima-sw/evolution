# Evolution — dove siamo

Un mondo che si costruisce da sé. Niente storia scritta: solo leggi, e la storia che ne esce.

Circa **10 800 righe** in ventinove moduli, più il banco di prova. `node server.js` e si apre su
`localhost:5188`.

**Nessuna dipendenza esterna per il mondo**: la simulazione gira per intero senza rete e senza
librerie. L'unica cosa che esce dalla macchina sono le *menti al potere* — `ai.js` chiama un LLM
remoto — ed è un livello separato, che si accende e si spegne. Con le menti spente il mondo è
completo e deterministico; con le menti accese non lo è più (vedi più sotto).

---

## La regola che tiene insieme tutto

> *Sto descrivendo qualcosa che sarebbe vero anche se nessuno l'avesse mai pensato?*

Se sì, è una **legge** e può stare nel motore. Se no — se è un'usanza, un'istituzione, un modo di
guardare, un nome — non va scritta: va resa **possibile**.

Quattro livelli soltanto si possono scrivere a mano:

| | | esempio lecito | esempio vietato |
|---|---|---|---|
| 1 | **Fisica** | un liquido non si indossa | «carro» |
| 2 | **Biologia** | la fame cresce, la ferita fa male | «cacciatore» |
| 3 | **Psicologia** | ciò che precede il bene si ripete | «tabù», «dottrina» |
| 4 | **Informazione** | si imita chi ha successo | «religione di stato» |

---

## I moduli, e che legge portano

### La materia e il mondo
- **`world.js`** — terre, mari, fiumi, rilievo, umidità, temperatura. Quando la terra si muove
  davvero (frana, faglia, cono che cresce) un posto viene **riclassificato col clima di adesso**,
  non col ricordo di com'era; e il mare resta salato anche dove si è appena preso un fiume. La dimensione è un cursore
  (192–640): è **quella**, non i tetti di popolazione, a decidere quanto può crescere una civiltà.
- **`materials.js`** — le sostanze e le loro proprietà. La **geologia è dedotta**: dove una cosa si
  trova dipende da come si è formata, e quello si legge nelle sue proprietà (igneo → alture,
  sedimentario → conche, organico → paludi antiche, evaporitico → caldo e secco, denso → lungo i
  fiumi, ed è per questo che l'oro si cerca nei fiumi).
- **`matter.js`** — gli **stati della materia** e cosa ci si può fare. Hardcodato *apposta*: non
  dice che l'oro è prezioso, dice che non si indossa l'aria e non si beve il legno. Lo stato viene
  dal punto di fusione e dal calore del posto — il mercurio gela in montagna, il miele cola nel
  deserto.
- **`chemistry.js`** — combinare sostanze, dedurne gli effetti dalle proprietà. Nessuna ricetta.
- **`climate.js`**, **`fire.js`** — luce, stagioni, pioggia, incendi che si propagano.

### I corpi
- **`genetics.js`** — ventidue tratti ereditari con mutazione. I geni sono **la stirpe**.
- **`species.js`**, **`animals.js`** — una sola lista di creature; predatore o preda è una
  *relazione calcolata* dai geni, non una categoria. La nicchia trofica muta di generazione in
  generazione: da un mondo senza carnivori ne emergono in una ventina d'anni.
- **`npc.js`** — il cuore: bisogni, movimento, raccolta, mestieri, case, libri, eredità.

### Le menti
- **`emotions.js`** — otto affetti di base. *Non* categorie culturali: un mammifero li prova davvero.
- **`experience.js`** — **si impara dalla sorpresa**, non dal bene assoluto. Da questa sola legge
  vengono i tabù e le «maniere di fare», che sono la stessa cosa vista su un oggetto e su una
  circostanza. E vengono anche le superstizioni: se non potesse sbagliare, non sarebbe apprendimento.
- **`desire.js`** — **una sola funzione del desiderio** per tutto: mangiare, raccogliere, costruire,
  barattare. I vizi capitali non sono comportamenti a parte, sono i **pesi** della stessa somma.
- **`skill.js`** — la **perizia**: si impara facendo, non invecchiando. E la scala se la dà il
  mondo: sei bravo rispetto a quanto è normale fra i tuoi.
- **`tempra.js`** — **la vita cambia chi la vive**. I geni restano, deriva la persona. Chi si
  sfianca senza frutto smette di volere; chi è obbedito monta in superbia e smette di capire.

### Il gruppo
- **`factions.js`** — i popoli nascono da un grafo sociale, senza livelli amministrativi fissi.
- **`society.js`**, **`culture.js`** — ceti, memi, fedi, guerra, norme: tutto emergente.
- **`economy.js`** — valore soggettivo, baratto, e la moneta che nasce da sé.
- **`entities.js`** — il meta-livello: gli NPC **inventano categorie che il motore non conosce**.
- **`coorti.js`** — la gente vista per gruppi, con le classi dentro. Uno sguardo, non una
  sostituzione: gli individui restano tutti.
- **`orders.js`**, **`ai.js`** — un LLM impersona il capo di ogni popolo grande. Gli ordini sono
  **influenza**, non comandi: i bisogni vitali vincono sempre. E il capo può ordinare **qualunque
  cosa**, anche una parola che il mondo non conosce: chi la riceve la intende come può, il senso si
  assesta a maggioranza fra i primi che la sentono, e se ha portato male si sfalda. È da qui che
  nascono i dialetti — e che «censura» può voler dire cose diverse in due popoli diversi.

---

## Le cose che sono emerse, e che nessuno ha scritto

- Il popolo **giudica giusto** ciò che lo circonda: in fondo alla classifica delle sue opinioni
  finiscono i veleni veri (Mercurio, Belladonna, Piombo), in cima il grano. E ogni volta **due o tre
  superstizioni** su cose innocue.
- **L'oro e l'argento diventano le cose più amate del mondo**, sopra il grano — e non nutrono, non
  curano, non tagliano. Correlazione fra sfarzo e ceto: **0,88**.
- **Le rotte commerciali** esistono senza che nessuno le abbia disegnate: l'argento si cava a 0,247
  di temperatura e si ritrova in mano alla gente a 0,702. Viaggia ciò che vale molto e pesa poco.
- **Le case raccontano la disuguaglianza**: la migliore osservata era di «Rame, Quarzo×6, Ossidiana,
  Oro, Marmo, Ferro×4», la peggiore di «Selce×3».
- **Il mestiere è il frutto di una vita**: gli specialisti hanno in media 51,6 anni contro i 34,5 dei
  generalisti. E una vita di mestiere vale fino a **×1,6 per colpo** in battaglia.
- **Il potere spinge verso il pugno duro.** Stesso mondo, due volte: con la tempra il 92% dei capi
  è dittatore o demagogo, senza il 75%; e l'empatia dei capi scende di 0,033 mentre la superbia sale
  di 0,041. L'effetto è reale ma modesto — *(la prima misura che avevo fatto dava un ribaltamento
  molto più netto, ed era sbagliata: il mondo non era ancora riproducibile.)*
- **Saper fare un'ascia non è avere un'ascia.** La qualità dell'utensile veniva da quello che uno
  *sapeva fabbricare*: bastava conoscere la ricetta e i metalli si estraevano per sempre, senza che
  niente si consumasse. Ora l'attrezzo è la materia migliore che hai addosso fra quelle che tagliano,
  si consuma scavando e si rifà consumandone dell'altra. In 132 anni: **4 588 forgiati, 2 035 rotti**,
  fatti di Rame, Osso, Selce, Pietra, Corno, Ossidiana — nessuna dichiarata «da utensili». L'era dei
  metalli si raggiunge lo stesso, ma il Ferro resta raro (84 pezzi) e il Diamante rarissimo (5).
- **I tabù si vedono, e sono quelli giusti.** Le due funzioni che li calcolavano erano scritte,
  esportate e mai chiamate: la cosa più notevole del motore era invisibile. Ora stanno nel riquadro
  «Società e sentimenti». In un mondo di 7 966 persone le cose evitate sono Tabacco 39%, Cotone 39%,
  Legno 35%, Argilla 33%, Canapa 33%, Lino 33% — **tutte cose fibrose che si raccolgono e non
  nutrono**. Nessuno ha scritto che il legno non si mangia: l'hanno imparato. E lasciando correre un
  mondo fino all'anno 168 la classifica diventa **Belladonna 65% · Papavero 42% · Cotone 40% · Zolfo
  38%**: in cima ci sono i veleni veri, e la belladonna stacca tutto il resto di venti punti.
- **Una parola nuova prende senso da sola.** Messe in bocca ai capi sei parole che il motore non
  conosce (*fortificare, silenzio, censura, tributo, legge marziale, vendetta*): prima venivano
  scartate tutte in silenzio, adesso **29 912 ordini** sono stati presi in carico e **257
  significati** sono nati presso ventidue popoli. Non attecchisce tutto — 84 radicate, 161 incerte,
  12 sfaldate — ed è il punto: è da lì che un capo capisce quali sue parole hanno fatto presa. Ogni
  popolo intende a modo suo: «censura» vuol dire *difendere* al 78%, «tributo» *attaccare* al 59%.
- **Lo spezzettamento a turni NON è neutro, e adesso si sa quanto.** Si diceva che dividere il
  lavoro in fette fosse identico per ciò che si accumula e mantenesse il ritmo medio per ciò che
  capita a caso. Vero — ma c'è un terzo caso che non era contemplato: **accorgersi in tempo**. Una
  bestia che tocca un turno su quattro vede il predatore fino a tre battiti dopo. Misurato, stesso
  seme: portandola a due turni la fauna passa da **27 659 a 35 397** capi (+28%) e i predatori da
  **1 434 a 2 542** (+77%); a un turno, 43 308 e 2 680 — cioè l'ecologia converge già a due.
  Avevo messo il ritmo a **due** su quella misura. Poi l'ho rifatta su un mondo grande, e ha
  ribaltato la decisione: a 3 000 persone due turni costano **×1,8 sull'intero battito** (303 → 548
  ms) per **+13%** di fauna, non +28%. Il prezzo sale e il guadagno scende. **È tornato a quattro**,
  e la manopola resta nel pannello coi numeri dentro: su un mondo piccolo la fedeltà costa poco e si
  può comprare. Non è un ripensamento — è la stessa regola applicata a una misura migliore.
- **L'ottimizzazione ovvia che non rendeva.** In `society.js`, «chi hai intorno» restituisce il
  blocco 3×3 della *cella*: tutti i suoi abitanti ricevono la lista identica, quindi costruirla una
  volta e prestarla pare gratis — è la prima cosa che consiglierebbe chiunque guardi quel codice.
  Misurato: **non rende, rende semmai peggio**. Il perché sta in un numero che nessuno pensa a
  misurare: con 5 595 persone quella funzione viene chiamata **650 volte per passo su mille celle**,
  perché i chiamanti stanno tutti dietro dadi a bassa probabilità. Due chiamate non cadono quasi mai
  nella stessa cella, e una cache che non colpisce è solo memoria da allocare. **Tolta.**
- **Griglie piatte al posto delle chiavi-stringa**, in `factions.js` e `npc.js`: ogni accesso
  costruiva una stringa (`"12,7"`) e la sminuzzava per l'hash, decine di volte per persona. Più i
  due elenchi della ricerca dei vicini riusati invece che riallocati per ognuno, e l'adiacenza in un
  array indicizzato invece che in una `Map` con chiave-oggetto.
- **Prestazioni, rimisurate daccapo sul motore di oggi** (`banco/scala.mjs`): 45,1 ms a 600
  persone, 93,3 a 1 200, 164,3 a 2 400, **298,3 a 4 800**. Il totale scala **sublineare** (^0,86,
  era ^1,06), e i due vecchi colpevoli sono rientrati: fazioni da ^1,63 a ^1,31, società da ^1,72 a
  ^1,30. **Il collo di bottiglia è cambiato**: adesso è la fauna, 143 ms a 4 800 persone, quasi metà
  del battito — e il suo costo segue le bestie, non la gente. Chi vuole guadagnare tempo da qui in
  avanti deve guardare lì.

- **`affordanceTotale` è ACCESO di default: il motore ha smesso di dire che cosa siano le cose.**
  Era implementato da tempo ma spento, e non era mai stato provato per una partita intera. Misurato
  (`banco/affordanza.mjs`, stesso seme, due partite):
  - **il mondo regge** — 1 252 vivi contro 1 283, 142 morti contro 152: lo stesso mondo entro il rumore;
  - **costa meno** — 32,2 contro 37,0 ms per battito: cercare un genere già percepito in una mappa
    è più economico che dare un punteggio a tutte le categorie note;
  - **la divergenza è vera** — dei 24 generi incontrati da più popoli, **24 su 24** hanno ricevuto
    nomi diversi da ognuno. Zero convergenze. Una stessa materia risponde a otto nomi a seconda di
    chi la incontra (`Cukaco / Lotapi / Fuleze / Bakufu / Sofevu / Zagiso / Sirama / Nagune`).

  Era l'obiezione seria: se i popoli convergessero tutti sugli stessi generi, sarebbero le solite
  categorie con un vestito nuovo. Non convergono mai. Nel gioco il pannello dei mestieri adesso dice
  `Maniko ×17 · Zununa ×16 · Rupedi ×12 · Tideva ×11 …` — sessanta mestieri inventati, e nessuno di
  quei nomi, né le categorie che nominano, sta nel codice.

- **Il lavoro forzato adesso esiste, e prima no.** Su otto semi `costretti` era **zero**: una legge
  scritta che non produceva niente. La causa non era quella che sembrava, e c'è voluta una catena di
  misure per arrivarci — ognuna ha smentito la precedente.
  1. «Nessuno arriva a `fame > 0.7`» era un **artefatto della fotografia finale**: chi ha fame o
     mangia o muore, quindi in un'istantanea non lo vedi mai. Contando gli *episodi*, la fame supera
     0,7 centoquaranta volte a partita e tocca 1,40.
  2. Il muro vero era che la legge chiedeva una **coincidenza a cinque** nello stesso istante, e
     confondeva «ha fame adesso» con «non ha alternative». La dipendenza è uno stato, la fame un
     attimo.
  3. Rese comparative le condizioni, scattava ma **restava indifferente alla carestia** (207 in
     abbondanza, 200 con dieci volte meno cibo). Il collo era `inventory.size === 0`: essere a mani
     vuote è un momento di passaggio, non una condizione che la fame del mondo produce — misurato,
     *cala* sotto carestia (86 → 52).
  4. Resa comparativa anche la povertà, e aggiunto l'unico assoluto che non sia inventato — il punto
     in cui il corpo smette di rimettersi, `FAME_RECUPERO`, che `npc.js` usava già — la servitù
     **risponde al mondo**: dal 17,1% della gente in abbondanza al 19,8% in carestia.

  E la relazione stessa non esisteva: il commento diceva «gli passa ciò che raccoglie e riceve di
  che sopravvivere» e «si libera se il padrone muore», e **nessuna delle tre cose accadeva**. Il
  servo mangiava la propria roba, il padrone non riceveva niente, e un padrone morto teneva il suo
  servo per sempre. Ora lo scambio avviene, il malcontento nasce da com'è il patto (dare e non
  ricevere brucia, ricevere calma) e ci si libera **quando il rancore supera la paura** — lo
  specchio della cattura, che confronta il coraggio del debole con l'aggressività del forte. Al
  posto di `malcontento > 0.8 && coraggio > 0.5`, che era una porta murata per gente scelta apposta
  perché coraggio non ne ha.

  Il conto delle uscite chiude: **entrati 544 = ribellati 250 + orfani del padrone 37 + morti da
  servi 22 + ancora servi 235.** Dalla dipendenza si esce ribellandosi (46%) o non se ne esce (43%).

- **Tre errori di contatore in una sera, tutti della stessa forma.** Un `Proxy` per contare il
  lavoro che misurava se stesso; uno `stderr` mandato a `/dev/null` che ha fatto confrontare un file
  vuoto con otto righe; e `pop.ribelli`, che **`emotions.js` riscrive a ogni passo** con quanti
  ribelli ci sono adesso — sommarci dentro le liberazioni faceva sparire il numero al passo
  successivo. La regola che ne esce: *un totale che non torna è l'unico modo affidabile per scoprire
  un meccanismo che non sai di avere*, e per questo `banco/carestia.mjs` adesso stampa la
  quadratura esplicita invece di lasciarla dedurre.

- **La prova ora vale su otto semi, non su uno.** Si ricostruisce il motore *di prima* — una copia
  dei sorgenti con le ottimizzazioni tolte — e si confrontano diciotto grandezze su otto partite
  diverse (`banco/multiseme.mjs`). **Nessuna differenza.** Era il difetto più serio del metodo: una
  modifica può lasciare intatta l'impronta di *quella* partita e romperne un'altra, se la strada che
  sbaglia lì non viene mai percorsa.
- **Tutti nascono con la stessa forma.** La cosa più grossa di tutte, e non era nel codice: era
  nella forma dei dati a mezza partita. I campi delle persone nascevano per strada — `_padrone`
  quando qualcuno veniva sottomesso, `casaMat` quando costruiva, `_commemorato` quando moriva — e
  ogni aggiunta creava una mappa nascosta nuova. Misurato: **1 345 persone, 966 mappe diverse**, e
  leggere una proprietà costava 164 nanosecondi invece di quattro. Dichiarandoli tutti alla nascita
  (a `undefined`, cioè esattamente ciò che il codice trovava prima) le mappe tornano **una sola**.
  **Il battito intero da 1 701,6 a 301,1 ms**, con i contatori del lavoro identici al millesimo — e
  moduli mai toccati scesi lo stesso: emozioni −49%, umani −75%, fauna −33%. Impronta identica.
- **Non si guarda in faccia nessuno se non c'è nessuno da guardare.** Il dono e la sottomissione
  cercano la stessa figura — un indigente — e la cercavano esaminando duecentocinquanta persone a
  testa per scoprire quasi sempre che non c'era. Ora un censimento per cella risponde a tutt'e due
  in nove letture: **−93%**, con le stesse identiche scelte, e il ciclo interno della coercizione
  che non gira più affatto (101 104 candidati esaminati → **0**).
  Due avvertenze oneste. La prima: quel −93% è un rapporto, non una posta — misurato prima della
  forma unica valeva 195 ms, oggi ne vale 8, perché i due guadagni non si sommano. **L'ordine in
  cui si applicano due ottimizzazioni cambia quanto vale ciascuna.** La seconda: il primo confronto
  diceva `sottomissioni 0 (potata 0) ✓`, e **due liste vuote coincidono sempre** — in quel mondo la
  coercizione non riesce mai, quindi non era una verifica. Adesso il banco riduce in miseria della
  gente apposta, a densità crescenti, e le scelte coincidono davvero (1/1, 14/14, 126/126, 224/224).
- **Si saltano le celle impossibili, non solo gli anelli.** Cercando i vicini di una persona non
  basta smettere di allargare il giro quando la cerchia è piena: si può saltare **ogni singola
  cella** che non possa contenere un candidato migliore. Per ognuna si calcola quanto possa
  avvicinarsi *al massimo* un suo punto qualsiasi; se già quel minimo è peggiore del K-esimo che si
  ha in mano, la si salta senza calcolare **una sola distanza**. È esatta, non approssimata — un
  candidato di lì dentro verrebbe scartato comunque, poche righe più sotto.
  **Misurato in A/B nello stesso processo, sullo stesso mondo: −29% in tutto** (1 308,7 → 933,1 ms
  su 8 827 persone), **zero differenze su 170 193 archi**. E l'impronta del mondo intero è quella
  che aveva *prima di qualunque ottimizzazione* — `vivi 1241 · sommaX 193648,6455`: stesso identico
  mondo, tre ottimizzazioni dopo.
  *(Un dettaglio che sembra pedanteria e non lo è: la mappa a stringhe non aveva confini, quindi chi
  finiva sul bordo aveva comunque la sua cella. Una griglia piatta senza margine lo accorperebbe
  alla cella accanto — un cambiamento del mondo travestito da ottimizzazione. Tutte hanno il margine.)*
- **Il costo è tornato lineare.** Rimisurato alla fine: 600 → 1 201 → 2 401 → 4 806 persone dà
  59,2 → 162,2 → 374,9 → 780,5 ms a battito, cioè **TOTALE^1,06** sull'ultimo raddoppio contro il
  **^1,41** di partenza. E il confronto che conta: a 2 401 persone il costo è **374,9 ms contro
  378,9** — lo *stesso prezzo* per un mondo che nel frattempo ha imparato a versare i liquidi,
  consumare gli attrezzi, sfare le case, contagiare in proporzione alla calca, tenere i branchi e
  diffondere le usanze. *(Quel numero è però flattato dalle bestie che calano nell'ultimo tratto: le
  cose che scalano con la sola gente restano le più ripide — fazioni ^1,63, società ^1,72.)*
- **Un totale che mescolava tre cose.** Il profilo diceva «fauna» e sotto quel nome c'erano le
  bestie, la caccia degli umani e il contagio — che scalano con cose diverse. Separate: la caccia
  costa niente (0,6 → 3,5 ms), il contagio poco, ed è il costo **per singola bestia** a salire. La
  causa era una trappola già vista una volta e non riconosciuta lì: una bestia che si guarda intorno
  cercava il predatore sulla griglia di *tutte* le bestie, e in un mondo di erbivori non lo trova mai
  — così rastrellava celle piene di prede per concludere che non c'era nessuno. Con una griglia dei
  soli predatori: **164,8 → 35,5 ms** a 27 659 bestie, e risposta **identica** (16 000 interrogazioni
  in quattro regimi, zero differenze). E la prova migliore: l'impronta di un mondo vero è **identica
  prima e dopo**, fino al quarto decimale delle posizioni. Non «equivalente» — lo stesso identico
  mondo, più veloce. È a questo che serve averlo riproducibile.
- **La larghezza del mondo È il tetto della popolazione**, e adesso è un numero e non un'opinione.
  La capacità di carico si conta invece di simularla: 192×192 nutre **8 411** persone, 256×256 ne
  nutre **15 134**, 320×320 **23 845**, 480×480 **54 201** — la resa per tile è costante (0,23), la
  capienza è esattamente proporzionale all'area. Il salvagente stava a 20 000 e la terra ne nutriva
  23 845: **si toccavano**, e un numero messo lì per non far morire il browser finiva per decidere
  la storia. Ora vale il più alto fra quello che hai messo tu e una volta e mezza la capienza, e non
  può più scattare prima della fame.
- **Il tetto non nascondeva una legge: nascondeva un costo.** Stesso seme, mano a mano che le leggi
  mancanti sono state rimesse: **20 675 → 16 888 → 13 457** persone all'anno 165, cioè da **87% a
  56%** di quello che la terra regge — con la salute che *migliora* (0,81 → 0,78 dopo un minimo di
  0,76) e la fertilità ferma. Non è il mondo strozzato: è che l'acqua che si versa, l'attrezzo che si
  rompe e la malattia che sente la calca costano qualcosa a chi vive, e prima quel costo non lo
  pagava nessuno. Ma anche a queste cifre un battito è caro. Tre moduli erano quadratici, tutti per lo stesso motivo: si guardava tutta la folla
  per trovare le poche persone vicine.

- **«Si imita chi riesce» — ma non una persona per volta.** La legge era dichiarata da sempre e non
  poteva funzionare: per quanti praticassero un'usanza e per quanta gente ci fosse intorno, ogni tiro
  ne convertiva **una sola** (lo stesso difetto del contagio, nascosto nello stesso `break`). Le
  istituzioni restavano minuscole. Ora la più diffusa arriva a **191 praticanti, il 6,7% del mondo**
  contro l'1,6% — e soprattutto **quella che si diffonde è quella che giova di più** (0,616), con una
  coda lunga di usanze marginali. Prima erano tutte ugualmente piccole, e dove tutto è uguale la
  selezione non ha su cosa mordere. *(La prima taratura era inutile e la misura l'ha detto: avevo
  reso la diffusione proporzionale alla folla e poi scelto il coefficiente che annullava l'effetto.)*
- **Anche le cariche si possono inventare.** Era rimasta un'ultima lista chiusa — *generale,
  sacerdote, maestro, mercante* — e ogni altra parola veniva scartata in silenzio. Adesso passa
  qualunque carica, e non è servito nessun meccanismo nuovo: un ruolo inventato funziona attraverso
  quello dei delegati. Per le cariche note «servire» ha un metro suo (guerra per il generale, fede
  per il sacerdote); per una inventata si guarda l'unica cosa guardabile — **la gente attorno a chi
  la porta sta meglio o peggio** — e una carica inutile si spegne da sé.
- **Il recipiente non è una categoria: è una risposta.** Un liquido nell'inventario stava lì come un
  sasso — e finché non si perdeva, nessuno aveva ragione di inventarsi un vaso. Ora si versa, e che
  cosa lo tenga lo dicono tre domande di fisica (stare in piedi, non bere né sbriciolarsi, potersi
  cavare). Su 46 materie, senza dichiararne nessuna: **Stagno 0,98 · Bambù 0,90 · Rame 0,89 ·
  Argilla 0,74 · Pelle 0,69 · Legno 0,62** — e fuori grano, carne, sabbia, diamante.
- **Un capo si sente fin dove arriva la sua voce.** Non è servita nessuna gerarchia per avere i
  governatori: basta che l'obbedienza si misuri sulla voce più vicina. Chi sta a 45 passi dal capo
  passa da **0,581 a 0,760** quando il capo mette qualcuno in mezzo a loro; chi gli sta addosso resta
  a 0,965. E un delegato lontano e molto ascoltato è la stoffa di cui è fatto un usurpatore.
- **Un gene che non fa niente non si può selezionare.** La socialità si ereditava e mutava da sempre
  senza avere **nessuna conseguenza**: derivava a caso. Ora ha un premio e un prezzo in tensione —
  gli occhi del branco contro l'erba contesa. In un mondo rado un solitario sta il **18% più lontano**
  dal suo vicino più stretto; a mondo saturo il divario sparisce, ed è giusto: in una calca nessuno
  *può* stare solo.
- **Un ciclo che non girava, e tre miei errori di fila.** «I poveri guardano i ricchi» sembrava ovvio,
  e non succedeva: su 1 150 coppie di popoli vicini con 787 guerre, il divario di ricchezza non
  non compariva affatto (**0,018**) mentre quello di numero sì (**0,405**). Il perché stava
  in una riga: l'ostilità pesava quanti sono, non quanto hanno. Poi, in ordine: **(1)** per far posto
  alla ricchezza ho pesato il numero a 0,6, e ho solo *diluito l'unico segnale che c'era*; **(2)** ho
  dato la colpa del segno negativo al bonus di ricchezza del capo — misurato, **~0,05**, non era
  quello; **(3)** stratificando per taglia il segno *peggiora* (−0,201), ed è lì che si vede il punto
  vero: **la guerra livella la ricchezza**, quindi una fotografia non distingue l'effetto dalla
  causazione inversa. Misurato come si deve — divario registrato PRIMA, guerra osservata dopo — la
  ricchezza non si vede (−0,029), **ma cade anche l'altra metà**: pure il numero era causazione
  inversa. A fare la guerra sono i **vicini di forza simile** (0,211 contro 0,406), ed è la guerra a
  creare il divario. Due vicini alla pari credono entrambi di poterla spuntare; fra chi è spaiato, il
  piccolo evita e il grande non si scomoda. Nessuno l'ha scritto.
  *Se avessi «sistemato» a occhio avrei rafforzato un meccanismo che non esisteva.*

## I registri

- **`TODO-GENERICO.md`** — la de-categorizzazione: ogni cosa smontata, con la misura accanto.
- **`TODO-COORTI.md`** — perizia, tempra, coorti e il piano in tre fasi.
- **`TODO-GRUPPI-E-AI.md`** — i mestieri, i branchi, la libertà dell'AI, il profilo delle prestazioni.
- **`TODO.md`** — la vecchia strada, dalle origini fino all'AI.
- **`PRESTAZIONI.md`** — dove se ne va il tempo quando la gente è tanta: le misure, il **codice vero**
  dei punti caldi estratto dal sorgente, e soprattutto l'elenco di **cosa è già stato provato e cosa
  ha fallito**. Fatto per essere dato in pasto a un'altra AI senza il resto del progetto.
- **`banco/`** — le sonde con cui il mondo è stato interrogato. Non sono test che passano o
  falliscono: sono domande al mondo, e la risposta è un numero. `node banco/riproducibile.mjs` è
  quella da rifare per prima dopo qualunque modifica.
- **`CONTENUTI.md`** — l'inventario di tutto ciò che è contenuto e non funzionalità.

## Il tetto delle ottimizzazioni sulle allocazioni è il 6%

La strada che viene in mente per prima quando si guarda questo codice è togliere allocazioni: buffer
riusati, chiavi numeriche invece che stringhe, niente `Map` e `Set` nei cicli caldi. Misurato quanto
può rendere *in tutto*:

> **0,93 MB consumati per battito, e la raccolta della spazzatura costa 46,6 ms su un battito di
> 754,7 — il 6%.**

Anche azzerando *ogni* allocazione — cosa impossibile — si guadagnerebbe al massimo quello. Il tempo
se ne va in **conti veri**: distanze fra migliaia di coppie, letture di proprietà, l'inserimento
ordinato dei vicini, la scansione della finestra del cibo. Per andare più veloci bisogna fare **meno
lavoro**, non allocare di meno — e fare meno lavoro, qui, significa quasi sempre toccare qualcosa del
mondo.

## Due giri identici non danno lo stesso tempo

Questa macchina, dopo ore di carico, restituisce la **stessa identica misura il 10–15% più lenta**.
L'ho scoperto perché l'ultimo giro del banco è risultato più lento del precedente **anche nei moduli
che non avevo toccato** (emozioni +17%).

Conseguenza pratica, e vale per chiunque provi a ottimizzare qui: **quasi nessuna ottimizzazione si
può validare confrontando due giri diversi.** Il rumore è più grande dell'effetto. L'unico confronto
affidabile è dentro lo stesso processo — le due versioni della funzione nello stesso file, sullo
stesso mondo, alternate, e con i *risultati* confrontati e non solo i tempi (`banco/ab_adiacenza.mjs`).

Ci sono cascato due volte in una sera: ho annunciato un −20% che era rumore, e ho misurato come «più
lenta» una versione che non lo era.

## Un mondo rotto non deve sembrare sano

Per cronometrare il passo della fauna avevo usato l'orologio di node (`process.hrtime`). Headless
funzionava benissimo — ma **`process` nel browser non esiste**: `stepEcosystem` lanciava un'eccezione
al primo rigo e l'INTERO ecosistema era spento.

E a schermo non si vedeva niente. La gente cresceva, gli anni passavano. Solo un numero era fermo:
le bestie, esattamente 407 in tre rilevazioni a trent'anni di distanza, e tutti i contatori delle
uccisioni a zero.

Tre cose imparate, tutte a caro prezzo:

- **In un modulo condiviso non entrano API di un solo mondo.** `performance.now()` c'è di qua e di
  là; `process.hrtime` no. E il banco headless non può accorgersene: gira dove l'API esiste.
- **Un errore catturato e loggato non è un errore gestito.** Il tick scriveva l'eccezione in console
  e tirava avanti — che è peggio di un crash, perché un crash si vede. Adesso cinque errori di fila
  fermano la simulazione e lo dicono a schermo. Provato con un guasto finto: si ferma e lo scrive.
- E la terza riguarda chi guarda: cercavo gli errori con un ascoltatore sull'evento `error`, che per
  un'eccezione **catturata** non scatta mai. Il progetto faceva la cosa giusta; era il mio controllo
  a guardare dalla parte sbagliata.

## Una cosa da sapere sul server

`server.js` serve la cartella del progetto, e il `.env` con le chiavi degli LLM sta lì dentro. Due
protezioni c'erano già: `.env` non viene mai servito, e non si può uscire dalla cartella. Ma il
controllo era `file.startsWith(ROOT)` **senza il separatore**, e quello lascia passare una cartella
*sorella* il cui nome comincia come quella del progetto — `evolution-segreti`, `evolutionX`.

Non è teoria: il browser normalizza `/../` prima di spedirlo, ma il server fa `decodeURIComponent`
*prima* del controllo, quindi `%2e%2e%2f` ci passa. Provato sul server in esecuzione: rispondeva
**404** (file non trovato — cioè la richiesta era arrivata al disco) invece di 403. Corretto con
`ROOT + path.sep`, e riverificato: 403 sul traversal, 403 sul `.env`, 200 su tutto il resto.

## Tre cose che restano decisioni tue

Non le ho prese io perché non sono difetti da riparare: sono scelte su che mondo vuoi.

- **`affordanceTotale` è spento.** È il livello più estremo dell'emergenza: acceso, il motore smette
  di dire lui come si chiamano i mestieri e **ogni popolo conia i propri nomi**. Spento, si usa la
  tabella italiana (guerriero, sacerdote, agricoltore…). È una manopola nel pannello, e la
  descrizione dice cosa comporta. Il conto delle parole coniate a schermo dice «spento» invece di
  mostrare uno zero che ingannerebbe.
- **Il termine della ricchezza nell'ostilità fra popoli è debole di proposito.** C'è, e ha grandezza
  confrontabile con quello del numero, ma sullo scoppio di una guerra non si vede (−0,029). Alzarne
  il coefficiente finché la correlazione appare sarebbe adattare il mondo alla misura, e non l'ho
  fatto. Se lo vuoi più forte è una riga in `culture.js`, ma va rimisurato **col film, non con la
  fotografia** (`banco/invidia_prima.mjs`).
- **La Fase 3 delle coorti** resta il guadagno grosso non fatto, ed è l'unico posto dove la qualità
  rischia sul serio: sciogliere in distribuzioni le coorti lontane e omogenee significa perdere i
  legami personali e le avversioni imparate di quelle persone. Il piano è in `TODO-COORTI.md`, con
  scritto cosa si perde. Va affrontata misurando prima **cosa si perde**, non solo quanto si guadagna.

## La regola di lavoro

**Misurare prima di toccare — e assicurarsi che la misura sia una misura.** Ha ripagato ogni volta: tre cose che sembravano mancare (le emozioni
da riscrivere, le rotte commerciali, i mestieri) erano già lì o non erano difetti; e tre difetti veri
e invisibili sono saltati fuori solo perché li ho cercati con un numero in mano — il cricchetto della
fertilità che condannava ogni mondo alla carestia, quello dell'ambizione che saturava tutti a 1,0, e
le tempeste che colpivano l'intero pianeta in un istante, e — il più insidioso — il fatto che
**lo stesso seme non desse lo stesso mondo**, il che rendeva nullo qualunque confronto.

E una regola in più, imparata di recente e a mie spese: **misurare nel verso giusto.**

Una fotografia del mondo dice che cosa sta insieme a che cosa, non che cosa causa che cosa. Guardando
i popoli in guerra risultava che hanno divari di taglia grandi, e sembrava ovvio leggerlo come «i
grandi attaccano i piccoli». Ma registrando il divario delle coppie **in pace** e osservando poi chi
finisce a combattere, il verso si rovescia: a farsi la guerra sono i **vicini alla pari**, ed è la
guerra a creare il divario. Lo stesso per la ricchezza — chi si batte da tempo è povero *perché* si
batte.

Tre volte di fila, su questa sola questione, ho creduto a una fotografia. La differenza fra le due
misure non è un dettaglio statistico: è la differenza fra capire il mondo e raccontarselo. Quando una
correlazione riguarda qualcosa che il mondo può cambiare (ricchezza, taglia, salute), la domanda da
farsi è sempre: **l'ho misurato prima o dopo?**
