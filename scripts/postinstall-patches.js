/**
 * Apply patches/ via patch-package after install.
 * Vercel production installs omit devDependencies; patch-package lives in
 * dependencies so this always runs when the monorepo root is installed (web).
 * No-op if there is no patches directory (e.g. odd install layouts).
 */
const { existsSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");

const root = join(__dirname, "..");
const patchesDir = join(root, "patches");

if (!existsSync(patchesDir)) {
  process.exit(0);
}

const result = spawnSync("npx", ["patch-package"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
