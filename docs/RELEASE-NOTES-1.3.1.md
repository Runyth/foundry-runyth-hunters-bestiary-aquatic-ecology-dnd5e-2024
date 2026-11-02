# Hunter’s Bestiary: Aquatic Ecology - D&D 5e 2024 1.3.1

This patch converts all shipped interface and content localization to Foundry VTT’s standard modular localization system.

## Changes

- English remains the default authored and fallback language.
- English and German are declared in `module.json` and loaded from `lang/en.json` and `lang/de.json`.
- Shipped content now stores `HBAEDND.Content.*` keys instead of embedded English/German objects.
- Runtime strings resolve through `game.i18n` and Handlebars localization helpers.
- No dashboard or module-specific language selector is added; Foundry’s global **Language Preference** setting is authoritative.
- Custom translation fetching, dictionary mutation, and inline language branching are prohibited and covered by regression tests.
- `docs/LOCALIZATION.md` documents adding future languages without code changes.

This patch is based on the coordinated actor-image feature release and therefore also includes the image override, FilePicker, dashboard-thumbnail, Actor portrait, and prototype-token synchronization functionality documented in `docs/ACTOR-IMAGES.md`.
