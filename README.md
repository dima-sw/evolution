# unwritten

A 2D simulator of emergent civilisation. Plain JavaScript, Canvas, nothing to install.

```bash
node server.js       # then open http://localhost:5188
```

## The rule

**No categories, only properties.** The engine may know the laws of four levels — physics, biology,
psychology, information — but never the things that emerge from them. There is no *sword*, no
*religion*, no *blacksmith*: there are materials with hardness and density, people with fear and
memory, and whatever comes of it.

The question that decides whether a line may be written:

> *Am I describing something that would be true even if nobody had ever thought it?*

If yes, it is a law and it can be written. If no, it is a category, and it must be made **possible**
rather than inserted.

## What emerges

Trades, peoples and borders, languages that drift until they stop being mutually intelligible, norms
born from whoever punishes and dissolving when nobody does, myths around the notable dead, true and
false rumours that ruin reputations, classes, famines, wars, servitude that grows when food runs
short.

And the names. With `affordanceTotale` — on by default — the engine stops saying *what a thing is*:
each people groups what it meets the way it perceives it, and christens it with a word of its own.
Measured: of the 24 kinds encountered by more than one people, **24 out of 24** were given different
names by each. The trades panel does not say "farmer ×39"; it says `Maniko ×17 · Zununa ×16 ·
Rupedi ×12 …`, and none of those names — nor the categories they name — exist in the code.

## The two tabs

**Map** — where the world is. **History** — where it came from: 28 figures over 76 quantities
recorded as the game runs, with eras marked on the axis.

For totals that only ever grow (births, battles, subjugations) the charts show the **rate**, not the
total: "1,400 people were born in all" says nothing, "as many are born as die" says everything. Six
figures are not trends but **distributions of right now** — age, hunger, standing, language —
because a mean is not a society: a people with half its members fed and half starving has the same
mean hunger as one where everybody is doing so-so.

It costs 0.2 ms per beat, and while History is open the map is not drawn: opening the tab makes the
simulation *faster*.

## Reproducibility

The same seed gives the same world, down to the last decimal — that is the precondition for every
measurement. `banco/` holds some thirty probes that check it and measure the rest.

```bash
node banco/riproducibile.mjs                              # same seed ⇒ same world
node banco/multiseme.mjs ../src "one,two,three" 420       # the fingerprint of several games
node banco/scala.mjs                                      # how cost grows with population
node --allow-natives-syntax banco/forme.mjs               # how many hidden shapes people have
```

An optimisation is accepted on one criterion only: **the world's fingerprint does not move.** Not
"similar population" — identical, sum by sum. The strongest form of the check rebuilds the engine
*without* the change and compares several seeds against it, because an optimisation can leave one
game untouched and break another.

## The documents

| file | what it holds |
|---|---|
| `DESCRIZIONE.md` | what it is and why |
| `DOCUMENTAZIONE.md` | how it works, with diagrams |
| `PRESTAZIONI.md` | where the time goes, what was tried, and what failed |
| `STATO.md` | where it stands |
| `CONTENUTI.md` | the registers: materials, properties, processes, traits |
| `TODO*.md` | what is missing |

`PRESTAZIONI.md` is written to be handed to another AI: it holds the measurements, the dead ends
already walked, and the methodological mistakes I fell into.

> **A note on language.** The code comments and the documents are in Italian. They are not captions:
> they carry the reasoning behind each law, which is the substance of this project. They are being
> translated into English progressively — this README first.

## Keys

`src/ai.js` can let leaders think with an LLM. Providers are configured in a `.env` — copy
`.env.example` and fill it in. Without keys the simulator runs all the same: the AI is one more
layer, not the engine.
