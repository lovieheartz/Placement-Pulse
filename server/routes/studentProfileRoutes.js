const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getStudentProfile,
  updateStudentProfile,
  addSubject,
  removeSubject
} = require('../controllers/studentProfileController');
const {
  extractResult,
  saveAcademicRecord,
  requestEdit,
  listEditRequests,
  resolveEditRequest,
  saveSemester,
  deleteSemester,
} = require('../controllers/academicController');
const { academicUpload, handleMulterError } = require('../middleware/academicUpload');

// Only students may use the AI grade-card import.
const studentOnly = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only students can use this feature.'
    });
  }
  next();
};

const staffOnly = authorizeRoles('admin', 'hod', 'faculty');

// Get student profile
router.get('/profile', authenticateToken, getStudentProfile);

// Update student profile
router.put('/profile', authenticateToken, updateStudentProfile);

// Add subject
router.post('/profile/subject', authenticateToken, addSubject);

// Remove subject
router.delete('/profile/subject/:classType/:subjectId', authenticateToken, removeSubject);

// AI: auto-detect + extract any marksheet (Class X / XII / semester). Stores the file. No save.
router.post('/extract-result', authenticateToken, studentOnly, academicUpload, handleMulterError, extractResult);

// Save a reviewed record — auto-routed by documentType, and LOCKED once saved.
router.post('/academic-record', authenticateToken, studentOnly, saveAcademicRecord);

// Student asks the placement cell for permission to edit a locked record.
router.post('/academic-record/request-edit', authenticateToken, studentOnly, requestEdit);

// Staff: review and resolve edit-permission requests.
router.get('/edit-requests', authenticateToken, staffOnly, listEditRequests);
router.post('/edit-requests/resolve', authenticateToken, staffOnly, resolveEditRequest);

// Legacy semester endpoints (kept for the older Update-Profile flow)
router.post('/profile/semester', authenticateToken, studentOnly, saveSemester);
router.delete('/profile/semester/:semesterNumber', authenticateToken, studentOnly, deleteSemester);

module.exports = router;