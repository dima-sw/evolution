# Evolution — roadmap dell'emergenza profonda

Principio assoluto: **niente hardcoding — solo leggi del mondo.** Non si programma la storia,
si programmano le *regole con cui la storia può nascere*.
Legenda stato: ✅ fatto · 🔨 in corso · ⏳ pianificato · 🧊 dopo l'AI.

> **Cambio di filosofia (dalla discussione con l'utente + ChatGPT).**
> Non servono più "feature" separate (espansione, religione, guerra…): tutte devono nascere
> dagli **stessi bisogni fondamentali** e dalle **stesse forze**. Le tre forze motrici sono:
> 1. **SCARSITÀ** → migrazione, agricoltura, conquista, guerra. Tutto parte da qui.
> 2. **CONFRONTO SOCIALE (invidia/pressione)** → memi, disuguaglianza, ribellioni, casus belli.
> 3. **REINTERPRETAZIONE (affordance)** → il progresso è usare in modo nuovo ciò che già esiste.

> **LA REGOLA D'ORO (obiettivo di lungo termine).** Non aggiungere MAI una meccanica perché "esiste
> nella storia umana", ma solo se è **conseguenza inevitabile delle leggi del mondo**. Non
> programmare *"esiste la schiavitù"* ma *"è possibile costringere qualcuno"*; non *"esistono le
> tasse"* ma *"è possibile trasferire risorse"*; non *"esiste il matrimonio"* ma *"si può scegliere
> con chi vivere/fare figli/condividere"*; non *"esistono le leggi"* ma solo **NORME** osservate
> («se faccio X succede Y» → dopo N osservazioni diventa norma). L'hardcoding va ridotto a **4 soli
> livelli**, da cui tutto il resto emerge:
> 1. **FISICA** (gravità, calore, materiali, chimica, energia, movimento/costo).
> 2. **BIOLOGIA** (fame, sete, sonno, riproduzione, genetica, malattie, morte).
> 3. **PSICOLOGIA** (emozioni, memoria, curiosità, paura, desideri, personalità, bias).
> 4. **INFORMAZIONE** (osservare, sperimentare, imitare, insegnare, dimenticare, comunicare, mentire).
> Famiglia, proprietà, commercio, religione, eserciti, denaro, città, imperi, tasse, schiavitù,
> banche, università, rivoluzioni… **non devono esistere nel motore**: emergono. Vedi 0.D e Priorità 10.

---

## PRIORITÀ 0 — LE FORZE DELLA STORIA (nuovo cuore del progetto)

### 0.1 Scarsità del suolo — capacità massima del territorio  ✅
- Ogni tile ha **fertilità** persistente (0..1). Raccogliere/pascolare/coltivare la abbassa;
  ricresce lenta se lasciata a riposo; l'inquinamento e lo sfruttamento continuo la sterilizzano.
- La vegetazione ricresce verso `foodCap × fertilità`: un campo sfruttato sempre diventa sterile.
- Effetto emergente atteso: rotazione naturale, spostamento, **pressione a espandersi**.

### 0.2 Espansione / colonizzazione emergente  ✅
- Quando l'area locale di un NPC è **sovraffollata + povera di risorse**, nasce il *bisogno di
  emigrare* (non un ordine): l'NPC parte lontano e fonda un nuovo insediamento.
- Nessuna regola "espanditi": è la fame di spazio+cibo a spingere fuori. Le città gemmano villaggi.

### 0.3 Bisogno di RIPARO (shelter)  ✅
- Nuovo bisogno `riparo`: cresce nel tempo, cala vicino a un edificio/casa. Se alto in clima
  ostile (freddo/pioggia/notte) → danno alla salute. Spinge a costruire abitazioni.
- Aggancio all'invidia (0.4): chi ha una casa migliore è invidiato → si vuole una casa più grande.

### 0.4 Invidia GENERALIZZATA  ✅
- L'invidia non è solo su strumenti/ricchezza: ora confronta anche **casa, salute, prole,
  status (leadership), ricchezza della fazione**. Stesso motore, più dimensioni.
- L'azione resta scelta dalla personalità (copia/furto/aggressione/collabora/rinuncia).

### 0.5 Memi culturali + pressione sociale  ✅
- Ogni gruppo possiede **memi** = convinzioni (non verità): `AMA/ODIA <bersaglio>` con intensità,
  diffusione, origine, età. Il bersaglio è emergente (colore pelle, origine, un materiale…).
- Si diffondono **come una malattia** per rete sociale (contatto), non per confini.
- Il **conformismo** dell'NPC decide quanto assimila; intelligenza/diffidenza lo frenano.
- I memi modificano **desideri e odi**, non direttamente il comportamento: un meme "ODIA i gialli"
  genera `memoria` negativa verso quegli NPC → i gruppi si dividono e si fanno la guerra.
- Così i capi "controllano le masse" senza che sia scritto da nessuna parte.

### 0.6 Ribelli e curiosi = chi fa la storia  ✅
- La storia la fa lo 0,1%: chi ha **conformismo basso + curiosità/intelligenza/coraggio alti**
  resiste alla pressione. Può diventare inventore, ribelle, fondatore, eretico.
- La `curiosita` è già il motore delle invenzioni; i ribelli già migrano/non si conformano.

### 0.7 Religione emergente  ✅ (base)
- Nasce quando un NPC **carismatico** sopravvive a un **evento saliente** (epidemia, carestia,
  alluvione…): interpreta la sopravvivenza come segno. Non c'è pulsante "crea religione".
- Si diffonde per **rete sociale** (come i memi). Ci si crede secondo paura/conformismo/
  (ir)razionalità/fiducia; alta razionalità + bassa paura → si RIFIUTA.
- **Non ha confini**: due popoli in guerra possono condividerla; un popolo può averne più d'una;
  una religione può non avere stato. Dà coesione/morale a chi crede.
- ERESIE E SCISMI ✅: un credente carismatico e poco conformista fonda una SETTA derivata che si
  ramifica dalla madre (nome "Madre-Xxx") e le fa concorrenza. Verificato: alberi genealogici di
  fedi (Terraismo → Terraismo-Fia, Terraismo-Sol; Lunaita → Lunaita-Mon, Lunaita-Mar).
- ⏳ credenze/riti/simboli/tabù/promesse come sotto-attributi espliciti della fede.

### 0.8 Guerra fra fazioni (pre-AI)  ✅ (livelli 1-2; i livelli 3-4 sono i ganci dell'AI)
- Livello 1 (**Caos**) ✅: relazioni fra fazioni emergono da odio-memi + invidia collettiva +
  competizione per le risorse → **razzie** ai confini (i vicini di gruppi ostili si aggrediscono).
- Livello 2 (**Tattica**) ✅: un leader capace organizza attacchi COORDINATI concentrati sul centro
  nemico (invece di razzie sparse); il morale dei difensori si logora; emergono i veterani.
- Livello 3 (**Strategia**) 🧊: il generale analizza le sconfitte e adatta (di notte, accerchiando…).
- Livello 4 (**Dottrina**) 🧊: ogni stato sviluppa uno stile (difensivo/guerriglia/navale…).
- I livelli 3–4 sono i primi ganci naturali per l'AI (Priorità 6).

### 0.9 DNA culturale delle fazioni  ✅ (base)
- Ogni fazione ha valori numerici che **emergono dalla storia** (medie pesate di micro-eventi:
  guerre vinte/perse, carestie, memi dominanti): militarismo, spiritualità, apertura, commercio,
  innovazione, tradizionalismo… Nessuno scrive "diventa militarista".
- ✅ FATTO: `pop.dnaCulturale` per identità — militarismo, spiritualità, commercio, prudenza,
  innovazione, tradizionalismo si accumulano con MEDIA MOBILE LENTISSIMA dagli eventi vissuti
  (guerre in corso, carestie, baratti, inventori, fedeli, età media). La cultura cambia
  nell'arco di generazioni. Verificato: emergono civiltà mercantili (commercio 0.99) vs guerriere.

---

## PRIORITÀ 0.B — IL COSTO DI OGNI AZIONE (metabolismo, spazio, tempo)

> **Principio:** niente è gratis. Finora un NPC poteva attraversare la mappa "gratis". Ogni azione
> deve avere un costo energetico e di opportunità: `costo = distanza × peso trasportato × pendenza ×
> terreno × meteo`. Ogni invenzione/legge/strada/nave esiste solo perché, IN QUEL CONTESTO, riduce
> un costo o aumenta un beneficio (casa→meno morti; strada→meno tempo; nave→nuove risorse;
> proprietà privata→meno conflitti ma più disuguaglianza). MA il "beneficio" è soggettivo → vedi 0.C.

### B.1 Metabolismo del movimento  ✅
- Muoversi consuma: ogni spostamento aumenta fame/sete/stanchezza in proporzione a distanza,
  terreno, pendenza e peso. Camminare ≠ gratis; scalare ≠ camminare.

### B.2 Costo del terreno  ✅
- Ogni bioma ha una FATICA: prateria 1.2 · foresta 1.6 · sabbia/deserto 2 · roccia 2.5 ·
  montagna 5 · neve 6. Due mete equidistanti possono avere costi opposti.

### B.3 Dislivello  ✅
- Salire costa molto di più (pendenza dal campo `elevation`). Un monte con un carico pesante
  è una spedizione.

### B.4 Peso trasportato  ✅
- Massa dell'inventario (Σ qta × densità) → rallenta e affatica. Da qui la CONVENIENZA di
  zaini/slitte/carri/animali da soma/navi (B.8).

### B.5 Sonno  ✅
- La stanchezza OBBLIGA a dormire. All'inizio si dorme dove capita; al riparo (casa/edificio) si
  recupera meglio e si rischia meno → il rifugio nasce perché aumenta la sopravvivenza, mai da ricetta.
- Sfinimento: stanchezza oltre il limite → danno alla salute.

### B.6 Proprietà privata EMERGENTE  ✅ (base)
- NESSUNA regola "la casa è privata". Un esposto si ripara nella casa di un altro; il proprietario
  reagisce secondo la SUA personalità (empatia→ospita; avidità/superbia→scaccia). Dalla somma delle
  reazioni ogni fazione sviluppa una NORMA (ospitalità 0..1) che i conformisti seguono → possono
  nascere culture "tutto condiviso", "casa privata", "l'ospite è sacro".

### B.7 Viaggio pianificato  ✅ (base)
- Il colono valuta le PROVVISTE (cibo nell'inventario) prima di partire: senza scorte non parte —
  a meno che la disperazione (malcontento alto) non lo spinga comunque, e allora rischia la vita.
- ⏳ stima esplicita di acqua/riposi/pericoli sul percorso; carovane (B.10).

### B.8 Mezzi di trasporto USATI  ✅ (base)
- Il mezzo non serve "a muoversi": serve a RIDURRE IL COSTO. Chi CONOSCE un Veicolo terrestre
  viaggia più veloce e porta peso con meno fatica; chi conosce un'Imbarcazione può ATTRAVERSARE
  l'ACQUA (migrazioni oltremare, pesca al largo) a costo basso. Velocità per mezzo ≠ a piedi.
- ⏳ mezzi come OGGETTI posseduti (si costruiscono, si rubano, si prestano) e animali da soma.

### B.9 Infrastrutture emergenti (sentieri → strade)  ✅ (sentieri)
- Il passaggio ripetuto consuma il terreno: `traffic` per tile → sopra soglia nasce un SENTIERO
  (fatica ridotta, si cammina più veloci) che decade se abbandonato. Mai piazzato da noi.
- ⏳ strada lastricata (con materiali), ponti, porti.

### B.10 Logistica  🔨 (magazzini ✅ · carovane ⏳)
- MAGAZZINI/SCORTE ✅ (`society.js`): i granai diventano depositi comuni — chi è sazio deposita le
  eccedenze, chi ha fame preleva. Nasce la redistribuzione (e la possibilità di impadronirsene).
- ⏳ carovane/convogli fra insediamenti, rotte commerciali, "conviene trasportarlo?".
- Trasportare costa: se il grano dista 200 km e il trasporto costa più del raccolto, non conviene →
  magazzini, villaggi intermedi, mercanti, città commerciali.

### B.11 Il costo del TEMPO  ⏳
- Ogni azione occupa tempo sottratto a tutto il resto (10 giorni di viaggio = 10 giorni senza
  raccogliere/difendere/figliare). Già implicito nel simulatore; esplicito quando ci sarà la
  pianificazione (B.7): le soluzioni che fanno risparmiare tempo vincono.

---

## PRIORITÀ 0.C — MOTIVAZIONI: LA NATURA UMANA (non solo ottimizzazione)

> **Principio:** gli esseri viventi NON cercano la decisione migliore. Massimizzano ciò che
> DESIDERANO in quel momento, secondo la loro PERCEZIONE del mondo — che può essere sbagliata
> (propaganda, religione, orgoglio, paura, informazioni incomplete). Se tutto fosse ottimizzazione,
> il mondo convergerebbe al razionale; la storia invece la fanno anche psicopatici di potere,
> vendette, gloria e gente che scopre solo perché VUOLE scoprire. Da qui l'imprevedibilità:
> stesse condizioni iniziali → storie completamente diverse.

### C.1 Funzione obiettivo individuale  ✅
- Ogni NPC ha PESI diversi (derivati dai geni): sopravvivenza, ricchezza, potere, conoscenza,
  fama, appartenenza, vendetta, compassione. Due persone = due funzioni obiettivo diverse.

### C.2 VOLONTÀ (nuovo tratto genetico)  ✅
- Non è curiosità: è perseguire l'obiettivo ANCHE QUANDO È IRRAZIONALE (Newton, Napoleone,
  Marco Polo). Con volontà alta l'inventore sperimenta anche affamato e stanco.

### C.3 Outlier: le anomalie fanno la storia  ✅
- La popolazione segue una distribuzione normale, ma ~1% delle nascite ha UN tratto estremo
  (empatia 2/crudeltà 98 → tiranno; curiosità 100 → scienziato). Se un outlier prende il potere,
  la storia cambia.

### C.4 Stati irrazionali  ✅ (propaganda ✅ · ARCHETIPI del leader ✅ · ordini espliciti con l'AI, M6)
- Ogni leader riceve un ARCHETIPO letto dai suoi pesi-motivazione: dittatore / stratega / visionario
  / burocrate / demagogo / riformatore. Lo stesso trono produce storie diversissime.
- Lo stato segue le motivazioni del SUO leader: potere→repressione/tasse; conoscenza→ricerca;
  ricchezza→colonie/commercio; fede→templi/crociate. (Il leader AI di M6 riceverà anche i
  propri pesi-motivazione nel JSON.)

### C.5 PROPAGANDA / capro espiatorio  ✅
- Popolo povero e arrabbiato + leader assetato di potere e senza empatia → NON risolve il
  problema: addita un nemico ("è colpa di chi ha la pelle X"), la rabbia cambia bersaglio,
  il malcontento si sfoga sul capro espiatorio. Successo storico garantito.

### C.6 Guerra multi-causa  ✅ (base)
- Non solo scarsità: orgoglio/gloria del leader guerrafondaio, VENDETTA (i rancori delle razzie
  passate si accumulano fra popoli), follia di un leader outlier, ideologia (odio-memi).
  ⏳ paura preventiva, errore di valutazione (percezione distorta della forza altrui).

### C.7 Scoprire per il gusto di scoprire  ✅
- L'inventore con conoscenza+volontà alte sperimenta ANCHE quando non conviene: magari muore
  senza inventare nulla, magari inventa il motore. Se no restano tutti al villaggio a mangiare bacche.

---

## PRIORITÀ 0.D — LA SOCIETÀ È UN GRAFO SOCIALE (niente livelli amministrativi hardcodati)

> **Principio (utente + ChatGPT).** Non esistono "tribù/villaggio/città/regno/impero" come categorie:
> quella è storia umana, non una legge. Esistono **solo individui e relazioni** (fiducia, parentela,
> commercio, obbedienza, paura, debito, influenza). Le "nazioni" sono solo **cluster molto connessi**
> del grafo. Un gruppo può crescere SENZA LIMITE (3 · 50 · 10.000 · l'intero pianeta) restando "solo
> un gruppo". Il **territorio è una conseguenza**, non l'entità: ogni cella ha un'INFLUENZA continua
> `{fazione A: 0.82, B: 0.12}`, i confini non sono poligoni. Un impero può essere **discontinuo**
> (solo porti, isole, miniere). Colonie, secessioni, collassi, federazioni: nessun evento dedicato,
> emergono dal rafforzarsi/indebolirsi delle relazioni.

### D.1 Solo GRUPPI, illimitati — via i livelli fissi  ✅ (base)
- Le etichette `tribù…impero…egemonia` restano solo come DESCRITTORE di taglia (non cambiano la
  logica). Il gruppo è un cluster del grafo, di dimensione qualunque. INFLUENZA TERRITORIALE CONTINUA
  (`pop.terrCell`): ogni cella appartiene alla fazione che vi ha più presenza → territori continui e
  anche DISCONTINUI (isole/enclavi). Vista "Territorio" sulla mappa + stat celle per fazione.

### D.2 CONTROLLO vs COESIONE — perché non converge a un solo impero  ✅ (base)
- `factions.js` riscritto: da ogni cluster grezzo (union-find) si CARVANO le "polity" con una FLOOD
  dal leader. Due limiti emergenti: **portata di distanza** (il governo paga distanza×dislivello) e
  **span of control** (`maxGov` = quante persone un leader regge, ∝ intelligenza/ambizione/forza).
  Oltre → la periferia si stacca e forma un'altra polity. Nessun `if(pop>N) rebellion()`.
- Verificato: niente più impero unico. Con ~900 vivi → **8-10 popoli coesistono**, il maggiore ~26%
  (prima 91%). Grande leader = dominio più esteso; leader debole = collasso ai bordi.
- Perf: flood O(archi) senza re-rilassamento + adiacenza precalcolata → updateFactions ~18ms a 900 vivi.
- COESIONE ESPLICITA ✅ (`f.coesione`): lealtà + benessere + fede condivisa − divergenza linguistica
  − dispersione territoriale. Un impero può essere vasto e sfaldato (19%) o piccolo e granitico
  (52%): controllo e coesione sono due cose diverse, come dev'essere.

### D.3 IDENTITÀ con inerzia — basta col nome che cambia di continuo  ✅
- Ogni gruppo ha un'IDENTITÀ PERSISTENTE (`npc.identita`, nomi in `pop.identityNames`): una polity
  eredita l'identità tramandata dalla MAGGIORANZA dei suoi membri; ne conia una nuova solo se nessuna
  prevale o è già presa da una polity più grande (= secessione). Roma resta Roma coi cambi di leader.
  Verificato: le identità durano centinaia d'anni; alla scissione il ramo minore diventa un nuovo popolo.

### D.4 Colonie / secessioni / riunificazioni EMERGENTI  🔨 (secessioni/colonie ✅ · riunificazioni ⏳)
- Colonia: dei coloni partono (migrazione ✅), fondano case, dopo generazioni sono un gruppo con la
  propria identità (✅ via D.3). Se la rete col centro si assottiglia (distanza/span → D.2) si
  separano ✅. RIUNIFICAZIONI ✅: due popoli vicini senza rancori e con lingua/fede affini si
  frequentano, i legami di confine si rafforzano e il grafo si RICUCE da solo in un unico cluster.
- CAPITALE emergente ✅: `f.capX/capY` = la cella di massima convergenza (più popolata) della
  fazione, non `capitale = X`. Resa ★ sulla mappa. ⏳ capitali distinte politica/religiosa/economica.

### D.5 La CULTURA diverge con la separazione  🔨 (lingua ✅) — più due popolazioni stanno isolate,
  più cambiano (lingua ✅, religione/memi ✅, aspetto ✅); dopo secoli non si sentono più un popolo.

### D.6 Istituzioni dai PRIMITIVI (non scritte)  ✅ (base) — `society.js`. Il motore NON conosce
  tasse/leggi/scuole/classi/schiavitù: espone PRIMITIVI e le istituzioni sono ciò che emerge.
  - *trasferire risorse* → un capo avido PRETENDE (chi cede per lealtà/paura = **tributo**; con
    minaccia = **estorsione**); chi ha molto ed è empatico DÀ a chi non ha (**dono/elemosina**).
  - *conseguenze osservate* → **norme/diritto**: i testimoni decidono se punire; ogni pena (o
    impunità) sposta la norma condivisa `pop.norme.furto`. Società diverse → norme diverse:
    verificato un mondo severo (norma 0.9) e uno tollerante (0.05) dagli stessi identici algoritmi.
  - *costringere chi non può rifiutare* → **lavoro forzato**: un forte sottomette un affamato senza
    nulla; il servo si libera se trova coraggio o se il malcontento esplode.
  - *insegnare ciò che si sa* → **maestri e apprendisti**: gli anziani esperti trasmettono ai
    giovani vicini (se parlano la stessa lingua) → il sapere non si teletrasporta più.
  - *disuguaglianza di ricchezza/prestigio* → **ceti**: nobili / agiati / poveri / servi + indice
    di disuguaglianza. Nessuna casta scritta: è la fotografia della distribuzione.
  - *ricordare i morti notevoli* → **miti**: eroi, maestri venerati, inventori leggendari, tiranni.
    Ispirano (speranza/ambizione) o lasciano paura in chi resta.
  - ⏳ matrimonio/eredità formali, custodire beni altrui (banca/tempio), moneta coniata.

### D.7 Bug del MONDO da correggere (osservati dall'utente)  ✅ (base)
- Tutti sulle COSTE, mai sui fiumi → RISOLTO: pesci anche in acqua DOLCE (`freshWaterTiles`, plancton
  ricco in fiumi/laghi/paludi-delta), rive dei fiumi più fertili (×1.6), MALUS SALINO sulla terra a
  ridosso del mare (×0.45 se non bagnata da acqua dolce), plancton marino ridotto. Verificato: i
  fiumi passano dal 15% al **35%** degli abitanti (su solo l'8% del territorio → forte preferenza,
  pattern Nilo/Indo); la costa scende dal 62% al 52%. Popolazione stabile e in crescita.
- Un SOLO impero alla fine → risolto da D.2 (controllo limitato da distanza + span of control).
- ⏳ tempeste/erosione marine come pericolo per chi vive sulla costa aperta (svantaggio in più).

---

## PRIORITÀ 1 — i "tappi" all'emergenza  ✅ (tutti fatti)
1.1 Conoscenza LOCALE (anti-hivemind) ✅ · 1.2 Stagioni ✅ · 1.3 Decadimento oggetti ✅ ·
1.4 Mestieri emergenti ✅ · 1.5 Cronache storiche ✅

## PRIORITÀ 2 — leggi naturali più profonde
### 2.1 Fisica generale invece di "effetti" (AFFORDANCE)  🔨 (a)+(b) ✅ · (c) ⏳
**Cos'è e perché.** Oggi alcuni attributi sono *antropocentrici* (`cura`, `veleno`, `nutrimento`):
è come se una pietra "sapesse" di essere un'arma. Nella realtà una cosa ha solo **proprietà**;
l'uso è **interpretazione** degli esseri viventi, e cambia quando cambia la conoscenza (il fuoco:
prima paura, poi cuoce, poi indurisce l'argilla, poi fonde il ferro — il fuoco non cambia, cambia
l'interpretazione). Questo rende il progresso *organico*: non aggiungi oggetti, **reinterpreti** i
materiali che già esistono.

**Piano in 3 tappe — (a) e (b) FATTE, (c) da fare:**
- **(a) Proprietà fondamentali ✅.** `PROPS` diviso in famiglie oggettive: *fisiche* (durezza,
  densità, elasticità, fragilità, taglio, conducibilità, galleggiamento, portanza), *chimiche*
  (`energiaChim`, `reattivita`), *biologiche* (`nutriente`, `tossicita`, `bioattivo`), *strutturali*
  (legame, stabilizzante), *pregio* (lucentezza→"valore" culturale). **Spariti cura/veleno/nutrimento.**
- **(b) Affordance = interpretazioni scoperte ✅.** Nuova legge `physiology()` in chemistry.js:
  l'effetto sul corpo EMERGE (nutrimento = nutrienti×(1−tossine); beneficio/danno dal `bioattivo`
  secondo la dose — Paracelso). `classify()` = l'interpretazione dell'osservatore, non un tag.
  Esplosivo = energiaChim×reattività. Verificato emergente: Belladonna cruda→Veleno ma COTTA→
  Medicina (detossificazione!); Zolfo+Carbone→Esplosivo; Ferro+Carbone martellato→Arma.
  Regressione OK: tutte le categorie continuano a emergere (325 esperimenti di test).
  NB: salvataggi materiali v5 invalidati → chiave localStorage `evo.materials.v6`.
- **(c) Combinazione di conoscenze ✅ (base).** ESPERIMENTI GUIDATI (`guidedIngredients` in npc.js):
  l'inventore esperto parte da una scoperta NOTA e la VARIA (ingrediente in più, dose diversa,
  altro processo) — "il tronco galleggia → due tronchi → zattera". Più conoscenza = più possibilità
  = scoperte più probabili (grafo tecnologico 4.4 implicito). Verificato: ~40-50% degli esperimenti
  sono guidati. ⏳ Estensione: possibilità esplicite fra IDEE (imbarcazione+vento→vela).

