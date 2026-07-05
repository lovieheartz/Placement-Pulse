// =============================================
// AptitudeTestService
// Plain-function ports of the Mongoose instance/static methods that used to
// live on the AptitudeTest / TestQuestion models, plus the TestBatch methods
// the aptitude-test controller invokes (assignTest / removeTest /
// notifyStudentsAboutTest).
//
// Every function operates on a plain Prisma row object. JSON columns
// (schedule / stats / settings / recipients / options / correctAnswer stats
// etc.) are read/written as plain JS objects. Logic is ported EXACTLY from the
// original Mongoose models. See models/AptitudeTest.js, models/TestQuestion.js,
// models/TestBatch.js for the originals.
// =============================================

const prisma = require('../lib/prisma');

// ---------------------------------------------
// schedule is a JSON column: { startDate, endDate }. In Mongo these were Date
// objects; from Prisma JSON they may come back as ISO strings. Normalize to
// Date for comparisons — the ORIGINAL logic compared Date objects.
// ---------------------------------------------
function scheduleStart(test) {
  const s = test.schedule || {};
  return s.startDate != null ? new Date(s.startDate) : null;
}

function scheduleEnd(test) {
  const s = test.schedule || {};
  return s.endDate != null ? new Date(s.endDate) : null;
}

// =============================================
// AptitudeTest instance-method ports
// =============================================

// AptitudeTest.isActive
function isActive(test) {
  const now = new Date();
  return test.status === 'published' &&
         scheduleStart(test) <= now &&
         scheduleEnd(test) >= now;
}

// AptitudeTest.isUpcoming
function isUpcoming(test) {
  const now = new Date();
  return test.status === 'published' && scheduleStart(test) > now;
}

// AptitudeTest.isExpired
function isExpired(test) {
  const now = new Date();
  return scheduleEnd(test) < now;
}

// AptitudeTest.updateStats — recomputes `stats` JSON from completed attempts.
// Ported from aptitudeTestSchema.methods.updateStats. Takes a test id, loads
// the row, mutates stats in JS, persists via prisma.aptitudeTest.update.
async function updateTestStats(testId) {
  const test = await prisma.aptitudeTest.findUnique({ where: { id: testId } });
  if (!test) return;

  const attempts = await prisma.testAttempt.findMany({
    where: { testId, status: 'completed' }
  });

  if (attempts.length > 0) {
    const scores = attempts.map(a => a.score);
    const times = attempts.map(a => a.timeTaken);
    const passCount = attempts.filter(a => a.passed).length;

    const stats = {
      ...(test.stats || {}),
      totalAttempts: attempts.length,
      completedAttempts: attempts.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      averageTimeTaken: times.reduce((a, b) => a + b, 0) / times.length,
      passRate: (passCount / attempts.length) * 100
    };

    await prisma.aptitudeTest.update({
      where: { id: test.id },
      data: { stats }
    });
  }
}

// =============================================
// AptitudeTest static-method ports
// =============================================

// AptitudeTest.getActiveTests — schedule.startDate/endDate live inside the
// JSON `schedule` column, so Postgres range filters aren't available. Load
// published, non-deleted tests and filter in JS (identical semantics).
async function getActiveTests() {
  const now = new Date();
  const tests = await prisma.aptitudeTest.findMany({
    where: { status: 'published', isDeleted: false }
  });
  return tests.filter(t => scheduleStart(t) <= now && scheduleEnd(t) >= now);
}

// ---------------------------------------------
// Pre-validate: end date must be after start date.
// Ported from aptitudeTestSchema.pre('validate'). Throws on invalid so the
// controller can surface a 400. Returns silently when schedule/parts missing
// (matches the original guard `if (this.schedule && start && end)`).
// ---------------------------------------------
function validateSchedule(schedule) {
  if (schedule && schedule.startDate && schedule.endDate) {
    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    if (end <= start) {
      const err = new Error('End date must be after start date');
      err.statusCode = 400;
      throw err;
    }
  }
}

// =============================================
// TestQuestion static-method ports
// =============================================

