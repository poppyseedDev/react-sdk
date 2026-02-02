import { SDK_CDN_URL, RELAYER_SDK_INTEGRITY, RELAYER_SDK_FALLBACK_URL } from "./constants";
import { FhevmRelayerSDKType, FhevmWindowType } from "./fhevmTypes";
import { logger } from "./logger";

type TraceType = (message?: unknown, ...optionalParams: unknown[]) => void;

/**
 * Options for RelayerSDKLoader.
 */
export interface RelayerSDKLoaderOptions {
  /** Optional trace function for logging */
  trace?: TraceType;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in ms between retries (default: 10000) */
  maxDelay?: number;
  /**
   * Custom CDN URL for the relayer SDK script.
   * Defaults to the official Zama CDN.
   */
  cdnUrl?: string;
  /**
   * Fallback CDN URL to try if the primary CDN fails.
   * If not provided, no fallback will be attempted.
   */
  fallbackUrl?: string;
  /**
   * Subresource Integrity (SRI) hash for the script.
   * Format: "sha384-..." or "sha512-..."
   * If provided, the script will be verified against this hash.
   * @see https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
   */
  integrity?: string;
  /**
   * Cross-origin attribute for the script tag.
   * Required when using SRI with scripts from a different origin.
   * Defaults to "anonymous" when integrity is provided.
   */
  crossOrigin?: "anonymous" | "use-credentials";
}

/**
 * Delay helper that returns a promise resolving after the specified time.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter.
 * @param attempt - The current attempt number (0-indexed)
 * @param initialDelay - The initial delay in ms
 * @param maxDelay - The maximum delay in ms
 */
function calculateBackoff(attempt: number, initialDelay: number, maxDelay: number): number {
  // Exponential backoff: initialDelay * 2^attempt
  const exponentialDelay = initialDelay * Math.pow(2, attempt);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  const delayWithJitter = exponentialDelay + jitter;
  // Cap at maxDelay
  return Math.min(delayWithJitter, maxDelay);
}

export class RelayerSDKLoader {
  private _trace?: TraceType;
  private _maxRetries: number;
  private _initialDelay: number;
  private _maxDelay: number;
  private _cdnUrl: string;
  private _fallbackUrl?: string;
  private _integrity?: string;
  private _crossOrigin?: "anonymous" | "use-credentials";

  constructor(options: RelayerSDKLoaderOptions = {}) {
    this._trace = options.trace;
    this._maxRetries = options.maxRetries ?? 3;
    this._initialDelay = options.initialDelay ?? 1000;
    this._maxDelay = options.maxDelay ?? 10000;
    this._cdnUrl = options.cdnUrl ?? SDK_CDN_URL;
    this._fallbackUrl = options.fallbackUrl ?? RELAYER_SDK_FALLBACK_URL;
    this._integrity = options.integrity ?? RELAYER_SDK_INTEGRITY;
    // When integrity is provided, crossOrigin must be set for CORS
    this._crossOrigin = options.crossOrigin ?? (this._integrity ? "anonymous" : undefined);
  }

  public isLoaded() {
    if (typeof window === "undefined") {
      throw new Error("RelayerSDKLoader: can only be used in the browser.");
    }
    return isFhevmWindowType(window, this._trace);
  }

  /**
   * Load the Relayer SDK with automatic retry on failure.
   * Uses exponential backoff with jitter between retry attempts.
   * If a fallback URL is configured and the primary CDN fails, it will try the fallback.
   */
  public async load(): Promise<void> {
    logger.debug("[RelayerSDKLoader]", "load...");
    // Ensure this only runs in the browser
    if (typeof window === "undefined") {
      logger.debug("[RelayerSDKLoader]", "window === undefined");
      throw new Error("RelayerSDKLoader: can only be used in the browser.");
    }

    // Check if already loaded
    if ("relayerSDK" in window) {
      if (!isFhevmRelayerSDKType(window.relayerSDK, this._trace)) {
        logger.debug("[RelayerSDKLoader]", "window.relayerSDK is invalid");
        throw new Error("RelayerSDKLoader: Unable to load FHEVM Relayer SDK");
      }
      return;
    }

    // Try primary CDN
    const primaryError = await this._loadWithRetries(this._cdnUrl);
    if (!primaryError) {
      return; // Success
    }

    // Try fallback CDN if available
    if (this._fallbackUrl) {
      logger.warn(
        "[RelayerSDKLoader]",
        `Primary CDN failed, trying fallback URL: ${this._fallbackUrl}`
      );
      const fallbackError = await this._loadWithRetries(this._fallbackUrl);
      if (!fallbackError) {
        return; // Success with fallback
      }

      // Both failed
      throw new Error(
        `RelayerSDKLoader: Failed to load Relayer SDK from both primary and fallback CDNs. ` +
          `Primary error: ${primaryError.message}. Fallback error: ${fallbackError.message}. ` +
          `Please check your network connection and try again.`
      );
    }

    // No fallback, throw primary error
    throw primaryError;
  }