### 2.2 Processi ✅ · 2.3 Fuoco ✅ · 2.4 Acqua (mare tutto salato) ✅ · 2.6 Ecologia/cicatrici ✅
### 2.5 Reti alimentari (non catene)  ✅  Onnivori + DIETA FLESSIBILE: gli animali morti lasciano
  CAROGNE (`pop.carcasse`) che i predatori spazzinano quando manca la preda viva (buffer leggero,
  non un boom). I predatori NON lasciano carogna (niente loop di cannibalismo). + RICOLONIZZAZIONE:
  se una specie quasi sparisce mentre l'habitat regge, pochi individui arrivano da fuori mappa →
  l'estinzione è possibile ma non definitiva. Verificato: ciclo preda-predatore che OSCILLA e si
  RIPRENDE (erb 4→2500, pred 5→1200) invece di estinguersi a catena.
- 2.4+ ✅ ACQUA STAGNANTE/PALUDI (`world.stagnant`): i fiumi che finiscono in conca e le terre
  basse calde e umide formano stagni — acqua dolce ma MALSANA: bere lì può contagiare (colera-like).
  Resa visibile (verde torbido). Chi SA CUOCERE (`_saBollire`, conosce una ricetta col processo
  "cuocere") bolle l'acqua e non si ammala — l'acqua potabile è una SCOPERTA appresa.
