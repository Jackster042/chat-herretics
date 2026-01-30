import { verifyToken } from "@clerk/express";
import { Server as HttpServer } from "http";
import { Socket,Server as SocketServer } from "socket.io";
import { User } from "../models/User";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";

export const onlineUsers: Map<string, string> = new Map()

export const initializeSocket = (httpServer: HttpServer ) => {
    if(!process.env.CLERK_SECRET_KEY) {
        console.error("CLERK_SECRET_KEY is not set");
        process.exit(1);
    }
  const allowedOrigins = [
      "http://localhost:8081", // expo mobile
      "http://localhost:5173", // vite web devs
       process.env.FRONTEND_URL || "", // production
].filter(Boolean) as string[];

const io = new SocketServer(httpServer , {
    cors : {
        origin: allowedOrigins
    }
})


   io.use(async (socket, next) => {
     const token = socket.handshake.auth.token
     if(!token) return next(new Error("Unauthorized"))

    try {
        const session = await verifyToken(token, {secretKey: process.env.CLERK_SECRET_KEY!})

        const clerkId = session.sub

        const user = await User.findOne({ clerkId })
        if(!user) return next(new Error("User not found!"))

        socket.data.userId = user._id.toString()

       next() 

    } catch (error) {
        console.error("Error in socket.io middleware:", error);
        return next(new Error("Unauthorized"));
        
    }
   })

   io.on("connection", (socket) => {
    const userId = socket.data.userId

    // Send list of current uses t newly connected user
    socket.emit("online-users", { userIds: Array.from(onlineUsers.keys())})

    // Store users in the onlineUSers map
    onlineUsers.set(userId, socket.id)

    // Broadcast new user connection to all other users
    socket.broadcast.emit("user-online", { userId })

   socket.join(`user:${userId}`)

   socket.on("join-chat", (chatId: string) => {
    socket.join(`chat:${chatId}`)
   })

   socket.on("leave-chat", (chatId: string) => {
    socket.leave(`chat:${chatId}`)
   })

   socket.on("send-message", async (data: {chatId: string, text: string}) => {
    try {

        const { chatId, text} = data
        const chat = await Chat.findOne({_id: chatId, participants: userId})
        if(!chat) {
            socket.emit("socket-error", { message: "Chat not found" });
            return;
        }

        const message = await Message.create({
            chat: chatId,
            sender: userId,
            text,
        })

        chat.lastMessage = message._id
        chat.lastMessageAt = new Date()
        await chat.save()

        await message.populate("sender", "name email avatar")

        // Emit ot chat room
        io.to(`chat:${chatId}`).emit("new-message", message)

        // emit to participants personal rooms
         for(const participant of chat.participants) {
            io.to(`user:${participant}`).emit("new-message", message)
         }

    } catch (error) {
        console.error("Error in send-message handler:", error);
        socket.emit("error", { message: "Failed to send message" });
    }
   })

      //Typing
    socket.on("typing", async (data: {
        chatId: string,
        isTyping: boolean,
    }) => {
        const typePayload = {
            userId,
            chatId: data.chatId,
            isTyping: data.isTyping,
        }

        // Emit to chat room- other users in the chat
        socket.to(`chat:${data.chatId}`).emit("typing", typePayload)

        // Emit to user's personal room
        try {
            const chat = await Chat.findById(data.chatId)
            if(chat) {
                const otherParticipant = 
                chat.participants.find((p:any) => p._id.toString() !== userId)
                if(otherParticipant){
                 io.to(`user:${otherParticipant}`).emit("typing", typePayload)
                }
            }
        } catch (error) {
            console.error("Error in typing handler:", error);
            // SIlently fail- no need to notify user
        }
    })

      // Disconnect
      socket.on("disconnect", () => {
        onlineUsers.delete(userId)

        // Notify other users
        socket.broadcast.emit("user-offline", { userId })
      })
})


  return io;
}