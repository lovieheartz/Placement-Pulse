const express = require('express');
const router = express.Router();
const ResumeAnalysisController = require('../controllers/resumeAnalysisController');
const { resumeUpload, handleMulterError } = require('../middleware/resumeUpload');
const { authenticateToken } = require('../middleware/auth');

// Middleware to ensure only students can access these routes
const studentOnly = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only students can use resume analysis features.'
    });
  }
  next();
};

// Routes
// POST /api/resume-analysis/upload - Upload and analyze resume
router.post('/upload', 
  authenticateToken, 
  studentOnly, 
  resumeUpload, 
  handleMulterError, 
  ResumeAnalysisController.uploadAndAnalyze
);

// GET /api/resume-analysis/history - Get analysis history for student
router.get('/history', 
  authenticateToken, 
  studentOnly, 
  ResumeAnalysisController.getAnalysisHistory
);

// GET /api/resume-analysis/:analysisId - Get specific analysis
router.get('/:analysisId', 
  authenticateToken, 
  studentOnly, 
  ResumeAnalysisController.getAnalysis
);

// GET /api/resume-analysis/download-optimized/:fileName - Download optimized resume PDF
router.get('/download-optimized/:fileName',
  authenticateToken,
  studentOnly,
  ResumeAnalysisController.downloadOptimizedPDF
);

// DELETE /api/resume-analysis/:analysisId - Delete a specific analysis
router.delete('/:analysisId',
  authenticateToken,
  studentOnly,
  ResumeAnalysisController.deleteAnalysis
);

module.exports = router;
