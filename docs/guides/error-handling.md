# Error Handling Guide

This guide documents common errors in fhevm-sdk and how to handle them effectively.

## Error Types

The SDK provides structured error types for different failure scenarios:

```tsx
import { FhevmReactError, FhevmAbortError } from "fhevm-sdk";

// FhevmReactError - General SDK errors
// FhevmAbortError - Operation was cancelled
```

## Hook Error States

### useFhevmStatus

```tsx
const { status, error, isError } = useFhevmStatus();
```

| State | Description | Recovery |
|-------|-------------|----------|
| `"idle"` | Not initialized | Connect wallet |
| `"initializing"` | Loading FHEVM | Wait or show spinner |
| `"ready"` | Ready to use | None needed |
| `"error"` | Initialization failed | Check `error`, retry |

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `FHEVM initialization timed out` | Network/CDN issue | Check network, increase `initTimeout` |
| `Chain not supported` | Unknown chainId | Add chain to config |
| `Provider not available` | No wallet connected | Prompt user to connect |

**Example:**

```tsx
function FHEStatus() {
  const { status, error, isError } = useFhevmStatus();

  if (isError) {
    if (error?.message.includes("timed out")) {
      return (
        <div>
          <p>Connection timed out. Please check your network.</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      );
    }

    if (error?.message.includes("not supported")) {
      return <p>Please switch to a supported network.</p>;
    }

    return <p>Error: {error?.message}</p>;
  }

  // ...
}
```

### useEncrypt

```tsx
const { encrypt, isReady } = useEncrypt();
```

The `encrypt` function returns `undefined` on failure. Errors are thrown for critical issues.

| Scenario | Return Value | Error Type |
|----------|--------------|------------|
| Success | `[...handles, proof]` | None |
| Not ready | `undefined` | None |
| Invalid input | Throws | `TypeError` |
| Encryption failed | Throws | `Error` |

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `FHEVM not initialized` | Called before ready | Check `isReady` first |
| `Invalid input type` | Wrong value type | Use correct type (e.g., `bigint` for uint64) |
| `Value out of range` | Number too large | Check value bounds |
| `Encryption mismatch` | Internal error | Report as bug |

**Example:**

```tsx
async function handleEncrypt() {
  if (!isReady) {
    showError("Please wait for FHE to initialize");
    return;
  }

  try {
    const result = await encrypt([
      { type: "uint64", value: amount },
    ], contractAddress);

    if (!result) {
      showError("Encryption failed - please try again");
      return;
    }

    const [handle, proof] = result;
    // Continue with contract call...

  } catch (error) {
    if (error instanceof TypeError) {
      showError("Invalid input: " + error.message);
    } else {
      showError("Encryption error: " + error.message);
    }
  }
}
```

### useUserDecrypt

```tsx
const {
  decrypt,
  results,
  error,
  isError,
  isDecrypting,
  clearError,
} = useUserDecrypt({ handle, contractAddress });
```

| State | Description |
|-------|-------------|
| `isIdle` | Not started |
| `isDecrypting` | In progress |
| `isSuccess` | Completed successfully |
| `isError` | Failed |

**Common Errors:**

| Error Code | Cause | Solution |
|------------|-------|----------|
| `SIGNATURE_ERROR` | Failed to create/load signature | User may have rejected signing |
| `DECRYPT_ERROR` | Decryption failed | Invalid handle or unauthorized |
| `TIMEOUT_ERROR` | Operation timed out | Network issue, retry |
| `UNKNOWN_ERROR` | Unexpected failure | Check console, report bug |

**Error Message Format:**

```
ERROR_CODE: Human readable message
```

**Example:**

```tsx
function DecryptButton({ handle, contractAddress }) {
  const { decrypt, error, isError, isDecrypting, clearError } =
    useUserDecrypt({ handle, contractAddress });

  const handleDecrypt = () => {
    clearError(); // Clear previous error
    decrypt();
  };

  if (isError) {
    const [code, message] = error?.split(": ") ?? ["UNKNOWN", "Unknown error"];

    switch (code) {
      case "SIGNATURE_ERROR":
        return (
          <div>
            <p>Signature required. Please approve in your wallet.</p>
            <button onClick={handleDecrypt}>Try Again</button>
          </div>
        );

      case "DECRYPT_ERROR":
        return (
          <div>
            <p>Unable to decrypt. You may not have access to this value.</p>
            <button onClick={clearError}>Dismiss</button>
          </div>
        );

      default:
        return (
          <div>
            <p>Error: {message}</p>
            <button onClick={handleDecrypt}>Retry</button>
          </div>
        );
    }
  }

  return (
    <button onClick={handleDecrypt} disabled={isDecrypting}>
      {isDecrypting ? "Decrypting..." : "Decrypt"}
    </button>
  );
}
```

