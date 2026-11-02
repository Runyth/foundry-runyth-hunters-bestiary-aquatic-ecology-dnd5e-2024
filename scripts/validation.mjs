// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
function issue(code, path, message) { return { code, path, message, severity: "error" }; }
function recordObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function localizable(value) {
  if (typeof value === "string") return Boolean(value.trim());
  if (!recordObject(value)) return false;
  if (typeof value.key === "string" && value.key.trim()) return true;
  return Object.values(value).some(entry => typeof entry === "string" && entry.trim());
}
function stableId(value) { return typeof value === "string" && Boolean(value.trim()); }
function array(value) { return Array.isArray(value) ? value : []; }

export function validateStatblockPackage(data, ecologySpecies = []) {
  const issues = [];
  if (!recordObject(data) || !Array.isArray(data.statblocks)) return { valid: false, issues: [issue("E_PACKAGE", "$", "statblocks array is required.")], counts: { statblocks: 0, actions: 0, harvestItems: 0 } };

  const ecologyIds = new Set();
  if (!Array.isArray(ecologySpecies)) {
    issues.push(issue("E_ECOLOGY_PACKAGE", "ecologySpecies", "Ecology species must be an array."));
  } else {
    for (const [index, ecologyRecord] of ecologySpecies.entries()) {
      if (!recordObject(ecologyRecord) || !stableId(ecologyRecord.id)) {
        issues.push(issue("E_ECOLOGY_ENTRY", `ecologySpecies[${index}]`, "Ecology species entry must be an object with a stable id."));
        continue;
      }
      ecologyIds.add(ecologyRecord.id);
    }
  }

  const ids = new Set();
  const managed = new Set();
  let actionCount = 0;
  let harvestCount = 0;

  for (const [index, record] of data.statblocks.entries()) {
    const path = `statblocks[${index}]`;
    if (!recordObject(record)) {
      issues.push(issue("E_RECORD", path, "Stat-block entry must be an object."));
      continue;
    }

    const traits = array(record.traits);
    const actions = array(record.actions);
    const harvestItems = array(record.harvestItems);
    const movement = recordObject(record.movement) ? record.movement : {};
    actionCount += actions.length;
    harvestCount += harvestItems.length;

    if (!stableId(record.id)) issues.push(issue("E_ID", path, "Stable id is required."));
    else if (ids.has(record.id)) issues.push(issue("E_DUPLICATE_ID", `${path}.id`, `Duplicate id ${record.id}.`)); else ids.add(record.id);
    if (!stableId(record.managedKey)) issues.push(issue("E_MANAGED_KEY", path, "Stable managed key is required."));
    else if (managed.has(record.managedKey)) issues.push(issue("E_DUPLICATE_MANAGED", `${path}.managedKey`, `Duplicate managed key ${record.managedKey}.`)); else managed.add(record.managedKey);
    if (ecologyIds.size && stableId(record.id) && !ecologyIds.has(record.id)) issues.push(issue("E_ECOLOGY_MATCH", path, `No matching ecological species ${record.id}.`));
    if (record.rules !== "2024") issues.push(issue("E_RULES", path, "All Actors must use the 2024 rules marker."));
    if (!localizable(record.name)) issues.push(issue("E_I18N", `${path}.name`, "A localizable name is required."));
    for (const key of ["size","creatureType","ac","hp","hitDice","abilities","saves","skills","senses","cr","xp","proficiencyBonus","traits","actions","harvestItems","encounter","fieldChecks","respiration","movement"]) if (record[key] === undefined || record[key] === null) issues.push(issue("E_FIELD", `${path}.${key}`, `Required field ${key} is missing.`));

    if (record.respiration === "sessile-water") {
      if (movement.swim !== 0) issues.push(issue("E_SESSILE_MOVEMENT", `${path}.movement.swim`, "Sessile colony must not have swim speed."));
    } else if (!(movement.swim > 0)) issues.push(issue("E_SWIM", `${path}.movement.swim`, "Aquatic creature requires swim movement."));
    if (record.respiration === "air-breathing" && !traits.some((trait) => recordObject(trait) && trait.respirationFeature === true)) issues.push(issue("E_SURFACING", path, "Air-breathing Actor lacks surfacing or Hold Breath logic."));
    if (record.respiration === "amphibious" && !(movement.walk > 0 && movement.swim > 0)) issues.push(issue("E_AMPHIBIOUS", path, "Amphibious Actor requires walk and swim movement."));
    if (!actions.length) issues.push(issue("E_ACTIONS", `${path}.actions`, "Playable actions are required."));
    if (!traits.length) issues.push(issue("E_TRAITS", `${path}.traits`, "Physiological traits are required."));
    if (array(record.legendaryActions).length) issues.push(issue("E_LEGENDARY", `${path}.legendaryActions`, "Bundled ecology does not justify legendary actions."));
    if (record.encounter?.cr !== record.cr || record.encounter?.xp !== record.xp) issues.push(issue("E_ENCOUNTER_CR", `${path}.encounter`, "CR and XP must match encounter metadata."));
    if (record.encounter?.fightsToDeath !== false) issues.push(issue("E_FIGHT_TO_DEATH", `${path}.encounter`, "Animals must not default to fighting to the death."));
    if (!harvestItems.length) issues.push(issue("E_HARVEST", `${path}.harvestItems`, "Harvest Items are required."));
    for (const [hIndex, harvest] of harvestItems.entries()) {
      if (!recordObject(harvest) || !stableId(harvest.id) || !localizable(harvest.name) || !localizable(harvest.description) || !localizable(harvest.preservation) || !localizable(harvest.conditions) || !localizable(harvest.risks) || !localizable(harvest.legalStatus)) issues.push(issue("E_HARVEST_FIELD", `${path}.harvestItems[${hIndex}]`, "Complete localizable harvest Item metadata is required."));
    }
  }
  if (data.statblocks.length !== 12) issues.push(issue("E_COUNT", "statblocks", "Exactly 12 bundled stat blocks are required."));
  return { valid: issues.length === 0, issues, counts: { statblocks: data.statblocks.length, actions: actionCount, harvestItems: harvestCount } };
}
