import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    exclude: ["tests/e2e/**", "node_modules/**"],
    env: {
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "vitest-test-encryption-key-32-chars!!",
      RESEND_API_KEY: "re_mock_key",
      STRIPE_SECRET_KEY: "sk_test_mock_key",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
