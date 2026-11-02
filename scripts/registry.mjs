// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { PROVIDER_ID, BASE_DND_ID, ECOLOGY_ID } from "./constants.mjs";
import { buildActorData, buildHarvestItemData, normalizeDnd5eSize } from "./builder.mjs";
import { validateStatblockPackage } from "./validation.mjs";
import { localizeContent } from "./localization.mjs";

const providers = new Map();
function requireGm() { if (!game.user?.isGM) throw new Error(game.i18n.localize("HBAEDND.Error.GMOnly")); }
function clone(value) { return globalThis.foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : structuredClone(value); }

async function ecologySpecies() {
  const api = game.modules.get(ECOLOGY_ID)?.api;
  if (!api) throw new Error("Aquatic Ecology API is unavailable.");
  await api.whenReady();
  return api.getSpecies();
}

export async function validateStatblocks(providerId, content) {
  const species = await ecologySpecies();
  const normalized = Array.isArray(content) ? { statblocks: content } : content;
  return { providerId, ...validateStatblockPackage(normalized, species) };
}

function compatibilityAction(action) {
  return {
    id: action.id,
    name: localizeContent(action.name),
    description: localizeContent(action.description),
    ability: action.ability ?? "str",
    attackType: action.kind === "melee" ? "melee" : "ranged",
    reach: action.kind === "melee" ? Number(action.rangeFt ?? 5) : null,
    range: action.kind === "melee" ? null : Number(action.rangeFt ?? 30),
    damage: action.damageFormula,
    damageType: action.damageType
  };
}

function compatibilityTrait(trait) {
  return { id: trait.id, name: localizeContent(trait.name), description: localizeContent(trait.description) };
}

function compatibilityHarvest(record, harvest) {
  const item = buildHarvestItemData(record, harvest);
  return {
    id: harvest.id,
    name: localizeContent(harvest.name),
    description: localizeContent(harvest.description),
    quantity: Number(harvest.quantity ?? 1),
    weight: Number(harvest.weight ?? 0),
    priceGp: Number(harvest.valueGp ?? 0),
    rarity: harvest.rarity ?? "",
    img: item.img,
    source: clone(harvest)
  };
}

export function buildBaseCompatibilityRecords(statblocks) {
  return statblocks.map(record => {
    const actorData = buildActorData(record);
    const harvest = record.harvestItems.map(entry => compatibilityHarvest(record, entry));
    return {
      id: record.id,
      monsterId: record.id,
      providerRecordId: record.managedKey,
      rules: "2024",
      name: localizeContent(record.name),
      size: normalizeDnd5eSize(record.size),
      alignment: record.alignment,
      creatureType: record.creatureType,
      type: record.creatureType,
      cr: Number(record.cr),
      ac: Number(record.ac),
      hp: { value: Number(record.hp), formula: String(record.hitDice) },
      abilities: clone(record.abilities),
      savingThrows: Object.keys(record.saves ?? {}),
      skills: clone(record.skills ?? {}),
      speed: clone(record.movement ?? {}),
      senses: clone(record.senses ?? {}),
      damageResistances: clone(record.damageResistances ?? []),
      damageImmunities: clone(record.damageImmunities ?? []),
      damageVulnerabilities: clone(record.damageVulnerabilities ?? []),
      conditionImmunities: clone(record.conditionImmunities ?? []),
      languages: clone(record.languages ?? []),
      resistances: clone(record.damageResistances ?? []),
      immunities: clone(record.damageImmunities ?? []),
      traits: record.traits.map(compatibilityTrait),
      actions: record.actions.map(compatibilityAction),
      harvest,
      harvestItems: record.harvestItems.map((entry, index) => buildHarvestItemData(record, entry, index)),
      actorData,
      actor: actorData,
      encounter: clone(record.encounter),
      encounterProfile: clone(record.encounter),
      sourceRecord: clone(record)
    };
  });
}

