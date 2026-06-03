import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { Call } from "../models/call.js";
import { Chat } from "../models/chat.js";

/**
 * The call *lifecycle* (initiate/accept/reject/end) is driven entirely over
 * Socket.IO (see app.js + services/callService.js). These REST endpoints are
 * read-only views over the persisted history.
 */

// @route   GET /api/v1/call/history/:chatId
// @desc    Get call history for a specific chat
// @access  Private
const getCallHistory = TryCatch(async (req, res, next) => {
  const { chatId } = req.params;

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  const isMember = chat.members.some((member) => member.toString() === req.user);
  if (!isMember)
    return next(
      new ErrorHandler("You are not authorized to view this call history", 403)
    );

  const calls = await Call.find({ chat: chatId })
    .populate("caller", "name avatar")
    .populate("receiver", "name avatar")
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({ success: true, calls });
});

// @route   GET /api/v1/call/my-history
// @desc    Get all call history for the logged-in user
// @access  Private
const getMyCallHistory = TryCatch(async (req, res) => {
  const userId = req.user;

  const calls = await Call.find({
    $or: [{ caller: userId }, { receiver: userId }],
  })
    .populate("caller", "name avatar")
    .populate("receiver", "name avatar")
    .populate("chat", "name")
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({ success: true, calls });
});

export { getCallHistory, getMyCallHistory };
