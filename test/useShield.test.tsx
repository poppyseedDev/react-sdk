import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useShield } from "../src/react/useShield";
import {
  createTestWrapper,
  createMockFhevmInstance,
  createMockEip1193Provider,
  ConnectedWrapper,
  DisconnectedWrapper,
  InitializingWrapper,
  TEST_ADDRESS,
} from "./utils";

describe("useShield", () => {
  const wrapperAddress = "0xabcdef1234567890abcdef1234567890abcdef12" as const;
  const underlyingAddress = "0x9876543210987654321098765432109876543210" as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should start with idle status", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.status).toBe("idle");
    });

    it("should start with isPending=false", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isPending).toBe(false);
    });

    it("should start with no error", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.error).toBeNull();
    });

    it("should start with no txHash", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.txHash).toBeUndefined();
    });

    it("should start with isApproving=false", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isApproving).toBe(false);
    });

    it("should start with isWrapping=false", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isWrapping).toBe(false);
    });

    it("should start with isSuccess=false", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isSuccess).toBe(false);
    });

    it("should start with isError=false", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isError).toBe(false);
    });
  });

  describe("shield function", () => {
    it("should provide shield function", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(typeof result.current.shield).toBe("function");
    });

    it("should set error when not connected", async () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: DisconnectedWrapper,
      });

      await act(async () => {
        await result.current.shield(100n);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
    });
  });

  describe("reset function", () => {
    it("should provide reset function", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(typeof result.current.reset).toBe("function");
    });

    it("should reset state when called", async () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: DisconnectedWrapper,
      });

      // Trigger an error state
      await act(async () => {
        await result.current.shield(100n);
      });

      expect(result.current.isError).toBe(true);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.error).toBeNull();
      expect(result.current.isError).toBe(false);
    });
  });

  describe("refetchAllowance function", () => {
    it("should provide refetchAllowance function", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(typeof result.current.refetchAllowance).toBe("function");
    });
  });

  describe("callbacks", () => {
    it("should call onError when shield fails", async () => {
      const onError = vi.fn();

      const { result } = renderHook(
        () => useShield({ wrapperAddress, underlyingAddress, onError }),
        { wrapper: DisconnectedWrapper }
      );

      await act(async () => {
        await result.current.shield(100n);
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("status flags consistency", () => {
    it("should have mutually exclusive status states initially", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: ConnectedWrapper,
      });

      // All should be false except idle
      expect(result.current.isPending).toBe(false);
      expect(result.current.isApproving).toBe(false);
      expect(result.current.isWrapping).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it("should correctly set isError when error occurs", async () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: DisconnectedWrapper,
      });

      await act(async () => {
        await result.current.shield(100n);
      });

      expect(result.current.status).toBe("error");
      expect(result.current.isError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isPending).toBe(false);
    });
  });

  describe("props handling", () => {
    it("should accept wrapperAddress only (fetches underlying)", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.status).toBe("idle");
    });

    it("should accept both wrapperAddress and underlyingAddress", () => {
      const { result } = renderHook(() => useShield({ wrapperAddress, underlyingAddress }), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.status).toBe("idle");
    });
  });

  describe("memoization", () => {
    it("should maintain stable shield function reference", () => {
      const { result, rerender } = renderHook(
        () => useShield({ wrapperAddress, underlyingAddress }),
        { wrapper: ConnectedWrapper }
      );

      const firstShield = result.current.shield;
      rerender();
      const secondShield = result.current.shield;

      expect(firstShield).toBe(secondShield);
    });

    it("should maintain stable reset function reference", () => {
      const { result, rerender } = renderHook(
        () => useShield({ wrapperAddress, underlyingAddress }),
        { wrapper: ConnectedWrapper }
      );

      const firstReset = result.current.reset;
      rerender();
      const secondReset = result.current.reset;

      expect(firstReset).toBe(secondReset);
    });
  });
});
