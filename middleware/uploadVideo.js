import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Only videos (mp4, mov, m4v, webm) are allowed');
    error.status = 400;
    cb(error, false);
  }
};

const multerInstance = multer({
  storage: diskStorage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'tripinvilla_videos',
      resource_type: 'video'
    });
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {}
    return result.secure_url;
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {}
    throw err;
  }
};

const wrapMiddleware = (multerMiddleware) => {
  return async (req, res, next) => {
    multerMiddleware(req, res, async (err) => {
      if (err) return next(err);
      try {
        if (req.file) {
          const cloudinaryUrl = await uploadToCloudinary(req.file.path);
          req.file.filename = cloudinaryUrl;
        }
        next();
      } catch (uploadError) {
        next(uploadError);
      }
    });
  };
};

export const uploadVideo = {
  single: (fieldName) => wrapMiddleware(multerInstance.single(fieldName))
};

export default uploadVideo;