- 2.5+ ✅ PARAMETRI RIPRODUTTIVI per specie (dal DNA): `etaFertile`/`etaSterile` (finestra d'età) —
  i grandi maturano tardi e per meno tempo, i piccoli presto. Emergono dalla taglia, non scritti.

## PRIORITÀ 3 — biologia evolutiva
3.1 Specie animali emergenti (DNA) ✅ · 3.3 Tratti ereditari + estinzioni ✅
### 3.2 Evoluzione delle piante / AGRICOLTURA  ✅ (base)
- AGRICOLTURA REALE ✅ (`pop.campi`): un NPC stanziale con dei semi (materiale nutriente) dissoda un
  CAMPO su un tile fertile vicino a casa; il campo OCCUPA il tile, matura con la stagione, dà resa
  alta ma ESAURISCE la fertilità più in fretta (monocoltura) → servono nuovi campi → espansione.
  Emerge il mestiere "agricoltore"; campi renderizzati sulla mappa. Verificato: 100-330 campi.
- PIANTE SELVATICHE che EVOLVONO ✅ (`regenRenewables`): ogni pianta rinnovabile ha un CLIMA IDEALE
  (`tempIdeale`); ricresce dove il clima combacia, appassisce fuori; l'ideale DERIVA verso i luoghi
  dove prospera (+ mutazione) → adattamento regionale, la specie diverge in ceppi caldi/freddi.
- ROTAZIONE DELLE COLTURE ✅: il motore ricorda l'ultima semente per tile — rimettere lo stesso
  seme impoverisce il suolo, alternarlo lo ristora; il contadino accorto (intelligenza) cambia.
  La pratica agronomica emerge dal degrado, non da una regola.
- ⏳ domesticazione (colture come ceppo derivato dalle selvatiche); tossicità/resa come geni.

## PRIORITÀ 4 — conoscenza, cultura, informazione
### 4.1 Quattro livelli della conoscenza  🔨 (base: ogni credenza ha un `livello` — ipotesi →
  esperimento → teoria — che cresce con le prove; ⏳ osservazione passiva delle proprietà)
