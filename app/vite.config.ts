import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Build web para laptop/proyector. Sin backend, sin proxy y sin CDN externo:
// todo lo que la demo necesita se empaqueta localmente (PLAN-001, riesgo "CDN/red").
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
