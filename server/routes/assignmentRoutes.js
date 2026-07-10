const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { academicUpload, handleMulterError } = require('../middleware/academicUpload');
const ctrl = require('../controllers/assignmentController');

const staff = authorizeRoles('admin', 'hod', 'faculty');

// List (role-aware: students see their class's published assignments)
router.get('/', authenticateToken, ctrl.listAssignments);

// Student's own grade history (must be declared before '/:id')
router.get('/my/grades', authenticateToken, authorizeRoles('student'), ctrl.getMyGrades);

// Create (faculty/hod/admin)
router.post('/', authenticateToken, staff, ctrl.createAssignment);

// Single assignment
router.get('/:id', authenticateToken, ctrl.getAssignment);
router.put('/:id', authenticateToken, staff, ctrl.updateAssignment);
router.delete('/:id', authenticateToken, staff, ctrl.deleteAssignment);

// Student submits a handwritten/typed file -> AI evaluates
router.post('/:id/submit', authenticateToken, authorizeRoles('student'), academicUpload, handleMulterError, ctrl.submitAssignment);

// Staff: view submissions, re-evaluate, override, export
router.get('/:id/submissions', authenticateToken, staff, ctrl.getSubmissions);
router.get('/:id/export', authenticateToken, staff, ctrl.exportSubmissions);
router.post('/submissions/:submissionId/reevaluate', authenticateToken, staff, ctrl.reevaluateSubmission);
router.put('/submissions/:submissionId/score', authenticateToken, staff, ctrl.overrideScore);

module.exports = router;
