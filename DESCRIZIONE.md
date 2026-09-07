# Evolution — la descrizione delle origini

> **Questo documento è invecchiato, ed è tenuto perché racconta com'era il progetto all'inizio.**
> La descrizione corrente, con i diagrammi di ogni pezzo e le misure, è **`DOCUMENTAZIONE.md`**.
> Qui sotto restano corretti i conteggi e le poche cose che dicevano il falso (l'AI non «manca»:
> c'è da un pezzo), ma la struttura resta quella di allora: i 23 materiali sono diventati 46, i 14
> attributi 29, e metà di quello che oggi emerge da sé allora era ancora tutto da scrivere.

Simulatore 2D di **civiltà emergente**. Non c'è un obiettivo: si osserva come il mondo evolve.
Il principio guida è uno solo: **il database contiene le LEGGI del mondo, non gli oggetti del mondo.**
Quasi nulla è scritto a mano — tecnologie, medicine, veleni, mezzi, edifici, epidemie, culture e
conflitti **emergono** dall'interazione tra risorse limitate, attributi dei materiali, algoritmi e sentimenti.

Come si avvia: apri `index.html` tramite un server locale (`node server.js`, poi http://localhost:5188).
Non serve build: è JavaScript puro con moduli ES. Premi **▶ Avvia** e guarda.

---

## 1. Il mondo (`world.js`)
Una matrice di 320×320 tile generata con **rumore frattale** (simplex + fBm) da un **seed** (🎲 casuale o testuale).
Ogni tile ha: **altitudine, temperatura, umidità, tipo (acqua/terra), bioma**.
- La percentuale d'acqua è una manopola (il livello del mare è quel percentile delle altitudini).
- Continenti naturali centrati (i bordi tendono all'oceano).
- Temperatura per **latitudine** (poli freddi, equatore caldo) + quota.
- 13 biomi: oceano profondo, mare, acque basse, spiaggia, deserto, prateria, foresta, giungla, tundra, nevi, roccia, montagna, palude.
- *(E il paesaggio non è più fermo: terremoti, frane ed eruzioni spostano la quota, e quando un tile
  passa il livello del mare diventa un'altra cosa — decisa dal clima di adesso, non da com'era.)*
- Viste della mappa: **Biomi, Altitudine, Temperatura, Regioni** (pigmentazione attesa della popolazione).

## 2. Materiali (`materials.js`)
**46 materiali**, ognuno con **29 attributi** (0..1). E una differenza di sostanza rispetto ad allora:
non esistono più gli attributi «veleno», «cura» e «nutrimento» — l'effetto sul corpo non è un dato,
si **deduce** da tossicità, bioattivo, nutriente e digeribilità (`physiology()` in `chemistry.js`).
Lo stesso composto è medicina o veleno secondo la dose. Il **legame** è la coesione: alza molto la
stabilità delle miscele.
- **Minerali/pietre**: Pietra, Selce, Rame, Ferro, Carbone, Oro, Argilla, Zolfo, Sabbia. Si **esauriscono** estraendoli.
- **Piante (rinnovabili, ricrescono)**: Legno, Erba medica, Belladonna, Grano, Miele, Lino, Sale.
- **Da animale (solo dalle prede, niente giacimenti)**: Carne, Pelle, Osso, Pelliccia, Grasso, Avorio, Squame.
- Sono distribuiti nel mondo in **giacimenti concentrati** (non a caso): il rame vicino ai monti, ecc.
- Dal menu **+ Aggiungi** puoi creare nuovi materiali (nome, rarità, ambiente, colore, attributi): il sistema decide da solo *dove* concentrarli.

## 3. Chimica emergente (`chemistry.js`) — il cuore
**Non esistono ricette.** Combini materiali (con quantità) nel **Laboratorio** e tutto emerge dagli attributi:
- **Composizione** = media pesata degli attributi → determina la **categoria** (indipendente dalla quantità).
- **Potenza** cresce col numero di materiali mescolati ("più miscugli = più potenza").
- **Stabilità** = 1 − instabilità. Cala con energia, fragilità, potenza e **conflitto cura↔veleno**; sale con **legame** e stabilizzanti.
- Se la stabilità è bassa: **esplode / si rompe / avvelena / non funziona**.
- **Categorie emergenti** (da soglie sugli attributi, non da un elenco): ⚔️ Arma, 🧪 Veleno, 💊 Medicina,
  🍞 Cibo, 💥 Esplosivo, ⚡ Conduttore, 🧱 Struttura, 💎 Ornamento, e i **mezzi**: ⛵ Imbarcazione (galleggiamento),
  🎈 Velivolo (portanza + leggerezza), 🛒 Veicolo terrestre.
- Ogni invenzione ha un **nome generato** dalle sillabe dei materiali usati (es. Legno×2+Miele×1 → "Legnmi"); combinazioni identiche → stesso nome (deduplicate).

Esempi reali (tutti emergenti): Ferro+Carbone → Arma stabile 99% (**l'acciaio**); Erba+Belladonna → Veleno instabile;
+ Miele → torna Medicina stabile; Legno → Imbarcazione; Lino → Velivolo; Pietra+Legno → Veicolo terrestre.

### Conoscenze con affidabilità
Ogni miscela provata entra nel **database delle conoscenze** del popolo con un **verdetto** (utile/pericoloso)
e un'**affidabilità %** che cresce con le prove. La scienza emerge: la belladonna, dopo molte prove, converge a "pericoloso ~90%".

## 4. Gli NPC (`npc.js`) — vita guidata da leggi, non da un'AI
Ogni essere ha: **posizione, sesso, età, genetica**, bisogni (**fame, stanchezza, salute**),
**tratti** (forza, intelligenza, coraggio, aggressività, curiosità, resistenza al caldo/freddo) e **sentimenti** (§6).
- **Comportamento guidato dal bisogno del momento**: se malato → si cura con una medicina affidabile; se affamato → mangia
  cibo noto / foraggia / caccia; se sereno → raccoglie e (se è un **inventore**) sperimenta.
- **Non tutti inventano**: solo gli NPC molto curiosi+intelligenti sperimentano cose nuove; gli altri **usano il sapere comune**.
- **Genetica e regioni**: la pigmentazione dei fondatori nasce dal clima del luogo di nascita (**caldo→scuro, freddo→chiaro;
  ovest→rosso, est→giallo**); i figli ereditano una **combinazione** (media + mutazione). Adattamento climatico → pressione selettiva.
- **Riproduzione** legata al benessere; **morte** per fame, malattia, vecchiaia.

## 5. Ecosistema (`animals.js`, `species.js`) — catena alimentare senza tetti
**Nessun tetto di popolazione**: l'equilibrio emerge dal cibo.
- **12 specie legate ai biomi** (prateria: gazzella/bisonte/leone; foresta: cervo/lupo/orso; giungla: tapiro/giaguaro;
  tundra: renna; mare: sardina/tonno/merluzzo/squalo per profondità).
- **Catena terrestre**: vegetazione → erbivori → predatori → **uomo** (caccia).
  **Catena marina**: plancton (ricco sotto costa) → pesci → predatori marini → **uomo** (pesca dalla riva).
- Retroazione reale: più erbivori → meno vegetazione → meno nascite/più morti; più predatori → meno erbivori → predatori affamati. **Cicli predatore-preda**.
- Alla morte per mano dell'uomo, ogni animale lascia **materiali** (carne + pelle, ossa, pelliccia, avorio, grasso, squame) secondo la specie.
- Prestazioni: **griglia spaziale** per la ricerca delle prede (gestisce migliaia di animali fluidamente).

### Malattie ed epidemie
- Un'epidemia può nascere **da sola** da un esperimento **dannoso** (veleno/esplosione a contatto): probabilità ∝ pericolosità;
  **mortalità, contagiosità, incubazione e difficoltà di cura** derivano dagli attributi della miscela che l'ha causata.
- Si diffonde per prossimità; chi guarisce diventa **immune** (curva epidemica SIR). Pulsante **☣ Epidemia** per innescarla a mano.

## 6. Sentimenti e società (`emotions.js`)
Ogni NPC ha **10 emozioni**: gioia, soddisfazione, speranza, fiducia, gratitudine, lealtà, paura, tristezza, rabbia, invidia.
- Variano in base a ciò che **vive**: sazietà/salute → gioia; minacce → paura; affollamento/fame → rabbia/invidia; ecc.
- **Memoria delle relazioni**: ricorda chi lo ha aiutato (+gratitudine) o danneggiato (−rancore) → basi per alleanze e vendette.
- **Interazioni sociali**: chi sta bene **condivide** cibo con un affamato (nasce gratitudine); chi è arrabbiato e ribelle **aggredisce** (nasce rancore).
- **Ribellione emergente**: un **malcontento** cronico (rabbia + sofferenza prolungata − gioia − lealtà) fa scattare lo stato **ribelle**
  (migra lontano, non collabora, può aggredire). Nulla dice "ribellati": è **conseguenza** delle condizioni. Verificato: sotto carestia compaiono ribelli e aggressioni.

## 7. Edifici / istituzioni (`buildings.js`) — fusione di invenzioni
Gli NPC inventori possono **fondere due invenzioni note** in un **edificio**, se una è una **Struttura** e l'altra ha una funzione.
Il tipo emerge dalla funzione (non è hardcodato quale coppia): Struttura + Arma → **Armeria**, + Medicina → **Infermeria**,
+ Cibo → **Granaio**, + Ornamento → **Tempio**, + Conduttore → **Officina**, + Imbarcazione → **Porto**, ecc.
Ogni edificio dà un **effetto d'area** agli NPC vicini: il Granaio fa crescere la vegetazione intorno, l'Infermeria cura,
il Tempio alza morale e lealtà, l'Armeria riduce la paura. Verificato: gli NPC hanno auto-costruito Granaio, Armeria, Infermeria, Rimessa.

## 8. Interfaccia
Pannello laterale: **Mondo** (seed, % acqua, viste), **Materiali** (+ giacimenti sulla mappa), **Laboratorio** (sperimenta),
**Popolazione** (avvia/pausa/passo, velocità, statistiche), **Ecosistema** (fauna, epidemie), **Società & sentimenti**
(ribelli, malcontento, emozioni medie, aiuti/aggressioni, edifici), **Conoscenze** (invenzioni con affidabilità), **Legenda**.
Sulla mappa: umani (colore = pelle), animali (colore per specie), edifici (quadrati), e anelli per infetti/immuni/ribelli.

---

## L'AI — che allora mancava, e adesso c'è
Quello che qui sotto era il «prossimo e ultimo passo» è stato fatto, ed è cresciuto oltre il piano:
- un **LLM impersona il capo** di ogni popolo grande, con l'indole letta dai suoi tratti veri;
- gli ordini sono **influenza, non comandi** — i bisogni vitali vincono sempre;
- e non c'è nessuna lista di ordini possibili: il capo può ordinare **qualunque parola**, e chi la
  riceve la interpreta come può. Il senso si assesta a maggioranza fra i primi che la sentono, e se
  ha portato male si sfalda. Anche le **cariche** si possono inventare.
- La **moneta** non è più un'ipotesi: emerge da sé, come il materiale più accettato negli scambi.

Provider LLM nel `.env` (Groq, Gemini, Mistral, DeepSeek, Cohere, OpenRouter, Ollama…) con failover.
Per come funziona davvero, vedi `DOCUMENTAZIONE.md` §6.

## File del progetto
`index.html`, `styles.css`, `server.js` · `src/`: `rng.js`, `noise.js`, `world.js`, `materials.js`,
`chemistry.js`, `genetics.js`, `species.js`, `animals.js`, `emotions.js`, `buildings.js`, `npc.js`,
`render.js`, `main.js` — e, aggiunti dopo: `matter.js`, `climate.js`, `fire.js`, `experience.js`,
`desire.js`, `skill.js`, `tempra.js`, `factions.js`, `coorti.js`, `society.js`, `culture.js`,
`economy.js`, `entities.js`, `orders.js`, `ai.js`, `params.js`. Più `banco/`, le sonde di misura.
