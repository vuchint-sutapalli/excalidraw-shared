//initialize a simple express server that listens on port 3000
import express from "express";
import authRouter from "./routes/auth.js";
import roomRouter from "./routes/room.js";
import chatRouter from "./routes/chats.js";
import shapesRouter from "./routes/shapes.js";
import roomsRouter from "./routes/rooms.js";
import internalRouter from "./routes/internal.js";
import { middleware } from "./middleware.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

export const ticketMap = new Map<string, string>();

const app = express();
const port = 3001;

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
	res.send("Hello World!");
});

app.get("/me", middleware, (req, res) => {
	console.log("sending user details,", req.email);

	res
		.status(200)
		.json({ email: req.email, name: req.name, userId: req.userId });
});

app.use("/auth", authRouter);

//move create-room endpoint to room router
app.use("/room", middleware, roomRouter);

app.use("/chats", middleware, chatRouter);

app.use("/shapes", middleware, shapesRouter);

app.use("/internal", internalRouter);

app.use("/rooms", middleware, roomsRouter);

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`);
});
