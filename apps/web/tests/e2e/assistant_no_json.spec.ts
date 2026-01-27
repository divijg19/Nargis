import { expect, test } from "@playwright/test";

test("assistant message contains no JSON-like substrings", async ({ page }) => {
  await page.goto("/");

  // Try clicking a visible 'Simulate' button; otherwise call the dev helper.
  const simulateBtn = page.getByRole("button", { name: /Simulate/i });
  if ((await simulateBtn.count()) > 0) {
    await simulateBtn.click();
  } else {
    await page.evaluate(() => {
      window.__nargis_simulate?.();
    });
  }

  const assistantLocator = page
    .locator(".message--assistant .message__body")
    .last();

  await expect(assistantLocator).toBeVisible({ timeout: 15000 });
  const text = await assistantLocator.innerText();

  // Assertions: no JSON punctuation or explicit 'choices' key
  expect(text).not.toContain("{");
  expect(text).not.toContain('"choices"');
  expect(text).not.toMatch(/[{}[\]"]/);
});
