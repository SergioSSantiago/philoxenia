/**
 * Apply patches/ via patch-package after install.
 *
 * - Web monorepo install has starknetkit → apply Ready X deep-link patch.
 * - API (or any install without starknetkit) → no-op. patch-package errors if
 *   a patch exists for a package that is not in node_modules.
 */
const { existsSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");

const root = join(__dirname, "..");
const patchesDir = join(root, "patches");
const starknetkitDir = join(root, "node_modules", "starknetkit");

if (!existsSync(patchesDir)) {
  process.exit(0);
}

if (!existsSync(starknetkitDir)) {
  console.log(
    "postinstall-patches: skipping (starknetkit not installed in this install)"
  );
  process.exit(0);
}

const result = spawnSync("npx", ["patch-package"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
