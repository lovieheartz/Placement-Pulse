const prisma = require('../lib/prisma');
const batchService = require('../services/testBatchService');

// Fields the Mongoose code selected on populated Student docs.
// (universityRollNumber / semester are not columns on the Prisma Student model,
// so they resolve to undefined here — matching the previous select behavior.)
const STUDENT_SELECT_FULL = ['id', 'name', 'email', 'universityRollNumber', 'branch', 'course'];

function pickFields(obj, fields) {
  if (!obj) return obj;
  const out = {};
  for (const f of fields) out[f] = obj[f];
  return out;
}

// =============================================
// CREATE BATCH
// =============================================

exports.createBatch = async (req, res) => {
  try {
    const {
      batchName,
      batchCode,
      description,
      academicYear,
      course,
      department,
      semester,
      passoutYear,
      students,
      autoEnrollmentCriteria,
      settings
    } = req.body;

    // Validate required fields
    if (!batchName || !academicYear || !course || !passoutYear) {
      return res.status(400).json({
        success: false,
        message: 'Please provide batchName, academicYear, course, and passoutYear'
      });
    }

    // Check if batch name already exists
    const existingBatch = await prisma.testBatch.findFirst({ where: { batchName } });
    if (existingBatch) {
      return res.status(400).json({
        success: false,
        message: 'Batch with this name already exists'
      });
    }

    // Build the create payload, then run pre('save') hooks explicitly:
    // compute batchCode when missing and set studentCount to students.length.
    const draft = {
      batchName,
      batchCode,
      description,
      academicYear,
      course,
      department,
      semester,
      passoutYear,
      students: students || [],
      autoEnrollmentCriteria,
      settings,
      createdBy: req.user.id,
      createdByModel: req.user.role === 'admin' ? 'Admin' : 'HOD'
    };

    const computedBatchCode = batchService.computeBatchCode(draft);
    const studentCount = batchService.computeStudentCount(draft);

    // Create batch
    let batch = await prisma.testBatch.create({
      data: {
        batchName: draft.batchName,
        batchCode: computedBatchCode,
        description: draft.description,
        academicYear: draft.academicYear,
        course: draft.course,
        department: draft.department,
        semester: draft.semester,
        passoutYear: draft.passoutYear,
        students: draft.students,
        studentCount,
        autoEnrollmentCriteria: draft.autoEnrollmentCriteria,
        settings: draft.settings,
        createdBy: draft.createdBy,
        createdByModel: draft.createdByModel
      }
    });

    // Auto-enroll students if criteria provided
    if (autoEnrollmentCriteria && autoEnrollmentCriteria.enabled) {
      await batchService.autoEnrollStudents(batch.id);
    }

    // Re-fetch so the response reflects any auto-enrollment changes, then
    // populate students -> name email universityRollNumber
    batch = await prisma.testBatch.findUnique({ where: { id: batch.id } });
    const populatedStudents = await prisma.student.findMany({
      where: { id: { in: batch.students || [] } }
    });
    const studentMap = new Map(populatedStudents.map(s => [s.id, s]));
    batch.students = (batch.students || []).map(id =>
      pickFields(studentMap.get(id) || { id }, ['id', 'name', 'email', 'universityRollNumber'])
    );

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: batch
    });

  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating batch',
      error: error.message
    });
  }
};

// =============================================
// GET ALL BATCHES
// =============================================

