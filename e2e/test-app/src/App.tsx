import { useState } from "react";
import EncryptTest from "./EncryptTest";
import DecryptTest from "./DecryptTest";
import StatusTest from "./StatusTest";

type Tab = "status" | "encrypt" | "decrypt";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("status");

  return (
    <div className="container">
      <h1>FHEVM SDK E2E Test App</h1>

      <div className="card">
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button
            onClick={() => setActiveTab("status")}
            style={{
              background: activeTab === "status" ? "#4f46e5" : "#e5e7eb",
              color: activeTab === "status" ? "white" : "black",
            }}
            data-testid="tab-status"
          >
            Status
          </button>
          <button
            onClick={() => setActiveTab("encrypt")}
            style={{
              background: activeTab === "encrypt" ? "#4f46e5" : "#e5e7eb",
              color: activeTab === "encrypt" ? "white" : "black",
            }}
            data-testid="tab-encrypt"
          >
            Encrypt
          </button>
          <button
            onClick={() => setActiveTab("decrypt")}
            style={{
              background: activeTab === "decrypt" ? "#4f46e5" : "#e5e7eb",
              color: activeTab === "decrypt" ? "white" : "black",
            }}
            data-testid="tab-decrypt"
          >
            Decrypt
          </button>
        </div>

        {activeTab === "status" && <StatusTest />}
        {activeTab === "encrypt" && <EncryptTest />}
        {activeTab === "decrypt" && <DecryptTest />}
      </div>
    </div>
  );
}
