# Troubleshooting

## Import missing Actors stops after two creatures

This was caused by descriptive ecology size names being written directly into D&D 5e Actor data. D&D 5e 5.3.3 requires compact size keys such as `lg` and `grg`. Version 1.1.1 converts the keys and writes matching token dimensions. Replace the complete old module directory, restart Foundry, and run **Import missing Actors** again; the two existing managed Actors are skipped and the remaining ten are imported.

## Import progress window fails to open

Version 1.1.0 removes the invalid empty `DialogV2.buttons` configuration. Replace the entire old module directory and restart Foundry; do not merge individual files into 1.0.0.

## Base registry reports an incompatible provider record

Version 1.1.0 first supplies complete compatibility records containing native Actor sources, harvest Item sources, encounter profiles, and legacy aliases. If a future base integration still rejects those records, the dashboard reports that base-registry status while local Actor/Item import remains available. Open Validation for local package issues.

## Imported Actors are not updated

Confirm the Actor retains this module's exact managed key and provider ID. Custom Items and Active Effects do not prevent an update and are preserved.

## Delete all imported data retained a folder

Only empty folders originally created and flagged by this module are removed. A reused user folder, a folder containing unrelated documents, or a folder with child folders is intentionally retained.

Errors emitted from another package path remain that package's responsibility; this module does not monkey patch or suppress unrelated package failures.
