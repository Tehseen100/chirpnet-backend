import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";

const verifyJWT = async (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) {
    throw new ApiError(
      401,
      "Unauthorized: Access token is required but missing."
    );
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    console.error("Decoded access token error: ", error.message);
    throw new ApiError(403, "Invalid or expired access token");
  }

  const user = await User.findById(decodedToken._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(404, "User does not exists");
  }

  req.user = user;
  next();
};

export default verifyJWT;
