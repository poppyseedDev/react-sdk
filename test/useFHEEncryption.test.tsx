import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useFHEEncryption,
  getEncryptionMethod,
  toHex,
  buildParamsFromAbi,
} from "../src/react/useFHEEncryption";
import {
  createTestWrapper,
  createMockFhevmInstance,
  ConnectedWrapper,
  TEST_ADDRESS,
} from "./utils";

describe("useFHEEncryption", () => {
  const contractAddress = "0x1234567890123456789012345678901234567890" as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canEncrypt", () => {
    it("should return false when instance is undefined", () => {
      const { result } = renderHook(
        () =>
          useFHEEncryption({
            instance: undefined,
            userAddress: TEST_ADDRESS,
            contractAddress,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.canEncrypt).toBe(false);
    });

    it("should return false when userAddress is undefined", () => {
      const mockInstance = createMockFhevmInstance();

      const { result } = renderHook(
        () =>
          useFHEEncryption({
            instance: mockInstance,
            userAddress: undefined,
            contractAddress,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.canEncrypt).toBe(false);
    });

    it("should return false when contractAddress is undefined", () => {
      const mockInstance = createMockFhevmInstance();

      const { result } = renderHook(
        () =>
          useFHEEncryption({
            instance: mockInstance,
            userAddress: TEST_ADDRESS,
            contractAddress: undefined,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.canEncrypt).toBe(false);
    });

    it("should return true when all params are provided", () => {
      const mockInstance = createMockFhevmInstance();

      const { result } = renderHook(
        () =>
          useFHEEncryption({
            instance: mockInstance,
            userAddress: TEST_ADDRESS,
            contractAddress,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.canEncrypt).toBe(true);
    });
  });

  describe("encryptWith", () => {
    it("should return undefined when not ready", async () => {
      const { result } = renderHook(
        () =>
          useFHEEncryption({
            instance: undefined,
            userAddress: TEST_ADDRESS,
            contractAddress,
          }),
        { wrapper: ConnectedWrapper }
      );

      const encrypted = await result.current.encryptWith(() => {});

      expect(encrypted).toBeUndefined();
    });

    it("should call createEncryptedInput when ready", async () => {
      const mockEncrypt = vi.fn().mockResolvedValue({
        handles: [new Uint8Array(32)],
        inputProof: new Uint8Array(64),
      });

      const mockBuilder = {
        add64: vi.fn().mockReturnThis(),
        encrypt: mockEncrypt,
      };

      const mockInstance = createMockFhevmInstance({
        createEncryptedInput: vi.fn().mockReturnValue(mockBuilder),
      });

      const { result } = renderHook(
        () =>
          useFHEEncryption({
            instance: mockInstance,
            userAddress: TEST_ADDRESS,
            contractAddress,
          }),
        { wrapper: ConnectedWrapper }
      );

      const encrypted = await result.current.encryptWith((builder) => {
        builder.add64(100n);
      });

      expect(mockInstance.createEncryptedInput).toHaveBeenCalledWith(
        contractAddress,
        TEST_ADDRESS
      );
      expect(mockBuilder.add64).toHaveBeenCalledWith(100n);
      expect(mockEncrypt).toHaveBeenCalled();
      expect(encrypted).toBeDefined();
    });
  });

  describe("memoization", () => {
    it("should maintain stable encryptWith reference", () => {
      const mockInstance = createMockFhevmInstance();

      const { result, rerender } = renderHook(
        () =>
          useFHEEncryption({
            instance: mockInstance,
            userAddress: TEST_ADDRESS,
            contractAddress,
          }),
        { wrapper: ConnectedWrapper }
      );

      const firstEncryptWith = result.current.encryptWith;
      rerender();
      const secondEncryptWith = result.current.encryptWith;

      expect(firstEncryptWith).toBe(secondEncryptWith);
    });
  });
});

describe("getEncryptionMethod", () => {
  it("should return addBool for externalEbool", () => {
    expect(getEncryptionMethod("externalEbool")).toBe("addBool");
  });

  it("should return add8 for externalEuint8", () => {
    expect(getEncryptionMethod("externalEuint8")).toBe("add8");
  });

  it("should return add16 for externalEuint16", () => {
    expect(getEncryptionMethod("externalEuint16")).toBe("add16");
  });

  it("should return add32 for externalEuint32", () => {
    expect(getEncryptionMethod("externalEuint32")).toBe("add32");
  });

  it("should return add64 for externalEuint64", () => {
    expect(getEncryptionMethod("externalEuint64")).toBe("add64");
  });

  it("should return add128 for externalEuint128", () => {
    expect(getEncryptionMethod("externalEuint128")).toBe("add128");
  });

  it("should return add256 for externalEuint256", () => {
    expect(getEncryptionMethod("externalEuint256")).toBe("add256");
  });

  it("should return addAddress for externalEaddress", () => {
    expect(getEncryptionMethod("externalEaddress")).toBe("addAddress");
  });

  it("should default to add64 for unknown type", () => {
    expect(getEncryptionMethod("unknownType")).toBe("add64");
  });
});

describe("toHex", () => {
  it("should convert Uint8Array to hex string", () => {
    const bytes = new Uint8Array([0x12, 0x34, 0x56]);
    expect(toHex(bytes)).toBe("0x123456");
  });

  it("should pass through string with 0x prefix", () => {
    expect(toHex("0xabcdef")).toBe("0xabcdef");
  });

  it("should add 0x prefix to string without it", () => {
    expect(toHex("abcdef")).toBe("0xabcdef");
  });

  it("should handle empty Uint8Array", () => {
    const bytes = new Uint8Array([]);
    expect(toHex(bytes)).toBe("0x");
  });

  it("should handle single byte", () => {
    const bytes = new Uint8Array([0xff]);
    expect(toHex(bytes)).toBe("0xff");
  });
});

describe("buildParamsFromAbi", () => {
  const mockAbi = [
    {
      type: "function",
      name: "testFunction",
      inputs: [
        { name: "handle", type: "bytes32" },
        { name: "proof", type: "bytes" },
      ],
    },
  ];

  it("should throw error for missing function", () => {
    const encResult = {
      handles: [new Uint8Array(32)],
      inputProof: new Uint8Array(64),
    };

    expect(() => buildParamsFromAbi(encResult, mockAbi, "nonExistent")).toThrow(
      "Function ABI not found for nonExistent"
    );
  });

  it("should build params for bytes32 and bytes types", () => {
    const encResult = {
      handles: [new Uint8Array(32).fill(0x12)],
      inputProof: new Uint8Array(64).fill(0xab),
    };

    const params = buildParamsFromAbi(encResult, mockAbi, "testFunction");

    expect(params).toHaveLength(2);
    expect(params[0]).toMatch(/^0x/);
    expect(params[1]).toMatch(/^0x/);
  });

  it("should handle bool type", () => {
    const abiWithBool = [
      {
        type: "function",
        name: "boolFunction",
        inputs: [{ name: "flag", type: "bool" }],
      },
    ];

    const encResult = {
      handles: [new Uint8Array(1).fill(1)],
      inputProof: new Uint8Array(0),
    };

    const params = buildParamsFromAbi(encResult, abiWithBool, "boolFunction");
    expect(params[0]).toBe(true);
  });

  it("should handle address type", () => {
    const abiWithAddress = [
      {
        type: "function",
        name: "addressFunction",
        inputs: [{ name: "addr", type: "address" }],
      },
    ];

    const address = "0x1234567890123456789012345678901234567890";
    const encResult = {
      handles: [address as unknown as Uint8Array],
      inputProof: new Uint8Array(0),
    };

    const params = buildParamsFromAbi(encResult, abiWithAddress, "addressFunction");
    expect(params[0]).toBe(address);
  });
});