### useConfidentialTransfer

```tsx
const {
  transfer,
  error,
  isError,
  isPending,
  reset,
} = useConfidentialTransfer(options);
```

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Insufficient balance` | Not enough tokens | Check balance first |
| `User rejected` | User cancelled transaction | Allow retry |
| `Contract error` | Smart contract reverted | Check contract requirements |
| `Encryption failed` | Failed to encrypt amount | Retry encryption |

**Example:**

```tsx
function TransferForm() {
  const { transfer, error, isError, isPending, reset } = useConfidentialTransfer({
    tokenAddress,
  });

  const handleTransfer = async () => {
    reset(); // Clear previous state

    try {
      await transfer({
        to: recipient,
        amount: BigInt(amount),
      });
    } catch (e) {
      // Error is also available via isError/error
      console.error("Transfer failed:", e);
    }
  };

  if (isError) {
    return (
      <div className="error">
        <p>{error?.message ?? "Transfer failed"}</p>
        <button onClick={reset}>Try Again</button>
      </div>
    );
  }

  return (
    <button onClick={handleTransfer} disabled={isPending}>
      {isPending ? "Transferring..." : "Transfer"}
    </button>
  );
}
```

### useConfidentialBalances

```tsx
const {
  balances,
  isLoading,
  isError,
  error,
  refetch,
} = useConfidentialBalances(options);
```

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Contract read failed` | RPC or contract issue | Check network, retry |
| `Decryption failed` | Invalid signature | Re-authenticate |
| `Invalid token address` | Wrong address format | Validate address |

**Example:**

```tsx
function BalanceList({ tokens }) {
  const { balances, isLoading, isError, error, refetch } = useConfidentialBalances({
    tokens,
    autoDecrypt: true,
  });

  if (isLoading) {
    return <Spinner />;
  }

  if (isError) {
    return (
      <div>
        <p>Failed to load balances: {error?.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <ul>
      {balances.map((b) => (
        <li key={b.address}>
          {b.symbol}: {b.decryptedBalance?.toString() ?? "Encrypted"}
        </li>
      ))}
    </ul>
  );
}
```

## Global Error Boundary

Wrap your FHE components in an error boundary:

```tsx
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class FHEErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("FHE Error:", error, info);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="fhe-error">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<FHEErrorBoundary fallback={<FHEErrorFallback />}>
  <ConfidentialApp />
</FHEErrorBoundary>
```

## Debugging Tips

### Enable Debug Logging

```tsx
import { configureLogger } from "fhevm-sdk";

// Enable in development only
if (process.env.NODE_ENV === "development") {
  configureLogger({
    enabled: true,
    level: "debug",
  });
}
```

### Check Initialization State

```tsx
const { status, error, instance } = useFhevmContext();

console.log("FHEVM Status:", status);
console.log("Instance available:", !!instance);
if (error) console.error("Init error:", error);
```

### Validate Contract Addresses

```tsx
function isValidAddress(addr: string): addr is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

if (!isValidAddress(contractAddress)) {
  throw new Error(`Invalid contract address: ${contractAddress}`);
}
```

### Network Diagnostics

```tsx
const { status, error } = useFhevmStatus();
const { chain } = useAccount();

useEffect(() => {
  if (status === "error") {
    console.group("FHEVM Diagnostics");
    console.log("Chain ID:", chain?.id);
    console.log("Chain supported:", fhevmConfig.chains.some(c => c.id === chain?.id));
    console.log("Error:", error);
    console.groupEnd();
  }
}, [status, error, chain]);
```

## Error Recovery Patterns

### Automatic Retry

```tsx
function useRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
) {
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        setAttempts(i + 1);
        return await fn();
      } catch (e) {
        if (i === maxRetries - 1) {
          setError(e as Error);
          throw e;
        }
        await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
      }
    }
  }, [fn, maxRetries, delay]);

  return { execute, attempts, error };
}
```

### Graceful Degradation

```tsx
function BalanceDisplay({ handle, contractAddress }) {
  const { results, isError } = useUserDecrypt({ handle, contractAddress });

  // Show encrypted indicator if decryption fails
  if (isError || !results[handle]) {
    return (
      <span className="encrypted">
        <LockIcon /> Balance hidden
      </span>
    );
  }

  return <span>{results[handle].toString()} tokens</span>;
}
```

## Further Reading

- [Security Guide](./security.md)
- [FhevmProvider](../provider/fhevm-provider.md)
- [useUserDecrypt](../hooks/use-user-decrypt.md)
- [useEncrypt](../hooks/use-encrypt.md)
