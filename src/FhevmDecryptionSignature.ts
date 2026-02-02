import { EIP712Type, FhevmDecryptionSignatureType, FhevmInstance } from "./fhevmTypes";
import {
  isAddress,
  signTypedData,
  type Eip1193Provider,
  type EIP712TypedData,
} from "./internal/eip1193";
import { GenericStringStorage } from "./storage/GenericStringStorage";

/**
 * Check if the FhevmInstance has the required signing methods.
 * These methods are available on the relayer-sdk instance but the types
 * may not perfectly match our internal types.
 * @internal
 */
function hasSigningMethods(instance: FhevmInstance): instance is FhevmInstance & {
  createEIP712: (
    publicKey: string,
    contractAddresses: string[],
    startTimestamp: number,
    durationDays: number
  ) => unknown;
  generateKeypair: () => { publicKey: string; privateKey: string };
} {
  const inst = instance as unknown as Record<string, unknown>;
  return typeof inst.createEIP712 === "function" && typeof inst.generateKeypair === "function";
}

/**
 * Safely call createEIP712 and convert the result to our EIP712Type.
 * The relayer-sdk returns a type with bigint chainId but we use number.
 * @internal
 */
function callCreateEIP712(
  instance: FhevmInstance,
  publicKey: string,
  contractAddresses: string[],
  startTimestamp: number,
  durationDays: number
): EIP712Type {
  if (!hasSigningMethods(instance)) {
    throw new Error(
      "FhevmInstance does not have createEIP712 method. " +
        "Ensure you are using a compatible version of the relayer-sdk."
    );
  }

  const result = instance.createEIP712(publicKey, contractAddresses, startTimestamp, durationDays);

  // The relayer-sdk may return chainId as bigint, but we need number
  // Convert the result to our expected EIP712Type format
  const eip712 = result as unknown as {
    domain: { chainId: number | bigint; name: string; verifyingContract: string; version: string };
    message: Record<string, unknown>;
    primaryType: string;
    types: Record<string, { name: string; type: string }[]>;
  };

  return {
    domain: {
      chainId:
        typeof eip712.domain.chainId === "bigint"
          ? Number(eip712.domain.chainId)
          : eip712.domain.chainId,
      name: eip712.domain.name,
      verifyingContract: eip712.domain.verifyingContract as `0x${string}`,
      version: eip712.domain.version,
    },
    message: eip712.message as Record<string, EIP712Type["message"][string]>,
    primaryType: eip712.primaryType,
    types: eip712.types,
  };
}

