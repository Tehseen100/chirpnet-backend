import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

// Load env configuration
dotenv.config();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload Function
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: "chirp-media",
      resource_type: "auto",
    });

    // Remove local temp file
    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    // Clean up temp file if error occurs
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export default uploadOnCloudinary;
