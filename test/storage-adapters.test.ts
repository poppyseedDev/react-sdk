import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  memoryStorage,
  localStorageAdapter,
  sessionStorageAdapter,
  noOpStorage,
  createLocalStorageAdapter,
  createSessionStorageAdapter,
} from "../src/storage/adapters";
import { GenericStringInMemoryStorage } from "../src/storage/GenericStringStorage";

describe("Storage Adapters", () => {
  describe("GenericStringInMemoryStorage", () => {
    it("should set and get items", () => {
      const storage = new GenericStringInMemoryStorage();
      storage.setItem("key1", "value1");
      expect(storage.getItem("key1")).toBe("value1");
    });

    it("should return null for non-existent keys", () => {
      const storage = new GenericStringInMemoryStorage();
      expect(storage.getItem("nonexistent")).toBeNull();
    });

    it("should remove items", () => {
      const storage = new GenericStringInMemoryStorage();
      storage.setItem("key1", "value1");
      storage.removeItem("key1");
      expect(storage.getItem("key1")).toBeNull();
    });

    it("should overwrite existing values", () => {
      const storage = new GenericStringInMemoryStorage();
      storage.setItem("key1", "value1");
      storage.setItem("key1", "value2");
      expect(storage.getItem("key1")).toBe("value2");
    });

    it("should handle multiple keys independently", () => {
      const storage = new GenericStringInMemoryStorage();
      storage.setItem("key1", "value1");
      storage.setItem("key2", "value2");
      expect(storage.getItem("key1")).toBe("value1");
      expect(storage.getItem("key2")).toBe("value2");
    });
  });

  describe("memoryStorage", () => {
    beforeEach(() => {
      // Clear the storage before each test
      // We need to manually clear since it's a singleton
      memoryStorage.removeItem("testKey");
    });

    it("should set and get items", () => {
      memoryStorage.setItem("testKey", "testValue");
      expect(memoryStorage.getItem("testKey")).toBe("testValue");
    });

    it("should return null for non-existent keys", () => {
      expect(memoryStorage.getItem("nonexistent")).toBeNull();
    });

    it("should remove items", () => {
      memoryStorage.setItem("testKey", "testValue");
      memoryStorage.removeItem("testKey");
      expect(memoryStorage.getItem("testKey")).toBeNull();
    });

    it("should be a singleton instance", () => {
      // Set a value
      memoryStorage.setItem("singleton", "test");
      // Import should return the same instance
      expect(memoryStorage.getItem("singleton")).toBe("test");
      memoryStorage.removeItem("singleton");
    });
  });

  describe("localStorageAdapter", () => {
    let mockLocalStorage: Record<string, string>;

    beforeEach(() => {
      mockLocalStorage = {};
      vi.stubGlobal("localStorage", {
        getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {};
        }),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should prefix keys with 'fhevm:'", () => {
      localStorageAdapter.setItem("testKey", "testValue");
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "fhevm:testKey",
        "testValue"
      );
    });

    it("should get items with prefix", () => {
      mockLocalStorage["fhevm:testKey"] = "testValue";
      const value = localStorageAdapter.getItem("testKey");
      expect(localStorage.getItem).toHaveBeenCalledWith("fhevm:testKey");
      expect(value).toBe("testValue");
    });

    it("should remove items with prefix", () => {
      localStorageAdapter.removeItem("testKey");
      expect(localStorage.removeItem).toHaveBeenCalledWith("fhevm:testKey");
    });

    it("should return null for non-existent keys", () => {
      expect(localStorageAdapter.getItem("nonexistent")).toBeNull();
    });
  });

  describe("sessionStorageAdapter", () => {
    let mockSessionStorage: Record<string, string>;

    beforeEach(() => {
      mockSessionStorage = {};
      vi.stubGlobal("sessionStorage", {
        getItem: vi.fn((key: string) => mockSessionStorage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockSessionStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockSessionStorage[key];
        }),
        clear: vi.fn(() => {
          mockSessionStorage = {};
        }),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should prefix keys with 'fhevm:'", () => {
      sessionStorageAdapter.setItem("testKey", "testValue");
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        "fhevm:testKey",
        "testValue"
      );
    });

    it("should get items with prefix", () => {
      mockSessionStorage["fhevm:testKey"] = "testValue";
      const value = sessionStorageAdapter.getItem("testKey");
      expect(sessionStorage.getItem).toHaveBeenCalledWith("fhevm:testKey");
      expect(value).toBe("testValue");
    });

    it("should remove items with prefix", () => {
      sessionStorageAdapter.removeItem("testKey");
      expect(sessionStorage.removeItem).toHaveBeenCalledWith("fhevm:testKey");
    });

    it("should return null for non-existent keys", () => {
      expect(sessionStorageAdapter.getItem("nonexistent")).toBeNull();
    });
  });

  describe("noOpStorage", () => {
    it("should always return null for getItem", () => {
      noOpStorage.setItem("key", "value");
      expect(noOpStorage.getItem("key")).toBeNull();
    });

    it("should not throw on setItem", () => {
      expect(() => noOpStorage.setItem("key", "value")).not.toThrow();
    });

    it("should not throw on removeItem", () => {
      expect(() => noOpStorage.removeItem("key")).not.toThrow();
    });

    it("should never store anything", () => {
      noOpStorage.setItem("key1", "value1");
      noOpStorage.setItem("key2", "value2");
      expect(noOpStorage.getItem("key1")).toBeNull();
      expect(noOpStorage.getItem("key2")).toBeNull();
    });
  });

  describe("createLocalStorageAdapter", () => {
    let mockLocalStorage: Record<string, string>;

    beforeEach(() => {
      mockLocalStorage = {};
      vi.stubGlobal("localStorage", {
        getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should create adapter with custom prefix", () => {
      const customStorage = createLocalStorageAdapter("myapp:");
      customStorage.setItem("testKey", "testValue");
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "myapp:testKey",
        "testValue"
      );
    });

    it("should allow different prefixes for isolation", () => {
      const storage1 = createLocalStorageAdapter("app1:");
      const storage2 = createLocalStorageAdapter("app2:");

      storage1.setItem("key", "value1");
      storage2.setItem("key", "value2");

      expect(localStorage.setItem).toHaveBeenCalledWith("app1:key", "value1");
      expect(localStorage.setItem).toHaveBeenCalledWith("app2:key", "value2");
    });
  });

  describe("createSessionStorageAdapter", () => {
    let mockSessionStorage: Record<string, string>;

    beforeEach(() => {
      mockSessionStorage = {};
      vi.stubGlobal("sessionStorage", {
        getItem: vi.fn((key: string) => mockSessionStorage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockSessionStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockSessionStorage[key];
        }),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should create adapter with custom prefix", () => {
      const customStorage = createSessionStorageAdapter("myapp:");
      customStorage.setItem("testKey", "testValue");
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        "myapp:testKey",
        "testValue"
      );
    });
  });

  describe("SSR safety", () => {
    // Note: These tests verify the SSR safety code paths exist.
    // In actual SSR environment, window would be undefined.

    it("localStorageAdapter should handle operations", () => {
      // In jsdom environment, localStorage exists, so these should work
      expect(() => localStorageAdapter.getItem("test")).not.toThrow();
      expect(() => localStorageAdapter.setItem("test", "value")).not.toThrow();
      expect(() => localStorageAdapter.removeItem("test")).not.toThrow();
    });

    it("sessionStorageAdapter should handle operations", () => {
      expect(() => sessionStorageAdapter.getItem("test")).not.toThrow();
      expect(() => sessionStorageAdapter.setItem("test", "value")).not.toThrow();
      expect(() => sessionStorageAdapter.removeItem("test")).not.toThrow();
    });
  });
});
