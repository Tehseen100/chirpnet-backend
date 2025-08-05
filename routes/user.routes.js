import express from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.middleware.js";
import {
  getPublicProfile,
  toggleFollowUser,
} from "../controllers/user.controller.js";

const router = express.Router();

// Protect all below routes
router.use(verifyJWT);
router.use(isAuthenticated);

router.get("/:username", getPublicProfile);
router.patch("/:username/follow", toggleFollowUser);

export default router;
