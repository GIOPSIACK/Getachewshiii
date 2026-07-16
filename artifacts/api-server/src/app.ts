import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import telegramRouter from "./routes/telegram";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const app: Express = express();

app.get("/api/ping", (_req, res) => {
  res.json({
    alive: true,
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    databaseUrlHost: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.split("@")[1]?.split("/")[0]
      : null,
    nodeEnv: process.env.NODE_ENV,
  });
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use("/telegram", telegramRouter);

app.get("/api/debug-db", async (_req, res) => {
  try {
    const result = await pool.query("select 1 as ok");
    res.json({ ok: true, row: result.rows[0] });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    });
  }
});

export default app;
