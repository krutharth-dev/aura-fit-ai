import { access, readdir } from "node:fs/promises";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const workerPath = new URL("../dist/server/index.js", import.meta.url);
const migrationPath = new URL("../dist/.openai/drizzle/", import.meta.url);
await access(workerPath);
const migrations = await readdir(migrationPath);
if (!migrations.some((file) => file.endsWith(".sql"))) {
  throw new Error("The deployable build must package at least one D1 migration.");
}

const workerUrl = pathToFileURL(workerPath.pathname);
workerUrl.searchParams.set("validate", `${process.pid}-${Date.now()}`);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: "data:text/javascript,export const env = {};", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const worker = await import(workerUrl.href);
if (!worker.default || typeof worker.default.fetch !== "function") {
  throw new Error("The deployable Worker must export default.fetch().");
}
console.log("Validated deployable AURA FIT Cloudflare Worker artifact.");
