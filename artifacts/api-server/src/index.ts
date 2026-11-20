import app from "./app";
import { logger } from "./lib/logger";

// Vercel serverless: export the app so Vercel can invoke it.
// Locally (or `vercel dev`) we start a real server when PORT is provided.
export default app;

if (process.env["PORT"]) {
  const rawPort = process.env["PORT"];
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}
