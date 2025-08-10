import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    chirp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chirp",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Like = mongoose.model("Like", likeSchema);
