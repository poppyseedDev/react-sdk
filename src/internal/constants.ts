/**
 * Relayer SDK version locked in the fhevm-sdk.
 * Users don't need to manage this - it's handled internally.
 */
export const RELAYER_SDK_VERSION = "0.4.0";

/**
 * CDN URL for the relayer SDK script.
 */
export const RELAYER_SDK_URL = `https://cdn.zama.org/relayer-sdk-js/${RELAYER_SDK_VERSION}/relayer-sdk-js.umd.cjs`;

/**
 * Subresource Integrity (SRI) hash for the relayer SDK script.
 * This hash is used to verify the integrity of the script loaded from CDN.
 * Format: algorithm-base64hash (e.g., "sha384-...")
 *
 * To generate this hash:
 * 1. Download the script: curl -O https://cdn.zama.org/relayer-sdk-js/0.4.0/relayer-sdk-js.umd.cjs
 * 2. Generate hash: openssl dgst -sha384 -binary relayer-sdk-js.umd.cjs | openssl base64 -A
 * 3. Prepend "sha384-" to the result
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
 */
export const RELAYER_SDK_INTEGRITY: string | undefined = undefined;

/**
 * Fallback CDN URL for the relayer SDK script.
 * Used if the primary CDN fails and no custom fallback is provided.
 */
export const RELAYER_SDK_FALLBACK_URL: string | undefined = undefined;

/** @deprecated Use RELAYER_SDK_URL instead */
export const SDK_CDN_URL = RELAYER_SDK_URL;
