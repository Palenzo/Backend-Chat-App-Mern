import express from "express";
import { connectDB } from "./utils/features.js";
import dotenv from "dotenv";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuid } from "uuid";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import {
  CHAT_JOINED,
  CHAT_LEAVED,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  ONLINE_USERS,
  START_TYPING,
  STOP_TYPING,
  CALL_INITIATED,
  CALL_ACCEPTED,
  CALL_REJECTED,
  CALL_ENDED,
  CALL_UNAVAILABLE,
  INCOMING_CALL,
  WEBRTC_OFFER,
  WEBRTC_ANSWER,
  WEBRTC_ICE_CANDIDATE,
} from "./constants/events.js";
import { getSockets } from "./lib/helper.js";
import { Message } from "./models/message.js";
import { corsOptions, AI_BOT_NAME } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";

import userRoute from "./routes/user.js";
import chatRoute from "./routes/chat.js";
import adminRoute from "./routes/admin.js";
import callRoute from "./routes/call.js";

import { createAIBot, getAIBot } from "./seeders/aiBot.js";
import { generateAIResponse } from "./services/aiService.js";
import { Chat } from "./models/chat.js";

dotenv.config({
  path: "./.env",
});

const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 3000;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
const adminSecretKey = process.env.ADMIN_SECRET_KEY || "KeyofWife";
const userSocketIDs = new Map();
const onlineUsers = new Set();

connectDB(mongoURI);

// Initialize AI Bot
createAIBot().then(() => {
  console.log(`✅ AI Bot "${AI_BOT_NAME}" initialized`);
}).catch((err) => {
  console.error("❌ Failed to initialize AI Bot:", err);
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

// Using Middlewares Here
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);
app.use("/api/v1/call", callRoute);

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
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

    try {
      await Message.create(messageForDB);

      // Check if this is a chat with AI bot
      const chat = await Chat.findById(chatId).populate("members", "name username");
      const isAIBotInChat = chat?.members.some(
        (member) => member.username === AI_BOT_NAME.toLowerCase()
      );

      if (isAIBotInChat && user.username !== AI_BOT_NAME.toLowerCase()) {
        // Get conversation history for context
        const recentMessages = await Message.find({ chat: chatId })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate("sender", "username");

        const conversationHistory = recentMessages
          .reverse()
          .map((msg) => ({
            content: msg.content,
            sender: msg.sender.username === AI_BOT_NAME.toLowerCase() ? "assistant" : "user",
          }));

        // Generate AI response
        const aiResponse = await generateAIResponse(message, conversationHistory);

        // Get AI bot user
        const aiBot = await getAIBot();

        if (aiBot && aiResponse) {
          // Simulate typing delay
          setTimeout(async () => {
            const aiMessageForRealTime = {
              content: aiResponse,
              _id: uuid(),
              sender: {
                _id: aiBot._id,
                name: aiBot.name,
              },
              chat: chatId,
              createdAt: new Date().toISOString(),
            };

            const aiMessageForDB = {
              content: aiResponse,
              sender: aiBot._id,
              chat: chatId,
            };

            // Emit AI response
            io.to(membersSocket).emit(NEW_MESSAGE, {
              chatId,
              message: aiMessageForRealTime,
            });
            io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

            // Save AI message to DB
            await Message.create(aiMessageForDB);
          }, 1000 + Math.random() * 2000); // Random delay 1-3 seconds for realism
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
      throw new Error(error);
    }
  });

  socket.on(START_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(START_TYPING, { chatId });
  });

  socket.on(STOP_TYPING, ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    socket.to(membersSockets).emit(STOP_TYPING, { chatId });
  });

  socket.on(CHAT_JOINED, ({ userId, members }) => {
    onlineUsers.add(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  // Call Events
  socket.on(CALL_INITIATED, ({ callId, receiverId, callType }) => {
    const receiverSocket = getSockets([receiverId]);
    if (receiverSocket && receiverSocket.length > 0) {
      io.to(receiverSocket).emit(INCOMING_CALL, {
        callId,
        caller: {
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
        },
        callType,
      });
    } else {
      // Receiver is offline
      socket.emit(CALL_UNAVAILABLE, {
        message: "User is not available",
      });
    }
  });

  socket.on(CALL_ACCEPTED, ({ callId, callerId }) => {
    const callerSocket = getSockets([callerId]);
    io.to(callerSocket).emit(CALL_ACCEPTED, {
      callId,
      receiverId: user._id,
    });
  });

  socket.on(CALL_REJECTED, ({ callId, callerId }) => {
    const callerSocket = getSockets([callerId]);
    io.to(callerSocket).emit(CALL_REJECTED, {
      callId,
      receiverId: user._id,
    });
  });

  socket.on(CALL_ENDED, ({ callId, userId }) => {
    const userSocket = getSockets([userId]);
    io.to(userSocket).emit(CALL_ENDED, {
      callId,
    });
  });

  // WebRTC Signaling Events
  socket.on(WEBRTC_OFFER, ({ offer, receiverId, callId }) => {
    const receiverSocket = getSockets([receiverId]);
    io.to(receiverSocket).emit(WEBRTC_OFFER, {
      offer,
      callerId: user._id,
      callId,
    });
  });

  socket.on(WEBRTC_ANSWER, ({ answer, callerId, callId }) => {
    const callerSocket = getSockets([callerId]);
    io.to(callerSocket).emit(WEBRTC_ANSWER, {
      answer,
      receiverId: user._id,
      callId,
    });
  });

  socket.on(WEBRTC_ICE_CANDIDATE, ({ candidate, userId, callId }) => {
    const userSocket = getSockets([userId]);
    io.to(userSocket).emit(WEBRTC_ICE_CANDIDATE, {
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

app.use(errorMiddleware);

server.listen(port, () => {
  console.log(`Server is running on port ${port} in ${envMode} Mode`);
});

export { envMode, adminSecretKey, userSocketIDs };
