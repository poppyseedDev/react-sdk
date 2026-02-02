import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockRelayer } from "./mockRelayer";
import { FhevmContext, type FhevmContextValue } from "../../src/react/context";
import { createFhevmConfig, hardhatLocal } from "../../src";
import { useUserDecrypt } from "../../src/react/useUserDecrypt";
import { usePublicDecrypt } from "../../src/react/usePublicDecrypt";

// Test constants
const TEST_ADDRESS = "0x1234567890123456789012345678901234567890" as const;
const CONTRACT_ADDRESS = "0xabcdef1234567890abcdef1234567890abcdef12" as const;
const MOCK_HANDLE = "0x" + "aa".repeat(32);
const MOCK_HANDLE_2 = "0x" + "bb".repeat(32);

/**
 * Create a mock FHEVM instance for decryption tests.
 */
function createMockFhevmInstanceForDecryption() {
  const userDecryptMock = vi.fn().mockImplementation(async (requests) => {
    // Simulate decryption - return mock values for each handle
    const result: Record<string, bigint> = {};
    for (const req of requests) {
      result[req.handle] = BigInt(Math.floor(Math.random() * 1000000));
    }
    return result;
  });

  const publicDecryptMock = vi.fn().mockImplementation(async (handles: string[]) => {
    const clearValues: Record<string, bigint> = {};
    for (const handle of handles) {
      clearValues[handle] = BigInt(Math.floor(Math.random() * 1000000));
    }
    return {
      clearValues,
      abiEncodedClearValues: "0x" + "00".repeat(32) as `0x${string}`,
      decryptionProof: "0x" + "ff".repeat(64) as `0x${string}`,
    };
  });

  return {
    createEncryptedInput: vi.fn(),
    userDecrypt: userDecryptMock,
    publicDecrypt: publicDecryptMock,
    getPublicKey: vi.fn().mockReturnValue(new Uint8Array(32)),
    getPublicParams: vi.fn(),
    createEIP712: vi.fn(),
    generateKeypair: vi.fn(),
  };
}

/**
 * Create a mock EIP-1193 provider.
 */
function createMockProvider() {
  return {
    request: vi.fn().mockImplementation(async ({ method }) => {
      switch (method) {
        case "eth_chainId":
          return "0x7a69"; // 31337
        case "eth_accounts":
        case "eth_requestAccounts":
          return [TEST_ADDRESS];
        case "personal_sign":
        case "eth_signTypedData_v4":
          return "0x" + "ab".repeat(65);
        default:
          throw new Error(`Unhandled method: ${method}`);
      }
    }),
  };
}

/**
 * Create an integration test wrapper for decryption tests.
 */
function createDecryptionWrapper(
  instance: ReturnType<typeof createMockFhevmInstanceForDecryption>,
  provider = createMockProvider()
) {
  const config = createFhevmConfig({ chains: [hardhatLocal] });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const contextValue: FhevmContextValue = {
    config,
    instance,
    status: "ready",
    error: undefined,
    chainId: 31337,
    address: TEST_ADDRESS,
    isConnected: true,
    provider,
    storage: undefined,
    refresh: vi.fn(),
  };

  return function DecryptionWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      FhevmContext.Provider,
      { value: contextValue },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );
  };
}

