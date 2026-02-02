import type { FhevmInstance, FhevmInstanceConfig } from "../fhevmTypes";

/**
 * TFHE initialization parameters.
 * These are passed to the TFHE library for cryptographic setup.
 */
export interface TfheInitParams {
  /** WASM module URL override */
  wasmUrl?: string;
  /** Public key parameters */
  publicKeyParams?: Uint8Array;
  /** Additional TFHE configuration */
  [key: string]: unknown;
}

/**
 * KMS (Key Management Service) initialization parameters.
 * These configure the connection to the key management service.
 */
export interface KmsInitParams {
  /** KMS endpoint URL */
  url?: string;
  /** Authentication token */
  authToken?: string;
  /** Additional KMS configuration */
  [key: string]: unknown;
}

/**
 * Options for initializing the FHEVM SDK.
 */
export type FhevmInitSDKOptions = {
  /** TFHE cryptographic library parameters */
  tfheParams?: TfheInitParams;
  /** Key Management Service parameters */
  kmsParams?: KmsInitParams;
  /** Number of threads for WASM execution */
  thread?: number;
};

export type FhevmCreateInstanceType = () => Promise<FhevmInstance>;
export type FhevmInitSDKType = (options?: FhevmInitSDKOptions) => Promise<boolean>;
export type FhevmLoadSDKType = () => Promise<void>;
export type IsFhevmSupportedType = (chainId: number) => boolean;

export type FhevmRelayerSDKType = {
  initSDK: FhevmInitSDKType;
  createInstance: (config: FhevmInstanceConfig) => Promise<FhevmInstance>;
  SepoliaConfig: FhevmInstanceConfig;
  __initialized__?: boolean;
};
export type FhevmWindowType = {
  relayerSDK: FhevmRelayerSDKType;
};
