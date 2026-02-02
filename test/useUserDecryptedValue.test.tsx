import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUserDecryptedValue, useUserDecryptedValues } from "../src/react/useUserDecryptedValue";
import { createTestWrapper, ConnectedWrapper, DisconnectedWrapper, MOCK_HANDLE } from "./utils";

describe("useUserDecryptedValue", () => {
  const contractAddress = "0x1234567890123456789012345678901234567890" as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with undefined params", () => {
    it("should return undefined data when handle is undefined", () => {
      const { result } = renderHook(() => useUserDecryptedValue(undefined, contractAddress), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.data).toBeUndefined();
    });

    it("should return undefined data when contractAddress is undefined", () => {
      const { result } = renderHook(() => useUserDecryptedValue(MOCK_HANDLE, undefined), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.data).toBeUndefined();
    });

    it("should return isCached=false when data is undefined", () => {
      const { result } = renderHook(() => useUserDecryptedValue(undefined, contractAddress), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.isCached).toBe(false);
    });
  });

  describe("return structure", () => {
    it("should return handle passed in", () => {
      const { result } = renderHook(() => useUserDecryptedValue(MOCK_HANDLE, contractAddress), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.handle).toBe(MOCK_HANDLE);
    });

    it("should return contractAddress passed in", () => {
      const { result } = renderHook(() => useUserDecryptedValue(MOCK_HANDLE, contractAddress), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.contractAddress).toBe(contractAddress);
    });

    it("should return all required properties", () => {
      const { result } = renderHook(() => useUserDecryptedValue(MOCK_HANDLE, contractAddress), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current).toHaveProperty("data");
      expect(result.current).toHaveProperty("isCached");
      expect(result.current).toHaveProperty("handle");
      expect(result.current).toHaveProperty("contractAddress");
    });
  });

  describe("with disconnected state", () => {
    it("should handle disconnected state gracefully", () => {
      const { result } = renderHook(() => useUserDecryptedValue(MOCK_HANDLE, contractAddress), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isCached).toBe(false);
    });
  });

  describe("cache miss", () => {
    it("should return undefined for uncached handle", () => {
      const { result } = renderHook(() => useUserDecryptedValue(MOCK_HANDLE, contractAddress), {
        wrapper: ConnectedWrapper,
      });

      // No data has been cached, so it should be undefined
      expect(result.current.data).toBeUndefined();
      expect(result.current.isCached).toBe(false);
    });
  });
});

describe("useUserDecryptedValues", () => {
  const contractAddress = "0x1234567890123456789012345678901234567890" as const;
  const handle1 = "0x" + "11".repeat(32);
  const handle2 = "0x" + "22".repeat(32);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with undefined/empty handles", () => {
    it("should return empty values array when handles is undefined", () => {
      const { result } = renderHook(() => useUserDecryptedValues(undefined), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.values).toEqual([]);
    });

    it("should return empty values array when handles is empty", () => {
      const { result } = renderHook(() => useUserDecryptedValues([]), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.values).toEqual([]);
    });

    it("should return allCached=false when handles is undefined", () => {
      const { result } = renderHook(() => useUserDecryptedValues(undefined), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.allCached).toBe(false);
    });

    it("should return cachedCount=0 when handles is undefined", () => {
      const { result } = renderHook(() => useUserDecryptedValues(undefined), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.cachedCount).toBe(0);
    });
  });

  describe("with valid handles", () => {
    it("should return values array with same length as handles", () => {
      const handles = [
        { handle: handle1, contractAddress },
        { handle: handle2, contractAddress },
      ];

      const { result } = renderHook(() => useUserDecryptedValues(handles), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.values).toHaveLength(2);
    });

    it("should return undefined for uncached values", () => {
      const handles = [{ handle: handle1, contractAddress }];

      const { result } = renderHook(() => useUserDecryptedValues(handles), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.values[0]).toBeUndefined();
    });

    it("should return allCached=false when values are not cached", () => {
      const handles = [{ handle: handle1, contractAddress }];

      const { result } = renderHook(() => useUserDecryptedValues(handles), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.allCached).toBe(false);
    });

    it("should return cachedCount=0 when no values are cached", () => {
      const handles = [
        { handle: handle1, contractAddress },
        { handle: handle2, contractAddress },
      ];

      const { result } = renderHook(() => useUserDecryptedValues(handles), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current.cachedCount).toBe(0);
    });
  });

  describe("return structure", () => {
    it("should return all required properties", () => {
      const handles = [{ handle: handle1, contractAddress }];

      const { result } = renderHook(() => useUserDecryptedValues(handles), {
        wrapper: ConnectedWrapper,
      });

      expect(result.current).toHaveProperty("values");
      expect(result.current).toHaveProperty("allCached");
      expect(result.current).toHaveProperty("cachedCount");
    });
  });

  describe("with disconnected state", () => {
    it("should handle disconnected state gracefully", () => {
      const handles = [{ handle: handle1, contractAddress }];

      const { result } = renderHook(() => useUserDecryptedValues(handles), {
        wrapper: DisconnectedWrapper,
      });

      expect(result.current.values).toEqual([]);
      expect(result.current.allCached).toBe(false);
      expect(result.current.cachedCount).toBe(0);
    });
  });
});
