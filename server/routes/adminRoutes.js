const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload_multer");
const { authenticateToken } = require("../middleware/auth");

const {
  checkAdminExists,
  createFirstAdmin,
  createAdminByAdmin,
  createAdminByAuthenticatedAdmin,
  getAdminProfile,
  updateAdminProfile,
  uploadAdminAvatar,
  deleteAdmin,
  createFaculty,
  getManagedFaculty,
  getAllStudents,
  getFirstAdmin,
  getBlockedStudents,
  blockStudent,
  unblockStudent,
  getAllAdmins,
} = require("../controllers/adminController");

// Check if any admin exists
router.get("/exists", checkAdminExists);

// Get first admin (for faculty creation)
router.get("/first", getFirstAdmin);

// Create the first admin (without authentication)
router.post("/create-first-admin", createFirstAdmin);

// Create admin by another admin (with credentials)
router.post("/create-admin", createAdminByAdmin);

// Create admin by authenticated admin (no credentials needed)
router.post("/create-admin-by-admin", authenticateToken, createAdminByAuthenticatedAdmin);

// Get all admins
router.get("/all-admins", authenticateToken, getAllAdmins);

// Get current admin profile
router.get("/profile", authenticateToken, getAdminProfile);

// Update current admin profile
router.put("/profile", authenticateToken, updateAdminProfile);

// Upload avatar
router.post(
  "/upload-avatar",
  authenticateToken,
  upload.single("avatar"),
  uploadAdminAvatar
);

// Delete admin by ID (if needed)
router.delete("/:id", authenticateToken, deleteAdmin);

// Faculty management routes
router.post("/create-faculty", authenticateToken, createFaculty);
router.get("/managed-faculty", authenticateToken, getManagedFaculty);

// Student management routes
router.get("/students", authenticateToken, getAllStudents);
router.get("/students/blocked", authenticateToken, getBlockedStudents);
router.put("/students/:id/block", authenticateToken, blockStudent);
router.put("/students/:id/unblock", authenticateToken, unblockStudent);

module.exports = router;
