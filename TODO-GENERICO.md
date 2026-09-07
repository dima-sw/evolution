# Il mondo senza regole scritte

> «Tu devi creare le regole e istinti del mondo, poi gli NPC/animali con quello che gli succede,
> coi geni, con la società, le stats e quant'altro e istinti fanno cose alla fine.»

Questo file è il registro del lavoro per togliere dal motore tutto ciò che è **categoria** e
lasciarci solo ciò che è **legge**. Non è un elenco di funzionalità da aggiungere: è un elenco di
cose scritte a mano da **smontare**, sostituendole con qualcosa da cui quelle stesse cose possano
*ricrescere*.

## Il criterio

Prima di scrivere qualunque riga, una domanda sola:

> *Sto descrivendo qualcosa che sarebbe vero anche se nessuno l'avesse mai pensato?*

Se sì, è una legge del mondo e può stare nel motore. Se no — se è un modo di guardare, un'usanza,
un'istituzione, un nome — allora non va scritta: va resa **possibile**.

Quattro livelli soltanto possono essere hardcodati:

| Livello | Che cos'è | Esempio lecito | Esempio vietato |
|---|---|---|---|
| 1. Fisica | come si comporta la materia | un corpo pesante affatica chi lo porta | «carro» |
| 2. Biologia | come funziona un corpo | la fame cresce, la ferita fa male | «cacciatore» |
| 3. Psicologia | come funziona una mente | ciò che precede il bene si ripete | «tabù», «dottrina» |
| 4. Informazione | come passa una cosa da una testa all'altra | si imita chi ha successo | «religione di stato» |

---

## Le categorie smontate

- [x] **Via le dottrine militari.** Era una `Map` con quattro assi che avevo scelto io
  (notte/giorno/alture/pianura) e un `×1.35` regalato dal motore. Sostituite dal
  **condizionamento operante** (`src/experience.js`): ognuno lega ciò che sente ai propri sensi —
  luce, calore, pendenza, quanti altri ci sono, vigore, piedi nell'acqua — e a come è finita. Se un
  popolo prende gusto al buio, combatte meglio al buio perché *non ha paura*, non per un
  moltiplicatore.
- [x] **Via il matrimonio.** Non c'è più `npc.compagno` né la soglia dei due figli. C'è solo il
  legame (`npc.memoria`, che esisteva già), che cresce a stare insieme e ad avere figli insieme e
  che può spegnersi. Chi si accoppia sceglie fra chi è vicino, ma l'attaccamento pesa quanto un
  passo: chi si è legato tende a ritrovarsi, e ritrovandosi si lega di più. Le «coppie» nelle
  statistiche sono un **conteggio di chi guarda**, non uno stato civile.
- [x] **Via l'ordine di successione.** Le cose di un morto restano dove sono cadute e se le prende
  chi è lì, pesato da quanto gli era legato e da quanto è avido. Che ereditino i figli non è
  scritto: succede perché i figli stanno vicino e sono legati.
- [x] **Via il tabù come tipo di meme.** Non esiste `tipo: "vieta"`. Esiste che uno si fa una brutta
  esperienza con una cosa e che le paure sono contagiose (`contagiaAvversioni`), con l'attrito del
  bias di conferma a frenarle — e chi ha appena preso uno spavento se le beve più facilmente.
- [x] **G1. Le ere.** Un'epoca non si apre più perché è successo qualcosa: si apre se **almeno un
  terzo dei vivi se lo porta addosso** (paura o tristezza sopra 0,45). Altrimenti passa e non fa
  storia — `pop.ereMancate` conta le volte che il mondo ha tremato senza lasciare il segno.
- [x] **G2. I libri.** Via «≥5 conoscenze e intelligenza >0,6». Al suo posto i due motivi veri per
  cui si incide una pietra: la vanità di restare (`motiv.fama` + superbia) e la paura di perdere,
  che cresce con l'età. Leggere non ha più una patente: dipende da testa e curiosità.
