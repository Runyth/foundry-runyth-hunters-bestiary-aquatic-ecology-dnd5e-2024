import { MODULE_ID, PROVIDER_ID } from "./constants.mjs";
import { localizeContent, localizeKey } from "./localization.mjs";

const ABILITY_SKILLS = { prc: "wis", sur: "wis", ste: "dex", ath: "str", inv: "int", nat: "int", med: "wis", ani: "wis" };
const DND5E_SIZE_KEYS = Object.freeze({
  tiny: "tiny",
  small: "sm",
  sm: "sm",
  medium: "med",
  med: "med",
  large: "lg",
  lg: "lg",
  huge: "huge",
  gargantuan: "grg",
  grg: "grg"
});
const DND5E_TOKEN_SIZES = Object.freeze({ tiny: 0.5, sm: 1, med: 1, lg: 2, huge: 3, grg: 4 });

export function normalizeDnd5eSize(value) {
  const normalized = String(value ?? "").trim().toLocaleLowerCase();
  const key = DND5E_SIZE_KEYS[normalized];
  if (!key) throw new Error(`Unsupported D&D 5e creature size: ${value}`);
  return key;
}
function safeId(value) {
  return String(value).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16).padEnd(16, "0");
}
function parseDamage(formula) {
  const match = /^(\d+)d(\d+)([+-]\d+)?$/.exec(formula.replace(/\s/g, ""));
  if (!match) return { number: 1, denomination: 4, bonus: "", formula };
  return { number: Number(match[1]), denomination: Number(match[2]), bonus: match[3] ?? "", formula };
}

function itemFlags(record, kind) {
  return {
    [MODULE_ID]: { managed: true, providerId: PROVIDER_ID, managedKey: record.id, kind },
    "hunters-bestiary": { managed: true, providerId: PROVIDER_ID, managedKey: record.id, monsterId: record.id.split("-").slice(0, -2).join("-") || record.id }
  };
}
function baseActivity(action, activityId) {
  return {
    _id: activityId,
    activation: { type: action.activation ?? "action", cost: 1, condition: "" },
    consumption: { targets: [], scaling: { allowed: false } },
    description: { chatFlavor: "" },
    duration: { concentration: false, units: "inst", special: "" },
    effects: [],
    range: { units: "ft", special: "", value: action.rangeFt ?? 5 },
    target: { affects: { choice: false, count: "1", special: "", type: "creature" }, template: { contiguous: false, count: "", size: "", type: "", units: "ft" } },
    uses: { spent: 0, recovery: [], max: "" }
  };
}
function buildActionItem(action, monsterId) {
  const activityId = safeId(`${action.id}act`);
  const damage = parseDamage(action.damageFormula);
  let activity;
  if (action.kind === "melee") {
    activity = {
      ...baseActivity(action, activityId),
      type: "attack",
      attack: { ability: action.ability, bonus: action.attackBonus ? String(action.attackBonus) : "", critical: { threshold: null }, flat: Boolean(action.attackBonus), type: { value: "melee", classification: "weapon" } },
      damage: { critical: { bonus: "" }, includeBase: false, parts: [{ custom: { enabled: false, formula: "" }, number: damage.number, denomination: damage.denomination, bonus: damage.bonus.replace("+", ""), types: [action.damageType], scaling: { mode: "", number: 1 } }] }
    };
  } else {
    activity = {
      ...baseActivity(action, activityId),
      type: "save",
      damage: { onSave: "half", parts: [{ custom: { enabled: false, formula: "" }, number: damage.number, denomination: damage.denomination, bonus: damage.bonus.replace("+", ""), types: [action.damageType], scaling: { mode: "", number: 1 } }] },
      save: { ability: [action.saveAbility ?? "dex"], dc: { calculation: "", formula: String(action.saveDc ?? 13) } }
    };
  }
  return {
    name: localizeContent(action.name), type: "feat", img: "icons/creatures/abilities/mouth-teeth-long-red.webp",
    system: { description: { value: `<p>${localizeContent(action.description)}</p>`, chat: "" }, source: { rules: "2024" }, type: { value: "monster", subtype: "" }, activities: { [activityId]: activity }, uses: { spent: 0, recovery: [], max: "" } },
    flags: { [MODULE_ID]: { managed: true, providerId: PROVIDER_ID, managedKey: action.id, monsterId }, "hunters-bestiary": { managed: true, providerId: PROVIDER_ID, managedKey: action.id, monsterId } }
  };
}
function buildTraitItem(trait, monsterId) {
  return { name: localizeContent(trait.name), type: "feat", img: "icons/creatures/abilities/dragon-ice-breath-blue.webp", system: { description: { value: `<p>${localizeContent(trait.description)}</p>`, chat: "" }, source: { rules: "2024" }, type: { value: "monster", subtype: "" }, activities: {}, uses: { spent: 0, recovery: [], max: "" } }, flags: { [MODULE_ID]: { managed: true, providerId: PROVIDER_ID, managedKey: trait.id, monsterId }, "hunters-bestiary": { managed: true, providerId: PROVIDER_ID, managedKey: trait.id, monsterId } } };
}
function buildReactionItem(reaction, monsterId) {
  const activityId = safeId(`${reaction.id}act`);
  return { name: localizeContent(reaction.name), type: "feat", img: "icons/skills/movement/arrow-upward-yellow.webp", system: { description: { value: `<p>${localizeContent(reaction.description)}</p>`, chat: "" }, source: { rules: "2024" }, type: { value: "monster", subtype: "" }, activities: { [activityId]: { ...baseActivity({ activation: "reaction", rangeFt: 0 }, activityId), type: "utility", activation: { type: "reaction", cost: 1, condition: localizeContent(reaction.description) }, roll: { prompt: false, visible: false, formula: "" } } }, uses: { spent: 0, recovery: [], max: "" } }, flags: { [MODULE_ID]: { managed: true, providerId: PROVIDER_ID, managedKey: reaction.id, monsterId }, "hunters-bestiary": { managed: true, providerId: PROVIDER_ID, managedKey: reaction.id, monsterId } } };
}
function abilitySource(record, ability) {
  const proficient = Object.hasOwn(record.saves, ability) ? 1 : 0;
  return { value: record.abilities[ability], proficient, max: null, bonuses: { check: "", save: "" } };
}
function skillSource(record, skill) {
  return { value: Object.hasOwn(record.skills, skill) ? 1 : 0, ability: ABILITY_SKILLS[skill] ?? "wis", bonuses: { check: "", passive: "" } };
}

