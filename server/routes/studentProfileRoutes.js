const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getStudentProfile,
  updateStudentProfile,
  addSubject,
  removeSubject
} = require('../controllers/studentProfileController');

// Get student profile
router.get('/profile', authenticateToken, getStudentProfile);

// Update student profile
router.put('/profile', authenticateToken, updateStudentProfile);

// Add subject
router.post('/profile/subject', authenticateToken, addSubject);

// Remove subject
router.delete('/profile/subject/:classType/:subjectId', authenticateToken, removeSubject);

module.exports = router;