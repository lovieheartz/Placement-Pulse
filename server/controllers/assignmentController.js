const path = require('path');
const ExcelJS = require('exceljs');
const prisma = require('../lib/prisma');
const storageService = require('../services/storageService');
const { evaluateSubmission } = require('../services/assignmentEvaluationService');

const ROLE_MODEL = { admin: 'Admin', faculty: 'Faculty', hod: 'HOD' };

// Resolve the creator's course/department scope from their own profile.
async function getCreatorScope(user) {
  if (user.role === 'faculty') {
    const f = await prisma.faculty.findUnique({ where: { id: user.id } });
    return { course: f?.course, department: f?.department, name: f?.name };
  }
  if (user.role === 'hod') {
    const h = await prisma.hOD.findUnique({ where: { id: user.id } });
    return { course: h?.course, department: h?.department, name: h?.name };
  }
  const a = await prisma.admin.findUnique({ where: { id: user.id } }).catch(() => null);
  return { course: null, department: null, name: a?.name || 'Admin' };
}

// Was the submission on or before the deadline? (no deadline => always on time)
function isOnTime(submittedAt, dueDate) {
  if (!dueDate) return true;
  return new Date(submittedAt).getTime() <= new Date(dueDate).getTime();
}

function mimeFromName(name) {
  const ext = path.extname(name || '').toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

// POST /api/assignments  (faculty/hod/admin)
exports.createAssignment = async (req, res) => {
  try {
    const { title, description, instructions, questions, totalMarks, dueDate } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required.' });

    const scope = await getCreatorScope(req.user);
    // Admin may target a specific course/department via the body; faculty/hod use their own.
    const course = (req.user.role === 'admin' ? req.body.course : scope.course) || req.body.course;
    const department = (req.user.role === 'admin' ? req.body.department : scope.department) || req.body.department;

    if (!course || !department) {
      return res.status(400).json({ success: false, message: 'Course and department are required to target students.' });
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description: description || null,
        instructions: instructions || null,
        questions: Array.isArray(questions) ? questions : (questions || null),
        totalMarks: totalMarks != null ? Number(totalMarks) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        course,
        department,
        attachmentUrl: req.body.attachmentUrl || null,
        createdBy: req.user.id,
        createdByModel: ROLE_MODEL[req.user.role] || 'Faculty',
        createdByName: scope.name || null,
        status: req.body.status === 'draft' ? 'draft' : 'published',
      },
    });

    res.status(201).json({ success: true, message: 'Assignment created.', data: assignment });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create assignment.' });
  }
};

// GET /api/assignments  (role-aware)
exports.listAssignments = async (req, res) => {
  try {
    let where = {};
    if (req.user.role === 'student') {
      const s = await prisma.student.findUnique({ where: { id: req.user.id } });
      where = { course: s?.course, department: s?.branch, status: 'published' };
    } else if (req.user.role === 'faculty' || req.user.role === 'hod') {
      const scope = await getCreatorScope(req.user);
      where = { course: scope.course, department: scope.department };
    } // admin: all

    const assignments = await prisma.assignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Attach submission info.
    const ids = assignments.map((a) => a.id);
    const subs = ids.length
      ? await prisma.assignmentSubmission.findMany({ where: { assignmentId: { in: ids } } })
      : [];

    let data;
    if (req.user.role === 'student') {
      const mine = new Map(subs.filter((x) => x.studentId === req.user.id).map((x) => [x.assignmentId, x]));
      data = assignments.map((a) => ({ ...a, mySubmission: mine.get(a.id) || null }));
    } else {
      const counts = subs.reduce((m, x) => {
        const c = m.get(x.assignmentId) || { total: 0, evaluated: 0 };
        c.total += 1;
        if (x.status === 'evaluated') c.evaluated += 1;
        m.set(x.assignmentId, c);
        return m;
      }, new Map());
      data = assignments.map((a) => ({ ...a, submissionStats: counts.get(a.id) || { total: 0, evaluated: 0 } }));
    }

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('List assignments error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to load assignments.' });
  }
};

// GET /api/assignments/:id
exports.getAssignment = async (req, res) => {
  try {
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ success: false, message: 'Failed to load assignment.' });
  }
};

