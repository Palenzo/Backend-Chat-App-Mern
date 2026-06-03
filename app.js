import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { v2 as cloudinary } from "cloudinary";

import env from "./config/env.js";
import { connectDB } from "./utils/features.js";
import { errorMiddleware } from "./middlewares/error.js";
import { corsOptions, AI_BOT_NAME } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";
import { getSockets } from "./lib/helper.js";
import { userSocketIDs, onlineUsers } from "./lib/socketStore.js";
import {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
  CALL_ACCEPTED,
  CALL_ENDED,
  CALL_INITIATED,
  CALL_REJECTED,
  CALL_UNAVAILABLE,
  INCOMING_CALL,
  WEBRTC_ANSWER,
  WEBRTC_ICE_CANDIDATE,
  WEBRTC_OFFER,
} from "./constants/events.js";
import { Message } from "./models/message.js";
import { Chat } from "./models/chat.js";
import {
  recordCallAccepted,
  recordCallEnded,
  recordCallInitiated,
  recordCallRejected,
  recordMissedCall,
} from "./services/callService.js";
import { createAIBot, getAIBot } from "./seeders/aiBot.js";
import { generateAIResponse } from "./services/aiService-upstage.js";

import userRoute from "./routes/user.js";
import chatRoute from "./routes/chat.js";
import adminRoute from "./routes/admin.js";
import callRoute from "./routes/call.js";

connectDB(env.mongoURI);

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

// Initialize the AI assistant (non-blocking).
createAIBot()
  .then(() => console.log(`✅ AI Bot "${AI_BOT_NAME}" initialized`))
  .catch((err) => console.error("❌ Failed to initialize AI Bot:", err.message));

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: corsOptions });

app.set("io", io);

// --- Global middleware ---------------------------------------------------
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(cors(corsOptions));
if (env.isDevelopment) app.use(morgan("dev"));

// Rate limiting — strict on auth, lenient elsewhere.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later." },
});
app.use("/api/v1/user/login", authLimiter);
app.use("/api/v1/user/new", authLimiter);
app.use("/api/v1/admin/verify", authLimiter);

// --- Routes --------------------------------------------------------------
app.get("/health", (req, res) =>
  res.status(200).json({ success: true, status: "ok", uptime: process.uptime() })
);

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);
app.use("/api/v1/call", callRoute);

// --- Socket.IO -----------------------------------------------------------
io.use((socket, next) => {
  cookieParser()(
    socket.request,
    socket.request.res,
    async (err) => await socketAuthenticator(err, socket, next)
  );
});

io.on("connection", (socket) => {
  const user = socket.user;
  userSocketIDs.set(user._id.toString(), socket.id);

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: { _id: user._id, name: user.name },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDB = { content: message, sender: user._id, chat: chatId };

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(NEW_MESSAGE, { chatId, message: messageForRealTime });
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

    try {
      await Message.create(messageForDB);
      await maybeReplyWithAI({ chatId, message, sender: user, membersSocket });
    } catch (error) {
      // Log only — never throw inside a socket handler.
      console.error("Error handling message:", error.message);
    }
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    socket.to(getSockets(members)).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    socket.to(getSockets(members)).emit(STOP_TYPING, { chatId });
  });

  socket.on(CHAT_JOINED, ({ userId, members }) => {
    onlineUsers.add(userId.toString());
    io.to(getSockets(members)).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());
    io.to(getSockets(members)).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  // --- Call signaling (WebRTC) -------------------------------------------
  socket.on(CALL_INITIATED, ({ callId, receiverId, callType }) => {
    const receiverSocket = getSockets([receiverId]);

    if (receiverSocket.length > 0) {
      io.to(receiverSocket).emit(INCOMING_CALL, {
        callId,
        caller: { _id: user._id, name: user.name, avatar: user.avatar },
        callType,
      });
      recordCallInitiated({
        clientCallId: callId,
        callerId: user._id,
        receiverId,
        callType,
      });
    } else {
      socket.emit(CALL_UNAVAILABLE, { message: "User is not available" });
      recordMissedCall({ callerId: user._id, receiverId, callType });
    }
  });

  socket.on(CALL_ACCEPTED, ({ callId, callerId }) => {
    io.to(getSockets([callerId])).emit(CALL_ACCEPTED, { callId, receiverId: user._id });
    recordCallAccepted(callId);
  });

  socket.on(CALL_REJECTED, ({ callId, callerId }) => {
    io.to(getSockets([callerId])).emit(CALL_REJECTED, { callId, receiverId: user._id });
    recordCallRejected(callId);
  });

  socket.on(CALL_ENDED, ({ callId, userId }) => {
    io.to(getSockets([userId])).emit(CALL_ENDED, { callId });
    recordCallEnded(callId);
  });

  socket.on(WEBRTC_OFFER, ({ offer, receiverId, callId }) => {
    io.to(getSockets([receiverId])).emit(WEBRTC_OFFER, {
      offer,
      callerId: user._id,
      callId,
    });
  });

  socket.on(WEBRTC_ANSWER, ({ answer, callerId, callId }) => {
    io.to(getSockets([callerId])).emit(WEBRTC_ANSWER, {
      answer,
      receiverId: user._id,
      callId,
    });
  });

  socket.on(WEBRTC_ICE_CANDIDATE, ({ candidate, userId, callId }) => {
    io.to(getSockets([userId])).emit(WEBRTC_ICE_CANDIDATE, {
      candidate,
      userId: user._id,
      callId,
    });
  });

  socket.on("disconnect", () => {
    userSocketIDs.delete(user._id.toString());
    onlineUsers.delete(user._id.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});

/**
 * If the chat includes the AI bot and the sender isn't the bot, generate and
 * broadcast an assistant reply (with a small human-like delay).
 */
async function maybeReplyWithAI({ chatId, message, sender, membersSocket }) {
  const chat = await Chat.findById(chatId).populate("members", "name username");
  const botUsername = AI_BOT_NAME.toLowerCase();

  const isAIBotInChat = chat?.members.some((m) => m.username === botUsername);
  if (!isAIBotInChat || sender.username === botUsername) return;

  const recentMessages = await Message.find({ chat: chatId })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("sender", "username");

  const conversationHistory = recentMessages.reverse().map((msg) => ({
    content: msg.content,
    sender: msg.sender.username === botUsername ? "assistant" : "user",
  }));

  const aiResponse = await generateAIResponse(message, conversationHistory);
  const aiBot = await getAIBot();
  if (!aiBot || !aiResponse) return;

  setTimeout(async () => {
    try {
      const aiMessageForRealTime = {
        content: aiResponse,
        _id: uuid(),
        sender: { _id: aiBot._id, name: aiBot.name },
        chat: chatId,
        createdAt: new Date().toISOString(),
      };

      io.to(membersSocket).emit(NEW_MESSAGE, { chatId, message: aiMessageForRealTime });
      io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

      await Message.create({ content: aiResponse, sender: aiBot._id, chat: chatId });
    } catch (err) {
      console.error("Failed to deliver AI reply:", err.message);
    }
  }, 1000 + Math.random() * 2000);
}

app.use(errorMiddleware);

server.listen(env.port, () =>
  console.log(`🚀 Server running on port ${env.port} in ${env.nodeEnv} mode`)
);

// --- Process-level safety nets ------------------------------------------
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

export { app, server, io };
