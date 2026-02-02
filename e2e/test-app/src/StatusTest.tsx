import { useState, useEffect } from "react";

/**
 * Component for testing SDK status and initialization.
 */
export default function StatusTest() {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    setStatus("connecting");
    setError(null);

    try {
      // Check if window.ethereum exists (injected by test or MetaMask)
      if (typeof window === "undefined" || !(window as any).ethereum) {
        throw new Error("No ethereum provider found");
      }

      const ethereum = (window as any).ethereum;

      // Request accounts
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned");
      }

      // Get chain ID
      const chainIdHex = await ethereum.request({ method: "eth_chainId" });
      const parsedChainId = parseInt(chainIdHex, 16);

      setWalletAddress(accounts[0]);
      setChainId(parsedChainId);
      setStatus("connected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setChainId(null);
    setStatus("idle");
    setError(null);
  };

  return (
    <div>
      <h2>Wallet Status</h2>

      <div style={{ marginBottom: "20px" }}>
        <p data-testid="wallet-status">
          Status: <strong>{status}</strong>
        </p>

        {walletAddress && (
          <p data-testid="wallet-address">
            Address: <code>{walletAddress}</code>
          </p>
        )}

        {chainId && (
          <p data-testid="chain-id">
            Chain ID: <code>{chainId}</code>
          </p>
        )}

        {error && (
          <div className="status error" data-testid="error-message">
            Error: {error}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        {status !== "connected" ? (
          <button
            onClick={connectWallet}
            disabled={status === "connecting"}
            data-testid="connect-wallet"
          >
            {status === "connecting" ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <button onClick={disconnectWallet} data-testid="disconnect-wallet">
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
