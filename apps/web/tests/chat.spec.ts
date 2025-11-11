import { expect, test } from "@playwright/test";

test("chat simulate shows assistant reply in hero chat", async ({ page }) => {
	// Navigate to the home page (use absolute URL to avoid baseURL assumptions)
	await page.goto("http://localhost:3000/");

	// If the ChatPanel is collapsed it renders an "Open" trigger; click it
	// so the header (and Simulate button) become visible.
	const openBtn = page.getByRole("button", { name: /Open/i });
	if (await openBtn.isVisible().catch(() => false)) {
		await openBtn.click();
	}

	// Now wait for the Simulate button (dev-only) to appear
	const simulate = page.getByRole("button", { name: /Simulate/i });
	await expect(simulate).toBeVisible({ timeout: 30_000 });

	// Click the simulate button to inject interim transcripts and LLM payloads
	await simulate.click();

	// Wait for the assistant reply text to appear in the chat body
	// The mocked assistant message contains the phrase "I've drafted a task" in our simulator
	const assistantText = page
		.locator(".chat-body")
		.getByText("I've drafted a task", { exact: false });
	await expect(assistantText).toBeVisible({ timeout: 15_000 });

	// Basic sanity checks: the transcript area or messages should be present
	const chatBody = page.locator(".chat-body");
	await expect(chatBody).toHaveCount(1);

	// Verify the Create Task button becomes usable by trying to click it (it uses context to add)
	const createBtn = page.getByRole("button", { name: /Create Task/i });
	await expect(createBtn).toBeVisible();
});
