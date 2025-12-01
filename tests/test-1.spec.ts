import { test, expect } from "@playwright/test";

test.describe("room workflow", () => {
	const domain = "http://localhost:3000";
	// const domain = "https://slategpt.app";
	const roomName = `workflow-${Math.random().toString(36).slice(2, 9)}`;

	test.beforeEach(async ({ page }) => {
		await page.goto(`${domain}/signin?redirect=%2Fdashboard`);
		await page.getByRole("button", { name: "Continue as Guest" }).click();
		await page.getByTestId("new-room-input").click();
		await page.getByTestId("new-room-input").fill(roomName);
		await page.getByRole("button", { name: "Create Room" }).click();
	});

	test.afterEach(async ({ page }) => {
		await page.goto(`${domain}/dashboard`);
		// Use a robust selector to wait for the menu button to be available
		const menuButton = page.getByTestId(`${roomName}-menu-button`);
		await expect(menuButton).toBeVisible({ timeout: 10000 });
		await menuButton.click();

		const roomCard = page.getByTestId(`${roomName}-card`);
		const menuLocator = roomCard.getByTestId(`${roomName}-menu`);
		const deleteButton = menuLocator.getByRole("button", {
			name: "Delete Room",
		});
		await deleteButton.click();
	});

	test("check if room creation worked", async ({ page }) => {
		await page.goto(`${domain}/dashboard`);
		const roomCard = page.getByTestId(`${roomName}-card`);
		await expect(roomCard).toBeVisible({ timeout: 10000 });
	});

	test("check if join room works", async ({ page }) => {
		await page.goto(`${domain}/dashboard`);
		await page.getByTestId("cool-room-input").click();
		await page.getByTestId("cool-room-input").fill(roomName);
		await page.getByRole("button", { name: "Join Room" }).click();
		await expect(page).toHaveTitle("Classroom");
		await expect(page).toHaveURL(`${domain}/classroom?slug=${roomName}`);
		await page.getByRole("link", { name: "VirtualClass" }).click();
		await expect(page).toHaveTitle("Dashboard");
	});

	test("check if starring and unstarring a room works", async ({ page }) => {
		await page.goto(`${domain}/dashboard`);
		const roomCard = page.getByTestId(`${roomName}-card`);
		const starButton = roomCard.getByTestId(`${roomName}-star-button`);
		await expect(starButton).toBeVisible({ timeout: 15000 });
		await expect(starButton).toHaveAttribute("aria-label", "Star room");

		await starButton.click();
		await page.reload();
		await expect(starButton).toHaveAttribute("aria-label", "Unstar room");
		await starButton.click();
		await page.reload();
		await expect(starButton).toHaveAttribute("aria-label", "Star room");
	});
});
