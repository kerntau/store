# Project Structure

`modern-faka` is the active project. The old PHP source is not part of this repository.

## Top Level

- `api/` Go backend service.
- `web/` React + Vite frontend and admin console.
- `deploy/` database schema and Docker Compose deployment files.
- `docs/` project notes and operating documentation.

## Backend

- `api/cmd/server/` HTTP server entrypoint.
- `api/internal/app/` routing, handlers, fulfillment, payment callback, mailer, admin APIs.
- `api/internal/config/` environment-based configuration.

## Frontend

- `web/src/public/` buyer-facing pages.
- `web/src/admin/` admin pages and reusable admin UI helpers.
- `web/src/api/` frontend API client and shared DTO types.
- `web/public/` static public assets.

## Ignored Local Runtime Folders

- `.tools/` local toolchains and database binaries.
- `.logs/` local run logs.
- `.cache/` local build/test cache.
- `web/node_modules/`, `web/dist/`, `web/.vite/` frontend dependencies and build outputs.