export function buildActorData(record) {
  if (!record) throw new Error("Stat block is required.");
  const items = [
    ...record.traits.map((entry) => buildTraitItem(entry, record.id)),
    ...record.actions.map((entry) => buildActionItem(entry, record.id)),
    ...record.reactions.map((entry) => buildReactionItem(entry, record.id))
  ];
  const senses = { units: "ft", special: "", ranges: { darkvision: null, blindsight: null, tremorsense: null, truesight: null } };
  for (const key of ["darkvision", "blindsight", "tremorsense", "truesight"]) {
    const value = record.senses?.[key];
    senses.ranges[key] = Number.isFinite(Number(value)) ? Number(value) : null;
  }
  const size = normalizeDnd5eSize(record.size);
  const tokenSize = DND5E_TOKEN_SIZES[size];
  const actor = {
    name: localizeContent(record.name), type: "npc", img: record.img ?? "modules/hunters-bestiary-aquatic-ecology/assets/aquatic-ecology.svg",
    system: {
      abilities: Object.fromEntries(["str","dex","con","int","wis","cha"].map((key) => [key, abilitySource(record, key)])),
      attributes: { ac: { calc: "flat", flat: record.ac, formula: "" }, hp: { value: record.hp, max: record.hp, temp: 0, tempmax: 0, formula: record.hitDice }, movement: { burrow: record.movement.burrow, climb: record.movement.climb, fly: record.movement.fly, swim: record.movement.swim, walk: record.movement.walk, units: "ft", hover: false }, senses, spellcasting: "", exhaustion: 0, hd: record.proficiencyBonus },
      details: { alignment: record.alignment, biography: { value: "", public: "" }, cr: record.cr, type: { value: record.creatureType, subtype: "", swarm: "", custom: "" }, source: { book: "Hunter's Bestiary: Aquatic Ecology", page: "", license: "MIT", rules: "2024", revision: 1 }, xp: { value: record.xp } },
      traits: { size, languages: { value: record.languages, custom: "" }, di: { value: record.damageImmunities, bypasses: [], custom: "" }, dr: { value: record.damageResistances, bypasses: [], custom: "" }, dv: { value: [], bypasses: [], custom: "" }, ci: { value: record.conditionImmunities, custom: "" }, dm: { amount: {}, bypasses: [] }, important: false },
      skills: Object.fromEntries(["acr","ani","arc","ath","dec","his","ins","itm","inv","med","nat","prc","prf","per","rel","slt","ste","sur"].map((skill) => [skill, skillSource(record, skill)])),
      resources: { legact: { value: 0, max: 0 }, legres: { value: 0, max: 0 }, lair: { value: false, initiative: null, inside: false } }, currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 }
    },
    prototypeToken: { name: localizeContent(record.name), width: tokenSize, height: tokenSize, displayName: globalThis.CONST?.TOKEN_DISPLAY_MODES?.OWNER_HOVER ?? 20, displayBars: globalThis.CONST?.TOKEN_DISPLAY_MODES?.OWNER_HOVER ?? 20, disposition: globalThis.CONST?.TOKEN_DISPOSITIONS?.HOSTILE ?? -1, actorLink: false, bar1: { attribute: "attributes.hp" }, bar2: { attribute: null }, texture: { src: record.img ?? "modules/hunters-bestiary-aquatic-ecology/assets/aquatic-ecology.svg", scaleX: 1, scaleY: 1 }, sight: { enabled: true, range: 0, visionMode: "basic" } },
    ownership: { default: globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.NONE ?? 0 },
    items,
    flags: { [MODULE_ID]: { managed: true, providerId: PROVIDER_ID, managedKey: record.managedKey, monsterId: record.id, rules: "2024" }, "hunters-bestiary": { providerId: PROVIDER_ID, monsterId: record.id, managedKey: record.managedKey, rules: "2024" } }
  };
  return actor;
}

