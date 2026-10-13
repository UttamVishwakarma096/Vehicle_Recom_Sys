# Smart Vehicle Recommendation System

A responsive vehicle discovery and recommendation project. The approved
architecture has a React client and three Node.js services:

- Identity and User Service
- Vehicle Catalog Service
- Recommendation Service

The project is being built incrementally. See [the implementation
plan](docs/11_IMPLEMENTATION_PLAN.md) and [agent
instructions](AGENTS.md) before contributing.

## Current status

Milestones 1 and 2 are complete. Milestone 3 persistence code is in
place; integration verification is pending configured Atlas connection
URIs. Product APIs and authentication remain future milestones. No
real vehicle data is seeded. Longevity prediction is excluded from the
MVP until suitable data and evaluation evidence are approved.

## Requirements

- Node.js 24 LTS
- npm 11 or a compatible npm version

## Setup

From this directory:

```powershell
npm install
```

Create an Atlas cluster and a distinct database user for each service.
Grant each user access only to its matching database:
`vehicle_identity`, `vehicle_catalog`, or `vehicle_recommendations`.
Add the developer machine's public IP to the Atlas network access list.
Copy each service's `.env.example` to `.env`, then replace
`cluster0.example.mongodb.net` and the placeholder username/password
with that service's Atlas values. URL-encode special characters in
credentials. `.env` files are ignored by git; never commit or send
credentials in chat.

Run the client and each API service in separate terminals:

```powershell
npm run dev:client
npm run dev:identity
npm run dev:catalog
npm run dev:recommendation
```

The Vite development server is configured to proxy `/api/v1` routes to
the appropriate local service. Product API routes are still to be
implemented in their planned milestones.

## Validation

```powershell
npm run lint
npm test
npm run build
```

These commands cover the implementation completed so far; they do not
indicate that all planned product features are complete.

## Service foundations

Each service binds to `127.0.0.1` by default with its assigned local
port: Identity/User `4001`, Vehicle Catalog `4002`, and Recommendation
`4003`. Set `HOST` to a hostname or IP address and `PORT` to an integer
from `1` through `65535` to override the defaults. Invalid values cause
the service to fail startup with a safe configuration error. These
settings are read from the process environment and service-local `.env`
file loaded by the Node.js command.

Each service provides `/health`, `/health/live`, and `/health/ready`.
Readiness returns `503` until the service's own database connection and
required indexes are available. Liveness remains independent of
MongoDB. Request bodies must be
JSON and no larger than 64 KiB. Responses include `X-Correlation-ID`,
which is also returned in API errors and used in safe structured logs.
See the [API specification](docs/05_API_SPECIFICATION.md) for details.

## Configuration and data safety

Service defaults are for local development only. No production catalog
import is configured, and no real vehicle data is seeded. Do not add
credentials to this repository. See the security and database documents
before connecting external resources.
