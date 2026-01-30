import express from "express";
import { protectedRoute } from "../middlewares/auth";
import { getMessages } from "../controllers/message-controller";
const router = express.Router();

router.get("/chat/:chatId",protectedRoute, getMessages)

export default router;