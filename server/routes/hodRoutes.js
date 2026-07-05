const express = require("express");
const router = express.Router();
const hodController = require("../controllers/hodController");
const { authenticateToken } = require("../middleware/auth");
const { hodOnly } = require("../middleware/roleCheck");
const multer = require("multer");
const path = require("path");

// Avatars are held in memory, then uploaded to Supabase Storage by the controller.
const memoryStorage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error("Only image files are allowed!"));
};

const uploadHODAvatar = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFileFilter,
});

const uploadFacultyAvatar = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

// HOD Profile Routes
router.get("/profile", authenticateToken, hodOnly, hodController.getHODProfile);
router.put("/profile", authenticateToken, hodOnly, hodController.updateHODProfile);
router.post("/upload-avatar", authenticateToken, hodOnly, uploadHODAvatar.single("avatar"), hodController.updateAvatar);

// Faculty Management Routes (HOD manages their department's faculty)
router.post("/create-faculty", authenticateToken, hodOnly, uploadFacultyAvatar.single("avatar"), hodController.createFaculty);
router.get("/my-faculties", authenticateToken, hodOnly, hodController.getMyFaculties);
router.get("/faculties", authenticateToken, hodOnly, hodController.getMyFaculties); // Alias for notification system
router.get("/faculty/:id", authenticateToken, hodOnly, hodController.getSingleFaculty);
router.put("/faculty/:id", authenticateToken, hodOnly, uploadFacultyAvatar.single("avatar"), hodController.updateFaculty);
router.delete("/faculty/:id", authenticateToken, hodOnly, hodController.deleteFaculty);

// Student access for HOD
router.get("/students", authenticateToken, hodOnly, hodController.getAllStudents);
router.put("/students/:id/block", authenticateToken, hodOnly, hodController.blockStudent);
router.put("/students/:id/unblock", authenticateToken, hodOnly, hodController.unblockStudent);
router.get("/students/blocked", authenticateToken, hodOnly, hodController.getBlockedStudents);

module.exports = router;
