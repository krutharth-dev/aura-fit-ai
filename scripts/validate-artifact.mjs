import { access, readFile, readdir } from "node:fs/promises";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const workerPath = new URL("../dist/server/index.js", import.meta.url);
const hostingPath = new URL("../dist/.openai/hosting.json", import.meta.url);
await Promise.all([access(workerPath), access(hostingPath)]);
const hosting = JSON.parse(await readFile(hostingPath, "utf8"));
if (hosting.d1) {
  const migrations = await readdir(new URL("../dist/.openai/drizzle/", import.meta.url));
  if (!migrations.some((file) => file.endsWith(".sql"))) throw new Error("D1 is enabled but no packaged SQL migration was found.");
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
console.log("Validated deployable AURA FIT Worker artifact.");
