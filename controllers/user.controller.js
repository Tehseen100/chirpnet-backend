import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

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
