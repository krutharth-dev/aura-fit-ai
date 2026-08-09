import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";

const port = 4500 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  env: { ...process.env, NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost" },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
server.stdout.on("data", (chunk) => { output = `${output}${chunk}`.slice(-16_000); });
server.stderr.on("data", (chunk) => { output = `${output}${chunk}`.slice(-16_000); });

function apiClient(identityHeaders = {}) {
  let cookie = "";
  return async (path, init = {}) => {
    const headers = new Headers(init.headers);
    for (const [name, value] of Object.entries(identityHeaders)) headers.set(name, value);
    if (cookie) headers.set("cookie", cookie);
    const response = await fetch(`${base}${path}`, { ...init, headers });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";", 1)[0];
    const body = await response.json();
    if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(body)}`);
    return body;
  };
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`D1 preview exited early.\n${output}`);
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch { /* The local Worker is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`D1 preview did not become ready.\n${output}`);
}

async function createConversation(client, message) {
  const result = await client("/api/conversations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ initial_message: message }),
  });
  return result.conversation.id;
}

async function sendChat(client, conversationId, message, clientIp) {
  return client("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": clientIp },
    body: JSON.stringify({
      message,
      history: [{ role: "user", content: message }],
      thread_id: conversationId,
      conversation_id: conversationId,
    }),
  });
}

try {
  await waitForServer();

  const guestAHeaders = {};
  const guestA = apiClient(guestAHeaders);
  const guestB = apiClient();
  const guestId = await createConversation(guestA, "Guest device workout");
  assert.ok((await guestA("/api/conversations")).conversations.some((item) => item.id === guestId));
  assert.ok(!(await guestB("/api/conversations")).conversations.some((item) => item.id === guestId));
  const savedProfile = {
    goal: "muscle_gain",
    experience: "intermediate",
    daysPerWeek: 4,
    sessionMinutes: 60,
    equipment: "full_gym",
    limitations: "",
    preferredExercises: "bench press, Romanian deadlift",
  };
  const guestProfile = await guestA("/api/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(savedProfile),
  });
  assert.equal(guestProfile.scope, "guest");
  assert.equal(guestProfile.profile.goal, "muscle_gain");
  assert.equal((await guestB("/api/profile")).profile, null);

  const accountEmail = `coach-${crypto.randomUUID()}@example.com`;
  const accountHeaders = {
    "oai-authenticated-user-email": accountEmail,
    "oai-authenticated-user-full-name": "Verified%20Coach",
    "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
  };
  Object.assign(guestAHeaders, accountHeaders);
  const accountDeviceA = guestA;
  const accountDeviceB = apiClient(accountHeaders);
  const upgraded = await accountDeviceA("/api/conversations");
  assert.equal(upgraded.scope, "account");
  assert.ok(upgraded.conversations.some((item) => item.id === guestId));
  const adoptedProfile = await accountDeviceA("/api/profile");
  assert.equal(adoptedProfile.scope, "account");
  assert.equal(adoptedProfile.profile.daysPerWeek, 4);
  const accountId = await createConversation(accountDeviceA, "Account strength chat");
  const chat = await sendChat(accountDeviceA, accountId, "Estimate my 1RM from 80 kg x 5 reps.", "account-initial");
  assert.equal(chat.persisted, true);

  const synced = await accountDeviceB("/api/conversations");
  assert.equal(synced.scope, "account");
  assert.ok(synced.conversations.some((item) => item.id === guestId));
  assert.ok(synced.conversations.some((item) => item.id === accountId));
  assert.equal((await accountDeviceB("/api/profile")).profile.preferredExercises, savedProfile.preferredExercises);
  const loaded = await accountDeviceB(`/api/conversations/${accountId}`);
  assert.equal(loaded.conversation.messages.length, 2);

  const profilePlanId = await createConversation(accountDeviceB, "Profile-aware plan");
  const profilePlan = await sendChat(accountDeviceB, profilePlanId, "Build my workout plan using my saved profile.", "profile-aware-plan");
  assert.match(profilePlan.answer, /^YOUR 4-DAY MUSCLE-BUILDING PLAN/);
  assert.match(profilePlan.answer, /PREFERENCES — Prioritised where compatible/);
  assert.ok(profilePlan.trace.includes("Applied saved fitness profile"));

  const simultaneous = await Promise.all([
    sendChat(accountDeviceA, accountId, "Estimate my 1RM from 90 kg x 5 reps.", "account-device-a"),
    sendChat(accountDeviceB, accountId, "Estimate my 1RM from 100 kg x 5 reps.", "account-device-b"),
  ]);
  assert.ok(simultaneous.every((result) => result.persisted));
  const ordered = await accountDeviceA(`/api/conversations/${accountId}`);
  assert.equal(ordered.conversation.messages.length, 6);
  assert.deepEqual(ordered.conversation.messages.slice(2).map((message) => message.role), ["user", "assistant", "user", "assistant"]);

  const otherAccount = apiClient({ "oai-authenticated-user-email": `other-${crypto.randomUUID()}@example.com` });
  assert.ok(!(await otherAccount("/api/conversations")).conversations.some((item) => item.id === accountId));
  assert.equal((await otherAccount("/api/profile")).profile, null);

  const renamed = await accountDeviceB(`/api/conversations/${accountId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Synced strength workspace" }),
  });
  assert.equal(renamed.title, "Synced strength workspace");
  await accountDeviceB(`/api/conversations/${accountId}`, { method: "DELETE" });
  assert.ok(!(await accountDeviceA("/api/conversations")).conversations.some((item) => item.id === accountId));

  const longConversationId = await createConversation(accountDeviceA, "Long-running workout history");
  for (let index = 0; index < 101; index += 1) {
    const weight = 80 + index;
    await sendChat(accountDeviceA, longConversationId, `Estimate my 1RM from ${weight} kg x 5 reps.`, `long-history-${index}`);
  }
  const longConversation = await accountDeviceB(`/api/conversations/${longConversationId}`);
  assert.equal(longConversation.conversation.messages.length, 200);
  assert.equal(longConversation.conversation.messages[0].content, "Estimate my 1RM from 81 kg x 5 reps.");
  assert.match(longConversation.conversation.messages.at(-1).content, /about 206 kg/);
  const longSummary = (await accountDeviceA("/api/conversations")).conversations.find((item) => item.id === longConversationId);
  assert.equal(longSummary.messageCount, 202);

  const rateLimitIp = `rate-limit-${crypto.randomUUID()}`;
  for (let index = 0; index < 30; index += 1) {
    const response = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": rateLimitIp },
      body: JSON.stringify({ message: "How long should I rest between sets?" }),
    });
    assert.equal(response.status, 200);
  }
  const limited = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": rateLimitIp },
    body: JSON.stringify({ message: "How long should I rest between sets?" }),
  });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) >= 1);

  console.log("Verified profile adoption, ownership, profile-aware coaching, concurrent ordering, latest-history loading, and distributed D1 rate limiting.");
} finally {
  if (server.exitCode === null) server.kill("SIGTERM");
  await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