// TestQuestion.getTestQuestions
async function getTestQuestions(testId, shuffle = false) {
  let questions = await prisma.testQuestion.findMany({
    where: { testId, isActive: true },
    orderBy: { questionNumber: 'asc' }
  });

  if (shuffle) {
    questions = questions.sort(() => Math.random() - 0.5);
    // Reassign question numbers after shuffle
    questions = questions.map((q, index) => {
      q.questionNumber = index + 1;
      return q;
    });
  }

  return questions;
}

// TestQuestion.getTestQuestionStats — was a Mongo aggregation grouping by
// difficultyLevel. Reimplemented in JS over findMany results, preserving the
// same output shape: [{ _id: difficultyLevel, count, avgCorrectRate, avgTimeTaken }].
async function getTestQuestionStats(testId) {
  const questions = await prisma.testQuestion.findMany({
    where: { testId, isActive: true }
  });

  const groups = new Map();

  for (const q of questions) {
    const key = q.difficultyLevel;
    if (!groups.has(key)) {
      groups.set(key, { correctRates: [], times: [], count: 0 });
    }
    const g = groups.get(key);
    g.count += 1;

    const stats = q.stats || {};
    const totalAttempts = stats.totalAttempts || 0;
    const correctAttempts = stats.correctAttempts || 0;
    // $cond: totalAttempts > 0 ? correctAttempts/totalAttempts : 0
    g.correctRates.push(totalAttempts > 0 ? correctAttempts / totalAttempts : 0);
    g.times.push(stats.averageTimeTaken || 0);
  }

  const avg = arr => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  return Array.from(groups.entries()).map(([difficultyLevel, g]) => ({
    _id: difficultyLevel,
    count: g.count,
    avgCorrectRate: avg(g.correctRates),
    avgTimeTaken: avg(g.times)
  }));
}

// =============================================
// TestBatch method ports (used by the aptitude-test controller)
// Ported from testBatchSchema.methods. Operate on a plain batch row, mutate
// the JSON `assignedTests`/`stats` columns, persist via prisma.testBatch.update.
// =============================================

// TestBatch.notifyStudentsAboutTest
async function notifyBatchStudentsAboutTest(batch, testId) {
  try {
    const test = await prisma.aptitudeTest.findUnique({ where: { id: testId } });
    if (!test) return;

    const schedule = test.schedule || {};
    const endDate = schedule.endDate ? new Date(schedule.endDate) : null;

    const notification = await prisma.notification.create({
      data: {
        title: `New Aptitude Test Assigned: ${test.title}`,
        description: `An aptitude test has been assigned to your batch. Test Duration: ${test.duration} minutes. Total Questions: ${test.totalQuestions}. Please complete the test before ${endDate ? endDate.toLocaleString() : ''}.`,
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

// TestBatch.assignTest — mutates assignedTests JSON + stats.totalTests, then
// optionally notifies (settings.notifyStudentsOnAssignment). Throws if already
// assigned, exactly like the original.
async function assignTestToBatch(batch, testId, customSchedule = null) {
  const assignedTests = Array.isArray(batch.assignedTests) ? batch.assignedTests.slice() : [];

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

  const stats = { ...(batch.stats || {}), totalTests: assignedTests.length };

  const updated = await prisma.testBatch.update({
    where: { id: batch.id },
    data: { assignedTests, stats }
  });

  // Send notification to students if enabled
  const settings = batch.settings || {};
  if (settings.notifyStudentsOnAssignment) {
    await notifyBatchStudentsAboutTest(updated, testId);
  }

  return updated;
}

// TestBatch.removeTest
async function removeTestFromBatch(batch, testId) {
  const assignedTests = (Array.isArray(batch.assignedTests) ? batch.assignedTests : []).filter(
    at => at.testId.toString() !== testId.toString()
  );

  const stats = { ...(batch.stats || {}), totalTests: assignedTests.length };

  return prisma.testBatch.update({
    where: { id: batch.id },
    data: { assignedTests, stats }
  });
}

module.exports = {
  // schedule helpers
  scheduleStart,
  scheduleEnd,
  // AptitudeTest instance
  isActive,
  isUpcoming,
  isExpired,
  updateTestStats,
  // AptitudeTest statics / validation
  getActiveTests,
  validateSchedule,
  // TestQuestion statics
  getTestQuestions,
  getTestQuestionStats,
  // TestBatch method ports
  notifyBatchStudentsAboutTest,
  assignTestToBatch,
  removeTestFromBatch
};
