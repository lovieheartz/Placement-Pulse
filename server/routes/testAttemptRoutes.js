const express = require('express');
const router = express.Router();
const testAttemptController = require('../controllers/testAttemptController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload_multer');

// =============================================
// STUDENT ROUTES - Test Taking
// =============================================

/**
 * @route   GET /api/attempts/my-attempts
 * @desc    Get all attempts by logged-in student
 * @access  Student
 */
router.get(
  '/my-attempts',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.getMyAttempts
);

/**
 * @route   GET /api/attempts/my-history
 * @desc    Get all completed test attempts for logged-in student (test history)
 * @access  Student
 */
router.get(
  '/my-history',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.getMyHistory
);

/**
 * @route   POST /api/attempts/start/:testId
 * @desc    Start a new test attempt
 * @access  Student
 */
router.post(
  '/start/:testId',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.startAttempt
);

/**
 * @route   GET /api/attempts/:attemptId
 * @desc    Get current attempt details and progress
 * @access  Student (owner only)
 */
router.get(
  '/:attemptId',
  authenticateToken,
  authorizeRoles('student', 'admin', 'hod', 'faculty'),
  testAttemptController.getAttempt
);

/**
 * @route   GET /api/attempts/:attemptId/questions
 * @desc    Get all questions for this attempt (shuffled if enabled)
 * @access  Student (owner only)
 */
router.get(
  '/:attemptId/questions',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.getAttemptQuestions
);

/**
 * @route   POST /api/attempts/:attemptId/answer
 * @desc    Submit answer for a question
 * @body    { questionId, selectedAnswer, timeTaken }
 * @access  Student (owner only)
 */
router.post(
  '/:attemptId/answer',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.submitAnswer
);

/**
 * @route   POST /api/attempts/:attemptId/mark-for-review
 * @desc    Mark a question for review
 * @body    { questionId }
 * @access  Student (owner only)
 */
router.post(
  '/:attemptId/mark-for-review',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.markForReview
);

/**
 * @route   POST /api/attempts/:attemptId/submit
 * @desc    Submit final test
 * @body    { submissionType }
 * @access  Student (owner only)
 */
router.post(
  '/:attemptId/submit',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.submitTest
);

/**
 * @route   POST /api/attempts/:attemptId/pause
 * @desc    Pause test (if allowed)
 * @access  Student (owner only)
 */
router.post(
  '/:attemptId/pause',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.pauseTest
);

/**
 * @route   POST /api/attempts/:attemptId/resume
 * @desc    Resume paused test
 * @access  Student (owner only)
 */
router.post(
  '/:attemptId/resume',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.resumeTest
);

// =============================================
// PROCTORING ROUTES
// =============================================

/**
 * @route   POST /api/attempts/:attemptId/monitor/tab-switch
 * @desc    Log tab switch event
 * @body    { duration }
 * @access  Student (owner only)
 */
router.post(
  '/:attemptId/monitor/tab-switch',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.recordTabSwitch
);

/**
 * @route   POST /api/attempts/:attemptId/monitor/fullscreen-exit
 * @desc    Log fullscreen exit event
 * @access  Student (owner only)
 */
router.post(
  '/:attemptId/monitor/fullscreen-exit',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.recordFullscreenExit
);

/**
 * @route   POST /api/attempts/:attemptId/monitor/snapshot
 * @desc    Upload camera snapshot
 * @access  Student (owner only)
 */
router.post(
  '/:attemptId/monitor/snapshot',
  authenticateToken,
  authorizeRoles('student'),
  upload.single('snapshot'),
  testAttemptController.uploadSnapshot
);

/**
 * @route   POST /api/attempts/:attemptId/monitor/browser-info
 * @desc    Log browser/device information
 * @body    { userAgent, platform, screenResolution, ipAddress }
 * @access  Student (owner only)
 */
router.post(
  '/:attemptId/monitor/browser-info',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.recordBrowserInfo
);

/**
 * @route   POST /api/attempts/:attemptId/monitor/heartbeat
 * @desc    Update last activity timestamp (keep-alive)
 * @access  Student (owner only)
 */
router.post(
  '/:attemptId/monitor/heartbeat',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.updateHeartbeat
);

// =============================================
// RESULT ROUTES
// =============================================

/**
 * @route   GET /api/attempts/:attemptId/result
 * @desc    Get test result for completed attempt
 * @access  Student (owner only), Admin, HOD, Faculty
 */
router.get(
  '/:attemptId/result',
  authenticateToken,
  authorizeRoles('student', 'admin', 'hod', 'faculty'),
  testAttemptController.getResult
);

/**
 * @route   GET /api/attempts/:attemptId/answers
 * @desc    Get all answers with correct solutions (if allowed)
 * @access  Student (owner only if enabled), Admin, HOD, Faculty
 */
router.get(
  '/:attemptId/answers',
  authenticateToken,
  authorizeRoles('student', 'admin', 'hod', 'faculty'),
  testAttemptController.getAnswers
);

/**
 * @route   GET /api/attempts/:testId/my-result
 * @desc    Get my result for a specific test (student only)
 * @access  Student
 */
router.get(
  '/:testId/my-result',
  authenticateToken,
  authorizeRoles('student'),
  testAttemptController.getMyResult
);

// =============================================
// ADMIN/HOD ROUTES - Attempt Management
// =============================================

/**
 * @route   POST /api/attempts/:attemptId/terminate
 * @desc    Force terminate an ongoing attempt
 * @body    { reason }
 * @access  Admin, HOD
 */
router.post(
  '/:attemptId/terminate',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testAttemptController.terminateAttempt
);

/**
 * @route   POST /api/attempts/:attemptId/flag
 * @desc    Flag attempt for review
 * @body    { flagReason }
 * @access  Admin, HOD, Faculty
 */
router.post(
  '/:attemptId/flag',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  testAttemptController.flagForReview
);

/**
 * @route   POST /api/attempts/:attemptId/review
 * @desc    Mark attempt as reviewed
 * @body    { reviewNotes }
 * @access  Admin, HOD
 */
router.post(
  '/:attemptId/review',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testAttemptController.markAsReviewed
);

/**
 * @route   GET /api/attempts/:attemptId/proctoring-data
 * @desc    Get complete proctoring data for an attempt
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/:attemptId/proctoring-data',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  testAttemptController.getProctoringData
);

/**
 * @route   DELETE /api/attempts/:attemptId
 * @desc    Delete attempt (soft delete)
 * @access  Admin
 */
router.delete(
  '/:attemptId',
  authenticateToken,
  authorizeRoles('admin'),
  testAttemptController.deleteAttempt
);

/**
 * @route   POST /api/attempts/:attemptId/recalculate
 * @desc    Recalculate score for an attempt
 * @access  Admin, HOD
 */
router.post(
  '/:attemptId/recalculate',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testAttemptController.recalculateScore
);

/**
 * @route   GET /api/attempts/test/:testId/all
 * @desc    Get all attempts for a test
 * @query   status, batchId, page, limit
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/test/:testId/all',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  testAttemptController.getAllAttempts
);

/**
 * @route   GET /api/attempts/batch/:batchId/all
 * @desc    Get all attempts for a batch
 * @query   testId, status, page, limit
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/batch/:batchId/all',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  testAttemptController.getBatchAttempts
);

module.exports = router;
