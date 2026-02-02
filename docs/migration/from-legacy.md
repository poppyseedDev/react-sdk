# Migration Guide: Legacy to New API

This guide helps you migrate from the legacy hooks (`useFhevm`, `useFHEEncryption`, `useFHEDecrypt`) to the new provider-based API.

## Why Migrate?

The legacy API has been deprecated because:

1. **Manual Instance Management**: Required passing `instance`, `provider`, `address` to every hook
2. **No Context Sharing**: Each hook managed its own state
3. **Complex Setup**: Required understanding internal SDK details
4. **Maintenance Burden**: Supporting two APIs increases complexity

The new API provides:

- Automatic wallet integration via `FhevmProvider`
- Shared context across all hooks
- Simpler, more intuitive usage
- Better TypeScript support
- Integrated error handling

## Deprecation Timeline

| Version | Status |
|---------|--------|
| v1.x | Legacy API fully supported |
| v2.0 | Legacy API deprecated (warnings in dev) |
| v3.0 | Legacy API removed |

## Quick Reference

| Legacy | New |
|--------|-----|
| `useFhevm()` | `FhevmProvider` + `useFhevmContext()` |
| `useFHEEncryption()` | `useEncrypt()` |
| `useFHEDecrypt()` | `useUserDecrypt()` |

## Migration Steps

### Step 1: Set Up FhevmProvider

**Before (Legacy):**

```tsx
// Each component manages its own instance
function App() {
  const { instance, status, error } = useFhevm({
    provider: window.ethereum,
    chainId: 11155111,
  });

  return <MyComponent instance={instance} />;
}
```

**After (New):**

```tsx
// config/fhevm.ts
import { createFhevmConfig, sepolia } from "fhevm-sdk";

export const fhevmConfig = createFhevmConfig({
  chains: [sepolia],
});

// providers.tsx
import { FhevmProvider, memoryStorage, type Eip1193Provider } from "fhevm-sdk";
import { useAccount, useConnectorClient } from "wagmi";

function FhevmWrapper({ children }) {
  const { address, chainId, isConnected } = useAccount();
  const { data: connectorClient } = useConnectorClient();
  const provider = connectorClient?.transport as Eip1193Provider | undefined;

  return (
    <FhevmProvider
      config={fhevmConfig}
      provider={provider}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      storage={memoryStorage}
    >
      {children}
    </FhevmProvider>
  );
}

// Wrap your app
<WagmiProvider>
  <FhevmWrapper>
    <App />
  </FhevmWrapper>
</WagmiProvider>
```

### Step 2: Migrate Encryption

**Before (Legacy):**

```tsx
import { useFHEEncryption } from "fhevm-sdk";

function TransferForm({ instance, userAddress, contractAddress }) {
  const { encryptWith, canEncrypt } = useFHEEncryption({
    instance,
    userAddress,
    contractAddress,
  });

  const handleTransfer = async (amount: bigint) => {
    if (!canEncrypt) return;

    const result = await encryptWith((builder) => {
      builder.add64(amount);
    });

    if (!result) return;

    await writeContract({
      args: [result.handles[0], result.inputProof],
    });
  };
}
```

**After (New):**

```tsx
import { useEncrypt } from "fhevm-sdk";

function TransferForm({ contractAddress }) {
  const { encrypt, isReady } = useEncrypt();

  const handleTransfer = async (amount: bigint) => {
    if (!isReady) return;

    const [handle, proof] = await encrypt([
      { type: "uint64", value: amount },
    ], contractAddress);

    if (!handle) return;

    await writeContract({
      args: [handle, proof],
    });
  };
}
```

**Key Changes:**

| Legacy | New |
|--------|-----|
| `encryptWith(builder => builder.add64(x))` | `encrypt([{ type: "uint64", value: x }], contract)` |
| `canEncrypt` | `isReady` |
| `result.handles[0], result.inputProof` | `[handle, proof]` (destructured) |
| Manual builder API | Declarative type/value objects |

### Step 3: Migrate Decryption

**Before (Legacy):**

```tsx
import { useFHEDecrypt } from "fhevm-sdk";

function BalanceDisplay({ instance, provider, address, handle, contractAddress }) {
  const {
    decrypt,
    results,
    isDecrypting,
    canDecrypt,
    error,
  } = useFHEDecrypt({
    instance,
    provider,
    address,
    fhevmDecryptionSignatureStorage: customStorage,
    chainId: 11155111,
    requests: [{ handle, contractAddress }],
  });

  const balance = results[handle];

  return (
    <div>
      <p>{balance?.toString() ?? "Encrypted"}</p>
      <button onClick={decrypt} disabled={!canDecrypt}>
        Decrypt
      </button>
    </div>
  );
}
```

**After (New):**

```tsx
import { useUserDecrypt } from "fhevm-sdk";

function BalanceDisplay({ handle, contractAddress }) {
  const {
    decrypt,
    results,
    isDecrypting,
    canDecrypt,
    error,
    clearError,
  } = useUserDecrypt({ handle, contractAddress });

  const balance = results[handle];

  return (
    <div>
      <p>{balance?.toString() ?? "Encrypted"}</p>
      <button onClick={decrypt} disabled={!canDecrypt}>
        Decrypt
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

**Key Changes:**

| Legacy | New |
|--------|-----|
| Pass `instance`, `provider`, `address` | Auto-injected from context |
| Pass `requests` array | Single object or array |
| Manual storage management | Storage configured in provider |
| No `clearError` | `clearError()` available |

### Step 4: Migrate Status Checking

**Before (Legacy):**

```tsx
import { useFhevm } from "fhevm-sdk";

