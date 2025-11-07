import express, { Request, Response, NextFunction } from "express";
import { CreateRoomSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db/client";
import crypto from "crypto";
import { ticketMap } from "../index.js";

const router: express.Router = express.Router();

// Helper function to generate a URL-friendly slug
const generateSlug = (name: string): string => {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-") // Replace spaces with -
		.replace(/[^\w-]+/g, "") // Remove all non-word chars except hyphen
		.replace(/--+/g, "-"); // Replace multiple - with single -
};

router.post("/ticket", (req: Request, res: Response) => {
	const userId = req.userId;
	const ticket = crypto.randomBytes(16).toString("hex");

	// Store the ticket with the user ID
	// This is an in-memory store, for production, use Redis or a similar store.
	ticketMap.set(ticket, userId);

	// Tickets expire after 10 seconds for security
	setTimeout(() => {
		ticketMap.delete(ticket);
	}, 10000);

	res.json({ ticket });
});

//create an put api to update room properties like isStarred ,description,tags . accept an object as body
router.put("/edit/:slug", async (req: Request, res: Response) => {
	const slug = req.params.slug;
	if (!slug) {
		return res.status(400).json({ message: "Slug is required" });
	}
	const { isStarred, description, tags } = req.body;

	const dataToUpdate: {
		isStarred?: boolean;
		description?: string;
		tags?: string[];
	} = {};

	if (typeof isStarred === "boolean") {
		dataToUpdate.isStarred = isStarred;
	}
	if (typeof description === "string") {
		dataToUpdate.description = description;
	}
	if (Array.isArray(tags)) {
		dataToUpdate.tags = tags;
	}

	try {
		const updatedRoom = await prismaClient.room.update({
			where: {
				slug: slug,
			},
			data: dataToUpdate,
		});

		res.json({ room: updatedRoom });
	} catch (error) {
		console.error("Error updating room:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/:slug", async (req: Request, res: Response) => {
	console.log("Getting room with slug:", req.params.slug);
	const userId = req.userId; // from auth middleware

	const slug = req.params.slug;
	if (!slug) {
		return res.status(400).json({ message: "Slug is required" });
	}

	// Step 1: Find the room by its slug
	let room = await prismaClient.room.findUnique({
		where: { slug: slug },
		include: { members: true }, // Include members to check if user is already part of it
	});

	if (!room) {
		return res.status(404).json({ room: null, message: "Room not found" });
	}

	// Step 2: Check if the user is already a member
	const isMember = room.members.some((member) => member.id === userId);

	// Step 3: If the user is not a member, add them.
	// This implements a "public join" model. For private rooms, you would check an invitation system here.
	if (!isMember) {
		console.log(`User ${userId} is not a member. Adding to room ${slug}.`);
		room = await prismaClient.room.update({
			where: { slug: slug },
			data: {
				members: {
					connect: { id: userId },
				},
			},
			include: { members: true }, // Re-include members to return the updated list
		});
	} else {
		console.log(`User ${userId} is already a member of room ${slug}.`);
	}

	res.json({ room, userId: userId });
});

router.delete("/:slug/leave", async (req: Request, res: Response) => {
	const slug = req.params.slug;
	const userId = req.userId;

	if (!slug) {
		return res.status(400).json({ message: "Slug is required" });
	}

	try {
		await prismaClient.room.update({
			where: { slug: slug },
			data: {
				members: {
					// Use 'disconnect' to remove the user from the many-to-many relation
					disconnect: { id: userId },
				},
			},
		});

		res.status(200).json({ message: "Successfully left the room." });
	} catch (error) {
		console.error("Error leaving room:", error);
		// This could fail if the room doesn't exist, which is a valid case to handle.
		res.status(500).json({ message: "Could not leave the room." });
	}
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
	try {
		const parseResult = CreateRoomSchema.safeParse(req.body);
		if (!parseResult.success) {
			return res
				.status(400)
				.json({ errors: parseResult.error.flatten().fieldErrors });
		}

		// userId is attached by the auth middleware and is now type-safe
		const userId = req.userId;
		const { name } = parseResult.data;

		const slug = generateSlug(name);

		if (!slug) {
			return res
				.status(400)
				.json({ message: "Invalid room name, results in an empty slug." });
		}

		const newRoom = await prismaClient.room.create({
			data: {
				slug: slug,
				adminId: userId,
				// Automatically connect the creator as a member of the room
				members: {
					connect: { id: userId },
				},
			},
		});

		return res.status(201).json({ roomId: newRoom.id, slug: newRoom.slug });
	} catch (error) {
		return res
			.status(409)
			.json({ message: "A room with this name already exists." });
	}
});

export default router;
