# React SDK Testing Plan

This document outlines a comprehensive testing strategy for `@zama-fhe/sdk`, including unit tests, integration tests, and end-to-end tests for FHE encryption and decryption flows.

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Phase 1: Strengthen Foundation](#phase-1-strengthen-foundation)
3. [Phase 2: Unit Test Coverage](#phase-2-unit-test-coverage)
4. [Phase 3: Integration Tests](#phase-3-integration-tests)
5. [Phase 4: E2E Tests with Playwright](#phase-4-e2e-tests-with-playwright)
6. [Phase 5: CI/CD Enhancements](#phase-5-cicd-enhancements)
7. [Phase 6: Documentation Pipeline](#phase-6-documentation-pipeline)
8. [Implementation Timeline](#implementation-timeline)

---

## Current State Assessment

### What We Have
- **Test Framework**: Vitest with jsdom environment
- **Test Files**: 9 test files, 79 tests passing
- **Coverage**: ~41% overall (some areas like hooks have low coverage)
- **CI**: GitHub Actions with Node 18/20/22 matrix, lint, format, build checks
- **TypeScript**: Strict mode enabled, but missing some strict options

### Gaps to Address
- [ ] Missing strict TypeScript compiler options
- [ ] No E2E tests for real encryption/decryption flows
- [ ] Low test coverage on core hooks (~7% on react folder)
- [ ] No Playwright setup for browser testing
- [ ] No mock relayer for integration testing
- [ ] Missing documentation generation pipeline
- [ ] No CJS/ESM dual-build validation

---

## Phase 1: Strengthen Foundation

### 1.1 TypeScript Strict Configuration

Update `tsconfig.json` with stricter options:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "types": ["node"],

    // Strict options (add these)
    "skipLibCheck": false,
    "strict": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": false,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false
  },
  "include": ["src/**/*"]
}
```

### 1.2 ESLint Strict Configuration

Enhance `eslint.config.js`:

```javascript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "import": importPlugin,
    },
    rules: {
      // React hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // TypeScript
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",

      // Import ordering
      "import/order": ["error", {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "never",
        "alphabetize": { "order": "asc" }
      }],
    },
  },
  { ignores: ["dist/**", "coverage/**", "node_modules/**", "*.config.js", "*.config.ts"] }
);
```

### 1.3 Platform Support (CJS/ESM)

Add dual-build support in `package.json`:

```json
{
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/types/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/types/index.d.ts",
        "default": "./dist/cjs/index.js"
      }
    }
  },
  "scripts": {
    "build": "pnpm run build:esm && pnpm run build:cjs && pnpm run build:types",
    "build:esm": "tsc -p tsconfig.esm.json",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:types": "tsc -p tsconfig.types.json --declaration --emitDeclarationOnly"
  }
}
```

### 1.4 Version Support Matrix

Add `.nvmrc` and engines in `package.json`:

```json
{
  "engines": {
    "node": ">=18.0.0"
  },
  "peerDependencies": {
    "@tanstack/react-query": ">=5.0.0 <6.0.0",
    "react": ">=18.0.0 <20.0.0"
  }
}
```

---

## Phase 2: Unit Test Coverage

### 2.1 Coverage Targets

| Module | Current | Target | Priority |
|--------|---------|--------|----------|
| `src/config.ts` | 97% | 100% | Low |
| `src/chains/` | 100% | 100% | Done |
| `src/storage/` | 49% | 90% | High |
| `src/react/` | 7% | 80% | Critical |
| `src/internal/` | 5% | 60% | High |
| `src/FhevmDecryptionSignature.ts` | 14% | 80% | High |
| **Overall** | **41%** | **80%** | - |

### 2.2 Priority Unit Tests to Add

#### 2.2.1 React Hooks Tests (`test/hooks/`)

```
test/hooks/
├── useFhevmContext.test.tsx      # Context consumption
├── useFhevmStatus.test.tsx       # Status states
├── useFhevmClient.test.tsx       # Client creation
├── useEncrypt.test.tsx           # Encryption flow
├── useUserDecrypt.test.tsx       # User decryption flow
├── usePublicDecrypt.test.tsx     # Public decryption flow
├── useConfidentialBalances.test.tsx  # Balance queries
├── useConfidentialTransfer.test.tsx  # Transfer mutations
├── useShield.test.tsx            # ERC20 -> ERC7984
├── useUnshield.test.tsx          # ERC7984 -> ERC20
└── useFHEEncryption.test.tsx     # Encryption utilities
```

#### 2.2.2 FhevmProvider Tests

```typescript
// test/react/FhevmProvider.test.tsx
import { render, waitFor, act } from "@testing-library/react";
import { FhevmProvider, useFhevmContext } from "../src/react";
import { createFhevmConfig, sepolia } from "../src";

