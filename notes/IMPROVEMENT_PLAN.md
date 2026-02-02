# React SDK Improvement Plan

This document outlines a comprehensive plan to address code quality, security, and architectural issues identified in the `@zama-fhe/sdk` codebase.

---

## Executive Summary

| Category | Critical | High | Medium | Total |
|----------|----------|------|--------|-------|
| Security | 3 | 2 | - | 5 |
| Error Handling | 2 | 2 | 1 | 5 |
| Type Safety | 2 | 3 | 1 | 6 |
| Code Quality | 1 | 3 | 3 | 7 |
| Architecture | - | 2 | 2 | 4 |
| **TOTAL** | **8** | **12** | **7** | **27** |

---

## Phase 1: Critical Security Fixes (Priority: IMMEDIATE)

### 1.1 Private Key Storage Security
**Files:** `src/FhevmDecryptionSignature.ts`, `src/react/useConfidentialBalances.ts`

**Issue:** Private keys for decryption are stored in user-provided storage, potentially localStorage which is vulnerable to XSS attacks.

**Fix:**
- Add security warnings in JSDoc
- Validate storage type and warn if using localStorage
- Consider encrypting sensitive data before storage
- Document security implications prominently

### 1.2 CDN Integrity Checking
**File:** `src/internal/RelayerSDKLoader.ts`

**Issue:** Relayer SDK loaded from CDN without Subresource Integrity (SRI) hash validation.

**Fix:**
- Add SRI hash to script loading
- Provide fallback CDN URL
- Implement retry with exponential backoff

### 1.3 Encryption Result Validation
**File:** `src/react/useEncrypt.ts`

**Issue:** No validation that encryption returns correct number of handles for inputs.

**Fix:**
- Add assertion: `handles.length === inputs.length`
- Throw descriptive error if mismatch

---

## Phase 2: Critical Error Handling (Priority: HIGH)

### 2.1 FHEVM Initialization Timeout
**File:** `src/react/FhevmProvider.tsx`

**Issue:** Initialization can hang indefinitely if relayer is unresponsive.

**Fix:**
- Add configurable `initTimeout` prop (default: 30000ms)
- Use AbortController with timeout
- Set error state on timeout

### 2.2 Silent Catch Blocks
**Files:** `src/internal/PublicKeyStorage.ts`, `src/storage/adapters.ts`

**Issue:** Empty catch blocks hide errors, causing confusing behavior.

**Fix:**
- Log errors with console.warn in development
- Provide fallback behavior
- Return success/failure indicators

### 2.3 RelayerSDKLoader Error Recovery
**File:** `src/internal/RelayerSDKLoader.ts`

**Issue:** No retry mechanism if CDN fails.

**Fix:**
- Implement exponential backoff retry (3 attempts)
- Provide alternative CDN URL
- Clear error messaging

---

## Phase 3: Type Safety Improvements (Priority: HIGH)

### 3.1 Remove `any` Types from Core Interfaces
**Files:**
- `src/fhevmTypes.ts` (lines 4-7, 32)
- `src/internal/fhevmTypes.ts`
- `src/FhevmDecryptionSignature.ts`

**Issue:** Critical SDK types use `any`, breaking type safety.

**Fix:**
```typescript
// Before
export type FhevmInitSDKOptions = {
  tfheParams?: any;
  kmsParams?: any;
};

// After
export type FhevmInitSDKOptions = {
  tfheParams?: TfheParams;
  kmsParams?: KmsParams;
};

// Define proper interfaces
interface TfheParams {
  // Define based on relayer-sdk types
}
```

### 3.2 Safe Type Casting in useEncrypt
**File:** `src/react/useEncrypt.ts` (line 81)

**Issue:** Unsafe dynamic method access with type cast.

**Fix:**
- Create type-safe method dispatch map
- Validate method exists before calling
- Add exhaustive type checking

### 3.3 JSON Deserialization Validation
**File:** `src/FhevmDecryptionSignature.ts`

**Issue:** `fromJSON` accepts unknown data without validation.

**Fix:**
- Add runtime type validation
- Use type guards for deserialization
- Throw descriptive errors on invalid data

---

## Phase 4: Code Quality Improvements (Priority: MEDIUM)

### 4.1 Standardize Error Handling Pattern
**Files:** All hooks in `src/react/`

**Issue:** Inconsistent error handling - some throw, some return undefined, some use error state.

**Fix:**
- Standardize on TanStack Query mutation pattern
- All operations return `{ data, error, isLoading, isError }` pattern
- Document error types for each hook

### 4.2 Remove Console Logging
**Files:** 15+ files with 59 occurrences

**Issue:** Console logs in production code.

**Fix:**
- Create internal `logger` utility with debug flag
- Replace all `console.log` with `logger.debug`
- Allow users to enable debug mode via config

### 4.3 Memoization Improvements
**File:** `src/react/useConfidentialBalances.ts`

**Issue:** Unnecessary recalculations on every render.

