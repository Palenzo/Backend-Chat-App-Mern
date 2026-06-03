import env from "../config/env.js";

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:4173",
    env.clientURL,
  ].filter(Boolean),
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

const ChatToken = "chattokken";

// Name of the built-in AI assistant. Can be changed freely (e.g. "Pinki").
const AI_BOT_NAME = "Binod";

export { corsOptions, ChatToken, AI_BOT_NAME };
