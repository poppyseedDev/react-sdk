import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockRelayer } from "./mockRelayer";
import { FhevmContext, type FhevmContextValue } from "../../src/react/context";
import { createFhevmConfig, hardhatLocal } from "../../src";
import { useEncrypt } from "../../src/react/useEncrypt";

// Test constants
const TEST_ADDRESS = "0x1234567890123456789012345678901234567890" as const;
const CONTRACT_ADDRESS = "0xabcdef1234567890abcdef1234567890abcdef12" as const;

/**
 * Create a mock FHEVM instance that simulates encryption behavior.
 */
function createMockFhevmInstanceForIntegration() {
  // Track how many values have been added to the builder
  let addCount = 0;

  const mockEncrypt = vi.fn().mockImplementation(async () => {
    // Generate the correct number of handles based on how many values were added
    const handles = Array.from({ length: addCount }, (_, i) =>
      new Uint8Array(32).fill(0xaa + i)
    );
    // Reset counter for next encryption
    addCount = 0;
    return {
      handles,
      inputProof: new Uint8Array(64).fill(0xbb),
    };
  });

  // Helper to track additions and return this for chaining
  const trackAdd = () => {
    addCount++;
    return mockBuilder;
  };

  const mockBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    addBool: vi.fn().mockImplementation(trackAdd),
    add8: vi.fn().mockImplementation(trackAdd),
    add16: vi.fn().mockImplementation(trackAdd),
    add32: vi.fn().mockImplementation(trackAdd),
    add64: vi.fn().mockImplementation(trackAdd),
    add128: vi.fn().mockImplementation(trackAdd),
    add256: vi.fn().mockImplementation(trackAdd),
    addAddress: vi.fn().mockImplementation(trackAdd),
    encrypt: mockEncrypt,
  };

  return {
    createEncryptedInput: vi.fn().mockReturnValue(mockBuilder),
    userDecrypt: vi.fn(),
    publicDecrypt: vi.fn(),
    getPublicKey: vi.fn().mockReturnValue(new Uint8Array(32)),
    getPublicParams: vi.fn(),
    createEIP712: vi.fn(),
    generateKeypair: vi.fn(),
    _mockBuilder: mockBuilder,
    _mockEncrypt: mockEncrypt,
  };
}

/**
 * Create an integration test wrapper with mock FHEVM context.
 */
function createIntegrationWrapper(
  instance: ReturnType<typeof createMockFhevmInstanceForIntegration>
) {
  const config = createFhevmConfig({ chains: [hardhatLocal] });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
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
    provider: {
      request: vi.fn().mockImplementation(async ({ method }) => {
        switch (method) {
          case "eth_chainId":
            return "0x7a69";
          case "eth_accounts":
            return [TEST_ADDRESS];
          default:
            throw new Error(`Unhandled method: ${method}`);
        }
      }),
    },
    storage: undefined,
    refresh: vi.fn(),
  };

  return function IntegrationWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      FhevmContext.Provider,
      { value: contextValue },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );
  };
}

