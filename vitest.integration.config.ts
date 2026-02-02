import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/integration/**/*.test.{ts,tsx}"],
    setupFiles: ["./test/integration/setup.ts"],
    testTimeout: 10000, // Integration tests timeout
    hookTimeout: 10000,
    sequence: {
      shuffle: false, // Run tests in order
    },
  },
});
