import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useEncrypt } from "../src/react/useEncrypt";
import {
  createTestWrapper,
  createMockFhevmInstance,
  ConnectedWrapper,
  DisconnectedWrapper,
  InitializingWrapper,
  TEST_ADDRESS,
} from "./utils";

describe("useEncrypt", () => {
  const contractAddress = "0x1234567890123456789012345678901234567890" as const;

  describe("isReady", () => {
    it("should return isReady=false when not connected", () => {
      const { result } = renderHook(() => useEncrypt(), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.isReady).toBe(false);
    });

    it("should return isReady=false when initializing", () => {
      const { result } = renderHook(() => useEncrypt(), {
        wrapper: InitializingWrapper,
      });

      expect(result.current.isReady).toBe(false);
    });

    it("should return isReady=true when ready and connected", () => {
      const { result } = renderHook(() => useEncrypt(), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isReady).toBe(true);
    });

    it("should return isReady=false when no address", () => {
      const { result } = renderHook(() => useEncrypt(), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          contextOverrides: { address: undefined },
        }),
      });

      expect(result.current.isReady).toBe(false);
    });
  });

  describe("encrypt function", () => {
    it("should return undefined when not ready", async () => {
      const { result } = renderHook(() => useEncrypt(), {
        wrapper: DisconnectedWrapper,
      });

      const encrypted = await result.current.encrypt(
        [{ type: "uint64", value: 100n }],
        contractAddress
      );

      expect(encrypted).toBeUndefined();
    });

    it("should encrypt single uint64 value", async () => {
      const mockEncrypt = vi.fn().mockResolvedValue({
        handles: ["0xhandle1"],
        inputProof: "0xproof",
      });

      const mockBuilder = {
        add64: vi.fn().mockReturnThis(),
        encrypt: mockEncrypt,
      };

      const mockInstance = createMockFhevmInstance({
        createEncryptedInput: vi.fn().mockReturnValue(mockBuilder),
      });

      const { result } = renderHook(() => useEncrypt(), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          instance: mockInstance,
        }),
      });

      const encrypted = await result.current.encrypt(
        [{ type: "uint64", value: 100n }],
        contractAddress
      );

      expect(mockInstance.createEncryptedInput).toHaveBeenCalledWith(
        contractAddress,
        TEST_ADDRESS
      );
      expect(mockBuilder.add64).toHaveBeenCalledWith(100n);
      expect(mockEncrypt).toHaveBeenCalled();
      expect(encrypted).toEqual(["0xhandle1", "0xproof"]);
    });

    it("should encrypt multiple values", async () => {
      const mockEncrypt = vi.fn().mockResolvedValue({
        handles: ["0xhandle1", "0xhandle2"],
        inputProof: "0xproof",
      });

      const mockBuilder = {
        add64: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: mockEncrypt,
      };

      const mockInstance = createMockFhevmInstance({
        createEncryptedInput: vi.fn().mockReturnValue(mockBuilder),
      });

      const { result } = renderHook(() => useEncrypt(), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          instance: mockInstance,
        }),
      });

      const recipientAddress = "0xabcdef1234567890abcdef1234567890abcdef12" as const;
      const encrypted = await result.current.encrypt(
        [
          { type: "uint64", value: 100n },
          { type: "address", value: recipientAddress },
        ],
        contractAddress
      );

      expect(mockBuilder.add64).toHaveBeenCalledWith(100n);
      expect(mockBuilder.addAddress).toHaveBeenCalledWith(recipientAddress);
      expect(encrypted).toEqual(["0xhandle1", "0xhandle2", "0xproof"]);
    });

    it("should encrypt boolean values", async () => {
      const mockEncrypt = vi.fn().mockResolvedValue({
        handles: ["0xboolhandle"],
        inputProof: "0xproof",
      });

      const mockBuilder = {
        addBool: vi.fn().mockReturnThis(),
        encrypt: mockEncrypt,
      };

      const mockInstance = createMockFhevmInstance({
        createEncryptedInput: vi.fn().mockReturnValue(mockBuilder),
      });

      const { result } = renderHook(() => useEncrypt(), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          instance: mockInstance,
        }),
      });

      const encrypted = await result.current.encrypt(
        [{ type: "bool", value: true }],
        contractAddress
      );

      expect(mockBuilder.addBool).toHaveBeenCalledWith(true);
      expect(encrypted).toEqual(["0xboolhandle", "0xproof"]);
    });

    it("should encrypt all supported types", async () => {
      const mockEncrypt = vi.fn().mockResolvedValue({
        handles: ["0xh1", "0xh2", "0xh3", "0xh4", "0xh5", "0xh6", "0xh7", "0xh8"],
        inputProof: "0xproof",
      });

      const mockBuilder = {
        addBool: vi.fn().mockReturnThis(),
        add8: vi.fn().mockReturnThis(),
        add16: vi.fn().mockReturnThis(),
        add32: vi.fn().mockReturnThis(),
        add64: vi.fn().mockReturnThis(),
        add128: vi.fn().mockReturnThis(),
        add256: vi.fn().mockReturnThis(),
        addAddress: vi.fn().mockReturnThis(),
        encrypt: mockEncrypt,
      };

      const mockInstance = createMockFhevmInstance({
        createEncryptedInput: vi.fn().mockReturnValue(mockBuilder),
      });

      const { result } = renderHook(() => useEncrypt(), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          instance: mockInstance,
        }),
      });

      await result.current.encrypt(
        [
          { type: "bool", value: true },
          { type: "uint8", value: 255n },
          { type: "uint16", value: 1000n },
          { type: "uint32", value: 100000n },
          { type: "uint64", value: 100n },
          { type: "uint128", value: 1000000n },
          { type: "uint256", value: 10000000n },
          { type: "address", value: contractAddress },
        ],
        contractAddress
      );

      expect(mockBuilder.addBool).toHaveBeenCalledWith(true);
      expect(mockBuilder.add8).toHaveBeenCalledWith(255n);
      expect(mockBuilder.add16).toHaveBeenCalledWith(1000n);
      expect(mockBuilder.add32).toHaveBeenCalledWith(100000n);
      expect(mockBuilder.add64).toHaveBeenCalledWith(100n);
      expect(mockBuilder.add128).toHaveBeenCalledWith(1000000n);
      expect(mockBuilder.add256).toHaveBeenCalledWith(10000000n);
      expect(mockBuilder.addAddress).toHaveBeenCalledWith(contractAddress);
    });
  });

  describe("error handling", () => {
    it("should propagate encryption errors", async () => {
      const encryptionError = new Error("Encryption failed");
      const mockBuilder = {
        add64: vi.fn().mockReturnThis(),
        encrypt: vi.fn().mockRejectedValue(encryptionError),
      };

      const mockInstance = createMockFhevmInstance({
        createEncryptedInput: vi.fn().mockReturnValue(mockBuilder),
      });

      const { result } = renderHook(() => useEncrypt(), {
        wrapper: createTestWrapper({
          status: "ready",
          isConnected: true,
          instance: mockInstance,
        }),
      });

      await expect(
        result.current.encrypt([{ type: "uint64", value: 100n }], contractAddress)
      ).rejects.toThrow("Encryption failed");
    });
  });

  describe("memoization", () => {
    it("should maintain stable encrypt function reference", () => {
      const { result, rerender } = renderHook(() => useEncrypt(), {
        wrapper: ConnectedWrapper,
      });

      const firstEncrypt = result.current.encrypt;
      rerender();
      const secondEncrypt = result.current.encrypt;

      expect(firstEncrypt).toBe(secondEncrypt);
    });
  });
});
