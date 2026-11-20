// Builds the website for the browser tests: talking to the fake server at
// http://api.test/api only. .env files are ignored (.env.production would
// point it at the live site) and Metro's cache is cleared, because the
// cache keeps the API address from an earlier build.
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["expo", "export", "--platform", "web", "--output-dir", "dist-e2e", "--clear"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, EXPO_NO_DOTENV: "1", EXPO_PUBLIC_API_URL: "http://api.test/api" },
});
process.exit(result.status ?? 1);