describe("FhevmProvider", () => {
  const config = createFhevmConfig({ chains: [sepolia] });

  describe("initialization", () => {
    it("should start with idle status when not connected", () => {});
    it("should initialize when wallet connects", () => {});
    it("should handle chain switching", () => {});
    it("should cleanup on disconnect", () => {});
    it("should pass apiKey to createFhevmInstance", () => {});
  });

  describe("context values", () => {
    it("should provide config", () => {});
    it("should provide instance when ready", () => {});
    it("should provide status", () => {});
    it("should provide error on failure", () => {});
    it("should provide refresh function", () => {});
  });

  describe("autoInit behavior", () => {
    it("should auto-initialize when autoInit=true (default)", () => {});
    it("should not auto-initialize when autoInit=false", () => {});
  });

  describe("storage", () => {
    it("should use provided storage", () => {});
    it("should work without storage (no caching)", () => {});
  });
});
```

#### 2.2.3 Storage Tests

```typescript
// test/storage/adapters.test.ts
describe("Storage Adapters", () => {
  describe("localStorageAdapter", () => {
    it("should read and write to localStorage", () => {});
    it("should handle missing localStorage gracefully", () => {});
  });

  describe("sessionStorageAdapter", () => {
    it("should read and write to sessionStorage", () => {});
    it("should clear on tab close", () => {});
  });

  describe("indexedDBStorage", () => {
    it("should create database on first access", () => {});
    it("should persist across sessions", () => {});
    it("should handle quota errors", () => {});
  });

  describe("noOpStorage", () => {
    it("should return null for all reads", () => {});
    it("should not persist writes", () => {});
  });
});
```

#### 2.2.4 Internal Module Tests

```typescript
// test/internal/fhevm.test.ts
describe("createFhevmInstance", () => {
  describe("mock mode", () => {
    it("should detect hardhat local chain", () => {});
    it("should load mock FHEVM for mock chains", () => {});
    it("should use provided mockChains config", () => {});
  });

  describe("production mode", () => {
    it("should load relayer SDK script", () => {});
    it("should initialize SDK", () => {});
    it("should fetch public key", () => {});
    it("should pass apiKey to config", () => {});
  });

  describe("abort handling", () => {
    it("should abort on signal", () => {});
    it("should throw FhevmAbortError", () => {});
  });

  describe("status callbacks", () => {
    it("should notify sdk-loading", () => {});
    it("should notify sdk-initialized", () => {});
    it("should notify creating", () => {});
  });
});
```

### 2.3 Test Utilities

Create shared test utilities:

```typescript
// test/utils/mockProvider.ts
export function createMockEip1193Provider(): Eip1193Provider {
  return {
    request: vi.fn().mockImplementation(async ({ method }) => {
      switch (method) {
        case "eth_chainId":
          return "0x7a69"; // 31337
        case "eth_accounts":
          return ["0x1234..."];
        case "personal_sign":
          return "0xsignature...";
        default:
          throw new Error(`Unhandled method: ${method}`);
      }
    }),
  };
}

// test/utils/mockFhevmInstance.ts
export function createMockFhevmInstance(): FhevmInstance {
  return {
    createEIP712: vi.fn(),
    generateKeypair: vi.fn(),
    createEncryptedInput: vi.fn(),
    userDecrypt: vi.fn(),
    publicDecrypt: vi.fn(),
    getPublicKey: vi.fn(),
    getPublicParams: vi.fn(),
  };
}

