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
  assert.match(html, /I want to train a body part today/);
  assert.match(html, /Set up training profile/);
  assert.match(html, /Set up profile/);
  assert.match(html, /Guest chats are not saved/);
  assert.match(html, /Privacy/);
  assert.match(html, /Plan my nutrition/);
  assert.match(html, /Ask about an injury/);
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
  assert.match(html, /This account/);
  assert.doesNotMatch(html, /Sign in \/ Sign up/);
});

test("publishes a formal privacy policy with account-isolation and observability disclosures", async () => {
  const response = await appFetch("/privacy", { headers: { accept: "text/html" } });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Privacy Policy/);
  assert.match(html, /Account isolation/);
  assert.match(html, /Analytics and error monitoring/);
  assert.match(html, /guest conversations are temporary/i);
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

test("guides body-part workouts one question at a time without defaulting to back", async () => {
  const firstPrompt = "I want to train a body part today.";
  const first = await chat(firstPrompt);
  const secondHistory = [{ role: "user", content: firstPrompt }, { role: "assistant", content: first.data.answer }, { role: "user", content: "chest" }];
  const second = await chat("chest", secondHistory);
  const third = await chat("five", [...secondHistory, { role: "assistant", content: second.data.answer }, { role: "user", content: "five" }]);
  const tooFew = await chat("2", [...secondHistory, { role: "assistant", content: second.data.answer }, { role: "user", content: "2" }]);
  const tooMany = await chat("9", [...secondHistory, { role: "assistant", content: second.data.answer }, { role: "user", content: "9" }]);
  const recovered = await chat("5", [
    ...secondHistory,
    { role: "assistant", content: second.data.answer },
    { role: "user", content: "2" },
    { role: "assistant", content: tooFew.data.answer },
    { role: "user", content: "9" },
    { role: "assistant", content: tooMany.data.answer },
    { role: "user", content: "5" },
  ]);
  assert.match(first.data.answer, /Which body part or muscle group/);
  assert.doesNotMatch(first.data.answer, /BACK WORKOUT/);
  assert.match(second.data.answer, /Great—chest day\. How many exercises/);
  assert.match(third.data.answer, /CHEST WORKOUT — 5 EXERCISES/);
  assert.equal((third.data.answer.match(/^\d+\./gm) ?? []).length, 5);
  assert.ok(third.data.trace.length >= 4);
  assert.match(tooFew.data.answer, /between 3 and 8 exercises/);
  assert.match(tooMany.data.answer, /between 3 and 8 exercises/);
  assert.match(recovered.data.answer, /CHEST WORKOUT — 5 EXERCISES/);
});

test("keeps calculator and urgent safety behavior deterministic", async () => {
  const calculator = await chat("Estimate my 1RM from 100 kg x 5 reps.");
  const recovery = await chat("I have chest pain, but how long should I rest between sets?");
  assert.match(calculator.data.answer, /about 115 kg/);
  assert.equal(calculator.data.source, "Deterministic training calculator");
  assert.match(recovery.data.answer, /emergency service/i);
  assert.equal(recovery.data.route, "recovery");
});

test("routes nutrition and health questions through safe specialist fallbacks", async () => {
  const nutrition = await chat("How much protein should I eat for muscle gain?");
  const supplement = await chat("Should I take creatine for the gym?");
  const injury = await chat("Could my swollen painful ankle be a workout injury?");
  assert.equal(nutrition.data.route, "nutrition");
  assert.match(nutrition.data.answer, /1\.6–2\.2 g/);
  assert.equal(supplement.data.route, "nutrition");
  assert.match(supplement.data.answer, /creatine monohydrate/i);
  assert.equal(injury.data.route, "health");
  assert.match(injury.data.answer, /cannot diagnose|warning signs|assessment/i);
});

test("answers broad free-text workout questions without requiring a starter button", async () => {
  const cardio = await chat("How should I combine running with leg training?");
  const plateau = await chat("My bench press progress is stuck. What should I change?");
  assert.equal(cardio.data.route, "training");
  assert.match(cardio.data.answer, /Combining cardio and strength/);
  assert.equal(plateau.data.route, "training");
  assert.match(plateau.data.answer, /plateau checklist/i);
});

test("adjusts the latest plan from conversation history", async () => {
  const plan = await chat("Create a 3-day muscle-building plan for a beginner with dumbbells at home, 60-minute sessions and no injuries.");
  const adjusted = await chat("Make that plan 30 minutes, replace Romanian deadlifts with hip thrusts and add running twice weekly.", [
    { role: "user", content: "Create a 3-day muscle-building plan for a beginner with dumbbells at home, 60-minute sessions and no injuries." },
    { role: "assistant", content: plan.data.answer },
  ]);
  assert.equal(adjusted.data.route, "adjustment");
  assert.match(adjusted.data.answer, /30 minutes/);
  assert.match(adjusted.data.answer, /Hip thrust/i);
  assert.match(adjusted.data.answer, /two sessions/i);
});

test("rejects malformed and oversized requests", async () => {
  const malformed = await appFetch("/api/chat", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "test-malformed" }, body: "{not-json" });
  const oversized = await chat("x".repeat(2_001));
  assert.equal(malformed.status, 400);
  assert.equal(oversized.response.status, 400);
  assert.match(oversized.data.error, /2,000 characters/);

  const invalidProfile = await appFetch("/api/profile", {
    method: "PUT",
    headers: { "content-type": "application/json", "oai-authenticated-user-email": "profile@example.com" },
    body: JSON.stringify({ goal: "muscle_gain", experience: "beginner", daysPerWeek: 7, sessionMinutes: 60, equipment: "full_gym", limitations: "", preferredExercises: "" }),
  });
  assert.equal(invalidProfile.status, 400);
  assert.match((await invalidProfile.json()).error, /between 2 and 6/);
});

test("packages the durable multi-chat schema and fails safely without D1", async () => {
  const migrationDirectory = new URL("../dist/.openai/drizzle/", import.meta.url);
  const migrationNames = (await readdir(migrationDirectory)).filter((name) => name.endsWith(".sql"));
  assert.ok(migrationNames.length, "SQL migrations should be packaged with the deployment");
  const migration = (await Promise.all(migrationNames.map((name) => readFile(new URL(name, migrationDirectory), "utf8")))).join("\n");
  assert.match(migration, /CREATE TABLE `conversations`/);
  assert.match(migration, /CREATE TABLE `messages`/);
  assert.match(migration, /CREATE TABLE `fitness_profiles`/);
  assert.match(migration, /CREATE TABLE `usage_events`/);
  assert.match(migration, /CREATE TABLE `error_events`/);
  assert.match(migration, /DELETE FROM `conversations` WHERE `device_id` LIKE 'device_%'/);
  assert.match(migration, /ON DELETE cascade/);

  const response = await appFetch("/api/conversations");
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.deepEqual(await response.json(), { error: "Sign in to access saved conversations" });

  const accountResponse = await appFetch("/api/conversations", { headers: { "oai-authenticated-user-email": "history@example.com" } });
  assert.equal(accountResponse.status, 503);
  assert.deepEqual(await accountResponse.json(), { error: "Conversation storage is unavailable" });

  const profileResponse = await appFetch("/api/profile");
  assert.equal(profileResponse.status, 401);
  assert.deepEqual(await profileResponse.json(), { error: "Sign in to access a saved fitness profile" });

  const accountProfileResponse = await appFetch("/api/profile", { headers: { "oai-authenticated-user-email": "profile@example.com" } });
  assert.equal(accountProfileResponse.status, 503);
  assert.deepEqual(await accountProfileResponse.json(), { error: "Profile storage is unavailable" });
});
