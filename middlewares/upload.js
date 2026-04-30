import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// ✅ FIX: Cloudinary v2 config using individual env vars (not cloudinary:// URL)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
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

// Separate uploaders for each type
export const uploadIdCard     = multer({ storage: createCloudinaryStorage("idcards")     });
export const uploadPost       = multer({ storage: createCloudinaryStorage("posts")       });
export const uploadNews       = multer({ storage: createCloudinaryStorage("news")        });
export const uploadProfilePic = multer({ storage: createCloudinaryStorage("profilePics") });

export default cloudinary;
