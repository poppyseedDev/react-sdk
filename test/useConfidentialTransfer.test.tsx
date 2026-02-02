import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConfidentialTransfer } from "../src/react/useConfidentialTransfer";
import {
  createTestWrapper,
  createMockFhevmInstance,
  createMockEip1193Provider,
  ConnectedWrapper,
  DisconnectedWrapper,
  InitializingWrapper,
  TEST_ADDRESS,
} from "./utils";

describe("useConfidentialTransfer", () => {
  const contractAddress = "0x1234567890123456789012345678901234567890" as const;
  const recipientAddress = "0xabcdef1234567890abcdef1234567890abcdef12" as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should start with idle status", () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.status).toBe("idle");
    });

    it("should start with isPending=false", () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isPending).toBe(false);
    });

    it("should start with no error", () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.error).toBeNull();
    });

    it("should start with no txHash", () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.txHash).toBeUndefined();
    });

    it("should start with isEncrypting=false", () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isEncrypting).toBe(false);
    });

    it("should start with isSigning=false", () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isSigning).toBe(false);
    });

    it("should start with isConfirming=false", () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isConfirming).toBe(false);
    });

    it("should start with isSuccess=false", () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isSuccess).toBe(false);
    });

    it("should start with isError=false", () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isError).toBe(false);
    });
  });

  describe("transfer function", () => {
    it("should provide transfer function", () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(typeof result.current.transfer).toBe("function");
    });

    it("should set error when FHEVM not ready (disconnected)", async () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: DisconnectedWrapper }
      );

      await act(async () => {
        await result.current.transfer(recipientAddress, 100n);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain("not ready");
    });

    it("should set error when FHEVM is initializing", async () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: InitializingWrapper }
      );

      await act(async () => {
        await result.current.transfer(recipientAddress, 100n);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
    });
  });

  describe("reset function", () => {
    it("should provide reset function", () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(typeof result.current.reset).toBe("function");
    });

    it("should reset all state when called", async () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: DisconnectedWrapper }
      );

      // Trigger an error state
      await act(async () => {
        await result.current.transfer(recipientAddress, 100n);
      });

      expect(result.current.isError).toBe(true);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.error).toBeNull();
      expect(result.current.txHash).toBeUndefined();
      expect(result.current.isError).toBe(false);
    });
  });

  describe("callbacks", () => {
    it("should call onError when transfer fails", async () => {
      const onError = vi.fn();

      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress, onError }),
        { wrapper: DisconnectedWrapper }
      );

      await act(async () => {
        try {
          await result.current.transfer(recipientAddress, 100n);
        } catch {
          // Expected to throw
        }
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("status flags consistency", () => {
    it("should have mutually exclusive status states initially", () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isPending).toBe(false);
      expect(result.current.isEncrypting).toBe(false);
      expect(result.current.isSigning).toBe(false);
      expect(result.current.isConfirming).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it("should correctly set isError when error occurs", async () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: DisconnectedWrapper }
      );

      await act(async () => {
        await result.current.transfer(recipientAddress, 100n);
      });

      expect(result.current.status).toBe("error");
      expect(result.current.isError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isPending).toBe(false);
    });
  });

  describe("options handling", () => {
    it("should accept contractAddress only", () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.status).toBe("idle");
    });

    it("should accept custom ABI", () => {
      const customAbi = [
        {
          name: "confidentialTransfer",
          type: "function",
          inputs: [],
          outputs: [],
        },
      ];

      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress, abi: customAbi }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.status).toBe("idle");
    });

    it("should accept custom function name", () => {
      const { result } = renderHook(
        () =>
          useConfidentialTransfer({
            contractAddress,
            functionName: "customTransfer(address,bytes32,bytes)",
          }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.status).toBe("idle");
    });
  });

  describe("memoization", () => {
    it("should maintain stable transfer function reference", () => {
      const { result, rerender } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      const firstTransfer = result.current.transfer;
      rerender();
      const secondTransfer = result.current.transfer;

      expect(firstTransfer).toBe(secondTransfer);
    });

    it("should maintain stable reset function reference", () => {
      const { result, rerender } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: ConnectedWrapper }
      );

      const firstReset = result.current.reset;
      rerender();
      const secondReset = result.current.reset;

      expect(firstReset).toBe(secondReset);
    });
  });

  describe("amount types", () => {
    it("should accept bigint amount", async () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: DisconnectedWrapper }
      );

      // Even though this will fail (disconnected), it should accept bigint
      await act(async () => {
        await result.current.transfer(recipientAddress, 100n);
      });

      expect(result.current.isError).toBe(true);
    });

    it("should accept large bigint amounts", async () => {
      const { result } = renderHook(
        () => useConfidentialTransfer({ contractAddress }),
        { wrapper: DisconnectedWrapper }
      );

      const largeAmount = 10n ** 18n; // 1 with 18 zeros

      await act(async () => {
        await result.current.transfer(recipientAddress, largeAmount);
      });

      // Should error because of disconnected state, but accepts large amounts
      expect(result.current.isError).toBe(true);
    });
  });
});
