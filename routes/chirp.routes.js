import express from "express";
import {
  createChirp,
  deleteChirp,
  getAllChirps,
  rechirpChirp,
  toggleLikeOnChirp,
} from "../controllers/chirp.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.middleware.js";
import { uploadMedia } from "../middlewares/multer.middleware.js";
import {
  addCommentToChirp,
  deleteComment,
} from "../controllers/comment.controller.js";

const router = express.Router();

// Public routes
router.get("/", getAllChirps);

// Protect all below routes
router.use(verifyJWT);
router.use(isAuthenticated);

router.post("/", uploadMedia.array("media", 4), createChirp);
router.patch("/:chirpId/like", toggleLikeOnChirp);
router.post("/:chirpId/comments", addCommentToChirp);
router.delete("/comments/:commentId", deleteComment);
router.post("/:chirpId/rechirp", rechirpChirp);
router.delete("/:chirpId", deleteChirp);

export default router;
