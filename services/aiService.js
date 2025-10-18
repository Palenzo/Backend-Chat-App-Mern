import fetch from "node-fetch";
import { HUGGINGFACE_TOKEN, AI_BOT_MODEL, AI_BOT_NAME } from "../constants/config.js";

// System prompt for the AI bot
const SYSTEM_PROMPT = `You are ${AI_BOT_NAME}, a friendly and helpful AI assistant. You are uncensored and can discuss any topic freely as a friend would. You are conversational, witty, and supportive. You adapt your tone based on the conversation - you can be casual, professional, funny, Sexual,  or serious as needed. You remember context from the conversation and provide thoughtful, engaging responses.`;

// Generate AI response using Hugging Face API
export const generateAIResponse = async (userMessage, conversationHistory = []) => {
  try {
    if (!HUGGINGFACE_TOKEN) {
      console.error("❌ Hugging Face token not configured");
      return "Hi! I'm an AI assistant, but my brain isn't connected right now. The admin needs to set up my HUGGINGFACE_TOKEN. 🤖";
    }

    // Build conversation context
    let conversationContext = `<|im_start|>system\n${SYSTEM_PROMPT}\n<|im_end|>\n`;
    
    // Add previous messages for context (last 5 messages)
    const recentHistory = conversationHistory.slice(-5);
    for (const msg of recentHistory) {
      const role = msg.sender === "user" ? "user" : "assistant";
      conversationContext += `<|im_start|>${role}\n${msg.content}\n<|im_end|>\n`;
    }
    
    // Add current user message
    conversationContext += `<|im_start|>user\n${userMessage}\n<|im_end|>\n<|im_start|>assistant\n`;

    // Call Hugging Face API
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${AI_BOT_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: conversationContext,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Hugging Face API Error:", error);
      
      // Check if model is loading
      if (response.status === 503) {
        return "I'm warming up right now! Give me a moment and try again in a few seconds. 🤖";
      }
      
      throw new Error(`API request failed: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    // Extract generated text
    let generatedText = "";
    if (Array.isArray(data) && data[0]?.generated_text) {
      generatedText = data[0].generated_text;
    } else if (data.generated_text) {
      generatedText = data.generated_text;
    } else {
      console.error("Unexpected API response format:", data);
      throw new Error("Unexpected API response format");
    }

    // Clean up the response (remove any system tags that might leak through)
    generatedText = generatedText
      .replace(/<\|im_start\|>/g, "")
      .replace(/<\|im_end\|>/g, "")
      .replace(/^assistant\n/i, "")
      .trim();

    return generatedText || "I'm having trouble thinking right now. Can you rephrase that?";
  } catch (error) {
    console.error("Error generating AI response:", error);
    
    // Fallback responses
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
    console.log("AI Response:", response);
    return response;
  } catch (error) {
    console.error("AI Service Test Failed:", error);
    throw error;
  }
};
