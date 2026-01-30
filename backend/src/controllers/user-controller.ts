import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { User } from "../models/User";

export async function getUsers(req:AuthRequest, res:Response, next:NextFunction) {
    try {
     const userId = req.userId

     const users=  await User.find({ _id: { $ne: userId } }).select("name email avatar").limit(50);

     res.status(200).json(users);
    } catch (error) {
        console.error("Error in getUsers controller:", error);
        return next(error);
    }
}
