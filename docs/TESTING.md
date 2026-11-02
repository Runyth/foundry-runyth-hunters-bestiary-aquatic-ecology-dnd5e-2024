# Testing

Automated regression total for this release: **29 passing tests**. Static quality validation also passes.

## Automated test commands

```bash
npm test
npm run check
npm run build
```

The build command reruns static validation and the complete test suite before packaging. Tests run without a live Foundry client by mocking the minimum runtime surfaces needed for deterministic behavioral checks.

## Required manual Foundry smoke test

1. Back up a disposable Foundry v13 world.
2. Install the new core first, then each enabled complementary module in dependency order.
3. Verify canonical titles in Manage Modules, Module Settings, window headers, notifications, generated folders, and confirmations.
4. Open each dashboard, resize/move/close/reopen it, then test **Reset size** and **Reset position**.
5. Type into every search field without losing focus or caret; remove characters and verify hidden entries return.
6. Run validation and diagnostics as GM; verify players do not see provider truth or destructive controls.
7. Run every relevant import/update workflow and confirm real phase/count/percentage feedback.
8. Cancel or close progress safely where supported, induce a controlled failure, and inspect the final summary/error detail.
9. For deletion, inspect the exact eligible list, cancel once, then confirm in a disposable world; verify unrelated/user-modified Documents survive.
10. Test startup with all modules, each supported subset, a disabled complementary module, a missing dependency, an incompatible API declaration, and valid/invalid third-party naming metadata.
11. Confirm one invalid-name warning at startup and one per intentional dashboard open, with no rerender loop.
12. Verify English and German UI paths and keyboard-only operation.

## Module-specific regression focus

## 1.2.0 behavior

- Canonical combined subject/system title and registration metadata.
- Core toolkit for geometry, stable search, progress, busy state, naming validation, resets, and destructive confirmation.
- All twelve Actors, native D&D size keys, token dimensions, partial-world recovery, exact provenance deletion, user-content preservation, and compatibility aliases remain.
- The ocean-blue D&D palette remains.

