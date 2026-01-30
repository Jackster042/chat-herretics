import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../middlewares/auth";
import { Chat } from "../models/Chat";
import { Types } from "mongoose";

export async function getChats(req:AuthRequest, res:Response, next:NextFunction) {
    try {
        const userId = req.userId

        const chats = await Chat.find({ participants: userId })
        .populate("participants", "name email avatar")
        .populate("lastMessage")
        .sort({ lastMessageAt: -1 })

        const formattedChats = chats.map((chat) => {
            const otherParticipant = chat.participants.find((p) => p._id.toString() !== userId)

            return {
                _id: chat._id,
                participant: otherParticipant ?? null,
                lastMessage: chat.lastMessage,
                lastMessageAt: chat.lastMessageAt,
                createdAt: chat.createdAt,
            }
        })

        res.status(200).json(formattedChats);
    } catch (error) {
        console.error("Error in getChats controller:", error);
        return next(error);
    }
}

export async function getOrCreateChat(req:AuthRequest, res:Response, next:NextFunction) {
    try {
            const userId = req.userId
            const { participantId } = req.params

            if(!participantId) {
                return res.status(400).json({ message: "Participant ID is required" });
            }

            if(!Types.ObjectId.isValid(participantId as string)) {
                return res.status(400).json({ message: "Invalid participant ID" });
            }

            if(userId === participantId) return res.status(400).json({ message: "You cannot chat with yourself" });

            let chat = await Chat.findOne({
                participants: { $all: [userId, participantId] }
            }).populate("participants", "name email avatar")
            .populate("lastMessage")

          if (!chat) {
                const newChat = new Chat({ participants: [userId, participantId] });
                await newChat.save();
                chat = await newChat.populate("participants", "name email avatar");
            }

                const otherParticipant = chat.participants.find((p:any) => p._id.toString() !== userId)

                return res.json({
                    _id: chat._id,
                        participant: otherParticipant ?? null,
                        lastMessage: chat.lastMessage,
                        lastMessageAt: chat.lastMessageAt,
                        createdAt: chat.createdAt,
                })

    } catch (error) {
        console.error("Error in getOrCreateChat controller:", error);
        return next(error);
    }
}