import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useConfidentialBalances } from "../src/react/useConfidentialBalances";
import {
  createTestWrapper,
  createMockFhevmInstance,
  createMockEip1193Provider,
  ConnectedWrapper,
  DisconnectedWrapper,
  InitializingWrapper,
  TEST_ADDRESS,
  MOCK_HANDLE,
} from "./utils";

describe("useConfidentialBalances", () => {
  const contractAddress1 = "0x1234567890123456789012345678901234567890" as const;
  const contractAddress2 = "0xabcdef1234567890abcdef1234567890abcdef12" as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should start with idle status", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.status).toBe("idle");
    });

    it("should start with isLoading=false", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isLoading).toBe(false);
    });

    it("should start with no error", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.error).toBeNull();
    });

    it("should start with pending data array", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].status).toBe("pending");
    });

    it("should have data array matching contracts length", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [
              { contractAddress: contractAddress1 },
              { contractAddress: contractAddress2 },
            ],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.data).toHaveLength(2);
    });

    it("should start with isRefetching=false", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isRefetching).toBe(false);
    });

    it("should start with isFetching=false", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe("enabled option", () => {
    it("should not fetch when enabled=false", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.status).toBe("idle");
      expect(result.current.isLoading).toBe(false);
    });

    it("should default to enabled=true", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
          }),
        { wrapper: DisconnectedWrapper }
      );

      // Even though disconnected, enabled defaults to true
      expect(result.current.status).not.toBe("disabled");
    });
  });

  describe("refetch function", () => {
    it("should provide refetch function", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(typeof result.current.refetch).toBe("function");
    });

    it("should not refetch when enabled=false", async () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      await result.current.refetch();

      // Should remain idle
      expect(result.current.status).toBe("idle");
    });
  });

  describe("status flags", () => {
    it("should have isError=false initially", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isError).toBe(false);
    });

    it("should have isSuccess=false initially", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isSuccess).toBe(false);
    });
  });

  describe("account handling", () => {
    it("should accept shared account option", () => {
      const customAccount = "0x9876543210987654321098765432109876543210" as const;

      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            account: customAccount,
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.status).toBe("idle");
    });

    it("should accept per-contract account", () => {
      const customAccount = "0x9876543210987654321098765432109876543210" as const;

      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1, account: customAccount }],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.status).toBe("idle");
    });
  });

  describe("decrypt option", () => {
    it("should have decryptAll as no-op when decrypt=false", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            decrypt: false,
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(typeof result.current.decryptAll).toBe("function");
      // Should be a no-op
      expect(() => result.current.decryptAll()).not.toThrow();
    });

    it("should have canDecrypt=false when decrypt=false", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            decrypt: false,
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.canDecrypt).toBe(false);
    });

    it("should have isDecrypting=false when decrypt=false", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            decrypt: false,
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isDecrypting).toBe(false);
    });

    it("should have isAllDecrypted=false when decrypt=false", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            decrypt: false,
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isAllDecrypted).toBe(false);
    });

    it("should have decryptedCount=0 when decrypt=false", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            decrypt: false,
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.decryptedCount).toBe(0);
    });

    it("should have decryptError=null when decrypt=false", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            decrypt: false,
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.decryptError).toBeNull();
    });
  });

  describe("multiple contracts", () => {
    it("should handle multiple contracts", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [
              { contractAddress: contractAddress1 },
              { contractAddress: contractAddress2 },
            ],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data[0].status).toBe("pending");
      expect(result.current.data[1].status).toBe("pending");
    });

    it("should handle empty contracts array", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.data).toHaveLength(0);
    });
  });

  describe("custom ABI", () => {
    it("should accept per-contract ABI", () => {
      const customAbi = [
        {
          name: "confidentialBalanceOf",
          type: "function",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "", type: "bytes32" }],
        },
      ];

      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1, abi: customAbi }],
            enabled: false,
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.status).toBe("idle");
    });
  });

  describe("connection states", () => {
    it("should handle disconnected state", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
          }),
        { wrapper: DisconnectedWrapper }
      );

      // Should not throw
      expect(result.current.data).toBeDefined();
    });

    it("should handle initializing state", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
          }),
        { wrapper: InitializingWrapper }
      );

      expect(result.current.data).toBeDefined();
    });
  });

  describe("decrypt=true options", () => {
    it("should provide decryptAll function when decrypt=true", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            decrypt: true,
            enabled: false,
          }),
        {
          wrapper: createTestWrapper({
            status: "ready",
            isConnected: true,
            provider: createMockEip1193Provider(),
          }),
        }
      );

      expect(typeof result.current.decryptAll).toBe("function");
    });

    it("should have canDecrypt based on connection when decrypt=true", () => {
      const { result } = renderHook(
        () =>
          useConfidentialBalances({
            contracts: [{ contractAddress: contractAddress1 }],
            decrypt: true,
            enabled: false,
          }),
        { wrapper: DisconnectedWrapper }
      );

      // Should be false because no valid handles to decrypt yet
      expect(result.current.canDecrypt).toBe(false);
    });
  });
});
