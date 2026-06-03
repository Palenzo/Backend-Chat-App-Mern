import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

/**
 * Centralized, validated environment configuration.
 *
 * Required variables are checked at boot so the process fails fast with a
 * clear message instead of crashing deep inside a request. See `.env.example`
 * for the full list and descriptions.
 */

const required = [
  "MONGO_URI",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

// During automated tests we don't connect to real services, so skip the gate.
const isTest = process.env.NODE_ENV === "test" || process.env.VITEST;

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0 && !isTest) {
  console.error(
    `\n❌ Missing required environment variables:\n   - ${missing.join(
      "\n   - "
    )}\n\nCopy .env.example to .env and fill these in before starting the server.\n`
  );
  process.exit(1);
}

const env = {
  nodeEnv: (process.env.NODE_ENV || "development").trim(),
  port: Number(process.env.PORT) || 3000,

  mongoURI: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  adminSecretKey: process.env.ADMIN_SECRET_KEY || "KeyofWife",

  clientURL: process.env.CLIENT_URL,

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // Optional — the AI assistant degrades gracefully when this is absent.
  upstageApiKey: process.env.UPSTAGE_API_KEY,
};

env.isProduction = env.nodeEnv.toUpperCase() === "PRODUCTION";
env.isDevelopment = !env.isProduction;

export default env;
