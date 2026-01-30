import type { Request, Response, NextFunction } from "express";
import {  requireAuth } from "@clerk/express";
import { User } from "../models/User";
import { getAuth } from "@clerk/express";

export type AuthRequest = 
Request & { userId?: string };

export const protectedRoute = [
    requireAuth(),
    async (req:AuthRequest, res:Response, next:NextFunction) => {
        try {
            const { userId: clerkId } = getAuth(req);
            const user = await User.findOne({ clerkId });
            if(!user){
                return res.status(401).json({ message: "Unauthorized" });
            }
            req.userId = user._id.toString();
            next();
        } catch (error) {
            console.error("Error in protectedRoute middleware:", error);
            return next(error);
        }
    }
]