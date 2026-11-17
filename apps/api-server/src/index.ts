import { databaseUrl, pool, runMigrations } from "@workspace/db";
import app from "./app";
import { logger } from "./lib/logger";
import { setDatabaseState } from "./lib/database-state";
import { seedMenuCatalogIfEmpty } from "./lib/menu-catalog";
import { migrationsDir } from "./lib/paths";

const rawPort = process.env["PORT"]?.trim() || "3000";
const port = Number(rawPort);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Creates the tables and the starting menu. Retries until the database is
// reachable, so a slow-starting database does not take the website down.
async function prepareDatabase(): Promise<void> {
  if (!databaseUrl) {
    setDatabaseState("not_configured");
    logger.error(
      "DATABASE_URL is not set. The website and menu are online, but the cart and checkout need a PostgreSQL database.",
    );
    return;
  }

  for (let attempt = 1; ; attempt++) {
    try {
      await runMigrations(migrationsDir);
      const seeded = await seedMenuCatalogIfEmpty();
      if (seeded) {
        logger.info("Seeded the Bianco menu catalog.");
      }
      setDatabaseState("ready");
      logger.info("Database is ready.");
      return;
    } catch (err) {
      const retryInMs = Math.min(30_000, attempt * 2_000);
      logger.error(
        { err, attempt, retryInMs },
        "Database is not ready yet. Check DATABASE_URL. Retrying.",
      );
      await wait(retryInMs);
    }
  }
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  void prepareDatabase();
});

// Docker sends SIGTERM on redeploy; close cleanly instead of waiting to be killed.
function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  server.close(() => {
    void pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(0), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
