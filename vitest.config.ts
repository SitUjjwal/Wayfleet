import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    restoreMocks: true,
    clearMocks: true,
    env: {
      AUTH_SECRET: "test-only-auth-secret-not-for-production",
      AUTH_URL: "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "server-only": path.resolve(process.cwd(), "tests/shims/server-only.ts"),
      "@vis.gl/react-google-maps": path.resolve(
        process.cwd(),
        "tests/shims/vis-gl-maps.tsx",
      ),
    },
  },
});
