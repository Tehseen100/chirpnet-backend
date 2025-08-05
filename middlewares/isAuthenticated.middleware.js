import ApiError from "../utils/ApiError.js";

export const isAuthenticated = (req, res, next) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "User not authenticated");
  }
  next();
};
