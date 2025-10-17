import express from "express";
import {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  getCallHistory,
  getMyCallHistory,
} from "../controllers/call.js";
import { isAuthenticated } from "../middlewares/auth.js";

const app = express.Router();

// All routes require authentication
app.use(isAuthenticated);

// Call routes
app.post("/initiate", initiateCall);
app.post("/accept", acceptCall);
app.post("/reject", rejectCall);
app.post("/end", endCall);
app.get("/history/:chatId", getCallHistory);
app.get("/my-history", getMyCallHistory);

export default app;
