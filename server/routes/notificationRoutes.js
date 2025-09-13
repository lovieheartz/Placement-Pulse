const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken: authenticateUser, authorizeRoles } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/notifications');
    // Create directory if it doesn't exist
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

// File filter to limit file types and size
const fileFilter = (req, file, cb) => {
  // Accept images, PDFs, and common document formats
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation' // PowerPoint
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and common document formats are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Log middleware configuration
console.log('Multer configured for file uploads with destination:', path.join(__dirname, '../uploads/notifications'));

// Create notification - only admin and faculty can create
router.post(
  '/create',
  authenticateUser,
  authorizeRoles('admin', 'faculty'),
  upload.single('attachment'),
  notificationController.createNotification
);

// Get user notifications
router.get(
  '/user',
  authenticateUser,
  notificationController.getUserNotifications
);

// Mark notification as read
router.put(
  '/:notificationId/read',
  authenticateUser,
  notificationController.markNotificationAsRead
);

// Get unread notification count
router.get(
  '/unread-count',
  authenticateUser,
  notificationController.getUnreadCount
);

module.exports = router;