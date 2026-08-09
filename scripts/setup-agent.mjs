import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const isWindows = process.platform === "win32";
const candidates = isWindows
  ? [["py", ["-3"]], ["python", []], ["python3", []]]
  : [["python3", []], ["python", []]];

let python = null;
for (const [command, prefix] of candidates) {
  const probe = spawnSync(command, [...prefix, "-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"], { encoding: "utf8" });
  if (probe.status === 0 && /^(3\.11|3\.12)$/.test(probe.stdout.trim())) {
    python = { command, prefix };
    console.log(`Using Python ${probe.stdout.trim()}.`);
    break;
  }
}

if (!python) {
  console.error("Python 3.11 or 3.12 was not found. Install Python, then run this command again.");
  process.exit(1);
}

const venvDir = resolve(".venv");
if (!existsSync(venvDir)) {
  const create = spawnSync(python.command, [...python.prefix, "-m", "venv", venvDir], { stdio: "inherit" });
  if (create.status !== 0) process.exit(create.status ?? 1);
}

const venvPython = isWindows
  ? resolve(venvDir, "Scripts", "python.exe")
  : resolve(venvDir, "bin", "python");

const install = spawnSync(
  venvPython,
  ["-m", "pip", "install", "--upgrade", "pip", "-r", "python_agent/requirements.txt"],
  { stdio: "inherit" },
);

if (install.status !== 0) process.exit(install.status ?? 1);
console.log("\nAURA FIT agent setup is complete. Run: npm run dev:full");
