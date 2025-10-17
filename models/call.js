import mongoose, { Schema, Types, model } from "mongoose";

const schema = new Schema(
  {
    caller: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    chat: {
      type: Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    callType: {
      type: String,
      enum: ["video", "audio"],
      required: true,
    },
    status: {
      type: String,
      enum: ["initiated", "ringing", "accepted", "rejected", "ended", "missed"],
      default: "initiated",
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0, // in seconds
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
schema.index({ caller: 1, createdAt: -1 });
schema.index({ receiver: 1, createdAt: -1 });
schema.index({ chat: 1, createdAt: -1 });

export const Call = mongoose.models.Call || model("Call", schema);
