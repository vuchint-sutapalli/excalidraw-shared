import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
	await page.goto("https://slategpt.app/signin?redirect=%2Fdashboard");
	await page.getByRole("button", { name: "Continue as Guest" }).click();
	await expect(page).toHaveTitle("Dashboard");
	await page.getByRole("textbox", { name: "Room Name Room Name" }).click();
	await page
		.getByRole("textbox", { name: "Room Name Room Name" })
		.fill("testing");
	await page.getByRole("button", { name: "Create Room" }).click();
	await expect(page).toHaveTitle("Classroom");
	await page.getByRole("link", { name: "VirtualClass" }).click();
	await expect(page).toHaveTitle("Dashboard");
});
