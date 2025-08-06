import express from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.middleware.js";
import {
  getFollowers,
  getFollowing,
  getPublicProfile,
  toggleFollowUser,
} from "../controllers/user.controller.js";

const router = express.Router();

// Protect all below routes
router.use(verifyJWT);
router.use(isAuthenticated);

router.get("/:username", getPublicProfile);
router.patch("/:username/follow", toggleFollowUser);
router.get("/:username/followers", getFollowers);
router.get("/:username/following", getFollowing);

export default router;
