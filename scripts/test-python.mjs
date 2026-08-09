import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const executable = process.platform === "win32" ? resolve(".venv", "Scripts", "python.exe") : resolve(".venv", "bin", "python");
if (!existsSync(executable)) {
  console.error("Python environment is missing. Run npm run setup:agent first.");
  process.exit(1);
}
const result = spawnSync(executable, ["-m", "unittest", "discover", "-s", "python_agent/tests", "-v"], { stdio: "inherit" });
process.exit(result.status ?? 1);
