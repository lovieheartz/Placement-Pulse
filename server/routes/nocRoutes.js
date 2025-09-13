const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const nocController = require('../controllers/nocController');

// Set up storage for NOC attachments
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/noc');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

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