// ORGANISMI EMERGENTI — niente specie fisse. Ogni animale ha un DNA numerico che ne
// definisce la forma. Scatter casuale + SELEZIONE termica + MUTAZIONE alla nascita ->
// dopo migliaia d'anni emergono forme diverse per ogni seed (prede piccole e veloci,
// predatori grandi e letali...), senza che siano state scritte «Leone» o «Renna».
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Crea un DNA. `tempLocale` inclina il clima ideale verso dove nasce (parte già vitale,
// poi diverge con la mutazione). `ruolo` fissa la nicchia trofica (erbivoro/carnivoro).
export function makeDNA(rng, tempLocale, ruolo, aquatic) {
  let carnivoria;
  if (ruolo === "carnivoro") carnivoria = 0.65 + rng() * 0.35;
  else if (ruolo === "erbivoro") carnivoria = rng() * rng() * 0.35; // bias basso
  else carnivoria = 0.4 + rng() * 0.25; // onnivoro
  return {
    taglia: clamp01(0.2 + rng() * 0.6),
    tempIdeale: clamp01(tempLocale + (rng() - 0.5) * 0.25),
    tolleranza: 0.18 + rng() * 0.25,
    aggressivita: rng(),
    carnivoria,
    prolificita: 0.35 + rng() * 0.6,
    // Nuovi geni: forma sensi/difesa/indole. Emergono e si selezionano come gli altri.
    vista: rng(), olfatto: rng(), socialita: rng(), territorialita: rng(),
    veleno: rng() * rng(), corazza: rng() * rng(), mimetismo: rng() * rng(),
    intelligenza: rng() * 0.7, domesticabilita: rng(),
    aquatic: !!aquatic,
  };
}

// Eredità con MUTAZIONE (±5% circa) su OGNI gene, carnivoria compresa: la nicchia trofica NON è
// fissata alla nascita del mondo. Un discendente di erbivori può, di deriva in deriva, diventare
// predatore — e nessuno ha scritto quando debba succedere.
export function childDNA(dna, rng) {
  const mut = (k, amp = 0.1) => clamp01((dna[k] || 0) + (rng() - 0.5) * amp);
  return {
    taglia: mut("taglia"), tempIdeale: mut("tempIdeale"), tolleranza: mut("tolleranza"),
    aggressivita: mut("aggressivita"), carnivoria: mut("carnivoria"), prolificita: mut("prolificita"),
    vista: mut("vista"), olfatto: mut("olfatto"), socialita: mut("socialita"), territorialita: mut("territorialita"),
    veleno: mut("veleno"), corazza: mut("corazza"), mimetismo: mut("mimetismo"),
    intelligenza: mut("intelligenza"), domesticabilita: mut("domesticabilita"),
    aquatic: dna.aquatic,
  };
}

// Colore emergente: la tinta viene dalla dieta, la luminosità dalla taglia.
export function dnaColor(dna) {
  const hue = dna.carnivoria > 0.6 ? 8 : dna.carnivoria < 0.4 ? 42 : 28; // rosso / beige / bruno
  const light = dna.aquatic ? 55 : 62 - dna.taglia * 22;
  const sat = dna.aquatic ? 45 : 40;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

// Materiali lasciati alla morte, dedotti dal DNA (più grande = più carne; freddo = pelliccia...).
export function dnaDrops(dna) {
  if (dna.aquatic) return [["Carne", 1, 1 + Math.round(dna.taglia * 2)], ["Squame", 0.5, 1], ["Grasso", dna.taglia * 0.5, 1]];
  const d = [["Carne", 1, 1 + Math.round(dna.taglia * 3)], ["Pelle", 0.6, 1], ["Osso", 0.5, 1]];
  if (dna.tempIdeale < 0.4) { d.push(["Pelliccia", 0.7, 1 + (dna.taglia > 0.6 ? 1 : 0)]); if ((dna.corazza || 0) < 0.3) d.push(["Lana", 0.5, 1]); }
  if (dna.taglia > 0.7) { d.push(["Grasso", 0.6, 1]); d.push(["Avorio", 0.1, 1]); }
  if ((dna.corazza || 0) > 0.45) d.push(["Corno", 0.5, 1]); // gli animali corazzati/cornuti danno corno
  if (dna.taglia > 0.45) d.push(["Tendine", 0.4, 1]);
  return d;
}

// Etichetta descrittiva (per statistiche): forma emergente, non un nome di specie.
export function dnaLabel(dna) {
  const t = dna.taglia > 0.66 ? "grande" : dna.taglia < 0.4 ? "piccolo" : "medio";
  const diet = dna.carnivoria > 0.6 ? "predatore" : dna.carnivoria < 0.4 ? "erbivoro" : "onnivoro";
  return `${diet} ${t}`;
}
