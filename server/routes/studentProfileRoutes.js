const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getStudentProfile,
  updateStudentProfile,
  addSubject,
  removeSubject
} = require('../controllers/studentProfileController');
const { extractResult, saveSemester, deleteSemester } = require('../controllers/academicController');
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

// Get student profile
router.get('/profile', authenticateToken, getStudentProfile);

// Update student profile
router.put('/profile', authenticateToken, updateStudentProfile);

// Add subject
router.post('/profile/subject', authenticateToken, addSubject);

// Remove subject
router.delete('/profile/subject/:classType/:subjectId', authenticateToken, removeSubject);

// AI: extract a semester grade card (PDF/image) into structured JSON (no save)
router.post('/extract-result', authenticateToken, studentOnly, academicUpload, handleMulterError, extractResult);

// Save a reviewed semester result into the profile (upsert by semesterNumber)
router.post('/profile/semester', authenticateToken, studentOnly, saveSemester);

// Delete a stored semester result
router.delete('/profile/semester/:semesterNumber', authenticateToken, studentOnly, deleteSemester);

module.exports = router;