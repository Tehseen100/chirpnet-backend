import multer from "multer";
import crypto from "crypto";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const fileName =
      crypto.randomBytes(12).toString("hex") + path.extname(file.originalname);
    cb(null, fileName);
  },
});

const mediaMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "video/mp4",
  "video/quicktime",
];

const imageMimeTypes = ["image/jpeg", "image/png", "image/gif"];

const createFileFilter = (allowedMimeTypes) => {
  return function (req, file, cb) {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  };
};

// Uploaders
export const uploadMedia = multer({
  storage,
  fileFilter: createFileFilter(mediaMimeTypes),
});

export const uploadAvatar = multer({
  storage,
  fileFilter: createFileFilter(imageMimeTypes),
});

export const upload = multer({ storage });
