// Vercel Serverless Function for the Express API.
// This file is produced by scripts/build-vercel-api.mjs during the Vercel
// build (it bundles artifacts/api-server/src/app.ts into this single .mjs).
// Vercel treats .mjs functions as already-built and does NOT run tsc on them,
// which avoids the node16 moduleResolution / strict-type errors.
import app from "./index.mjs";

export default app;
