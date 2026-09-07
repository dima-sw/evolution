// I DUE PUNTI DELLA FAME CHE IL CORPO CONOSCE, e sono gli unici due che esistano davvero.
// Sotto FAME_RECUPERO la salute si rimette; sopra FAME_DANNO il corpo comincia a consumarsi. In
// mezzo c'e' chi non sta morendo ma non si sta nemmeno rimettendo — ed e' li' che uno diventa
// disponibile a subire pur di mangiare.
//
// Stanno FUORI da `P` apposta: non sono manopole da girare, sono come e' fatto il corpo. E hanno
// un nome perche' ALTRE leggi devono poterli chiedere invece di reinventarne di propri — la
// sottomissione in `society.js` chiedeva `fame > 0.7`, un numero che non corrispondeva a niente,
// e per questo non scattava mai.
export const FAME_RECUPERO = 0.5;
export const FAME_DANNO = 1.0;

// ═══ PARAMETRI DEL MONDO ═════════════════════════════════════════════════════════════════════
// Le "manopole" della simulazione, raccolte in un unico posto invece che sparse come costanti nei
// moduli. Ogni voce ha un valore corrente (P), un valore PREDEFINITO BILANCIATO (DEF, la taratura
// verificata sui test) e una descrizione di cosa cambia davvero.
//
// NB: questi sono i coefficienti delle LEGGI del mondo (quanto in fretta si ha fame, quanto costa
// salire una montagna, quanto è probabile un terremoto). NON sono comportamenti: cambiare un
// numero qui non aggiunge una regola, sposta un equilibrio — e il resto emerge da sé.

