const SKILL_MAP = { survival: "sur", nature: "nat", investigation: "inv", perception: "prc", animalHandling: "ani", medicine: "med", arcana: "arc" };
export async function runNativeFieldCheck({ actor, skill, dc, flavor, rollMode }) {
  if (!actor?.isOwner && !game.user?.isGM) throw new Error("You do not own the selected Actor.");
  const id = SKILL_MAP[skill] ?? skill;
  const config = { target: Number(dc), flavor, rollMode: rollMode ?? game.settings.get("core", "rollMode") };
  if (actor.rollSkill) return actor.rollSkill(id, config);
  const ability = actor.system.skills?.[id]?.ability ?? "wis";
  if (actor.rollAbilityTest) return actor.rollAbilityTest(ability, config);
  throw new Error("The active D&D Actor does not expose a native skill or ability roll method.");
}
