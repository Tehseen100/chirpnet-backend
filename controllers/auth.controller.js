import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
};

const accessTokenExpiry = 15 * 60 * 1000; // 15 minutes
const refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days

// Register user
export const registerUser = asyncHandler(async (req, res) => {
  const { fullName, username, bio, email, password } = req.body;

  if ([fullName, username, email, password].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  if (!req.file) {
    throw new ApiError(400, "Avatar is required");
  }

  // Check for existing user
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  const cloudinaryResponse = await uploadOnCloudinary(req.file.path);

  if (!cloudinaryResponse) {
    throw new ApiError(500, "Cloud upload failed. Please try again.");
  }

  const avatar = {
    avatarName: cloudinaryResponse.original_filename,
    avatarType: cloudinaryResponse.resource_type,
    avatarUrl: cloudinaryResponse.secure_url,
    publicId: cloudinaryResponse.public_id,
  };

  // Hash password before saving
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    fullName,
    username,
    email,
    bio: bio?.trim() || " ",
    avatar,
    password: hashedPassword,
  });

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refreshToken in DB
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const registeredUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  res
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: accessTokenExpiry,
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: refreshTokenExpiry,
    })
    .status(201)
    .json({
      success: true,
      message: "User registered and logged in successfully",
      data: {
        user: registeredUser,
        accessToken,
      },
    });
});

// Login user
export const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "Username or Email is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(400, "Invalid credentials");
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refreshToken in DB
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  res
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: accessTokenExpiry,
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: refreshTokenExpiry,
    })
    .status(200)
    .json({
      success: true,
      message: "User logged in successfully",
      data: {
        user: loggedInUser,
        accessToken,
      },
    });
});

// Refresh Access Token
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw new ApiError(401, "Refresh token missing");
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    console.log("Decoded refresh token error: ", error.message);
    throw new ApiError(403, "Invalid or expired refresh token");
  }

  const user = await User.findById(decodedToken._id);
  if (!user) {
    throw new ApiError(404, "User does not exists");
  }

  if (token !== user.refreshToken) {
    throw new ApiError(403, "Invalid or expired refresh token");
  }

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  res
    .cookie("accessToken", newAccessToken, {
      ...cookieOptions,
      maxAge: accessTokenExpiry,
    })
    .cookie("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: refreshTokenExpiry,
    })
    .status(200)
    .json({
      success: true,
      accessToken: newAccessToken,
    });
});

// logout user
export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

  res
    .clearCookie("accessToken", { ...cookieOptions, maxAge: 0 })
    .clearCookie("refreshToken", { ...cookieOptions, maxAge: 0 })
    .status(200)
    .json({
      success: true,
      message: "User logged out successfully",
    });
});
