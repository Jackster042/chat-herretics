import express from "express";
import { getChats, getOrCreateChat } from "../controllers/chat-controller";
import { protectedRoute } from "../middlewares/auth";

const router = express.Router();

router.use(protectedRoute)

router.get("/", getChats)
router.post("/with/:participantId", getOrCreateChat)

export default router;