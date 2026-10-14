import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://shaqlah:shaqlah@localhost:5432/shaqlah_test",
      AUTH_SECRET: "test-secret-test-secret-test-secret-123456",
      APP_URL: "http://localhost:3000",
      NODE_ENV: "test",
    },
  },
});
