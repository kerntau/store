# Modern Faka

Lightweight card-delivery storefront for digital goods and manual/automatic fulfillment.

## Stack

- API: Go, PostgreSQL, Redis
- Web: React, Vite, TypeScript
- UI: Material UI for buyer pages and admin pages

## Scope

This version keeps the card-selling workflow and drops the original project's heavy
member, substation, supplier, sharing-store, app-store, and promotion systems.

Core flow:

1. Buyer chooses a product and creates an order.
2. Payment callback marks the order paid.
3. Auto-delivery products immediately allocate card inventory and expose the secret.
4. Manual-delivery products wait for an admin to fill delivery content.
5. Buyer queries by order number plus email or query password.

## Layout

- `api/` Go backend
- `web/` React frontend and admin
- `deploy/` PostgreSQL migration and environment examples
- `docs/` project structure and operation notes

See `docs/STRUCTURE.md` for the directory map.

## Local Prerequisites

This machine currently has Node.js available. Go and Docker are required to run the
API locally.

## Docker

```powershell
cd deploy
docker compose up -d --build
```

Open `http://127.0.0.1:8080`.

Default admin:

- Email: `admin@example.com`
- Password: `password`
