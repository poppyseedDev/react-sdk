import { test as base, expect, type Page } from "@playwright/test";

/**
 * Test wallet configuration with known test accounts.
 */
export const TEST_ACCOUNTS = {
  user1: {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  user2: {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
};

/**
 * Mock EIP-1193 provider that simulates wallet behavior.
 */
export function createMockEthereumProvider(account = TEST_ACCOUNTS.user1, chainId = 31337) {
  return {
    isMetaMask: true,
    selectedAddress: account.address,
    chainId: `0x${chainId.toString(16)}`,

    request: async ({ method, params }: { method: string; params?: unknown[] }) => {
      switch (method) {
        case "eth_chainId":
          return `0x${chainId.toString(16)}`;

        case "eth_accounts":
        case "eth_requestAccounts":
          return [account.address];

        case "eth_getBalance":
          // Return 100 ETH in wei
          return "0x56bc75e2d63100000";

        case "personal_sign":
        case "eth_signTypedData_v4":
          // Return a mock signature
          return "0x" + "ab".repeat(65);

        case "eth_call":
          // Return zero bytes for contract calls
          return "0x" + "00".repeat(32);

        case "eth_getCode":
          // Return some bytecode to indicate contract exists
          return "0x608060405234801561001057600080fd5b50";

        case "eth_blockNumber":
          return "0x1";

        case "eth_estimateGas":
          return "0x5208"; // 21000 gas

        case "eth_gasPrice":
          return "0x3b9aca00"; // 1 gwei

        case "net_version":
          return chainId.toString();

        case "wallet_switchEthereumChain":
          return null;

        default:
          console.warn(`[MockProvider] Unhandled method: ${method}`);
          throw new Error(`Method ${method} not implemented in mock provider`);
      }
    },

    on: (event: string, callback: (...args: unknown[]) => void) => {
      // Mock event listener - no-op for now
      console.log(`[MockProvider] Registered listener for: ${event}`);
    },

    removeListener: (event: string, callback: (...args: unknown[]) => void) => {
      // Mock remove listener - no-op
    },
  };
}

/**
 * Extended test fixture with wallet utilities.
 */
export interface WalletFixtures {
  /** Inject mock wallet into page */
  injectWallet: (page: Page, options?: { account?: typeof TEST_ACCOUNTS.user1; chainId?: number }) => Promise<void>;
  /** Wait for wallet to be connected */
  waitForConnection: (page: Page) => Promise<void>;
  /** Disconnect wallet */
  disconnectWallet: (page: Page) => Promise<void>;
}

/**
 * Create test fixtures with wallet utilities.
 */
export const test = base.extend<WalletFixtures>({
  injectWallet: async ({}, use) => {
    const inject = async (
      page: Page,
      options?: { account?: typeof TEST_ACCOUNTS.user1; chainId?: number }
    ) => {
      const account = options?.account ?? TEST_ACCOUNTS.user1;
      const chainId = options?.chainId ?? 31337;

      // Inject the mock provider before page load
      await page.addInitScript(
        ({ address, chainId }) => {
          const mockProvider = {
            isMetaMask: true,
            selectedAddress: address,
            chainId: `0x${chainId.toString(16)}`,
            _events: {} as Record<string, Function[]>,

            request: async ({ method, params }: { method: string; params?: unknown[] }) => {
              console.log(`[MockProvider] ${method}`, params);

              switch (method) {
                case "eth_chainId":
                  return `0x${chainId.toString(16)}`;
                case "eth_accounts":
                case "eth_requestAccounts":
                  return [address];
                case "eth_getBalance":
                  return "0x56bc75e2d63100000";
                case "personal_sign":
                case "eth_signTypedData_v4":
                  return "0x" + "ab".repeat(65);
                case "eth_call":
                  return "0x" + "00".repeat(32);
                case "eth_getCode":
                  return "0x608060405234801561001057600080fd5b50";
                case "eth_blockNumber":
                  return "0x1";
                case "eth_estimateGas":
                  return "0x5208";
                case "eth_gasPrice":
                  return "0x3b9aca00";
                case "net_version":
                  return chainId.toString();
                case "wallet_switchEthereumChain":
                  return null;
                default:
                  console.warn(`[MockProvider] Unhandled: ${method}`);
                  throw new Error(`Method ${method} not implemented`);
              }
            },

            on: (event: string, callback: Function) => {
              if (!mockProvider._events[event]) {
                mockProvider._events[event] = [];
              }
              mockProvider._events[event].push(callback);
            },

            removeListener: (event: string, callback: Function) => {
              if (mockProvider._events[event]) {
                mockProvider._events[event] = mockProvider._events[event].filter(
                  (cb) => cb !== callback
                );
              }
            },

            emit: (event: string, ...args: unknown[]) => {
              if (mockProvider._events[event]) {
                mockProvider._events[event].forEach((cb) => cb(...args));
              }
            },
          };

          (window as any).ethereum = mockProvider;
        },
        { address: account.address, chainId }
      );
    };

    await use(inject);
  },

  waitForConnection: async ({}, use) => {
    const wait = async (page: Page) => {
      await expect(page.locator('[data-testid="wallet-status"]')).toContainText("connected", {
        timeout: 10000,
      });
    };

    await use(wait);
  },

  disconnectWallet: async ({}, use) => {
    const disconnect = async (page: Page) => {
      await page.click('[data-testid="disconnect-wallet"]');
      await expect(page.locator('[data-testid="wallet-status"]')).toContainText("idle");
    };

    await use(disconnect);
  },
});

export { expect };