function diagnosticFromReport(providerId, report, rolledBack) {
  const issues = Array.isArray(report?.issues) ? report.issues : [];
  if (!issues.length) {
    return [{
      providerId,
      recordId: report?.monsterId ?? report?.recordId ?? "unknown",
      rule: "registry-validation",
      message: (report?.errors ?? ["Registry validation failed."]).join("; "),
      rolledBack,
      localImportAvailable: true
    }];
  }
  return issues.map(issue => ({
    providerId,
    recordId: report?.monsterId ?? report?.recordId ?? "unknown",
    rule: issue.rule ?? issue.field ?? "registry-validation",
    field: issue.field,
    message: issue.message ?? String(issue),
    rolledBack,
    localImportAvailable: true
  }));
}

function diagnosticsFromError(providerId, error, rolledBack) {
  const reports = error?.reports ?? error?.validation?.reports ?? error?.validation ?? [];
  if (Array.isArray(reports) && reports.length) return reports.flatMap(report => diagnosticFromReport(providerId, report, rolledBack));
  const registry = error?.registryDiagnostic;
  return [{
    providerId,
    recordId: registry?.recordId ?? "unknown",
    rule: registry?.rule ?? "registration-exception",
    message: error?.message ?? String(error),
    rolledBack: Boolean(registry?.rolledBack ?? rolledBack),
    localImportAvailable: true
  }];
}

async function restoreBaseProvider(base, providerId, previous) {
  await Promise.resolve(base.unregisterStatblocks?.(providerId));
  if (previous.length) {
    await Promise.resolve(base.registerStatblocks(providerId, previous, {
      replaceProviderContent: true,
      allowPartial: true
    }));
  }
}

export async function registerWithBase(providerId, statblocks) {
  const base = game.modules.get(BASE_DND_ID)?.api;
  if (!base?.registerStatblocks || !base?.validateStatblocks || !base?.getStatblocks) {
    return {
      registered: false,
      variant: "compatibility-v1",
      count: 0,
      rolledBack: false,
      issues: [{ providerId, recordId: "unknown", rule: "base-api-unavailable", message: "Runyth Hunter's Bestiary - D&D 5e 2024 registry API is unavailable.", rolledBack: false, localImportAvailable: true }]
    };
  }

  await base.whenReady?.();
  const contract = base.getRegistryContract?.() ?? { version: "1.0.0" };
  const candidate = buildBaseCompatibilityRecords(statblocks);
  const previous = base.getStatblocks({ providerId }) ?? [];
  let registrationApplied = false;

  try {
    const validation = await Promise.resolve(base.validateStatblocks(candidate, { allowPartial: false }));
    if (validation?.complete !== true || validation?.valid === false) {
      const error = new Error(`Base registry validation rejected ${providerId}.`);
      error.validation = validation;
      throw error;
    }

    const registration = await Promise.resolve(base.registerStatblocks(providerId, candidate, {
      replaceProviderContent: true,
      allowPartial: false
    }));
    registrationApplied = true;

    const registered = base.getStatblocks({ providerId }) ?? [];
    const expectedIds = new Set(candidate.map(record => record.monsterId));
    const actualIds = new Set(registered.map(record => record.monsterId));
    const missing = [...expectedIds].filter(id => !actualIds.has(id));
    const stale = [...actualIds].filter(id => !expectedIds.has(id));
    if (registered.length !== candidate.length || missing.length || stale.length) {
      const error = new Error(`Base registry verification failed for ${providerId}.`);
      error.registryDiagnostic = {
        rule: "post-registration-verification",
        recordId: missing[0] ?? stale[0] ?? "unknown",
        missing,
        stale
      };
      throw error;
    }

    return {
      registered: true,
      variant: "compatibility-v1",
      count: registered.length,
      rolledBack: false,
      contractVersion: contract.version ?? registration?.contractVersion ?? "unknown",
      issues: []
    };
  } catch (error) {
    if (registrationApplied) await restoreBaseProvider(base, providerId, previous);
    return {
      registered: false,
      variant: "compatibility-v1",
      count: 0,
      rolledBack: registrationApplied,
      contractVersion: contract.version ?? "unknown",
      issues: diagnosticsFromError(providerId, error, registrationApplied)
    };
  }
}

