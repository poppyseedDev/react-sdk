import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUnshield } from "../src/react/useUnshield";
import {
  createTestWrapper,
  createMockFhevmInstance,
  createMockEip1193Provider,
  ConnectedWrapper,
  DisconnectedWrapper,
  InitializingWrapper,
  TEST_ADDRESS,
} from "./utils";

describe("useUnshield", () => {
  const wrapperAddress = "0xabcdef1234567890abcdef1234567890abcdef12" as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should start with idle status", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.status).toBe("idle");
    });

    it("should start with isPending=false", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isPending).toBe(false);
    });

    it("should start with no error", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.error).toBeNull();
    });

    it("should start with no txHash", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.txHash).toBeUndefined();
    });

    it("should start with no finalizeTxHash", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.finalizeTxHash).toBeUndefined();
    });

    it("should start with isEncrypting=false", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isEncrypting).toBe(false);
    });

    it("should start with isSigning=false", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isSigning).toBe(false);
    });

    it("should start with isDecrypting=false", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isDecrypting).toBe(false);
    });

    it("should start with isFinalizing=false", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isFinalizing).toBe(false);
    });

    it("should start with isSuccess=false", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isSuccess).toBe(false);
    });

    it("should start with isError=false", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isError).toBe(false);
    });
  });

  describe("unshield function", () => {
    it("should provide unshield function", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(typeof result.current.unshield).toBe("function");
    });

    it("should set error when FHEVM not ready (disconnected)", async () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: DisconnectedWrapper }
      );

      await act(async () => {
        await result.current.unshield(100n);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain("not ready");
    });

    it("should set error when FHEVM is initializing", async () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: InitializingWrapper }
      );

      await act(async () => {
        await result.current.unshield(100n);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
    });
  });

  describe("reset function", () => {
    it("should provide reset function", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(typeof result.current.reset).toBe("function");
    });

    it("should reset all state when called", async () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: DisconnectedWrapper }
      );

      // Trigger an error state
      await act(async () => {
        await result.current.unshield(100n);
      });

      expect(result.current.isError).toBe(true);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.error).toBeNull();
      expect(result.current.txHash).toBeUndefined();
      expect(result.current.finalizeTxHash).toBeUndefined();
      expect(result.current.isError).toBe(false);
    });
  });

  describe("callbacks", () => {
    it("should call onError when unshield fails", async () => {
      const onError = vi.fn();

      const { result } = renderHook(
        () => useUnshield({ wrapperAddress, onError }),
        { wrapper: DisconnectedWrapper }
      );

      await act(async () => {
        await result.current.unshield(100n);
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("status flags consistency", () => {
    it("should have mutually exclusive status states initially", () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      expect(result.current.isPending).toBe(false);
      expect(result.current.isEncrypting).toBe(false);
      expect(result.current.isSigning).toBe(false);
      expect(result.current.isDecrypting).toBe(false);
      expect(result.current.isFinalizing).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it("should correctly set isError when error occurs", async () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: DisconnectedWrapper }
      );

      await act(async () => {
        await result.current.unshield(100n);
      });

      expect(result.current.status).toBe("error");
      expect(result.current.isError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isPending).toBe(false);
    });
  });

  describe("memoization", () => {
    it("should maintain stable unshield function reference", () => {
      const { result, rerender } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      const firstUnshield = result.current.unshield;
      rerender();
      const secondUnshield = result.current.unshield;

      expect(firstUnshield).toBe(secondUnshield);
    });

    it("should maintain stable reset function reference", () => {
      const { result, rerender } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: ConnectedWrapper }
      );

      const firstReset = result.current.reset;
      rerender();
      const secondReset = result.current.reset;

      expect(firstReset).toBe(secondReset);
    });
  });

  describe("recipient handling", () => {
    it("should accept optional recipient address", async () => {
      const { result } = renderHook(
        () => useUnshield({ wrapperAddress }),
        { wrapper: DisconnectedWrapper }
      );

      const recipientAddress = "0x9876543210987654321098765432109876543210" as const;

      // Even though this will fail (disconnected), it should accept the parameter
      await act(async () => {
        await result.current.unshield(100n, recipientAddress);
      });

      // Should still error due to disconnected state, but function accepts the param
      expect(result.current.isError).toBe(true);
    });
  });
});
