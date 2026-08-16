/**
 * Apply patches/ via patch-package. Intended for @philoxenia/web postinstall only
 * (API must never run this — it does not install starknetkit).
 *
 * Always exits 0 if starknetkit is missing so a mistaken invoke cannot fail API builds.
 */
const { existsSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");

const root = join(__dirname, "..");
const patchesDir = join(root, "patches");
const starknetkitPkg = join(root, "node_modules", "starknetkit", "package.json");

if (!existsSync(patchesDir) || !existsSync(starknetkitPkg)) {
  console.log(
    "postinstall-patches: skip (no patches dir or starknetkit package.json)"
  );
  process.exit(0);
}

const result = spawnSync("npx", ["patch-package"], {
  cwd: root,
  encoding: "utf8",
  shell: process.platform === "win32",
  env: process.env,
});

const out = `${result.stdout || ""}${result.stderr || ""}`;
if (out) process.stdout.write(out);

if (result.status === 0) {
  process.exit(0);
}

if (/not present at node_modules/i.test(out)) {
  console.log("postinstall-patches: skip (patched package not installed)");
  process.exit(0);
}

process.exit(result.status === null ? 1 : result.status);