describe("Encryption Integration Tests", () => {
  let relayer: MockRelayer;
  let mockInstance: ReturnType<typeof createMockFhevmInstanceForIntegration>;
  let wrapper: ReturnType<typeof createIntegrationWrapper>;

  beforeAll(async () => {
    relayer = new MockRelayer({ port: 8549 });
    await relayer.start();
  });

  afterAll(async () => {
    await relayer.stop();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    relayer.clearJobs();
    mockInstance = createMockFhevmInstanceForIntegration();
    wrapper = createIntegrationWrapper(mockInstance);
  });

  describe("useEncrypt hook integration", () => {
    it("should encrypt uint64 value successfully", async () => {
      const { result } = renderHook(() => useEncrypt(), { wrapper });

      expect(result.current.isReady).toBe(true);

      let encrypted: Awaited<ReturnType<typeof result.current.encrypt>>;

      await act(async () => {
        encrypted = await result.current.encrypt(
          [{ type: "uint64", value: 100n }],
          CONTRACT_ADDRESS
        );
      });

      expect(encrypted).toBeDefined();
      expect(encrypted).toHaveLength(2); // [handle, proof]
      expect(mockInstance.createEncryptedInput).toHaveBeenCalledWith(
        CONTRACT_ADDRESS,
        TEST_ADDRESS
      );
      expect(mockInstance._mockBuilder.add64).toHaveBeenCalledWith(100n);
    });

    it("should encrypt multiple values in sequence", async () => {
      const { result } = renderHook(() => useEncrypt(), { wrapper });

      // Encrypt first value
      await act(async () => {
        await result.current.encrypt([{ type: "uint64", value: 100n }], CONTRACT_ADDRESS);
      });

      // Encrypt second value
      await act(async () => {
        await result.current.encrypt([{ type: "uint64", value: 200n }], CONTRACT_ADDRESS);
      });

      expect(mockInstance._mockBuilder.add64).toHaveBeenCalledTimes(2);
      expect(mockInstance._mockBuilder.add64).toHaveBeenNthCalledWith(1, 100n);
      expect(mockInstance._mockBuilder.add64).toHaveBeenNthCalledWith(2, 200n);
    });

    it("should encrypt bool values", async () => {
      const { result } = renderHook(() => useEncrypt(), { wrapper });

      await act(async () => {
        await result.current.encrypt([{ type: "bool", value: true }], CONTRACT_ADDRESS);
      });

      expect(mockInstance._mockBuilder.addBool).toHaveBeenCalledWith(true);
    });

    it("should encrypt address values", async () => {
      const { result } = renderHook(() => useEncrypt(), { wrapper });
      const testRecipient = "0x9876543210987654321098765432109876543210" as const;

      await act(async () => {
        await result.current.encrypt([{ type: "address", value: testRecipient }], CONTRACT_ADDRESS);
      });

      expect(mockInstance._mockBuilder.addAddress).toHaveBeenCalledWith(testRecipient);
    });

    it("should encrypt all integer sizes", async () => {
      const { result } = renderHook(() => useEncrypt(), { wrapper });

      await act(async () => {
        await result.current.encrypt(
          [
            // uint8/16/32 use number, converted to bigint internally
            { type: "uint8", value: 255 },
            { type: "uint16", value: 1000 },
            { type: "uint32", value: 100000 },
            // uint64/128/256 use bigint directly
            { type: "uint64", value: 10000000n },
            { type: "uint128", value: 10n ** 20n },
            { type: "uint256", value: 10n ** 30n },
          ],
          CONTRACT_ADDRESS
        );
      });

      // Verify the builder receives bigint values (converted from number for smaller types)
      expect(mockInstance._mockBuilder.add8).toHaveBeenCalledWith(BigInt(255));
      expect(mockInstance._mockBuilder.add16).toHaveBeenCalledWith(BigInt(1000));
      expect(mockInstance._mockBuilder.add32).toHaveBeenCalledWith(BigInt(100000));
      expect(mockInstance._mockBuilder.add64).toHaveBeenCalledWith(10000000n);
      expect(mockInstance._mockBuilder.add128).toHaveBeenCalledWith(10n ** 20n);
      expect(mockInstance._mockBuilder.add256).toHaveBeenCalledWith(10n ** 30n);
    });

    it("should handle encryption errors gracefully", async () => {
      // Make encrypt fail
      mockInstance._mockEncrypt.mockRejectedValueOnce(new Error("Encryption failed"));

      const { result } = renderHook(() => useEncrypt(), { wrapper });

      await expect(
        act(async () => {
          await result.current.encrypt([{ type: "uint64", value: 100n }], CONTRACT_ADDRESS);
        })
      ).rejects.toThrow("Encryption failed");
    });

    it("should return undefined when not ready", async () => {
      // Create wrapper with disconnected state
      const disconnectedContext: FhevmContextValue = {
        config: createFhevmConfig({ chains: [hardhatLocal] }),
        instance: undefined,
        status: "idle",
        error: undefined,
        chainId: undefined,
        address: undefined,
        isConnected: false,
        provider: undefined,
        storage: undefined,
        refresh: vi.fn(),
      };

      const disconnectedWrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          FhevmContext.Provider,
          { value: disconnectedContext },
          React.createElement(
            QueryClientProvider,
            {
              client: new QueryClient({
                defaultOptions: { queries: { retry: false } },
              }),
            },
            children
          )
        );

      const { result } = renderHook(() => useEncrypt(), { wrapper: disconnectedWrapper });

      expect(result.current.isReady).toBe(false);

      let encrypted: Awaited<ReturnType<typeof result.current.encrypt>>;
      await act(async () => {
        encrypted = await result.current.encrypt(
          [{ type: "uint64", value: 100n }],
          CONTRACT_ADDRESS
        );
      });

      expect(encrypted).toBeUndefined();
    });

    it("should maintain stable encrypt function reference across rerenders", () => {
      const { result, rerender } = renderHook(() => useEncrypt(), { wrapper });

      const firstEncrypt = result.current.encrypt;
      rerender();
      const secondEncrypt = result.current.encrypt;

      expect(firstEncrypt).toBe(secondEncrypt);
    });
  });

  describe("encryption with batch values", () => {
    it("should encrypt multiple values with single proof", async () => {
      // Update mock to return multiple handles
      mockInstance._mockEncrypt.mockResolvedValueOnce({
        handles: [new Uint8Array(32).fill(0x11), new Uint8Array(32).fill(0x22)],
        inputProof: new Uint8Array(64).fill(0xcc),
      });

      const { result } = renderHook(() => useEncrypt(), { wrapper });

      let encrypted: Awaited<ReturnType<typeof result.current.encrypt>>;
      await act(async () => {
        encrypted = await result.current.encrypt(
          [
            { type: "uint64", value: 100n },
            { type: "uint64", value: 200n },
          ],
          CONTRACT_ADDRESS
        );
      });

      expect(encrypted).toBeDefined();
      expect(encrypted).toHaveLength(3); // [handle1, handle2, proof]
    });
  });
});
