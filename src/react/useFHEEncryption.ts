"use client";

import { RelayerEncryptedInput } from "@zama-fhe/relayer-sdk/web";
import { useCallback, useMemo } from "react";
import { FhevmInstance } from "../fhevmTypes.js";

export type EncryptResult = {
  handles: Uint8Array[];
  inputProof: Uint8Array;
};

/**
 * ABI input/output parameter definition.
 * @internal
 */
interface AbiParameter {
  name: string;
  type: string;
  indexed?: boolean;
  components?: AbiParameter[];
  internalType?: string;
}

/**
 * ABI function definition.
 * @internal
 */
interface AbiFunction {
  type: "function";
  name: string;
  inputs: AbiParameter[];
  outputs?: AbiParameter[];
  stateMutability?: "pure" | "view" | "nonpayable" | "payable";
}

/**
 * ABI item - can be function, event, error, constructor, etc.
 * @internal
 */
type AbiItem =
  | AbiFunction
  | { type: "event"; name: string; inputs: AbiParameter[] }
  | { type: "error"; name: string; inputs: AbiParameter[] }
  | { type: "constructor"; inputs: AbiParameter[] }
  | { type: "fallback" }
  | { type: "receive" };

// Map external encrypted integer type to RelayerEncryptedInput builder method
export const getEncryptionMethod = (internalType: string) => {
  switch (internalType) {
    case "externalEbool":
      return "addBool" as const;
    case "externalEuint8":
      return "add8" as const;
    case "externalEuint16":
      return "add16" as const;
    case "externalEuint32":
      return "add32" as const;
    case "externalEuint64":
      return "add64" as const;
    case "externalEuint128":
      return "add128" as const;
    case "externalEuint256":
      return "add256" as const;
    case "externalEaddress":
      return "addAddress" as const;
    default:
      console.warn(`Unknown internalType: ${internalType}, defaulting to add64`);
      return "add64" as const;
  }
};

// Convert Uint8Array or hex-like string to 0x-prefixed hex string
export const toHex = (value: Uint8Array | string): `0x${string}` => {
  if (typeof value === "string") {
    return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
  }
  // value is Uint8Array
  return ("0x" + Buffer.from(value).toString("hex")) as `0x${string}`;
};

/**
 * ABI parameter value - the possible types that can be passed to a contract function.
 */
type AbiParamValue = `0x${string}` | bigint | string | boolean;

/**
 * Build contract params from EncryptResult and ABI for a given function.
 * @deprecated This function is part of the legacy encryption API.
 */
export const buildParamsFromAbi = (
  enc: EncryptResult,
  abi: readonly AbiItem[],
  functionName: string
): AbiParamValue[] => {
  const fn = abi.find(
    (item): item is AbiFunction => item.type === "function" && item.name === functionName
  );
  if (!fn) throw new Error(`Function ABI not found for ${functionName}`);

  return fn.inputs.map((input: AbiParameter, index: number): AbiParamValue => {
    const raw = index === 0 ? enc.handles[0] : enc.inputProof;
    switch (input.type) {
      case "bytes32":
      case "bytes":
        return toHex(raw);
      case "uint256":
        return BigInt(toHex(raw));
      case "address":
      case "string":
        return toHex(raw);
      case "bool":
        return Boolean(raw);
      default:
        console.warn(`Unknown ABI param type ${input.type}; passing as hex`);
        return toHex(raw);
    }
  });
};

/**
 * @deprecated Use useEncrypt instead, which provides a simpler API and integrates with FhevmProvider context.
 *
 * Legacy hook for FHE encryption. Requires manual instance and address management.
 */
export const useFHEEncryption = (params: {
  instance: FhevmInstance | undefined;
  /** User's wallet address */
  userAddress: `0x${string}` | undefined;
  contractAddress: `0x${string}` | undefined;
}) => {
  const { instance, userAddress, contractAddress } = params;

  const canEncrypt = useMemo(
    () => Boolean(instance && userAddress && contractAddress),
    [instance, userAddress, contractAddress]
  );

  const encryptWith = useCallback(
    async (
      buildFn: (builder: RelayerEncryptedInput) => void
    ): Promise<EncryptResult | undefined> => {
      if (!instance || !userAddress || !contractAddress) return undefined;

      const input = instance.createEncryptedInput(
        contractAddress,
        userAddress
      ) as RelayerEncryptedInput;
      buildFn(input);
      const enc = await input.encrypt();
      return enc;
    },
    [instance, userAddress, contractAddress]
  );

  return {
    canEncrypt,
    encryptWith,
  } as const;
};