exports.getAllBatches = async (req, res) => {
  try {
    const {
      status,
      course,
      department,
      academicYear,
      search,
      page = 1,
      limit = 10,
      sortBy = '-createdAt'
    } = req.query;

    // Build query
    const query = { isDeleted: false };

    if (status) query.status = status;
    if (course) query.course = course;
    if (department) query.department = department;
    if (academicYear) query.academicYear = academicYear;

    // If HOD, only show batches created by them
    if (req.user.role === 'hod') {
      query.createdBy = req.user.id;
    }

    if (search) {
      query.OR = [
        { batchName: { contains: search, mode: 'insensitive' } },
        { batchCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Translate sort string like '-createdAt' / 'createdAt' into Prisma orderBy
    const orderBy = sortBy && sortBy.startsWith('-')
      ? { [sortBy.slice(1)]: 'desc' }
      : { [sortBy]: 'asc' };

    const batches = await prisma.testBatch.findMany({
      where: query,
      orderBy,
      take: limit * 1,
      skip: (page - 1) * limit
    });

    // populate('createdBy', 'name email') — creator may be an Admin or HOD.
    const creatorIds = [...new Set(batches.map(b => b.createdBy).filter(Boolean))];
    if (creatorIds.length) {
      const [admins, hods] = await Promise.all([
        prisma.admin.findMany({ where: { id: { in: creatorIds } } }),
        prisma.hOD.findMany({ where: { id: { in: creatorIds } } })
      ]);
      const creatorMap = new Map();
      admins.forEach(a => creatorMap.set(a.id, a));
      hods.forEach(h => creatorMap.set(h.id, h));
      batches.forEach(b => {
        const c = creatorMap.get(b.createdBy);
        if (c) b.createdBy = pickFields(c, ['id', 'name', 'email']);
      });
    }

    const total = await prisma.testBatch.count({ where: query });

    res.status(200).json({
      success: true,
      data: batches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching batches',
      error: error.message
    });
  }
};

// =============================================
// GET BATCH BY ID
// =============================================

exports.getBatchById = async (req, res) => {
  try {
    const batch = await prisma.testBatch.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // populate('students', 'name email universityRollNumber branch course')
    const populatedStudents = await prisma.student.findMany({
      where: { id: { in: batch.students || [] } }
    });
    const studentMap = new Map(populatedStudents.map(s => [s.id, s]));
    batch.students = (batch.students || []).map(id =>
      pickFields(studentMap.get(id) || { id }, ['id', 'name', 'email', 'universityRollNumber', 'branch', 'course'])
    );

    // populate('assignedTests.testId', 'title duration totalQuestions schedule')
    const testIds = [...new Set((batch.assignedTests || []).map(at => at.testId).filter(Boolean))];
    const tests = testIds.length
      ? await prisma.aptitudeTest.findMany({ where: { id: { in: testIds } } })
      : [];
    const testMap = new Map(tests.map(t => [t.id, t]));
    batch.assignedTests = (batch.assignedTests || []).map(at => ({
      ...at,
      testId: at.testId
        ? pickFields(testMap.get(at.testId) || { id: at.testId }, ['id', 'title', 'duration', 'totalQuestions', 'schedule'])
        : at.testId
    }));

    // populate('createdBy', 'name email')
    let creator = await prisma.admin.findUnique({ where: { id: batch.createdBy } });
    if (!creator) creator = await prisma.hOD.findUnique({ where: { id: batch.createdBy } });
    if (creator) batch.createdBy = pickFields(creator, ['id', 'name', 'email']);

    res.status(200).json({
      success: true,
      data: batch
    });

  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching batch',
      error: error.message
    });
  }
};

// =============================================
// UPDATE BATCH
// =============================================

exports.updateBatch = async (req, res) => {
  try {
    const batch = await prisma.testBatch.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Check if user is creator
    if (batch.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the creator or admin can update this batch'
      });
    }

    const allowedUpdates = [
      'batchName', 'description', 'semester', 'department',
      'settings', 'autoEnrollmentCriteria'
    ];

    const data = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    });

    const updated = await prisma.testBatch.update({
      where: { id: batch.id },
      data
    });

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      data: updated
    });

  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating batch',
      error: error.message
    });
  }
};

// =============================================
// DELETE BATCH
// =============================================

exports.deleteBatch = async (req, res) => {
  try {
    const batch = await prisma.testBatch.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Check if user is creator
    if (batch.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the creator or admin can delete this batch'
      });
    }

    await prisma.testBatch.update({
      where: { id: batch.id },
      data: { isDeleted: true, status: 'archived' }
    });

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting batch',
      error: error.message
    });
  }
};

// =============================================
// ADD STUDENTS
// =============================================

exports.addStudents = async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide student IDs array'
      });
    }

    const batch = await prisma.testBatch.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const updated = await batchService.addStudents(batch, studentIds);

    res.status(200).json({
      success: true,
      message: `${studentIds.length} students added successfully`,
      data: updated
    });

  } catch (error) {
    console.error('Error adding students:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding students',
      error: error.message
    });
  }
};

// =============================================
// ADD ALL MATCHING STUDENTS TO BATCH
// =============================================

exports.addAllMatchingStudents = async (req, res) => {
  try {
    const batch = await prisma.testBatch.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Build query based on batch properties
    const query = {};
    if (batch.course) query.course = batch.course;
    if (batch.department) query.branch = batch.department;
    if (batch.passoutYear) query.passoutYear = batch.passoutYear;

    console.log('Finding students with criteria:', query);

    // Find all matching students
    const matchingStudents = await prisma.student.findMany({ where: query });

    console.log('Found matching students:', matchingStudents.length);

    if (matchingStudents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found matching batch criteria',
        criteria: query
      });
    }

    // Add all students to batch
    const studentIds = matchingStudents.map(s => s.id);
    let updated = await batchService.addStudents(batch, studentIds);

    // populate('students', 'name email universityRollNumber')
    const populatedStudents = await prisma.student.findMany({
      where: { id: { in: updated.students || [] } }
    });
    const studentMap = new Map(populatedStudents.map(s => [s.id, s]));
    updated.students = (updated.students || []).map(id =>
      pickFields(studentMap.get(id) || { id }, ['id', 'name', 'email', 'universityRollNumber'])
    );

    res.status(200).json({
      success: true,
      message: `${studentIds.length} students added to batch successfully`,
      data: updated
    });

  } catch (error) {
    console.error('Error adding all students:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding all students',
      error: error.message
    });
  }
};

