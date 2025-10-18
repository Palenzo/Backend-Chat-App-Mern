import { User } from "../models/user.js";
import { Chat } from "../models/chat.js";
import { AI_BOT_NAME } from "../constants/config.js";

// Create AI Bot User
export const createAIBot = async () => {
  try {
    // Check if AI bot already exists
    let aiBot = await User.findOne({ username: AI_BOT_NAME.toLowerCase() });
    
    if (aiBot) {
      console.log(`✅ AI Bot "${AI_BOT_NAME}" already exists`);
      return aiBot;
    }

    // Create AI bot user
    aiBot = await User.create({
      name: AI_BOT_NAME,
      username: AI_BOT_NAME.toLowerCase(),
      password: "ai-bot-password-" + Date.now(), // Random password (bot won't login)
      bio: `Hi! I'm ${AI_BOT_NAME}, your friendly AI assistant. Chat with me about anything!`,
      avatar: {
        public_id: "ai-bot-avatar",
        url: "https://api.dicebear.com/7.x/bottts/svg?seed=" + AI_BOT_NAME,
      },
    });

    console.log(`✅ AI Bot "${AI_BOT_NAME}" created successfully`);
    return aiBot;
  } catch (error) {
    console.error("❌ Error creating AI bot:", error);
    throw error;
  }
};

// Create AI chat for a user (called when new user registers or on demand)
export const createAIChatForUser = async (userId) => {
  try {
    // Get or create AI bot
    const aiBot = await createAIBot();

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      groupChat: false,
      members: { $all: [userId, aiBot._id] },
    });

    if (existingChat) {
      console.log(`✅ AI chat already exists for user ${userId}`);
      return existingChat;
    }

    // Create new AI chat
    const aiChat = await Chat.create({
      name: `Chat with ${AI_BOT_NAME}`,
      groupChat: false,
      creator: aiBot._id,
      members: [userId, aiBot._id],
    });

    console.log(`✅ AI chat created for user ${userId}`);
    return aiChat;
  } catch (error) {
    console.error("❌ Error creating AI chat:", error);
    throw error;
  }
};

// Get AI bot user
export const getAIBot = async () => {
  const aiBot = await User.findOne({ username: AI_BOT_NAME.toLowerCase() });
  return aiBot;
};
