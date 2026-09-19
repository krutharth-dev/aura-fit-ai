import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { registerHooks } from 'node:module';
const sqlite = new DatabaseSync(':memory:');
function statement(sql, values = []) {
  return {
    bind(...args) { return statement(sql, args); },
    async run() { return sqlite.prepare(sql).run(...values); },
    async first() { return sqlite.prepare(sql).get(...values) ?? null; },
    async all() { return {results: sqlite.prepare(sql).all(...values)}; }
  };
}
globalThis.__auraTestEnv = { DB: { prepare: statement, async batch(statements) { const results = []; for (const s of statements) results.push(await s.run()); return results; } } };
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'cloudflare:workers') return {url:'data:text/javascript,export const env = globalThis.__auraTestEnv;',shortCircuit:true};
  return nextResolve(specifier,context);
} });
const {default:worker} = await import('../dist/server/index.js');
const base = 'https://aura-fit.test';
const runtime = {...globalThis.__auraTestEnv, ASSETS:{fetch:async()=>new Response('',{status:404})}};
const context = {waitUntil(){},passThroughOnException(){}};
const cookies = new Map();
async function signUp(email) {
  const response = await worker.fetch(new Request(`${base}/api/auth/signup`, {method:'POST',headers:{Origin:base},body:new URLSearchParams({display_name:'Journal test',email,password:'Testing-only-strong-123!',return_to:'/training'})}),runtime,context);
  assert.equal(response.status,303);
  assert.equal(response.headers.get('Location'),`${base}/training`);
  cookies.set(email,response.headers.get('set-cookie').split(';')[0]);
}
const owner = `journal-test-${Date.now()}@example.com`;
const other = `journal-other-${Date.now()}@example.com`;
async function api(method, email, body, id) {
  return worker.fetch(new Request(`${base}/api/workouts${id ? `?id=${id}` : ''}`, { method, headers: { ...(email ? {cookie:cookies.get(email)} : {}), 'Content-Type':'application/json' }, body: body ? JSON.stringify(body) : undefined }), runtime, context);
}
test('journal rejects guests and invalid entries; isolates account reads and deletions', async () => {
  assert.equal((await api('GET')).status,401);
  const spoof = await worker.fetch(new Request(`${base}/api/workouts`,{headers:{'oai-authenticated-user-email':owner}}),runtime,context);
  assert.equal(spoof.status,401);
  await signUp(owner); await signUp(other);
  const entry = {title:'Test session',date:'2026-09-19',minutes:45,notes:'Test-only record',exercises:[{name:'Squat',sets:3,reps:8,weight:60}]};
  assert.equal((await api('POST', owner, {...entry,date:'2026-02-30'})).status,400);
  assert.equal((await api('POST', owner, {...entry,exercises:[{name:'Squat',sets:-1,reps:8,weight:60}]})).status,400);
  const saved = await api('POST', owner, entry);
  assert.equal(saved.status,201);
  const {entry:created} = await saved.json();
  try {
    const own = await (await api('GET',owner)).json();
    assert.equal(own.entries.find(x=>x.id===created.id).exercises[0].weight,60);
    const foreign = await (await api('GET',other)).json();
    assert.equal(foreign.entries.some(x=>x.id===created.id),false);
    await api('DELETE',other,undefined,created.id);
    assert.equal((await (await api('GET',owner)).json()).entries.some(x=>x.id===created.id),true);
  } finally { assert.equal((await api('DELETE',owner,undefined,created.id)).status,200); }
  assert.equal((await (await api('GET',owner)).json()).entries.some(x=>x.id===created.id),false);
});