// test/utils/testWrapper.tsx
export function createTestWrapper(overrides?: Partial<FhevmContextValue>) {
  const defaultContext: FhevmContextValue = {
    config: createFhevmConfig({ chains: [hardhatLocal] }),
    instance: undefined,
    status: "idle",
    error: undefined,
    chainId: 31337,
    address: "0x1234...",
    isConnected: false,
    provider: undefined,
    storage: undefined,
    refresh: vi.fn(),
  };

  return ({ children }) => (
    <FhevmContext.Provider value={{ ...defaultContext, ...overrides }}>
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    </FhevmContext.Provider>
  );
}
```

---

## Phase 3: Integration Tests

### 3.1 Mock Relayer Server

Create a mock relayer for integration testing:

```typescript
// test/integration/mockRelayer.ts
import { createServer, Server } from "http";

interface MockRelayerOptions {
  port?: number;
  latency?: number;
  errorRate?: number;
}

export class MockRelayer {
  private server: Server;
  private jobs: Map<string, any> = new Map();

  constructor(private options: MockRelayerOptions = {}) {
    this.server = createServer(this.handleRequest.bind(this));
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.options.port ?? 8546, resolve);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }

  private handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${this.options.port}`);

    // Simulate latency
    setTimeout(() => {
      if (url.pathname.startsWith("/v2/user-decrypt")) {
        this.handleUserDecrypt(req, res, url);
      } else if (url.pathname.startsWith("/v2/input-proof")) {
        this.handleInputProof(req, res, url);
      } else if (url.pathname.startsWith("/v2/public-decrypt")) {
        this.handlePublicDecrypt(req, res, url);
      } else if (url.pathname === "/keyurl") {
        this.handleKeyUrl(req, res);
      } else {
        res.writeHead(404);
        res.end();
      }
    }, this.options.latency ?? 0);
  }

  private handleUserDecrypt(req, res, url) {
    if (req.method === "POST") {
      // Create job
      const jobId = crypto.randomUUID();
      this.jobs.set(jobId, { status: "pending", result: null });

      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result: { jobId } }));

      // Simulate async processing
      setTimeout(() => {
        this.jobs.set(jobId, {
          status: "completed",
          result: { /* decrypted values */ },
        });
      }, 500);
    } else if (req.method === "GET") {
      // Poll job
      const jobId = url.pathname.split("/").pop();
      const job = this.jobs.get(jobId);

      if (!job) {
        res.writeHead(404);
        res.end();
        return;
      }

      if (job.status === "completed") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ result: job.result }));
      } else {
        res.writeHead(202, {
          "Content-Type": "application/json",
          "Retry-After": "1"
        });
        res.end(JSON.stringify({ status: "pending" }));
      }
    }
  }
}
```

### 3.2 Integration Test Suites

