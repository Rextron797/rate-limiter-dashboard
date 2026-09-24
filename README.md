# Rate Limiter Dashboard

A dynamic web app that simulates a **token bucket rate limiter**. You define
rate-limit rules for different clients (capacity + refill rate), then fire
simulated requests and watch them get allowed or blocked live once a client's
bucket runs dry — the same mechanism real APIs use to stop being overwhelmed
by too many requests.

## Features

- Home page (`/`) — server-rendered dashboard showing current client rules
  and a live request log
- `POST /rules` — form to add a new rate-limit rule for a client
- `POST /simulate` — form to fire a simulated request for a client and see
  whether it's allowed or blocked
- `GET /api/rules` — JSON API of current rules and token levels
- `GET /api/log` — JSON API of the request log
- `GET /health` — health check endpoint
- Footer shows the running commit ID

## Run locally

```bash
npm install
npm test        # run automated tests
npm run lint     # run eslint
npm start        # open http://localhost:3000
```

## Run with Docker

```bash
docker build -t rate-limiter-dashboard .
docker run -p 3000:3000 rate-limiter-dashboard
```

## CI/CD Pipeline

```
git push → Lint → Test → Docker Build + Smoke Test → Deploy (Render) → Live site
```

- **test** job — installs dependencies, lints, runs automated tests
- **build** job — builds the Docker image and smoke-tests `/health`
- **deploy** job — only runs on pushes to `main`, and only after `build`
  succeeds; triggers a Render deploy hook

If any test fails, the `build` and `deploy` jobs are skipped — a broken
change never reaches the live site.

## Tech stack

- Node.js + Express
- `node:test` for automated tests
- ESLint for linting
- Docker for containerization
- GitHub Actions for CI/CD
- Render for hosting
