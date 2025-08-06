import { Chirp } from "../models/chirp.model.js";
import { Comment } from "../models/comment.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";

// POST /chirps
export const createChirp = asyncHandler(async (req, res) => {
  const { content } = req.body;

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
  const { content } = req.body;

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
  await Chirp.create({
    content: content || "",
    isRechirp: true,
    author: userId,
    originalChirp: originalChirpId,
  });

  res.status(201).json({
    success: true,
    message: "Rechirped successfully",
  });
});

// GET /chirps
export const getAllChirps = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const chirps = await Chirp.aggregate([
    // Sort by most recent
    {
      $sort: { createdAt: -1 },
    },

    { $skip: skip },

    { $limit: limit },

    // Lookup author of the chirp
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
      },
    },
    { $unwind: "$author" },

    // Lookup latest 3 comments with their authors
    {
      $lookup: {
        from: "comments",
        let: { chirpId: "$_id" },
        pipeline: [
          {
            $match: { $expr: { $eq: ["$chirp", "$$chirpId"] } },
          },
          { $sort: { createdAt: -1 } },
          { $limit: 3 },
          {
            $lookup: {
              from: "users",
              localField: "author",
              foreignField: "_id",
              as: "author",
            },
          },
          { $unwind: "$author" },
        ],
        as: "latestComments",
      },
    },

    // Lookup original chirp if this is a rechirp
    {
      $lookup: {
        from: "chirps",
        localField: "originalChirp",
        foreignField: "_id",
        as: "rechirp",
      },
    },
    {
      $unwind: {
        path: "$rechirp",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Lookup author of the rechirped chirp
    {
      $lookup: {
        from: "users",
        localField: "rechirp.author",
        foreignField: "_id",
        as: "rechirpAuthor",
      },
    },
    {
      $unwind: {
        path: "$rechirpAuthor",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Add likes count
    {
      $addFields: {
        likesCount: {
          $cond: {
            if: { $isArray: "$likes" },
            then: { $size: "$likes" },
            else: 0,
          },
        },
      },
    },

    // Final projection
    {
      $project: {
        content: 1,
        media: 1,
        createdAt: 1,
        author: { fullName: 1, username: 1, avatar: 1 },
        latestComments: {
          content: 1,
          createdAt: 1,
          author: { fullName: 1, username: 1, avatar: 1 },
        },
        rechirp: {
          content: 1,
          media: 1,
          createdAt: 1,
          author: {
            fullName: "$rechirpAuthor.fullName",
            username: "$rechirpAuthor.username",
            avatar: "$rechirpAuthor.avatar",
          },
        },
        likesCount: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: "All chirps fetched successfully",
    data: chirps,
  });
});

// DELETE /chirps:chirpId
export const deleteChirp = asyncHandler(async (req, res) => {
  const { chirpId } = req.params;
  const chirp = await Chirp.findOne({ _id: chirpId });

  if (!chirp) {
    throw new ApiError(404, "Chirp not found");
  }

  if (!chirp.author.equals(req.user._id)) {
    throw new ApiError(403, "You're not authorized to delete this chirp");
  }

  // If it was Rechirp then remove it
  if (chirp.isRechirp) {
    await chirp.deleteOne({ _id: chirpId });
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
  await Chirp.deleteOne({ _id: chirpId });

  // Delete all comments associated with the chirp
  await Comment.deleteMany({ chirp: chirpId });

  res.status(200).json({
    success: true,
    message: "Chirp deleted successfully",
  });
});
