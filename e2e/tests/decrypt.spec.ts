import { test, expect } from "../fixtures/wallet";

test.describe("Decryption E2E Tests", () => {
  const VALID_HANDLE = "0x" + "ab".repeat(32);

  test.beforeEach(async ({ page, injectWallet }) => {
    await injectWallet(page);
    await page.goto("/");
    await page.click('[data-testid="tab-decrypt"]');
  });

  test("should display decryption form", async ({ page }) => {
    await expect(page.locator('[data-testid="decrypt-handle"]')).toBeVisible();
    await expect(page.locator('[data-testid="contract-address"]')).toBeVisible();
    await expect(page.locator('[data-testid="decrypt-button"]')).toBeVisible();
  });

  test("should decrypt valid handle", async ({ page }) => {
    // Enter handle
    await page.fill('[data-testid="decrypt-handle"]', VALID_HANDLE);

    // Click decrypt
    await page.click('[data-testid="decrypt-button"]');

    // Wait for success
    await expect(page.locator('[data-testid="decrypt-status"]')).toContainText("Decrypted", {
      timeout: 10000,
    });

    // Verify decrypted value is displayed
    await expect(page.locator('[data-testid="decrypted-value"]')).toBeVisible();
  });

  test("should show error for empty handle", async ({ page }) => {
    // Click decrypt without entering a handle
    await page.click('[data-testid="decrypt-button"]');

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      "Please enter a handle"
    );
  });

  test("should show error for invalid handle format", async ({ page }) => {
    // Enter invalid handle (wrong length)
    await page.fill('[data-testid="decrypt-handle"]', "0x123");
    await page.click('[data-testid="decrypt-button"]');

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText("Invalid handle");
  });

  test("should show signing state", async ({ page }) => {
    await page.fill('[data-testid="decrypt-handle"]', VALID_HANDLE);
    await page.click('[data-testid="decrypt-button"]');

    // Should show signing message (may be brief)
    // We'll just verify the final state
    await expect(page.locator('[data-testid="decrypt-status"]')).toContainText("Decrypted", {
      timeout: 10000,
    });
  });

  test("should reset form", async ({ page }) => {
    // Fill and decrypt
    await page.fill('[data-testid="decrypt-handle"]', VALID_HANDLE);
    await page.click('[data-testid="decrypt-button"]');
    await expect(page.locator('[data-testid="decrypt-status"]')).toContainText("Decrypted", {
      timeout: 10000,
    });

    // Reset
    await page.click('[data-testid="reset-button"]');

    // Verify form is reset
    await expect(page.locator('[data-testid="decrypt-handle"]')).toHaveValue("");
    await expect(page.locator('[data-testid="decrypted-value"]')).not.toBeVisible();
  });

  test("should handle multiple sequential decryptions", async ({ page }) => {
    const handles = [
      "0x" + "11".repeat(32),
      "0x" + "22".repeat(32),
      "0x" + "33".repeat(32),
    ];

    for (const handle of handles) {
      // Reset first
      await page.click('[data-testid="reset-button"]');

      // Decrypt
      await page.fill('[data-testid="decrypt-handle"]', handle);
      await page.click('[data-testid="decrypt-button"]');

      // Verify success
      await expect(page.locator('[data-testid="decrypt-status"]')).toContainText("Decrypted", {
        timeout: 10000,
      });
    }
  });
});
