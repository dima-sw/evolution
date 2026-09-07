import { corri } from "./sim.mjs";
for (const t of [300, 600, 900]) {
  const { pop } = await corri("scala", 58, t);
  const vive = pop.creature.filter((a) => a.vivo).length;
  const vivi = pop.npcs.filter((n) => n.vivo).length;
  console.log("tick " + t + " · gente " + vivi + " · array creature " + pop.creature.length +
    " · vive " + vive + " · CADAVERI " + (pop.creature.length - vive) +
    " (" + ((pop.creature.length - vive) * 100 / Math.max(1, pop.creature.length)).toFixed(1) + "%)");
}
