# CONTENUTI — inventario di tutto ciò che è hardcodato

> *I conteggi qui sotto sono stati riverificati contro il codice: erano invecchiati quasi tutti
> (i materiali erano 46 e non 23, i tratti 23 e non 18, i processi 14 e non 9). Un registro
> stantìo è peggio di nessun registro — se li si tocca ancora, si ricontino.*

Questo documento cataloga **le "cose" seed** del simulatore: i dati fissi da cui poi TUTTO emerge.
Serve a decidere *cosa aggiungere come contenuto* (non come funzionalità).

> **Distinzione chiave.**
> - **CONTENUTO (cose)** = tabelle di dati espandibili senza toccare la logica. Aggiungere righe qui
>   fa emergere nuove storie *gratis*. È ciò che l'utente può moltiplicare a piacere.
> - **LEGGE (algoritmo)** = come le cose interagiscono. NON è contenuto: è il motore. Va toccata solo
>   per cambiare *come* funziona il mondo, non *cosa* contiene.
>
> Regola d'oro del progetto: il DB contiene le **leggi del mondo**, non gli oggetti. Le tabelle qui
> sotto sono il minimo indispensabile di "materia prima" da cui il resto si autogenera.

---

## 1. BIOMI — `src/world.js` (`BIOME`, `BIOME_COLOR`, `BIOME_NAME`)  → 13
`DEEP_WATER, WATER, SHALLOW, BEACH, DESERT, GRASS, FOREST, JUNGLE, TUNDRA, SNOW, ROCK, MOUNTAIN, SWAMP`
- Per ognuno: colore RGB + nome. La *classificazione* in bioma (da quota/temp/umidità) è LEGGE,
  e vive in due posti che devono restare d'accordo: la generazione del mondo e `biomaDi()`, che
  riclassifica un posto quando la terra si muove davvero (frana, faglia, cono che cresce).
