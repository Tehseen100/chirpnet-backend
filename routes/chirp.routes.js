import express from "express";
import {
  createChirp,
  deleteChirp,
  getAllChirps,
  getMyChirps,
  getUserChirps,
  rechirpChirp,
  toggleLikeOnChirp,
} from "../controllers/chirp.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.middleware.js";
import { uploadMedia } from "../middlewares/multer.middleware.js";
import {
  addCommentToChirp,
  getCommentsOnChirp,
  deleteComment,
} from "../controllers/comment.controller.js";

const router = express.Router();

// Protect all below routes
router.use(verifyJWT);
router.use(isAuthenticated);

router.post("/", uploadMedia.array("media", 4), createChirp);
router.get("/", getAllChirps);
router.get("/me", getMyChirps);
router.get("/:username", getUserChirps);
router.patch("/:chirpId/like", toggleLikeOnChirp);
router.post("/:chirpId/comments", addCommentToChirp);
router.get("/:chirpId/comments", getCommentsOnChirp);
router.delete("/comments/:commentId", deleteComment);
router.post("/:chirpId/rechirp", rechirpChirp);
router.delete("/:chirpId", deleteChirp);

export default router;
