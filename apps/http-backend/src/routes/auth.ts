//move signup and signin endpoints to here from index.ts
import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";
import { JWT_SECRET } from "../config.js";

const router: express.Router = express.Router();

// Hypothetical User model and DB functions for demonstration.
// Replace this with your actual database logic (e.g., Prisma, TypeORM).
const db = {
    users: [] as any[],
    async findUserByUsername(username: string) {
        // In a real app, this would be: await User.findOne({ where: { username } });
        return this.users.find(u => u.username === username);
    },
    async createUser(user: any) {
        console.log("existing users before create:", this.users);
        
        const newUser = { ...user, id: `user_${Date.now()}` };
        // In a real app, this would be: await User.create(user);
        this.users.push(newUser);
        return newUser;
    }
};

// Schemas for validation
const signupSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters long").max(20),
    password: z.string().min(6, "Password must be at least 6 characters long").max(100),
});

const signinSchema = z.object({
    username: z.string().nonempty("Username is required"),
    password: z.string().nonempty("Password is required"),
});

router.post("/signup", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parseResult = signupSchema.safeParse(req.body);
        if (!parseResult.success) {
            // Provide detailed validation errors
            return res.status(401).json({ errors: z.flattenError(parseResult.error).fieldErrors });
        }

        const { username, password } = parseResult.data;

        // Check if user already exists
        const existingUser = await db.findUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: "User already exists" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = await db.createUser({ username, password: hashedPassword });
        console.log("New user created:", newUser);
        

        res.status(201).json({
            message: "User created successfully",
            userId: newUser.id,
        });
    } catch (error) {
        next(error); // Pass errors to the global error handler
    }
});

router.post("/signin", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parseResult = signinSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ errors:z.flattenError(parseResult.error).fieldErrors });
    }
    const { username, password } = parseResult.data;

    const user = await db.findUserByUsername(username);

    const passwordMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({ message: "User signed in successfully", token });
    } catch (error) {
        next(error);
    }
});

export default router;  