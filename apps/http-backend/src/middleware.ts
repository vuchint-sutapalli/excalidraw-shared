import { Request, Response, NextFunction } from "express";

import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

// Example middleware that logs the request method and URL
export function middleware(req: Request, res: Response, next: NextFunction) {
	// Read the token from the httpOnly cookie named 'authToken'
	const token = req.cookies.authToken;

	if (!token) {
		return res
			.status(401)
			.json({ message: "No token provided, authorization denied" });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);

		if (typeof decoded === "object" && decoded.userId) {
			console.log("Token is authenticated");

			//add user metaData to req params for apis to use

			req.userId = decoded.userId;
			req.email = decoded.email;
			req.name = decoded.name;
			next();
		} else {
			return res.status(403).json({ message: "Token is invalid or malformed" });
		}
	} catch (error) {
		console.error("JWT verification error:", error);
		return res
			.status(401)
			.json({ message: "Unauthorized: Invalid or expired token" });
	}
}
