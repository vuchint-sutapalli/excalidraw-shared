import { test, expect } from "@playwright/test";

test.describe("room workflow", () => {
	// const domain = "http://localhost:3000";
	const domain = "https://slategpt.app";

	test.beforeEach(async ({ page }) => {
		await page.goto(`${domain}/signin?redirect=%2Fdashboard`);
		await page.getByRole("button", { name: "Continue as Guest" }).click();
		await page.getByTestId("new-room-input").click();
		await page.getByTestId("new-room-input").fill("test-workflow");
		await page.getByRole("button", { name: "Create Room" }).click();
	});

	test.afterEach(async ({ page }) => {
		await page.goto(`${domain}/dashboard`);
		await page.getByTestId("test-workflow-menu-button").click();
		const roomCard = page.getByTestId("test-workflow-card");
		const menuLocator = roomCard.getByTestId("test-workflow-menu");
		const deleteButton = menuLocator.getByRole("button", {
			name: "Delete Room",
		});
		await deleteButton.click();
	});
	test("check if room creation worked", async ({ page }) => {
		await page.goto(`${domain}/dashboard`);
		const roomCard = page.getByTestId("test-workflow-card");
		await expect(roomCard).toBeVisible();
	});

	test("check if join room works", async ({ page }) => {
		await page.getByTestId("cool-room-input").click();
		await page.getByTestId("cool-room-input").fill("test-workflow");
		await page.getByRole("button", { name: "Join Room" }).click();
		await expect(page).toHaveTitle("Classroom");
		await expect(page).toHaveURL(`${domain}/classroom?slug=test-workflow`);
		await page.getByRole("link", { name: "VirtualClass" }).click();
		await expect(page).toHaveTitle("Dashboard");
	});

	test("check if starring and unstarring a room works", async ({ page }) => {
		await page.goto(`${domain}/dashboard`);
		const starButton = page.getByTestId("test-workflow-star-button");
		await expect(starButton).toBeVisible();
		await expect(starButton).toHaveAttribute("aria-label", "Star room");

		await starButton.click();
		await page.reload();
		await expect(starButton).toHaveAttribute("aria-label", "Unstar room");
		await starButton.click();
		await page.reload();
		await expect(starButton).toHaveAttribute("aria-label", "Star room");
	});
});
