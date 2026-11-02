# Build Report 1.3.3

- Baseline: 1.3.2
- Patch: 1.3.3
- Automated tests: 55/55 passed
- Static validation: passed
- Foundry target: 13.351
- D&D 5e target: 5.3.3
- Root cause: transient startup failures were assigned to a frozen public API object.
- Correction: private module-scoped startup failure state, copied into the existing ready status.
- Dependency floor: Aquatic Ecology 1.2.3
- World-data migration: none
