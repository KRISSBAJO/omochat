const { spawnSync } = require("node:child_process");
const { join } = require("node:path");

delete process.env.PRISMA_GENERATE_NO_ENGINE;

const command =
  process.platform === "win32" ? "npx prisma generate" : "npx prisma generate";

const result = spawnSync(command, {
  cwd: join(__dirname, ".."),
  stdio: "inherit",
  env: process.env,
  shell: true
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
