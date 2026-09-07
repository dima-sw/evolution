# Evolution

Un simulatore 2D di civiltà emergente. JavaScript puro, Canvas, nessuna dipendenza da installare.

```bash
node server.js       # poi apri http://localhost:5188
```

## La regola

**Niente categorie, solo proprietà.** Il motore può conoscere le leggi di quattro livelli — fisica,
biologia, psicologia, informazione — ma non le cose che da quelle leggi emergono. Non esiste una
"spada", una "religione", un "fabbro": esistono materiali con durezza e densità, persone con paura e
memoria, e quello che ne viene fuori.

La domanda che decide se una riga può essere scritta:

> *Sto descrivendo qualcosa che sarebbe vero anche se nessuno l'avesse mai pensato?*

Se sì, è una legge e si può scrivere. Se no, è una categoria e va resa **possibile**, non inserita.

## Che cosa emerge

Mestieri, popoli e confini, lingue che divergono fino all'incomprensione, norme che nascono da chi
punisce e si sfaldano se nessuno lo fa, miti attorno ai morti notevoli, voci vere e false che
rovinano reputazioni, ceti, carestie, guerre, servitù che cresce quando il cibo scarseggia.

E i nomi. Con `affordanceTotale` — acceso di default — il motore smette di dire *che cosa* sia una
cosa: ogni popolo raggruppa ciò che incontra come lo percepisce lui, e lo battezza con una parola
sua. Misurato: dei 24 generi incontrati da più popoli, **24 su 24** hanno ricevuto nomi diversi da
ognuno. Il pannello dei mestieri non dice «agricoltore ×39»: dice `Maniko ×17 · Zununa ×16 ·
Rupedi ×12 …`, e nessuno di quei nomi sta nel codice.

## Riproducibilità

Lo stesso seme dà lo stesso mondo, fino all'ultima cifra decimale — è il presupposto di ogni misura.
`banco/` contiene una trentina di sonde che lo verificano e misurano il resto.

```bash
node banco/riproducibile.mjs                              # stesso seme ⇒ stesso mondo
node banco/multiseme.mjs ../src "uno,due,tre" 420         # l'impronta di più partite
node banco/scala.mjs                                      # come cresce il costo con la gente
node --allow-natives-syntax banco/forme.mjs               # quante forme nascoste ha la gente
```

Il criterio per accettare un'ottimizzazione è uno solo: **l'impronta del mondo non si muove**. Non
"popolazione simile" — identica, somma per somma.

## I documenti

| file | cosa contiene |
|---|---|
| `DESCRIZIONE.md` | che cos'è e perché |
| `DOCUMENTAZIONE.md` | come funziona, con i diagrammi |
| `PRESTAZIONI.md` | dove va il tempo, che cosa è stato provato e che cosa ha fallito |
| `STATO.md` | a che punto è |
| `CONTENUTI.md` | i registri: materiali, proprietà, processi, tratti |
| `TODO*.md` | quel che manca |

`PRESTAZIONI.md` è scritto per essere dato in pasto a un'altra AI: contiene le misure, i vicoli
ciechi già percorsi, e gli errori di metodo in cui sono cascato.

## Le chiavi

`src/ai.js` può far pensare i capi con un LLM. I provider si configurano in un `.env` — copia
`.env.example` e riempilo. Senza chiavi il simulatore gira lo stesso: l'AI è uno strato in più,
non il motore.
