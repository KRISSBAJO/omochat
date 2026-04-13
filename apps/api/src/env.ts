import { existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

const workspaceEnvPath = join(process.cwd(), "../../.env");

config({
  path: existsSync(workspaceEnvPath) ? workspaceEnvPath : ".env"
});