**Fix:**
- Add proper `useMemo` with correct dependencies
- Use stable references for callbacks
- Optimize dependency arrays

---

## Phase 5: Architecture Improvements (Priority: MEDIUM)

### 5.1 Deprecate Legacy API
**Files:** `useFHEDecrypt.ts`, `useFHEEncryption.ts`, `useFhevm.tsx`

**Issue:** Dual API causes confusion and maintenance burden.

**Fix:**
- Add `@deprecated` JSDoc tags
- Console warn on first use in development
- Document migration path
- Plan removal for next major version

### 5.2 Storage Fallback Chain
**File:** `src/internal/PublicKeyStorage.ts`

**Issue:** Hard dependency on IndexedDB fails silently in some environments.

**Fix:**
- Implement fallback chain: IndexedDB → sessionStorage → memory
- Log which storage is being used
- Graceful degradation for SSR/private browsing

### 5.3 FhevmInstance Abstraction
**Issue:** Direct dependency on relayer-sdk types throughout.

**Fix:**
- Create `FhevmInstanceAdapter` interface
- Wrap relayer-sdk instance
- Enable easier testing and mocking

---

## Phase 6: Documentation Improvements (Priority: MEDIUM)

### 6.1 Security Documentation
- Document storage security implications
- Add warnings about localStorage risks
- Provide secure storage recommendations

### 6.2 Error Handling Guide
- Document common errors and recovery patterns
- Provide code examples for error handling
- List all possible error states per hook

### 6.3 Migration Guide
- Document migration from legacy to new API
- Provide code examples
- Breaking changes checklist

---

## Implementation Order

### Immediate (This PR)
1. ✅ Phase 1.3 - Encryption result validation
2. ✅ Phase 2.2 - Silent catch blocks
3. ✅ Phase 3.1 - Remove critical `any` types
4. ✅ Phase 3.2 - Safe type casting (discriminated union dispatch in useEncrypt)

### Short-term (Next PR)
5. ✅ Phase 2.1 - Initialization timeout (FhevmProvider initTimeout prop)
6. ✅ Phase 2.3 - RelayerSDKLoader retry (exponential backoff with jitter)
7. ✅ Phase 3.3 - JSON Deserialization Validation (fromJSON with proper type guards)
8. ✅ Removed `any` types from useFHEEncryption.ts (proper ABI typing)
9. Phase 1.1 - Storage security warnings
10. Phase 4.1 - Standardize error handling

### Medium-term (Future PRs)
9. ✅ Phase 4.2 - Console logging cleanup (created logger utility, replaced ~40 console calls)
10. ✅ Phase 5.1 - Deprecate legacy API (added @deprecated tags and one-time warnings)
11. ✅ Phase 5.2 - Storage fallback chain (IndexedDB → memory with logging)
12. ✅ Phase 6.1 - Security documentation (docs/guides/security.md, storage warning)
13. ✅ Phase 6.2 - Error handling guide (docs/guides/error-handling.md)
14. ✅ Phase 6.3 - Migration guide (docs/migration/from-legacy.md)
15. ✅ Phase 1.2 - CDN integrity checking (SRI support, fallback URLs, crossOrigin)
16. ✅ Phase 4.3 - Memoization improvements (useConfidentialBalances optimized, console.log replaced)
17. ✅ Phase 5.3 - FhevmInstance abstraction (IFhevmInstanceAdapter interface)

---

## Success Metrics

1. **Type Safety:** Zero `any` types in public API
2. **Error Handling:** All async operations have timeout and error recovery
3. **Security:** No sensitive data in localStorage without warning
4. **Code Quality:** Zero console.log in production builds
5. **Test Coverage:** Maintain >80% coverage after changes

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/react/useEncrypt.ts` | Validation, type safety |
| `src/FhevmDecryptionSignature.ts` | Type safety, security warnings |
| `src/internal/PublicKeyStorage.ts` | Error handling, logging |
| `src/storage/adapters.ts` | Error handling, logging |
| `src/fhevmTypes.ts` | Remove `any` types |
| `src/internal/fhevmTypes.ts` | Remove `any` types |
| `src/react/FhevmProvider.tsx` | Timeout, error handling |
| `src/internal/RelayerSDKLoader.ts` | Retry logic, integrity |
| `src/react/useConfidentialBalances.ts` | Memoization |
| Multiple hooks | Deprecation warnings |

---

## Estimated Effort

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1 | 4 hours | Medium |
| Phase 2 | 4 hours | Low |
| Phase 3 | 6 hours | Medium |
| Phase 4 | 4 hours | Low |
| Phase 5 | 8 hours | High |
| Phase 6 | 4 hours | Low |
| **Total** | **30 hours** | - |

---

## Review Checklist

- [ ] All tests pass
- [ ] No new `any` types introduced
- [ ] Console logs removed or behind debug flag
- [ ] Security warnings added where needed
- [ ] Error states properly handled
- [ ] TypeScript strict mode passes
- [ ] Documentation updated
