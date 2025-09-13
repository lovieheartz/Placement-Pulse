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
} = require("../controllers/facultyController");

const { authenticateToken } = require("../middleware/auth");
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

// ✅ GET single faculty by ID (for edit)
router.get("/:id", getSingleFaculty);

// ✅ PUT update faculty by ID (for edit)
router.put("/update/:id", upload.single("avatar"), updateFacultyById);

// ✅ GET all students (faculty access)
router.get("/students", authenticateToken, getAllStudents);

module.exports = router;
