const express = require('express');
const router = express.Router();
const aptitudeTestController = require('../controllers/aptitudeTestController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload_multer');

// =============================================
// ADMIN/HOD ROUTES - Test Management
// =============================================

/**
 * @route   POST /api/aptitude/tests
 * @desc    Create a new aptitude test
 * @access  Admin, HOD, Faculty
 */
router.post(
  '/tests',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.createTest
);

/**
 * @route   GET /api/aptitude/tests
 * @desc    Get all aptitude tests (with filters)
 * @query   status, batchId, createdBy, search, page, limit
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/tests',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.getAllTests
);

/**
 * @route   GET /api/aptitude/tests/:id
 * @desc    Get test details by ID
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/tests/:id',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.getTestById
);

/**
 * @route   PUT /api/aptitude/tests/:id
 * @desc    Update test details
 * @access  Admin, HOD, Faculty (only creator)
 */
router.put(
  '/tests/:id',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.updateTest
);

/**
 * @route   DELETE /api/aptitude/tests/:id
 * @desc    Delete test (soft delete)
 * @access  Admin, HOD, Faculty (only creator)
 */
router.delete(
  '/tests/:id',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.deleteTest
);

/**
 * @route   POST /api/aptitude/tests/:id/publish
 * @desc    Publish test (change status to published)
 * @access  Admin, HOD, Faculty (only creator)
 */
router.post(
  '/tests/:id/publish',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.publishTest
);

/**
 * @route   POST /api/aptitude/tests/:id/archive
 * @desc    Archive test
 * @access  Admin, HOD, Faculty (only creator)
 */
router.post(
  '/tests/:id/archive',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.archiveTest
);

// =============================================
// QUESTION MANAGEMENT ROUTES
// =============================================

/**
 * @route   POST /api/aptitude/tests/:id/questions
 * @desc    Add questions to test (bulk add)
 * @access  Admin, HOD, Faculty (only creator)
 */
router.post(
  '/tests/:id/questions',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.addQuestions
);

/**
 * @route   POST /api/aptitude/tests/:id/questions/manual
 * @desc    Add a single question manually (one by one)
 * @access  Admin, HOD, Faculty (only creator)
 */
router.post(
  '/tests/:id/questions/manual',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.addManualQuestion
);

/**
 * @route   GET /api/aptitude/tests/:id/questions
 * @desc    Get all questions for a test
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/tests/:id/questions',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.getTestQuestions
);

/**
 * @route   PUT /api/aptitude/questions/:questionId
 * @desc    Update a single question
 * @access  Admin, HOD, Faculty (only creator)
 */
router.put(
  '/questions/:questionId',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.updateQuestion
);

/**
 * @route   DELETE /api/aptitude/questions/:questionId
 * @desc    Delete a single question
 * @access  Admin, HOD, Faculty (only creator)
 */
router.delete(
  '/questions/:questionId',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.deleteQuestion
);

// =============================================
// PDF UPLOAD & EXTRACTION ROUTES
// =============================================

/**
 * @route   POST /api/aptitude/tests/:id/upload-pdf
 * @desc    Upload PDF and extract questions using AI
 * @access  Admin, HOD, Faculty (only creator)
 */
router.post(
  '/tests/:id/upload-pdf',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  upload.single('pdfFile'),
  aptitudeTestController.uploadAndExtractPDF
);

// =============================================
// ANALYTICS & REPORTING ROUTES
// =============================================

/**
 * @route   GET /api/aptitude/tests/:id/analytics
 * @desc    Get comprehensive analytics for a test
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/tests/:id/analytics',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.getTestAnalytics
);

/**
 * @route   POST /api/aptitude/tests/:id/analytics/refresh
 * @desc    Recalculate analytics for a test
 * @access  Admin, HOD, Faculty
 */
router.post(
  '/tests/:id/analytics/refresh',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.refreshAnalytics
);

/**
 * @route   GET /api/aptitude/tests/:id/export
 * @desc    Export test results to Excel
 * @query   batchId (optional)
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/tests/:id/export',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.exportResultsToExcel
);

/**
 * @route   GET /api/aptitude/tests/:id/results
 * @desc    Get detailed results for all attempts
 * @query   batchId, page, limit, sortBy
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/tests/:id/results',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.getTestResults
);

// =============================================
// BATCH ASSIGNMENT ROUTES
// =============================================

/**
 * @route   POST /api/aptitude/tests/:id/assign-batch
 * @desc    Assign test to a batch
 * @access  Admin, HOD, Faculty
 */
router.post(
  '/tests/:id/assign-batch',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.assignBatchToTest
);

/**
 * @route   DELETE /api/aptitude/tests/:id/remove-batch/:batchId
 * @desc    Remove batch from test
 * @access  Admin, HOD, Faculty
 */
router.delete(
  '/tests/:id/remove-batch/:batchId',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.removeBatchFromTest
);

// =============================================
// MONITORING ROUTES
// =============================================

/**
 * @route   GET /api/aptitude/tests/:id/live-monitoring
 * @desc    Get real-time monitoring data for ongoing test
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/tests/:id/live-monitoring',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.getLiveMonitoring
);

/**
 * @route   GET /api/aptitude/tests/:id/proctoring-snapshots/:attemptId
 * @desc    Get all camera snapshots for an attempt
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/tests/:id/proctoring-snapshots/:attemptId',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.getProctoringSnapshots
);

// =============================================
// STUDENT ROUTES - Test Access
// =============================================

/**
 * @route   GET /api/aptitude/my-tests
 * @desc    Get all tests assigned to student
 * @access  Student
 */
router.get(
  '/my-tests',
  authenticateToken,
  authorizeRoles('student'),
  aptitudeTestController.getMyTests
);

/**
 * @route   GET /api/aptitude/tests/:id/preview
 * @desc    Get test preview for students (without questions)
 * @access  Student
 */
router.get(
  '/tests/:id/preview',
  authenticateToken,
  authorizeRoles('student'),
  aptitudeTestController.getTestPreview
);

/**
 * @route   POST /api/aptitude/tests/:id/check-eligibility
 * @desc    Check if student is eligible to take test
 * @access  Student
 */
router.post(
  '/tests/:id/check-eligibility',
  authenticateToken,
  authorizeRoles('student'),
  aptitudeTestController.checkEligibility
);

/**
 * @route   POST /api/aptitude/generate-test-ai
 * @desc    Generate test questions using AI based on company/pattern
 * @access  Admin, HOD, Faculty
 */
router.post(
  '/generate-test-ai',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  aptitudeTestController.generateTestWithAI
);

module.exports = router;