- [x] **G3. I nomi dei mestieri.** Con `affordanceTotale` acceso ogni popolo se li conia da sé
  (`nomeMestiere`, lo stesso coniatore dei generi): due popoli con lo stesso mestiere gli danno nomi
  diversi. Spento, restano le parole nostre perché l'interfaccia resti leggibile.
- [x] **G4. I biomi non decidono più niente.** Il plancton viene dalla **profondità** (la luce non
  arriva in fondo) e non dal nome «bassofondo»; l'acqua dolce da `river`/`stagnant` e non dal nome
  «palude». Se domani cambia il livello del mare, il pesce si sposta da solo.
- [x] **G5. Gli animali.** Già a posto: `tempIdeale` e `tolleranza` sono geni ereditati con
  mutazione e `climaLetale` li seleziona davvero. Anche la carnivoria muta: un discendente di
  erbivori può diventare predatore. (Restava solo un commento che diceva il contrario.)
- [x] **G7. Il guerriero.** Verificato in gioco: emerge dal conteggio dei colpi, non da una soglia.
- [—] **G6. Le emozioni.** **Voce ritirata dopo averci ragionato.** Paura, rabbia e gioia non sono
  categorie culturali: sono affetti di base che un mammifero prova davvero, e il livello 3 è
  ammesso. Sono primitive legittime esattamente come la fame. Riscriverle in valenza/attivazione
  avrebbe toccato 163 punti del codice per rendere il mondo *meno* leggibile e non più libero.

## Istinti, qualità e desiderio (`src/desire.js`)

Nel mondo vero non c'è solo *utile / inutile*. C'è **meglio e peggio**, e c'è chi sceglie il meglio
non perché gli serva ma perché lo *vuole*.

- [x] **P1. La qualità esce dalle proprietà.** `sapore()` (densità + energia + sali + aroma −
  amaro), `sazieta()`, `dissete()`, `riparoDi()` (coibenza, tenuta, durata). Nessun campo
  `qualita: 7` da nessuna parte.
- [x] **P2. Una sola funzione di desiderio.** `valuta()` pesa bisogno, gusto, danno, rarità, moda,
  fatica ed esperienza. La usano il mangiare, il foraggiare, il raccogliere, il costruire **e il
  baratto**: prima `economy.js` ne aveva una tutta sua che non sapeva niente di sapore né di paure.
- [x] **P3. I vizi sono i pesi.** Gola, avidità, superbia, invidia, pigrizia non sono comportamenti
  a parte: sono coefficienti della stessa somma. A un avaro le cose valgono di più, e tutto il resto
  viene da sé.
- [x] **P4. Sazietà specifica.** La stessa cosa mangiata sempre stufa — e toglie la *voglia*, non
  solo il gusto. Chi ha davvero fame mangia lo stesso quel che ha stufato da un pezzo.
- [x] **P5. Le case riparano secondo di che sono fatte.** `npc.casaMat` ricorda i materiali usati;
  coibenza e tenuta ne derivano. **Osservato: la casa migliore era di «Rame, Quarzo×6, Ossidiana,
  Oro, Marmo, Ferro×4», la peggiore di «Selce×3».**
- [x] **La flora ha una nicchia.** Tre proprietà nuove di livello 2 (`caldoIdeale`, `acquaIdeale`,
  `adattabilita`) e i giacimenti dei viventi seguono il clima. L'aloe sta a 0,76 di calore e 0,36
  d'acqua, la belladonna a 0,45/0,61. Prima una pianta veniva distribuita come una vena di rame.
- [x] **Il foraggiamento ha un'identità.** Non si mangia più «vegetazione»: si mangia *la pianta che
  cresce qui*, scelta fra quelle presenti. La varietà alimentare è passata da 0,86 a **2,4** e i
  popoli hanno cucine diverse.
