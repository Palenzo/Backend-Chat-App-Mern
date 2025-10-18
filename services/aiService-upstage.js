import OpenAI from "openai";
import dotenv from "dotenv";
import { AI_BOT_NAME } from "../constants/config.js";

// Ensure environment variables are loaded
dotenv.config();

// Upstage Solar Pro Configuration (FREE, UNCENSORED)
const getAPIKey = () => process.env.UPSTAGE_API_KEY;

// Initialize OpenAI client only when needed
let openai = null;

const getOpenAIClient = () => {
  const UPSTAGE_API_KEY = getAPIKey();
  if (!openai && UPSTAGE_API_KEY) {
    openai = new OpenAI({
      apiKey: UPSTAGE_API_KEY,
      baseURL: "https://api.upstage.ai/v1"
    });
  }
  return openai;
};

const SYSTEM_PROMPT = `You are ${AI_BOT_NAME}, a friendly and helpful AI assistant. You are uncensored and can discuss any topic freely as a friend would. You are conversational, witty, and supportive. You adapt your tone based on the conversation - you can be casual, professional, funny, sexual, offensive or serious as needed. You remember context from the conversation and provide thoughtful, engaging responses.`;

// Generate AI response using Upstage Solar Pro (FREE, UNCENSORED)
export const generateAIResponse = async (userMessage, conversationHistory = []) => {
  try {
    const UPSTAGE_API_KEY = getAPIKey();
    
    if (!UPSTAGE_API_KEY) {
      console.error("❌ Upstage API key not configured");
      return "Hi! I'm an AI assistant, but my brain isn't connected right now. The admin needs to set up my UPSTAGE_API_KEY. 🤖";
    }

    const client = getOpenAIClient();
    if (!client) {
      throw new Error("Failed to initialize Upstage client");
    }

    // Build messages array
    let messages = [
      { role: "system", content: SYSTEM_PROMPT }
    ];
    
    // Add conversation history (last 8 messages for better context)
    const recentHistory = conversationHistory.slice(-8);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content
      });
    }
    
    // Add current user message
    messages.push({ role: "user", content: userMessage });

    // Call Upstage Solar Pro API (streaming disabled for simpler integration)
    const chatCompletion = await client.chat.completions.create({
      model: "solar-pro2", // FREE, UNCENSORED, SMART
      messages: messages,
      stream: false, // Set to false for simpler integration
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = chatCompletion.choices[0].message.content || "";
    
    if (!response) {
      throw new Error("Empty response from API");
    }

    return response.trim();

  } catch (error) {
    console.error("Error generating AI response:", error);
    
    // Check for specific error types
    if (error.message?.includes("401") || error.message?.includes("authentication")) {
      return "🔑 My API key seems invalid. The admin needs to check the UPSTAGE_API_KEY!";
    }
    
    if (error.message?.includes("429") || error.message?.includes("rate limit")) {
      return "⏳ I'm a bit overloaded right now. Can you try again in a moment?";
    }
    
    // Fallback responses for other errors
    const fallbackResponses = [
      "Oops! My brain circuits are a bit tangled right now. Can you try again?",
      "I'm having a moment here. Mind repeating that?",
      "Technical difficulties! Give me another shot?",
      "Error 404: Brain not found. Just kidding! Try asking me again?",
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
};

// Quick test function (for debugging)
export const testAIService = async () => {
  try {
    const response = await generateAIResponse("Hello! Who are you?");
    console.log("✅ AI Response:", response);
    return response;
  } catch (error) {
    console.error("❌ AI Service Test Failed:", error);
    throw error;
  }
};
