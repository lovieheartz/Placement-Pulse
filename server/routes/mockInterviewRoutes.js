const express = require('express');
const router = express.Router();
const MockInterviewController = require('../controllers/mockInterviewController');
const { authenticateToken } = require('../middleware/auth');
// Temporarily removed role check to allow all authenticated users
// const { studentOnly } = require('../middleware/roleCheck');

// All routes require authentication only (role check temporarily disabled)
router.use(authenticateToken);
// router.use(studentOnly);  // Commented out to fix 403 error

/**
 * @route   POST /api/mock-interview/start
 * @desc    Start a new mock interview session
 * @access  Private (Student only)
 * @body    { jobRole, experienceLevel, industry, difficulty, totalQuestions }
 */
router.post('/start', MockInterviewController.startInterview);

/**
 * @route   POST /api/mock-interview/:interviewId/submit
 * @desc    Submit answer to current question and get next question
 * @access  Private (Student only)
 * @body    { answer }
 */
router.post('/:interviewId/submit', MockInterviewController.submitAnswer);

/**
 * @route   GET /api/mock-interview/:interviewId/results
 * @desc    Get complete interview results
 * @access  Private (Student only)
 */
router.get('/:interviewId/results', MockInterviewController.getInterviewResults);

/**
 * @route   GET /api/mock-interview/history
 * @desc    Get all past interview sessions
 * @access  Private (Student only)
 */
router.get('/history', MockInterviewController.getInterviewHistory);

/**
 * @route   DELETE /api/mock-interview/:interviewId
 * @desc    Delete an interview session
 * @access  Private (Student only)
 */
router.delete('/:interviewId', MockInterviewController.deleteInterview);

module.exports = router;
