import { Router } from "express";
import { features } from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "hive-api",
    time: new Date().toISOString(),
    integrations: features,
  });
});
