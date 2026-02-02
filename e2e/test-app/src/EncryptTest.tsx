import { useState } from "react";

type EncryptType = "bool" | "uint8" | "uint16" | "uint32" | "uint64" | "uint128" | "uint256" | "address";

/**
 * Component for testing encryption functionality.
 */
export default function EncryptTest() {
  const [inputValue, setInputValue] = useState("");
  const [encryptType, setEncryptType] = useState<EncryptType>("uint64");
  const [contractAddress, setContractAddress] = useState("0x1234567890123456789012345678901234567890");
  const [status, setStatus] = useState<"idle" | "encrypting" | "success" | "error">("idle");
  const [encryptedHandle, setEncryptedHandle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEncrypt = async () => {
    setStatus("encrypting");
    setError(null);
    setEncryptedHandle(null);

    try {
      // Validate input
      if (!inputValue) {
        throw new Error("Please enter a value to encrypt");
      }

      // For testing, we'll simulate encryption
      // In real E2E tests with a running chain, this would use the actual SDK
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate a mock handle
      const mockHandle = "0x" + Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("");

      setEncryptedHandle(mockHandle);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Encryption failed");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setInputValue("");
    setStatus("idle");
    setEncryptedHandle(null);
    setError(null);
  };

  return (
    <div>
      <h2>Encrypt Value</h2>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Value to encrypt:</label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={encryptType === "bool" ? "true or false" : "Enter a number"}
            style={{ width: "100%" }}
            data-testid="encrypt-input"
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Type:</label>
          <select
            value={encryptType}
            onChange={(e) => setEncryptType(e.target.value as EncryptType)}
            style={{ width: "100%" }}
            data-testid="encrypt-type"
          >
            <option value="bool">bool</option>
            <option value="uint8">uint8</option>
            <option value="uint16">uint16</option>
            <option value="uint32">uint32</option>
            <option value="uint64">uint64</option>
            <option value="uint128">uint128</option>
            <option value="uint256">uint256</option>
            <option value="address">address</option>
          </select>
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
          onClick={handleEncrypt}
          disabled={status === "encrypting"}
          data-testid="encrypt-button"
        >
          {status === "encrypting" ? "Encrypting..." : "Encrypt"}
        </button>
        <button onClick={handleReset} data-testid="reset-button">
          Reset
        </button>
      </div>

      {status === "success" && encryptedHandle && (
        <div className="status success" data-testid="encrypt-status">
          <strong>Encrypted!</strong>
          <p style={{ wordBreak: "break-all", margin: "10px 0 0" }}>
            Handle: <code data-testid="encrypted-handle">{encryptedHandle}</code>
          </p>
        </div>
      )}

      {status === "error" && error && (
        <div className="status error" data-testid="error-message">
          Error: {error}
        </div>
      )}
    </div>
  );
}
