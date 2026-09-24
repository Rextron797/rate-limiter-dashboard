const express = require('express');
const RateLimiter = require('./lib/rateLimiter');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const limiter = new RateLimiter();

// seed with a couple of example rules so the dashboard isn't empty on first load
limiter.addRule('demo-client', 5, 1); // 5 tokens, refill 1/sec
limiter.addRule('mobile-app', 3, 0.5); // 3 tokens, refill 0.5/sec

const sha = process.env.GIT_SHA || process.env.RENDER_GIT_COMMIT || 'local';
const commit = sha.slice(0, 7);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function renderPage() {
  const rules = limiter.getRules();
  const log = limiter.getLog();

  const rulesRows = rules
    .map(
      (r) => `<tr>
        <td>${esc(r.clientId)}</td>
        <td>${r.capacity}</td>
        <td>${r.refillRate}/s</td>
        <td>${r.tokensAvailable}</td>
        <td>
          <form method="POST" action="/simulate" style="display:inline">
            <input type="hidden" name="clientId" value="${esc(r.clientId)}">
            <button>Simulate request</button>
          </form>
        </td>
      </tr>`
    )
    .join('');

  const logRows = log
    .map(
      (e) => `<tr style="color:${e.allowed ? 'green' : 'red'}">
        <td>${e.timestamp}</td>
        <td>${esc(e.clientId)}</td>
        <td>${e.allowed ? 'ALLOWED' : 'BLOCKED'}</td>
        <td>${e.tokensAvailable}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head><title>Rate Limiter Dashboard</title></head>
<body>
  <h1>Rate Limiter Dashboard</h1>
  <p>Token-bucket rate limiting simulator. Add a client rule, then simulate requests
  and watch them get allowed or blocked once the bucket runs dry.</p>

  <h2>Client Rules</h2>
  <table border="1" cellpadding="6">
    <tr><th>Client ID</th><th>Capacity</th><th>Refill Rate</th><th>Tokens Now</th><th>Action</th></tr>
    ${rulesRows}
  </table>

  <h3>Add a new rule</h3>
  <form method="POST" action="/rules">
    <input name="clientId" placeholder="Client ID" required>
    <input name="capacity" type="number" min="1" placeholder="Capacity" required>
    <input name="refillRate" type="number" step="0.1" min="0.1" placeholder="Refill rate / sec" required>
    <button>Add rule</button>
  </form>

  <h2>Request Log</h2>
  <table border="1" cellpadding="6">
    <tr><th>Time</th><th>Client</th><th>Result</th><th>Tokens Left</th></tr>
    ${logRows}
  </table>

  <footer><p>commit ${commit}</p></footer>
</body>
</html>`;
}

app.get('/', (req, res) => {
  res.send(renderPage());
});

app.post('/rules', (req, res) => {
  const { clientId, capacity, refillRate } = req.body;
  if (!clientId || !capacity || !refillRate) {
    return res.status(400).send('clientId, capacity and refillRate are required');
  }
  try {
    limiter.addRule(clientId, Number(capacity), Number(refillRate));
  } catch (err) {
    return res.status(400).send(err.message);
  }
  res.redirect('/');
});

app.post('/simulate', (req, res) => {
  const { clientId } = req.body;
  if (!clientId) {
    return res.status(400).send('clientId is required');
  }
  try {
    limiter.allow(clientId);
  } catch (err) {
    return res.status(400).send(err.message);
  }
  res.redirect('/');
});

app.get('/api/rules', (req, res) => {
  res.json(limiter.getRules());
});

app.get('/api/log', (req, res) => {
  res.json(limiter.getLog());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', commit });
});

module.exports = app;
