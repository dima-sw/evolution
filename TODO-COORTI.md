# Le coorti — far crescere la popolazione senza perdere qualità

> «Se persone dello stesso posto e della stessa specializzazione li fai come una specie di branco,
> con salvati gli attributi di ognuno, o anzi diventa probabilità… così la popolazione resta grossa,
> anzi si può spingere all'infinito.»

## Prima: la parte che è già fatta

- [x] **La perizia.** Un guerriero che si batte da dieci anni colpisce meglio di uno da due, e lo
  stesso per ogni mestiere. Non era da inventare: `npc.azioni` contava già ogni gesto di ogni vita,
  dodici voci, da sempre — mancava solo farlo contare.
  **Non è l'età**: un vecchio che non ha mai impugnato niente non sa combattere.
  **Rendimenti calanti**: i primi dieci colpi insegnano moltissimo, i millesimi quasi niente — così
  un veterano non diventa mai invincibile.
  E la scala **se la dà il mondo**: sei bravo rispetto a quanto è normale fra i tuoi. In un mondo in
  pace sette scontri fanno un maestro; in uno in guerra perpetua non sono niente. *(Prima avevo un
  numero unico per tutto, e i guerrieri restavano eternamente inetti mentre i raccoglitori erano
  tutti maestri — non perché fosse vero, ma perché avevo scelto male un numero.)*
  Misurato: **una vita di mestiere vale fino a ×1,6 per colpo**, decisivo su un esercito e su scontri
  ripetuti, ma satura (insuperato con 3 000 gesti contro insuperato con 1 000: solo ×1,06).

---

## L'obiezione onesta, prima del piano

Ci sono due cose diverse dentro la stessa richiesta, e conviene non confonderle.

**Un guadagno costante senza perdere niente.** Aggiornare un terzo della gente per battito col
triplo del passo: per ciò che si accumula è *identico* (è lineare nel tempo), per ciò che capita a
caso la probabilità triplicata tiene lo stesso ritmo medio. **Zero qualità persa.** L'ho già fatto
sul passo sociale: **47,8 → 18,1 ms**. Si può estendere, ma è un fattore costante — non è infinito.

**La crescita senza limiti.** Per quella bisogna davvero smettere di tenere in memoria le persone.
E lì qualcosa si perde: non le *statistiche*, ma la **storia di quella persona lì** — chi ha
incontrato, di che ha paura per averci sbattuto il naso, chi ha amato.

Il punto delicato è che le medie **perdono le correlazioni**: se una coorte ha forza media 0,5 e
perizia media 0,3, non si sa più che *i forti erano gli esperti*. Estraendone uno, ne esce un
individuo incoerente — con una combinazione mai esistita.

**La tua idea delle classi sociali risolve proprio questo**, ed è la ragione per cui il piano qui
sotto è fattibile: una coorte non tiene *una* media, ne tiene una **per classe**. E siccome dentro
una classe le persone si somigliano davvero, la correlazione fra gli attributi è conservata dove
conta. Più classi = più fedeltà, e il numero di classi è una manopola: qualità contro velocità.

---

## Il piano, in tre fasi che danno frutto una per una

### Fase 1 — I turni, dappertutto *(nessuna perdita, si fa subito)*

- [ ] **1.1** Estendere lo spezzettamento a turni al resto del lavoro per-persona che non muove
  nessuno: bisogni, esperienza, mestiere, mestieri di conoscenza. Il **movimento resta a ogni
  battito**, altrimenti la gente saltella.
  **Prima di toccare, la misura da fare è già pronta:** `node banco/profilo_dentro.mjs` dice quale
  metodo dentro `pop.step` costa davvero. Spezzettare a caso non serve — parecchie cose sono già di
  fatto a turni tramite un dado (`rng() < 0.15` per `decayInventory`, `< 0.02` per `updateMestiere`),
  e `umani` scala ormai **lineare** (^0,9): il guadagno grosso non è più lì.
- [ ] **1.2** Misurare a ogni passo. La regola di sempre: se non è misurato, non è fatto.
  E una regola in più, imparata a caro prezzo: **misurare nel verso giusto.** Una fotografia dice
  che cosa sta insieme a che cosa, non che cosa causa che cosa — vedi `banco/invidia_prima.mjs`.

### Fase 2 — La coorte come contenitore *(nessuna perdita ancora)*

- [x] **2.1** ✅ Una `Coorte` che raggruppa gente **vera** per luogo + specializzazione, e tiene
  aggiornate le sue statistiche: quanti sono, medie e dispersione per attributo, perizie, classi.
- [~] **2.2** Il capo le vede già (`le_tue_schiere` nel prompt). I sistemi che ancora scorrono `pop.npcs` imparano a chiedere alla coorte invece che ai
  membri: quanti guerrieri ha quel popolo e con che perizia media, quanto cibo tiene, che umore ha.
  **Gli individui ci sono ancora tutti** — cambia solo chi fa la domanda a chi.
- [~] **2.3** `esitoScontro()` c'è e funziona; manca che il motore lo usi al posto degli scontri uomo per uomo. Una battaglia fra coorti si risolve con le loro statistiche invece che uomo per uomo.
  È qui che si vede subito il guadagno, e la perizia media è già pronta per entrarci.

### Fase 3 — La coorte come distribuzione *(qui si perde qualcosa, e va detto)*

