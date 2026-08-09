import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: "data:text/javascript,export const env = {};", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const developmentPreviewMeta = /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;
let workerPromise;

function getWorker() {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then((module) => module.default);
  }
  return workerPromise;
}

async function appFetch(path = "/", init = {}) {
  const worker = await getWorker();
  return worker.fetch(new Request(`http://localhost${path}`, init), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

async function chat(message, history = [{ role: "user", content: message }]) {
  const response = await appFetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": `test-${Math.random()}` },
    body: JSON.stringify({ message, history, thread_id: "aura-test-session" }),
  });
  return { response, data: await response.json() };
}

test("renders professional metadata, team details and security headers", async () => {
  const response = await appFetch("/", { headers: { accept: "text/html" } });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /Kishan B Gowda/);
  assert.match(html, /Krutharth Prashanth Gowda/);
  assert.match(html, /site\.webmanifest/);
  assert.match(html, /Sign in \/ Sign up/);
  assert.match(html, /CHOOSE A COACHING WORKFLOW/);
});

test("renders an account-synced workspace from trusted ChatGPT identity headers", async () => {
  const response = await appFetch("/", {
    headers: {
      accept: "text/html",
      "oai-authenticated-user-email": "coach@example.com",
      "oai-authenticated-user-full-name": "AURA%20Member",
      "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
    },
  });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /AURA Member/);
  assert.match(html, /ACCOUNT SYNC ACTIVE/);
  assert.match(html, /All devices/);
  assert.doesNotMatch(html, /Sign in \/ Sign up/);
});

test("builds the exact requested 2-day and 6-day plans", async () => {
  const two = await chat("Create a 2-day muscle-building plan for an intermediate lifter with full gym access, 60-minute sessions and no limitations.");
  const six = await chat("Create a 6-day strength plan for an advanced lifter with full gym access, 75-minute sessions and no limitations.");
  assert.match(two.data.answer, /^YOUR 2-DAY MUSCLE-BUILDING PLAN/);
  assert.equal((two.data.answer.match(/^DAY \d+ —/gm) ?? []).length, 2);
  assert.equal((six.data.answer.match(/^DAY \d+ —/gm) ?? []).length, 6);
  assert.ok(two.data.trace.some((step) => step.includes("2 sessions")));
});

test("respects home equipment and session duration", async () => {
  const { data } = await chat("Create a 3-day general fitness plan for a beginner with dumbbells at home, 35-minute sessions and no injuries.");
  assert.match(data.answer, /^YOUR 3-DAY FITNESS PLAN/);
  assert.match(data.answer, /Goblet squat|Dumbbell/);
  assert.doesNotMatch(data.answer, /Back squat|Barbell|Cable crunch/);
  assert.equal((data.answer.split("DAY 2")[0].match(/^\d+\./gm) ?? []).length, 4);
});

test("requests missing profile data and refuses unsafe limitation guessing", async () => {
  const incomplete = await chat("Make me a workout plan");
  const limitation = await chat("Create a 4-day muscle plan for an intermediate lifter, 60 minutes, full gym, after recent surgery.");
  assert.match(incomplete.data.answer, /I can personalise/);
  assert.match(limitation.data.answer, /I won’t guess/);
  assert.ok(limitation.data.trace.some((step) => step.includes("Stopped")));
});

test("preserves multi-turn body-part memory and exposes traces", async () => {
  const firstPrompt = "I want to train back today.";
  const first = await chat(firstPrompt);
  const second = await chat("six", [{ role: "user", content: firstPrompt }, { role: "assistant", content: first.data.answer }, { role: "user", content: "six" }]);
  assert.match(first.data.answer, /How many exercise variations/);
  assert.match(second.data.answer, /BACK WORKOUT — 6 EXERCISES/);
  assert.equal((second.data.answer.match(/^\d+\./gm) ?? []).length, 6);
  assert.ok(second.data.trace.length >= 4);
});

test("keeps calculator and urgent safety behavior deterministic", async () => {
  const calculator = await chat("Estimate my 1RM from 100 kg x 5 reps.");
  const recovery = await chat("I have chest pain, but how long should I rest between sets?");
  assert.match(calculator.data.answer, /about 115 kg/);
  assert.equal(calculator.data.source, "Deterministic training calculator");
  assert.match(recovery.data.answer, /emergency service/i);
  assert.equal(recovery.data.route, "recovery");
});

test("rejects malformed and oversized requests", async () => {
  const malformed = await appFetch("/api/chat", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "test-malformed" }, body: "{not-json" });
  const oversized = await chat("x".repeat(2_001));
  assert.equal(malformed.status, 400);
  assert.equal(oversized.response.status, 400);
  assert.match(oversized.data.error, /2,000 characters/);
});

test("packages the durable multi-chat schema and fails safely without D1", async () => {
  const migrationDirectory = new URL("../dist/.openai/drizzle/", import.meta.url);
  const migrationName = (await readdir(migrationDirectory)).find((name) => name.endsWith(".sql"));
  assert.ok(migrationName, "a SQL migration should be packaged with the deployment");
  const migration = await readFile(new URL(migrationName, migrationDirectory), "utf8");
  assert.match(migration, /CREATE TABLE `conversations`/);
  assert.match(migration, /CREATE TABLE `messages`/);
  assert.match(migration, /ON DELETE cascade/);

  const response = await appFetch("/api/conversations");
  assert.equal(response.status, 503);
  assert.match(response.headers.get("set-cookie") ?? "", /aura_device=device_/);
  assert.deepEqual(await response.json(), { error: "Conversation storage is unavailable" });
});
