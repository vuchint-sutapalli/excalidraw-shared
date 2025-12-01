import { test, expect } from "@playwright/test";

const domain = process.env.DOMAIN ?? "https://slategpt.app";
let roomName = `test-room-${Date.now()}`;
roomName = roomName.slice(-18);

async function loginAsGuest(page: any) {
	await page.goto(`${domain}/signin?redirect=%2Fdashboard`);
	await page.getByRole("button", { name: "Continue as Guest" }).click();
	await expect(page).toHaveURL(`${domain}/dashboard`);
}

async function createRoom(page: any, name: string) {
	await page.getByTestId("new-room-input").click();
	await page.getByTestId("new-room-input").fill(name);
	await page.getByRole("button", { name: "Create Room" }).click();
	await expect(page).toHaveURL(`${domain}/classroom?slug=${name}`);
}

async function goBackToDashboard(page: any) {
	await page.getByRole("link", { name: "VirtualClass" }).click();
	await expect(page).toHaveURL(`${domain}/dashboard`);
}

test("check if room is created properly, can be joined, and is deleted afterwards", async ({
	page,
}) => {
	await loginAsGuest(page);

	try {
		// --------------------
		// CREATE ROOM
		// --------------------
		await test.step("Create a new room", async () => {
			await createRoom(page, roomName);
		});

		// --------------------
		// RETURN TO DASHBOARD
		// --------------------
		await test.step("Return to dashboard and check room card", async () => {
			await goBackToDashboard(page);
			const roomCard = page.getByTestId(`${roomName}-card`);
			await expect(roomCard).toBeVisible({ timeout: 15000 });
		});

		// --------------------
		// JOIN ROOM
		// --------------------
		await test.step("Join room using the join-room input", async () => {
			const joinInput = page.getByTestId("cool-room-input");
			await joinInput.click();
			await joinInput.fill(roomName);
			await page.getByRole("button", { name: "Join Room" }).click();

			await expect(page).toHaveURL(`${domain}/classroom?slug=${roomName}`);
		});

		// --------------------
		// STAR & UNSTAR
		// --------------------
		await test.step("Star and unstar the room", async () => {
			await goBackToDashboard(page);

			const roomCard = page.getByTestId(`${roomName}-card`);
			const starBtn = roomCard.getByTestId(`${roomName}-star-button`);

			// Initially: Star
			await expect(starBtn).toHaveAttribute("aria-label", "Star room");
			await starBtn.click();
			await page.reload();

			const starAfterReload = page
				.getByTestId(`${roomName}-card`)
				.getByTestId(`${roomName}-star-button`);
			await expect(starAfterReload).toHaveAttribute(
				"aria-label",
				"Unstar room"
			);

			// Unstar
			await starAfterReload.click();
			await page.reload();

			const starAfterUnstar = page
				.getByTestId(`${roomName}-card`)
				.getByTestId(`${roomName}-star-button`);
			await expect(starAfterUnstar).toHaveAttribute("aria-label", "Star room");
		});
	} finally {
		// --------------------
		// CLEANUP: DELETE ROOM
		// --------------------
		await test.step("Cleanup: delete the created room", async () => {
			try {
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

				// Optional: wait for deletion animation / card removal
				await expect(roomCard).toHaveCount(0, { timeout: 8000 });
			} catch (err) {
				console.log("⚠️ Cleanup failed (room might not exist):", err);
			}
		});
	}
});
