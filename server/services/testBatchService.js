// TestBatch service — plain-function ports of the Mongoose TestBatch model
// methods (instance methods + statics + pre('save') hooks), persisting via Prisma.
// Logic mirrors server/models/TestBatch.js exactly.

const prisma = require('../lib/prisma');

// ---------------------------------------------------------------------------
// pre('save') hooks (run explicitly before create/update)
// ---------------------------------------------------------------------------

// Auto-generate batch code if not provided.
// Mirrors: pre('save') { if (!this.batchCode && this.course && this.passoutYear) ... }
function computeBatchCode(batch) {
  if (!batch.batchCode && batch.course && batch.passoutYear) {
    const courseCode = batch.course.substring(0, 3).toUpperCase();
    const deptCode = batch.department ? batch.department.substring(0, 3).toUpperCase() : 'GEN';
    const year = batch.passoutYear.toString().slice(-2);
    return `${courseCode}${deptCode}${year}`;
  }
  return batch.batchCode;
}

// Update student count when students array changes.
// Mirrors: pre('save') { this.studentCount = this.students.length; }
function computeStudentCount(batch) {
  return (batch.students || []).length;
}

// ---------------------------------------------------------------------------
// Instance methods
// ---------------------------------------------------------------------------

// Method to add students to batch
async function addStudents(batch, studentIds) {
  if (!Array.isArray(studentIds)) {
    studentIds = [studentIds];
  }

  const students = [...(batch.students || [])];

  // Add only unique students
  studentIds.forEach(id => {
    if (!students.includes(id)) {
      students.push(id);
    }
  });

  const studentCount = students.length;

  const updated = await prisma.testBatch.update({
    where: { id: batch.id },
    data: { students, studentCount }
  });

  return updated;
}

// Method to remove students from batch
async function removeStudents(batch, studentIds) {
  if (!Array.isArray(studentIds)) {
    studentIds = [studentIds];
  }

  const students = (batch.students || []).filter(id => !studentIds.includes(id.toString()));
  const studentCount = students.length;

  const updated = await prisma.testBatch.update({
    where: { id: batch.id },
    data: { students, studentCount }
  });

  return updated;
}

// Method to assign test to batch
async function assignTest(batch, testId, customSchedule = null) {
  const assignedTests = [...(batch.assignedTests || [])];

  // Check if test already assigned
  const existingAssignment = assignedTests.find(
    at => at.testId.toString() === testId.toString()
  );

  if (existingAssignment) {
    throw new Error('Test is already assigned to this batch');
  }

  assignedTests.push({
    testId,
    assignedAt: new Date(),
    customSchedule
  });

  const stats = { ...(batch.stats || {}) };
  stats.totalTests = assignedTests.length;

  const updated = await prisma.testBatch.update({
    where: { id: batch.id },
    data: { assignedTests, stats }
  });

  // Send notification to students if enabled
  if (updated.settings && updated.settings.notifyStudentsOnAssignment) {
    await notifyStudentsAboutTest(updated, testId);
  }

  return updated;
}

// Method to remove test from batch
async function removeTest(batch, testId) {
  const assignedTests = (batch.assignedTests || []).filter(
    at => at.testId.toString() !== testId.toString()
  );

  const stats = { ...(batch.stats || {}) };
  stats.totalTests = assignedTests.length;

  const updated = await prisma.testBatch.update({
    where: { id: batch.id },
    data: { assignedTests, stats }
  });

  return updated;
}

// Method to notify students about test assignment
async function notifyStudentsAboutTest(batch, testId) {
  try {
    const test = await prisma.aptitudeTest.findUnique({ where: { id: testId } });
    if (!test) return;

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        title: `New Aptitude Test Assigned: ${test.title}`,
        description: `An aptitude test has been assigned to your batch. Test Duration: ${test.duration} minutes. Total Questions: ${test.totalQuestions}. Please complete the test before ${new Date(test.schedule.endDate).toLocaleString()}.`,
        type: 'message',
        recipients: {
          students: {
            all: false,
            batches: [batch.id]
          }
        },
        createdBy: test.createdBy,
        createdByModel: test.createdByModel,
        priority: 'high'
      }
    });

    return notification;
  } catch (error) {
    console.error('Error notifying students about test:', error);
  }
}

// Method to update batch statistics
async function updateStats(batch) {
  // Get all test attempts for this batch
  const attempts = await prisma.testAttempt.findMany({
    where: {
      batchId: batch.id,
      status: 'completed'
    }
  });

  if (attempts.length > 0) {
    const scores = attempts.map(a => a.score);
    const uniqueTests = new Set(attempts.map(a => a.testId.toString()));

    const stats = { ...(batch.stats || {}) };
    stats.completedTests = uniqueTests.size;
    stats.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Calculate participation rate
    const expectedAttempts = (batch.assignedTests || []).length * batch.studentCount;
    if (expectedAttempts > 0) {
      stats.participationRate = (attempts.length / expectedAttempts) * 100;
    }

    const updated = await prisma.testBatch.update({
      where: { id: batch.id },
      data: { stats }
    });

    // reflect the updated stats back onto the passed object (mirrors this.save())
    batch.stats = updated.stats;
    return updated;
  }

  return batch;
}

// ---------------------------------------------------------------------------
// Statics
// ---------------------------------------------------------------------------

// Static method to get active batches
function getActiveBatches() {
  return prisma.testBatch.findMany({
    where: {
      status: 'active',
      isDeleted: false
    },
    orderBy: { createdAt: 'desc' }
  });
}

// Static method to get batches for a specific test
function getBatchesForTest(testId) {
  // 'assignedTests.testId' membership: assignedTests is a JSON array of
  // { testId, ... }. Fetch active, non-deleted batches then filter in JS.
  return prisma.testBatch
    .findMany({
      where: {
        status: 'active',
        isDeleted: false
      }
    })
    .then(batches =>
      batches.filter(b =>
        (b.assignedTests || []).some(at => at.testId && at.testId.toString() === testId.toString())
      )
    );
}

// Static method to auto-enroll students based on criteria
async function autoEnrollStudents(batchId) {
  const batch = await prisma.testBatch.findUnique({ where: { id: batchId } });
  if (!batch || !batch.autoEnrollmentCriteria || !batch.autoEnrollmentCriteria.enabled) {
    return batch;
  }

  const criteria = batch.autoEnrollmentCriteria;

  // Build query based on criteria
  const query = {};
  if (criteria.course) query.course = criteria.course;
  if (criteria.department) query.branch = criteria.department;
  // NOTE: `semester` is not a column on the Prisma Student model, so this
  // criterion resolves to nothing (matching the previous select/query behavior).
  if (criteria.passoutYear) query.passoutYear = criteria.passoutYear;

  // Find matching students
  const eligibleStudents = await prisma.student.findMany({ where: query });

  // Add students to batch
  const newStudentIds = eligibleStudents
    .map(s => s.id)
    .filter(id => !(batch.students || []).some(existingId => existingId.toString() === id.toString()));

  if (newStudentIds.length > 0) {
    return await addStudents(batch, newStudentIds);
  }

  return batch;
}

module.exports = {
  computeBatchCode,
  computeStudentCount,
  addStudents,
  removeStudents,
  assignTest,
  removeTest,
  notifyStudentsAboutTest,
  updateStats,
  getActiveBatches,
  getBatchesForTest,
  autoEnrollStudents
};
