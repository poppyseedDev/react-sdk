/**
 * Integration test setup file.
 *
 * This file runs before all integration tests to set up the test environment.
 */

import { vi } from "vitest";

// Set up global mocks that integration tests may need

// Mock crypto.randomUUID if not available (Node < 19)
if (typeof crypto === "undefined" || !crypto.randomUUID) {
  vi.stubGlobal("crypto", {
    randomUUID: () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  });
}

// Set longer timeout for integration tests
vi.setConfig({
  testTimeout: 30000,
  hookTimeout: 30000,
});