// =============================================
// REMOVE STUDENTS
// =============================================

exports.removeStudents = async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide student IDs array'
      });
    }

    const batch = await prisma.testBatch.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const updated = await batchService.removeStudents(batch, studentIds);

    res.status(200).json({
      success: true,
      message: `${studentIds.length} students removed successfully`,
      data: updated
    });

  } catch (error) {
    console.error('Error removing students:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing students',
      error: error.message
    });
  }
};

// =============================================
// GET BATCH STUDENTS
// =============================================

exports.getBatchStudents = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const batch = await prisma.testBatch.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    let query = { id: { in: batch.students || [] } };

    if (search) {
      // NOTE: universityRollNumber is not a Prisma Student column; only the
      // name/email conditions remain (mirrors the prior select behavior).
      query.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const students = await prisma.student.findMany({
      where: query,
      orderBy: { name: 'asc' },
      take: limit * 1,
      skip: (page - 1) * limit
    });
    // .select('name email universityRollNumber branch course semester')
    const shaped = students.map(s =>
      pickFields(s, ['id', 'name', 'email', 'universityRollNumber', 'branch', 'course', 'semester'])
    );

    const total = await prisma.student.count({ where: query });

    res.status(200).json({
      success: true,
      data: shaped,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching batch students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching batch students',
      error: error.message
    });
  }
};

// =============================================
// AUTO ENROLL STUDENTS
// =============================================

exports.autoEnrollStudents = async (req, res) => {
  try {
    const batch = await prisma.testBatch.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const updatedBatch = await batchService.autoEnrollStudents(batch.id);

    res.status(200).json({
      success: true,
      message: 'Students auto-enrolled successfully',
      data: updatedBatch
    });

  } catch (error) {
    console.error('Error auto-enrolling students:', error);
    res.status(500).json({
      success: false,
      message: 'Error auto-enrolling students',
      error: error.message
    });
  }
};

// =============================================
// ASSIGN TEST
// =============================================

exports.assignTest = async (req, res) => {
  try {
    const { testId, customSchedule } = req.body;

    if (!testId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide test ID'
      });
    }

    const batch = await prisma.testBatch.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const test = await prisma.aptitudeTest.findUnique({ where: { id: testId } });
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    const updated = await batchService.assignTest(batch, testId, customSchedule);

    // Also add batch to test's assignedBatches
    if (!(test.assignedBatches || []).includes(batch.id)) {
      const assignedBatches = [...(test.assignedBatches || []), batch.id];
      await prisma.aptitudeTest.update({
        where: { id: test.id },
        data: { assignedBatches }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Test assigned successfully',
      data: updated
    });

  } catch (error) {
    console.error('Error assigning test:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error assigning test',
      error: error.message
    });
  }
};

// =============================================
// REMOVE TEST
// =============================================

exports.removeTest = async (req, res) => {
  try {
    const batch = await prisma.testBatch.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const updated = await batchService.removeTest(batch, req.params.testId);

    // Also remove batch from test
    const test = await prisma.aptitudeTest.findUnique({ where: { id: req.params.testId } });
    if (test) {
      const assignedBatches = (test.assignedBatches || []).filter(
        id => id.toString() !== batch.id.toString()
      );
      await prisma.aptitudeTest.update({
        where: { id: test.id },
        data: { assignedBatches }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Test removed successfully',
      data: updated
    });

  } catch (error) {
    console.error('Error removing test:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing test',
      error: error.message
    });
  }
};

// =============================================
// GET BATCH TESTS
// =============================================

exports.getBatchTests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const batch = await prisma.testBatch.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // populate('assignedTests.testId')
    const testIds = [...new Set((batch.assignedTests || []).map(at => at.testId).filter(Boolean))];
    const testDocs = testIds.length
      ? await prisma.aptitudeTest.findMany({ where: { id: { in: testIds } } })
      : [];
    const testMap = new Map(testDocs.map(t => [t.id, t]));

    let tests = (batch.assignedTests || []).map(at => ({
      ...(testMap.get(at.testId) || {}),
      assignedAt: at.assignedAt,
      customSchedule: at.customSchedule
    }));

    if (status) {
      tests = tests.filter(t => t.status === status);
    }

    const total = tests.length;
    const startIndex = (page - 1) * limit;
    const paginatedTests = tests.slice(startIndex, startIndex + limit);

    res.status(200).json({
      success: true,
      data: paginatedTests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching batch tests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching batch tests',
      error: error.message
    });
  }
};

