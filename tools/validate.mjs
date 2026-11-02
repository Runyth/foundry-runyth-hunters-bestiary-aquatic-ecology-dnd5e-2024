import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { validateStatblockPackage } from "../scripts/validation.mjs";
import { buildActorData } from "../scripts/builder.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (base, file) => JSON.parse(fs.readFileSync(path.join(base, file), "utf8"));
const manifest = readJson(root, "module.json"); const packageJson = readJson(root, "package.json"); const data = readJson(root, "data/statblocks.json"); const ecology = readJson(root, "tests/fixtures/ecology-species.json");
const en = readJson(root, "lang/en.json"); const de = readJson(root, "lang/de.json"); const errors = [];
for (const file of [...manifest.esmodules,...manifest.styles,...manifest.languages.map((entry)=>entry.path)]) if (!fs.existsSync(path.join(root,file))) errors.push(`Missing referenced file ${file}`);
const requirements = new Map(manifest.relationships.requires.map((entry)=>[entry.id,entry.compatibility?.minimum]));
for (const [id,version] of [["runyth-hunters-bestiary","1.4.2"],["runyth-hunters-bestiary-dnd5e-2024","1.2.2"],["runyth-hunters-bestiary-aquatic-ecology","1.2.4"]]) if (requirements.get(id)!==version) errors.push(`Dependency ${id} minimum must be ${version}.`);
if (manifest.relationships.systems[0].compatibility.minimum !== "5.3.3") errors.push("D&D minimum must be 5.3.3.");
const report = validateStatblockPackage(data, ecology); if (!report.valid) errors.push(...report.issues.map((entry)=>`${entry.code} ${entry.path}: ${entry.message}`));
globalThis.game = { i18n: { lang: "en" } };
globalThis.CONST = { TOKEN_DISPLAY_MODES: { OWNER_HOVER: 20 }, TOKEN_DISPOSITIONS: { HOSTILE: -1 }, DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0 } };
const nativeSizes = new Set(["tiny", "sm", "med", "lg", "huge", "grg"]);
for (const record of data.statblocks) {
  const actor = buildActorData(record);
  const size = actor.system?.traits?.size;
  if (!nativeSizes.has(size)) errors.push(`Actor ${record.id} uses invalid D&D 5e size key ${size}.`);
  if (!(Number(actor.prototypeToken?.width) > 0) || actor.prototypeToken.width !== actor.prototypeToken.height) errors.push(`Actor ${record.id} has invalid prototype-token dimensions.`);
}
if (JSON.stringify(Object.keys(en).sort())!==JSON.stringify(Object.keys(de).sort())) errors.push("modular English/German localization parity failed.");
const scripts=[...fs.readdirSync(path.join(root,"scripts"),{recursive:true})].filter((name)=>String(name).endsWith(".mjs"));
for (const relative of scripts) execFileSync(process.execPath,["--check",path.join(root,"scripts",String(relative))],{stdio:"pipe"});

for (const relative of scripts) {
  const file=path.join(root,"scripts",String(relative)); const source=fs.readFileSync(file,"utf8");
  for (const match of source.matchAll(/(?:import|export)\s+(?:[^"']+?\s+from\s+)?["'](\.[^"']+)["']/g)) {
    const resolved=path.resolve(path.dirname(file),match[1]); if(!fs.existsSync(resolved)) errors.push(`Unresolved production import ${match[1]} from ${relative}`);
  }
}
const production=scripts.map((name)=>fs.readFileSync(path.join(root,"scripts",String(name)),"utf8")).join("\n");
if (manifest.version !== packageJson.version || manifest.version !== "1.3.5") errors.push("Manifest and package versions must both be 1.3.5.");
const dashboardSource = fs.readFileSync(path.join(root, "scripts/apps/dashboard.mjs"), "utf8");
const dashboardTemplate = fs.readFileSync(path.join(root, "templates/dashboard.hbs"), "utf8");
if (dashboardSource.includes("buttons: []")) errors.push("DialogV2 progress configuration must define at least one button.");
for (const action of ["hbaedndImportActors", "hbaedndImportHarvests", "hbaedndDeleteImported"]) if (!dashboardTemplate.includes(action)) errors.push(`Missing dashboard action ${action}.`);
if (dashboardTemplate.includes("hbaedndCreateActors")) errors.push("Legacy Create Actors terminology remains in the dashboard.");
for (const method of ["importActors", "importHarvestItems", "deleteImportedData"]) if (!production.includes(method)) errors.push(`Missing public import lifecycle method ${method}.`);

for (const forbidden of ["renderApplication","renderApplicationV2","renderChatMessage","window.addEventListener","renderActorSheet","renderItemSheet","renderTokenHUD","getSceneControlButtons"]) if (production.includes(forbidden)) errors.push(`D&D integration owns forbidden/broad hook or listener: ${forbidden}`);
const css=fs.readFileSync(path.join(root,"styles/runyth-hunters-bestiary-aquatic-ecology.css"),"utf8"); for (const line of css.split(/\r?\n/)) if (/^(button|input|\.window-header|\.application|\.tab|\.sr-only)\b/.test(line.trim())) errors.push(`Unscoped CSS selector: ${line.trim()}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Aquatic D&D validation passed: ${report.counts.statblocks} stat blocks, ${report.counts.actions} actions, ${report.counts.harvestItems} harvest Items.`);
console.log(`Localization parity: ${Object.keys(en).length} keys. Static scripts: ${scripts.length}.`);
