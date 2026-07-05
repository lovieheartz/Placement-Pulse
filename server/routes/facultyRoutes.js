const express = require("express");
const router = express.Router();

const {
  createFaculty,
  getAllFaculties,
  getFacultyProfile,
  updateFacultyProfile,
  updateAvatar,
  deleteFaculty,
  getSingleFaculty,
  updateFacultyById,
  getAllStudents,
  blockStudent,
  unblockStudent,
  getBlockedStudents,
} = require("../controllers/facultyController");

const { authenticateToken } = require("../middleware/auth");
const { facultyOnly } = require("../middleware/roleCheck");
const upload = require("../middleware/upload_multer");

// ✅ Create faculty with avatar upload
router.post("/create-faculty", upload.single("avatar"), createFaculty);

// ✅ Get all faculties
router.get("/all-faculties", getAllFaculties);

// ✅ Get current faculty profile
router.get("/profile", authenticateToken, getFacultyProfile);

// ✅ Update current faculty profile
router.put("/profile", authenticateToken, updateFacultyProfile);

// ✅ Upload avatar for existing faculty
router.post("/upload-avatar", authenticateToken, upload.single("avatar"), updateAvatar);

// ✅ DELETE faculty by ID (used in FacultyList.jsx)
router.delete("/delete/:id", deleteFaculty);

// ✅ Student management routes (faculty access - must come before /:id route)
router.get("/students/blocked", authenticateToken, facultyOnly, getBlockedStudents);
router.get("/students", authenticateToken, facultyOnly, getAllStudents);
router.put("/students/:id/block", authenticateToken, facultyOnly, blockStudent);
router.put("/students/:id/unblock", authenticateToken, facultyOnly, unblockStudent);

// ✅ GET single faculty by ID (for edit)
router.get("/:id", getSingleFaculty);

// ✅ PUT update faculty by ID (for edit)
router.put("/update/:id", upload.single("avatar"), updateFacultyById);

module.exports = router;
