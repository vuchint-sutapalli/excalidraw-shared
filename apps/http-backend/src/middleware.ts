
import { Request, Response, NextFunction } from "express";

import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

// import { JWT_SECRET } from "../../../packages/backend-common/config.js";
// Example middleware that logs the request method and URL  
export function middleware(req: Request, res: Response, next: NextFunction) {

    const token = req.headers['authorization'] ?.split(' ')[1]; // Expecting "Bearer <token>"
    if (!token) {
        return res.status(401).json({message: "No token provided" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(decoded);

    if (decoded) {
        //@ts-ignore TODO fix this properly later
        //add global.d.ts file to fix this properly
        req.userId = decoded.userId;
    } else {
        res.status(403).json({message: "Unauthorized" });
    }
    console.log("Request received in middleware at:", new Date().toISOString());
    next();
}