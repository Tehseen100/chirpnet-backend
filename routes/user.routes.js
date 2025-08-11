import express from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.middleware.js";
import {
  getMyProfile,
  updateProfile,
  changeCurrentPassword,
  deleteAccount,
  getPublicProfile,
  toggleFollowUser,
  getFollowers,
  getFollowing,
} from "../controllers/user.controller.js";
import { uploadAvatar } from "../middlewares/multer.middleware.js";

const router = express.Router();

// Protect all below routes
router.use(verifyJWT);
router.use(isAuthenticated);

router.get("/me", getMyProfile);
router.patch("/me", uploadAvatar.single("avatar"), updateProfile);
router.put("/me/change-password", changeCurrentPassword);
router.delete("/me", deleteAccount);
router.get("/:username", getPublicProfile);
router.patch("/:username/follow", toggleFollowUser);
router.get("/:username/followers", getFollowers);
router.get("/:username/following", getFollowing);

export default router;
