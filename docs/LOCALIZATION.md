# Localization

Hunter’s Bestiary: Aquatic Ecology - D&D 5e 2024 uses Foundry VTT’s standard package-localization system. It does not provide or need a module-specific language selector.

## Selecting a language

Use Foundry’s **Configure Settings → Core Settings → Language Preference** control. Foundry loads the matching language dictionary from every active package. English is the module’s fallback and default authored language.

## Package structure

The module manifest declares each bundled language:

```json
"languages": [
  { "lang": "en", "name": "English", "path": "lang/en.json" },
  { "lang": "de", "name": "Deutsch", "path": "lang/de.json" }
]
```

Interface and shipped-content strings use namespaced `HBAEDND.*` keys and are resolved through `game.i18n.localize` or Handlebars’ `{{localize}}` helper. Shipped data contains localization keys rather than embedded language objects.

## Adding another language

1. Copy `lang/en.json` to `lang/<language-code>.json`.
2. Translate values only. Keep every key unchanged.
3. Add one entry to `module.json` under `languages`.
4. Preserve formatting placeholders and HTML where present.
5. Run `npm test` and `npm run check`.
6. Start Foundry, choose the language through **Language Preference**, reload the world, and inspect settings, dashboards, dialogs, imported Documents, and generated Journals.

A translation can begin as a complete copy of English and be translated incrementally. Missing translations should be corrected in the language file rather than by adding language-specific branches to JavaScript.

## Campaign-authored text

Text entered by a GM is stored exactly as entered. It is not automatically translated when another Foundry language is selected. Shipped catalogue content remains modular and follows the active Foundry language.

## Prohibited implementation patterns

Do not add:

- a dashboard language selector;
- a module-specific language setting;
- runtime fetching or injection of `lang/*.json`;
- `HBAEDND` language branches in templates or JavaScript;
- embedded `{"en": ..., "de": ...}` records in shipped data.
