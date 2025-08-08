import mongoose from "mongoose";

const chirpSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      trim: true,
      maxlength: [280, "Chirp cannot exceed 280 characters"],
      required: [
        function () {
          return !this.isRechirp; // Only required if not a rechirp
        },
        "Chirp content is required",
      ],
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