export function buildHarvestItemData(record, harvest) {
  if (!record || !harvest) throw new Error("Stat block and harvest record are required.");
  return {
    name: localizeContent(harvest.name), type: "loot", img: "modules/hunters-bestiary-aquatic-ecology-dnd5e-2024/assets/aquatic-dnd5e.svg",
    system: { description: { value: `<p>${localizeContent(harvest.description)}</p><p><strong>${localizeKey("HBAEDND.Fields.Preservation")}:</strong> ${localizeContent(harvest.preservation)}</p><p><strong>${localizeKey("HBAEDND.Fields.Conditions")}:</strong> ${localizeContent(harvest.conditions)}</p><p><strong>${localizeKey("HBAEDND.Fields.Risks")}:</strong> ${localizeContent(harvest.risks)}</p><p><strong>${localizeKey("HBAEDND.Fields.LegalStatus")}:</strong> ${localizeContent(harvest.legalStatus)}</p>`, chat: "" }, quantity: harvest.quantity, weight: harvest.weight, price: { value: harvest.valueGp, denomination: "gp" }, rarity: harvest.rarity, identified: true, type: { value: "tradeGood", subtype: "" }, properties: [], source: { book: "Hunter's Bestiary: Aquatic Ecology", page: "", license: "MIT", rules: "2024", revision: 1 } },
    ownership: { default: globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.NONE ?? 0 },
    flags: { [MODULE_ID]: { managed: true, providerId: PROVIDER_ID, managedKey: `${record.id}:harvest:${harvest.id}`, monsterId: record.id, harvestId: harvest.id, spoilageHours: harvest.spoilageHours, requiresDeath: harvest.requiresDeath }, "hunters-bestiary": { managed: true, providerId: PROVIDER_ID, managedKey: `${record.id}:harvest:${harvest.id}`, monsterId: record.id } }
  };
}