> **Prima di cominciare, una cosa che la notte del 26 agosto ha reso più chiara.** Il costo totale è
> tornato **lineare** (^1,06 sull'ultimo raddoppio, contro ^1,41), quindi l'urgenza di questa fase è
> molto minore di quando fu scritta. Restano ripidi solo `fazioni` (^1,63) e `società` (^1,72), e per
> le fazioni il tentativo di renderle più veloci **senza toccare il mondo è già stato fatto e ha
> dato quello che poteva dare**: quel che resta si compra solo cambiando qualcosa del mondo.
>
> Quindi questa fase va valutata come una **scelta di qualità**, non come una necessità: si guadagna
> velocità e si perdono i legami personali e le avversioni imparate di chi si dissolve. La domanda
> da farsi prima di scrivere una riga è *cosa si perde*, e va misurata — non stimata.

- [ ] **3.1** Una coorte grande, omogenea, lontana e senza fatti degni di nota **lascia andare i
  membri** e tiene solo le classi con le loro distribuzioni. Da quel momento è leggera come una
  persona sola, per quante ne contenga.
- [ ] **3.2** **L'estrazione.** Quando qualcuno viene singolarizzato — diventa capo, inventa
  qualcosa, viene sfidato, incontra uno straniero — si **pesca un individuo vero** dalla classe che
  gli compete, coerente con le sue statistiche, e da lì vive come tutti gli altri.
- [ ] **3.3** **Cosa si perde, detto chiaro:** i legami personali, le avversioni imparate per
  esperienza diretta, la memoria di chi ti ha fatto del male. Restano come *tendenze della classe*,
  non come fatti di quella persona.
- [ ] **3.4** **Chi non si dissolve mai:** i capi, gli inventori, chi ha un ruolo, chi è in
  battaglia, chi si vede nell'inquadratura. Lì la qualità serve, e lì resta piena.

---

## Le manopole, tutte esposte

- **Quante classi per coorte** — qualità contro velocità.
- **Quanto grande e omogenea** deve essere una coorte per potersi dissolvere.
- **Quanto lontano** dall'inquadratura.
- **Turni** — in quante fette si divide il lavoro per-persona.

Nessuna di queste è una regola del mondo: sono tutte scelte su *quanto da vicino lo si guarda*. È
questo che rende la cosa accettabile — non stiamo semplificando il mondo, stiamo scegliendo la
distanza da cui osservarlo.


---

## La tempra — e la prova che il potere corrompe

Fatta: `src/tempra.js`. I **geni** restano quelli della nascita (i figli ereditano da quelli, non
dal padre consumato); deriva la **persona**, ancorata all'innato, con ritorno quando la pressione
cessa. Non è Lamarck — è che gli uomini si logorano e si rinfrancano, e i figli ricominciano.

Cinque leggi di livello 3, tutte osservate nella realtà: impotenza appresa (fatica senza frutto →
la volontà cala), mente della scarsità (fame → avidità), **paradosso del potere** (chi è obbedito →
superbia su, empatia giù), la paura che resta, la sicurezza che apre la curiosità.

### La prova — e una lezione sul come si misura

L'archetipo di un capo non è sorteggiato: si **legge dai suoi tratti** (`dittatore` pesa
`potere + aggressività − empatia`, `riformatore` pesa `+empatia`). Quindi se il potere cambia
davvero chi comanda, deve vedersi proprio lì.

**Il primo confronto che ho fatto non valeva niente, e va detto.** Dava «undici riformatori contro
due» e sembrava una prova schiacciante. Ma il mondo non era ancora riproducibile: tredici punti del
motore tiravano il dado con `Math.random()`, e soprattutto il seme dei giacimenti conteneva l'**id**
del materiale, che è un contatore globale mai azzerato. Due partite con lo stesso seme davano mondi
diversi — quindi quel confronto misurava la differenza fra due mondi, non l'effetto della tempra.
Era rumore travestito da prova.

**Rifatto dopo aver reso il mondo riproducibile**, l'effetto c'è ma è molto più piccolo:

| | con la tempra | senza |
|---|---|---|
| capi «duri» (dittatore o demagogo) | 11 su 12 — **92%** | 6 su 8 — **75%** |
| empatia dei capi | **−0,033** | 0 |
| superbia dei capi | **+0,041** | 0 |
| popolazione | 1 460 | 1 469 |

La direzione regge — il potere spinge verso il pugno duro, e l'archetipo si limita a leggere la
persona che uno è diventato — ma non è il ribaltamento che avevo annunciato. *(E un seme solo resta
un aneddoto: la misura su più semi è in corso.)*

## Difetti trovati per strada

- [x] **L'ambizione era un cricchetto** *(preesistente)*. In `society.js`, ogni eroe dava `+0.02` di
  ambizione permanente a chi lo vedeva, senza che scendesse mai: dopo qualche secolo l'ambizione di
  **tutti** era saturata a 1,0. Falsava la scelta dei capi, la voglia di potere e l'autorità
  percepita — da sempre e in silenzio. Ora passa da `piega()`, con ancora e riassorbimento.
- [x] **Tre tratti col nome sbagliato.** `lealtaT` viene da `lealta`, `invidiaT` da `invidia`,
  `iraT` da `ira`. Cercandoli nel genoma col nome della persona non li trovavo e ripiegavo su 0,5,
  trascinando la lealtà di tutti verso la metà a prescindere da come erano nati.
- [x] **Le tempeste erano planetarie.** Una burrasca colpiva **tutte le coste del mondo nello stesso
  istante**, e un'alluvione tutti i fiumi insieme: da lì le ecatombi improvvise (un solo evento che
  ne toccava settecento sparsi su un continente). Non era bilanciamento — una tempesta è un fatto
  che accade in un posto. Ora nasce dove nasce e arriva fin dove arriva.
- [x] **Il legno si mangiava.** Mancava la `digeribilita`: la cellulosa c'è davvero nel legno, è
  l'enzima che manca. Ora nutre solo ciò che è cibo (Grano 0,70, Carne 0,65, Uva 0,41).