- [x] **Le bevande.** La proprietà fisica `acquosita` e la legge `dissete()` = acqua contenuta −
  sale − veleno. Uva 0,78, Aloe 0,69: **la pianta del deserto disseta, e cresce dove serve**. Il
  sale, che conduce, la sete la porta via invece di darla: per questo il mare non si beve.

## P6 — il lusso

Fatto. E alla fine il pezzo mancante non era un oggetto.

**Mancavano gli sguardi.** Quello che uno possedeva era invisibile agli altri, e senza occhi che la
vedano l'ostentazione non esiste — ecco perché il lusso non riusciva a nascere per quanti oggetti
preziosi ci fossero in giro. Ho aggiunto un fatto solo, di livello 1 (`npc._sfarzo`): **le cose che
luccicano si vedono da lontano**. Poche unità bastano a farsi notare — il decimo anello non luccica
più del terzo.

Il resto sono leggi che c'erano già. Quando uno vede addosso a un altro una cosa che luccica:

1. **impara che quella cosa è buona** — non per averla provata, ma perché ce l'ha uno che pare
   qualcuno. È il prestigio come scorciatoia dell'apprendimento, e finisce nello *stesso posto* dove
   finisce l'esperienza vera (`impara()`), così le due si fanno concorrenza;
2. **lo guarda diversamente** — chi ammira concede stima, chi invidia si rode. Due facce della
   stessa occhiata; a decidere quale ti tocchi sono i tuoi tratti.

E un capo che risplende viene ascoltato di più (`obbedienza()`, +0,25 al massimo, filtrato dal bias
di autorità di chi ascolta): non perché abbia ragione, ma perché pare uno che conta. È il motivo per
cui il potere si è sempre vestito bene.

**Il cerchio si chiude da solo:** il superbo si carica di cose che luccicano → gli altri gliele
invidiano e lo trattano meglio → quelle cose valgono di più → conviene ancora di più portarle.

**Verificato:** le cose più amate del mondo sono diventate **Oro (0,234) e Argento (0,151), sopra il
Grano (0,150)** — e l'oro non nutre, non cura, non taglia, non regge: è tenero (durezza 0,30) e
serve solo a luccicare. Nella stessa lista compare il **Mercurio**, che è veleno: il prestigio ha
scavalcato l'esperienza diretta, ed è esattamente il lato oscuro della moda. **La correlazione fra
sfarzo e ceto è 0,88.** Nessuna riga di codice dice che l'oro è prezioso.

Il conto delle mode vere e proprie — cose che non nutrono, non curano, non tagliano e non reggono,
eppure amate: **Argento +0,202 (442 persone), Oro +0,173 (128)**. Tutti i popoli amano l'argento ma
con intensità diverse (+0,27, +0,21, +0,19, +0,16) e uno solo ama anche l'oro: una moda condivisa
con varianti locali, che è come si comportano le mode.

E prima di questo, due cose che servivano a reggerlo:

- **La ricchezza non è più «quanti tipi di roba possiedi»** (eri ricco uguale con sei sassi o sei
  lingotti) ma quanto valgono: pregio della materia + rarità + brama — due fatti fisici e uno
  sociale, nessuno scritto da me.
- **Nessuno accumula più all'infinito.** C'era chi girava con 195 tronchi addosso. Oltre una soglia
  si posa ciò che si stima meno, e la soglia la alza l'avidità (da 4 a 20 di massa): l'avaro regge
  un carico che spezzerebbe gli altri e lo paga in fatica a ogni passo. Un vizio che costa.

## La prova che funziona

Il popolo **giudica giusto senza che nessuno gliel'abbia detto**. In fondo alla classifica delle
opinioni finiscono i più nocivi presenti (Salnitro, Zolfo, Papavero — o Mercurio e Belladonna dove
ci sono); in cima il Grano, che nutre 0,80. E in mezzo, ogni volta, **due o tre superstizioni** —
cose innocue temute per una coincidenza, tramandate a chi è portato a credere agli altri.

