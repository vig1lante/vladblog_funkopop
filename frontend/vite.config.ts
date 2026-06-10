import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const currentDir = dirname(fileURLToPath(import.meta.url));

function loadAppConfig(): unknown {
  const configPaths = [
    process.env.APP_CONFIG_PATH,
    resolve(currentDir, "..", "config.json"),
    resolve(currentDir, "config.json"),
  ].filter((configPath): configPath is string => Boolean(configPath));

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, "utf8"));
    }
  }

  return {};
}

export default defineConfig({
  define: {
    __APP_CONFIG__: JSON.stringify(loadAppConfig()),
  },
  envDir: "..",
  envPrefix: ["VITE_", "PUBLIC_"],
  plugins: [react()],
  server: {
    allowedHosts: [".trycloudflare.com"],
  },
});