export const P = {
  // — TEMPO E RITMO —
  giorniPerAnno: 2, etaRate: 0.6, cultDt: 0.35,
  // — CLIMA E CICLO DELL'ACQUA —
  evaporazione: 0.16, sogliaPioggia: 0.55, durataPioggia: 0.4, siccitaRate: 0.06,
  ventoDeriva: 0.6, cenereDecay: 0.06,
  // — GEOLOGIA E CATASTROFI (probabilità per anno simulato) —
  probTerremoto: 0.012, probFrana: 0.05, probEruzione: 0.006, probGrandine: 0.25,
  probCometa: 0.004, probGlaciazione: 0.0015, probEclissi: 0.05,
  probAlluvione: 0.05, probTempesta: 0.03, probFulmine: 0.4,
  // — VEGETAZIONE E SUOLO —
  vegRegen: 0.02, planktonRegen: 0.03, fertDegrado: 0.05, fertRecupero: 0.012, aridimento: 0.006,
  inquinDecay: 0.015, rivaFertile: 1.6, malusSalino: 0.45,
  stagPrimavera: 1.1, stagEstate: 1.35, stagAutunno: 0.8, stagInverno: 0.25,
  // — BISOGNI DEGLI ESSERI UMANI —
  fameRate: 0.06, seteRate: 0.05, stanchezzaRate: 0.03, riparoRate: 0.05,
  dannoFame: 0.05, dannoSete: 0.05, dannoSfinimento: 0.5, dannoClima: 0.12,
  recuperoSalute: 0.02, longevitaBase: 60, longevitaGeni: 30,
  // — NUTRIZIONE E CORPO —
  consumoNutrienti: 0.012, sogliaCarenza: 0.12, dannoCarenza: 0.03,
  immunitaDecay: 0.004, immunitaCrescita: 0.03, gestazione: 0.5, costoParto: 0.07,
  etaFertileMin: 15, etaFertileMax: 45, cooldownFiglio: 3,
  // — MOVIMENTO E COSTI —
  velocitaBase: 2.2, velocitaForza: 1.5, costoMovimento: 0.004, pesoRallenta: 0.08,
  costoDislivello: 22, sentieroSconto: 0.55, sentieroCrescita: 0.012, sentieroDecay: 0.015,
  bonusCarro: 0.45, bonusBarca: 1.7,
  // — FAUNA —
  faunaFameBase: 0.03, faunaFameTaglia: 0.045, faunaProlificita: 1.0, faunaSelezione: 0.35,
  carcasseDecay: 0.4, ricolonizzazione: 0.06, tettoFauna: 80000,
  // — SOCIETÀ ED EMOZIONI —
  sogliaRibellione: 0.72, sogliaLealta: 0.3, sofferenzaRate: 0.15,
  probAiuto: 0.06, probBaratto: 0.10, probInsegnamento: 0.12, probOspitalita: 0.08,
  raggioSociale: 10, sogliaMigrazione: 0.6, pressioneSpazio: 0.09,
  // — GRUPPI E POTERE —
  minCluster: 8, portataGoverno: 42, portataIntelligenza: 34, spanControlBase: 55,
  spanControlIntelligenza: 200, inerziaLeader: 2.2, raggioLegame: 7,
  cerchiaBase: 10, cerchiaTesta: 14, cerchiaIndole: 10,
  usuraCase: 0.012, capienzaPerPezzo: 2.5, turniFauna: 4,
  // — CULTURA —
  probMeme: 0.06, diffusioneMemi: 4, probReligione: 0.5, diffusioneFede: 4,
  probEresia: 0.25, probArte: 0.05, derivaLingua: 0.004, sogliaIncomprensione: 0.15,
  // — GUERRA —
  sogliaOstilita: 0.6, intensitaRazzia: 3, pesoRancore: 0.5, pesoOdio: 1.4,
  // — CONOSCENZA —
  probEsperimento: 0.02, probGuidato: 0.35, sogliaInventore: 1.25, probFusione: 0.01,
  provePerTeoria: 10, inerziaVerdetto: 1.6,
  // — ISTITUZIONI —
  probTributo: 1.0, probDono: 0.5, probNorma: 0.4, sogliaPunizione: 0.25,
  probCoercizione: 0.35, probEducazione: 0.5, probVoce: 0.015, probArtefatto: 0.15,
  // — AI DEI LEADER —
  aiSogliaStato: 25, aiIntervallo: 6, aiParallele: 2, aiTemperatura: 0.55,
  aiCostoAttacco: 0.45, aiCostoMigrazione: 0.35, aiPesoLealta: 0.45, aiPesoPaura: 0.25,
  // — REGOLE DEL GIOCO —
  // ACCESO DI DEFAULT, e non per gusto: misurato (`banco/affordanza.mjs`, stesso seme, stessa
  // partita). Il mondo regge (1 252 vivi contro 1 283, 142 morti contro 152: lo stesso mondo entro
  // il rumore), costa MENO (32,2 contro 37,0 ms — cercare un genere gia' percepito in una mappa e'
  // piu' economico che dare un punteggio a tutte le categorie note), e soprattutto la divergenza e'
  // vera: dei 24 generi incontrati da piu' popoli, 24 su 24 hanno ricevuto nomi DIVERSI da ognuno.
  // Zero convergenze. Una stessa materia risponde a otto nomi a seconda di chi la incontra.
  // Metterlo a 0 riporta il motore a dire lui che cosa sia una cosa.
  affordanceTotale: 1, tempraSpenta: 0,
  // — LIMITI TECNICI —
  tettoPopolazione: 20000,
};

// Copia immutabile dei valori predefiniti (la taratura bilanciata verificata sui test).
export const DEF = Object.freeze({ ...P });

