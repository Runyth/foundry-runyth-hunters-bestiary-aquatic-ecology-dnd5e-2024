# 1.2.1 patch verification

1. Open Configure Settings → Module Settings and confirm no `HBAEDND.*` identifiers are visible.
2. Switch Foundry to English and German in separate reloads and verify setting names, labels, hints, and reset notifications.
3. Use **Open Dashboard** and confirm the dashboard opens without `Cannot add property minWidth`.
4. Use **Reset size** and **Reset position** and confirm localized notifications appear.
5. Run Actor import, Actor update, Item import, validation, and exact-provenance deletion regression scenarios.

---

# Manual Test Plan - Hunter's Bestiary: Aquatic Ecology - D&D 5e 2024 1.2.0


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


## Patch 1.2.4 progress lifecycle checks

1. Run each import/update/delete operation in a clean world and confirm its progress window closes at 100% before the dashboard refreshes.
2. Force one Actor or Item creation failure and confirm processing continues, the progress window remains open, lists the failed resource, and is foregrounded.
3. Force a thrown operation error and confirm the window remains open with the exception message and an enabled Close button.
4. Confirm no success notification or dashboard rerender obscures a failed progress report.
