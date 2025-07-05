const multer = require("multer");
const path = require("path");

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads");
    console.log("Saving file to:", uploadPath); // Log the upload path
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${Date.now()}-${file.originalname}`;
    console.log("Generated filename:", uniqueFilename); // Log the generated filename
    cb(null, uniqueFilename);
  },
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  console.log("File MIME type:", file.mimetype); // Log the MIME type
  cb(null, true); // Accept all files for debugging
};

const upload = multer({ storage, fileFilter });

module.exports = upload;