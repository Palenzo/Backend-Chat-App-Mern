import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import env from "../config/env.js";
import { getBase64, getSockets } from "../lib/helper.js";

const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};

const connectDB = (uri) =>
  mongoose
    .connect(uri, { dbName: "ChatApplication" })
    .then((data) => console.log(`✅ Connected to DB: ${data.connection.host}`))
    .catch((err) => {
      console.error("❌ Database connection failed:", err.message);
      throw err;
    });

const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, env.jwtSecret);

  return res.status(code).cookie("chattokken", token, cookieOptions).json({
    success: true,
    user,
    message,
  });
};

const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");
  const usersSocket = getSockets(users);
  io.to(usersSocket).emit(event, data);
};

const uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    });
  });

  try {
    const results = await Promise.all(uploadPromises);

    return results.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));
  } catch (err) {
    throw new Error(`Error uploading files to Cloudinary: ${err.message}`);
  }
};

const deleteFilesFromCloudinary = async (publicIds = []) => {
  if (!publicIds.length) return;

  const deletePromises = publicIds.map((publicId) =>
    cloudinary.uploader
      .destroy(publicId, { resource_type: "auto" })
      .catch((err) => {
        // Don't fail the whole request if one asset can't be removed —
        // just log it so the orphan can be cleaned up later.
        console.error(`Failed to delete Cloudinary asset ${publicId}:`, err.message);
      })
  );

  await Promise.all(deletePromises);
};

export {
  connectDB,
  sendToken,
  cookieOptions,
  emitEvent,
  deleteFilesFromCloudinary,
  uploadFilesToCloudinary,
};
