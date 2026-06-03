import { Call } from "../models/call.js";
import { Chat } from "../models/chat.js";

/**
 * Persists call records for the WebRTC socket signaling flow so call history
 * works end-to-end.
 *
 * The frontend generates its own string call id (`<caller>-<receiver>-<ts>`)
 * which is NOT a Mongo ObjectId, so we keep an in-memory map from that client
 * id to the persisted Call document id for the lifetime of the call.
 *
 * NOTE: per-instance state (see lib/socketStore.js for the same caveat).
 */
const activeCalls = new Map(); // clientCallId -> Call._id

const findDirectChat = (callerId, receiverId) =>
  Chat.findOne({
    groupChat: false,
    members: { $all: [callerId, receiverId] },
  });

export const recordCallInitiated = async ({
  clientCallId,
  callerId,
  receiverId,
  callType,
}) => {
  try {
    const chat = await findDirectChat(callerId, receiverId);
    if (!chat) return;

    const call = await Call.create({
      caller: callerId,
      receiver: receiverId,
      chat: chat._id,
      callType,
      status: "ringing",
    });

    activeCalls.set(clientCallId, call._id);
  } catch (err) {
    console.error("Failed to record initiated call:", err.message);
  }
};

export const recordMissedCall = async ({
  callerId,
  receiverId,
  callType,
}) => {
  try {
    const chat = await findDirectChat(callerId, receiverId);
    if (!chat) return;

    await Call.create({
      caller: callerId,
      receiver: receiverId,
      chat: chat._id,
      callType,
      status: "missed",
      endTime: new Date(),
    });
  } catch (err) {
    console.error("Failed to record missed call:", err.message);
  }
};

export const recordCallAccepted = async (clientCallId) => {
  const dbId = activeCalls.get(clientCallId);
  if (!dbId) return;

  try {
    await Call.findByIdAndUpdate(dbId, {
      status: "accepted",
      startTime: new Date(),
    });
  } catch (err) {
    console.error("Failed to record accepted call:", err.message);
  }
};

const finalizeCall = async (clientCallId, status) => {
  const dbId = activeCalls.get(clientCallId);
  if (!dbId) return;

  activeCalls.delete(clientCallId);

  try {
    const call = await Call.findById(dbId);
    if (!call) return;

    const endTime = new Date();
    call.status = status;
    call.endTime = endTime;

    if (call.startTime) {
      call.duration = Math.max(
        0,
        Math.floor((endTime - call.startTime) / 1000)
      );
    }

    await call.save();
  } catch (err) {
    console.error(`Failed to finalize call (${status}):`, err.message);
  }
};

export const recordCallRejected = (clientCallId) =>
  finalizeCall(clientCallId, "rejected");

export const recordCallEnded = (clientCallId) =>
  finalizeCall(clientCallId, "ended");
