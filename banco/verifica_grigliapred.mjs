// LA GRIGLIA DEI SOLI PREDATORI DÀ LE STESSE RISPOSTE?
// `puoPredare` scarta chiunque abbia carnivoria < 0.35, che è esattamente il criterio con cui la
// griglia è costruita: dovrebbe essere identica, non approssimata. «Dovrebbe» non basta.
const GRID_CELL = 12;

function puoPredare(a, b) {
  if (a === b || !b.vivo || a.dna.aquatic !== b.dna.aquatic) return false;
  if (a.dna.carnivoria < 0.35) return false;
  const margine = b.dna.carnivoria > 0.5 ? 0.45 : (0.55 + a.dna.carnivoria * 0.7);
  return b.dna.taglia < a.dna.taglia * margine;
}
function buildGrid(list, ammesso) {
  const g = new Map();
  for (const o of list) {
    if (!o.vivo || (ammesso && !ammesso(o))) continue;
    const k = ((o.x / GRID_CELL) | 0) + "," + ((o.y / GRID_CELL) | 0);
    let a = g.get(k); if (!a) { a = []; g.set(k, a); } a.push(o);
  }
  return g;
}
function gridNearest(grid, x, y, R, ok) {
  const R2 = R * R, cx = (x / GRID_CELL) | 0, cy = (y / GRID_CELL) | 0, span = Math.ceil(R / GRID_CELL);
  let best = null, bd = R2;
  for (let r = 0; r <= span; r++) {
    if (best) { const mf = (r - 1) * GRID_CELL; if (mf > 0 && mf * mf >= bd) break; }
    for (let gy = cy - r; gy <= cy + r; gy++) for (let gx = cx - r; gx <= cx + r; gx++) {
      if (r > 0 && Math.abs(gx - cx) !== r && Math.abs(gy - cy) !== r) continue;
      const arr = grid.get(gx + "," + gy); if (!arr) continue;
      for (const o of arr) {
        if (!o.vivo || (ok && !ok(o))) continue;
        const d2 = (o.x - x) ** 2 + (o.y - y) ** 2;
        if (d2 < bd) { bd = d2; best = o; }
      }
    }
  }
  return best ? { a: best, d2: bd } : null;
}

let sd = 987654;
const rnd = () => (sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
for (const [N, MAPPA, quota, nome] of [[20000, 320, 0.15, "pochi predatori"],
                                       [20000, 320, 0.60, "molti predatori"],
                                       [20000, 60, 0.15, "pigia pigia"],
                                       [400, 320, 0.15, "rado"]]) {
  const list = [];
  for (let i = 0; i < N; i++) list.push({
    x: rnd() * MAPPA, y: rnd() * MAPPA, vivo: rnd() > 0.05,
    dna: { carnivoria: rnd() < quota ? 0.35 + rnd() * 0.65 : rnd() * 0.35,
           taglia: 0.2 + rnd() * 0.6, aquatic: rnd() < 0.2 },
  });
  const piena = buildGrid(list);
  const pred = buildGrid(list, (o) => o.dna.carnivoria >= 0.35);
  const T = () => Number(process.hrtime.bigint());
  let diff = 0, cp = 0, cq = 0;
  for (let t = 0; t < 4000; t++) {
    const io = list[(rnd() * list.length) | 0];
    const R = 5 + rnd() * 8;
    let a0 = T(); const v = gridNearest(piena, io.x, io.y, R, (o) => puoPredare(o, io)); cp += T() - a0;
    a0 = T(); const n = gridNearest(pred, io.x, io.y, R, (o) => puoPredare(o, io)); cq += T() - a0;
    if ((v ? v.a : null) !== (n ? n.a : null)) diff++;
  }
  console.log(nome.padEnd(18) + "differenze=" + diff +
    "  piena " + (cp / 1e6).toFixed(0) + "ms -> predatori " + (cq / 1e6).toFixed(0) +
    "ms (×" + (cp / Math.max(1, cq)).toFixed(1) + ")");
}
