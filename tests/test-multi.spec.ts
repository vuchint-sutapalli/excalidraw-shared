import { test } from "./fixtures/roomFixture"; // adjust path
import { expect } from "@playwright/test";
const domain = process.env.DOMAIN ?? "https://slategpt.app";

// 1) Room appears on dashboard
test("room card is visible on dashboard after creation", async ({
	page,
	roomName,
}) => {
	const roomCard = page.getByTestId(`${roomName}-card`);
	await expect(roomCard).toBeVisible({ timeout: 15000 });
	await expect(roomCard).toContainText(roomName);
});

// 2) Room can be joined via cool-room-input
test("room can be joined using join input", async ({ page, roomName }) => {
	const joinInput = page.getByTestId("cool-room-input");
	await joinInput.click();
	await joinInput.fill(roomName);

	await page.getByRole("button", { name: "Join Room" }).click();
	await expect(page).toHaveURL(`${domain}/classroom?slug=${roomName}`);
});

// 3) Room can be starred and unstarred from dashboard
test("room can be starred and unstarred from dashboard", async ({
	page,
	roomName,
}) => {
	// We start on dashboard thanks to the fixture
	const roomCard = page.getByTestId(`${roomName}-card`);
	const starButton = roomCard.getByTestId(`${roomName}-star-button`);

	// Initial state: not starred
	await expect(starButton).toHaveAttribute("aria-label", "Star room");

	// Star
	await starButton.click();
	await page.reload();

	const starAfterStar = page
		.getByTestId(`${roomName}-card`)
		.getByTestId(`${roomName}-star-button`);
	await expect(starAfterStar).toHaveAttribute("aria-label", "Unstar room");

	// Unstar
	await starAfterStar.click();
	await page.reload();

	const starAfterUnstar = page
		.getByTestId(`${roomName}-card`)
		.getByTestId(`${roomName}-star-button`);
	await expect(starAfterUnstar).toHaveAttribute("aria-label", "Star room");
});
