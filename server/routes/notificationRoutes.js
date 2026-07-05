const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken: authenticateUser, authorizeRoles } = require('../middleware/auth');
const multer = require('multer');

// Attachments are held in memory, then uploaded to Supabase Storage by the controller.
const storage = multer.memoryStorage();

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


// Create notification - admin, faculty, and hod can create
router.post(
  '/create',
  authenticateUser,
  authorizeRoles('admin', 'faculty', 'hod'),
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

// Get notification history (admin and hod only)
router.get(
  '/history',
  authenticateUser,
  authorizeRoles('admin', 'hod'),
  notificationController.getNotificationHistory
);

module.exports = router;