import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary using process.env
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
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Only images (jpg, jpeg, png, svg, webp) are allowed');
    error.status = 400;
    cb(error, false);
  }
};

const multerInstance = multer({
  storage: diskStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'tripinvilla',
      resource_type: 'auto'
    });
    // Delete local temporary file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error('Failed to delete temp file:', e);
    }
    return result.secure_url;
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {}
    throw err;
  }
};

// Create a middleware wrapper
const wrapMiddleware = (multerMiddleware) => {
  return async (req, res, next) => {
    multerMiddleware(req, res, async (err) => {
      if (err) return next(err);
      
      try {
        // 1. Handle single file upload
        if (req.file) {
          const cloudinaryUrl = await uploadToCloudinary(req.file.path);
          // Set filename directly to the Cloudinary URL!
          req.file.filename = cloudinaryUrl;
        }
        
        // 2. Handle array of files
        if (req.files && Array.isArray(req.files)) {
          for (const file of req.files) {
            const cloudinaryUrl = await uploadToCloudinary(file.path);
            file.filename = cloudinaryUrl;
          }
        }
        
        // 3. Handle fields (object of arrays)
        if (req.files && !Array.isArray(req.files)) {
          for (const key of Object.keys(req.files)) {
            for (const file of req.files[key]) {
              const cloudinaryUrl = await uploadToCloudinary(file.path);
              file.filename = cloudinaryUrl;
            }
          }
        }
        
        next();
      } catch (uploadError) {
        next(uploadError);
      }
    });
  };
};

const upload = {
  single: (fieldName) => wrapMiddleware(multerInstance.single(fieldName)),
  array: (fieldName, maxCount) => wrapMiddleware(multerInstance.array(fieldName, maxCount)),
  fields: (fieldsArray) => wrapMiddleware(multerInstance.fields(fieldsArray)),
  none: () => wrapMiddleware(multerInstance.none()),
  any: () => wrapMiddleware(multerInstance.any())
};

export { upload };
export default upload;