```typescript
// test/integration/encryption.test.ts
import { MockRelayer } from "./mockRelayer";
import { renderHook, waitFor, act } from "@testing-library/react";

describe("Encryption Integration", () => {
  let relayer: MockRelayer;

  beforeAll(async () => {
    relayer = new MockRelayer({ port: 8546 });
    await relayer.start();
  });

  afterAll(async () => {
    await relayer.stop();
  });

  describe("useEncrypt", () => {
    it("should encrypt euint8 value", async () => {
      const { result } = renderHook(() => useEncrypt(), { wrapper });

      await act(async () => {
        const encrypted = await result.current.encrypt({
          value: 42n,
          type: "euint8",
          contractAddress: "0x...",
        });

        expect(encrypted.handles).toHaveLength(1);
        expect(encrypted.inputProof).toBeDefined();
      });
    });

    it("should encrypt multiple values in batch", async () => {
      const { result } = renderHook(() => useEncrypt(), { wrapper });

      await act(async () => {
        const encrypted = await result.current.encryptBatch([
          { value: 100n, type: "euint64" },
          { value: 200n, type: "euint64" },
        ], "0x...");

        expect(encrypted.handles).toHaveLength(2);
      });
    });

    it("should validate input ranges", async () => {
      const { result } = renderHook(() => useEncrypt(), { wrapper });

      await expect(
        result.current.encrypt({
          value: 256n, // Too large for euint8
          type: "euint8",
          contractAddress: "0x...",
        })
      ).rejects.toThrow("Value out of range");
    });
  });
});

// test/integration/decryption.test.ts
describe("Decryption Integration", () => {
  describe("useUserDecrypt", () => {
    it("should decrypt single handle", async () => {
      const { result } = renderHook(
        () => useUserDecrypt({
          handle: "0xabc...",
          contractAddress: "0x...",
        }),
        { wrapper }
      );

      await act(async () => {
        result.current.decrypt();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.results["0xabc..."]).toBeDefined();
      });
    });

    it("should cache signature for same contract", async () => {});
    it("should handle signature expiry", async () => {});
    it("should retry on transient failures", async () => {});
  });

  describe("usePublicDecrypt", () => {
    it("should decrypt without signature", async () => {});
    it("should work with any user", async () => {});
  });
});

// test/integration/erc7984.test.ts
describe("ERC7984 Integration", () => {
  describe("useConfidentialBalances", () => {
    it("should fetch encrypted balance", async () => {});
    it("should decrypt balance on demand", async () => {});
    it("should cache decrypted values", async () => {});
  });

  describe("useShield", () => {
    it("should approve and deposit ERC20", async () => {});
    it("should handle approval failure", async () => {});
  });

  describe("useUnshield", () => {
    it("should burn and withdraw ERC20", async () => {});
    it("should validate amount against balance", async () => {});
  });

  describe("useConfidentialTransfer", () => {
    it("should transfer encrypted amount", async () => {});
    it("should validate recipient address", async () => {});
  });
});
```

---

## Phase 4: E2E Tests with Playwright

### 4.1 Playwright Setup

Install and configure Playwright:

