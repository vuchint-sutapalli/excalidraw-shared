import { prismaClient } from "@repo/db/client";
import express from "express";

const router: express.Router = express.Router();

router.get("/", async (req, res) => {
	try {
		const userId = req.userId;
		const rooms = await prismaClient.room.findMany({
			where: {
				adminId: userId,
			},
			orderBy: {
				id: "desc",
			},
			take: 50,
		});

		res.json({ rooms });
	} catch (error) {
		console.log("Error in fetching rooms", error);
		res.json({ rooms: [] });
	}
});

export default router;
