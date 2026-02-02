import { vi } from "vitest";
import type { FhevmInstance } from "../../src/fhevmTypes";

/**
 * Default mock handle used in tests
 */
export const MOCK_HANDLE = "0x" + "11".repeat(32);

/**
 * Create a mock FHEVM instance for testing.
 *
 * This mock provides sensible defaults for all methods while allowing
 * individual methods to be overridden or spied upon.
 */
export function createMockFhevmInstance(overrides: Partial<FhevmInstance> = {}): FhevmInstance {
  const mockPublicKey = new Uint8Array(32).fill(1);
  const mockPublicParams = new Uint8Array(64).fill(2);
  const mockPrivateKey = new Uint8Array(32).fill(3);
  const _mockSignature = "0x" + "ab".repeat(65);

  // Mock encrypted input builder
  const mockEncryptedInputBuilder = {
    add8: vi.fn().mockReturnThis(),
    add16: vi.fn().mockReturnThis(),
    add32: vi.fn().mockReturnThis(),
    add64: vi.fn().mockReturnThis(),
    add128: vi.fn().mockReturnThis(),
    add256: vi.fn().mockReturnThis(),
    addBool: vi.fn().mockReturnThis(),
    addAddress: vi.fn().mockReturnThis(),
    encrypt: vi.fn().mockResolvedValue({
      handles: [MOCK_HANDLE],
      inputProof: "0x" + "22".repeat(64),
    }),
  };

  // Mock EIP712 object
  const mockEIP712 = {
    domain: {
      name: "Test",
      version: "1",
      chainId: 31337,
      verifyingContract: "0x" + "33".repeat(20),
    },
    types: {},
    message: {},
    primaryType: "Test",
  };

  // Mock keypair
  const mockKeypair = {
    publicKey: mockPublicKey,
    privateKey: mockPrivateKey,
  };

  return {
    // Encryption
    createEncryptedInput: vi.fn().mockReturnValue(mockEncryptedInputBuilder),

    // Decryption
    userDecrypt: vi.fn().mockResolvedValue({
      [MOCK_HANDLE]: 100n,
    }),

    publicDecrypt: vi.fn().mockResolvedValue({
      [MOCK_HANDLE]: 100n,
    }),

    // Keys
    getPublicKey: vi.fn().mockReturnValue(mockPublicKey),
    getPublicParams: vi.fn().mockReturnValue(mockPublicParams),

    // EIP712
    createEIP712: vi.fn().mockReturnValue(mockEIP712),

    // Keypair
    generateKeypair: vi.fn().mockReturnValue(mockKeypair),

    // Allow overrides
    ...overrides,
  } as FhevmInstance;
}

/**
 * Create a mock instance that fails specific operations.
 */
export function createFailingFhevmInstance(
  failingMethods: (keyof FhevmInstance)[],
  error: Error = new Error("Mock FHEVM error")
): FhevmInstance {
  const baseInstance = createMockFhevmInstance();

  for (const method of failingMethods) {
    if (typeof baseInstance[method] === "function") {
      (baseInstance[method] as ReturnType<typeof vi.fn>) = vi.fn().mockRejectedValue(error);
    }
  }

  return baseInstance;
}

/**
 * Create a mock instance with delayed responses.
 */
export function createDelayedFhevmInstance(delayMs: number): FhevmInstance {
  const baseInstance = createMockFhevmInstance();

  // Wrap async methods with delay
  const asyncMethods = ["userDecrypt", "publicDecrypt"] as const;

  for (const method of asyncMethods) {
    const original = baseInstance[method] as ReturnType<typeof vi.fn>;
    (baseInstance[method] as ReturnType<typeof vi.fn>) = vi
      .fn()
      .mockImplementation(async (...args: unknown[]) => {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return original(...args);
      });
  }

  return baseInstance;
}
