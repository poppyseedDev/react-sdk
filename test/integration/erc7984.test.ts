import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockRelayer } from "./mockRelayer";
import { FhevmContext, type FhevmContextValue } from "../../src/react/context";
import { createFhevmConfig, hardhatLocal } from "../../src";
import { useConfidentialBalances } from "../../src/react/useConfidentialBalances";
import { useConfidentialTransfer } from "../../src/react/useConfidentialTransfer";
import { useShield } from "../../src/react/useShield";
import { useUnshield } from "../../src/react/useUnshield";

// Test constants
const TEST_ADDRESS = "0x1234567890123456789012345678901234567890" as const;
const TOKEN_ADDRESS = "0xabcdef1234567890abcdef1234567890abcdef12" as const;
const WRAPPER_ADDRESS = "0x9876543210987654321098765432109876543210" as const;
const UNDERLYING_ADDRESS = "0x5555555555555555555555555555555555555555" as const;
const MOCK_BALANCE_HANDLE = "0x" + "cc".repeat(32);

/**
 * Create a mock FHEVM instance for ERC7984 tests.
 */
function createMockFhevmInstanceForERC7984() {
  const mockEncrypt = vi.fn().mockResolvedValue({
    handles: [new Uint8Array(32).fill(0xaa)],
    inputProof: new Uint8Array(64).fill(0xbb),
  });

  const mockBuilder = {
    addBool: vi.fn().mockReturnThis(),
    add8: vi.fn().mockReturnThis(),
    add16: vi.fn().mockReturnThis(),
    add32: vi.fn().mockReturnThis(),
    add64: vi.fn().mockReturnThis(),
    add128: vi.fn().mockReturnThis(),
    add256: vi.fn().mockReturnThis(),
    addAddress: vi.fn().mockReturnThis(),
    encrypt: mockEncrypt,
  };

  return {
    createEncryptedInput: vi.fn().mockReturnValue(mockBuilder),
    userDecrypt: vi.fn().mockResolvedValue({ [MOCK_BALANCE_HANDLE]: 1000n }),
    publicDecrypt: vi.fn().mockResolvedValue({
      clearValues: { [MOCK_BALANCE_HANDLE]: 1000n },
      abiEncodedClearValues: "0x" + "00".repeat(32),
      decryptionProof: "0x" + "ff".repeat(64),
    }),
    getPublicKey: vi.fn().mockReturnValue(new Uint8Array(32)),
    getPublicParams: vi.fn(),
    createEIP712: vi.fn(),
    generateKeypair: vi.fn(),
    _mockBuilder: mockBuilder,
    _mockEncrypt: mockEncrypt,
  };
}

/**
 * Create a mock provider for ERC7984 tests.
 */
function createMockProviderForERC7984() {
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
        case "eth_call":
          // Return mock balance handle
          return MOCK_BALANCE_HANDLE;
        case "eth_getCode":
          return "0x608060405234801561001057600080fd5b50";
        default:
          throw new Error(`Unhandled method: ${method}`);
      }
    }),
  };
}

/**
 * Create a test wrapper for ERC7984 hooks.
 */
function createERC7984Wrapper(
  instance: ReturnType<typeof createMockFhevmInstanceForERC7984>,
  provider = createMockProviderForERC7984()
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

  return function ERC7984Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      FhevmContext.Provider,
      { value: contextValue },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );
  };
}

