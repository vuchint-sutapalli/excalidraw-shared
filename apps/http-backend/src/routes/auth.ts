import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {  CreateUserSchema, SignInSchema} from "@repo/common/types";


import { JWT_SECRET } from "@repo/backend-common/config";

// import { prismaClient } from "@repo/db";


import { prismaClient } from "@repo/db/client";


const router: express.Router = express.Router();


router.post("/signup", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parseResult = CreateUserSchema.safeParse(req.body);
        if (!parseResult.success) {
            // Provide detailed validation errors
            // Use 400 for bad requests and zod's built-in error flattening
            return res.status(400).json({ errors: parseResult.error.flatten().fieldErrors });
        }

        const { email, password, name } = parseResult.data;
        // const lowerCaseUserName = userName.toLowerCase();

        // Check if user already exists
        const existingUser = await prismaClient.user.findUnique({
            where: { email: email },
        });
        if (existingUser) {
            return res.status(409).json({ message: "User with this email already exists" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create user in the database
        const newUser = await prismaClient.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                photo: ""
            },
        });

        
        console.log("New user created:", newUser);
        

        res.status(201).json({
            message: "User created successfully",
            userId: newUser.id,
        });
    } catch (error) {
        console.log("Error in /signup:", error);
        
        next(error); // Pass errors to the global error handler
    }
});

router.post("/signin", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parseResult = SignInSchema.safeParse(req.body);

        
        if (!parseResult.success) {
            // Provide detailed validation errors
            // Use 400 for bad requests and zod's built-in error flattening
            return res.status(400).json({ errors: parseResult.error.flatten().fieldErrors });
        }
        const { email, password } = parseResult.data;

        const user = await prismaClient.user.findUnique({
            where: { email: email },
        });
        
        const passwordMatch = user ? await bcrypt.compare(password, user.password) : false;

        if (!user || !passwordMatch) { 
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({ message: "User signed in successfully", token });
    }
    catch (error) {
            next(error);
        }
});

export default router;  