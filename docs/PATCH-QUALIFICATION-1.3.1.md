# Patch qualification — 1.3.1

Required release gates:

- Standard Foundry `languages` manifest declarations.
- Exact English/German key parity.
- No embedded `en`/`de` language maps in shipped data.
- Every shipped content key resolves in both bundled dictionaries.
- No custom language selector, language setting, runtime translation fetch, or dictionary injection.
- Existing actor-image override functionality remains covered.
- Full automated test and static-validation suites pass.
- Two independent builds are byte-identical.
- Install and source archives reproduce from the extracted source ZIP.
