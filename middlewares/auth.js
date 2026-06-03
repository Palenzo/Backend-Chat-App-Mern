import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import env from "../config/env.js";
import { TryCatch } from "./error.js";
import { ChatToken } from "../constants/config.js";
import { User } from "../models/user.js";

const isAuthenticated = TryCatch((req, res, next) => {
  const token = req.cookies[ChatToken];
  if (!token)
    return next(new ErrorHandler("Please login to access this route", 401));

  const decodedData = jwt.verify(token, env.jwtSecret);

  req.user = decodedData._id;

  next();
});

const adminOnly = (req, res, next) => {
  const token = req.cookies["admintoken"];

  if (!token)
    return next(new ErrorHandler("Only Admin can access this route", 401));

  try {
    const decoded = jwt.verify(token, env.jwtSecret);

    if (decoded?.role !== "admin")
      return next(new ErrorHandler("Only Admin can access this route", 401));

    return next();
  } catch {
    return next(new ErrorHandler("Only Admin can access this route", 401));
  }
};

const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(err);

    const authToken = socket.request.cookies[ChatToken];

    if (!authToken)
      return next(new ErrorHandler("Please login to access this route", 401));

    const decodedData = jwt.verify(authToken, env.jwtSecret);

    const user = await User.findById(decodedData._id);

    if (!user)
      return next(new ErrorHandler("Please login to access this route", 401));

    socket.user = user;

    return next();
  } catch (error) {
    console.error("Socket authentication failed:", error.message);
    return next(new ErrorHandler("Please login to access this route", 401));
  }
};

export { isAuthenticated, adminOnly, socketAuthenticator };