describe("Decryption Integration Tests", () => {
  let relayer: MockRelayer;

  beforeAll(async () => {
    relayer = new MockRelayer({ port: 8550 });
    await relayer.start();
  });

  afterAll(async () => {
    await relayer.stop();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    relayer.clearJobs();
  });

  describe("usePublicDecrypt integration", () => {
    it("should decrypt single handle", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();
      const wrapper = createDecryptionWrapper(mockInstance);

      const { result } = renderHook(
        () => usePublicDecrypt({ handles: [MOCK_HANDLE] }),
        { wrapper }
      );

      expect(result.current.canDecrypt).toBe(true);
      expect(result.current.isIdle).toBe(true);

      await act(async () => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.clearValues).toBeDefined();
      expect(result.current.result).toBeDefined();
      expect(result.current.result?.decryptionProof).toBeDefined();
    });

    it("should decrypt multiple handles in batch", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();
      const wrapper = createDecryptionWrapper(mockInstance);

      const { result } = renderHook(
        () => usePublicDecrypt({ handles: [MOCK_HANDLE, MOCK_HANDLE_2] }),
        { wrapper }
      );

      await act(async () => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockInstance.publicDecrypt).toHaveBeenCalledWith([MOCK_HANDLE, MOCK_HANDLE_2]);
      expect(Object.keys(result.current.clearValues)).toHaveLength(2);
    });

    it("should handle decryption errors", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();
      mockInstance.publicDecrypt.mockRejectedValueOnce(new Error("Decryption failed"));
      const wrapper = createDecryptionWrapper(mockInstance);

      const { result } = renderHook(
        () => usePublicDecrypt({ handles: [MOCK_HANDLE] }),
        { wrapper }
      );

      await act(async () => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toContain("Decryption failed");
    });

    it("should support decryptAsync", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();
      const wrapper = createDecryptionWrapper(mockInstance);

      const { result } = renderHook(
        () => usePublicDecrypt({ handles: [MOCK_HANDLE] }),
        { wrapper }
      );

      let decryptResult: Awaited<ReturnType<typeof result.current.decryptAsync>>;

      await act(async () => {
        decryptResult = await result.current.decryptAsync();
      });

      expect(decryptResult).toBeDefined();
      expect(decryptResult?.clearValues).toBeDefined();
      expect(decryptResult?.decryptionProof).toBeDefined();
    });

    it("should filter out undefined handles", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();
      const wrapper = createDecryptionWrapper(mockInstance);

      const { result } = renderHook(
        () => usePublicDecrypt({ handles: [undefined, MOCK_HANDLE, undefined] }),
        { wrapper }
      );

      expect(result.current.canDecrypt).toBe(true);

      await act(async () => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should only decrypt the valid handle
      expect(mockInstance.publicDecrypt).toHaveBeenCalledWith([MOCK_HANDLE]);
    });

    it("should clear error with clearError", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();
      mockInstance.publicDecrypt.mockRejectedValueOnce(new Error("Test error"));
      const wrapper = createDecryptionWrapper(mockInstance);

      const { result } = renderHook(
        () => usePublicDecrypt({ handles: [MOCK_HANDLE] }),
        { wrapper }
      );

      await act(async () => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      act(() => {
        result.current.clearError();
      });

      // After clearing, we should be back to idle state
      await waitFor(() => {
        expect(result.current.isIdle).toBe(true);
      });
    });
  });

  describe("useUserDecrypt integration", () => {
    it("should return canDecrypt based on params", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();
      const mockProvider = createMockProvider();
      const wrapper = createDecryptionWrapper(mockInstance, mockProvider);

      const { result } = renderHook(
        () => useUserDecrypt({ handle: MOCK_HANDLE, contractAddress: CONTRACT_ADDRESS }),
        { wrapper }
      );

      expect(result.current.canDecrypt).toBe(true);
    });

    it("should not be able to decrypt without handle", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();
      const wrapper = createDecryptionWrapper(mockInstance);

      const { result } = renderHook(
        () => useUserDecrypt({ handle: undefined, contractAddress: CONTRACT_ADDRESS }),
        { wrapper }
      );

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should not be able to decrypt without contract address", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();
      const wrapper = createDecryptionWrapper(mockInstance);

      const { result } = renderHook(
        () => useUserDecrypt({ handle: MOCK_HANDLE, contractAddress: undefined }),
        { wrapper }
      );

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should accept batch decrypt requests", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();
      const mockProvider = createMockProvider();
      const wrapper = createDecryptionWrapper(mockInstance, mockProvider);

      const requests = [
        { handle: MOCK_HANDLE, contractAddress: CONTRACT_ADDRESS },
        { handle: MOCK_HANDLE_2, contractAddress: CONTRACT_ADDRESS },
      ];

      const { result } = renderHook(() => useUserDecrypt(requests), { wrapper });

      expect(result.current.canDecrypt).toBe(true);
    });

    it("should handle empty array", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();
      const wrapper = createDecryptionWrapper(mockInstance);

      const { result } = renderHook(() => useUserDecrypt([]), { wrapper });

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should handle undefined params", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();
      const wrapper = createDecryptionWrapper(mockInstance);

      const { result } = renderHook(() => useUserDecrypt(undefined), { wrapper });

      expect(result.current.canDecrypt).toBe(false);
      expect(result.current.results).toEqual({});
    });
  });

  describe("decryption state management", () => {
    it("should show decrypting status during operation", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();

      // Add delay to publicDecrypt
      mockInstance.publicDecrypt.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          clearValues: { [MOCK_HANDLE]: 100n },
          abiEncodedClearValues: "0x" + "00".repeat(32),
          decryptionProof: "0x" + "ff".repeat(64),
        }), 200))
      );

      const wrapper = createDecryptionWrapper(mockInstance);

      const { result } = renderHook(
        () => usePublicDecrypt({ handles: [MOCK_HANDLE] }),
        { wrapper }
      );

      // Start decrypt
      act(() => {
        result.current.decrypt();
      });

      // Wait for decrypting state
      await waitFor(() => {
        expect(result.current.isDecrypting).toBe(true);
      });

      expect(result.current.message).toBe("Decrypting values...");

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isDecrypting).toBe(false);
      expect(result.current.message).toBe("Decryption complete");
    });

    it("should prevent concurrent decrypt calls", async () => {
      const mockInstance = createMockFhevmInstanceForDecryption();

      // Add delay to publicDecrypt
      mockInstance.publicDecrypt.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          clearValues: { [MOCK_HANDLE]: 100n },
          abiEncodedClearValues: "0x" + "00".repeat(32),
          decryptionProof: "0x" + "ff".repeat(64),
        }), 200))
      );

      const wrapper = createDecryptionWrapper(mockInstance);

      const { result } = renderHook(
        () => usePublicDecrypt({ handles: [MOCK_HANDLE] }),
        { wrapper }
      );

      // Start first decrypt
      act(() => {
        result.current.decrypt();
      });

      // Wait for decrypting state
      await waitFor(() => {
        expect(result.current.isDecrypting).toBe(true);
      });

      // canDecrypt should be false while decrypting
      expect(result.current.canDecrypt).toBe(false);

      // Second call should be ignored (canDecrypt is false)
      act(() => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should have only called publicDecrypt once
      expect(mockInstance.publicDecrypt).toHaveBeenCalledTimes(1);
    });
  });
});
