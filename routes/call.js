import express from "express";
import { getCallHistory, getMyCallHistory } from "../controllers/call.js";
import { isAuthenticated } from "../middlewares/auth.js";

const app = express.Router();

// All routes require authentication.
app.use(isAuthenticated);

app.get("/my-history", getMyCallHistory);
app.get("/history/:chatId", getCallHistory);

export default app;
