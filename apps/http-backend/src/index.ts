//initialize a simple express server that listens on port 3000
import express from "express";
import authRouter from "./routes/auth.js";
import { middleware } from "./middleware.js";
import dotenv from "dotenv";

dotenv.config();


const app = express();
const port = 3001;

// app.get("/", (req, res) => {
// 	res.send("Hello World!");
// });

//move  sign and signin endpoints to auth router
//how doe a general signup endpoint look like
//POST /signup
//body: {username: string, password: string}
//response: {userId: string, token: string} or {error: string}
app.use(express.json());
app.use("/", authRouter)

//move create-room endpoint to room router


app.post("/room", middleware, (req, res) => {
	//db call to create a room
	res.json({ roomId: "roomId123" });
});



app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`);
});

console.log("Hello from http-backend");