- Tabelle collegate per bioma (in `src/npc.js`): `FOOD_CAP` (cibo max) e `TERRAIN_COST` (fatica).
- **Espandibile:** mangrovie, savana, taiga, barriera corallina, coni vulcanici.
  *(La palude c'è già come bioma vero — non è più solo il flag `stagnant`.)*

## 2. PROPRIETÀ FONDAMENTALI DEI MATERIALI — `src/materials.js` (`PROPS`)  → 29
Fisiche: `durezza, peso(densità), elasticita, fragilita, taglio, conducibilita, galleggiamento,
portanza, attrito, porosita, viscosita, tempFusione, magnetismo, trasparenza`
Chimiche: `energiaChim, reattivita, acidita, volatilita`
Biologiche: `nutriente, digeribilita, tossicita, bioattivo`
Strutturali: `legame, stabilizzante, acquosita`
Nicchia (solo per ciò che è vivo): `caldoIdeale, acquaIdeale, adattabilita` · Pregio: `valore`
- **Espandibile:** solubilità, radioattività, elasticità termica, conducibilità elettrica…
  Ogni nuova proprietà apre nuove affordance possibili. *(Porosità, acidità, magnetismo,
  trasparenza e temperatura di fusione erano in questo elenco come «da aggiungere»: ci sono.)*
- **Una nota che vale la pena tenere:** `porosita` esiste ma è a **zero su tutte le materie di
  partenza** — nessuno l'ha mai impostata. Le cose fabbricate la ereditano dalle miscele, quindi
  per quelle conta; sulle materie grezze non dice ancora niente. È contenuto che manca, non legge.

## 3. MATERIALI — `src/materials.js` (`defaultMaterials`)  → 46
Minerali/pietre/metalli: `Legno, Pietra, Selce, Rame, Ferro, Carbone, Oro, Sabbia, Argilla, Zolfo, Sale`
Piante (rinnovabili): `Erba medica, Belladonna, Grano, Miele, Lino`
Da animale: `Carne, Pelle, Osso, Pelliccia, Grasso, Avorio, Squame`
- Ogni materiale = nome, descrizione, rarità, ambiente (terra/acqua), colore, `props{}` (le 16 sopra).
- Rarità (`RARITY`): `comune, frequente, raro, rarissimo` (quanti giacimenti, ampiezza, picco).
- **Il più espandibile del progetto.** Aggiungere: Stagno, Piombo, Argento, Mercurio, Diamante,
  Marmo, Petrolio, Ambra, Cotone, Canapa, Uva, Olivo, Tabacco, Caffè, Cacao, Papavero, Aloe,
  Salnitro, Calcare, Gesso, Quarzo, Ossidiana, Bambù, Gomma, Seta, Lana (manca!), Latte, Uova…
  Ogni riga nuova = nuove ricette/medicine/veleni/leghe emergenti senza scrivere codice.

## 4. PROCESSI DI LAVORAZIONE — `src/chemistry.js` (`PROCESSES`)  → 14
`grezzo, macinare, cuocere, essiccare, fermentare, fondere, martellare, filare, pressare`
- Ognuno = come trasforma gli attributi (la trasformazione è LEGGE; l'elenco è contenuto).
- **Espandibile:** distillare, affumicare, salare, conciare, tessere, temperare, saldare, intrecciare,
  soffiare (vetro), tornire, macerare, essudare…

## 5. AFFORDANCE / CATEGORIE — `src/chemistry.js` (`CATS`)  → 11 (+ "grezzo")
`Esplosivo, Veleno, Medicina, Cibo, Arma, Conduttore, Imbarcazione, Velivolo, Veicolo terrestre,
Struttura, Ornamento`
- Sono le INTERPRETAZIONI che gli esseri viventi danno a una miscela (score da proprietà = LEGGE).
- **Espandibile:** Corda/Tessuto, Contenitore, Colla/Adesivo, Colorante, Combustibile, Sapone,
  Vetro, Ceramica, Carta, Strumento musicale, Lente, Moneta coniata…

## 6. TIPI DI EDIFICIO — `src/chemistry.js` (`BUILDINGS`) + effetti in `src/buildings.js`  → 10
`Armeria, Infermeria, Granaio, Tempio, Officina, Porto, Rimessa, Hangar, Laboratorio, Arsenale`
- Nascono fondendo una Struttura + una funzione; ognuno dà un effetto d'area (`cura, cibo, morale,
  difesa, ingegno, riparo`…). L'effetto è LEGGE, l'elenco tipi è contenuto.
- **Espandibile:** Mercato, Scuola/Biblioteca, Fucina, Mulino, Pozzo, Muro/Fortezza, Strada lastricata,
  Ponte, Faro, Acquedotto, Teatro, Palazzo del potere…

## 7. TRATTI DI PERSONALITÀ (geni) — `src/genetics.js` (`TRATTI`)  → 23
`forza, intelligenza, coraggio, aggressivita, curiosita, resistenza, empatia, onesta, lealta,
ambizione, invidia, avidita, ira, pigrizia, superbia, gola, conformismo, volonta`
+ pigmentazione/adattamento: `melanina, tint, resFreddo, resCaldo`
- **Espandibile:** pazienza, carisma (ora derivato), creatività, spiritualità, crudeltà, prudenza,
  socievolezza, disciplina, vanità… (ogni tratto è un nuovo asse di comportamento).

## 8. MOTIVAZIONI (funzione obiettivo) — `src/npc.js` (`this.motiv`)  → 8
`sopravvivenza, ricchezza, potere, conoscenza, fama, appartenenza, vendetta, compassione`
- Pesi derivati dai tratti; guidano *cosa* massimizza ogni individuo. **Espandibile:** piacere,
  libertà, spiritualità, giustizia, bellezza, dovere…

## 9. EMOZIONI — `src/emotions.js` (`EMOTIONS`)  → 10
`gioia, soddisfazione, speranza, fiducia, gratitudine, lealta, paura, tristezza, rabbia, invidia`
- **Espandibile:** disgusto, sorpresa, vergogna, orgoglio, nostalgia, gelosia…

## 10. BISOGNI — `src/npc.js` (campi dell'NPC)  → 5 espliciti
`fame, sete, stanchezza, riparo, salute` (+ interni: `_sofferenza, malcontento, _massa`)
- **Espandibile:** igiene, socialità, temperatura corporea, svago (già suggeriti in TODO 0.B).

## 11. DNA ANIMALE — `src/species.js` (`makeDNA`)  → 16 geni
`taglia, tempIdeale, tolleranza, aggressivita, carnivoria, prolificita, aquatic`
- Ruoli trofici: `erbivoro / carnivoro / onnivoro`. Tipi: `erbivoro, predatore, pesce, predmarino`.
- Materiali lasciati alla morte (`dnaDrops`): `Carne, Squame, Grasso, Pelle, Osso, Pelliccia, Avorio`.
- **NON ci sono specie hardcodate** (niente "Leone"/"Renna"): emergono dal DNA. Espandibile invece:
  altri geni (velenosità, corazza, mimetismo, gregarietà, volo), tipi (uccelli, insetti, rettili),
  nicchie (spazzini dedicati, filtratori).

## 12. STAGIONI — `src/npc.js`  → 4
`Primavera, Estate, Autunno, Inverno` (moltiplicatori di crescita/pioggia = LEGGE).

## 13. CULTURA — vari file
- **DNA culturale fazione** (`src/factions.js` `cultura`): `aggressivita, empatia, avidita, ambizione,
  invidia, onesta`. **Espandibile** ai valori del TODO 0.9 (militarismo, spiritualità, apertura,
  commercio, innovazione, tradizionalismo…).
- **Classi di fazione** (`src/factions.js`): `tribù < villaggio < città < regno < impero` (soglie).
- **Domini dei memi** (`src/culture.js`): `aspetto` (pelle chiara/olivastra/scura) · `materiale`.
  **Espandibile:** origine geografica, lingua, religione, mestiere come bersagli di AMA/ODIA.
- **Nomi religioni** (`src/culture.js` `relName`): sillabe generate (contenuto minimo).
- **Mestieri emergenti** (`src/npc.js` `updateMestiere`): `costruttore, agricoltore, inventore,
  guaritore, cacciatore, raccoglitore` (etichette; il ruolo emerge dalle azioni).

## 14. MALATTIE — `src/animals.js`
- Nascono dalle miscele pericolose e dall'acqua stagnante; i parametri (contagio/mortalità/cura)
  **emergono** dagli attributi. Solo i default di `seedOutbreak` e dell'acqua stagnante sono fissi.

---

## Riepilogo "quanto contenuto c'è" (per capire dove è magro)
> **Aggiornato 2026-07-23** (espansione dai suggerimenti di ChatGPT). Tra parentesi il valore di prima.
| Tabella                        | Ora  | Note |
|--------------------------------|------|------|
| Materiali                      | 46 (23) | +Stagno,Argento,Piombo,Mercurio,Salnitro,Calcare,Marmo,Quarzo,Ossidiana,Diamante,Gesso,Petrolio,Uva,Papavero,Aloe,Cotone,Canapa,Bambù,Olio,Tabacco,Lana,Corno,Tendine |
| Proprietà dei materiali        | 29 (16) | +attrito,porosità,viscosità,temp.fusione,magnetismo,trasparenza,acidità,volatilità,digeribilità,acquosità,caldoIdeale,acquaIdeale,adattabilità |
| Processi                       | 14 (9)  | +distillare,affumicare,conciare,temperare,soffiare |
| Categorie/affordance           | 17 (11) | +Fibra,Vetro,Acido,Colla,Colorante,Combustibile |
| Tipi di edificio               | 16 (10) | +Filanda,Vetreria,Bottega d'arte,Fornace,Alchimia,Cantiere |
| Biomi                          | 13 (12) | +Palude (bioma vero, era solo un flag) |
| Tratti di personalità          | 23 (18) | +pazienza,creatività,socievolezza,crudeltà,spiritualità |
| Bias cognitivi (nuova tabella) | 8    | conferma,cambiamento,imitazione,autorità,disponibilità,sicumera,sunk-cost,tribalismo |
| Motivazioni                    | 8    | |
| Emozioni                       | 10   | |
| Bisogni                        | 5    | |
| Geni animali                   | 16 (7) | +vista,olfatto,socialità,territorialità,veleno,corazza,mimetismo,intelligenza,domesticabilità |
| Geni piante (nuovo)            | 8    | crescita,radici,dispersione,resFreddo,resCaldo,produttività,tossicità,durataVita |
| Valori del DNA culturale       | 6    | il TODO 0.9 ne prevede ~11 |

**NB:** alcuni assi (attrito, viscosità, magnetismo, trasparenza, geni delle piante) sono "cose" già
presenti nei dati ma con effetti ancora parziali — verranno cablati alle leggi mano a mano (TODO
8.1/8.2). I geni animali sensoriali e i bias cognitivi invece sono ora CABLATI e attivi.
Belladonna cotta→Medicina, Sabbia soffiata→Vetro, Salnitro+Zolfo+Carbone→Esplosivo: le nuove
combinazioni emergono già in gioco.

## Tabelle aggiunte con i sistemi finali (2026-07-23)
| Tabella | Voci | Dove |
|---|---|---|
| Gruppi nutritivi (dieta) | 5 — proteine, carboidrati, grassi, vitamine, minerali | `npc.js` (derivati dalle proprietà) |
| Forme d'arte | 7 — canto, danza, pittura, racconto, rito, scultura, festa | `culture.js` FORME |
| Archetipi di leader | 6 — dittatore, stratega, visionario, burocrate, demagogo, riformatore | `factions.js` |
| Valori del DNA culturale storico | 6 — militarismo, spiritualità, commercio, prudenza, innovazione, tradizionalismo | `factions.js` |
| Ceti sociali | 4 — nobili, agiati, poveri, servi | `society.js` |
| Norme sociali | 3 — furto, violenza, ospitalità | `society.js` |
| Tipi di mito | eroe, maestro venerato, inventore leggendario, tiranno, malfattore | `society.js` |
| Eventi geologici/celesti | terremoto, frana, eruzione, grandine, siccità, era glaciale, cometa, eclissi | `climate.js` |

Tutte queste tabelle sono **etichette di lettura** di fenomeni emergenti (il motore non "esegue" un
archetipo o un ceto: li riconosce a posteriori dai numeri), quindi allungarle è sicuro.

**Priorità di espansione suggerite:** (1) MATERIALI — moltiplicano tutto; (2) PROPRIETÀ fondamentali
— sbloccano affordance nuove; (3) PROCESSI e CATEGORIE — nuovi modi d'uso; (4) BIOMI reali per
paludi/savana. Tutto il resto (specie, memi, mestieri, malattie, religioni) è già **emergente** e non
richiede di aggiungere "cose", solo eventualmente nuovi *assi* (geni/tratti/valori).