function App() {
  const { instance, status, error } = useFhevm({
    provider,
    chainId,
  });

  if (status === "loading") return <Spinner />;
  if (status === "error") return <Error error={error} />;
  if (!instance) return <ConnectWallet />;

  return <MyApp instance={instance} />;
}
```

**After (New):**

```tsx
import { useFhevmStatus } from "fhevm-sdk";

function App() {
  const { status, isReady, isInitializing, isError, error } = useFhevmStatus();

  if (isInitializing) return <Spinner />;
  if (isError) return <Error error={error} />;
  if (!isReady) return <ConnectWallet />;

  return <MyApp />;
}
```

**Key Changes:**

| Legacy | New |
|--------|-----|
| `status === "loading"` | `isInitializing` |
| `status === "ready"` | `isReady` |
| `status === "error"` | `isError` |
| Pass `instance` to children | Context provides access |

### Step 5: Update Instance Access

If you need direct access to the FHEVM instance:

**Before (Legacy):**

```tsx
const { instance } = useFhevm({ provider, chainId });
// Pass instance around manually
```

**After (New):**

```tsx
import { useFhevmContext } from "fhevm-sdk";

function MyComponent() {
  const { instance, status } = useFhevmContext();

  // Instance is available when status === "ready"
  if (!instance) return null;

  // Use instance directly if needed
}
```

## Complete Before/After Example

### Before (Legacy)

```tsx
import { useFhevm, useFHEEncryption, useFHEDecrypt } from "fhevm-sdk";
import { GenericStringInMemoryStorage } from "fhevm-sdk";

const storage = new GenericStringInMemoryStorage();

function App() {
  const { instance, status, error } = useFhevm({
    provider: window.ethereum,
    chainId: 11155111,
  });

  if (status !== "ready" || !instance) {
    return <p>Loading...</p>;
  }

  return (
    <TokenBalance
      instance={instance}
      provider={window.ethereum}
      address={userAddress}
      storage={storage}
    />
  );
}

function TokenBalance({ instance, provider, address, storage }) {
  const [balanceHandle, setBalanceHandle] = useState();
  const contractAddress = "0x...";

  // Encryption
  const { encryptWith, canEncrypt } = useFHEEncryption({
    instance,
    userAddress: address,
    contractAddress,
  });

  // Decryption
  const { decrypt, results, canDecrypt, isDecrypting } = useFHEDecrypt({
    instance,
    provider,
    address,
    fhevmDecryptionSignatureStorage: storage,
    chainId: 11155111,
    requests: balanceHandle ? [{ handle: balanceHandle, contractAddress }] : [],
  });

  const handleTransfer = async (amount) => {
    const result = await encryptWith((b) => b.add64(amount));
    await writeContract({ args: [result.handles[0], result.inputProof] });
  };

  return (
    <div>
      <p>Balance: {results[balanceHandle]?.toString() ?? "?"}</p>
      <button onClick={decrypt} disabled={!canDecrypt}>Decrypt</button>
      <button onClick={() => handleTransfer(100n)} disabled={!canEncrypt}>Transfer</button>
    </div>
  );
}
```

### After (New)

```tsx
// config/fhevm.ts
import { createFhevmConfig, sepolia } from "fhevm-sdk";
export const fhevmConfig = createFhevmConfig({ chains: [sepolia] });

// providers.tsx
import { FhevmProvider, memoryStorage } from "fhevm-sdk";

function Providers({ children }) {
  const { address, chainId, isConnected } = useAccount();
  const { data: client } = useConnectorClient();

  return (
    <FhevmProvider
      config={fhevmConfig}
      provider={client?.transport}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      storage={memoryStorage}
    >
      {children}
    </FhevmProvider>
  );
}

// TokenBalance.tsx
import { useFhevmStatus, useEncrypt, useUserDecrypt } from "fhevm-sdk";

function TokenBalance() {
  const { isReady } = useFhevmStatus();
  const { encrypt } = useEncrypt();
  const contractAddress = "0x...";

  const [balanceHandle, setBalanceHandle] = useState();

  const { decrypt, results, canDecrypt, isDecrypting } = useUserDecrypt({
    handle: balanceHandle,
    contractAddress,
  });

  const handleTransfer = async (amount) => {
    const [handle, proof] = await encrypt([
      { type: "uint64", value: amount },
    ], contractAddress);

    await writeContract({ args: [handle, proof] });
  };

  if (!isReady) return <p>Loading...</p>;

  return (
    <div>
      <p>Balance: {results[balanceHandle]?.toString() ?? "?"}</p>
      <button onClick={decrypt} disabled={!canDecrypt}>Decrypt</button>
      <button onClick={() => handleTransfer(100n)}>Transfer</button>
    </div>
  );
}
```

## Breaking Changes Checklist

When migrating, ensure you've addressed:

- [ ] Removed all `useFhevm()` calls
- [ ] Removed all `useFHEEncryption()` calls
- [ ] Removed all `useFHEDecrypt()` calls
- [ ] Wrapped app with `FhevmProvider`
- [ ] Created `fhevmConfig` with `createFhevmConfig()`
- [ ] Configured storage in provider (not per-hook)
- [ ] Updated encryption to use new `encrypt()` API
- [ ] Updated decryption to use `useUserDecrypt()`
- [ ] Removed manual instance/provider/address passing
- [ ] Updated status checks to use `useFhevmStatus()`

## Getting Help

If you encounter issues during migration:

1. Check the [Error Handling Guide](../guides/error-handling.md)
2. Enable debug logging: `configureLogger({ enabled: true, level: "debug" })`
3. Open an issue at [GitHub](https://github.com/zama-ai/fhevm-react)

## Further Reading

- [Quick Start](../getting-started/quick-start.md)
- [FhevmProvider](../provider/fhevm-provider.md)
- [useEncrypt](../hooks/use-encrypt.md)
- [useUserDecrypt](../hooks/use-user-decrypt.md)