// PUT /api/assignments/:id  (creator or admin)
exports.updateAssignment = async (req, res) => {
  try {
    const existing = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    if (req.user.role !== 'admin' && existing.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only edit your own assignments.' });
    }
    const { title, description, instructions, questions, totalMarks, dueDate, status } = req.body;
    const data = {};
    if (title != null) data.title = title;
    if (description !== undefined) data.description = description;
    if (instructions !== undefined) data.instructions = instructions;
    if (questions !== undefined) data.questions = questions;
    if (totalMarks !== undefined) data.totalMarks = totalMarks != null ? Number(totalMarks) : null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (status != null) data.status = status;

    const updated = await prisma.assignment.update({ where: { id: req.params.id }, data });
    res.status(200).json({ success: true, message: 'Assignment updated.', data: updated });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ success: false, message: 'Failed to update assignment.' });
  }
};

// DELETE /api/assignments/:id  (creator or admin)
exports.deleteAssignment = async (req, res) => {
  try {
    const existing = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    if (req.user.role !== 'admin' && existing.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own assignments.' });
    }
    await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: req.params.id } });
    await prisma.assignment.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true, message: 'Assignment deleted.' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete assignment.' });
  }
};

// POST /api/assignments/:id/submit  (student, multipart 'document')
// Uploads the handwritten submission, then evaluates it with AI.
exports.submitAssignment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });

    const student = await prisma.student.findUnique({ where: { id: req.user.id } });
    // Scope check: student's course/branch must match the assignment target.
    if (student && (student.course !== assignment.course || student.branch !== assignment.department)) {
      return res.status(403).json({ success: false, message: 'This assignment is not for your class.' });
    }

    // Persist the file to storage.
    const { publicUrl } = await storageService.uploadMulterFile(req.file, storageService.FOLDERS.SUBMISSION);

    // Evaluate with AI (best-effort — never lose the submission if AI fails).
    let evalResult = null;
    let status = 'submitted';
    try {
      evalResult = await evaluateSubmission(req.file.buffer, req.file.mimetype, assignment);
      status = 'evaluated';
    } catch (e) {
      console.error('AI evaluation failed:', e.message);
      status = 'error';
    }

    // Upsert by (assignmentId, studentId): one live submission per student.
    const prior = await prisma.assignmentSubmission.findFirst({
      where: { assignmentId: assignment.id, studentId: req.user.id },
    });

    const dataFields = {
      assignmentId: assignment.id,
      studentId: req.user.id,
      studentName: student?.name || null,
      studentEmail: student?.email || null,
      fileUrl: publicUrl,
      fileName: req.file.originalname,
      status,
      aiScore: evalResult?.score ?? null,
      aiMaxScore: evalResult?.maxScore ?? null,
      aiPercentage: evalResult?.percentage ?? null,
      aiFeedback: evalResult?.feedback ?? null,
      aiBreakdown: evalResult?.breakdown ?? null,
      aiExtractedText: evalResult?.extractedText ?? null,
      evaluatedAt: evalResult ? new Date() : null,
    };

    let submission;
    if (prior) {
      submission = await prisma.assignmentSubmission.update({ where: { id: prior.id }, data: dataFields });
    } else {
      submission = await prisma.assignmentSubmission.create({ data: dataFields });
    }

    res.status(200).json({
      success: true,
      message: status === 'evaluated' ? 'Submitted and evaluated by AI.' : 'Submitted (AI evaluation could not be completed).',
      data: submission,
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to submit assignment.' });
  }
};

