import { MODULE_ID, PROVIDER_ID } from "./constants.mjs";
import { loadStatblockData } from "./data.mjs";
import { buildActorData, buildHarvestItemData } from "./builder.mjs";
import { provisionActors, createHarvestItems, deleteImportedData } from "./provision.mjs";
import { registerMonsterPack, registerStatblocks, validateStatblocks, unregisterStatblocks, getIntegrationStatus } from "./registry.mjs";
import { runNativeFieldCheck } from "./field-checks.mjs";

let resolveReady;
const readyPromise = new Promise((resolve) => { resolveReady = resolve; });
let state = { ready: false, failures: [] };
function requireGm() { if (!game.user?.isGM) throw new Error(game.i18n.localize("HBAEDND.Error.GMOnly")); }
function clone(value) { return foundry.utils.deepClone(value); }
async function record(id) { return (await loadStatblockData()).statblocks.find((entry) => entry.id === id); }
export function markReady(next) { state = { ...next, ready: true }; resolveReady(clone(state)); }
export function createApi(open) {
  const importActors = async (options) => { requireGm(); return provisionActors(options); };
  const importHarvestItems = async (options) => { requireGm(); return createHarvestItems(options); };
  return Object.freeze({
    whenReady: () => readyPromise,
    registerMonsterPack,
    registerStatblocks,
    validateStatblocks,
    unregisterStatblocks,
    buildActorData: async (monsterId) => { requireGm(); const entry = await record(monsterId); return entry ? buildActorData(entry) : null; },
    importActors,
    provisionActors: importActors,
    buildHarvestItemData: async (monsterId) => { requireGm(); const entry = await record(monsterId); return entry ? entry.harvestItems.map((harvest) => buildHarvestItemData(entry, harvest)) : []; },
    importHarvestItems,
    createHarvestItems: importHarvestItems,
    deleteImportedData: async (options) => { requireGm(); return deleteImportedData(options); },
    getEncounterProfile: async (monsterId) => { requireGm(); const entry = await record(monsterId); return entry ? clone(entry.encounter) : null; },
    getIntegrationStatus: (providerId) => game.user?.isGM ? getIntegrationStatus(providerId) : [],
    runNativeFieldCheck,
    open: (options = {}) => { requireGm(); return open(options); },
    getStatus: () => clone(state),
    providerId: PROVIDER_ID,
    moduleId: MODULE_ID
  });
}
