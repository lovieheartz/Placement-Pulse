const express = require("express");
const router = express.Router();

const {
  registerStudent,
  getProfile,
  updateProfile,
  uploadAvatar,
  verifyAccount
} = require("../controllers/studentController");

const { authenticateToken } = require("../middleware/auth");
const upload = require("../middleware/upload_multer"); // Create separate multer config if you prefer

// Public: Verify student account
router.post("/verify-account", verifyAccount);

// Public: Register student
router.post("/register", registerStudent);

// Get current student profile
router.get("/profile", authenticateToken, getProfile);

// Update current student profile
router.put("/profile", authenticateToken, updateProfile);

// Upload student avatar
router.post(
  "/upload-avatar",
  authenticateToken,
  upload.single("avatar"),
  uploadAvatar
);

module.exports = router;
