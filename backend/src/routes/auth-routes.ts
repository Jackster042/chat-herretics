import express from "express";
import { getMe, authCallback } from "../controllers/auth-controller";
import { protectedRoute } from "../middlewares/auth";

const router = express.Router();

router.get("/me",protectedRoute, getMe)
router.post("/callback",  authCallback)

export default router;