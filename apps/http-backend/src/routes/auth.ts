import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {  CreateUserSchema, SignInSchema} from "@repo/common/types";


import { JWT_SECRET } from "@repo/backend-common/config";



const router: express.Router = express.Router();

// Hypothetical User model and DB functions for demonstration.
// Replace this with your actual database logic (e.g., Prisma, TypeORM).
const db = {
    users: [] as any[],
    async findUserByUsername(userName: string) {
        // Perform a case-insensitive search
        return this.users.find(u => u.userName.toLowerCase() === userName.toLowerCase());
    },
    async createUser(user: any) {
        console.log("existing users before create:", this.users);
        
        const newUser = { ...user, id: `user_${Date.now()}` };
        // In a real app, this would be: await User.create(user);
        this.users.push(newUser);
        return newUser;
    }
};


router.post("/signup", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parseResult = CreateUserSchema.safeParse(req.body);
        if (!parseResult.success) {
            // Provide detailed validation errors
            // Use 400 for bad requests and zod's built-in error flattening
            return res.status(400).json({ errors: parseResult.error.flatten().fieldErrors });
        }

        const { userName, password, name } = parseResult.data;

        // Check if user already exists
        const existingUser = await db.findUserByUsername(userName);
        if (existingUser) {
            return res.status(409).json({ message: "User with this username already exists" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Pass all required fields to the createUser function
        const newUser = await db.createUser({ userName: userName.toLowerCase(), name, password: hashedPassword });
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
        const { userName, password } = parseResult.data;

        const user = await db.findUserByUsername(userName);

        const passwordMatch = user ? await bcrypt.compare(password, user.password) : false;

        if (!user || !passwordMatch) { 
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user.id, userName: user.userName }, JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({ message: "User signed in successfully", token });
    }
    catch (error) {
            next(error);
        }
});

export default router;  