### 4.2 Conoscenza parziale  ✅ (base)  Il sapere è per-firma (ferro grezzo ≠ ferro forgiato: ricette
  distinte). Si TRAMANDA ciò di cui si è sicuri: una "teoria" (molte prove) passa facile, una
  "ipotesi" incerta di rado → il sapere consolidato si diffonde, quello acerbo resta locale. ⏳
  prerequisiti espliciti (serve la teoria del ferro prima di quella dell'acciaio).
### 4.3 Conoscenza falsa  ✅  Il verdetto ha INERZIA (isteresi): non si ribalta alla prima prova
  contraria, servono evidenze nette e ripetute. Così una civiltà può credere il falso per
  generazioni (`b.falsaCredenza`) e correggersi solo quando le prove si accumulano davvero.
### 4.4 Grafo tecnologico (non albero)  ✅ → implicito negli ESPERIMENTI GUIDATI di 2.1(c): ogni
  invenzione nota aumenta la probabilità di scoprirne di derivate. Mai obbligatorie.
### 4.5 Ricorsione tecnologica (strumenti che creano strumenti)  ✅
### 4.6 Linguaggio  ✅ (base)  `npc.lingua` continua: si EREDITA (media genitori + deriva),
  parlarsi la AVVICINA, l'isolamento la fa DIVERGERE; se troppo lontane l'insegnamento FALLISCE
  ("non si capiscono"). Verificato: Babele iniziale → convergenza in dialetti locali (8→4);
  negli arcipelaghi PIÙ dialetti (11) perché il mare isola. ⏳ nomi delle invenzioni per-lingua.
### 4.7 Cultura (tradizioni, arte, riti, feste)  ✅  Un NPC CREATIVO e sazio produce un'OPERA — la
  forma (canto/danza/pittura/racconto/rito/scultura/festa) emerge dai suoi tratti; chi assiste ne
  trae gioia e coesione. Una forma che raduna gente diventa TRADIZIONE del popolo. L'arte esiste
  perché alza il morale, non perché l'abbiamo scritta. ⏳ tabù espliciti.
### 4.8 Scoperta del territorio (fog of war)  ✅  `pop.scoperto`: il mondo è noto solo dove qualcuno
  ha camminato; vista "Scoperto" + stat % esplorato. ⏳ mappe PER-FAZIONE (rimandato: le fazioni
  hanno id instabili tra i frame, servirebbe un'identità persistente prima di mappe separate).

## PRIORITÀ 5 — società ed economia (pre-AI)
5.1 Fazioni/cluster dai legami ✅ · 5.2 Valore soggettivo + baratto ✅ · 5.3 Denaro emergente ✅
### 5.4 Specializzazione richiesta dagli altri  ✅ (base)  Il malato CERCA il guaritore tra i
  vicini: se questi conosce una Medicina fidata presta la cura → gratitudine e legame (il mestiere
  acquista valore sociale). ⏳ lo stesso per costruttori e inventori richiesti.
### 5.5 Gruppi = grafo sociale (niente livelli fissi, identità + secessione)  ✅ → vedi 0.D.2/0.D.3.

## PRIORITÀ 6 — AI dei leader  ✅ (nucleo completo e funzionante)

**Architettura** — `server.js` (proxy), `src/ai.js` (mente), `src/orders.js` (potere come influenza).
- **Proxy LLM** ✅: le API key restano SUL SERVER (il browser non le vede mai; `.env` non è servibile).
  Failover a cascata su 8 provider (groq → gemini → mistral → openai → deepseek → openrouter →
  cohere → ollama). Fallback TLS automatico se un antivirus/proxy intercetta i certificati.
- **Nascita dello Stato** ✅: un popolo sopra i 25 membri "si dà un governo" e il suo capo comincia
  a pensare. Sotto quella soglia si vive senza politica.
- **Il potere è INFLUENZA, non un telecomando** ✅ (`orders.js`): l'obbedienza dipende da lealtà,
  paura, conformismo, bias di autorità, fede condivisa, distanza dal capo — e i BISOGNI VITALI
  vincono sempre (chi ha fame o sete ignora ogni ordine; una campagna militare si sfalda per la
  fame). Obbedire controvoglia accumula malcontento. Verificato: ~38% di obbedienza reale.
- **Personalità non inventata** ✅: è quella del cittadino reale diventato capo (i suoi tratti
  genetici) + il suo archetipo (dittatore/stratega/visionario/burocrate/demagogo/riformatore).
- **Non è onnisciente** ✅: vede solo ciò che il suo popolo ha esplorato (fog of war), le risorse
  che i suoi possiedono davvero, i vicini entro il raggio noto.
- **Impara dal passato** ✅: ogni nuovo capo riceve nel prompt la MEMORIA DINASTICA (chi lo ha
  preceduto, quanto durò, cosa ordinò, come cadde) + un report di cosa è successo dei suoi ordini
  (eseguiti/ignorati, nati/morti). È l'unico modo in cui un LLM "impara": via contesto.
- **Editti** ✅: 11 compiti (raccogliere, costruire, coltivare, esplorare, migrare, attaccare,
  difendere, pregare, festeggiare, studiare, commerciare) con quantità, luogo e durata. Gli ordini
  pagano i costi fisici del mondo (marciare costa fame e stanchezza: nessun teletrasporto).
- **Propaganda** ✅: il capo può coniare un meme e imporlo ai conformisti (riusa il sistema memi).
- **Diplomazia e MENZOGNA** ✅: messaggi fra popoli con flag `sincero`; le promesse di pace vengono
  VERIFICATE dai fatti (se prometti pace e poi razzii, la fiducia dell'altro crolla).
- **Sub-menti e conflitti interni** ✅: il capo nomina ruoli (generale/sacerdote/maestro/mercante)
  che accumulano POTERE se il loro dominio conta (guerra→generale, fede→sacerdote); un ruolo
  potente, ambizioso e sleale SFIDA il capo e trascina i suoi fedeli (chiesa contro stato).
- **Il capo può cadere** ✅: consenso basso + malcontento alto → CONGIURA (un ambizioso o un ruolo
  lo assassina). Inerzia del potere per evitare che il trono cambi a ogni frame: i regni durano
  4-20 anni. Alla morte, la dinastia registra come è finito.
- **Asincrono e non bloccante** ✅: max 2 riflessioni in volo, una ogni ~6 anni per popolo (3 se in
  crisi o in guerra). Se tutti i provider falliscono, i capi tornano a governare d'istinto e la
  simulazione non si ferma mai.

**Verificato in gioco**: un capo ha scritto *"I ribelli crescono se non mostro forza. Cobuna è
debole e vicino: li attacco per rubare cibo e seminare terrore"* → editti di attacco + propaganda
"ODIATE Cobuna" + nomina di un generale. Un altro: *"Nasconderò la debolezza con propaganda"* +
messaggio diplomatico marcato come menzogna. I ragionamenti citano dati reali (fame 0.34, scorte
397, stagione, ricchezze del vicino).

**IGNORANZA E DIVERSITÀ DELLE MENTI** ✅ (2026-07-24)
- **Vocabolario emergente**: un capo può ordinare **solo ciò che il suo popolo ha già fatto**.
  "coltivare" esiste come parola d'ordine solo dopo che qualcuno ha seminato di sua iniziativa;
  "attaccare" solo dopo che c'è stata violenza; "pregare" solo se c'è una fede. I primi capi della
  storia sanno dire soltanto *raccogliete*, *difendetevi*, *andiamo altrove*: il lessico del
  comando **cresce con la civiltà**, e ogni popolo ha il suo. Un ordine fuori vocabolario è scartato.
- **Percezione distorta**: la mente non riceve la verità, riceve ciò che quel capo riesce a vedere.
  Chi ha poca intelligenza non ha numeri ma impressioni ("molta fame" invece di 0.72); la sicumera
  fa sottovalutare le minacce, la paura le ingigantisce; chi ha poca curiosità **non vede i popoli
  lontani**. Sono gli stessi bias che governano tutti gli altri esseri.
- **Lessico del popolo**: le entità inventate dalla gente (10.2) entrano nel prompt **coi loro nomi
  inventati e senza spiegazione**, con solo l'effetto osservato ("pare che giovi"). Il capo deve
  dedurre da sé cosa siano.
- **Menti diverse**: ogni archetipo riceve un'istruzione di indole diversa, che cambia *cosa
  considera un problema*. Verificato in gioco: davanti allo stesso inverno, quattro capi hanno
  fatto quattro cose opposte (commercio / dono ai poveri / repressione / esplorazione).

**LEVE DEL POTERE** ✅ — tre primitivi neutri, non istituzioni: **proteggere** (chi obbedisce sta
addosso al capo e fa scudo alle congiure), **reprimere** (usare la forza sui propri malcontenti:
funziona, ma la paura sale insieme all'odio), **donare** (il capo cede del suo e ne compra la
lealtà). Il motore non sa cosa sia una dittatura: offre solo queste possibilità. Nel report il
capo vede **se la sua presa sul potere si sta allentando**, quanti uomini lo proteggono e quanti
non lo riconoscono più — ed è da lì che può capire, da solo, cosa gli conviene.
Verificato: un capo ha scritto *"la lealtà va cementata con ordine ferreo e timore"* e ha ordinato
guardie del corpo e repressione; un altro, nello stesso mondo, ha distribuito i propri beni ai
poveri. **Nessuno dei due comportamenti è scritto nel codice.**

**⏳ Prossimi passi dell'AI** (non bloccanti): guerra livelli 3-4 (il generale AI che analizza le
sconfitte e sviluppa una DOTTRINA), trattati/alleanze formali, spie, ordini economici (tasse
esplicite), l'AI che nomina la propria capitale e "battezza" le ere.

---

## PRIORITÀ 8 — LE CATEGORIE FONDAMENTALI DELLA REALTÀ (inventario ChatGPT, "simulare un pianeta")

> **Cambio di prospettiva.** Non più "quali feature mancano?" ma "**quali categorie della realtà non
> sono ancora modellate?**". Lo schema universale è: `ENTITÀ · PROPRIETÀ · PROCESSI · RELAZIONI · LEGGI`.
> Contenuti (le "cose") aggiunti: vedi `CONTENUTI.md`. Qui i SISTEMI/LEGGI ancora da scrivere.

### 8.1 FISICA (oggi solo "materiale")  ⏳
- Meccanica: attrito, inerzia, pressione, leva, torsione, compressione, tensione, vibrazione.
- Termodinamica: temperatura, calore, conduzione/convezione/irraggiamento, evaporazione,
  condensazione, congelamento. (proprietà `tempFusione`/`attrito`/`viscosità` già presenti, da cablare)
- Fluidi: viscosità, corrente, pressione idraulica, galleggiamento reale, erosione.

### 8.2 CHIMICA reale  ⏳
- Acidità/basicità (prop `acidita` c'è), ossidazione/riduzione, catalisi, corrosione,
  cristallizzazione, polimerizzazione, decomposizione, volatilità (prop c'è), infiammabilità reale.

### 8.3 BIOLOGIA del corpo  ✅ (base)
- NUTRIZIONE REALE ✅: 5 gruppi (`npc.dieta`: proteine, carboidrati, grassi, vitamine, minerali)
  **derivati** dalle proprietà fondamentali dei materiali (carne→proteine, piante→carboidrati,
  energiaChim→grassi, bioattivo→vitamine, conducibilità→sali). Mangiare sempre lo stesso →
  CARENZA → si deperisce e ci si ammala di più: emerge il bisogno di una dieta VARIA (e quindi
  di cacciare *e* raccogliere *e* commerciare).
- SISTEMA IMMUNITARIO ✅: non più un booleano. `immunita` (difese generiche, indebolite da carenze
  e vecchiaia, rafforzate dalle malattie superate) + `anticorpi` (memoria per CEPPO: chi l'ha già
  avuta non la riprende). I denutriti muoiono di più; i figli ereditano immunità passiva.
- GRAVIDANZA REALE ✅: concepimento → gestazione (la gestante è più affamata, può perdere il
  bambino se sta male) → parto rischioso per la madre. Non più nascite istantanee.
- DOLORE ✅ (da salute/malattia: alimenta tristezza e toglie gioia). ⏳ ossigenazione, sangue,
  temperatura corporea come variabile a sé, età biologica distinta da quella anagrafica.

### 8.4 CLIMA e METEO  ✅ (base)  `climate.js`: VENTO che gira, GRANDINE che devasta i campi,
  SICCITÀ progressiva quando non piove (la vegetazione stenta), CENERE vulcanica ed ERA GLACIALE
  che raffreddano il mondo intero (`tempOffset`). Alluvioni/fulmini/incendi c'erano già.
  ⏳ uragani localizzati, neve come copertura del terreno.

### 8.5 GEOLOGIA  ✅ (base)  `climate.js`: TERREMOTI (crollano le case, la gente resta senza riparo),
  FRANE in montagna dopo le piogge, VULCANI (i picchi montuosi) che eruttano: cenere che oscura e
  raffredda, morte intorno, ma suolo FERTILISSIMO dopo. Verificato: un terremoto ha fatto nascere
  una religione (un profeta lo ha interpretato come segno). ⏳ geyser, erosione, desertificazione.

### 8.6 CICLO DELL'ACQUA  ✅  mare → EVAPORAZIONE (∝ temperatura e vento) → umidità che si accumula
  → PIOGGIA quando satura → fiumi → mare. La pioggia non è più un dado stagionale: è la
  conseguenza del bilancio idrico. Da qui nascono anche le siccità.

### 8.7 LUCE: GIORNO/NOTTE, LUNA, ECLISSI  ✅  Ciclo circadiano (`pop.ora`, `pop.notte`): di notte
  fa più freddo, si dorme volentieri (soglia di riposo molto più bassa) e si recupera meglio.
  Fasi lunari; ECLISSI possibile solo a luna nuova → il sole si oscura a mezzogiorno, terrore
  proporzionale all'irrazionalità → evento saliente da cui possono nascere religioni.

### 8.8 TEMPO: calendario, generazioni, epoche  🔨 (anno, giorni, stagioni, fasi lunari, cronache ✅;
  ⏳ calendario *culturale* inventato dai popoli, conteggio generazioni, "ere" che si danno un nome).

---

## PRIORITÀ 9 — CATEGORIE DELLA CIVILTÀ (società, cultura, mente)

### 9.1 ECONOMIA avanzata  ⏳ (oggi: baratto ✅, denaro ✅, proprietà privata 🔨)
- Debiti, credito, inflazione, risparmio (aggancio al tratto `pazienza`), assicurazioni, tasse,
  salario, proprietà collettiva vs privata (norma emergente c'è), schiavitù, lavoro volontario.

### 9.2 LOGISTICA  🔨 (= 0.B.10) MAGAZZINI/scorte comuni ✅ (i granai raccolgono le eccedenze e
  sfamano chi ha bisogno). ⏳ catena di approvvigionamento, carovane, convogli, rotte.

### 9.3 DIRITTO emergente  ✅ (base)  Nessuna legge scritta: **norme** da conseguenze osservate.
  I testimoni di un torto decidono se punire (onestà + ira + norma + rancore − empatia); ogni pena
  o impunità sposta la norma condivisa; chi assiste a una pena sviluppa deterrenza. Crimine, pena,
  giudizio collettivo e processo emergono. ⏳ matrimonio/eredità formali, giudice come ruolo.

### 9.4 CLASSI SOCIALI  ✅ (base)  Ceti come FOTOGRAFIA della disuguaglianza (ricchezza + casa +
  prestigio): nobili / agiati / poveri / servi, più un indice di disuguaglianza. Nessuna casta
  scritta. ⏳ mobilità sociale esplicita, stranieri come status.

### 9.5 CULTURA espressiva  ✅ (base)  Opere emergenti (canto, danza, pittura, racconto, rito,
  scultura, festa) dai tratti dell'artista; il pubblico ne trae gioia e coesione; le forme che
  radunano gente diventano TRADIZIONI. ⏳ simboli/bandiere/abbigliamento come marcatori identitari.

### 9.6 LINGUA completa  🔨 (base: `npc.lingua` continua ✅) → fonetica, grammatica, parole per
  concetto, famiglie linguistiche che si diramano ad albero.

### 9.7 SCIENZA come metodo  🔨 (livelli ipotesi→esperimento→teoria ✅ · esperimenti guidati ✅ ·
  maestri ✅) → ⏳ dimostrazione, accademia come edificio, riproducibilità formale.

