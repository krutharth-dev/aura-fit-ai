import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const isWindows = process.platform === "win32";
const python = isWindows
  ? resolve(".venv", "Scripts", "python.exe")
  : resolve(".venv", "bin", "python");

if (!existsSync(python)) {
  console.error("Agent environment not found. Run: npm run setup:agent");
  process.exit(1);
}

const agent = spawn(
  python,
  ["-m", "uvicorn", "app.main:app", "--app-dir", "python_agent", "--host", "127.0.0.1", "--port", "8000"],
  { stdio: "inherit", env: process.env },
);

const web = spawn(
  isWindows ? "npm.cmd" : "npm",
  ["run", "dev:portable", "--", "--host", "0.0.0.0"],
  {
    stdio: "inherit",
    env: { ...process.env, AGENT_BACKEND_URL: "http://127.0.0.1:8000" },
  },
);

function stop() {
  agent.kill("SIGTERM");
  web.kill("SIGTERM");
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
agent.on("exit", (code) => { if (code) web.kill("SIGTERM"); });
web.on("exit", (code) => { agent.kill("SIGTERM"); process.exit(code ?? 0); });
