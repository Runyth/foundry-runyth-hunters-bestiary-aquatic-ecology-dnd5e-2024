// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
const DEFAULT_API_TIMEOUT_MS = 5000;
const DEFAULT_POLL_INTERVAL_MS = 25;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function moduleRecord(id) {
  return globalThis.game?.modules?.get?.(id) ?? null;
}

function readinessState(dependency, readyValue) {
  if (dependency?.api?.initializationStatus) return dependency.api.initializationStatus;
  if (typeof dependency?.api?.getStatus === "function") return dependency.api.getStatus();
  if (readyValue?.initializationStatus) return readyValue.initializationStatus;
  return readyValue;
}

function dependencyFailure(id, state) {
  if (!state || typeof state !== "object") return null;
  const failures = Array.isArray(state.failures) ? state.failures : [];
  if (state.ok !== false && failures.length === 0) return null;
  const details = failures
    .map(entry => entry?.message ?? entry?.subsystem ?? entry?.stage ?? String(entry))
    .filter(Boolean)
    .join("; ");
  return new Error(`Required module ${id} completed startup with failures${details ? `: ${details}` : "."}`);
}

export async function waitForDependencyApi(id, {
  timeoutMs = DEFAULT_API_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  now = () => Date.now(),
  delay = sleep
} = {}) {
  const initial = moduleRecord(id);
  if (!initial?.active) throw new Error(`Required module ${id} is inactive.`);

  const deadline = now() + Math.max(0, Number(timeoutMs) || 0);
  while (true) {
    const dependency = moduleRecord(id);
    if (!dependency?.active) throw new Error(`Required module ${id} became inactive during startup.`);
    if (typeof dependency.api?.whenReady === "function") return dependency;
    if (now() >= deadline) throw new Error(`Required module ${id} is active but did not expose its public readiness API within ${timeoutMs} ms.`);
    await delay(Math.max(1, Number(pollIntervalMs) || DEFAULT_POLL_INTERVAL_MS));
  }
}

export async function waitForDependencies(ids, options = {}) {
  const dependencies = await Promise.all(ids.map(id => waitForDependencyApi(id, options)));
  const readyValues = await Promise.all(dependencies.map(dependency => dependency.api.whenReady()));

  for (let index = 0; index < dependencies.length; index += 1) {
    const failure = dependencyFailure(ids[index], readinessState(dependencies[index], readyValues[index]));
    if (failure) throw failure;
  }
  return dependencies;
}
