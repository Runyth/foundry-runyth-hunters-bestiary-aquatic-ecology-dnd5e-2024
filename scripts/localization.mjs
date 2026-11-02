// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
const LOCALIZATION_KEY = /^(?:HB|HBDND5E|HBAE|HBAEDND)\./;

export function localizeKey(key) {
  const translated = globalThis.game?.i18n?.localize?.(key);
  return translated && translated !== key ? translated : key;
}

export function localizeContent(value, lang = globalThis.game?.i18n?.lang ?? "en") {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    if (!LOCALIZATION_KEY.test(value)) return value;
    return localizeKey(value);
  }
  if (Array.isArray(value)) return value.map(entry => localizeContent(entry, lang));
  if (typeof value === "object") {
    if (typeof value.key === "string") return localizeContent(value.key, lang);
    const selected = value[lang] ?? value.en ?? Object.values(value).find(entry => typeof entry === "string");
    return selected === undefined ? "" : localizeContent(selected, lang);
  }
  return String(value);
}
