import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// GET /:username
export const getPublicProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username }).select(
    "fullName username avatar bio followers following"
  );

  if (!user) throw new ApiError(404, "User not found");

  const isFollowing = user.followers.includes(req.user._id);

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

// PATCH /:username/follow
export const toggleFollowUser = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const currentUser = req.user;

  const targetUser = await User.findOne({ username });
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  if (targetUser._id.equals(currentUser._id)) {
    console.log(targetUser.fullName, " || ", currentUser.fullName);
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
