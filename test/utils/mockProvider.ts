import { vi } from "vitest";
import type { Eip1193Provider } from "../../src/internal/eip1193";

/**
 * Default test address
 */
export const TEST_ADDRESS = "0x1234567890123456789012345678901234567890" as const;

/**
 * Default test chain ID (Hardhat local)
 */
export const TEST_CHAIN_ID = 31337;

/**
 * Create a mock EIP-1193 provider for testing.
 */
export function createMockEip1193Provider(
  overrides: Partial<{
    chainId: number;
    accounts: string[];
    signatureResponse: string;
  }> = {}
): Eip1193Provider {
  const chainId = overrides.chainId ?? TEST_CHAIN_ID;
  const accounts = overrides.accounts ?? [TEST_ADDRESS];
  const signatureResponse = overrides.signatureResponse ?? "0x" + "ab".repeat(65); // 130 hex chars = 65 bytes

  return {
    request: vi.fn().mockImplementation(async ({ method, params }) => {
      switch (method) {
        case "eth_chainId":
          return "0x" + chainId.toString(16);

        case "eth_accounts":
        case "eth_requestAccounts":
          return accounts;

        case "personal_sign":
          return signatureResponse;

        case "eth_signTypedData_v4":
          return signatureResponse;

        case "eth_call":
          // Default mock for contract calls - returns zeros
          return "0x" + "00".repeat(32);

        case "eth_getCode":
          // Return some code to indicate contract exists
          return "0x608060405234801561001057600080fd5b50";

        case "eth_blockNumber":
          return "0x1";

        case "eth_getBalance":
          return "0x" + (10n ** 18n).toString(16); // 1 ETH

        default:
          throw new Error(`Unhandled mock method: ${method}`);
      }
    }),
  };
}

/**
 * Create a mock provider that fails specific methods.
 */
export function createFailingProvider(
  failingMethods: string[],
  error: Error = new Error("Mock provider error")
): Eip1193Provider {
  const baseProvider = createMockEip1193Provider();

  return {
    request: vi.fn().mockImplementation(async (args) => {
      if (failingMethods.includes(args.method)) {
        throw error;
      }
      return baseProvider.request(args);
    }),
  };
}

/**
 * Create a mock provider with delayed responses.
 */
export function createDelayedProvider(delayMs: number): Eip1193Provider {
  const baseProvider = createMockEip1193Provider();

  return {
    request: vi.fn().mockImplementation(async (args) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return baseProvider.request(args);
    }),
  };
}
