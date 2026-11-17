# Bianco

Website and online ordering for **Bianco**, an Italian restaurant in Madinah.
Customers browse the menu (English / Arabic), fill a cart and pay with Stripe.

One Node.js server serves both the website and the API, on port **3000**.

## Project layout

```
apps/
  bianco-restaurant/   React + Vite website
  api-server/          Express API (menu, cart, payments); also serves the built website
lib/
  db/                  PostgreSQL schema (Drizzle ORM) and SQL migrations
  api-spec/            OpenAPI spec + code generator
  api-zod/             Generated request/response validators
  api-client-react/    Generated React Query hooks used by the website
docs/menu/             Source menu PDFs
Dockerfile             Production image (website + API in one container)
```

## Deploy on Coolify

1. **Create the database.** In your Coolify project: **+ New → Database → PostgreSQL**. Start it, then copy its **Postgres URL (internal)**.
2. **Create the app.** **+ New → Public/Private Repository**, pick this GitHub repo and branch `main`.
   - **Build Pack: `Dockerfile`** (not Nixpacks/Railpack, not Docker Compose)
   - **Base Directory:** `/`
   - **Ports Exposes:** `3000`
3. **Environment variables** (app → Environment Variables):

   | Name | Value | Required |
   | --- | --- | --- |
   | `DATABASE_URL` | the internal Postgres URL from step 1 | yes |
   | `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` (keep "available at build time" on) | for payments |
   | `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` | for payments |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_...` | for payments |

   Do not set `PORT`. The app uses 3000, which matches "Ports Exposes".
4. **Domain.** Under Domains, add your domain, for example `https://bianco.example.com`.
5. **Deploy.** In the logs you should see `Server listening` and then `Database is ready.`
   Open `https://YOUR_DOMAIN/api/healthz`: it must say `"database":"ready"`.

The tables and the starting menu are created automatically on the first start.
Nothing needs to be run by hand.

The menu (and the dish slider above it) is also built into the server, so it still shows
while the database is not connected. The cart and checkout do need the database.

**Stripe webhook:** in the Stripe dashboard, point a webhook to
`https://YOUR_DOMAIN/api/stripe/webhook` with the events
`payment_intent.succeeded` and `payment_intent.payment_failed`, then put its signing
secret in `STRIPE_WEBHOOK_SECRET`.

### If something goes wrong

| What you see | Fix |
| --- | --- |
| "Bad Gateway" / "no available server" | Ports Exposes must be `3000`, and `PORT` must not be set to anything else. |
| Logs show Python / `main.py` | Build Pack must be **Dockerfile**. |
| Menu shows but "Add to order" / the cart fails | The database is not connected. `/api/healthz` shows `"database":"not_configured"` (set `DATABASE_URL`) or `"connecting"` (the URL is wrong or the database is stopped; the logs say `Database is not ready yet`). |
| Payment button does nothing | Set `VITE_STRIPE_PUBLISHABLE_KEY`, then **redeploy** (it is built into the website). |

Health check URL: `/api/healthz`.

## Run locally

Needs Node.js 22+ and pnpm (`npm install -g pnpm`), plus a PostgreSQL database.

```bash
pnpm install
cp .env.example .env      # then fill in DATABASE_URL (and Stripe keys if needed)

pnpm dev:api              # API on http://localhost:3000
pnpm dev:web              # website on http://localhost:5173 (forwards /api to :3000)
```

Production-style run: `pnpm build` then `pnpm start` (everything on http://localhost:3000).

Other commands:

- `pnpm typecheck`: type-check every package
- `pnpm db:generate`: after editing `lib/db/src/schema`, create a new SQL migration in
  `lib/db/migrations` and commit it. It is applied automatically on the next deploy.
- `pnpm codegen`: after editing `lib/api-spec/openapi.yaml`, regenerate the API hooks and validators

> **Windows note:** if `pnpm install` or `pnpm build` fails with "An Application Control
> policy has blocked this file", Windows Smart App Control is blocking the build tools
> (esbuild/rollup). This only affects your PC, not the Coolify deploy.