// =============================================
// GET BATCH STATISTICS
// =============================================

exports.getBatchStatistics = async (req, res) => {
  try {
    const batch = await prisma.testBatch.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    res.status(200).json({
      success: true,
      data: batch.stats
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

// =============================================
// REFRESH STATISTICS
// =============================================

exports.refreshStatistics = async (req, res) => {
  try {
    const batch = await prisma.testBatch.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    await batchService.updateStats(batch);

    res.status(200).json({
      success: true,
      message: 'Statistics refreshed successfully',
      data: batch.stats
    });

  } catch (error) {
    console.error('Error refreshing statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing statistics',
      error: error.message
    });
  }
};

// Additional utility functions for remaining routes...
exports.getBatchPerformance = async (req, res) => {
  try {
    const batch = await prisma.testBatch.findUnique({ where: { id: req.params.id } });
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const attempts = await prisma.testAttempt.findMany({
      where: { batchId: batch.id, status: 'completed' }
    });

    // populate('testId', 'title totalMarks')
    const testIds = [...new Set(attempts.map(a => a.testId).filter(Boolean))];
    const tests = testIds.length
      ? await prisma.aptitudeTest.findMany({ where: { id: { in: testIds } } })
      : [];
    const testMap = new Map(tests.map(t => [t.id, t]));

    // populate('studentId', 'name email')
    const studentIds = [...new Set(attempts.map(a => a.studentId).filter(Boolean))];
    const students = studentIds.length
      ? await prisma.student.findMany({ where: { id: { in: studentIds } } })
      : [];
    const studentMap = new Map(students.map(s => [s.id, s]));

    attempts.forEach(a => {
      const t = testMap.get(a.testId);
      if (t) a.testId = pickFields(t, ['id', 'title', 'totalMarks']);
      const s = studentMap.get(a.studentId);
      if (s) a.studentId = pickFields(s, ['id', 'name', 'email']);
    });

    const performance = {
      batchInfo: { batchName: batch.batchName, studentCount: batch.studentCount },
      attempts,
      stats: batch.stats
    };

    res.status(200).json({ success: true, data: performance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkCreateBatches = async (req, res) => {
  try {
    const { batches } = req.body;
    const createdBatches = [];
    // insertMany equivalent — run pre('save') hooks (batchCode + studentCount)
    // for each row, mirroring the model behavior.
    for (const b of batches) {
      const draft = {
        ...b,
        createdBy: req.user.id,
        createdByModel: req.user.role === 'admin' ? 'Admin' : 'HOD'
      };
      const batchCode = batchService.computeBatchCode(draft);
      const studentCount = batchService.computeStudentCount(draft);
      const created = await prisma.testBatch.create({
        data: { ...draft, batchCode, studentCount }
      });
      createdBatches.push(created);
    }
    res.status(201).json({ success: true, data: createdBatches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkAssignTest = async (req, res) => {
  try {
    const { testId, batchIds } = req.body;
    for (const batchId of batchIds) {
      const batch = await prisma.testBatch.findUnique({ where: { id: batchId } });
      if (batch) await batchService.assignTest(batch, testId);
    }
    res.status(200).json({ success: true, message: 'Test assigned to all batches' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.activateBatch = async (req, res) => {
  try {
    const batch = await prisma.testBatch.findUnique({ where: { id: req.params.id } });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    const updated = await prisma.testBatch.update({
      where: { id: batch.id },
      data: { status: 'active' }
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deactivateBatch = async (req, res) => {
  try {
    const batch = await prisma.testBatch.findUnique({ where: { id: req.params.id } });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    const updated = await prisma.testBatch.update({
      where: { id: batch.id },
      data: { status: 'inactive' }
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.archiveBatch = async (req, res) => {
  try {
    const batch = await prisma.testBatch.findUnique({ where: { id: req.params.id } });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    const updated = await prisma.testBatch.update({
      where: { id: batch.id },
      data: { status: 'archived' }
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportBatchData = async (req, res) => {
  try {
    // This would use excelExportService - placeholder for now
    res.status(200).json({ success: true, message: 'Export functionality coming soon' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchStudents = async (req, res) => {
  try {
    const { search, course, department, semester, passoutYear } = req.query;
    const query = {};
    if (search) query.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
    if (course) query.course = course;
    if (department) query.branch = department;
    // NOTE: semester is not a Prisma Student column; omitted from the where.
    // passoutYear is an Int column — coerce the query string.
    if (passoutYear) query.passoutYear = parseInt(passoutYear, 10);

    const students = await prisma.student.findMany({ where: query, take: 50 });
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.checkBatchCodeAvailability = async (req, res) => {
  try {
    const batch = await prisma.testBatch.findFirst({ where: { batchCode: req.params.batchCode } });
    res.status(200).json({ success: true, available: !batch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
