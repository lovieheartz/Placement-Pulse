const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let role = "others";

    // Try to determine role from authenticated user or form field
    if (req.user?.role) {
      role = req.user.role;
    } else if (req.body?.role) {
      role = req.body.role;
    }

    // Normalize role
    role = role.toLowerCase();

    // Map role to folder name
    let folderName;
    switch (role) {
      case "admin":
        folderName = "Avatar_Admin";
        break;
      case "faculty":
        folderName = "Avatar_Faculty";
        break;
      case "student":
        folderName = "Avatar_Student";
        break;
      default:
        folderName = "Avatar_Others";
    }

    const uploadPath = path.join(__dirname, "..", "uploads", folderName);

    // Ensure folder exists
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// Filter only image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const isExtValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const isMimeValid = allowedTypes.test(file.mimetype);

  if (isExtValid && isMimeValid) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpeg, jpg, png, gif) are allowed."));
  }
};

// Export multer middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
});

module.exports = upload;
