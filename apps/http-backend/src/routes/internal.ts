import express, { Request, Response } from "express";
import { ticketMap } from "../index.js";

const router: express.Router = express.Router();

// This endpoint is called by the ws-backend to validate a ticket
router.get("/validate-ticket/:ticket", (req: Request, res: Response) => {
    const { ticket } = req.params;
    if (!ticket) {
        return res.status(400).json({ message: "Ticket is required" });
    }
    if (ticketMap.has(ticket)) {
        const userId = ticketMap.get(ticket);
        ticketMap.delete(ticket); // Ticket is single-use
        res.json({ userId });
    } else {
        res.status(404).json({ message: "Invalid or expired ticket" });
    }
});

export default router;
