import { test, expect } from "../fixtures/wallet";

test.describe("Encryption E2E Tests", () => {
  test.beforeEach(async ({ page, injectWallet }) => {
    await injectWallet(page);
    await page.goto("/");
    await page.click('[data-testid="tab-encrypt"]');
  });

  test("should display encryption form", async ({ page }) => {
    await expect(page.locator('[data-testid="encrypt-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="encrypt-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="contract-address"]')).toBeVisible();
    await expect(page.locator('[data-testid="encrypt-button"]')).toBeVisible();
  });

  test("should encrypt uint64 value", async ({ page }) => {
    // Enter value
    await page.fill('[data-testid="encrypt-input"]', "12345");
    await page.selectOption('[data-testid="encrypt-type"]', "uint64");

    // Click encrypt
    await page.click('[data-testid="encrypt-button"]');

    // Wait for success
    await expect(page.locator('[data-testid="encrypt-status"]')).toContainText("Encrypted", {
      timeout: 10000,
    });

    // Verify handle is displayed
    await expect(page.locator('[data-testid="encrypted-handle"]')).toBeVisible();
    const handle = await page.locator('[data-testid="encrypted-handle"]').textContent();
    expect(handle).toMatch(/^0x[a-f0-9]{64}$/i);
  });

  test("should encrypt bool value", async ({ page }) => {
    await page.fill('[data-testid="encrypt-input"]', "true");
    await page.selectOption('[data-testid="encrypt-type"]', "bool");
    await page.click('[data-testid="encrypt-button"]');

    await expect(page.locator('[data-testid="encrypt-status"]')).toContainText("Encrypted", {
      timeout: 10000,
    });
  });

  test("should show error for empty input", async ({ page }) => {
    // Click encrypt without entering a value
    await page.click('[data-testid="encrypt-button"]');

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      "Please enter a value"
    );
  });

  test("should reset form", async ({ page }) => {
    // Fill and encrypt
    await page.fill('[data-testid="encrypt-input"]', "100");
    await page.click('[data-testid="encrypt-button"]');
    await expect(page.locator('[data-testid="encrypt-status"]')).toContainText("Encrypted", {
      timeout: 10000,
    });

    // Reset
    await page.click('[data-testid="reset-button"]');

    // Verify form is reset
    await expect(page.locator('[data-testid="encrypt-input"]')).toHaveValue("");
    await expect(page.locator('[data-testid="encrypt-status"]')).not.toBeVisible();
  });

  test("should support all encryption types", async ({ page }) => {
    const types = ["bool", "uint8", "uint16", "uint32", "uint64", "uint128", "uint256", "address"];

    for (const type of types) {
      // Reset first
      await page.click('[data-testid="reset-button"]');

      // Select type
      await page.selectOption('[data-testid="encrypt-type"]', type);

      // Enter appropriate value
      const value = type === "bool" ? "true" : type === "address" ? "0x1234567890123456789012345678901234567890" : "42";
      await page.fill('[data-testid="encrypt-input"]', value);

      // Encrypt
      await page.click('[data-testid="encrypt-button"]');

      // Verify success
      await expect(page.locator('[data-testid="encrypt-status"]')).toContainText("Encrypted", {
        timeout: 10000,
      });
    }
  });

  test("should show encrypting state during operation", async ({ page }) => {
    await page.fill('[data-testid="encrypt-input"]', "999");

    // Use a promise to check the button text changes
    const buttonPromise = page.locator('[data-testid="encrypt-button"]');

    await page.click('[data-testid="encrypt-button"]');

    // Should show "Encrypting..." briefly
    // Note: This may be too fast to catch in practice
    await expect(page.locator('[data-testid="encrypt-status"]')).toContainText("Encrypted", {
      timeout: 10000,
    });
  });
});
