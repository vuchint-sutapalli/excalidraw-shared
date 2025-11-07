import { prismaClient } from "@repo/db/client";
import express from "express";

const router: express.Router = express.Router();

router.get("/:roomId", async (req, res) => {
	try {
		let roomId = Number(req.params.roomId);

		if (!roomId) {
			return res.status(400).send("Room ID is required");
		}
		const shapes = await prismaClient.element.findMany({
			where: {
				roomId: roomId,
			},
			orderBy: {
				id: "desc",
			},
			take: 50,
		});

		console.log("Shapes for room", roomId, shapes);

		res.json({ shapes });
	} catch (error) {
		console.log("Error in /shapes/:roomId:", error);
		res.json({ shapes: [] });
	}
});

export default router;
