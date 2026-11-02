// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
let cache;
let loading;

export async function loadStatblockData() {
  if (cache) return cache;
  loading ??= (async () => {
    const response = await fetch("modules/runyth-hunters-bestiary-aquatic-ecology-dnd5e-2024/data/statblocks.json", { cache: "default" });
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
