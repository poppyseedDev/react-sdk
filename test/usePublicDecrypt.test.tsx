import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePublicDecrypt } from "../src/react/usePublicDecrypt";
import {
  createTestWrapper,
  createMockFhevmInstance,
  createMockEip1193Provider,
  ConnectedWrapper,
  DisconnectedWrapper,
  InitializingWrapper,
  MOCK_HANDLE,
} from "./utils";

describe("usePublicDecrypt", () => {
  const handle1 = "0x" + "11".repeat(32);
  const handle2 = "0x" + "22".repeat(32);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canDecrypt", () => {
    it("should return false when not connected", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return false when initializing", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: InitializingWrapper,
      });

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return false when handles is undefined", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: undefined }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return false when handles is empty array", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [] }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return false when all handles are undefined", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [undefined, undefined] }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return true when ready with valid handles", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.canDecrypt).toBe(true);
    });

    it("should filter out undefined handles and still be valid", () => {
      const { result } = renderHook(
        () => usePublicDecrypt({ handles: [undefined, handle1, undefined] }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.canDecrypt).toBe(true);
    });
  });

  describe("initial state", () => {
    it("should start with isIdle=true", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isIdle).toBe(true);
    });

    it("should start with isDecrypting=false", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isDecrypting).toBe(false);
    });

    it("should start with isSuccess=false", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isSuccess).toBe(false);
    });

    it("should start with isError=false", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isError).toBe(false);
    });

    it("should start with empty clearValues", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.clearValues).toEqual({});
    });

    it("should start with undefined result", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.result).toBeUndefined();
    });

    it("should start with empty message", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.message).toBe("");
    });

    it("should start with null error", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("decrypt function", () => {
    it("should provide decrypt function", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      expect(typeof result.current.decrypt).toBe("function");
    });

    it("should do nothing when canDecrypt is false", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: undefined }), {
        wrapper: ConnectedWrapper,
      });

      act(() => {
        result.current.decrypt();
      });

      expect(result.current.isDecrypting).toBe(false);
      expect(result.current.isIdle).toBe(true);
    });
  });

  describe("decryptAsync function", () => {
    it("should provide decryptAsync function", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      expect(typeof result.current.decryptAsync).toBe("function");
    });

    it("should return undefined when canDecrypt is false", async () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: undefined }), {
        wrapper: ConnectedWrapper,
      });

      const decrypted = await result.current.decryptAsync();

      expect(decrypted).toBeUndefined();
    });
  });

  describe("clearError function", () => {
    it("should provide clearError function", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      expect(typeof result.current.clearError).toBe("function");
    });

    it("should not throw when called", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      expect(() => result.current.clearError()).not.toThrow();
    });
  });

  describe("multiple handles", () => {
    it("should accept multiple handles", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1, handle2] }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.canDecrypt).toBe(true);
    });
  });

  describe("undefined params", () => {
    it("should handle undefined params gracefully", () => {
      const { result } = renderHook(() => usePublicDecrypt(undefined), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.canDecrypt).toBe(false);
      expect(result.current.clearValues).toEqual({});
    });
  });

  describe("status flags consistency", () => {
    it("should have mutually exclusive initial status", () => {
      const { result } = renderHook(() => usePublicDecrypt({ handles: [handle1] }), {
        wrapper: ConnectedWrapper,
      });

      // Initially should be idle
      expect(result.current.isIdle).toBe(true);
      expect(result.current.isDecrypting).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });
});
