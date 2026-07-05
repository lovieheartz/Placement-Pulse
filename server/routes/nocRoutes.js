const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const nocController = require('../controllers/nocController');

// NOC attachments are held in memory, then uploaded to Supabase Storage by the controller.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Student routes
router.post('/submit', authenticateToken, upload.single('attachment'), nocController.submitNOCRequest);
router.get('/student', authenticateToken, nocController.getStudentNOCRequests);

// Admin routes
router.get('/admin', authenticateToken, nocController.getAllNOCRequests);
router.put('/admin/:id/status', authenticateToken, nocController.updateNOCStatus);

module.exports = router;