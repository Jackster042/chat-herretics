import express from "express";
import { protectedRoute } from "../middlewares/auth";
import { getUsers } from "../controllers/user-controller";
const router = express.Router();

router.get("/", protectedRoute, getUsers)

export default router;