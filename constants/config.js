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
const AI_BOT_MODEL = "NousResearch/Hermes-3-Llama-3.1-70B";

export { corsOptions, ChatToken, STREAM_API_KEY, STREAM_API_SECRET, HUGGINGFACE_TOKEN, AI_BOT_NAME, AI_BOT_MODEL };
