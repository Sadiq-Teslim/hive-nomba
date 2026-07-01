import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.routes.js";
import { chatRouter } from "./routes/chat.routes.js";
import { whatsappRouter } from "./routes/whatsapp.routes.js";
import { twilioRouter } from "./routes/twilio.routes.js";
import { nombaRouter } from "./routes/nomba.routes.js";
import { mockRouter } from "./routes/mock.routes.js";
import { payRouter } from "./routes/pay.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { notFound, errorHandler } from "./middleware/error.js";

export function createApp() {
  const app = express();

  app.use(cors());

  // Nomba webhook needs the raw body for signature verification — mount it first.
  app.use("/api/webhooks/nomba", express.raw({ type: "*/*" }));

  // Everything else uses JSON / urlencoded.
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/", healthRouter);
  app.use("/api", chatRouter);
  app.use("/api", whatsappRouter);
  app.use("/api", twilioRouter);
  app.use("/api", nombaRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/", mockRouter);
  app.use("/", payRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
