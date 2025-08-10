import { User } from "../models/user.model.js";
import { Chirp } from "../models/chirp.model.js";
import { Follow } from "../models/follow.model.js";
import { Comment } from "../models/comment.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { v2 as cloudinary } from "cloudinary";
import uploadOnCloudinary from "../utils/cloudinary.js";
import bcrypt from "bcrypt";

// GET /users/:username
export const getPublicProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username }).select(
    "fullName username avatar bio"
  );
  if (!user) throw new ApiError(404, "User not found");

  const isFollowingUser = Boolean(
    await Follow.exists({
      follower: req.user._id,
      following: user._id,
    })
  );

  const followersCount = await Follow.countDocuments({
    following: user._id,
  });

  const followingCount = await Follow.countDocuments({
    follower: user._id,
  });

  res.status(200).json({
    success: true,
    message: "User profile fetched successfully",
    data: {
      fullName: user.fullName,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      followersCount,
      followingCount,
      isFollowingUser,
    },
  });
});

// PATCH /users/:username/follow
export const toggleFollowUser = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const currentUser = req.user;

  const targetUser = await User.findOne({ username });
  if (!targetUser) throw new ApiError(404, "User not found");

  if (targetUser._id.equals(currentUser._id)) {
    throw new ApiError(400, "You cannot follow yourself.");
  }

  const isFollowingUser = Boolean(
    await Follow.exists({
      follower: currentUser,
      following: targetUser,
    })
  );

  if (isFollowingUser) {
    await Follow.deleteOne({
      follower: currentUser._id,
      following: targetUser._id,
    });
  } else {
    await Follow.create({
      follower: currentUser._id,
      following: targetUser._id,
    });
  }

  res.status(200).json({
    success: true,
    message: isFollowingUser
      ? "User unfollowed successfully."
      : "User followed successfully.",
  });
});

// GET /users/:username/followers
export const getFollowers = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const user = await User.findOne({ username }).select("_id");
  if (!user) throw new ApiError(404, "User not found");

  const followers = await Follow.find({ following: user._id })
    .select("follower")
    .populate("follower", "fullName username avatar")
    .skip(skip)
    .limit(limit)
    .lean();

  const isFollowingUser = Boolean(
    await Follow.exists({
      follower: req.user._id,
      following: user._id,
    })
  );
  const followersCount = await Follow.countDocuments({ following: user._id });

  res.status(200).json({
    success: true,
    message: "User followers fetched successfully",
    data: {
      followers,
      followersCount,
      isFollowingUser,
    },
  });
});

// GET /users/:username/following
export const getFollowing = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const user = await User.findOne({ username }).select("_id");
  if (!user) throw new ApiError(404, "User not found");

  const following = await Follow.find({ follower: user._id })
    .select("following")
    .populate("following", "fullName username avatar")
    .skip(skip)
    .limit(limit)
    .lean();

  const isFollowedByUser = Boolean(
    await Follow.exists({
      follower: user._id,
      following: req.user._id,
    })
  );
  const followingCount = await Follow.countDocuments({ follower: user._id });

  res.status(200).json({
    success: true,
    message: "User following list fetched successfully",
    data: {
      following,
      followingCount,
      isFollowedByUser,
    },
  });
});

// GET /users/:username/chirps
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

// PATCH /users/me
export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, username, bio, email } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  // Check for existing user
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  const updatedFields = {
    fullName: fullName?.trim() || user.fullName,
    username: username?.trim() || user.username,
    bio: bio?.trim() || user.bio,
    email: email?.trim() || user.email,
  };

  if (req.file) {
    try {
      await cloudinary.uploader.destroy(user.avatar.publicId);
    } catch (error) {
      console.error("Cloudinary deletion failed:", error);
      throw new ApiError(500, "Something went wrong. Please try again");
    }

    const cloudinaryResponse = await uploadOnCloudinary(req.file.path);
    if (!cloudinaryResponse) {
      throw new ApiError(500, "Cloud upload failed. Please try again.");
    }

    updatedFields.avatar = {
      avatarName: cloudinaryResponse.original_filename,
      avatarType: cloudinaryResponse.resource_type,
      avatarUrl: cloudinaryResponse.secure_url,
      publicId: cloudinaryResponse.public_id,
    };
  }

  user.set(updatedFields);
  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
  });
});

// PUT /users/me/change-password
export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const isPasswordCorrect = await bcrypt.compare(
    currentPassword,
    user.password
  );
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid current Password");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

// DELETE /users/me
export const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  // Delete avatar from Cloudinary
  try {
    await cloudinary.uploader.destroy(user.avatar.publicId);
  } catch (error) {
    console.error("Cloudinary deletion failed:", error.message);
  }

  // Delete chirps and their media
  const chirps = await Chirp.find({ author: user._id });
  if (chirps.length) {
    for (const chirp of chirps) {
      if (chirp.media?.length) {
        for (const file of chirp.media) {
          if (file.publicId) {
            try {
              await cloudinary.uploader.destroy(file.publicId);
            } catch (error) {
              console.error(
                `Failed to delete chirp media ${file.publicId}:`,
                error.message
              );
            }
          }
        }
      }
    }
    await Chirp.deleteMany({ author: user._id });
  }

  try {
    await Comment.deleteMany({ author: user._id });
  } catch (error) {
    console.error("Failed to delete comments: ", error.message);
  }

  try {
    await Follow.deleteMany({ follower: user._id });
  } catch (error) {
    console.error("Failed to delete follows: ", error.message);
  }

  // Hard Delete
  try {
    await user.deleteOne();
  } catch (error) {
    console.error("Failed to delete user:", error.message);
    throw new ApiError(500, "Failed to delete user account");
  }

  // Cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  };

  res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .status(200)
    .json({
      success: true,
      message: "Your account has been deleted successfully",
    });
});
