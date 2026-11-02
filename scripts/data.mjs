let cache;
let loading;

export async function loadStatblockData() {
  if (cache) return cache;
  loading ??= (async () => {
    const response = await fetch("modules/hunters-bestiary-aquatic-ecology-dnd5e-2024/data/statblocks.json", { cache: "default" });
    if (!response.ok) throw new Error(`Failed to load aquatic D&D data: ${response.status}`);
    cache = Object.freeze(await response.json());
    return cache;
  })().finally(() => { loading = undefined; });
  return loading;
}

export function clearStatblockDataCache() {
  cache = undefined;
  loading = undefined;
}
