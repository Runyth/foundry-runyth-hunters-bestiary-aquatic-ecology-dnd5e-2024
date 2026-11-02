# Runyth Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024 1.2.3

This patch corrects the module-specific localization root cause. The defensive loader previously copied flat keys such as `HBAEDND.Title` directly into Foundry's nested active translation dictionary. Native Foundry loading expands those keys, but the manual fallback did not, so the complete dashboard could display internal identifiers.

Version 1.2.3 expands dotted keys into the `HBAEDND` object, merges only that namespace, validates a real translated probe, retries after transient failures, and awaits translation readiness before preparing or rendering the dashboard.

The patch also removes prefix collisions in the flat dictionaries. A key that stores text can no longer simultaneously be the parent of another key; for example, the Actions heading is now `HBAEDND.Actions.Title` beside `HBAEDND.Actions.Label`. Automated coverage verifies every localization key referenced by the dashboard and template in both bundled languages.
