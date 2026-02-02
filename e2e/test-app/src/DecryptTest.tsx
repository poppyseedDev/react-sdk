import { useState } from "react";

/**
 * Component for testing decryption functionality.
 */
export default function DecryptTest() {
  const [handle, setHandle] = useState("");
  const [contractAddress, setContractAddress] = useState("0x1234567890123456789012345678901234567890");
  const [status, setStatus] = useState<"idle" | "signing" | "decrypting" | "success" | "error">("idle");
  const [decryptedValue, setDecryptedValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDecrypt = async () => {
    setStatus("signing");
    setError(null);
    setDecryptedValue(null);

    try {
      // Validate input
      if (!handle) {
        throw new Error("Please enter a handle to decrypt");
      }

      if (!handle.startsWith("0x") || handle.length !== 66) {
        throw new Error("Invalid handle format (expected 0x + 64 hex chars)");
      }

      // Simulate signature request
      await new Promise((resolve) => setTimeout(resolve, 300));
      setStatus("decrypting");

      // Simulate decryption delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate a mock decrypted value
      const mockValue = Math.floor(Math.random() * 1000000).toString();

      setDecryptedValue(mockValue);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decryption failed");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setHandle("");
    setStatus("idle");
    setDecryptedValue(null);
    setError(null);
  };

  const getStatusText = () => {
    switch (status) {
      case "signing":
        return "Requesting signature...";
      case "decrypting":
        return "Decrypting...";
      default:
        return "Decrypt";
    }
  };

  return (
    <div>
      <h2>Decrypt Value</h2>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Encrypted Handle:</label>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="0x..."
            style={{ width: "100%" }}
            data-testid="decrypt-handle"
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Contract Address:</label>
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            style={{ width: "100%" }}
            data-testid="contract-address"
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={handleDecrypt}
          disabled={status === "signing" || status === "decrypting"}
          data-testid="decrypt-button"
        >
          {getStatusText()}
        </button>
        <button onClick={handleReset} data-testid="reset-button">
          Reset
        </button>
      </div>

      <div data-testid="decrypt-status">
        {status === "signing" && (
          <div className="status pending">
            Please sign the decryption request in your wallet...
          </div>
        )}

        {status === "decrypting" && (
          <div className="status pending">
            Decrypting value...
          </div>
        )}

        {status === "success" && decryptedValue !== null && (
          <div className="status success">
            <strong>Decrypted!</strong>
            <p style={{ margin: "10px 0 0" }}>
              Value: <code data-testid="decrypted-value">{decryptedValue}</code>
            </p>
          </div>
        )}

        {status === "error" && error && (
          <div className="status error" data-testid="error-message">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
}
