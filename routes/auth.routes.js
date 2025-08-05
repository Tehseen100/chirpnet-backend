import express from "express";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/auth.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.middleware.js";
import { uploadAvatar } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.post("/register", uploadAvatar.single("avatar"), registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);

// Protected routes
router.post("/logout", verifyJWT, isAuthenticated, logoutUser);

export default router;
