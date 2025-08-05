import mongoose from "mongoose";

const chirpSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      trim: true,
      maxlength: [280, "Chirp cannot exceed 280 characters"],
      validate: {
        validator: function (value) {
          // If it's not a rechirp, content is required
          if (!this.isRechirp && (!value || value.trim() === "")) {
            return false;
          }
          return true;
        },
        message: "Chirp content is required",
      },
    },
    media: [
      {
        mediaName: String,
        mediaType: {
          type: String,
          enum: ["image", "video"],
        },
        mediaUrl: String,
        publicId: String,
      },
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalChirp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chirp",
      default: null,
    },
    isRechirp: {
      type: Boolean,
      default: false,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

export const Chirp = mongoose.model("Chirp", chirpSchema);