È il segno che il meccanismo è vero: se non potesse sbagliare, non sarebbe apprendimento.

**Le rotte commerciali ci sono, e nessuno le ha scritte.** Misurando il clima dove una merce nasce
contro il clima dove sta chi ce l'ha: l'Argento si cava a 0,247 di temperatura e si ritrova a 0,702
(**spostamento 0,455**), il Ferro 0,228, l'Oro 0,118 — mentre le cose comuni non si muovono quasi.
È il modo in cui commerciavano gli antichi: viaggia ciò che vale molto e pesa poco. Nasce da sé da
catene di baratti fra vicini, senza nessun mercante programmato.

**Tenuta:** 2 062 anni senza estinzione, popolazione 1 357–1 637, fertilità 0,96 stabile, fame 0,33,
salute 0,92, zero tile desertificati.

---

## Difetti veri trovati per strada

- [x] **Il cricchetto della fertilità.** `ratio = food / foodCap` confrontava la vegetazione con la
  capacità *da intatto*: appena la fertilità scendeva sotto 0,35 il rapporto ci scendeva con lei e
  **il degrado si autoalimentava per sempre, con o senza persone**. Ogni mondo era condannato alla
  carestia (fertilità 1,00 → 0,78, estinzione verso l'anno 1 000). Corretto confrontando con ciò che
  quel suolo regge *adesso*.
- [x] **Si imparava dal bene assoluto invece che dalla sorpresa.** Il difetto più insidioso, e mio.
  Siccome essere vivi e mangiare va quasi sempre bene, *ogni* cosa risultava buona (+0,18), popoli
  diversi avevano inclinazioni identiche e **la paura media era crollata a 0,017** — l'avevo di
  fatto cancellata dal mondo. Corretto con una media mobile personale (`npc._esitoMedio`) e
  imparando lo **scarto**. È anche ciò che spiegava la «pace di ferro».
- [x] **Il collegamento che mancava.** Avevo scritto nei commenti «combattono meglio al buio perché
  al buio non hanno paura» senza mai collegarlo: `propensioneContesto` non era agganciata a niente e
  la sostituzione delle dottrine era **inerte**. Ora `npc._disposizione` tocca `emo.paura`.
- [x] **Due sensi erano morti.** `npc._vicini` non lo scriveva nessuno e `world.slope` non esiste:
  due dei sei canali dell'esperienza riportavano sempre lo stesso numero, e un senso costante non
  insegna niente. Ora il primo lo scrive il passo sociale, il secondo si ricava dall'altimetria
  (tarato ×26 sui dislivelli veri di questo mondo).
- [x] **`b.eff` e non `b`.** Nella scelta del cibo leggevo `b.effNutrimento`, che non esiste:
  l'analisi delle ricette sta sotto `b.eff`. Il nutrimento vero non entrava mai nella valutazione,
  che cadeva sempre sul ripiego 0,5.
- [x] **`cat is not defined` in `entities.js`.** Bug latente lasciato dalla de-categorizzazione: la
  variabile era stata tolta, il riferimento no. Faceva morire la simulazione appena una tecnica
  arrivava senza nome — ed è quello che uccideva le prove headless.
- [x] **Il banco di prova non caricava i materiali.** Le prove headless giravano con
  `registry.materials` vuoto: niente oggetti, arnesi né case. Il mondo campava di sola vegetazione e
  io stavo misurando un fantasma. *(Sequenza giusta: `new MaterialRegistry()` → `for (m of
  defaultMaterials()) registry.add(m)` → `registry.bindWorld(world)`; dt=0.165.)*

## Chi ci tiene va a cercarle

Restava una debolezza misurata: la superbia prediceva lo sfarzo solo a 0,08 — l'oro finiva addosso
a chi era **nato sopra un giacimento**, e il carattere non c'entrava. Mancava che chi ci tiene
*andasse a cercarle*, le cose che luccicano.

Il meccanismo esisteva già ed è quello dell'acqua: ci si ricorda dove si è trovato qualcosa e ci si
torna (`npc.luccicaNota`). Qui la molla non è la sete, è la vanità — e costa: chi ci va spende
giornate a camminare che gli altri passano a raccogliere da mangiare.

**Prima prova, fallita, e istruttiva.** Con soglia `vanita > 0.55` la superava *più di metà della
popolazione* (con tratti medi la vanità viene 0,57). Risultato: l'oro passò da 128 a 632 portatori e
diventò la cosa più amata del mondo, ma la correlazione con la superbia scese a **−0,002**. È il
fenomeno vero dei beni posizionali: **se tutti inseguono la stessa cosa, quella cosa smette di
distinguere chiunque.** Emerso da solo, e da manuale — ma non era l'effetto cercato.

**Con la soglia a 0,85** (ci va solo chi ci tiene sul serio):

| | prima | dopo |
|---|---|---|
| superbia → sfarzo | −0,00 | **+0,225** |
| avidità → sfarzo | +0,01 | **−0,171** |
| sfarzo → ceto | 0,83 | 0,80 |

Il segno negativo dell'avidità non è un difetto: è una distinzione. **L'avaro accumula, il superbo
ostenta**, e siccome quel che si porta addosso ha un limite di peso i due vizi si contendono le
stesse braccia. Due vite diverse da due tratti diversi, che è esattamente quello che si voleva.

## Stati della materia e geologia (`src/matter.js`)

L'osservazione che ha rimesso in riga tutto il resto: *«bisogna distinguere cosa deve essere
hardcodato (leggi fisiche, chimiche, istinti) e cosa invece no»*. La mia `indossabile()` era un
impasto di coefficienti scelti a mano — non una legge, un'opinione travestita.

- [x] **Lo stato della materia, dalla fisica.** `tempFusione` ce l'avevano solo 5 materiali su 46:
  l'ho dato a tutti, ed è quello a decidere. Lo stato dipende dal **posto**: il mercurio gela in
  montagna, il miele e il grasso colano nel deserto. Nessuno ha scritto due materiali diversi.
- [x] **La tavola di ciò che è possibile.** `AZIONI` in `matter.js` è hardcodata **apposta**, ed è
  il tipo giusto di hardcoding: non dice che l'oro è prezioso, dice che **non si indossa l'aria** e
  **non si beve il legno**. La distinzione che regge tutto: *cosa è possibile* lo decide la fisica;
  *cosa si fa, fra le cose possibili*, lo decidono fame, vizi, esperienza e gli altri. Il legno si
  può mangiare — è solo pessimo, e infatti nessuno lo fa finché non è disperato.
- [x] **Il mercurio non è più un ornamento.** Era il difetto che si vedeva a occhio: il metallo più
  lucido che ci sia è **liquido**, e nel mio codice contava come sfarzo. Ora `indossabile` esige lo
  stato solido, più due condizioni fisiche: non sbriciolarsi (fragile e senza legame è polvere) e
  non pesare troppo perché una quantità che si veda te la porti addosso.
- [x] **Lo splendore si calcola, non si assegna.** Prima `valore` («pregio») era un numero che
  scrivevo io materiale per materiale — cioè decidevo a mano che l'oro fosse prezioso, e allora il
  lusso non era emerso: era stato deciso in una tabella. Ora viene dal **colore** (chiaro e saturo
  si vede da lontano), dalla **conducibilità** (un metallo riflette *perché* conduce: elettroni
  liberi), dalla **trasparenza** e dalla **finitura**.
  Ne esce la gerarchia classica — Diamante 0,84 · Oro 0,75 · Argento 0,71 · Rame 0,66 · Ferro 0,58
  — senza che nessuno l'abbia scritta, e con qualche sorpresa: l'avorio non luccica.
- [x] **L'oro lavorato splende più dell'oro grezzo.** Non l'ho scritto da nessuna parte: i processi
  che c'erano già (`fondere`, `martellare`, `temperare`) abbassano fragilità e porosità e alzano
  la durezza — cioè **lisciano** — e una superficie liscia riflette. Misurato: **fondere l'oro +6%,
  il ferro +18%**. Nessun processo dichiara «questo rende prezioso».

## Geologia dedotta e scarsità

- [x] **Dove si trova una cosa dipende da come si è formata**, e questo si legge nelle proprietà.
  Cinque indoli ricavate, nessun nome di materiale nel codice: **igneo** (fonde solo altissimo ed è
  duro → si è formato nel fuoco, sta sulle alture), **sedimentario** (poroso e tenero → polvere
  posata sul fondo, sta in basso), **organico** (energia chimica e nutrimento → vita sepolta, conche
  umide e calde), **evaporitico** (sali, e niente di vivo → resta dove l'acqua se n'è andata, caldo
  e secco), **denso** (l'acqua lo lascia cadere per prima → lungo i fiumi: è per questo che l'oro si
  cerca nei fiumi).
  Verificato: in alto Quarzo 0,64 · Marmo 0,59 · Ferro 0,55 · Oro 0,51; in basso Petrolio 0,19 ·
  Zolfo 0,21 · Carbone 0,27; il Salnitro dove fa caldo (0,76); lungo i fiumi Marmo 0,63.
- [x] **Il mondo è più povero.** Giacimenti dimezzati e più piccoli: da 176 000 a ~110 000 tile.
  Mondi diversi hanno ricchezze diverse — il Diamante 61 tile in un mondo e 36 in un altro.
- [x] **Niente sparisce.** Una nicchia troppo stretta aveva cancellato il diamante dalla faccia
  della terra: adesso, se cercando non si trova un posto adatto, si usa il meno inadatto.
- [x] **I giacimenti si consumano e diventano difficili prima di finire.** Non c'è più la soglia
  secca sotto la quale una cosa spariva dalla vista: ora dove ce n'è tanto affiora, dove ne resta
  poco te lo devi cercare, e la resa cala col **quadrato** di quel che resta. È il motivo per cui una
  miniera si abbandona molto prima di essere vuota. Misurato su 462 anni: Salnitro all'88%, Oro
  all'89%; Ferro e Diamante intatti perché servono strumenti che non ci sono ancora.
- [x] **Via il tetto artificiale sullo sfarzo.** Al suo posto la saturazione dell'occhio
  (Weber-Fechner): il decimo anello si nota meno del terzo, il centesimo quasi per niente. Non è un
  limite, è come funziona un occhio.

## E da lì, senza scriverlo

- [x] **Si colonizza dove i propri sono già stati.** La meta di chi emigra era una direzione a
  caso — si colonizzava alla cieca. Ora si sceglie fra i posti segnati su `pop.scoperto` (dove gli
  esploratori sono passati) con la solita funzione di desiderio applicata a un luogo: un affamato
  punta alla valle verde, un ambizioso alla montagna che luccica.
- [x] **Anche il desiderio insoddisfatto spinge a partire.** Prima si partiva solo per fame e
  affollamento: il desiderio non muoveva nessuno. Ora chi vuole ciò che luccica e vive in una terra
  spoglia accumula la voglia di andarsene. Emigrazioni da **106 a 2 154**, coloni arrivati da 50 a
  **1 314**, un centinaio in viaggio in ogni momento.
- [x] **Una tensione geografica vera, che non ho messo io.** La gente vive dove la ricchezza
  minerale vale **0,19**, mentre la media delle terre è **0,48**: abitano i posti *poveri* di
  metalli. Non è un difetto — il cibo sta nelle valli sedimentarie e i metalli nelle montagne ignee,
  e le due voglie tirano in direzioni opposte. In montagna ci si va in spedizione, non a viverci,
  perché l'oro non si mangia e una colonia lassù muore di fame. Il mondo resta coerente da solo.
- [x] **Le mode sono diventate locali.** Con la ricchezza distribuita per geologia, popoli diversi
  amano cose diverse: uno l'Oro (+0,21), uno la Pelle (+0,29), altri il Gesso. Prima era Oro per
  tutti, perché l'oro stava dappertutto.

- [x] **I liquidi si perdono per strada.** Conseguenza della tavola `AZIONI`: un liquido, portato
  in giro nelle mani, cola ed evapora. Nessuno ha scritto «serve un recipiente» — c'è che l'acqua e
  l'olio non si accumulano, e finché qualcuno non si inventa qualcosa in cui tenerli si vive
  attaccati alla sorgente. Che è come si è vissuto per parecchie migliaia di anni.
- [x] **Una cosa vicina al proprio punto di fusione è molle.** `quantoSolido` gradua l'indossabilità:
  il **miele è indossabile 0,91 al freddo e 0,00 nel caldo** — la stessa sostanza, due posti, due
  possibilità diverse. L'oro non cambia (0,73), è lontanissimo dal fondere ovunque.
- [x] **Si vede tutto nell'interfaccia.** La lista dei materiali mostra lo stato (💧 per i liquidi),
  un ✦ per ciò che cattura l'occhio, e nel tooltip che cosa ci si può fare: *«Mercurio — liquido,
  splende 45%, non si porta addosso, si beve, non ci si costruisce»*. Sono tutte cose **derivate**,
  nessuna scritta a mano.

## Gli oggetti esistono

Era il limite grosso che reggeva tutto il resto: le cose fabbricate erano *ricette nella testa di
qualcuno*, non oggetti. L'oro lavorato splendeva di più **in teoria** e nessuno poteva portarselo al
collo, perché il prodotto della lavorazione non diventava una cosa.

- [x] **Un indice `id → materiale`.** Trenta ricerche lineari, molte dentro cicli che girano per
  ogni NPC a ogni passo. Ne restano 21 sostituite; con centinaia di materiali non avrebbe retto.
  Fatto **prima** di aprire il rubinetto, non dopo.
- [x] **Una scoperta stabile diventa materia.** Se è stata lavorata (non «grezzo») e la miscela sta
  insieme (stabilità > 0,55), si iscrive fra le materie del mondo con le proprietà che le ha dato la
  lavorazione. Non ha giacimenti — non sta sottoterra, esiste solo finché qualcuno la sa rifare — ma
  per tutto il resto è materia come le altre. **Tutte le leggi scritte finora le si applicano senza
  aggiungere una riga**: si raccoglie, si baratta, si eredita, si porta addosso, si ostenta, e ci si
  fa una superstizione sopra.
- [x] **Fare, non solo scoprire.** C'era solo l'invenzione: le cose venivano fuori per caso e non si
  producevano mai (12 pezzi in circolazione su 48 tipi). `maybeFabbrica` è la differenza fra
  l'inventore e l'artigiano — chi sa già come si fa una cosa e ha di che farla la rifà, se la vuole,
  con la solita somma. Da **12 a 8 776 oggetti in circolazione**.
- [x] **Le cose si perdono.** Un tetto secco avrebbe congelato la novità per sempre: dopo le prime
  quarantotto, nessuna invenzione avrebbe più potuto diventare una cosa. Invece cede il posto quella
  di cui non resta un pezzo in mano a nessuno — la ricetta resta nei libri, la cosa no. Risultato:
  **405 materie inventate nel tempo, 94 esistenti insieme**, e la novità non si ferma mai.

**Osservato in gioco:** il più prodotto è un forgiato — e *«Grasab forgiato»* (ostentabile 0,353)
batte *«Grasab»* (0,333): **il lavorato vale più del grezzo, e non l'ha scritto nessuno.** Il più
ostentabile che sia uscito si chiama *«Orogra pressato»*. E fra le cose che il popolo ha imparato a
temere compare *«Legages macinato»* — una superstizione su un oggetto fatto da loro.

## Ancora da fare

Sull'hardcoding non resta niente di aperto: ogni voce è chiusa, o ritirata dopo verifica (le
emozioni, le rotte commerciali). Quel che segue sono aggiunte.