  /**
   * Attempt to load the script from a URL with retries.
   * @returns Error if all attempts failed, undefined on success.
   */
  private async _loadWithRetries(url: string): Promise<Error | undefined> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this._maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const backoffDelay = calculateBackoff(attempt - 1, this._initialDelay, this._maxDelay);
          logger.debug(
            "[RelayerSDKLoader]",
            `Retry attempt ${attempt}/${this._maxRetries} after ${Math.round(backoffDelay)}ms delay`
          );
          await delay(backoffDelay);
        }

        await this._loadScript(url);
        logger.debug("[RelayerSDKLoader]", `Successfully loaded Relayer SDK from ${url}`);
        return undefined; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(
          "[RelayerSDKLoader]",
          `Load attempt ${attempt + 1}/${this._maxRetries + 1} failed:`,
          lastError.message
        );

        // Remove failed script to allow retry
        if (attempt < this._maxRetries) {
          this._removeScript(url);
        }
      }
    }

    return new Error(
      `Failed to load Relayer SDK from ${url} after ${this._maxRetries + 1} attempts. ` +
        `Last error: ${lastError?.message ?? "Unknown error"}.`
    );
  }

  /**
   * Remove any existing script tag for the SDK.
   * Called before retry to ensure clean state.
   */
  private _removeScript(url: string): void {
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      existingScript.remove();
    }
  }

  /**
   * Internal method to load the script once.
   * @param url - The URL to load the script from
   */
  private _loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${url}"]`);
      if (existingScript) {
        if (!isFhevmWindowType(window, this._trace)) {
          reject(
            new Error("RelayerSDKLoader: window object does not contain a valid relayerSDK object.")
          );
          return;
        }
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = url;
      script.type = "text/javascript";
      script.async = true;

      // Add Subresource Integrity (SRI) if configured
      if (this._integrity) {
        script.integrity = this._integrity;
        logger.debug("[RelayerSDKLoader]", `Using SRI: ${this._integrity.substring(0, 20)}...`);
      }

      // Add crossorigin attribute if configured (required for SRI with cross-origin scripts)
      if (this._crossOrigin) {
        script.crossOrigin = this._crossOrigin;
      }

      script.onload = () => {
        if (!isFhevmWindowType(window, this._trace)) {
          logger.debug("[RelayerSDKLoader]", "script onload FAILED - invalid relayerSDK object");
          reject(
            new Error(
              `RelayerSDKLoader: Relayer SDK script has been successfully loaded from ${url}, however, the window.relayerSDK object is invalid.`
            )
          );
          return;
        }
        resolve();
      };

      script.onerror = (event) => {
        logger.debug("[RelayerSDKLoader]", "script onerror", event);
        // Provide more specific error messages
        let errorMessage = `RelayerSDKLoader: Failed to load Relayer SDK from ${url}`;
        if (this._integrity) {
          errorMessage +=
            ". This may be due to an SRI hash mismatch - verify the integrity hash matches the script content.";
        }
        reject(new Error(errorMessage));
      };

      logger.debug("[RelayerSDKLoader]", `adding script to DOM: ${url}`);
      document.head.appendChild(script);
      logger.debug("[RelayerSDKLoader]", "script added!");
    });
  }
}

function isFhevmRelayerSDKType(o: unknown, trace?: TraceType): o is FhevmRelayerSDKType {
  if (typeof o === "undefined") {
    trace?.("RelayerSDKLoader: relayerSDK is undefined");
    return false;
  }
  if (o === null) {
    trace?.("RelayerSDKLoader: relayerSDK is null");
    return false;
  }
  if (typeof o !== "object") {
    trace?.("RelayerSDKLoader: relayerSDK is not an object");
    return false;
  }
  if (!objHasProperty(o, "initSDK", "function", trace)) {
    trace?.("RelayerSDKLoader: relayerSDK.initSDK is invalid");
    return false;
  }
  if (!objHasProperty(o, "createInstance", "function", trace)) {
    trace?.("RelayerSDKLoader: relayerSDK.createInstance is invalid");
    return false;
  }
  if (!objHasProperty(o, "SepoliaConfig", "object", trace)) {
    trace?.("RelayerSDKLoader: relayerSDK.SepoliaConfig is invalid");
    return false;
  }
  if ("__initialized__" in o) {
    if (o.__initialized__ !== true && o.__initialized__ !== false) {
      trace?.("RelayerSDKLoader: relayerSDK.__initialized__ is invalid");
      return false;
    }
  }
  return true;
}

export function isFhevmWindowType(win: unknown, trace?: TraceType): win is FhevmWindowType {
  if (typeof win === "undefined") {
    trace?.("RelayerSDKLoader: window object is undefined");
    return false;
  }
  if (win === null) {
    trace?.("RelayerSDKLoader: window object is null");
    return false;
  }
  if (typeof win !== "object") {
    trace?.("RelayerSDKLoader: window is not an object");
    return false;
  }
  if (!("relayerSDK" in win)) {
    trace?.("RelayerSDKLoader: window does not contain 'relayerSDK' property");
    return false;
  }
  return isFhevmRelayerSDKType(win.relayerSDK);
}

function objHasProperty<
  T extends object,
  K extends PropertyKey,
  V extends string, // "string", "number", etc.
>(
  obj: T,
  propertyName: K,
  propertyType: V,
  trace?: TraceType
): obj is T &
  Record<
    K,
    V extends "string"
      ? string
      : V extends "number"
        ? number
        : V extends "object"
          ? object
          : V extends "boolean"
            ? boolean
            : V extends "function"
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (...args: any[]) => any
              : unknown
  > {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  if (!(propertyName in obj)) {
    trace?.(`RelayerSDKLoader: missing ${String(propertyName)}.`);
    return false;
  }

  const value = (obj as Record<K, unknown>)[propertyName];

  if (value === null || value === undefined) {
    trace?.(`RelayerSDKLoader: ${String(propertyName)} is null or undefined.`);
    return false;
  }

  if (typeof value !== propertyType) {
    trace?.(`RelayerSDKLoader: ${String(propertyName)} is not a ${propertyType}.`);
    return false;
  }

  return true;
}