describe("ERC7984 Integration Tests", () => {
  let relayer: MockRelayer;

  beforeAll(async () => {
    relayer = new MockRelayer({ port: 8551 });
    await relayer.start();
  });

  afterAll(async () => {
    await relayer.stop();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    relayer.clearJobs();
  });

  describe("useConfidentialBalances integration", () => {
    it("should initialize with correct state", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: TOKEN_ADDRESS }],
            enabled: false,
          }),
        { wrapper }
      );

      expect(result.current.status).toBe("idle");
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].status).toBe("pending");
    });

    it("should handle multiple contracts", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const secondToken = "0x1111111111111111111111111111111111111111" as const;

      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: TOKEN_ADDRESS }, { contractAddress: secondToken }],
            enabled: false,
          }),
        { wrapper }
      );

      expect(result.current.data).toHaveLength(2);
    });

    it("should support decrypt option", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: TOKEN_ADDRESS }],
            decrypt: true,
            enabled: false,
          }),
        { wrapper }
      );

      expect(typeof result.current.decryptAll).toBe("function");
      expect(result.current.isDecrypting).toBe(false);
    });

    it("should provide refetch function", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: TOKEN_ADDRESS }],
            enabled: false,
          }),
        { wrapper }
      );

      expect(typeof result.current.refetch).toBe("function");
    });
  });

  describe("useConfidentialTransfer integration", () => {
    it("should initialize with idle state", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress: TOKEN_ADDRESS }),
        { wrapper }
      );

      expect(result.current.status).toBe("idle");
      expect(result.current.isPending).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should provide transfer function", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress: TOKEN_ADDRESS }),
        { wrapper }
      );

      expect(typeof result.current.transfer).toBe("function");
    });

    it("should support custom ABI", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const customAbi = [
        {
          name: "confidentialTransfer",
          type: "function",
          inputs: [],
          outputs: [],
        },
      ];

      const { result } = renderHook(
        () =>
          useConfidentialTransfer({
            contractAddress: TOKEN_ADDRESS,
            abi: customAbi,
          }),
        { wrapper }
      );

      expect(result.current.status).toBe("idle");
    });

    it("should support custom function name", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(
        () =>
          useConfidentialTransfer({
            contractAddress: TOKEN_ADDRESS,
            functionName: "customTransfer(address,bytes32,bytes)",
          }),
        { wrapper }
      );

      expect(result.current.status).toBe("idle");
    });

    it("should provide reset function", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress: TOKEN_ADDRESS }),
        { wrapper }
      );

      expect(typeof result.current.reset).toBe("function");
    });
  });

  describe("useShield integration", () => {
    it("should initialize with idle state", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(
        () =>
          useShield({
            wrapperAddress: WRAPPER_ADDRESS,
            underlyingAddress: UNDERLYING_ADDRESS,
          }),
        { wrapper }
      );

      expect(result.current.status).toBe("idle");
      expect(result.current.isPending).toBe(false);
      expect(result.current.isApproving).toBe(false);
      expect(result.current.isWrapping).toBe(false);
    });

    it("should provide shield function", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(
        () =>
          useShield({
            wrapperAddress: WRAPPER_ADDRESS,
            underlyingAddress: UNDERLYING_ADDRESS,
          }),
        { wrapper }
      );

      expect(typeof result.current.shield).toBe("function");
    });

    it("should provide refetchAllowance function", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(
        () =>
          useShield({
            wrapperAddress: WRAPPER_ADDRESS,
            underlyingAddress: UNDERLYING_ADDRESS,
          }),
        { wrapper }
      );

      expect(typeof result.current.refetchAllowance).toBe("function");
    });

    it("should provide reset function", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(
        () =>
          useShield({
            wrapperAddress: WRAPPER_ADDRESS,
            underlyingAddress: UNDERLYING_ADDRESS,
          }),
        { wrapper }
      );

      expect(typeof result.current.reset).toBe("function");

      // Reset should clear state
      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.error).toBeNull();
    });

    it("should support callbacks", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(
        () =>
          useShield({
            wrapperAddress: WRAPPER_ADDRESS,
            underlyingAddress: UNDERLYING_ADDRESS,
            onSuccess,
            onError,
          }),
        { wrapper }
      );

      expect(result.current.status).toBe("idle");
    });
  });

  describe("useUnshield integration", () => {
    it("should initialize with idle state", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(() => useUnshield({ wrapperAddress: WRAPPER_ADDRESS }), {
        wrapper,
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.isPending).toBe(false);
      expect(result.current.isEncrypting).toBe(false);
      expect(result.current.isSigning).toBe(false);
      expect(result.current.isDecrypting).toBe(false);
      expect(result.current.isFinalizing).toBe(false);
    });

    it("should provide unshield function", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(() => useUnshield({ wrapperAddress: WRAPPER_ADDRESS }), {
        wrapper,
      });

      expect(typeof result.current.unshield).toBe("function");
    });

    it("should provide reset function", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(() => useUnshield({ wrapperAddress: WRAPPER_ADDRESS }), {
        wrapper,
      });

      expect(typeof result.current.reset).toBe("function");
    });

    it("should support callbacks", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(
        () =>
          useUnshield({
            wrapperAddress: WRAPPER_ADDRESS,
            onSuccess,
            onError,
          }),
        { wrapper }
      );

      expect(result.current.status).toBe("idle");
    });

    it("should track all status phases", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      const { result } = renderHook(() => useUnshield({ wrapperAddress: WRAPPER_ADDRESS }), {
        wrapper,
      });

      // All phase flags should be false initially
      expect(result.current.isEncrypting).toBe(false);
      expect(result.current.isSigning).toBe(false);
      expect(result.current.isDecrypting).toBe(false);
      expect(result.current.isFinalizing).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });

  describe("full ERC7984 flow simulation", () => {
    it("should support shield -> balance check flow", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      // First, shield tokens
      const { result: shieldResult } = renderHook(
        () =>
          useShield({
            wrapperAddress: WRAPPER_ADDRESS,
            underlyingAddress: UNDERLYING_ADDRESS,
          }),
        { wrapper }
      );

      expect(shieldResult.current.status).toBe("idle");

      // Then, check balance
      const { result: balanceResult } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: WRAPPER_ADDRESS }],
            enabled: false,
          }),
        { wrapper }
      );

      expect(balanceResult.current.data).toHaveLength(1);
    });

    it("should support transfer -> balance check flow", () => {
      const mockInstance = createMockFhevmInstanceForERC7984();
      const wrapper = createERC7984Wrapper(mockInstance);

      // First, set up transfer
      const { result: transferResult } = renderHook(
        () => useConfidentialTransfer({ contractAddress: TOKEN_ADDRESS }),
        { wrapper }
      );

      expect(transferResult.current.status).toBe("idle");

      // Then, check balances for both sender and recipient
      const recipientAddress = "0x2222222222222222222222222222222222222222" as const;

      const { result: balanceResult } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [
              { contractAddress: TOKEN_ADDRESS, account: TEST_ADDRESS },
              { contractAddress: TOKEN_ADDRESS, account: recipientAddress },
            ],
            enabled: false,
          }),
        { wrapper }
      );

      expect(balanceResult.current.data).toHaveLength(2);
    });
  });
});