- [x] **Il recipiente.** ✅ Rovesciato: il difetto non era che i liquidi si perdessero — era che **non
  si perdevano affatto**, e stavano nell'inventario come sassi. Ora un liquido senza niente che lo
  tenga si versa, e non è servita nessuna proprietà nuova: `tieneLiquidi()` risponde con quelle che
  c'erano già (stare in piedi, non bere né sbriciolarsi, potersi cavare in una delle tre maniere).
  Misurato: Stagno 0,98 · Bambù 0,90 · Rame 0,89 · Argilla 0,74 · Pelle 0,69 — fuori grano e sabbia.
- [~] **Che i popoli poveri guardino i ricchi.** **Misurato prima di toccare, e non succedeva.**
  Con 78 popoli, 1 150 coppie vicine e 787 guerre in corso: il divario di *ricchezza* non prediceva
  niente (correlazione **0,018**; divario medio 0,380 fra chi si fa la guerra contro 0,371 fra chi sta
  in pace — rumore), mentre il divario di *numero* sì (**0,405**; 0,632 contro 0,306). *(Entrambe
  fotografie: la misura causale, più sotto, mostra che descrivono effetti della guerra e non cause.)*
  Il perché stava in una riga: l'ostilità pesava `Math.abs(A.membri - B.membri)` e la ricchezza non
  entrava affatto nel conto. Ora entra, con la correzione che il caso del singolo suggeriva: a
  invidiare è **chi ha meno**, pesato dalla sua invidia — un ricco non invidia il povero.
  **Chiuso, e con un esito che non è quello che cercavo.** Misurando come si deve — divario delle
  coppie *in pace* registrato PRIMA, guerra osservata dopo, su 1 198 coppie di cui 127 finite a
  combattere — il termine della ricchezza **non si vede** (−0,029). Ma la stessa misura ha ribaltato
  anche l'altra metà: pure il segnale del numero era causazione inversa. **A fare la guerra sono i
  vicini di forza simile** (divario 0,211 contro 0,406 di chi resta in pace): è la guerra a creare il
  divario, non il contrario. Il termine della ricchezza resta nel motore come una pressione fra le
  altre — alzarne il coefficiente finché la correlazione appare sarebbe adattare il mondo alla
  misura, e non si fa.
- [x] **L'usura.** ✅ Fatta per le case (`logora()`) **e per gli attrezzi**. Il difetto sotto era più
  grosso di quel che c'era scritto: `strumento` veniva da quello che uno *sapeva fabbricare*, non da
  un oggetto posseduto — saper fare un'ascia non è avere un'ascia, e i metalli si estraevano per
  sempre. Ora l'attrezzo è la materia migliore che hai addosso fra quelle che tagliano, si consuma
  scavando e si rifà da capo consumandone dell'altra. Nessun tetto sul sapere: raccogliere una selce
  tagliente non richiede nessuna ricetta — il sapere entra dalla porta giusta, mettendoti in mano
  materie migliori. Misurato a 132 anni: 4 588 attrezzi forgiati, 2 035 rotti, e si fanno di **Rame,
  Osso, Selce, Pietra, Corno, Ossidiana** (nessuna dichiarata). L'era dei metalli si raggiunge lo
  stesso, ma il Ferro resta raro (84 pezzi) e il Diamante rarissimo (5): adesso costa tenerlo.
