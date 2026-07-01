import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  logger.error({ err }, "Unhandled request error");
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
}
