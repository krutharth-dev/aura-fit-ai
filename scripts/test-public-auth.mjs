import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";

const port = 5000 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  env: { ...process.env, GROQ_API_KEY: "", NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost" },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
server.stdout.on("data", (chunk) => { output = `${output}${chunk}`.slice(-16_000); });
server.stderr.on("data", (chunk) => { output = `${output}${chunk}`.slice(-16_000); });

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Auth preview exited early.\n${output}`);
    try { if ((await fetch(base)).ok) return; } catch { /* Starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Auth preview did not become ready.\n${output}`);
}

function cookieFrom(response) {
  const value = response.headers.get("set-cookie");
  assert.ok(value, "Expected a session cookie");
  return value.split(";", 1)[0];
}

async function form(path, fields, cookie = "") {
  const headers = { "content-type": "application/x-www-form-urlencoded", origin: base };
  if (cookie) headers.cookie = cookie;
  return fetch(`${base}${path}`, {
    method: "POST",
    headers,
    body: new URLSearchParams(fields),
    redirect: "manual",
  });
}

try {
  await waitForServer();
  const email = `auth-${crypto.randomUUID()}@example.com`;
  const password = `DemoPass!${crypto.randomUUID().slice(0, 8)}`;

  const signUp = await form("/api/auth/signup", { display_name: "Public Demo User", email, password, return_to: "/" });
  assert.equal(signUp.status, 303);
  const firstCookie = cookieFrom(signUp);

  const accountHistory = await fetch(`${base}/api/conversations`, { headers: { cookie: firstCookie } });
  assert.equal(accountHistory.status, 200);
  const historyBody = await accountHistory.json();
  assert.equal(historyBody.scope, "account");

  const home = await fetch(base, { headers: { cookie: firstCookie, accept: "text/html" } });
  const html = await home.text();
  assert.match(html, /Public Demo User/);
  assert.match(html, /ACCOUNT SYNC ACTIVE/);

  const signOut = await fetch(`${base}/api/auth/signout?return_to=/`, { headers: { cookie: firstCookie }, redirect: "manual" });
  assert.equal(signOut.status, 303);
  assert.match(signOut.headers.get("set-cookie") ?? "", /Max-Age=0/);

  const expiredSession = await fetch(`${base}/api/conversations`, { headers: { cookie: firstCookie } });
  assert.equal(expiredSession.status, 401);

  const badSignIn = await form("/api/auth/signin", { email, password: "wrong-password", return_to: "/" });
  assert.equal(badSignIn.status, 303);
  assert.match(badSignIn.headers.get("location") ?? "", /invalid_credentials/);

  const signIn = await form("/api/auth/signin", { email, password, return_to: "/" });
  assert.equal(signIn.status, 303);
  const secondCookie = cookieFrom(signIn);
  const profile = await fetch(`${base}/api/profile`, { headers: { cookie: secondCookie } });
  assert.equal(profile.status, 200);
  assert.deepEqual((await profile.json()).profile, null);

  const legacySignIn = await fetch(`${base}/signin-with-chatgpt?return_to=/`, { redirect: "manual" });
  assert.ok([303, 307, 308].includes(legacySignIn.status));
  assert.match(legacySignIn.headers.get("location") ?? "", /\/signin/);

  console.log("Verified public signup, secure session cookie, authenticated history, logout invalidation, sign-in, and legacy auth redirects.");
} finally {
  if (server.exitCode === null) server.kill("SIGTERM");
  await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
