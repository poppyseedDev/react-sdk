// Config (wagmi-style API)
export {
  createFhevmConfig,
  createStorage,
  createMemoryStorage,
  noopStorage,
  type FhevmConfig,
  type FhevmConfigOptions,
  type FhevmStorage,
  type ConfigChainId,
} from "./config";

// Chains (wagmi-style API)
export * from "./chains/index";

// Core functionality
export * from "./core/index";
export * from "./storage/index";
export * from "./fhevmTypes";
export * from "./FhevmDecryptionSignature";

// EIP-1193 provider types (for use without ethers/viem/wagmi)
export type {
  Eip1193Provider,
  TypedDataDomain,
  TypedDataField,
  EIP712TypedData,
} from "./internal/eip1193";

// Encryption types
export type { FheTypeName, EncryptInput, EncryptResult, EncryptedOutput } from "./types/encryption";

// Transfer types
export type {
  TransferStatus,
  UseConfidentialTransferOptions,
  UseConfidentialTransferReturn,
} from "./types/transfer";

// Balance types
export type {
  BalanceStatus,
  ConfidentialBalanceConfig,
  ConfidentialBalanceResult,
  DecryptedValue,
  UseConfidentialBalancesOptions,
  UseConfidentialBalancesReturn,
} from "./types/balance";

// Shield/Unshield types
export type {
  ShieldStatus,
  UnshieldStatus,
  UseShieldOptions,
  UseShieldReturn,
  UseUnshieldOptions,
  UseUnshieldReturn,
} from "./types/shield";

// ABIs
export { ERC7984_ABI, ERC20TOERC7984_ABI, ERC20_ABI } from "./abi/index";

// Logger configuration (for enabling debug mode)
export { configureLogger, getLoggerConfig } from "./internal/logger";

// FhevmInstance adapter for testing and abstraction
export {
  FhevmInstanceAdapter,
  createFhevmInstanceAdapter,
  isFhevmInstanceAdapter,
  type IFhevmInstanceAdapter,
  type EncryptedInputBuilder,
  type DecryptionEIP712Data,
} from "./internal/FhevmInstanceAdapter";

// RelayerSDKLoader for advanced CDN configuration
export { RelayerSDKLoader, type RelayerSDKLoaderOptions } from "./internal/RelayerSDKLoader";

// Public key storage utilities
export { getPublicKeyStorageType } from "./internal/PublicKeyStorage";

// React hooks and provider
export * from "./react/index";
