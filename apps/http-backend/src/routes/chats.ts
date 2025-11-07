import { prismaClient } from "@repo/db/client";
import express  from "express";

const router: express.Router = express.Router();

// Example route
router.get("/:roomId", async(req, res) => {
	try {
		
		let roomId = Number(req.params.roomId);
		
		if(!roomId) {
			return res.status(400).send("Room ID is required");
		}

		const messages = await prismaClient.chat.findMany({
			where: {
				roomId: roomId,
			},
			orderBy: {
				id: "desc",
			},
			take: 50,
		});

		console.log("Messages for room", roomId, messages);

		res.json({ messages });
	} catch (error) {
		console.log("Error in /chats/:roomId:", error);
		res.json({messages: []});
	}
});



export default router;
