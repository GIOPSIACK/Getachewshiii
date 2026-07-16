// Vercel Serverless Function for the Express API.
// The real app is pre-bundled to ./server.mjs by scripts/build-vercel-api.mjs
// (run as part of the Vercel build). We just re-export the bundled
// Express app as the default handler. This avoids Vercel's tsc type-check
// of the API source.
import app from "./server.mjs";

export default app;