```bash
pnpm add -D @playwright/test
npx playwright install
```

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { open: "never" }],
    ["json", { outputFile: "e2e-results.json" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: "pnpm run dev:test-app",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### 4.2 E2E Test App

Create a minimal test application:

```
e2e/
├── test-app/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── EncryptTest.tsx
│   │   ├── DecryptTest.tsx
│   │   ├── TransferTest.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── vite.config.ts
├── fixtures/
│   ├── wallet.ts         # Wallet fixture with test accounts
│   ├── contracts.ts      # Contract addresses
│   └── hardhat.ts        # Hardhat node management
└── tests/
    ├── encrypt.spec.ts
    ├── decrypt.spec.ts
    ├── transfer.spec.ts
    └── full-flow.spec.ts
```

### 4.3 E2E Test Fixtures

```typescript
// e2e/fixtures/wallet.ts
import { test as base, expect } from "@playwright/test";
import { Wallet } from "ethers";

export const test = base.extend<{
  wallet: Wallet;
  connectedPage: Page;
}>({
  wallet: async ({}, use) => {
    // Test account with known private key
    const wallet = new Wallet("0xac0974bec...");
    await use(wallet);
  },

  connectedPage: async ({ page, wallet }, use) => {
    // Inject wallet into page
    await page.addInitScript((privateKey) => {
      // Mock MetaMask
      window.ethereum = {
        isMetaMask: true,
        selectedAddress: null,
        request: async ({ method, params }) => {
          // Handle wallet methods
        },
      };
    }, wallet.privateKey);

    await page.goto("/");
    await page.click("[data-testid='connect-wallet']");

    await use(page);
  },
});

// e2e/fixtures/hardhat.ts
import { spawn, ChildProcess } from "child_process";

export class HardhatNode {
  private process: ChildProcess | null = null;

  async start(): Promise<void> {
    this.process = spawn("npx", ["hardhat", "node"], {
      cwd: "path/to/contracts",
    });

    // Wait for node to be ready
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  async deployContracts(): Promise<Record<string, string>> {
    // Deploy test contracts and return addresses
  }
}
```

### 4.4 E2E Test Suites

```typescript
// e2e/tests/encrypt.spec.ts
import { test, expect } from "../fixtures/wallet";

test.describe("Encryption E2E", () => {
  test("should encrypt value and submit to contract", async ({ connectedPage }) => {
    await connectedPage.goto("/encrypt");

    // Enter value to encrypt
    await connectedPage.fill("[data-testid='encrypt-input']", "100");
    await connectedPage.selectOption("[data-testid='encrypt-type']", "euint64");

    // Click encrypt
    await connectedPage.click("[data-testid='encrypt-button']");

    // Wait for encryption to complete
    await expect(connectedPage.locator("[data-testid='encrypt-status']"))
      .toHaveText("Encrypted", { timeout: 30000 });

    // Verify handle is displayed
    await expect(connectedPage.locator("[data-testid='encrypted-handle']"))
      .toBeVisible();
  });

  test("should show error for invalid input", async ({ connectedPage }) => {
    await connectedPage.goto("/encrypt");
    await connectedPage.fill("[data-testid='encrypt-input']", "-1");
    await connectedPage.click("[data-testid='encrypt-button']");

    await expect(connectedPage.locator("[data-testid='error-message']"))
      .toContainText("Invalid value");
  });
});

// e2e/tests/decrypt.spec.ts
test.describe("Decryption E2E", () => {
  test("should request signature and decrypt value", async ({ connectedPage }) => {
    // Navigate to decrypt page with a known handle
    await connectedPage.goto("/decrypt?handle=0xabc...");

    // Click decrypt
    await connectedPage.click("[data-testid='decrypt-button']");

    // Handle signature request
    await expect(connectedPage.locator("[data-testid='signature-request']"))
      .toBeVisible();

    // Approve signature (mocked)
    await connectedPage.click("[data-testid='approve-signature']");

    // Wait for decryption
    await expect(connectedPage.locator("[data-testid='decrypt-status']"))
      .toHaveText("Decrypted", { timeout: 60000 });

    // Verify decrypted value
    await expect(connectedPage.locator("[data-testid='decrypted-value']"))
      .toBeVisible();
  });

  test("should cache signature for subsequent decryptions", async ({ connectedPage }) => {
    // First decryption - should require signature
    // Second decryption - should use cached signature
  });
});

// e2e/tests/full-flow.spec.ts
test.describe("Full FHE Flow E2E", () => {
  test("complete shield -> transfer -> unshield flow", async ({ connectedPage }) => {
    // 1. Shield ERC20 tokens
    await connectedPage.goto("/shield");
    await connectedPage.fill("[data-testid='amount']", "1000");
    await connectedPage.click("[data-testid='shield-button']");
    await expect(connectedPage.locator("[data-testid='shield-status']"))
      .toHaveText("Complete", { timeout: 60000 });

    // 2. Transfer confidential tokens
    await connectedPage.goto("/transfer");
    await connectedPage.fill("[data-testid='recipient']", "0x...");
    await connectedPage.fill("[data-testid='amount']", "500");
    await connectedPage.click("[data-testid='transfer-button']");
    await expect(connectedPage.locator("[data-testid='transfer-status']"))
      .toHaveText("Complete", { timeout: 60000 });

    // 3. Unshield remaining tokens
    await connectedPage.goto("/unshield");
    await connectedPage.fill("[data-testid='amount']", "500");
    await connectedPage.click("[data-testid='unshield-button']");
    await expect(connectedPage.locator("[data-testid='unshield-status']"))
      .toHaveText("Complete", { timeout: 60000 });
  });
});
```

---

## Phase 5: CI/CD Enhancements

### 5.1 Enhanced CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ===========================================================================
  # Type Check & Lint
  # ===========================================================================
  typecheck:
    name: TypeScript
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run typecheck

  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run format:check

  # ===========================================================================
  # Unit Tests
  # ===========================================================================
  unit-tests:
    name: Unit Tests (Node ${{ matrix.node-version }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: ${{ matrix.node-version }}, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:coverage
      - name: Upload coverage
        if: matrix.node-version == '20.x'
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

  # ===========================================================================
  # Integration Tests
  # ===========================================================================
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:integration

  # ===========================================================================
  # E2E Tests
  # ===========================================================================
  e2e-tests:
    name: E2E Tests (${{ matrix.browser }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Start Hardhat node
        run: |
          cd e2e/contracts
          npx hardhat node &
          sleep 10
          npx hardhat run scripts/deploy.ts --network localhost

      - name: Run E2E tests
        run: pnpm run test:e2e -- --project=${{ matrix.browser }}

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/

  # ===========================================================================
  # Build Validation
  # ===========================================================================
  build:
    name: Build & Package
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm run build

      - name: Validate ESM import
        run: node -e "import('./dist/esm/index.js').then(m => console.log('ESM OK'))"

      - name: Validate CJS require
        run: node -e "require('./dist/cjs/index.js'); console.log('CJS OK')"

      - name: Pack dry run
        run: pnpm pack --dry-run

  # ===========================================================================
  # Coverage Gate
  # ===========================================================================
  coverage-gate:
    name: Coverage Gate
    runs-on: ubuntu-latest
    needs: [unit-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:coverage

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          echo "Coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage below 80% threshold!"
            exit 1
          fi
```

### 5.2 Package Scripts Update

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "pnpm run test && pnpm run test:integration && pnpm run test:e2e"
  }
}
```

---

## Phase 6: Documentation Pipeline

### 6.1 TypeDoc Setup

```bash
pnpm add -D typedoc typedoc-plugin-markdown
```

Create `typedoc.json`:

```json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "none",
  "githubPages": false,
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeInternal": true,
  "categorizeByGroup": true,
  "categoryOrder": [
    "Provider",
    "Hooks",
    "Config",
    "Chains",
    "Storage",
    "Types"
  ]
}
```

### 6.2 Documentation Scripts

```json
{
  "scripts": {
    "docs": "typedoc",
    "docs:watch": "typedoc --watch",
    "docs:serve": "pnpm run docs && npx serve docs/api"
  }
}
```

### 6.3 Documentation CI

```yaml
# .github/workflows/docs.yml
name: Documentation

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20.x, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run docs

      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs/api

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

---

## Implementation Timeline

### Week 1: Foundation
- [ ] Update tsconfig.json with strict options
- [ ] Enhance ESLint configuration
- [ ] Fix all TypeScript/lint errors
- [ ] Set up test utilities and mocks

### Week 2: Unit Tests
- [ ] Write FhevmProvider tests
- [ ] Write hook tests (useEncrypt, useUserDecrypt, etc.)
- [ ] Write storage adapter tests
- [ ] Achieve 60% coverage

### Week 3: Integration Tests
- [ ] Create mock relayer server
- [ ] Write encryption integration tests
- [ ] Write decryption integration tests
- [ ] Write ERC7984 integration tests

### Week 4: E2E Tests
- [ ] Set up Playwright
- [ ] Create E2E test app
- [ ] Write encryption E2E tests
- [ ] Write full-flow E2E tests

### Week 5: CI/CD & Docs
- [ ] Enhance CI workflow
- [ ] Set up coverage gates
- [ ] Configure TypeDoc
- [ ] Deploy documentation

### Week 6: Cleanup & Dual Build
- [ ] Set up CJS/ESM dual build
- [ ] Validate all platforms
- [ ] Update README
- [ ] Final review and fixes

---

## Success Criteria

1. **Coverage**: Minimum 80% line coverage
2. **Type Safety**: Zero TypeScript errors with strict mode
3. **Lint**: Zero ESLint errors/warnings
4. **E2E**: All critical flows passing in 3 browsers
5. **CI**: All jobs passing on PR
6. **Docs**: Auto-generated API documentation
7. **Platforms**: Verified CJS and ESM builds

---

## Appendix: Test Command Reference

```bash
# Run all unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run with coverage
pnpm run test:coverage

# Run specific test file
pnpm run test -- test/hooks/useEncrypt.test.tsx

# Run integration tests
pnpm run test:integration

# Run E2E tests
pnpm run test:e2e

# Run E2E in UI mode
pnpm run test:e2e:ui

# Run E2E for specific browser
pnpm run test:e2e -- --project=chromium

# Generate documentation
pnpm run docs
```
