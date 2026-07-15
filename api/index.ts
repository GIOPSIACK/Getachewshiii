// Vercel serverless entry for the Express API.
// Vercel treats any file under /api as a Serverless Function. We export the
// already-built Express `app` (from artifacts/api-server/src/app) as the
// default handler. Do NOT import src/index.ts here — that file calls
// app.listen() and requires process.env.PORT, which does not apply to Vercel.
import app from "../artifacts/api-server/src/app";

export default app;