function _timestampNow(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Parameters for signing a decryption request.
 */
export interface SignerParams {
  /** EIP-1193 provider (window.ethereum, wagmi connector, etc.) */
  provider: Eip1193Provider;
  /** User's wallet address */
  address: `0x${string}`;
}

class FhevmDecryptionSignatureStorageKey {
  #contractAddresses: `0x${string}`[];
  #userAddress: `0x${string}`;
  #publicKey: string | undefined;
  #key: string;

  constructor(
    _instance: FhevmInstance,
    contractAddresses: string[],
    userAddress: string,
    publicKey?: string
  ) {
    if (!isAddress(userAddress)) {
      throw new TypeError(`Invalid address ${userAddress}`);
    }

    const sortedContractAddresses = (contractAddresses as `0x${string}`[]).sort();

    // Create a simple, stable storage key based on user address and contract addresses
    // This ensures the key doesn't change between page loads even if the FhevmInstance differs
    const contractsHash = sortedContractAddresses.join(",").toLowerCase();

    this.#contractAddresses = sortedContractAddresses;
    this.#userAddress = userAddress.toLowerCase() as `0x${string}`;
    this.#publicKey = publicKey;
    // Key format: userAddress:contracts_hash[:publicKey]
    this.#key = publicKey
      ? `sig:${userAddress.toLowerCase()}:${contractsHash}:${publicKey.slice(0, 20)}`
      : `sig:${userAddress.toLowerCase()}:${contractsHash}`;
  }

  get contractAddresses(): `0x${string}`[] {
    return this.#contractAddresses;
  }

  get userAddress(): `0x${string}` {
    return this.#userAddress;
  }

  get publicKey(): string | undefined {
    return this.#publicKey;
  }

  get key(): string {
    return this.#key;
  }
}

export class FhevmDecryptionSignature {
  #publicKey: string;
  #privateKey: string;
  #signature: string;
  #startTimestamp: number;
  #durationDays: number;
  #userAddress: `0x${string}`;
  #contractAddresses: `0x${string}`[];
  #eip712: EIP712Type;

  private constructor(parameters: FhevmDecryptionSignatureType) {
    if (!FhevmDecryptionSignature.checkIs(parameters)) {
      throw new TypeError("Invalid FhevmDecryptionSignatureType");
    }
    this.#publicKey = parameters.publicKey;
    this.#privateKey = parameters.privateKey;
    this.#signature = parameters.signature;
    this.#startTimestamp = parameters.startTimestamp;
    this.#durationDays = parameters.durationDays;
    this.#userAddress = parameters.userAddress;
    this.#contractAddresses = parameters.contractAddresses;
    this.#eip712 = parameters.eip712;
  }

  public get privateKey() {
    return this.#privateKey;
  }

  public get publicKey() {
    return this.#publicKey;
  }

  public get signature() {
    return this.#signature;
  }

  public get contractAddresses() {
    return this.#contractAddresses;
  }

  public get startTimestamp() {
    return this.#startTimestamp;
  }

  public get durationDays() {
    return this.#durationDays;
  }

  public get userAddress() {
    return this.#userAddress;
  }

  /**
   * Type guard to check if an unknown value is a valid FhevmDecryptionSignatureType.
   * @param s - Value to check
   * @returns True if the value is a valid signature type
   */
  static checkIs(s: unknown): s is FhevmDecryptionSignatureType {
    if (!s || typeof s !== "object") {
      return false;
    }

    // Use type assertion once after initial check, then access properties safely
    const obj = s as Record<string, unknown>;

    // Check required string fields
    if (typeof obj.publicKey !== "string") return false;
    if (typeof obj.privateKey !== "string") return false;
    if (typeof obj.signature !== "string") return false;

    // Check required number fields
    if (typeof obj.startTimestamp !== "number") return false;
    if (typeof obj.durationDays !== "number") return false;

    // Check userAddress
    if (typeof obj.userAddress !== "string" || !obj.userAddress.startsWith("0x")) {
      return false;
    }

    // Check contractAddresses array
    if (!Array.isArray(obj.contractAddresses)) return false;
    for (const addr of obj.contractAddresses) {
      if (typeof addr !== "string" || !addr.startsWith("0x")) {
        return false;
      }
    }

    // Check eip712 object structure
    if (!obj.eip712 || typeof obj.eip712 !== "object") return false;
    const eip712 = obj.eip712 as Record<string, unknown>;

    if (!eip712.domain || typeof eip712.domain !== "object") return false;
    if (typeof eip712.primaryType !== "string") return false;
    if (!("message" in eip712)) return false;
    if (!eip712.types || typeof eip712.types !== "object") return false;

    return true;
  }

  toJSON() {
    return {
      publicKey: this.#publicKey,
      privateKey: this.#privateKey,
      signature: this.#signature,
      startTimestamp: this.#startTimestamp,
      durationDays: this.#durationDays,
      userAddress: this.#userAddress,
      contractAddresses: this.#contractAddresses,
      eip712: this.#eip712,
    };
  }

  /**
   * Deserialize a FhevmDecryptionSignature from JSON.
   * @param json - JSON string or parsed object
   * @returns FhevmDecryptionSignature instance
   * @throws TypeError if the JSON is invalid or doesn't match the expected schema
   */
  static fromJSON(json: unknown): FhevmDecryptionSignature {
    // Type guard for BigInt serialization format
    const isBigIntSerialized = (v: unknown): v is { __type: "bigint"; value: string } => {
      if (!v || typeof v !== "object") return false;
      const obj = v as Record<string, unknown>;
      return obj.__type === "bigint" && typeof obj.value === "string";
    };

    // Custom reviver to handle BigInt deserialization
    const reviver = (_key: string, value: unknown): unknown => {
      if (isBigIntSerialized(value)) {
        return BigInt(value.value);
      }
      return value;
    };

    // Parse if string, otherwise use as-is
    let data: unknown;
    try {
      data = typeof json === "string" ? JSON.parse(json, reviver) : json;
    } catch (parseError) {
      throw new TypeError(
        `Invalid JSON format for FhevmDecryptionSignature: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }

    // Validate the parsed data using the existing type guard
    if (!FhevmDecryptionSignature.checkIs(data)) {
      throw new TypeError(
        "Invalid FhevmDecryptionSignature data: missing or invalid required fields. " +
          "Expected: publicKey, privateKey, signature, startTimestamp, durationDays, " +
          "userAddress, contractAddresses, and eip712."
      );
    }

    // Safe to construct - checkIs validates all required fields
    return new FhevmDecryptionSignature(data);
  }

  equals(s: FhevmDecryptionSignatureType) {
    return s.signature === this.#signature;
  }

  isValid(): boolean {
    return _timestampNow() < this.#startTimestamp + this.#durationDays * 24 * 60 * 60;
  }

  async saveToGenericStringStorage(
    storage: GenericStringStorage,
    instance: FhevmInstance,
    withPublicKey: boolean
  ) {
    try {
      // Custom replacer to handle BigInt serialization
      const replacer = (_key: string, value: unknown): unknown => {
        if (typeof value === "bigint") {
          return { __type: "bigint", value: value.toString() };
        }
        return value;
      };

      const value = JSON.stringify(this.toJSON(), replacer);

      const storageKey = new FhevmDecryptionSignatureStorageKey(
        instance,
        this.#contractAddresses,
        this.#userAddress,
        withPublicKey ? this.#publicKey : undefined
      );
      console.log("[FhevmDecryptionSignature] Saving signature with key:", storageKey.key);
      await storage.setItem(storageKey.key, value);
    } catch (e) {
      console.error("[FhevmDecryptionSignature] Failed to save to storage:", e);
    }
  }

  static async loadFromGenericStringStorage(
    storage: GenericStringStorage,
    instance: FhevmInstance,
    contractAddresses: string[],
    userAddress: string,
    publicKey?: string
  ): Promise<FhevmDecryptionSignature | null> {
    try {
      const storageKey = new FhevmDecryptionSignatureStorageKey(
        instance,
        contractAddresses,
        userAddress,
        publicKey
      );

      console.log(
        "[FhevmDecryptionSignature] Looking for cached signature with key:",
        storageKey.key
      );
      const result = await storage.getItem(storageKey.key);

      if (!result) {
        console.log("[FhevmDecryptionSignature] No cached signature found");
        return null;
      }

      try {
        const kps = FhevmDecryptionSignature.fromJSON(result);
        if (!kps.isValid()) {
          console.log("[FhevmDecryptionSignature] Cached signature expired");
          return null;
        }

        console.log("[FhevmDecryptionSignature] Found valid cached signature");
        return kps;
      } catch (e) {
        console.log("[FhevmDecryptionSignature] Failed to parse cached signature:", e);
        return null;
      }
    } catch (e) {
      console.log("[FhevmDecryptionSignature] Error loading from storage:", e);
      return null;
    }
  }

  /**
   * Create a new decryption signature using EIP-1193 provider.
   */
  static async new(
    instance: FhevmInstance,
    contractAddresses: string[],
    publicKey: string,
    privateKey: string,
    signer: SignerParams
  ): Promise<FhevmDecryptionSignature | null> {
    try {
      const userAddress = signer.address;
      const startTimestamp = _timestampNow();
      // Default to 1 day for security - developers can override
      const durationDays = 1;

      // Safely call createEIP712 with type conversion
      const eip712 = callCreateEIP712(
        instance,
        publicKey,
        contractAddresses,
        startTimestamp,
        durationDays
      );

      // Convert to our EIP712TypedData format
      const typedData: EIP712TypedData = {
        domain: eip712.domain,
        types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        primaryType: "UserDecryptRequestVerification",
        message: eip712.message,
      };

      // Sign using EIP-1193 provider directly
      const signature = await signTypedData(signer.provider, userAddress, typedData);

      return new FhevmDecryptionSignature({
        publicKey,
        privateKey,
        contractAddresses: contractAddresses as `0x${string}`[],
        startTimestamp,
        durationDays,
        signature,
        eip712,
        userAddress,
      });
    } catch (err) {
      console.error("[FhevmDecryptionSignature] Failed to create signature:", err);
      return null;
    }
  }

  /**
   * Load a cached signature or create a new one.
   * Uses EIP-1193 provider for signing.
   */
  static async loadOrSign(
    instance: FhevmInstance,
    contractAddresses: string[],
    signer: SignerParams,
    storage: GenericStringStorage,
    keyPair?: { publicKey: string; privateKey: string }
  ): Promise<FhevmDecryptionSignature | null> {
    const userAddress = signer.address;

    // Debug: Check storage type
    const storageType = storage.constructor?.name || "unknown";
    console.log("[FhevmDecryptionSignature] Using storage type:", storageType);
    console.log("[FhevmDecryptionSignature] Contract addresses:", contractAddresses);
    console.log("[FhevmDecryptionSignature] User address:", userAddress);

    const cached: FhevmDecryptionSignature | null =
      await FhevmDecryptionSignature.loadFromGenericStringStorage(
        storage,
        instance,
        contractAddresses,
        userAddress,
        keyPair?.publicKey
      );

    if (cached) {
      console.log("[FhevmDecryptionSignature] Using cached signature");
      return cached;
    }

    console.log("[FhevmDecryptionSignature] Generating new keypair...");

    // Get keypair - either provided or generate new one
    let publicKey: string;
    let privateKey: string;

    if (keyPair) {
      publicKey = keyPair.publicKey;
      privateKey = keyPair.privateKey;
    } else {
      // Validate instance has required methods
      if (!hasSigningMethods(instance)) {
        console.error(
          "[FhevmDecryptionSignature] FhevmInstance does not have generateKeypair method"
        );
        return null;
      }
      const generated = instance.generateKeypair();
      publicKey = generated.publicKey;
      privateKey = generated.privateKey;
    }

    const sig = await FhevmDecryptionSignature.new(
      instance,
      contractAddresses,
      publicKey,
      privateKey,
      signer
    );

    if (!sig) {
      console.error("[FhevmDecryptionSignature] Failed to create signature");
      return null;
    }

    await sig.saveToGenericStringStorage(storage, instance, Boolean(keyPair?.publicKey));

    return sig;
  }
}