// GET /api/assignments/my/grades  (student) — all of a student's graded submissions.
exports.getMyGrades = async (req, res) => {
  try {
    const subs = await prisma.assignmentSubmission.findMany({
      where: { studentId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    const ids = [...new Set(subs.map((s) => s.assignmentId))];
    const assignments = ids.length
      ? await prisma.assignment.findMany({ where: { id: { in: ids } } })
      : [];
    const aMap = new Map(assignments.map((a) => [a.id, a]));

    const data = subs.map((s) => {
      const a = aMap.get(s.assignmentId);
      return {
        ...s,
        assignmentTitle: a?.title || 'Assignment',
        totalMarks: a?.totalMarks ?? s.aiMaxScore ?? null,
        dueDate: a?.dueDate || null,
        onTime: isOnTime(s.createdAt, a?.dueDate),
      };
    });

    const graded = data.filter((d) => d.aiPercentage != null);
    const avg = graded.length
      ? Math.round((graded.reduce((sum, d) => sum + d.aiPercentage, 0) / graded.length) * 10) / 10
      : null;

    res.status(200).json({ success: true, count: data.length, averagePercentage: avg, data });
  } catch (error) {
    console.error('Get my grades error:', error);
    res.status(500).json({ success: false, message: 'Failed to load grades.' });
  }
};

// GET /api/assignments/:id/submissions  (faculty/hod/admin)
exports.getSubmissions = async (req, res) => {
  try {
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });

    const rows = await prisma.assignmentSubmission.findMany({
      where: { assignmentId: req.params.id },
      orderBy: { aiPercentage: 'desc' },
    });
    const submissions = rows.map((s) => ({ ...s, onTime: isOnTime(s.createdAt, assignment.dueDate) }));
    res.status(200).json({ success: true, assignment, count: submissions.length, data: submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ success: false, message: 'Failed to load submissions.' });
  }
};

// POST /api/assignments/submissions/:submissionId/reevaluate  (faculty/hod/admin)
exports.reevaluateSubmission = async (req, res) => {
  try {
    const sub = await prisma.assignmentSubmission.findUnique({ where: { id: req.params.submissionId } });
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found.' });
    const assignment = await prisma.assignment.findUnique({ where: { id: sub.assignmentId } });

    const buffer = await storageService.downloadBuffer(sub.fileUrl);
    const evalResult = await evaluateSubmission(buffer, mimeFromName(sub.fileName), assignment);

    const updated = await prisma.assignmentSubmission.update({
      where: { id: sub.id },
      data: {
        status: 'evaluated',
        aiScore: evalResult.score,
        aiMaxScore: evalResult.maxScore,
        aiPercentage: evalResult.percentage,
        aiFeedback: evalResult.feedback,
        aiBreakdown: evalResult.breakdown,
        aiExtractedText: evalResult.extractedText,
        evaluatedAt: new Date(),
      },
    });
    res.status(200).json({ success: true, message: 'Re-evaluated.', data: updated });
  } catch (error) {
    console.error('Re-evaluate error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to re-evaluate.' });
  }
};

// PUT /api/assignments/submissions/:submissionId/score  (faculty override)
exports.overrideScore = async (req, res) => {
  try {
    const { score, feedback } = req.body;
    const sub = await prisma.assignmentSubmission.findUnique({ where: { id: req.params.submissionId } });
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found.' });
    const updated = await prisma.assignmentSubmission.update({
      where: { id: sub.id },
      data: {
        aiScore: score != null ? Number(score) : sub.aiScore,
        aiPercentage: (score != null && sub.aiMaxScore) ? Math.round((Number(score) / sub.aiMaxScore) * 1000) / 10 : sub.aiPercentage,
        aiFeedback: feedback != null ? feedback : sub.aiFeedback,
        status: 'evaluated',
      },
    });
    res.status(200).json({ success: true, message: 'Score updated.', data: updated });
  } catch (error) {
    console.error('Override score error:', error);
    res.status(500).json({ success: false, message: 'Failed to update score.' });
  }
};

// GET /api/assignments/:id/export  (faculty/hod/admin) -> .xlsx
exports.exportSubmissions = async (req, res) => {
  try {
    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId: req.params.id },
      orderBy: { aiPercentage: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Placement Pulse';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Submissions');

    sheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Student Name', key: 'name', width: 26 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Out Of', key: 'max', width: 10 },
      { header: 'Percentage', key: 'pct', width: 12 },
      { header: 'On Time', key: 'onTime', width: 10 },
      { header: 'AI Feedback', key: 'feedback', width: 60 },
      { header: 'Submitted At', key: 'submittedAt', width: 22 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    submissions.forEach((s, i) => {
      sheet.addRow({
        rank: i + 1,
        name: s.studentName || '',
        email: s.studentEmail || '',
        status: s.status,
        score: s.aiScore ?? '',
        max: s.aiMaxScore ?? assignment.totalMarks ?? '',
        pct: s.aiPercentage != null ? `${s.aiPercentage}%` : '',
        onTime: assignment.dueDate ? (isOnTime(s.createdAt, assignment.dueDate) ? 'Yes' : 'No') : 'N/A',
        feedback: s.aiFeedback || '',
        submittedAt: s.createdAt ? new Date(s.createdAt).toLocaleString() : '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const safeTitle = (assignment.title || 'assignment').replace(/[^a-z0-9]/gi, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_submissions_${Date.now()}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Export submissions error:', error);
    res.status(500).json({ success: false, message: 'Failed to export submissions.' });
  }
};
