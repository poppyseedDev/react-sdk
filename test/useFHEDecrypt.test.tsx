import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFHEDecrypt } from "../src/react/useFHEDecrypt";
import {
  createTestWrapper,
  createMockFhevmInstance,
  createMockEip1193Provider,
  ConnectedWrapper,
  TEST_ADDRESS,
  TEST_CHAIN_ID,
  MOCK_HANDLE,
} from "./utils";
import { GenericStringInMemoryStorage } from "../src/storage/GenericStringStorage";

// Mock the FhevmDecryptionSignature module
vi.mock("../src/FhevmDecryptionSignature", () => ({
  FhevmDecryptionSignature: {
    loadOrSign: vi.fn().mockResolvedValue({
      privateKey: "0xprivatekey",
      publicKey: "0xpublickey",
      signature: "0xsignature",
      contractAddresses: ["0x1234567890123456789012345678901234567890"],
      userAddress: "0x1234567890123456789012345678901234567890",
      startTimestamp: BigInt(Date.now()),
      durationDays: BigInt(1),
    }),
  },
}));

describe("useFHEDecrypt", () => {
  const contractAddress = "0x1234567890123456789012345678901234567890" as const;
  let storage: GenericStringInMemoryStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new GenericStringInMemoryStorage();
  });

  describe("canDecrypt", () => {
    it("should return false when instance is undefined", () => {
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: undefined,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return false when provider is undefined", () => {
      const mockInstance = createMockFhevmInstance();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: undefined,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return false when address is undefined", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: undefined,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return false when requests is undefined", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: undefined,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return false when requests is empty", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should return true when all params are provided", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.canDecrypt).toBe(true);
    });
  });

  describe("initial state", () => {
    it("should start with isDecrypting=false", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isDecrypting).toBe(false);
    });

    it("should start with empty message", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.message).toBe("");
    });

    it("should start with empty results", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.results).toEqual({});
    });

    it("should start with null error", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.error).toBeNull();
    });
  });

  describe("decrypt function", () => {
    it("should provide decrypt function", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(typeof result.current.decrypt).toBe("function");
    });

    it("should not start when canDecrypt is false", () => {
      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: undefined,
            provider: undefined,
            address: undefined,
            fhevmDecryptionSignatureStorage: storage,
            chainId: undefined,
            requests: undefined,
          }),
        { wrapper: ConnectedWrapper }
      );

      act(() => {
        result.current.decrypt();
      });

      expect(result.current.isDecrypting).toBe(false);
    });
  });

  describe("setMessage and setError", () => {
    it("should provide setMessage function", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(typeof result.current.setMessage).toBe("function");
    });

    it("should update message when setMessage is called", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      act(() => {
        result.current.setMessage("Custom message");
      });

      expect(result.current.message).toBe("Custom message");
    });

    it("should provide setError function", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(typeof result.current.setError).toBe("function");
    });

    it("should update error when setError is called", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      act(() => {
        result.current.setError("Custom error");
      });

      expect(result.current.error).toBe("Custom error");
    });
  });

  describe("multiple requests", () => {
    it("should accept multiple requests", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();
      const handle2 = "0x" + "22".repeat(32);

      const { result } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [
              { handle: MOCK_HANDLE, contractAddress },
              { handle: handle2, contractAddress },
            ],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.canDecrypt).toBe(true);
    });
  });

  describe("memoization", () => {
    it("should provide callable decrypt function after rerender", () => {
      const mockInstance = createMockFhevmInstance();
      const mockProvider = createMockEip1193Provider();

      const { result, rerender } = renderHook(
        () =>
          useFHEDecrypt({
            instance: mockInstance,
            provider: mockProvider,
            address: TEST_ADDRESS,
            fhevmDecryptionSignatureStorage: storage,
            chainId: TEST_CHAIN_ID,
            requests: [{ handle: MOCK_HANDLE, contractAddress }],
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(typeof result.current.decrypt).toBe("function");
      rerender();
      expect(typeof result.current.decrypt).toBe("function");
    });
  });
});
