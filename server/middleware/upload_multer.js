const multer = require("multer");
const path = require("path");

// Files are held in memory, then uploaded to Supabase Storage by the controller
// (see services/storageService.js). No local disk writes.
const storage = multer.memoryStorage();

// Dynamic file filter
const fileFilter = (req, file, cb) => {
  // Allow PDF files for test uploads
  if (file.fieldname === 'pdfFile') {
    const isPdf = file.mimetype === 'application/pdf';
    if (isPdf) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed for test uploads."));
    }
  }
  // Allow images for snapshots and avatars
  else {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const isExtValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const isMimeValid = allowedTypes.test(file.mimetype);

    if (isExtValid && isMimeValid) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed."));
    }
  }
};

// Export multer middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit (increased for PDFs)
});

module.exports = upload;
