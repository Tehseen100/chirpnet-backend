import { Chirp } from "../models/chirp.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
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

  const chirp = await Chirp.findById(chirpId).select("_id");
  if (!chirp) {
    throw new ApiError(404, "Chirp not found");
  }

  const alreadyLiked = await Like.exists({ chirp: chirp._id, author: userId });

  if (alreadyLiked) {
    // Unlike the chirp
    await Like.findOneAndDelete({ chirp: chirp._id, author: userId });
  } else {
    // Like the chirp
    await Like.create({
      chirp: chirp._id,
      author: userId,
    });
  }

  const totalLikes = await Like.countDocuments({ chirp: chirp._id });

  res.status(200).json({
    success: true,
    message: alreadyLiked ? "Chirp unliked " : "Chirp liked ",
    data: {
      chirpId: chirp._id,
      totalLikes,
      likedByMe: !alreadyLiked,
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
        pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
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
        pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
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

    // Lookup likes count + likedByMe
    {
      $lookup: {
        from: "likes",
        let: { chirpId: "$_id", currentUserId: req.user._id },
        pipeline: [
          { $match: { $expr: { $eq: ["$chirp", "$$chirpId"] } } },
          {
            $group: {
              _id: null,
              likesCount: { $sum: 1 },
              likedByMe: { $max: { $eq: ["$author", "$$currentUserId"] } },
            },
          },
        ],
        as: "likeStats",
      },
    },
    {
      $addFields: {
        likesCount: { $ifNull: [{ $first: "$likeStats.likesCount" }, 0] },
        likedByMe: { $ifNull: [{ $first: "$likeStats.likedByMe" }, false] },
      },
    },

    // Final projection
    {
      $project: {
        content: 1,
        media: 1,
        createdAt: 1,
        commentsCount: 1,
        likesCount: 1,
        likedByMe: 1,
        author: 1,
        originalChirp: {
          content: "$originalChirp.content",
          media: "$originalChirp.media",
          createdAt: "$originalChirp.createdAt",
          author: "$originalChirpAuthor",
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
        pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
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
        pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
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

    // Lookup likes count + likedByMe
    {
      $lookup: {
        from: "likes",
        let: { chirpId: "$_id", currentUserId: req.user._id },
        pipeline: [
          { $match: { $expr: { $eq: ["$chirp", "$$chirpId"] } } },
          {
            $group: {
              _id: null,
              likesCount: { $sum: 1 },
              likedByMe: { $max: { $eq: ["$author", "$$currentUserId"] } },
            },
          },
        ],
        as: "likeStats",
      },
    },
    {
      $addFields: {
        likesCount: { $ifNull: [{ $first: "$likeStats.likesCount" }, 0] },
        likedByMe: { $ifNull: [{ $first: "$likeStats.likedByMe" }, false] },
      },
    },

    // Final projection
    {
      $project: {
        content: 1,
        media: 1,
        createdAt: 1,
        commentsCount: 1,
        likesCount: 1,
        likedByMe: 1,
        author: 1,
        originalChirp: {
          content: "$originalChirp.content",
          media: "$originalChirp.media",
          createdAt: "$originalChirp.createdAt",
          author: "$originalChirpAuthor",
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

// GET /chirps/:username
export const getUserChirps = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const user = await User.findOne({ username }).select("_id");
  if (!user) throw new ApiError(404, "User not found");

  const chirps = await Chirp.aggregate([
    { $match: { author: user._id } },
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
        pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
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
        pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
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

    // Lookup likes count + likedByMe
    {
      $lookup: {
        from: "likes",
        let: { chirpId: "$_id", currentUserId: req.user._id },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$chirp", "$$chirpId"] },
            },
          },
          {
            $group: {
              _id: null,
              likesCount: { $sum: 1 },
              likedByMe: {
                $max: { $eq: ["$author", "$$currentUserId"] },
              },
            },
          },
        ],
        as: "likeStats",
      },
    },

    {
      $addFields: {
        likesCount: { $ifNull: [{ $first: "$likeStats.likesCount" }, 0] },
        likedByMe: { $ifNull: [{ $first: "$likeStats.likedByMe" }, false] },
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
        author: 1,
        originalChirp: {
          content: "$originalChirp.content",
          media: "$originalChirp.media",
          createdAt: "$originalChirp.createdAt",
          author: "$originalChirpAuthor",
        },
      },
    },
  ]);

  const totalChirps = await Chirp.countDocuments({ author: user._id });
  const totalPages = Math.ceil(totalChirps / limit);

  res.status(200).json({
    success: true,
    message: "User chirps fetched successfully",
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
