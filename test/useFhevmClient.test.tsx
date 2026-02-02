import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFhevmClient } from "../src/react/useFhevmClient";
import {
  createTestWrapper,
  createMockFhevmInstance,
  ConnectedWrapper,
  DisconnectedWrapper,
  InitializingWrapper,
  ErrorWrapper,
} from "./utils";

describe("useFhevmClient", () => {
  describe("instance", () => {
    it("should return undefined instance when not ready", () => {
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.instance).toBeUndefined();
    });

    it("should return undefined instance when initializing", () => {
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: InitializingWrapper,
      });

      expect(result.current.instance).toBeUndefined();
    });

    it("should return instance when ready", () => {
      const mockInstance = createMockFhevmInstance();
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          instance: mockInstance,
        }),
      });

      expect(result.current.instance).toBe(mockInstance);
    });
  });

  describe("status", () => {
    it("should return idle status when disconnected", () => {
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.status).toBe("idle");
    });

    it("should return initializing status during init", () => {
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: InitializingWrapper,
      });

      expect(result.current.status).toBe("initializing");
    });

    it("should return ready status when initialized", () => {
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.status).toBe("ready");
    });

    it("should return error status on failure", () => {
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: ErrorWrapper,
      });

      expect(result.current.status).toBe("error");
    });
  });

  describe("isReady", () => {
    it("should return false when status is idle", () => {
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.isReady).toBe(false);
    });

    it("should return false when status is initializing", () => {
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: InitializingWrapper,
      });

      expect(result.current.isReady).toBe(false);
    });

    it("should return true when status is ready and instance exists", () => {
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isReady).toBe(true);
    });

    it("should return false when status is ready but no instance", () => {
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          // Use contextOverrides to explicitly set instance to undefined
          // (overriding the auto-created mock instance)
          contextOverrides: { instance: undefined },
        }),
      });

      expect(result.current.isReady).toBe(false);
    });

    it("should return false when status is error", () => {
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: ErrorWrapper,
      });

      expect(result.current.isReady).toBe(false);
    });
  });

  describe("config", () => {
    it("should always provide config", () => {
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.config).toBeDefined();
      expect(result.current.config.chains).toBeDefined();
    });
  });

  describe("refresh", () => {
    it("should provide refresh function", () => {
      const refreshFn = vi.fn();
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          contextOverrides: { refresh: refreshFn },
        }),
      });

      expect(result.current.refresh).toBe(refreshFn);
    });

    it("should call refresh when invoked", () => {
      const refreshFn = vi.fn();
      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          contextOverrides: { refresh: refreshFn },
        }),
      });

      result.current.refresh();

      expect(refreshFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("instance methods", () => {
    it("should allow calling getPublicKey on instance", () => {
      const mockPublicKey = new Uint8Array(32).fill(1);
      const mockInstance = createMockFhevmInstance({
        getPublicKey: vi.fn().mockReturnValue(mockPublicKey),
      });

      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          instance: mockInstance,
        }),
      });

      const publicKey = result.current.instance?.getPublicKey();

      expect(publicKey).toBe(mockPublicKey);
      expect(mockInstance.getPublicKey).toHaveBeenCalled();
    });

    it("should allow calling createEncryptedInput on instance", () => {
      const mockBuilder = { add64: vi.fn(), encrypt: vi.fn() };
      const mockInstance = createMockFhevmInstance({
        createEncryptedInput: vi.fn().mockReturnValue(mockBuilder),
      });

      const { result } = renderHook(() => useFhevmClient(), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          instance: mockInstance,
        }),
      });

      const contractAddress = "0x1234567890123456789012345678901234567890";
      const userAddress = "0xabcdef1234567890abcdef1234567890abcdef12";

      const builder = result.current.instance?.createEncryptedInput(
        contractAddress,
        userAddress
      );

      expect(builder).toBe(mockBuilder);
      expect(mockInstance.createEncryptedInput).toHaveBeenCalledWith(
        contractAddress,
        userAddress
      );
    });
  });
});
