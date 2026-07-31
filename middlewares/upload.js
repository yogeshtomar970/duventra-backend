import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// ✅ FIX: Cloudinary v2 config using individual env vars (not cloudinary:// URL)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Factory: folder ke hisaab se storage banao
const createCloudinaryStorage = (folderName) => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `duventra/${folderName}`,
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    },
  });
};

// Sirf actual images accept karo — bina limit ke koi bhi bada/arbitrary file bhej sakta tha
const imageFileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, png, webp, gif) are allowed"), false);
  }
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB — server/Cloudinary quota abuse se bachne ke liye

// Separate uploaders for each type
export const uploadIdCard = multer({
  storage: createCloudinaryStorage("idcards"),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
});
export const uploadPost = multer({
  storage: createCloudinaryStorage("posts"),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
});
export const uploadNews = multer({
  storage: createCloudinaryStorage("news"),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
});
export const uploadProfilePic = multer({
  storage: createCloudinaryStorage("profilePics"),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
});

export default cloudinary;