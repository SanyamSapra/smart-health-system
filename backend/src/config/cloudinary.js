import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith("image/");

    if (isImage) {
      return {
        folder: `smart-health/reports/${req.userId}`,
        resource_type: "image",
        public_id: `report_${Date.now()}`,
        format: "jpg",
      };
    } else {
      return {
        folder: `smart-health/reports/${req.userId}`,
        resource_type: "raw",
        public_id: `report_${Date.now()}`,
        format: "pdf",
      };
    }
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG and PDF files are allowed"), false);
    }
  },
});

export default cloudinary;