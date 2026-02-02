# Security Guide

This guide covers security considerations when using fhevm-sdk, particularly around storage and key management.

## Overview

fhevm-sdk handles sensitive cryptographic material including:

- **Decryption private keys** - Used to decrypt FHE ciphertext
- **EIP-712 signatures** - Proves user authorization for decryption
- **Encrypted handles** - References to on-chain encrypted values

Understanding how this data is stored and protected is essential for building secure applications.

## Storage Security

### What Gets Stored

When a user decrypts a value, the SDK caches:

```typescript
{
  privateKey: Uint8Array,      // Decryption private key
  publicKey: Uint8Array,       // Corresponding public key
  signature: string,           // EIP-712 signature from wallet
  contractAddresses: string[], // Authorized contracts
  userAddress: string,         // User's wallet address
  startTimestamp: number,      // When signature was created
  durationDays: number         // Validity period (default: 1 day)
}
```

### Storage Options Security Comparison

| Storage | XSS Vulnerable | Persists | Cleared On | Recommended For |
|---------|---------------|----------|------------|-----------------|
| `localStorageAdapter` | **Yes** | Forever | Manual clear | Low-risk apps, dev |
| `sessionStorageAdapter` | **Yes** | Tab lifetime | Tab close | Balanced security |
| `memoryStorage` | No | Page lifetime | Refresh | Security-critical apps |
| `noOpStorage` | No | Never | Immediately | Maximum security |
| Custom encrypted | Configurable | Configurable | Configurable | Enterprise apps |

### XSS Attack Vector

**Critical Warning:** Both `localStorage` and `sessionStorage` are vulnerable to Cross-Site Scripting (XSS) attacks.

If an attacker injects malicious JavaScript into your page, they can:

1. Read all stored decryption signatures
2. Extract private keys and signatures
3. Decrypt the user's confidential data without their knowledge

```javascript
// Example attack - DO NOT USE, shown for awareness only
const stolenData = Object.keys(localStorage)
  .filter(key => key.startsWith("fhevm:"))
  .map(key => ({ key, value: localStorage.getItem(key) }));
// Attacker sends stolenData to their server
```

### Mitigation Strategies

#### 1. Use Memory Storage for Sensitive Applications

For applications handling highly sensitive data, use `memoryStorage`:

```tsx
import { FhevmProvider, memoryStorage } from "fhevm-sdk";

<FhevmProvider
  config={fhevmConfig}
  storage={memoryStorage}
  // ...
>
```

**Trade-off:** Users must re-sign on every page refresh.

#### 2. Implement Encrypted Storage

Encrypt data before storing to protect against XSS:

```tsx
import CryptoJS from "crypto-js";

// Derive key from something the attacker can't access
// (e.g., user password, hardware key, or secure enclave)
function getEncryptionKey(): string {
  // WARNING: This is a simplified example.
  // In production, derive this from a secure source.
  return sessionStorage.getItem("session-key") || "";
}

const encryptedStorage: GenericStringStorage = {
  getItem(key) {
    const encrypted = localStorage.getItem(`fhevm-encrypted:${key}`);
    if (!encrypted) return null;

    const encKey = getEncryptionKey();
    if (!encKey) return null;

    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, encKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return null;
    }
  },

  setItem(key, value) {
    const encKey = getEncryptionKey();
    if (!encKey) return;

    const encrypted = CryptoJS.AES.encrypt(value, encKey).toString();
    localStorage.setItem(`fhevm-encrypted:${key}`, encrypted);
  },

  removeItem(key) {
    localStorage.removeItem(`fhevm-encrypted:${key}`);
  },
};
```

#### 3. Strict Content Security Policy

Implement CSP headers to prevent XSS:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.zama.ai;
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://*.infura.io https://*.alchemy.com;
```

#### 4. Clear Storage on Logout

Always clear FHE-related storage when users log out:

```tsx
function handleLogout() {
  // Clear all fhevm data
  Object.keys(localStorage)
    .filter(key => key.startsWith("fhevm:"))
    .forEach(key => localStorage.removeItem(key));

  Object.keys(sessionStorage)
    .filter(key => key.startsWith("fhevm:"))
    .forEach(key => sessionStorage.removeItem(key));

  // Continue with logout...
  disconnect();
}
```

#### 5. Reduce Signature Duration

The default signature validity is 24 hours. For sensitive apps, consider:

```tsx
// Use shorter sessions by implementing a wrapper
const shortLivedStorage: GenericStringStorage = {
  getItem(key) {
    const data = localStorage.getItem(key);
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      // Check if signature is older than 1 hour
      if (Date.now() - parsed.startTimestamp > 3600000) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch {
      return data;
    }
  },
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};
```

## Public Key Storage

The SDK stores public keys and parameters in IndexedDB with automatic fallback:

1. **IndexedDB** (primary) - Persists across sessions
2. **Memory** (fallback) - Used when IndexedDB is unavailable

This fallback happens automatically in:
- Server-side rendering (SSR)
- Private/incognito browsing mode
- Browsers with IndexedDB disabled

You can check which storage is being used:

```tsx
import { getPublicKeyStorageType } from "fhevm-sdk";

const storageType = getPublicKeyStorageType();
// Returns: "indexeddb" | "memory" | "none"
```

## Debug Logging

The SDK includes a configurable logger. By default:
- **Development**: Debug logs enabled
- **Production**: Only warnings and errors

To enable debug logs in production (not recommended):

```tsx
import { configureLogger } from "fhevm-sdk";

configureLogger({
  enabled: true,
  level: "debug",
});
```

**Warning:** Debug logs may include sensitive information. Never enable in production.

## Network Security

### CDN Dependencies

The SDK loads the relayer-sdk from Zama's CDN. The loader includes:
- Automatic retry with exponential backoff
- Configurable timeout
- Error recovery

For enhanced security, consider self-hosting the relayer SDK:

```tsx
import { RelayerSDKLoader } from "fhevm-sdk";

const loader = new RelayerSDKLoader({
  cdnUrl: "https://your-cdn.com/relayer-sdk.min.js",
  maxRetries: 3,
});
```

### Initialization Timeout

FhevmProvider includes an `initTimeout` prop to prevent hanging:

```tsx
<FhevmProvider
  config={fhevmConfig}
  initTimeout={30000} // 30 seconds, default
  // ...
>
```

If initialization times out, the status changes to `"error"` and `error` is populated.

## Security Checklist

Before deploying to production:

- [ ] Choose appropriate storage based on security requirements
- [ ] Implement CSP headers
- [ ] Clear storage on logout
- [ ] Disable debug logging
- [ ] Consider encrypted storage for sensitive applications
- [ ] Test in private browsing mode (IndexedDB fallback)
- [ ] Handle initialization timeouts gracefully
- [ ] Validate all user inputs before encryption
- [ ] Use HTTPS in production

## Reporting Security Issues

If you discover a security vulnerability in fhevm-sdk:

1. **Do not** open a public issue
2. Email security@zama.ai with details
3. Include steps to reproduce if possible
4. Allow reasonable time for a fix before disclosure

## Further Reading

- [Storage Configuration](../configuration/storage.md)
- [FhevmProvider](../provider/fhevm-provider.md)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
