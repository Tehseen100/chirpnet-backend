import { User } from "../models/user.model.js";
import { Chirp } from "../models/chirp.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { v2 as cloudinary } from "cloudinary";
import uploadOnCloudinary from "../utils/cloudinary.js";
import bcrypt from "bcrypt";

// GET /users/:username
export const getPublicProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username }).select(
    "fullName username avatar bio followers following"
  );

  if (!user) throw new ApiError(404, "User not found");

  const isFollowing = (await User.exists({
    _id: user._id,
    followers: req.user._id,
  }))
    ? true
    : false;

  const followersCount = user.followers.length;
  const followingCount = user.following.length;

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
      isFollowing,
    },
  });
});

// PATCH /users/:username/follow
export const toggleFollowUser = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const currentUser = req.user;

  const targetUser = await User.findOne({ username });
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  if (targetUser._id.equals(currentUser._id)) {
    throw new ApiError(400, "You cannot follow yourself.");
  }

  const isFollowed = targetUser.followers.includes(currentUser._id);

  if (isFollowed) {
    targetUser.followers.pull(currentUser._id);
    currentUser.following.pull(targetUser._id);
  } else {
    targetUser.followers.push(currentUser._id);
    currentUser.following.push(targetUser._id);
  }

  await targetUser.save();
  await currentUser.save();

  res.status(200).json({
    success: true,
    message: isFollowed
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

  const user = await User.findOne({ username }).select("_id followers");
  if (!user) throw new ApiError(404, "User not found");

  const followersCount = user.followers.length;
  const isFollowed = (await User.exists({
    _id: user._id,
    followers: req.user._id,
  }))
    ? true
    : false;

  const followers = await User.find({ _id: { $in: user.followers } })
    .select("fullName username avatar")
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    message: "User followers fetched successfully",
    data: {
      followers,
      followersCount,
      isFollowed,
    },
  });
});

// GET /users/:username/following
export const getFollowing = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const user = await User.findOne({ username }).select("_id following");
  if (!user) throw new ApiError(404, "User not found");

  const followingCount = user.following.length;
  const isFollowing = (await User.exists({
    _id: req.user._id,
    following: user._id,
  }))
    ? true
    : false;

  const following = await User.find({ _id: { $in: user.following } })
    .select("fullName username avatar")
    .skip(skip)
    .limit(limit)
    .lean();

  res.status(200).json({
    success: true,
    message: "User following list fetched successfully",
    data: {
      following,
      followingCount,
      isFollowing,
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

  const chirps = await Chirp.find({ author: user._id })
    .populate("author", "fullName username avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalChirps = await Chirp.countDocuments({ author: user._id });
  const totalPages = Math.ceil(totalChirps / limit);

  res.status(200).json({
    success: true,
    message: "User chirps fetched successfully",
    data: {
      chirps,
      totalChirps,
      limit,
      page,
      totalPages,
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

  // Hard Delete
  await User.deleteOne(user._id);

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
