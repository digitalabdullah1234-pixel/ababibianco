import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getDatabaseState } from "../lib/database-state";

const router: IRouter = Router();

// Always 200 while the server runs (the Docker health check relies on that).
// `database` shows whether PostgreSQL is connected: ready, connecting or not_configured.
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json({ ...data, database: getDatabaseState() });
});

export default router;