export async function registerStatblocks(providerId, content, { allowLocalFallback = false } = {}) {
  requireGm();
  const normalized = Array.isArray(content) ? { statblocks: content } : content;
  const report = await validateStatblocks(providerId, normalized);
  if (!report.valid) throw Object.assign(new Error(`D&D stat blocks for ${providerId} failed validation.`), { validation: report });
  const baseRegistration = await registerWithBase(providerId, normalized.statblocks);
  if (!baseRegistration.registered && !allowLocalFallback) {
    throw Object.assign(new Error(`The base D&D integration rejected stat blocks for ${providerId}.`), { validation: baseRegistration.issues });
  }
  providers.set(providerId, {
    providerId,
    content: clone(normalized),
    validation: report,
    baseRegistration,
    registeredAt: new Date().toISOString()
  });
  if (!baseRegistration.registered) {
    console.warn(`${providerId} | Base D&D registry registration failed; local import remains available.`, {
      providerId,
      rejected: baseRegistration.issues,
      rolledBack: baseRegistration.rolledBack,
      localImportAvailable: true
    });
  }
  return getIntegrationStatus(providerId);
}

export async function unregisterStatblocks(providerId) {
  requireGm();
  const base = game.modules.get(BASE_DND_ID)?.api;
  if (base?.unregisterStatblocks) {
    try { await Promise.resolve(base.unregisterStatblocks(providerId)); }
    catch (error) { console.warn(`${providerId} | Base registry unregistration failed`, error); }
  }
  providers.delete(providerId);
  return true;
}

export async function atomicRegisterMonsterPack(providerId, content, { ecologyApi, registerDnd, unregisterDnd }) {
  let ecologyRegistered = false;
  let statblocksRegistered = false;
  try {
    await ecologyApi.registerAquaticExpansion(providerId, content.ecology ?? content.ecologicalPackage ?? content);
    ecologyRegistered = true;
    const result = await registerDnd(providerId, content.statblocks ?? content.dnd5e ?? content);
    statblocksRegistered = true;
    return result;
  } catch (error) {
    if (statblocksRegistered) await unregisterDnd(providerId).catch(() => undefined);
    if (ecologyRegistered) await ecologyApi.unregisterAquaticExpansion(providerId).catch(() => undefined);
    throw error;
  }
}

export async function registerMonsterPack(providerId, content) {
  requireGm();
  const ecology = game.modules.get(ECOLOGY_ID)?.api;
  if (!ecology) throw new Error("Aquatic Ecology API is unavailable.");
  await ecology.whenReady();
  return atomicRegisterMonsterPack(providerId, content, { ecologyApi: ecology, registerDnd: registerStatblocks, unregisterDnd: unregisterStatblocks });
}

export function getProviderRecord(providerId) { return providers.get(providerId); }
export function getIntegrationStatus(providerId) {
  const records = providerId ? [providers.get(providerId)].filter(Boolean) : [...providers.values()];
  const result = records.map(record => ({
    providerId: record.providerId,
    statblocks: record.content.statblocks.length,
    valid: record.validation.valid,
    baseRegistered: record.baseRegistration.registered,
    baseVariant: record.baseRegistration.variant,
    baseCount: record.baseRegistration.count,
    baseRolledBack: record.baseRegistration.rolledBack,
    baseContractVersion: record.baseRegistration.contractVersion,
    baseIssues: clone(record.baseRegistration.issues),
    registeredAt: record.registeredAt
  }));
  return providerId ? result[0] ?? null : result;
}
export async function registerBundledStatblocks(data) { return registerStatblocks(PROVIDER_ID, data, { allowLocalFallback: true }); }
