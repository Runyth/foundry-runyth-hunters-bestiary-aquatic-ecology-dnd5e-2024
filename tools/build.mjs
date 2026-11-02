import { execFileSync } from "node:child_process";

execFileSync(process.execPath, ["tools/validate.mjs"], { stdio: "inherit" });
execFileSync(process.execPath, ["--test", "tests/*.test.mjs"], { stdio: "inherit", shell: true });
execFileSync("python3", ["tools/package.py"], { stdio: "inherit" });
