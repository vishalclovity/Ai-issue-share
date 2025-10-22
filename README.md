# AI Backlog Manager — README

A lightweight Atlassian Forge app that provides backlog analytics and a one-click pipeline to push project summaries to an external service. This codebase follows a clean **processors + utils** architecture with centralized logging and minimal resolver wiring.

---

## Features

* **List Projects:** Paginated fetch of non-archived Jira projects (REST v3).
* **Process One Project:** Fetch issues for a project, compute metrics & a simplified issue model and push the payload to an external endpoint.
* **Query:** Pass-through query to the same external service.
* **Last Scan State:** Persist and read a `lastScannedAt` timestamp per org via Forge storage.

---

## Architecture

```
src/
  index.js                    # Resolver wiring (Forge handler)
  processors/
    projectService.js         # Jira API calls (listAllProjects, fetchAllIssues)
    aggregateService.js       # Build simplified issues & project metrics
    pipeline.js               # Orchestrates "process-one-project" and "query" calls
  utils/
    logger.js                 # Centralized logging (info/warn/error)
static/
  global-frontend/            # Existing Custom UI (React)
```

**Why this structure?**

* Clear separation of concerns
* Easy to extend with additional processors
* Testable units (API calls vs transformations)
* Consistent developer experience across projects

---

## Folder Structure

```
src/
  index.js
  processors/
    aggregateService.js
    pipeline.js
    projectService.js
  utils/
    logger.js
static/
  global-frontend/
manifest.yml
package.json
README.md
```

---

## Resolvers (Server API)

All resolver keys and payload shapes are compact and stable.

### `list-all-projects`

Returns non-archived projects from `/rest/api/3/project/search` (paginated).

```jsonc
// Response (abridged)
[
  { "id": "10001", "key": "ABC", "name": "Alpha", ... },
  { "id": "10002", "key": "XYZ", "name": "Beta", ... }
]
```

### `process-one-project`

Fetches issues using **POST** `/rest/api/3/search`, builds a concise backlog payload and pushes it to an external endpoint `POST /v0/api/sqs/send`.

**Request payload:**

```json
{
  "project": { "id": "10001", "key": "ABC", "name": "Alpha" },
  "cloudId": "your-org-cloud-id"
}
```

**Success response:**

```json
{ "success": true }
```

If the project has no issues:

```json
{ "success": true, "skipped": true, "message": "Skipped ABC, no issues." }
```

### `querybacklogmanagement`

Pass-through query to `POST /v0/api/query`.

**Request payload:**

```json
{
  "query": "show me summary",
  "event": "backlogmanagement",
  "orgId": "your-org-cloud-id"
}
```

**Response:**

```json
{ "success": true, "data": { /* upstream JSON */ } }
```

### `setLastScannedAt`

```json
{ "orgId": "your-org-cloud-id", "ts": 1715000000000 }
```

**Response:** `{ "success": true }`

### `getLastScannedAt`

```json
{ "orgId": "your-org-cloud-id" }
```

**Response:** `{ "lastScannedAt": 1715000000000 }` or `{ "lastScannedAt": null }`

---

## Environment Variables

Set via **Forge Variables** for each environment (`development`, `staging`, `production`).

* `APP_RUNNER_API_KEY` **(required in production)**: API key for the external service.
* `APP_RUNNER_BASE_URL` *(optional)*: Defaults to `https://forgeapps.clovity.com`.

**Examples:**

```bash
forge variables set --env production APP_RUNNER_API_KEY=xxxxx
forge variables set --env production APP_RUNNER_BASE_URL=https://forgeapps.clovity.com
```

---

## Setup & Development

```bash
# Install dependencies
npm install

# (Optional) Lint & format
npm run lint
npm run format

# Local development (Forge)
forge login
forge tunnel     # stream logs while interacting with the app
```

> The Custom UI lives under `static/global-frontend/`. Use your normal build process for React/Tailwind as configured.

---

## Build & Deploy (Forge)

```bash
forge deploy
forge install     # first time prompts for product & site
forge logs
```

---

## Frontend Integration

Use **@forge/bridge** to invoke resolvers from the Custom UI.

```js
import { invoke } from '@forge/bridge';

// 1) Projects list
const projects = await invoke('list-all-projects');

// 2) Process one project
const result = await invoke('process-one-project', {
  project: { id: '10001', key: 'ABC', name: 'Alpha' },
  cloudId: 'your-org-cloud-id'
});

// 3) Query
const queryResp = await invoke('querybacklogmanagement', {
  query: 'show summary',
  event: 'backlogmanagement',
  orgId: 'your-org-cloud-id'
});

// 4) Storage helpers
await invoke('setLastScannedAt', { orgId: 'your-org-cloud-id', ts: Date.now() });
const { lastScannedAt } = await invoke('getLastScannedAt', { orgId: 'your-org-cloud-id' });
```

---

## Logging

Centralized logger with ISO timestamps and JSON-serialized context:

```js
import { logger } from './utils/logger.js';

logger.info('message', { context: 'value' });
logger.warn('something odd', details);
logger.error('something failed', error);
```

The logger prints consistent, parseable lines suitable for ingestion into log tooling.

---

## Troubleshooting

* **403/401 to external service:** Ensure `APP_RUNNER_API_KEY` is set for the active Forge environment (`forge variables list`).
* **No projects returned:** Verify user permissions and that projects are not archived.
* **Jira search errors:** Using **POST** `/rest/api/3/search` avoids URL length limits. Check JQL, fields and permissions.
* **Module import errors:** This project uses ESM (`import`/`export`). Include file extensions in imports (e.g., `./processors/pipeline.js`).

---

## Migration Notes

* The previous monolithic server file has been split into:

  * `processors/projectService.js` → Jira REST calls (list & search)
  * `processors/aggregateService.js` → Issue simplification & metrics
  * `processors/pipeline.js` → Orchestration & remote calls
* Resolver keys did **not** change. UI invocations remain the same.
* If present, a legacy server file may be kept (e.g., `src/index.legacy.js`) for reference only.

---

## License

MIT