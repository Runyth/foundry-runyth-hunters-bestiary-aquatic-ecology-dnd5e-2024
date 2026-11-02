# Patch Qualification 1.2.3

Scope: complete Aquatic D&D localization restoration.

- Flat English and German language files are expanded to nested dictionaries.
- Only the HBAEDND namespace is merged.
- A translated probe must resolve after installation.
- Failed fallback loads can retry.
- Context preparation and dashboard opening await translation readiness.
- Localization keys contain no leaf/parent prefix collisions.
- Every dashboard and template localization reference resolves in English and German.
- Automated tests: 39/39 passed.
- Localization parity: 86/86 keys.
- Settings, content IDs, imported Actors and Items, provenance flags, and public APIs remain compatible.
