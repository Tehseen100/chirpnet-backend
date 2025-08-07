import { Chirp } from "../models/chirp.model.js";
import { Comment } from "../models/comment.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// POST /chirps/:chirpId/comments
export const addCommentToChirp = asyncHandler(async (req, res) => {
  const { chirpId } = req.params;
  const { content } = req.body;

  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  const chirp = await Chirp.findById(chirpId);
  if (!chirp) {
    throw new ApiError(404, "Chirp not found");
  }

  const comment = await Comment.create({
    content,
    chirp: chirpId,
    author: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Comment added successfully",
    data: comment,
  });
});

// GET /chirps/:chirpId/comments
export const getCommentsOnChirp = asyncHandler(async (req, res) => {
  const { chirpId } = req.params;

  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const chirp = await Chirp.findById(chirpId);
  if (!chirp) {
    throw new ApiError(404, "Chirp not found");
  }

  const comments = await Comment.find({ chirp: chirpId })
    .populate("author", "fullName username avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalComments = await Comment.countDocuments({ chirp: chirpId });
  const totalPages = Math.ceil(totalComments / limit);

  res.status(200).json({
    success: true,
    message: "Chirp comment fetched successfully",
    data: {
      comments,
      pagination: {
        totalComments,
        totalPages,
        page,
        limit,
      },
    },
  });
});

// DELETE /comments/:commentId
export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findOneAndDelete({
    _id: commentId,
    author: req.user._id,
  });

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (!comment.author.equals(req.user._id)) {
    throw new ApiError(403, "You're not authorized to delete this comment");
  }

  res.status(200).json({
    success: true,
    message: "Comment deleted successfully",
  });
});
