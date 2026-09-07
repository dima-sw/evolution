// Gli anelli devono trovare ESATTAMENTE quelli che trovava la scansione a riquadro. Si confronta
// la vecchia versione (riscritta qui) con la nuova su ventimila bestie sparse a caso.
const GRID_CELL = 12;
function vecchioNearest(grid, x, y, R, ok) {
  const R2 = R * R, cx = (x / GRID_CELL) | 0, cy = (y / GRID_CELL) | 0, span = Math.ceil(R / GRID_CELL);
  let best = null, bd = R2;
  for (let gy = cy - span; gy <= cy + span; gy++) for (let gx = cx - span; gx <= cx + span; gx++) {
    const arr = grid.get(gx + "," + gy); if (!arr) continue;
    for (const o of arr) { if (!o.vivo || (ok && !ok(o))) continue;
      const d2 = (o.x - x) ** 2 + (o.y - y) ** 2; if (d2 < bd) { bd = d2; best = o; } }
  }
  return best ? { a: best, d2: bd } : null;
}
function nuovoNearest(grid, x, y, R, ok) {
  const R2 = R * R, cx = (x / GRID_CELL) | 0, cy = (y / GRID_CELL) | 0, span = Math.ceil(R / GRID_CELL);
  let best = null, bd = R2;
  for (let r = 0; r <= span; r++) {
    if (best) { const mf = (r - 1) * GRID_CELL; if (mf > 0 && mf * mf >= bd) break; }
    for (let gy = cy - r; gy <= cy + r; gy++) for (let gx = cx - r; gx <= cx + r; gx++) {
      if (r > 0 && Math.abs(gx - cx) !== r && Math.abs(gy - cy) !== r) continue;
      const arr = grid.get(gx + "," + gy); if (!arr) continue;
      for (const o of arr) { if (!o.vivo || (ok && !ok(o))) continue;
        const d2 = (o.x - x) ** 2 + (o.y - y) ** 2; if (d2 < bd) { bd = d2; best = o; } }
    }
  }
  return best ? { a: best, d2: bd } : null;
}
function vecchioVicini(grid, x, y, r, quanti) {
  const out = []; const cx = (x / GRID_CELL) | 0, cy = (y / GRID_CELL) | 0, span = Math.ceil(r / GRID_CELL);
  for (let gy = cy - span; gy <= cy + span; gy++) for (let gx = cx - span; gx <= cx + span; gx++) {
    const arr = grid.get(gx + "," + gy); if (!arr) continue;
    for (const o of arr) { if (!o.vivo || o.dna.carnivoria < 0.35) continue;
      const d2 = (o.x - x) ** 2 + (o.y - y) ** 2; if (d2 > r * r) continue; out.push({ a: o, d2 }); }
  }
  out.sort((p, q) => p.d2 - q.d2); return out.slice(0, quanti);
}
function nuovoVicini(grid, x, y, r, quanti) {
  const out = []; const R2 = r * r, cx = (x / GRID_CELL) | 0, cy = (y / GRID_CELL) | 0, span = Math.ceil(r / GRID_CELL);
  for (let anello = 0; anello <= span; anello++) {
    if (out.length >= quanti) { const mf = (anello - 1) * GRID_CELL; if (mf > 0 && mf * mf >= out[out.length - 1].d2) break; }
    for (let gy = cy - anello; gy <= cy + anello; gy++) for (let gx = cx - anello; gx <= cx + anello; gx++) {
      if (anello > 0 && Math.abs(gx - cx) !== anello && Math.abs(gy - cy) !== anello) continue;
      const arr = grid.get(gx + "," + gy); if (!arr) continue;
      for (const o of arr) { if (!o.vivo || o.dna.carnivoria < 0.35) continue;
        const d2 = (o.x - x) ** 2 + (o.y - y) ** 2; if (d2 > R2) continue;
        if (out.length >= quanti && d2 >= out[out.length - 1].d2) continue;
        let j = out.length < quanti ? out.length : quanti - 1;
        while (j > 0 && out[j - 1].d2 > d2) { out[j] = out[j - 1]; j--; }
        out[j] = { a: o, d2 }; if (out.length > quanti) out.length = quanti;
      }
    }
  }
  return out;
}

let sd = 12345; const rnd = () => (sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
for (const [N, MAPPA, nome] of [[20000, 320, "calca"], [400, 320, "rado"], [20000, 60, "pigia pigia"]]) {
  const list = [];
  for (let i = 0; i < N; i++) list.push({ x: rnd() * MAPPA, y: rnd() * MAPPA, vivo: rnd() > 0.05, dna: { carnivoria: rnd() } });
  const grid = new Map();
  for (const o of list) { if (!o.vivo) continue; const k = ((o.x / GRID_CELL) | 0) + "," + ((o.y / GRID_CELL) | 0);
    let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(o); }
  let diffN = 0, diffV = 0, cronoV = 0, cronoN = 0, cV = 0, cN = 0;
  const T = () => Number(process.hrtime.bigint());
  for (let t = 0; t < 3000; t++) {
    const x = rnd() * MAPPA, y = rnd() * MAPPA, R = 6 + rnd() * 20;
    const ok = (o) => o.dna.carnivoria < 0.5;
    let a0 = T(); const v1 = vecchioNearest(grid, x, y, R, ok); cronoV += T() - a0;
    a0 = T(); const n1 = nuovoNearest(grid, x, y, R, ok); cronoN += T() - a0;
    if ((v1 ? v1.d2.toFixed(6) : "-") !== (n1 ? n1.d2.toFixed(6) : "-")) diffN++;
    a0 = T(); const v2 = vecchioVicini(grid, x, y, R, 3); cV += T() - a0;
    a0 = T(); const n2 = nuovoVicini(grid, x, y, R, 3); cN += T() - a0;
    if (v2.length !== n2.length || v2.some((e, i) => e.d2.toFixed(6) !== n2[i].d2.toFixed(6))) diffV++;
  }
  console.log(nome.padEnd(12) + " N=" + N + " mappa=" + MAPPA +
    " | nearest: differenze=" + diffN + " tempo " + (cronoV / 1e6).toFixed(0) + "ms -> " + (cronoN / 1e6).toFixed(0) + "ms (x" + (cronoV / cronoN).toFixed(1) + ")" +
    " | vicini: differenze=" + diffV + " tempo " + (cV / 1e6).toFixed(0) + "ms -> " + (cN / 1e6).toFixed(0) + "ms (x" + (cV / cN).toFixed(1) + ")");
}
