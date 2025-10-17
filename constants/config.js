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

export { corsOptions, ChatToken, STREAM_API_KEY, STREAM_API_SECRET };
