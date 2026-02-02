import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Use the SDK source directly for testing
      "@zama-fhe/sdk": path.resolve(__dirname, "../../src"),
    },
  },
  server: {
    port: 5173,
  },
});
