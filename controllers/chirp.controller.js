import { Chirp } from "../models/chirp.model.js";
import { Comment } from "../models/comment.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";

// POST /chirps
export const createChirp = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content?.trim()) {
    throw new ApiError(400, "Chirp content is required");
  }

  const chirpObj = {
    content,
    author: req.user._id,
  };

  if (req.files && req.files.length > 0) {
    chirpObj.media = [];

    for (const file of req.files) {
      const cloudinaryResponse = await uploadOnCloudinary(file.path);

      if (!cloudinaryResponse) {
        throw new ApiError(500, "Cloud upload failed. Please try again.");
      }

      chirpObj.media.push({
        mediaName: cloudinaryResponse.original_filename,
        mediaType: cloudinaryResponse.resource_type,
        mediaUrl: cloudinaryResponse.secure_url,
        publicId: cloudinaryResponse.public_id,
      });
    }
  }

  const newChirp = await Chirp.create(chirpObj);

  res.status(201).json({
    success: true,
    message: "Chirp created successfully",
    data: newChirp,
  });
});

// PATCH /chirps/:chirpId/like
export const toggleLikeOnChirp = asyncHandler(async (req, res) => {
  const { chirpId } = req.params;
  const userId = req.user._id;

  const chirp = await Chirp.findById(chirpId);
  if (!chirp) {
    throw new ApiError(404, "Chirp not found");
  }

  const alreadyLiked = chirp.likes.includes(userId);

  if (alreadyLiked) {
    // Unlike the chirp
    chirp.likes.pull(userId);
  } else {
    // Like the chirp
    chirp.likes.push(userId);
  }

  await chirp.save();

  const updatedChirp = await Chirp.findById(chirpId)
    .populate("likes", "fullName username avatar")
    .lean();

  res.status(200).json({
    success: true,
    message: alreadyLiked ? "Chirp unliked " : "Chirp liked ",
    data: {
      chirpId: updatedChirp._id,
      totalLikes: updatedChirp.likes.length,
      likedByMe: !alreadyLiked,
      likedUsers: updatedChirp.likes,
    },
  });
});

// POST /chirps/:chirpId/rechirp
export const rechirpChirp = asyncHandler(async (req, res) => {
  const { chirpId } = req.params;
  const userId = req.user._id;
  const { content } = req.body || {};

  const targetChirp = await Chirp.findById(chirpId);
  if (!targetChirp) {
    throw new ApiError(404, "Chirp not found");
  }

  const originalChirpId = targetChirp.isRechirp
    ? targetChirp.originalChirp
    : targetChirp._id;

  const existingRechirp = await Chirp.findOne({
    isRechirp: true,
    author: userId,
    originalChirp: originalChirpId,
  });

  // Already rechirped → undo rechirp
  if (existingRechirp) {
    await existingRechirp.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Rechirp removed successfully",
    });
  }

  // Not yet rechirped → create new rechirp
  const rechirpData = {
    isRechirp: true,
    author: userId,
    originalChirp: originalChirpId,
  };
  if (content?.trim()) {
    rechirpData.content = content.trim();
  }

  const newRechirp = await Chirp.create(rechirpData);

  res.status(201).json({
    success: true,
    message: "Rechirped successfully",
    rechirp: newRechirp,
  });
});

// GET /chirps
export const getAllChirps = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const chirps = await Chirp.aggregate([
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },

    // Lookup author
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
      },
    },
    { $unwind: "$author" },

    // Lookup original chirp for rechirps
    {
      $lookup: {
        from: "chirps",
        localField: "originalChirp",
        foreignField: "_id",
        as: "originalChirp",
      },
    },
    {
      $unwind: {
        path: "$originalChirp",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Lookup author of original chirp
    {
      $lookup: {
        from: "users",
        localField: "originalChirp.author",
        foreignField: "_id",
        as: "originalChirpAuthor",
      },
    },
    {
      $unwind: {
        path: "$originalChirpAuthor",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Lookup comment count
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "chirp",
        as: "comments",
      },
    },
    {
      $addFields: {
        commentsCount: { $size: { $ifNull: ["$comments", []] } },
      },
    },
    {
      $project: {
        comments: 0,
      },
    },

    // Add likes count
    {
      $addFields: {
        likesCount: { $size: { $ifNull: ["$likes", []] } },
        likedByMe: { $in: [req.user._id, "$likes"] },
      },
    },

    // Final projection
    {
      $project: {
        content: 1,
        media: 1,
        createdAt: 1,
        likedByMe: 1,
        likesCount: 1,
        commentsCount: 1,
        author: { fullName: 1, username: 1, avatar: 1 },

        originalChirp: {
          content: "$originalChirp.content",
          media: "$originalChirp.media",
          createdAt: "$originalChirp.createdAt",
          author: {
            fullName: "$originalChirpAuthor.fullName",
            username: "$originalChirpAuthor.username",
            avatar: "$originalChirpAuthor.avatar",
          },
        },
      },
    },
  ]);

  const totalChirps = await Chirp.countDocuments();
  const totalPages = Math.ceil(totalChirps / limit);

  res.status(200).json({
    success: true,
    message: "All chirps fetched successfully",
    data: {
      chirps,
      pagination: {
        totalChirps,
        totalPages,
        page,
        limit,
      },
    },
  });
});

