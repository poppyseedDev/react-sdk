import { test, expect, TEST_ACCOUNTS } from "../fixtures/wallet";

test.describe("Wallet Status E2E Tests", () => {
  test("should display idle status initially without injected wallet", async ({ page }) => {
    // Don't inject wallet
    await page.goto("/");

    await expect(page.locator('[data-testid="wallet-status"]')).toContainText("idle");
    await expect(page.locator('[data-testid="connect-wallet"]')).toBeVisible();
  });

  test("should connect wallet successfully", async ({ page, injectWallet }) => {
    await injectWallet(page);
    await page.goto("/");

    // Click connect
    await page.click('[data-testid="connect-wallet"]');

    // Wait for connection
    await expect(page.locator('[data-testid="wallet-status"]')).toContainText("connected", {
      timeout: 10000,
    });

    // Verify address is displayed (case-insensitive check)
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-address"]')).toContainText(
      new RegExp(TEST_ACCOUNTS.user1.address.slice(0, 10), "i")
    );

    // Verify chain ID
    await expect(page.locator('[data-testid="chain-id"]')).toContainText("31337");
  });

  test("should disconnect wallet", async ({ page, injectWallet, waitForConnection }) => {
    await injectWallet(page);
    await page.goto("/");
    await page.click('[data-testid="connect-wallet"]');
    await waitForConnection(page);

    // Disconnect
    await page.click('[data-testid="disconnect-wallet"]');

    // Verify disconnected state
    await expect(page.locator('[data-testid="wallet-status"]')).toContainText("idle");
    await expect(page.locator('[data-testid="wallet-address"]')).not.toBeVisible();
  });

  test("should show error when no ethereum provider", async ({ page }) => {
    // Don't inject wallet - no ethereum provider
    await page.goto("/");

    // Try to connect
    await page.click('[data-testid="connect-wallet"]');

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      "No ethereum provider"
    );
    await expect(page.locator('[data-testid="wallet-status"]')).toContainText("error");
  });

  test("should connect with different chain ID", async ({ page, injectWallet }) => {
    // Inject wallet with Sepolia chain ID
    await injectWallet(page, { chainId: 11155111 });
    await page.goto("/");

    await page.click('[data-testid="connect-wallet"]');

    await expect(page.locator('[data-testid="wallet-status"]')).toContainText("connected", {
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="chain-id"]')).toContainText("11155111");
  });

  test("should connect with different account", async ({ page, injectWallet }) => {
    // Inject wallet with second test account
    await injectWallet(page, { account: TEST_ACCOUNTS.user2 });
    await page.goto("/");

    await page.click('[data-testid="connect-wallet"]');

    await expect(page.locator('[data-testid="wallet-status"]')).toContainText("connected", {
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="wallet-address"]')).toContainText(
      new RegExp(TEST_ACCOUNTS.user2.address.slice(0, 10), "i")
    );
  });
});
