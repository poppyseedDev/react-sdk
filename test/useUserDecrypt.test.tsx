import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useUserDecrypt } from "../src/react/useUserDecrypt";
import {
  createTestWrapper,
  createMockFhevmInstance,
  createMockEip1193Provider,
  ConnectedWrapper,
  DisconnectedWrapper,
  InitializingWrapper,
  MOCK_HANDLE,
  TEST_ADDRESS,
} from "./utils";

// Mock the FhevmDecryptionSignature module
vi.mock("../src/FhevmDecryptionSignature", () => ({
  FhevmDecryptionSignature: {
    loadOrSign: vi.fn().mockResolvedValue({
      privateKey: "0xprivatekey",
      publicKey: "0xpublickey",
      signature: "0xsignature",
      contractAddresses: ["0x1234567890123456789012345678901234567890"],
      userAddress: "0x1234567890123456789012345678901234567890",
      startTimestamp: BigInt(Date.now()),
      durationDays: BigInt(1),
    }),
  },
}));

describe("useUserDecrypt", () => {
  const contractAddress = "0x1234567890123456789012345678901234567890" as const;
  const handle = MOCK_HANDLE;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canDecrypt", () => {
    it("should return false when not connected", () => {
      const { result } = renderHook(() => useUserDecrypt({ handle, contractAddress }), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return false when initializing", () => {
      const { result } = renderHook(() => useUserDecrypt({ handle, contractAddress }), {
        wrapper: InitializingWrapper,
      });

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return false when no handle provided", () => {
      const { result } = renderHook(() => useUserDecrypt({ handle: undefined, contractAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return false when no contractAddress provided", () => {
      const { result } = renderHook(() => useUserDecrypt({ handle, contractAddress: undefined }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return true when ready with valid params", () => {
      const mockProvider = createMockEip1193Provider();
      const { result } = renderHook(() => useUserDecrypt({ handle, contractAddress }), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          provider: mockProvider,
        }),
      });

      expect(result.current.canDecrypt).toBe(true);
    });
  });

  describe("initial state", () => {
    it("should start with empty results", () => {
      const { result } = renderHook(() => useUserDecrypt({ handle, contractAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.results).toEqual({});
    });

    it("should start with isDecrypting=false", () => {
      const { result } = renderHook(() => useUserDecrypt({ handle, contractAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isDecrypting).toBe(false);
    });

    it("should start with isIdle=true", () => {
      const { result } = renderHook(() => useUserDecrypt({ handle, contractAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isIdle).toBe(true);
    });

    it("should start with no error", () => {
      const { result } = renderHook(() => useUserDecrypt({ handle, contractAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.error).toBeNull();
    });

    it("should start with empty message", () => {
      const { result } = renderHook(() => useUserDecrypt({ handle, contractAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.message).toBe("");
    });
  });

  describe("decrypt function", () => {
    it("should do nothing when canDecrypt is false", () => {
      const { result } = renderHook(() => useUserDecrypt({ handle: undefined, contractAddress }), {
        wrapper: ConnectedWrapper,
      });

      act(() => {
        result.current.decrypt();
      });

      expect(result.current.isDecrypting).toBe(false);
      expect(result.current.isIdle).toBe(true);
    });
  });

  describe("batch decryption", () => {
    it("should accept array of decrypt requests", () => {
      const requests = [
        { handle: "0xhandle1", contractAddress },
        { handle: "0xhandle2", contractAddress },
      ];

      const { result } = renderHook(() => useUserDecrypt(requests), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          provider: createMockEip1193Provider(),
        }),
      });

      expect(result.current.canDecrypt).toBe(true);
    });

    it("should return false for empty array", () => {
      const { result } = renderHook(() => useUserDecrypt([]), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.canDecrypt).toBe(false);
    });
  });

  describe("clearError", () => {
    it("should provide clearError function", () => {
      const { result } = renderHook(() => useUserDecrypt({ handle, contractAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(typeof result.current.clearError).toBe("function");
    });
  });

  describe("status flags", () => {
    it("should have mutually exclusive status flags initially", () => {
      const { result } = renderHook(() => useUserDecrypt({ handle, contractAddress }), {
        wrapper: ConnectedWrapper,
      });

      // Initially should be idle
      expect(result.current.isIdle).toBe(true);
      expect(result.current.isDecrypting).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });

  describe("message states", () => {
    it("should return empty message when idle", () => {
      const { result } = renderHook(() => useUserDecrypt({ handle, contractAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.message).toBe("");
    });
  });

  describe("undefined params handling", () => {
    it("should handle undefined params gracefully", () => {
      const { result } = renderHook(() => useUserDecrypt(undefined), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.canDecrypt).toBe(false);
      expect(result.current.results).toEqual({});
    });
  });

  describe("single vs batch API normalization", () => {
    it("should normalize single params to array internally", () => {
      const singleParams = { handle, contractAddress };

      const { result: singleResult } = renderHook(() => useUserDecrypt(singleParams), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          provider: createMockEip1193Provider(),
        }),
      });

      expect(singleResult.current.canDecrypt).toBe(true);
    });

    it("should handle array with single item same as single params", () => {
      const arrayParams = [{ handle, contractAddress }];

      const { result: arrayResult } = renderHook(() => useUserDecrypt(arrayParams), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          provider: createMockEip1193Provider(),
        }),
      });

      expect(arrayResult.current.canDecrypt).toBe(true);
    });
  });
});
