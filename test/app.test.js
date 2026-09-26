const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');

function startServer() {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base };
}

test('health route responds ok', async () => {
  const { server, base } = startServer();
  const health = await (await fetch(`${base}/health`)).json();
  assert.equal(health.status, 'ok' // change here
  server.close();
});

test('adding a rule via form and reading it back via API', async () => {
  const { server, base } = startServer();

  const res = await fetch(`${base}/rules`, {
    method: 'POST',
    body: new URLSearchParams({ clientId: 'test-client', capacity: '2', refillRate: '1' }),
    redirect: 'manual',
  });
  assert.equal(res.status, 302);

  const rules = await (await fetch(`${base}/api/rules`)).json();
  const rule = rules.find((r) => r.clientId === 'test-client');
  assert.ok(rule, 'new rule should appear in /api/rules');
  assert.equal(rule.capacity, 2);

  server.close();
});

test('rejects a rule with missing fields', async () => {
  const { server, base } = startServer();

  const res = await fetch(`${base}/rules`, {
    method: 'POST',
    body: new URLSearchParams({ clientId: 'bad-client' }), // missing capacity/refillRate
  });
  assert.equal(res.status, 400);

  server.close();
});

test('requests are blocked once the token bucket is empty', async () => {
  const { server, base } = startServer();

  // create a client with a very small bucket and a slow refill so it won't
  // recover mid-test
  await fetch(`${base}/rules`, {
    method: 'POST',
    body: new URLSearchParams({ clientId: 'limited-client', capacity: '2', refillRate: '0.001' }),
  });

  // first 2 requests should be allowed, the 3rd should be blocked
  await fetch(`${base}/simulate`, { method: 'POST', body: new URLSearchParams({ clientId: 'limited-client' }) });
  await fetch(`${base}/simulate`, { method: 'POST', body: new URLSearchParams({ clientId: 'limited-client' }) });
  await fetch(`${base}/simulate`, { method: 'POST', body: new URLSearchParams({ clientId: 'limited-client' }) });

  const log = await (await fetch(`${base}/api/log`)).json();
  const entries = log.filter((e) => e.clientId === 'limited-client').reverse(); // oldest first

  assert.equal(entries[0].allowed, true);
  assert.equal(entries[1].allowed, true); //change here
  assert.equal(entries[2].allowed, false);

  server.close();
});
