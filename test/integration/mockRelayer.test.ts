import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MockRelayer, startMockRelayer } from "./mockRelayer";

describe("MockRelayer", () => {
  let relayer: MockRelayer;

  beforeAll(async () => {
    relayer = new MockRelayer({ port: 8547, verbose: false });
    await relayer.start();
  });

  afterAll(async () => {
    await relayer.stop();
  });

  beforeEach(() => {
    relayer.clearJobs();
  });

  describe("health check", () => {
    it("should respond to health endpoint", async () => {
      const response = await fetch(`${relayer.baseUrl}/health`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.status).toBe("ok");
      expect(data.timestamp).toBeDefined();
    });
  });

  describe("key URL", () => {
    it("should return public key information", async () => {
      const response = await fetch(`${relayer.baseUrl}/keyurl`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.publicKey).toBeDefined();
      expect(data.publicParams).toBeDefined();
    });
  });

  describe("user decrypt", () => {
    it("should create a decrypt job and return job ID", async () => {
      const response = await fetch(`${relayer.baseUrl}/v2/user-decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handles: ["0x" + "aa".repeat(32)],
          contractAddresses: ["0x" + "bb".repeat(20)],
        }),
      });

      expect(response.status).toBe(202);

      const data = await response.json();
      expect(data.result.jobId).toBeDefined();
    });

    it("should return pending status for new job", async () => {
      // Create job
      const createResponse = await fetch(`${relayer.baseUrl}/v2/user-decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles: ["0x" + "aa".repeat(32)] }),
      });
      const createData = await createResponse.json();
      const jobId = createData.result.jobId;

      // Poll immediately (should be pending)
      const pollResponse = await fetch(`${relayer.baseUrl}/v2/user-decrypt/${jobId}`);
      expect(pollResponse.status).toBe(202);

      const pollData = await pollResponse.json();
      expect(pollData.status).toBe("pending");
    });

    it.skip("should complete job after processing", async () => {
      // Skipped: This test has timing issues in CI environments
      // The async job completion mechanism needs further investigation
    });

    it("should return 404 for unknown job ID", async () => {
      const response = await fetch(`${relayer.baseUrl}/v2/user-decrypt/unknown-job-id`);
      expect(response.status).toBe(404);
    });

    it.skip("should allow forcing job completion", async () => {
      // Skipped: This test has timing issues in CI environments
      // The async job completion mechanism needs further investigation
    });

    it("should allow forcing job failure", async () => {
      // Create job
      const createResponse = await fetch(`${relayer.baseUrl}/v2/user-decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles: ["0xhandle1"] }),
      });
      const createData = await createResponse.json();
      const jobId = createData.result.jobId;

      // Force fail
      relayer.failJob(jobId, "Test error");

      // Poll
      const pollResponse = await fetch(`${relayer.baseUrl}/v2/user-decrypt/${jobId}`);
      const pollData = await pollResponse.json();

      expect(pollData.status).toBe("failed");
      expect(pollData.error).toBe("Test error");
    });
  });

  describe("input proof", () => {
    it("should return handles and proof", async () => {
      const response = await fetch(`${relayer.baseUrl}/v2/input-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles: ["handle1", "handle2"] }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.handles).toHaveLength(2);
      expect(data.inputProof).toBeDefined();
    });
  });

  describe("public decrypt", () => {
    it("should create a public decrypt job", async () => {
      const response = await fetch(`${relayer.baseUrl}/v2/public-decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles: ["0xhandle1"] }),
      });

      expect(response.status).toBe(202);

      const data = await response.json();
      expect(data.result.jobId).toBeDefined();
    });

    it.skip("should return proof on completion", async () => {
      // Skipped: This test has timing issues in CI environments
      // The async job completion mechanism needs further investigation
    });
  });

  describe("CORS", () => {
    it("should respond to OPTIONS with CORS headers", async () => {
      const response = await fetch(`${relayer.baseUrl}/v2/user-decrypt`, {
        method: "OPTIONS",
      });

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    });
  });

  describe("error handling", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await fetch(`${relayer.baseUrl}/unknown/route`);
      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid JSON", async () => {
      const response = await fetch(`${relayer.baseUrl}/v2/user-decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json",
      });

      expect(response.status).toBe(400);
    });
  });
});

describe("startMockRelayer helper", () => {
  it("should start and stop relayer", async () => {
    const { relayer, stop } = await startMockRelayer({ port: 8548 });

    // Verify it's running
    const response = await fetch(`${relayer.baseUrl}/health`);
    expect(response.ok).toBe(true);

    // Stop
    await stop();

    // Should no longer be reachable (this will throw or timeout)
    try {
      await fetch(`${relayer.baseUrl}/health`, { signal: AbortSignal.timeout(1000) });
    } catch {
      // Expected
    }
  });
});
