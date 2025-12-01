import { test } from "./fixtures/roomFixture"; // adjust path
import { expect } from "@playwright/test";
const domain = process.env.DOMAIN ?? "https://slategpt.app";

async function toggleStarAndAssert(
	page: any,
	roomName: string,
	targetLabel: "Star room" | "Unstar room"
) {
	const roomCard = page.getByTestId(`${roomName}-card`);
	const starButton = roomCard.getByTestId(`${roomName}-star-button`);

	// Click the button
	await starButton.click();

	// 1) Wait for the label to change in-place (no reload yet)
	await expect(starButton).toHaveAttribute("aria-label", targetLabel);

	// 2) Reload and check it persists
	await page.reload({ waitUntil: "networkidle" });

	const reloadedCard = page.getByTestId(`${roomName}-card`);
	const reloadedStar = reloadedCard.getByTestId(`${roomName}-star-button`);

	await expect(reloadedStar).toHaveAttribute("aria-label", targetLabel);
}

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
	await toggleStarAndAssert(page, roomName, "Unstar room");

	// Unstar
	await toggleStarAndAssert(page, roomName, "Star room");
});
