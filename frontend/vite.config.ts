import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  envDir: "..",
  envPrefix: ["VITE_", "PUBLIC_"],
  plugins: [react()],
  server: {
    allowedHosts: [".trycloudflare.com"],
  },
});
