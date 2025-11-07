import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { CreateUserSchema, SignInSchema } from "@repo/common/types";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";

const router: express.Router = express.Router();

router.post(
	"/signup",
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const parseResult = CreateUserSchema.safeParse(req.body);
			if (!parseResult.success) {
				// Provide detailed validation errors
				// Use 400 for bad requests and zod's built-in error flattening
				return res
					.status(400)
					.json({ errors: parseResult.error.flatten().fieldErrors });
			}

			const { email, password, name } = parseResult.data;

			// Check if user already exists
			const existingUser = await prismaClient.user.findUnique({
				where: { email: email },
			});
			if (existingUser) {
				return res
					.status(409)
					.json({ message: "User with this email already exists" });
			}

			const saltRounds = 10;
			const hashedPassword = await bcrypt.hash(password, saltRounds);

			// Create user in the database
			const newUser = await prismaClient.user.create({
				data: {
					email,
					password: hashedPassword,
					name,
				},
			});

			res.status(201).json({
				message: "User created successfully",
				userId: newUser.id,
			});
		} catch (error) {
			console.log("Error in /signup:", error);

			next(error); // Pass errors to the global error handler
		}
	}
);

router.post(
	"/signin",
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const parseResult = SignInSchema.safeParse(req.body);

			if (!parseResult.success) {
				// Provide detailed validation errors
				return res
					.status(400)
					.json({ errors: parseResult.error.flatten().fieldErrors });
			}
			const { email, password } = parseResult.data;

			const user = await prismaClient.user.findUnique({
				where: { email: email },
			});

			const passwordMatch = user
				? await bcrypt.compare(password, user.password)
				: false;

			if (!user || !passwordMatch) {
				return res.status(401).json({ error: "Invalid credentials" });
			}

			const token = jwt.sign(
				{ userId: user.id, email: user.email, name: user.name },
				JWT_SECRET,
				{ expiresIn: "1d" }
			);

			// Set the token in an httpOnly cookie for security
			res.cookie("authToken", token, {
				httpOnly: true, // The cookie is not accessible via client-side JavaScript
				secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
				sameSite: "strict", // Helps mitigate CSRF attacks
				maxAge: 24 * 60 * 60 * 1000, // 1 day, should match JWT expiry
				path: "/",
			});

			// Send a success response without the token in the body.
			// It's good practice to return some user info.
			res.status(200).json({
				message: "User signed in successfully",
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
				},
			});
		} catch (error) {
			next(error);
		}
	}
);

router.post("/signout", (_req: Request, res: Response) => {
	// Clear the httpOnly cookie to sign the user out.
	// The options must match the ones used when setting the cookie.
	res.clearCookie("authToken", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		path: "/",
	});
	res.status(200).json({ message: "User signed out successfully" });
});

export default router;
