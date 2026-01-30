import express from "express";
import cors from "cors"
import path from "path" 

import { errorHandler } from "./middlewares/error-handler";

import authRoutes from "./routes/auth-routes";
import chatRoutes from "./routes/chat-routes";
import messageRoutes from "./routes/message-routes";
import userRoutes from "./routes/user-routes";

const app = express()

const allowedOrigins = [
      "http://localhost:8081", // expo mobile
      "http://localhost:5173", // vite web devs
       process.env.FRONTEND_URL || "", // production
].filter(Boolean) as string[];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "✅ Server is running" });
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/chats", chatRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/users", userRoutes)

// Production: Serve static files from dist directory
if(process.env.NODE_ENV === "production"){
    app.use(express.static(path.join(__dirname, "../../web/dist")));
    
    app.get("/*", (_, res) => {
        res.sendFile(path.join(__dirname, "../../web/dist/index.html"));
    });
}

app.use(errorHandler);

export default app;