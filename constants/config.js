const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:4173",
    process.env.CLIENT_URL,
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

const ChatToken = "chattokken";

const STREAM_API_KEY = process.env.STREAM_API_KEY || "mmhfdzb5evj2";
const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;
const AI_BOT_NAME = "Binod"; // Can be changed to "Pinki" or any other name
// FREE UNCENSORED MODEL - Works with free tier
// Mistral-7B-Instruct is uncensored and works great for chat
const AI_BOT_MODEL = "mistralai/Mistral-7B-Instruct-v0.2";

export { corsOptions, ChatToken, STREAM_API_KEY, STREAM_API_SECRET, HUGGINGFACE_TOKEN, AI_BOT_NAME, AI_BOT_MODEL };