// GET /chirps/me
export const getMyChirps = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const chirps = await Chirp.aggregate([
    { $match: { author: req.user._id } },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },

    // Lookup author
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
      },
    },
    { $unwind: "$author" },

    // Lookup original chirp for rechirps
    {
      $lookup: {
        from: "chirps",
        localField: "originalChirp",
        foreignField: "_id",
        as: "originalChirp",
      },
    },
    {
      $unwind: {
        path: "$originalChirp",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Lookup author of original chirp
    {
      $lookup: {
        from: "users",
        localField: "originalChirp.author",
        foreignField: "_id",
        as: "originalChirpAuthor",
      },
    },
    {
      $unwind: {
        path: "$originalChirpAuthor",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Lookup comment count
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "chirp",
        as: "comments",
      },
    },
    {
      $addFields: {
        commentsCount: { $size: { $ifNull: ["$comments", []] } },
      },
    },
    {
      $project: {
        comments: 0,
      },
    },

    // Add likes count
    {
      $addFields: {
        likesCount: { $size: { $ifNull: ["$likes", []] } },
        likedByMe: { $in: [req.user._id, "$likes"] },
      },
    },

    // Final projection
    {
      $project: {
        content: 1,
        media: 1,
        createdAt: 1,
        likedByMe: 1,
        likesCount: 1,
        commentsCount: 1,
        author: { fullName: 1, username: 1, avatar: 1 },

        originalChirp: {
          content: "$originalChirp.content",
          media: "$originalChirp.media",
          createdAt: "$originalChirp.createdAt",
          author: {
            fullName: "$originalChirpAuthor.fullName",
            username: "$originalChirpAuthor.username",
            avatar: "$originalChirpAuthor.avatar",
          },
        },
      },
    },
  ]);

  const totalChirps = await Chirp.countDocuments({ author: req.user._id });
  const totalPages = Math.ceil(totalChirps / limit);

  res.status(200).json({
    success: true,
    message: "All chirps fetched successfully",
    data: {
      chirps,
      pagination: {
        totalChirps,
        totalPages,
        page,
        limit,
      },
    },
  });
});

// DELETE /chirps:chirpId
export const deleteChirp = asyncHandler(async (req, res) => {
  const { chirpId } = req.params;
  const chirp = await Chirp.findById(chirpId);

  if (!chirp) {
    throw new ApiError(404, "Chirp not found");
  }

  if (!chirp.author.equals(req.user._id)) {
    throw new ApiError(403, "You're not authorized to delete this chirp");
  }

  // If it was Rechirp then remove it
  if (chirp.isRechirp) {
    await chirp.deleteOne();
    return res.status(200).json({
      success: true,
      message: "Rechirp deleted successfully",
    });
  }

  // Delete associated media files from Cloudinary
  if (chirp.media?.length) {
    for (const file of chirp.media) {
      if (file.publicId) {
        try {
          await cloudinary.uploader.destroy(file.publicId);
        } catch (error) {
          console.error("Cloudinary deletion failed:", error);
          throw new ApiError(500, "Something went wrong. PLease try again");
        }
      }
    }
  }

  // Delete the chirp from DB
  await chirp.deleteOne();

  // Delete all comments associated with the chirp
  try {
    await Comment.deleteMany({ chirp: chirpId });
  } catch (error) {
    console.error("Failed to delete comments: ", error.message);
  }

  res.status(200).json({
    success: true,
    message: "Chirp deleted successfully",
  });
});
