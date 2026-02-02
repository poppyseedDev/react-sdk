/**
 * FhevmInstance Adapter
 *
 * This module provides an abstraction layer over the relayer-sdk FhevmInstance.
 * It enables easier testing, mocking, and potential future changes to the underlying implementation.
 */

import type { FhevmInstance, HandleContractPair, UserDecryptResults } from "../fhevmTypes";

/**
 * Encrypted input builder interface.
 * Abstracts the RelayerEncryptedInput type from relayer-sdk.
 */
export interface EncryptedInputBuilder {
  /** Add a boolean value */
  addBool(value: boolean): this;
  /** Add an 8-bit unsigned integer */
  add8(value: number): this;
  /** Add a 16-bit unsigned integer */
  add16(value: number): this;
  /** Add a 32-bit unsigned integer */
  add32(value: number): this;
  /** Add a 64-bit unsigned integer */
  add64(value: bigint): this;
  /** Add a 128-bit unsigned integer */
  add128(value: bigint): this;
  /** Add a 256-bit unsigned integer */
  add256(value: bigint): this;
  /** Add an address value */
  addAddress(value: `0x${string}`): this;
  /** Encrypt all added values */
  encrypt(): Promise<{ handles: Uint8Array[]; inputProof: Uint8Array }>;
}

/**
 * EIP-712 typed data structure for decryption authorization.
 */
export interface DecryptionEIP712Data {
  domain: {
    chainId: number;
    name: string;
    verifyingContract: `0x${string}`;
    version: string;
  };
  message: Record<string, unknown>;
  primaryType: string;
  types: Record<string, { name: string; type: string }[]>;
}

/**
 * Adapter interface for FhevmInstance.
 * This interface abstracts the relayer-sdk FhevmInstance, making it easier to:
 * - Mock in tests
 * - Swap implementations
 * - Add cross-cutting concerns (logging, metrics, etc.)
 */
export interface IFhevmInstanceAdapter {
  /**
   * Create an encrypted input builder for the given contract and user.
   * @param contractAddress - The contract that will receive the encrypted input
   * @param userAddress - The user's wallet address
   */
  createEncryptedInput(
    contractAddress: `0x${string}`,
    userAddress: `0x${string}`
  ): EncryptedInputBuilder;

  /**
   * Create EIP-712 typed data for user decryption authorization.
   * @param publicKey - The user's public key for decryption
   * @param contractAddresses - Contract addresses authorized for decryption
   * @param userAddress - The user's wallet address
   * @param startTimestamp - Unix timestamp when the authorization starts (seconds)
   * @param durationDays - Number of days the authorization is valid
   */
  createEIP712(
    publicKey: Uint8Array,
    contractAddresses: `0x${string}`[],
    userAddress: `0x${string}`,
    startTimestamp: number,
    durationDays: number
  ): DecryptionEIP712Data;

  /**
   * Decrypt values using user authorization.
   * @param requests - Array of handle/contract pairs to decrypt
   * @param privateKey - User's private key for decryption
   * @param publicKey - User's public key for decryption
   * @param signature - EIP-712 signature authorizing decryption
   * @param contractAddresses - Authorized contract addresses
   * @param userAddress - User's wallet address
   * @param startTimestamp - Authorization start timestamp (seconds)
   * @param durationDays - Authorization duration in days
   */
  userDecrypt(
    requests: HandleContractPair[],
    privateKey: Uint8Array,
    publicKey: Uint8Array,
    signature: string,
    contractAddresses: `0x${string}`[],
    userAddress: `0x${string}`,
    startTimestamp: number,
    durationDays: number
  ): Promise<UserDecryptResults>;

  /**
   * Decrypt values using public (on-chain) decryption.
   * @param requests - Array of handle/contract pairs to decrypt
   */
  publicDecrypt(requests: HandleContractPair[]): Promise<UserDecryptResults>;

  /**
   * Get the chain ID this instance is configured for.
   */
  getChainId(): number;

  /**
   * Check if the instance supports a specific method.
   * Useful for feature detection.
   */
  supportsMethod(methodName: string): boolean;
}

/**
 * Default adapter implementation that wraps the relayer-sdk FhevmInstance.
 */
export class FhevmInstanceAdapter implements IFhevmInstanceAdapter {
  private readonly _instance: FhevmInstance;
  private readonly _chainId: number;

  constructor(instance: FhevmInstance, chainId: number) {
    this._instance = instance;
    this._chainId = chainId;
  }

  /**
   * Get the underlying FhevmInstance.
   * Use sparingly - prefer using adapter methods for better abstraction.
   */
  get rawInstance(): FhevmInstance {
    return this._instance;
  }

  createEncryptedInput(
    contractAddress: `0x${string}`,
    userAddress: `0x${string}`
  ): EncryptedInputBuilder {
    return this._instance.createEncryptedInput(
      contractAddress,
      userAddress
    ) as EncryptedInputBuilder;
  }

  createEIP712(
    publicKey: Uint8Array,
    contractAddresses: `0x${string}`[],
    userAddress: `0x${string}`,
    startTimestamp: number,
    durationDays: number
  ): DecryptionEIP712Data {
    const result = this._instance.createEIP712(
      publicKey,
      contractAddresses,
      userAddress,
      startTimestamp,
      durationDays
    );
    return result as unknown as DecryptionEIP712Data;
  }

  async userDecrypt(
    requests: HandleContractPair[],
    privateKey: Uint8Array,
    publicKey: Uint8Array,
    signature: string,
    contractAddresses: `0x${string}`[],
    userAddress: `0x${string}`,
    startTimestamp: number,
    durationDays: number
  ): Promise<UserDecryptResults> {
    return this._instance.userDecrypt(
      requests,
      privateKey,
      publicKey,
      signature,
      contractAddresses,
      userAddress,
      startTimestamp,
      durationDays
    );
  }

  async publicDecrypt(requests: HandleContractPair[]): Promise<UserDecryptResults> {
    return this._instance.publicDecrypt(requests);
  }

  getChainId(): number {
    return this._chainId;
  }

  supportsMethod(methodName: string): boolean {
    return typeof (this._instance as unknown as Record<string, unknown>)[methodName] === "function";
  }
}

/**
 * Create an adapter from a FhevmInstance.
 * @param instance - The FhevmInstance to wrap
 * @param chainId - The chain ID the instance is configured for
 */
export function createFhevmInstanceAdapter(
  instance: FhevmInstance,
  chainId: number
): IFhevmInstanceAdapter {
  return new FhevmInstanceAdapter(instance, chainId);
}

/**
 * Type guard to check if an object implements IFhevmInstanceAdapter.
 */
export function isFhevmInstanceAdapter(obj: unknown): obj is IFhevmInstanceAdapter {
  if (!obj || typeof obj !== "object") return false;
  const adapter = obj as Record<string, unknown>;
  return (
    typeof adapter.createEncryptedInput === "function" &&
    typeof adapter.createEIP712 === "function" &&
    typeof adapter.userDecrypt === "function" &&
    typeof adapter.publicDecrypt === "function" &&
    typeof adapter.getChainId === "function" &&
    typeof adapter.supportsMethod === "function"
  );
}
