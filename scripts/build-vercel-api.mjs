// Builds the Express API into a single self-contained Vercel Serverless Function.
// Run by Vercel (via the `buildCommand` in vercel.json) so the function
// is ready before Vercel bundles it. Avoids Vercel's tsc type-check of
// the API source (which uses node16 moduleResolution + loose types).
import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

globalThis.require = createRequire(import.meta.url);

await build({
  entryPoints: [path.resolve(artifactDir, "artifacts/api-server/src/app.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: path.resolve(artifactDir, "api/index.mjs"),
  outExtension: { ".js": ".mjs" },
  target: "node22",
  external: [
    "*.node",
    "sharp",
    "better-sqlite3",
    "sqlite3",
    "bcrypt",
    "argon2",
    "pg-native",
    "canvas",
    "fsevents",
    "re2",
  ],
  banner: {
    js: `import { createRequire as __cr } from 'node:module';
import __p from 'node:path';
import __u from 'node:url';
globalThis.require = __cr(import.meta.url);
globalThis.__filename = __u.fileURLToPath(import.meta.url);
globalThis.__dirname = __p.dirname(globalThis.__filename);`,
  },
});

console.log("Built api/server.mjs");
