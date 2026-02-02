import type {
  FhevmInstance as _FhevmInstance,
  HandleContractPair as _HandleContractPair,
  UserDecryptResults as _UserDecryptResults,
  FhevmInstanceConfig as _FhevmInstanceConfig,
} from "@zama-fhe/relayer-sdk/bundle";

export type FhevmInstance = _FhevmInstance;
export type FhevmInstanceConfig = _FhevmInstanceConfig;
export type HandleContractPair = _HandleContractPair;
export type UserDecryptResults = _UserDecryptResults;

export type FhevmDecryptionSignatureType = {
  publicKey: string;
  privateKey: string;
  signature: string;
  startTimestamp: number; // Unix timestamp in seconds
  durationDays: number;
  userAddress: `0x${string}`;
  contractAddresses: `0x${string}`[];
  eip712: EIP712Type;
};

/**
 * EIP-712 message value types.
 * Values can be primitives, arrays, or nested objects.
 */
export type EIP712MessageValue =
  | string
  | number
  | bigint
  | boolean
  | `0x${string}`
  | Uint8Array
  | EIP712MessageValue[]
  | { [key: string]: EIP712MessageValue };

/**
 * EIP-712 typed data structure for signing.
 */
export type EIP712Type = {
  domain: {
    chainId: number;
    name: string;
    verifyingContract: `0x${string}`;
    version: string;
  };

  /** The message to sign. Structure varies based on primaryType. */
  message: Record<string, EIP712MessageValue>;
  primaryType: string;
  types: {
    [key: string]: {
      name: string;
      type: string;
    }[];
  };
};
