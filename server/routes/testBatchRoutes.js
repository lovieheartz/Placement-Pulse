const express = require('express');
const router = express.Router();
const testBatchController = require('../controllers/testBatchController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// =============================================
// ADMIN/HOD ROUTES - Batch Management
// =============================================

/**
 * @route   POST /api/batches
 * @desc    Create a new test batch
 * @body    { batchName, academicYear, course, department, passoutYear, students[], autoEnrollmentCriteria }
 * @access  Admin, HOD
 */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.createBatch
);

/**
 * @route   GET /api/batches
 * @desc    Get all batches (with filters)
 * @query   status, course, department, academicYear, search, page, limit
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  testBatchController.getAllBatches
);

/**
 * @route   GET /api/batches/:id
 * @desc    Get batch details by ID
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  testBatchController.getBatchById
);

/**
 * @route   PUT /api/batches/:id
 * @desc    Update batch details
 * @access  Admin, HOD (only creator)
 */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.updateBatch
);

/**
 * @route   DELETE /api/batches/:id
 * @desc    Delete batch (soft delete)
 * @access  Admin, HOD (only creator)
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.deleteBatch
);

// =============================================
// STUDENT MANAGEMENT ROUTES
// =============================================

/**
 * @route   POST /api/batches/:id/add-students
 * @desc    Add students to batch
 * @body    { studentIds: [] }
 * @access  Admin, HOD
 */
router.post(
  '/:id/add-students',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.addStudents
);

/**
 * @route   POST /api/batches/:id/add-all-students
 * @desc    Add ALL students matching batch criteria to batch
 * @access  Admin, HOD
 */
router.post(
  '/:id/add-all-students',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.addAllMatchingStudents
);

/**
 * @route   POST /api/batches/:id/remove-students
 * @desc    Remove students from batch
 * @body    { studentIds: [] }
 * @access  Admin, HOD
 */
router.post(
  '/:id/remove-students',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.removeStudents
);

/**
 * @route   GET /api/batches/:id/students
 * @desc    Get all students in batch
 * @query   page, limit, search
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/:id/students',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  testBatchController.getBatchStudents
);

/**
 * @route   POST /api/batches/:id/auto-enroll
 * @desc    Auto-enroll students based on criteria
 * @access  Admin, HOD
 */
router.post(
  '/:id/auto-enroll',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.autoEnrollStudents
);

// =============================================
// TEST ASSIGNMENT ROUTES
// =============================================

/**
 * @route   POST /api/batches/:id/assign-test
 * @desc    Assign test to batch
 * @body    { testId, customSchedule: { startDate, endDate } }
 * @access  Admin, HOD
 */
router.post(
  '/:id/assign-test',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.assignTest
);

/**
 * @route   DELETE /api/batches/:id/remove-test/:testId
 * @desc    Remove test from batch
 * @access  Admin, HOD
 */
router.delete(
  '/:id/remove-test/:testId',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.removeTest
);

/**
 * @route   GET /api/batches/:id/tests
 * @desc    Get all tests assigned to batch
 * @query   status, page, limit
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/:id/tests',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  testBatchController.getBatchTests
);

// =============================================
// STATISTICS & ANALYTICS ROUTES
// =============================================

/**
 * @route   GET /api/batches/:id/statistics
 * @desc    Get batch statistics
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/:id/statistics',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  testBatchController.getBatchStatistics
);

/**
 * @route   POST /api/batches/:id/refresh-stats
 * @desc    Recalculate batch statistics
 * @access  Admin, HOD
 */
router.post(
  '/:id/refresh-stats',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.refreshStatistics
);

/**
 * @route   GET /api/batches/:id/performance
 * @desc    Get detailed performance metrics for batch
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/:id/performance',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  testBatchController.getBatchPerformance
);

// =============================================
// BULK OPERATIONS
// =============================================

/**
 * @route   POST /api/batches/bulk-create
 * @desc    Create multiple batches at once
 * @body    { batches: [] }
 * @access  Admin
 */
router.post(
  '/bulk-create',
  authenticateToken,
  authorizeRoles('admin'),
  testBatchController.bulkCreateBatches
);

/**
 * @route   POST /api/batches/bulk-assign-test
 * @desc    Assign test to multiple batches
 * @body    { testId, batchIds: [] }
 * @access  Admin, HOD
 */
router.post(
  '/bulk-assign-test',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.bulkAssignTest
);

/**
 * @route   POST /api/batches/:id/activate
 * @desc    Activate batch
 * @access  Admin, HOD
 */
router.post(
  '/:id/activate',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.activateBatch
);

/**
 * @route   POST /api/batches/:id/deactivate
 * @desc    Deactivate batch
 * @access  Admin, HOD
 */
router.post(
  '/:id/deactivate',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.deactivateBatch
);

/**
 * @route   POST /api/batches/:id/archive
 * @desc    Archive batch
 * @access  Admin, HOD
 */
router.post(
  '/:id/archive',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.archiveBatch
);

// =============================================
// EXPORT ROUTES
// =============================================

/**
 * @route   GET /api/batches/:id/export
 * @desc    Export batch data to Excel
 * @query   includeTests, includeStats
 * @access  Admin, HOD, Faculty
 */
router.get(
  '/:id/export',
  authenticateToken,
  authorizeRoles('admin', 'hod', 'faculty'),
  testBatchController.exportBatchData
);

// =============================================
// UTILITY ROUTES
// =============================================

/**
 * @route   GET /api/batches/search/students
 * @desc    Search for students to add to batch
 * @query   search, course, department, semester, passoutYear
 * @access  Admin, HOD
 */
router.get(
  '/search/students',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.searchStudents
);

/**
 * @route   GET /api/batches/check-code/:batchCode
 * @desc    Check if batch code is available
 * @access  Admin, HOD
 */
router.get(
  '/check-code/:batchCode',
  authenticateToken,
  authorizeRoles('admin', 'hod'),
  testBatchController.checkBatchCodeAvailability
);

module.exports = router;
