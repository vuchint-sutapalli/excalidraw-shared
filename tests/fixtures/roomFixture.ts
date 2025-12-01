import { test as base, expect } from "@playwright/test";

const domain = process.env.DOMAIN ?? "https://slategpt.app";

type Fixtures = {
	roomName: string;
};

// Reusable helpers
async function loginAsGuest(page: any) {
	await page.goto(`${domain}/signin?redirect=%2Fdashboard`);
	await page.getByRole("button", { name: "Continue as Guest" }).click();
	await expect(page).toHaveURL(`${domain}/dashboard`);
}

async function createRoom(page: any, roomName: string) {
	await page.getByTestId("new-room-input").click();
	await page.getByTestId("new-room-input").fill(roomName);
	await page.getByRole("button", { name: "Create Room" }).click();
	await expect(page).toHaveURL(`${domain}/classroom?slug=${roomName}`);
}

async function goBackToDashboard(page: any) {
	// await page.getByRole("link", { name: "VirtualClass" }).click();
	await page.getByTestId("navbar-logo").click();

	await expect(page).toHaveURL(`${domain}/dashboard`);
}

async function deleteRoom(page: any, roomName: string) {
	await page.goto(`${domain}/dashboard`);

	const menuButton = page.getByTestId(`${roomName}-menu-button`);
	await expect(menuButton).toBeVisible({ timeout: 15000 });
	await menuButton.click();

	const roomCard = page.getByTestId(`${roomName}-card`);
	const menuLocator = roomCard.getByTestId(`${roomName}-menu`);
	const deleteButton = menuLocator.getByRole("button", {
		name: "Delete Room",
	});

	await deleteButton.click();

	// Wait for card to disappear (optional but nice)
	await expect(roomCard).toHaveCount(0, { timeout: 8000 });
}

// Extend base test with our room fixture
export const test = base.extend<Fixtures>({
	roomName: async ({ page }, use) => {
		let roomName = `test-room-${Date.now()}`;
		roomName = roomName.slice(-18);

		// Setup: login + create room + be on dashboard
		await test.step("Setup: login and create room", async () => {
			await loginAsGuest(page);
			await createRoom(page, roomName);
			await goBackToDashboard(page);
		});

		// Run the actual test with roomName available
		await use(roomName);

		// Teardown: delete room (best-effort)
		await test.step("Teardown: delete created room", async () => {
			try {
				await deleteRoom(page, roomName);
			} catch (err) {
				console.warn(`⚠️ Failed to delete room ${roomName}:`, err);
			}
		});
	},
});

// export const expect = test.expect;
