// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { execFileSync } from "node:child_process";

execFileSync(process.execPath, ["tools/validate.mjs"], { stdio: "inherit" });
execFileSync(process.execPath, ["--test", "tests/*.test.mjs"], { stdio: "inherit", shell: true });
execFileSync("python3", ["tools/package.py"], { stdio: "inherit" });
