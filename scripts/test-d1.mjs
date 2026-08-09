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

try {
  await waitForServer();

  const guestAHeaders = {};
  const guestA = apiClient(guestAHeaders);
  const guestB = apiClient();
  const guestId = await createConversation(guestA, "Guest device workout");
  assert.ok((await guestA("/api/conversations")).conversations.some((item) => item.id === guestId));
  assert.ok(!(await guestB("/api/conversations")).conversations.some((item) => item.id === guestId));

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
  const accountId = await createConversation(accountDeviceA, "Account strength chat");
  const chat = await accountDeviceA("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: "Estimate my 1RM from 80 kg x 5 reps.",
      history: [{ role: "user", content: "Estimate my 1RM from 80 kg x 5 reps." }],
      thread_id: accountId,
      conversation_id: accountId,
    }),
  });
  assert.equal(chat.persisted, true);

  const synced = await accountDeviceB("/api/conversations");
  assert.equal(synced.scope, "account");
  assert.ok(synced.conversations.some((item) => item.id === guestId));
  assert.ok(synced.conversations.some((item) => item.id === accountId));
  const loaded = await accountDeviceB(`/api/conversations/${accountId}`);
  assert.equal(loaded.conversation.messages.length, 2);

  const otherAccount = apiClient({ "oai-authenticated-user-email": `other-${crypto.randomUUID()}@example.com` });
  assert.ok(!(await otherAccount("/api/conversations")).conversations.some((item) => item.id === accountId));

  const renamed = await accountDeviceB(`/api/conversations/${accountId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Synced strength workspace" }),
  });
  assert.equal(renamed.title, "Synced strength workspace");
  await accountDeviceB(`/api/conversations/${accountId}`, { method: "DELETE" });
  assert.ok(!(await accountDeviceA("/api/conversations")).conversations.some((item) => item.id === accountId));

  console.log("Verified guest isolation and signed-in, cross-device D1 conversation sync.");
} finally {
  if (server.exitCode === null) server.kill("SIGTERM");
  await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
