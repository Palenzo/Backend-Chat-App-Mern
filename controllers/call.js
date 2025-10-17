import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Call } from "../models/call.js";
import { Chat } from "../models/chat.js";
import { User } from "../models/user.js";
import { getSockets } from "../lib/helper.js";
import { INCOMING_CALL } from "../constants/events.js";

// @route   POST /api/v1/call/initiate
// @desc    Initiate a call
// @access  Private
const initiateCall = TryCatch(async (req, res, next) => {
  const { chatId, receiverId, callType } = req.body;

  if (!chatId || !receiverId || !callType) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }

  if (!["video", "audio"].includes(callType)) {
    return next(new ErrorHandler("Invalid call type", 400));
  }

  // Check if chat exists
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new ErrorHandler("Chat not found", 404));
  }

  // Check if receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    return next(new ErrorHandler("Receiver not found", 404));
  }

  // Check if user is part of the chat
  if (!chat.members.includes(req.user._id.toString())) {
    return next(
      new ErrorHandler("You are not authorized to call in this chat", 403)
    );
  }

  // Create call record
  const call = await Call.create({
    caller: req.user._id,
    receiver: receiverId,
    chat: chatId,
    callType,
    status: "ringing",
  });

  // Populate caller info
  await call.populate("caller", "name avatar");
  await call.populate("receiver", "name avatar");

  // Get receiver's socket
  const receiverSocket = getSockets([receiverId]);

  // Emit incoming call event to receiver
  if (receiverSocket && receiverSocket.length > 0) {
    req.app.get("io").to(receiverSocket).emit(INCOMING_CALL, {
      call,
      caller: {
        _id: req.user._id,
        name: req.user.name,
        avatar: req.user.avatar,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: "Call initiated successfully",
    call,
  });
});

// @route   POST /api/v1/call/accept
// @desc    Accept a call
// @access  Private
const acceptCall = TryCatch(async (req, res, next) => {
  const { callId } = req.body;

  if (!callId) {
    return next(new ErrorHandler("Call ID is required", 400));
  }

  const call = await Call.findById(callId);

  if (!call) {
    return next(new ErrorHandler("Call not found", 404));
  }

  // Check if user is the receiver
  if (call.receiver.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("You are not authorized to accept this call", 403));
  }

  // Update call status
  call.status = "accepted";
  call.startTime = new Date();
  await call.save();

  res.status(200).json({
    success: true,
    message: "Call accepted successfully",
    call,
  });
});

// @route   POST /api/v1/call/reject
// @desc    Reject a call
// @access  Private
const rejectCall = TryCatch(async (req, res, next) => {
  const { callId } = req.body;

  if (!callId) {
    return next(new ErrorHandler("Call ID is required", 400));
  }

  const call = await Call.findById(callId);

  if (!call) {
    return next(new ErrorHandler("Call not found", 404));
  }

  // Check if user is the receiver
  if (call.receiver.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("You are not authorized to reject this call", 403));
  }

  // Update call status
  call.status = "rejected";
  call.endTime = new Date();
  await call.save();

  res.status(200).json({
    success: true,
    message: "Call rejected successfully",
    call,
  });
});

// @route   POST /api/v1/call/end
// @desc    End a call
// @access  Private
const endCall = TryCatch(async (req, res, next) => {
  const { callId } = req.body;

  if (!callId) {
    return next(new ErrorHandler("Call ID is required", 400));
  }

  const call = await Call.findById(callId);

  if (!call) {
    return next(new ErrorHandler("Call not found", 404));
  }

  // Check if user is part of the call
  const userId = req.user._id.toString();
  if (
    call.caller.toString() !== userId &&
    call.receiver.toString() !== userId
  ) {
    return next(new ErrorHandler("You are not authorized to end this call", 403));
  }

  // Calculate duration if call was accepted
  if (call.status === "accepted" && call.startTime) {
    const endTime = new Date();
    call.endTime = endTime;
    call.duration = Math.floor((endTime - call.startTime) / 1000); // duration in seconds
  } else {
    call.endTime = new Date();
  }

  call.status = "ended";
  await call.save();

  res.status(200).json({
    success: true,
    message: "Call ended successfully",
    call,
  });
});

// @route   GET /api/v1/call/history/:chatId
// @desc    Get call history for a specific chat
// @access  Private
const getCallHistory = TryCatch(async (req, res, next) => {
  const { chatId } = req.params;

  if (!chatId) {
    return next(new ErrorHandler("Chat ID is required", 400));
  }

  // Check if chat exists
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new ErrorHandler("Chat not found", 404));
  }

  // Check if user is part of the chat
  if (!chat.members.includes(req.user._id.toString())) {
    return next(
      new ErrorHandler("You are not authorized to view this call history", 403)
    );
  }

  // Get call history
  const calls = await Call.find({ chat: chatId })
    .populate("caller", "name avatar")
    .populate("receiver", "name avatar")
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({
    success: true,
    calls,
  });
});

// @route   GET /api/v1/call/my-history
// @desc    Get all call history for the user
// @access  Private
const getMyCallHistory = TryCatch(async (req, res, next) => {
  const userId = req.user._id;

  const calls = await Call.find({
    $or: [{ caller: userId }, { receiver: userId }],
  })
    .populate("caller", "name avatar")
    .populate("receiver", "name avatar")
    .populate("chat", "name")
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({
    success: true,
    calls,
  });
});

export {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  getCallHistory,
  getMyCallHistory,
};