// Descrizione dei gruppi per l'interfaccia.
// [chiave, etichetta, min, max, passo, "cosa cambia"]
export const SCHEMA = [
  { id: "tempo", nome: "Tempo e ritmo", icona: "⏳", voci: [
    ["giorniPerAnno", "Cicli giorno/notte per anno", 0.5, 24, 0.5, "Quante albe passano in un anno simulato. Basso = giorni lunghi e ben visibili; alto = il mondo lampeggia e resta in penombra media."],
    ["etaRate", "Velocità invecchiamento", 0.1, 2, 0.05, "Quanto in fretta invecchiano gli esseri viventi."],
    ["cultDt", "Passo culturale", 0.1, 2, 0.05, "Ogni quanto girano cultura, società e AI (più basso = più reattivo ma pesante)."],
  ]},
  { id: "clima", nome: "Clima e acqua", icona: "🌦", voci: [
    ["evaporazione", "Evaporazione", 0.02, 0.6, 0.01, "Quanta acqua sale in cielo: alimenta le piogge."],
    ["sogliaPioggia", "Soglia di pioggia", 0.2, 0.95, 0.01, "Quanto deve saturarsi l'aria prima di piovere."],
    ["durataPioggia", "Durata delle piogge", 0.1, 2, 0.05, "Per quanto continua a piovere una volta iniziato."],
    ["siccitaRate", "Velocità della siccità", 0, 0.3, 0.005, "Quanto in fretta la terra si secca senza pioggia."],
    ["ventoDeriva", "Instabilità del vento", 0, 2, 0.05, "Quanto rapidamente cambia il vento."],
    ["cenereDecay", "Ricaduta della cenere", 0.01, 0.3, 0.01, "Quanto dura l'inverno vulcanico dopo un'eruzione."],
  ]},
  { id: "catastrofi", nome: "Geologia e catastrofi", icona: "🌋", voci: [
    ["probTerremoto", "Terremoti", 0, 0.2, 0.002, "Fanno crollare le case e lasciano la gente senza riparo."],
    ["probEruzione", "Eruzioni vulcaniche", 0, 0.1, 0.001, "Cenere che raffredda il mondo, ma suolo fertilissimo dopo."],
    ["probFrana", "Frane", 0, 0.3, 0.005, "Travolgono chi vive sui pendii dopo le piogge."],
    ["probGrandine", "Grandinate", 0, 1, 0.02, "Devastano i campi coltivati."],
    ["probAlluvione", "Alluvioni", 0, 0.3, 0.005, "I fiumi straripano su chi vive sulle rive."],
    ["probTempesta", "Tempeste di mare", 0, 0.3, 0.005, "Colpiscono gli insediamenti sulla costa aperta."],
    ["probCometa", "Comete", 0, 0.05, 0.001, "Terrorizzano chi non sa spiegarle: possono far nascere religioni."],
    ["probEclissi", "Eclissi", 0, 0.4, 0.01, "Il sole si oscura a mezzogiorno: evento saliente."],
    ["probGlaciazione", "Ere glaciali", 0, 0.02, 0.0005, "Raffreddamento lungo che stringe la fascia abitabile."],
    ["probFulmine", "Fulmini (incendi)", 0, 2, 0.05, "Innescano incendi naturali d'estate."],
  ]},
  { id: "suolo", nome: "Vegetazione e suolo", icona: "🌱", voci: [
    ["vegRegen", "Ricrescita vegetazione", 0.002, 0.1, 0.002, "Quanto in fretta il cibo selvatico si rigenera."],
    ["planktonRegen", "Ricrescita plancton", 0.002, 0.15, 0.002, "Il cibo dei pesci: regola la pesca."],
    ["fertDegrado", "Degrado del suolo", 0, 0.3, 0.005, "Quanto si impoverisce la terra sfruttata: motore dell'espansione."],
    ["aridimento", "Aridimento del suolo", 0, 0.05, 0.001, "Quanto in fretta un terreno tenuto spoglio perde l'acqua che tratteneva (e quanto in fretta la riprende se la vegetazione torna). A zero, il paesaggio non cambia mai."],
    ["fertRecupero", "Recupero del suolo", 0, 0.1, 0.002, "Quanto in fretta un campo a riposo torna fertile."],
    ["rivaFertile", "Fertilità delle rive", 1, 3, 0.05, "Quanto valgono di più le terre lungo i fiumi."],
    ["malusSalino", "Malus salino costiero", 0.1, 1, 0.05, "Quanto il mare rovina i raccolti sulla costa (più basso = peggio)."],
    ["inquinDecay", "Smaltimento inquinamento", 0.001, 0.1, 0.002, "Quanto durano le cicatrici sul territorio."],
    ["stagInverno", "Crescita d'inverno", 0, 1, 0.05, "Quanto è duro l'inverno per la vegetazione."],
    ["stagEstate", "Crescita d'estate", 0.5, 2.5, 0.05, "Quanto è generosa l'estate."],
  ]},
  { id: "bisogni", nome: "Bisogni e sopravvivenza", icona: "🍖", voci: [
    ["fameRate", "Velocità della fame", 0.01, 0.25, 0.005, "Quanto in fretta si ha fame."],
    ["seteRate", "Velocità della sete", 0.01, 0.25, 0.005, "Quanto in fretta si ha sete."],
    ["stanchezzaRate", "Velocità della stanchezza", 0.005, 0.15, 0.005, "Quanto presto serve dormire."],
    ["riparoRate", "Bisogno di riparo", 0.005, 0.2, 0.005, "Quanto in fretta ci si sente esposti al clima."],
    ["dannoFame", "Danno da fame", 0, 0.2, 0.005, "Quanto uccide la fame estrema."],
    ["dannoSete", "Danno da sete", 0, 0.2, 0.005, "Quanto uccide la sete estrema."],
    ["dannoClima", "Danno da clima", 0, 0.5, 0.01, "Quanto fa male vivere in un clima ostile senza riparo."],
    ["recuperoSalute", "Recupero della salute", 0, 0.1, 0.002, "Quanto in fretta si guarisce mangiando."],
    ["longevitaBase", "Longevità base", 20, 120, 1, "Anni di vita prima della vecchiaia."],
  ]},
  { id: "corpo", nome: "Corpo e riproduzione", icona: "🩺", voci: [
    ["consumoNutrienti", "Consumo dei nutrienti", 0.002, 0.06, 0.002, "Quanto in fretta servono cibi diversi (dieta varia)."],
    ["sogliaCarenza", "Soglia di carenza", 0, 0.5, 0.01, "Sotto quale livello un nutriente manca davvero."],
    ["dannoCarenza", "Danno da carenza", 0, 0.2, 0.005, "Quanto fa male una dieta monotona."],
    ["immunitaCrescita", "Crescita dell'immunità", 0, 0.1, 0.002, "Quanto rafforzano le difese la buona salute e il cibo vario."],
    ["gestazione", "Durata della gestazione", 0.1, 3, 0.05, "Quanto dura una gravidanza."],
    ["costoParto", "Rischio del parto", 0, 0.5, 0.01, "Quanta salute costa partorire."],
    ["cooldownFiglio", "Attesa fra i figli", 0, 15, 0.5, "Quanto tempo passa prima di un altro concepimento."],
    ["etaFertileMin", "Età fertile minima", 8, 30, 1, "Da che età si può avere figli."],
    ["etaFertileMax", "Età fertile massima", 30, 80, 1, "Fino a che età si può avere figli."],
  ]},
  { id: "movimento", nome: "Movimento e fatica", icona: "🥾", voci: [
    ["velocitaBase", "Velocità base", 0.5, 8, 0.1, "Quanto si cammina in fretta."],
    ["costoMovimento", "Costo del movimento", 0, 0.02, 0.001, "Quanta fame/sete/stanchezza costa spostarsi."],
    ["costoDislivello", "Costo del dislivello", 0, 60, 1, "Quanto pesa salire: rende le montagne barriere vere."],
    ["pesoRallenta", "Effetto del carico", 0, 0.3, 0.01, "Quanto il peso trasportato rallenta."],
    ["sentieroSconto", "Vantaggio dei sentieri", 0.2, 1, 0.05, "Quanto si risparmia su un sentiero battuto."],
    ["sentieroCrescita", "Formazione dei sentieri", 0, 0.06, 0.002, "Quanto in fretta il passaggio crea una strada."],
    ["bonusCarro", "Vantaggio dei veicoli", 0.2, 1, 0.05, "Quanto costa meno viaggiare con un carro."],
    ["bonusBarca", "Velocità in barca", 1, 4, 0.1, "Quanto si va più veloci sull'acqua."],
  ]},
  { id: "fauna", nome: "Fauna ed ecosistema", icona: "🦌", voci: [
    ["faunaFameBase", "Fame degli animali", 0.005, 0.15, 0.005, "Quanto in fretta gli animali hanno bisogno di mangiare."],
    ["faunaProlificita", "Prolificità della fauna", 0.1, 3, 0.05, "Quanti piccoli nascono."],
    ["faunaSelezione", "Selezione climatica", 0, 1.5, 0.05, "Quanto uccide vivere nel clima sbagliato (guida l'evoluzione)."],
    ["carcasseDecay", "Durata delle carogne", 0.05, 2, 0.05, "Per quanto gli spazzini possono nutrirsi dei morti."],
    ["ricolonizzazione", "Ricolonizzazione", 0, 0.4, 0.01, "Quanto facilmente una specie quasi estinta torna."],
  ]},
  { id: "societa", nome: "Società ed emozioni", icona: "🫂", voci: [
    ["sogliaRibellione", "Soglia di ribellione", 0.3, 1, 0.02, "Quanto malcontento serve per ribellarsi."],
    ["sofferenzaRate", "Accumulo di sofferenza", 0, 0.5, 0.01, "Quanto logora la privazione prolungata."],
    ["probAiuto", "Frequenza degli aiuti", 0, 0.3, 0.01, "Quanto spesso ci si soccorre a vicenda."],
    ["probBaratto", "Frequenza degli scambi", 0, 0.4, 0.01, "Quanto si commercia."],
    ["probInsegnamento", "Trasmissione del sapere", 0, 0.4, 0.01, "Quanto si insegna per contatto."],
    ["probOspitalita", "Richieste di ospitalità", 0, 0.3, 0.01, "Quanto spesso si chiede riparo altrui (nascono le norme)."],
    ["sogliaMigrazione", "Spinta a emigrare", 0.2, 1, 0.02, "Quanta pressione serve per partire e fondare altrove."],
    ["raggioSociale", "Raggio sociale", 4, 24, 1, "Entro che distanza ci si considera vicini."],
  ]},
  { id: "potere", nome: "Gruppi e potere", icona: "👑", voci: [
    ["minCluster", "Minimo per fare gruppo", 3, 40, 1, "Quante persone servono per formare un popolo."],
    ["portataGoverno", "Portata del governo", 10, 200, 5, "Fin dove arrivano gli ordini del capo (distanza)."],
    ["spanControlBase", "Persone governabili", 10, 400, 5, "Quante persone un capo tiene insieme: sotto questo limite gli imperi si spezzano."],
    ["inerziaLeader", "Inerzia del potere", 0, 6, 0.1, "Quanto è difficile spodestare chi già comanda."],
    ["raggioLegame", "Raggio dei legami", 3, 20, 1, "Entro che distanza due persone fanno parte dello stesso gruppo."],
    ["usuraCase", "Quanto in fretta torna polvere", 0, 0.06, 0.002, "Quanto presto una casa si sfa se nessuno la cura. Quanto resista dipende poi da com'è fatta: la pietra dura, la paglia no. È il pezzo che fa costare la ricchezza invece di lasciarla accumulare."],
    ["turniFauna", "A quanti turni vanno le bestie", 1, 6, 1, "In quante fette si divide il lavoro delle bestie. Chi tocca il turno riceve il tempo di tutti: per quello che si accumula è identico, ma la REATTIVITÀ si perde — una bestia si accorge del predatore fino a tre battiti dopo. Misurato a 3 000 persone: mettendolo a 2 la fauna cresce del 13% e i predatori del 77%, ma l'intero battito costa quasi il doppio (303 → 548 ms); a 1 costa sei volte tanto. Su mondi piccoli il prezzo è molto più basso: valutalo lì."],
    ["capienzaPerPezzo", "Quanto liquido tiene un pezzo", 0.5, 8, 0.5, "Quanto liquido riesce a trattenere una cosa che, per fisica, un liquido lo tiene. QUALI cose siano non è scritto da nessuna parte: dipende da porosità, fusione, durezza e fragilità. Senza niente che lo tenga, un liquido si versa per strada."],
    ["cerchiaBase", "Cerchia — quanta ne tiene chiunque", 4, 60, 1, "Quante persone alla volta riesce a tenere in mente anche il più sciocco e schivo. I più vicini vengono prima."],
    ["cerchiaTesta", "Cerchia — quanto aggiunge la testa", 0, 60, 1, "Quante facce in più regge chi è sveglio."],
    ["cerchiaIndole", "Cerchia — quanto aggiunge la socievolezza", 0, 60, 1, "Quante facce in più regge chi cerca gente."],
  ]},
  { id: "cultura", nome: "Cultura e religione", icona: "🎭", voci: [
    ["probMeme", "Nascita dei memi", 0, 0.4, 0.01, "Quanto spesso nascono nuove convinzioni collettive."],
    ["diffusioneMemi", "Diffusione dei memi", 0.5, 12, 0.5, "Quanto in fretta si propagano le idee."],
    ["probReligione", "Nascita di religioni", 0, 1, 0.05, "Quanto facilmente un evento saliente genera una fede."],
    ["diffusioneFede", "Diffusione della fede", 0.5, 12, 0.5, "Quanto in fretta si convertono le persone."],
    ["probEresia", "Scismi ed eresie", 0, 1, 0.02, "Quanto spesso le religioni si dividono."],
    ["probArte", "Creazione artistica", 0, 0.3, 0.005, "Quanto spesso nascono opere, riti e feste."],
    ["derivaLingua", "Deriva linguistica", 0, 0.03, 0.001, "Quanto in fretta le lingue divergono nell'isolamento."],
    ["sogliaIncomprensione", "Soglia d'incomprensione", 0.02, 0.6, 0.01, "Quanto devono divergere due lingue perché non ci si capisca."],
  ]},
  { id: "guerra", nome: "Guerra e conflitto", icona: "⚔️", voci: [
    ["sogliaOstilita", "Soglia di guerra", 0.2, 1.2, 0.02, "Quanta ostilità serve perché scoppi il conflitto."],
    ["intensitaRazzia", "Intensità degli scontri", 0.2, 10, 0.2, "Quanto sono violente le razzie."],
    ["pesoOdio", "Peso dell'odio", 0, 3, 0.1, "Quanto i pregiudizi spingono alla guerra."],
    ["pesoRancore", "Peso della vendetta", 0, 2, 0.05, "Quanto pesano i torti subiti in passato."],
  ]},
  { id: "conoscenza", nome: "Scoperte e conoscenza", icona: "💡", voci: [
    ["probEsperimento", "Frequenza degli esperimenti", 0, 0.15, 0.005, "Quanto spesso gli inventori provano cose nuove."],
    ["probGuidato", "Esperimenti guidati", 0, 1, 0.05, "Quanto spesso si parte da una scoperta nota invece che dal caso."],
    ["sogliaInventore", "Soglia dell'inventore", 0.5, 2, 0.05, "Quanto talento serve per essere un inventore."],
    ["probFusione", "Costruzione di edifici", 0, 0.1, 0.002, "Quanto spesso si fondono invenzioni in istituzioni."],
    ["provePerTeoria", "Prove per una teoria", 3, 40, 1, "Quante conferme servono perché un sapere sia solido."],
    ["inerziaVerdetto", "Inerzia delle credenze", 1, 5, 0.1, "Quanto è difficile ricredersi (genera le false credenze)."],
  ]},
  { id: "istituzioni", nome: "Istituzioni emergenti", icona: "⚖️", voci: [
    ["probTributo", "Pretese dei capi", 0, 3, 0.05, "Quanto spesso i potenti pretendono risorse (tributi, estorsioni)."],
    ["probDono", "Generosità", 0, 2, 0.05, "Quanto spesso si dona a chi non ha nulla."],
    ["probNorma", "Frequenza dei giudizi", 0, 1.5, 0.05, "Quanto spesso i torti vengono giudicati."],
    ["sogliaPunizione", "Severità", 0, 1, 0.02, "Quanto facilmente i testimoni condannano (più basso = più severi)."],
    ["probCoercizione", "Sottomissione", 0, 1.5, 0.05, "Quanto spesso i forti sottomettono i deboli."],
    ["probEducazione", "Maestri e apprendisti", 0, 2, 0.05, "Quanto insegnano gli anziani ai giovani."],
    ["probVoce", "Dicerie e calunnie", 0, 0.1, 0.002, "Quanto circolano voci (anche false)."],
    ["probArtefatto", "Nascita di artefatti", 0, 1, 0.02, "Quanto spesso un'opera diventa leggendaria."],
  ]},
  { id: "ai", nome: "Menti al potere (AI)", icona: "🧠", voci: [
    ["aiSogliaStato", "Popolo minimo per un governo", 8, 200, 1, "Quanto deve essere grande un popolo perché il capo cominci a pensare."],
    ["aiIntervallo", "Anni fra le riflessioni", 1, 40, 1, "Ogni quanto un capo prende decisioni (più basso = più chiamate)."],
    ["aiParallele", "Riflessioni in parallelo", 1, 6, 1, "Quante chiamate contemporanee al modello."],
    ["aiTemperatura", "Imprevedibilità", 0, 1.5, 0.05, "Quanto sono creative o erratiche le decisioni."],
    ["aiPesoLealta", "Peso della lealtà", 0, 1.5, 0.05, "Quanto la lealtà spinge a obbedire agli ordini."],
    ["aiPesoPaura", "Peso della paura", 0, 1.5, 0.05, "Quanto il terrore spinge a obbedire."],
    ["aiCostoAttacco", "Riluttanza ad attaccare", 0, 1.5, 0.05, "Quanta autorità serve per mandare la gente a combattere."],
  ]},
  { id: "regole", nome: "Regole del gioco", icona: "🔮", voci: [
    ["affordanceTotale", "Categorie scoperte dai popoli", 0, 1, 1, "Se acceso, il motore smette di dire cosa sia una cosa: niente più Arma, Medicina, Veleno. Restano solo proprietà ed effetti, e OGNI POPOLO raggruppa e battezza a modo suo ciò che incontra — con nomi propri, che nessun altro usa. Il livello estremo dell'emergenza: spegnilo per tornare alle categorie note."],
  ]},
  { id: "limiti", nome: "Limiti tecnici", icona: "⚙️", voci: [
    ["tettoPopolazione", "Salvagente sulla gente", 200, 60000, 500, "NON è una regola del mondo, e adesso non può più diventarlo: vale il più alto fra questo numero e una volta e mezza quanto la terra riesce a nutrire davvero. Serve solo perché il browser non muoia. Il limite vero è la larghezza del mondo — misurato: 192×192 nutre 8 411 persone, 320×320 ne nutre 23 845, 480×480 ne nutre 54 201."],
    ["tettoFauna", "Salvagente sulla fauna", 500, 200000, 1000, "Idem: gli animali si fermano da soli quando hanno brucato tutto. Misurato: in un mondo 320×320 l'equilibrio sta attorno ai 35 000 capi."],
    ]},
];

export function resetParams() { Object.assign(P, DEF); }
export function paramModificati() {
  let n = 0;
  for (const k in DEF) if (P[k] !== DEF[k]) n++;
  return n;
}
