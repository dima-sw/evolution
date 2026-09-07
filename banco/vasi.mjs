// CHE COSA TIENE UN LIQUIDO, secondo la sola fisica. Nessuno ha dichiarato nessun recipiente:
// si guarda solo se sta in piedi, se non beve, e se si può cavare.
const B = "../src/";
const { defaultMaterials } = await import(B + "materials.js");
const { tieneLiquidi, stato } = await import(B + "matter.js");
const T = +(process.env.CALORE || 0.5);
const righe = defaultMaterials().map((m) => ({ nome: m.nome, v: tieneLiquidi(m.props, T), st: stato(m.props, T) }));
righe.sort((a, b) => b.v - a.v);
const tengono = righe.filter((r) => r.v > 0.25);
console.log("a temperatura " + T + " — su " + righe.length + " materie, ne tengono un liquido " + tengono.length + ":");
for (const r of tengono) console.log("  " + r.nome.padEnd(16) + r.v.toFixed(2));
console.log("\nle prime che NON ce la fanno:");
for (const r of righe.filter((r) => r.v <= 0.25).slice(0, 8)) console.log("  " + r.nome.padEnd(16) + r.v.toFixed(2) + "  (" + r.st + ")");