### 9.8 EDUCAZIONE  ✅ (base)  MAESTRI e APPRENDISTI: un anziano esperto trasmette il suo sapere ai
  giovani vicini (se parlano la stessa lingua), più in fretta se è paziente e l'allievo sveglio.
  Il sapere non si teletrasporta e i vecchi hanno valore. ⏳ libri (sapere che sopravvive alla morte).

### 9.9 MEMORIA della civiltà  ✅ (base)  Alla morte di qualcuno di NOTEVOLE nasce un MITO: eroe,
  maestro venerato, inventore leggendario, tiranno sanguinario, malfattore. Chi resta ne è
  ispirato (speranza/ambizione) o spaventato. La maggior parte dei morti viene dimenticata.

### 9.10 ESPLORAZIONE strutturata  ✅ (base)  SPEDIZIONI: i curiosi e coraggiosi partono verso
  l'ignoto, scoprono la mappa e tornano (guadagnando la reputazione di esploratore). Rischioso:
  chi si ammala o resta senza cibo abbandona. ⏳ mappe condivise, navigatori, rotte marittime.

### 9.11 PSICOLOGIA: bias cognitivi  ✅ (base)
- I bias distorcono la PERCEZIONE con cui si decide. CABLATI: `imitazione`+`tribalismo` → adozione
  memi (l'odio attecchisce sui xenofobi); `autorità` → adesione religiosa (fiducia nel profeta);
  `sicumera` del leader → guerre che non converrebbero (errore di valutazione); `sunkcost`+
  `cambiamento` → resistenza a emigrare (si resta anche quando converrebbe partire).
- ⏳ `conferma` (non abbandonare le proprie idee), `disponibilità` (sovrastima del recente).

### 9.12 LEADERSHIP: archetipi  ✅  `f.archetipo` letto dai pesi-motivazione + tratti del leader:
  dittatore / stratega / visionario / burocrate / demagogo / riformatore. Non è un ruolo scelto:
  è chi È quella persona. Lo stesso trono produce storie diversissime.

### 9.13 INFORMAZIONE e manipolazione  ✅ (base)  propaganda/capro espiatorio ✅ + VOCI: le notizie
  passano di bocca in bocca e si deformano; chi è disonesto ne INVENTA di false (calunnie); si
  crede secondo i bias (autorità, imitazione, poca intelligenza). L'informazione falsa si
  diffonde e rovina reputazioni reali. ⏳ censura, spionaggio.

### 9.14 GUERRA avanzata  🔨 (livelli 1-2 ✅) — L1 razzie di confine + L2 TATTICA: un leader capace
  (`intelligenza/ambizione`) organizza attacchi COORDINATI concentrati sul centro nemico (assalto
  alla capitale), più forti; il morale (`lealtà`) logora i difensori; nascono i veterani.
  ⏳ L3-4: rifornimenti/logistica, spie, assedi, diplomazia/trattati, prigionieri, dottrine.

### 9.15 RELIGIONE avanzata  ✅ (base)  nascita/diffusione/rifiuto ✅ + PROFETI (il fondatore) ed
  ERESIE/SCISMI ✅: le fedi si ramificano in sette derivate. ⏳ santi, testi sacri, pellegrinaggi,
  dogmi/tabù espliciti, guerre di religione dichiarate.

### 9.16 ARTEFATTI  ✅ (base)  Un'opera eccezionale di un artefice eccezionale diventa un oggetto
  UNICO con nome, creatore, anno e prestigio (`pop.artefatti`), ricordato nelle cronache.
  ⏳ monumenti/tombe sul territorio, trasmissione ereditaria e furto delle reliquie.

### 9.17 EVENTI MONDIALI  ✅ (base)  COMETE (terrore proporzionale all'irrazionalità → religioni),
  ERUZIONI con inverno vulcanico, ERE GLACIALI che raffreddano il mondo per generazioni.
  ⏳ pandemie su scala planetaria, estinzioni di massa, impatti meteoritici.

---

## PRIORITÀ 10 — IL META-LIVELLO: ENTITÀ UNICA + EVOLUZIONE APERTA  ✅ (il salto finale, fatto)

**`src/entities.js`** — il livello più astratto del progetto.

### 10.1 Struttura ENTITÀ unica  ✅
- Una sola struttura per tutto ciò che è culturale: `{id, nome, tipo, attributi, relazioni, origine,
  creatore, anno, diffusione, portatori, affidabilità, prestigio, costo, rischio, beneficioOsservato}`.
- **Indicizzazione**: ciò che già emergeva nei moduli dedicati (fedi, mestieri, norme, moneta,
  tecniche, luoghi, tradizioni) viene RILETTO come entità. I sistemi esistenti continuano a
  funzionare: qui si costruisce il livello comune su cui operare. Verificato: ~110 entità vive.
- **Assi generici** (`ASSI`): coesione, sapere, ricchezza, ordine, forza, morale — più costo e
  rischio. Volutamente astratti: non "cura le malattie" ma dimensioni che QUALUNQUE istituzione
  può toccare. È questa astrazione a rendere possibili le combinazioni impreviste.
- Relazione `discende-da` fra entità: si forma un vero albero genealogico della cultura.

### 10.2 OPEN-ENDED EVOLUTION — emergono le CATEGORIE STESSE  ✅
- Una persona **creativa, intelligente e sazia** (pochissime, come nella realtà) combina DUE entità
  che conosce e ne ottiene una TERZA di **tipo inedito**. Gli assi si compongono (il meglio dei due,
  smorzato, più mutazione), i costi si sommano: un'istituzione pesa più delle parti che la formano.
  Il nome nasce dalle sillabe dei genitori — non lo scegliamo noi.
- **Il motore non sa cosa stia nascendo.** Applica solo gli assi generici e osserva.
- **Selezione culturale**: chi la pratica ne subisce costi e benefici reali; gli altri IMITANO se
  vedono che funziona (secondo il bias di imitazione, il conformismo e il prestigio); se pesa più
  di quanto rende viene abbandonata, e col tempo dimenticata.
- **Ricorsione**: un'entità inventata può diventare genitore di un'altra → istituzioni di secondo
  e terzo grado.

**Verificato in gioco** (16 categorie inventate in ~130 anni, 14 sopravvissute, 2 dimenticate):
| Ciò che è nato | Da | Assomiglia a |
|---|---|---|
| `nornorm` | norma sul furto + norma sulla violenza | un **codice di leggi** |
| `nornnor` | nornorm + norma sulla violenza | un **corpus giuridico** (2° grado!) |
| `inverit` | inventore + rito | un'**accademia** |
| `ventpitt` | religione Ventita + pittura | l'**arte sacra** |
| `ilarvent` | argento-moneta + religione | le **offerte al tempio** |
| `ritnor` | rito + norma sull'ospitalità | il **rito dell'ospitalità** |
| `ilaagri` | ilarvent + agricoltore | la **decima sul raccolto** (3° grado!) |

Nessuno di questi nomi, concetti o meccanismi esiste nel codice: il motore ha solo permesso che
accadessero. È l'obiettivo dichiarato all'inizio — *non programmare la storia, programmare le
regole con cui la storia può nascere* — portato al suo livello estremo: **non emergono solo gli
oggetti e le istituzioni, ma le CATEGORIE stesse della civiltà**.

### 10.3 ELIMINARE le categorie oggetto (affordance totale)  ✅ (con interruttore)
- Parametro **"Categorie scoperte dai popoli"** (gruppo *Regole del gioco*, a destra). Da spento,
  tutto come prima. Da acceso, il motore **smette di dire cosa sia una cosa**: niente più Arma,
  Medicina, Veleno. Restano solo proprietà ed effetti (`profilo()`), ridotti a una **firma
  percettiva** grossolana — quel che un occhio nudo può cogliere. Ogni popolo raggruppa ciò che
  si comporta allo stesso modo e gli dà un **nome inventato proprio**; popoli diversi arrivano a
  confini e parole diverse per le stesse sostanze.
- Verificato: 203 generi battezzati in 33 lessici. Un popolo chiama le cose *Bovori, Zuzise,
  Cobibi*; un altro *Savide, Kigode, Tekume*. Nessuno usa le nostre parole.
- **Completamento (2026-07-24)** — la prima versione era incompleta: spostava i NOMI nella cultura,
  ma il comportamento del motore leggeva ancora le etichette (`categoria.nome === "Arma"`). Col
  flag acceso quei confronti fallivano e la civiltà si bloccava: **0 edifici, 0 strumenti, 0 mezzi**.
- Corretto alla radice con le **AFFORDANZE** (`AFF` in chemistry.js): domande sulle PROPRIETÀ e non
  sui nomi — `nutre`, `cura`, `nuoce`, `taglia`, `regge`, `galleggia`, `rotola`, `vola`, `conduce`,
  `splende`. **Zero confronti sui nomi rimasti in tutto il codice.** Si mangia ciò che nutre, si
  costruisce con ciò che regge, si naviga con ciò che galleggia: vale in qualunque lingua e per
  qualunque popolo. Anche il TIPO di edificio che nasce da una fusione deriva ora dalle proprietà
  (verificato: pietra+erba medica → Infermeria, pietra+grano → Granaio, pietra+selce → Armeria).
- Verificato che a flag acceso e spento la civiltà si comporta allo stesso modo (strumenti, mezzi,
  edifici, conoscenze): cambia solo **chi dà il nome alle cose**.
- **Resta fuori**: gli ANIMALI sono già fatti di proprietà (16 geni, nessuna specie scritta), ma la
  nicchia trofica è fissata alla nascita — un erbivoro resta nella lista degli erbivori anche se
  la sua carnivoria muta. Le quattro liste sono un indice di performance, non una tassonomia, ma
  impediscono il cambio di nicchia per evoluzione. Unificarle in un'unica lista con comportamento
  derivato da `dna.carnivoria` sarebbe il naturale completamento (costo: le griglie spaziali vanno
  ripensate).

## PRIORITÀ 11 — TOGLIERE LE ULTIME CATEGORIE  ✅ (2026-07-24)

> Il seguito naturale del 10.3, applicato a tutto il resto del motore. Regola: **il motore può
> conoscere le PROPRIETÀ** (fisica e biologia: i due livelli di hardcoding ammessi) **e mai le
> CATEGORIE**, che sono modi di guardare, non fatti del mondo.

### 11.1 Un solo tipo di essere vivente  ✅
- Sparite le quattro liste (erbivori, predatori, pesci, predatori marini) e le quattro funzioni di
  comportamento separate. Esiste `pop.creature`: **creature con un DNA**, e un solo comportamento
  che legge i geni a ogni istante.
- Chi mangia chi non è più un'appartenenza ma una **relazione calcolata** (`puoPredare`): serve
  appetito per la carne (`carnivoria`) e un vantaggio di stazza. Ne segue che:
  - la **catena alimentare ha più livelli** e si riorganizza da sola — chi è predatore per uno può
    essere preda per un altro più grande, e basta che le taglie cambino perché i ruoli si ribaltino;
  - contro un altro carnivoro serve un margine di stazza molto maggiore: due pari non si attaccano;
  - l'**onnivoria** non è una categoria a parte, è una carnivoria di mezzo.
- Anche la **velocità** deriva dai geni: piccolo = agile, e chi vive di carne è fatto per lo scatto
  (`0.85 + carnivoria * 0.5`). Senza questo nessun predatore raggiungerebbe una preda in fuga.
  Effetto emergente: **le prede piccole e veloci sfuggono ai predatori grandi** (18.1 contro 16.5).
- `ruoloDi()` resta solo per MOSTRARE qualcosa a chi guarda: è una lettura dei geni fatta a
  posteriori, non un'identità dell'animale.
- **Verificato — la nicchia ora evolve**: partendo da un mondo con *zero* carnivori (carnivoria
  massima 0.341), in 19 anni sono emerse per mutazione creature fino a **0.98** e cacciatori attivi.
  Prima del refactor era impossibile: un erbivoro restava erbivoro per sempre, qualunque cosa
  dicessero i suoi geni.
- **Nota sull'equilibrio**: con popolazioni umane grandi la fauna cala, ma non è un difetto del
  motore — gli umani uccidono **3,8 volte più dei predatori** (1207 contro 319 in un test). È la
  pressione venatoria che decima la megafauna, esattamente com'è accaduto nella storia. La
  ricolonizzazione impedisce che diventi definitiva.

### 11.2 Il terreno ha proprietà, non un tipo  ✅
- Via le tabelle `FOOD_CAP` e `TERRAIN_COST` indicizzate per bioma. Ora `capacitaVitale(w,i)` e
  `faticaTerreno(w,i)` derivano da **calore, umidità, quota e pendenza**: una campana attorno al
  clima mite per il cibo; per la fatica si somma tutto ciò che rende un passo più pesante (salita,
  fango, gelo, sabbia rovente, acquitrino).
- Il bioma sopravvive come **nome e colore** sulla mappa — comodo per l'occhio, ma il mondo non lo
  consulta più. Se il clima cambia, la mappa della fertilità cambia con lui, da sé.

### 11.3 Il mestiere è un confronto, non una soglia  ✅
- Via le soglie assolute scritte a mano (*"almeno 30 insegnamenti"*): un numero che non significa
  nulla in un popolo di dieci persone e troppo poco in uno di mille. Ora un mestiere è **ciò in cui
  spicchi rispetto ai tuoi**: si misura la media delle attività nella popolazione e si prende
  l'attività in cui quell'uomo la supera di più (almeno 2,2 volte).
- Effetto immediato e significativo: **"raccoglitore" è passato da 900 a 4**. Raccogliere è ciò che
  fanno tutti, quindi non distingue nessuno — e infatti non è un mestiere. Emergono invece artisti,
  maestri, inventori, cacciatori, guerrieri, agricoltori, guaritori in proporzioni credibili.

## STATO: LA ROADMAP È COMPLETA ✅
Tutte le priorità 0–10 sono implementate almeno nella loro forma di base e testate su mappe sempre
diverse (seed e % acqua variabili a ogni test). Il progetto ha raggiunto l'obiettivo che si era
dato: un mondo dove **niente è scritto e tutto emerge**, fino alle categorie stesse della civiltà.

Restano solo **rifiniture** ⏳ segnate dentro le singole voci — estensioni di sistemi che già
funzionano, nessuna delle quali è strutturale:
- carovane e logistica a lunga distanza (B.10 / 9.2); il costo esplicito del tempo (B.11)
- economia avanzata: debiti, credito, tasse formalizzate (9.1)
- lingua con parole e famiglie linguistiche (9.6)
- guerra livelli 3-4: dottrine militari che il generale-AI apprende dalle sconfitte (9.14)
- fisica meccanica e chimica reale (8.1 / 8.2), calendario culturale (8.8)
- 10.3: eliminare del tutto le categorie oggetto (🧊 per scelta)

### Moduli del progetto (`src/`)
`world` (terreno, fiumi, paludi) · `climate` (luce, ciclo acqua, meteo, geologia, eventi mondiali) ·
`materials` (proprietà fondamentali, giacimenti, evoluzione piante) · `chemistry` (fisiologia,
affordance, processi, conoscenza) · `genetics` (tratti, bias, outlier) · `species`+`animals` (DNA,
reti alimentari, malattie) · `npc` (bisogni, costi, lavoro, agricoltura, biologia del corpo) ·
`emotions` (sentimenti, invidia, migrazione, norme di ospitalità) · `factions` (grafo sociale,
identità, coesione, territorio) · `culture` (memi, religione, eresie, arte, guerra) · `society`
(trasferimenti, diritto, classi, educazione, miti, voci, artefatti, magazzini) · `economy`
(baratto, moneta) · `buildings` · `fire` · `render` · `main`.

## Note tecniche
- **Prestazioni:** con migliaia di agenti ogni sistema nuovo va O(n) e possibilmente una volta per
  tick (vedi `advance()` in `main.js`, griglie spaziali in `emotions.js`/`animals.js`/`society.js`).
  I sistemi culturali/sociali girano THROTTLATI (ogni ~0.35 anni), non a ogni tick.
- **Predisposto ma non cablato:** attrito/viscosità/temp.fusione/magnetismo/trasparenza dei materiali
  e i geni delle piante esistono nei dati ma incidono ancora poco → cablabili quando servirà
  (Priorità 8.1/8.2).
- Ogni feature deve **emergere** dagli attributi/algoritmi, non essere scritta a mano.

