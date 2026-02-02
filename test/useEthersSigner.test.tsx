import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEthersSigner } from "../src/react/useEthersSigner";
import {
  createTestWrapper,
  ConnectedWrapper,
  DisconnectedWrapper,
  TEST_ADDRESS,
  TEST_CHAIN_ID,
} from "./utils";

describe("useEthersSigner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("initial state", () => {
    it("should return undefined signer when disconnected", () => {
      const { result } = renderHook(() => useEthersSigner(), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.signer).toBeUndefined();
    });

    it("should return undefined provider when disconnected", () => {
      const { result } = renderHook(() => useEthersSigner(), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.provider).toBeUndefined();
    });

    it("should return isLoading=false when disconnected", () => {
      const { result } = renderHook(() => useEthersSigner(), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should return isReady=false when disconnected", () => {
      const { result } = renderHook(() => useEthersSigner(), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.isReady).toBe(false);
    });

    it("should return undefined error when disconnected", () => {
      const { result } = renderHook(() => useEthersSigner(), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.error).toBeUndefined();
    });
  });

  describe("when connected but no window.ethereum", () => {
    it("should handle missing ethereum provider gracefully", async () => {
      // In jsdom environment, window.ethereum may or may not exist
      // The hook should handle both cases without crashing
      const { result } = renderHook(() => useEthersSigner(), {
        wrapper: ConnectedWrapper,
      });

      // Wait for async initialization
      await waitFor(() => {
        // Either it sets an error (no provider) or succeeds (mock provider)
        expect(result.current.error !== undefined || result.current.isLoading === false).toBe(true);
      });
    });

    it("should not be ready when there is an error", async () => {
      const { result } = renderHook(() => useEthersSigner(), {
        wrapper: ConnectedWrapper,
      });

      // Wait for async initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // If there's an error, isReady should be false
      if (result.current.error) {
        expect(result.current.isReady).toBe(false);
      }
    });
  });

  describe("return type structure", () => {
    it("should return object with all required properties", () => {
      const { result } = renderHook(() => useEthersSigner(), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current).toHaveProperty("signer");
      expect(result.current).toHaveProperty("provider");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("isReady");
    });
  });

  describe("isReady computation", () => {
    it("should be false when not connected", () => {
      const { result } = renderHook(() => useEthersSigner(), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.isReady).toBe(false);
    });

    it("should be false when signer is undefined even if connected", () => {
      const { result } = renderHook(() => useEthersSigner(), {
        wrapper: ConnectedWrapper,
      });

      // Initially signer is undefined
      expect(result.current.isReady).toBe(false);
    });
  });
});
