// =============================================
// TestAnalyticsService
// Plain-function ports of the Mongoose statics that lived on the TestAnalytics
// model. The originals were Mongo aggregations/queries + JS reducers; here we
// load rows via prisma.*.findMany and compute in JS. Every analytics group is a
// JSON column, written via prisma.testAnalytics.upsert({ where: { testId } }).
//
// Logic is ported EXACTLY from models/TestAnalytics.js.
// =============================================

const prisma = require('../lib/prisma');

// ---------------------------------------------
// proctoring is a JSON column on TestAttempt; the Mongoose subdocument always
// existed with defaults. Normalize so the ported reducers behave identically.
// ---------------------------------------------
function proctoringOf(attempt) {
  const p = attempt.proctoring || {};
  return {
    tabSwitchCount: typeof p.tabSwitchCount === 'number' ? p.tabSwitchCount : 0,
    fullscreenExitCount: typeof p.fullscreenExitCount === 'number' ? p.fullscreenExitCount : 0,
    autoSubmittedDueToViolation: !!p.autoSubmittedDueToViolation,
    hasViolations: !!p.hasViolations,
    violationSeverity: p.violationSeverity || 'none'
  };
}

// ---------------------------------------------
// TestAnalytics.calculateStandardDeviation
// ---------------------------------------------
function calculateStandardDeviation(values) {
  if (values.length === 0) return 0;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;

  return Math.sqrt(avgSquareDiff);
}

// ---------------------------------------------
// TestAnalytics.calculateScoreDistribution
// ---------------------------------------------
function calculateScoreDistribution(scores, totalCount) {
  const ranges = ['0-20', '20-40', '40-60', '60-80', '80-100'];
  const distribution = ranges.map(range => {
    const [min, max] = range.split('-').map(Number);
    const count = scores.filter(s => s >= min && s < max).length;
    return {
      range,
      count,
      percentage: totalCount > 0 ? (count / totalCount) * 100 : 0
    };
  });

  return distribution;
}

// ---------------------------------------------
// TestAnalytics.calculateBatchPerformance
// `batches` are plain TestBatch rows (studentCount is a column).
// ---------------------------------------------
async function calculateBatchPerformance(testId, batches) {
  const batchPerformance = [];

  for (const batch of batches) {
    const batchAttempts = await prisma.testAttempt.findMany({
      where: {
        testId,
        batchId: batch.id,
        isDeleted: false
      }
    });

    const completedAttempts = batchAttempts.filter(a => a.status === 'completed');
    const scores = completedAttempts.map(a => a.score);
    const passCount = completedAttempts.filter(a => a.passed).length;

    batchPerformance.push({
      batchId: batch.id,
      batchName: batch.batchName,
      totalStudents: batch.studentCount,
      attemptedCount: batchAttempts.length,
      completedCount: completedAttempts.length,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      passRate: completedAttempts.length > 0 ? (passCount / completedAttempts.length) * 100 : 0,
      participationRate: batch.studentCount > 0 ? (batchAttempts.length / batch.studentCount) * 100 : 0
    });
  }

  return batchPerformance;
}

// ---------------------------------------------
// TestAnalytics.calculateQuestionAnalytics
// stats is a JSON column on TestQuestion.
// ---------------------------------------------
async function calculateQuestionAnalytics(testId) {
  const questions = await prisma.testQuestion.findMany({
    where: { testId, isActive: true }
  });

  const questionAnalytics = questions.map(q => {
    const stats = q.stats || {};
    const totalAttempts = stats.totalAttempts || 0;
    const correctAttempts = stats.correctAttempts || 0;
    return {
      questionId: q.id,
      questionNumber: q.questionNumber,
      totalAttempts,
      correctCount: correctAttempts,
      wrongCount: stats.wrongAttempts || 0,
      skippedCount: stats.skippedAttempts || 0,
      correctRate: totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0,
      averageTimeTaken: stats.averageTimeTaken || 0,
      difficultyScore: stats.difficultyScore || 0,
      discriminationIndex: 0 // TODO: Implement discrimination index calculation
    };
  });

  return questionAnalytics;
}

// ---------------------------------------------
// TestAnalytics.calculateProctoringStats
// ---------------------------------------------
function calculateProctoringStats(attempts) {
  const totalViolations = attempts.reduce((sum, a) => {
    const p = proctoringOf(a);
    return sum + p.tabSwitchCount + p.fullscreenExitCount;
  }, 0);

  const tabSwitchViolations = attempts.reduce((sum, a) => sum + proctoringOf(a).tabSwitchCount, 0);
  const fullscreenExitViolations = attempts.reduce((sum, a) => sum + proctoringOf(a).fullscreenExitCount, 0);
  const autoSubmissions = attempts.filter(a => proctoringOf(a).autoSubmittedDueToViolation).length;
  const studentsWithViolations = attempts.filter(a => proctoringOf(a).hasViolations).length;

  return {
    totalViolations,
    tabSwitchViolations,
    fullscreenExitViolations,
    autoSubmissionsDueToViolations: autoSubmissions,
    studentsWithViolations,
    violationRate: attempts.length > 0 ? (studentsWithViolations / attempts.length) * 100 : 0
  };
}

// ---------------------------------------------
// TestAnalytics.calculateViolationDistribution
// ---------------------------------------------
function calculateViolationDistribution(attempts) {
  const severities = ['none', 'low', 'medium', 'high', 'critical'];

  return severities.map(severity => ({
    severity,
    count: attempts.filter(a => proctoringOf(a).violationSeverity === severity).length
  }));
}

// ---------------------------------------------
// TestAnalytics.calculateSubmissionTimeline
// submittedAt is a DateTime column (may come back as Date or ISO string).
// ---------------------------------------------
function calculateSubmissionTimeline(attempts) {
  const timeline = {};

  attempts.forEach(attempt => {
    if (attempt.submittedAt) {
      const submittedAt = new Date(attempt.submittedAt);
      const hour = submittedAt.getHours();
      const date = new Date(submittedAt);
      date.setMinutes(0, 0, 0);

      const key = date.toISOString();

      if (!timeline[key]) {
        timeline[key] = {
          hour,
          date,
          submissionCount: 0
        };
      }

      timeline[key].submissionCount += 1;
    }
  });

  return Object.values(timeline).sort((a, b) => a.date - b.date);
}

// ---------------------------------------------
// TestAnalytics.calculateForTest
// Loads test + attempts (with manual student/batch populate), computes all
// analytics groups in JS, then upserts the TestAnalytics row (JSON columns).
// On error, records calculationStatus='error' + calculationError and rethrows.
// ---------------------------------------------
async function calculateForTest(testId) {
  try {
    const test = await prisma.aptitudeTest.findUnique({ where: { id: testId } });
    if (!test) {
      throw new Error('Test not found');
    }

    // populate('assignedBatches') — assignedBatches is a String[] of batch ids.
    const assignedBatchIds = Array.isArray(test.assignedBatches) ? test.assignedBatches : [];
    const assignedBatches = assignedBatchIds.length
      ? await prisma.testBatch.findMany({ where: { id: { in: assignedBatchIds } } })
      : [];

    const attempts = await prisma.testAttempt.findMany({
      where: { testId, isDeleted: false }
    });

    // populate('studentId').populate('batchId') — attach for topPerformers.
    const studentIds = [...new Set(attempts.map(a => a.studentId).filter(Boolean))];
    const students = studentIds.length
      ? await prisma.student.findMany({ where: { id: { in: studentIds } } })
      : [];
    const studentMap = new Map(students.map(s => [s.id, s]));
    attempts.forEach(a => {
      a.studentId = studentMap.get(a.studentId) || { id: a.studentId };
    });

    const completedAttempts = attempts.filter(a => a.status === 'completed');
    const inProgressAttempts = attempts.filter(a => a.status === 'in-progress');

    // Calculate overall stats.
    let totalStudentsAssigned = assignedBatches.reduce((sum, batch) => sum + batch.studentCount, 0);

    // Tests are usually targeted via `recipients` (course/branch/passoutYear), not batches.
    // Without this fallback totalStudentsAssigned stays 0, which made notStartedCount go negative
    // and participationRate always read 0%.
    if (totalStudentsAssigned === 0 && test.recipients?.students) {
      const r = test.recipients.students;
      const where = { isVerified: true };
      if (!r.all) {
        if (Array.isArray(r.courses) && r.courses.length) where.course = { in: r.courses };
        if (Array.isArray(r.branches) && r.branches.length) where.branch = { in: r.branches };
        if (Array.isArray(r.passoutYears) && r.passoutYears.length) where.passoutYear = { in: r.passoutYears };
      }
      totalStudentsAssigned = await prisma.student.count({ where });
    }

    const overallStats = {
      totalStudentsAssigned,
      totalAttempts: attempts.length,
      completedAttempts: completedAttempts.length,
      inProgressAttempts: inProgressAttempts.length,
      notStartedCount: Math.max(0, totalStudentsAssigned - attempts.length),
      participationRate: totalStudentsAssigned > 0 ? (attempts.length / totalStudentsAssigned) * 100 : 0,
      completionRate: attempts.length > 0 ? (completedAttempts.length / attempts.length) * 100 : 0
    };

    // Calculate score statistics
    const scores = completedAttempts.map(a => a.score).sort((a, b) => a - b);
    const passCount = completedAttempts.filter(a => a.passed).length;

    const scoreStats = {
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      medianScore: scores.length > 0 ? scores[Math.floor(scores.length / 2)] : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : null,
      standardDeviation: calculateStandardDeviation(scores),
      passCount,
      failCount: completedAttempts.length - passCount,
      passRate: completedAttempts.length > 0 ? (passCount / completedAttempts.length) * 100 : 0
    };

    // Calculate score distribution
    const scoreDistribution = calculateScoreDistribution(scores, completedAttempts.length);

    // Calculate time statistics
    const times = completedAttempts.map(a => a.timeTaken).sort((a, b) => a - b);
    const timeStats = {
      averageTimeTaken: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      medianTimeTaken: times.length > 0 ? times[Math.floor(times.length / 2)] : 0,
      fastestCompletion: times.length > 0 ? Math.min(...times) : 0,
      slowestCompletion: times.length > 0 ? Math.max(...times) : 0,
      averageTimePerQuestion: times.length > 0 && test.totalQuestions > 0
        ? (times.reduce((a, b) => a + b, 0) / times.length / test.totalQuestions) * 60 // Convert to seconds
        : 0
    };

    // Calculate batch-wise performance
    const batchPerformance = await calculateBatchPerformance(testId, assignedBatches);

    // Calculate question-wise analytics
    const questionAnalytics = await calculateQuestionAnalytics(testId);

    // Get top performers
    const topPerformers = completedAttempts
      .sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken)
      .slice(0, 10)
      .map((attempt, index) => ({
        studentId: attempt.studentId.id,
        attemptId: attempt.id,
        score: attempt.score,
        percentage: attempt.percentage,
        rank: index + 1,
        timeTaken: attempt.timeTaken
      }));

    // Calculate proctoring statistics
    const proctoringStats = calculateProctoringStats(completedAttempts);

    // Calculate violation distribution
    const violationDistribution = calculateViolationDistribution(completedAttempts);

    // Calculate submission timeline
    const submissionTimeline = calculateSubmissionTimeline(completedAttempts);

    // Create or update analytics document
    const payload = {
      testId,
      overallStats,
      scoreStats,
      scoreDistribution,
      timeStats,
      batchPerformance,
      questionAnalytics,
      topPerformers,
      proctoringStats,
      violationDistribution,
      submissionTimeline,
      lastCalculated: new Date(),
      calculationStatus: 'completed'
    };

    const analytics = await prisma.testAnalytics.upsert({
      where: { testId },
      create: payload,
      update: payload
    });

    return analytics;

  } catch (error) {
    // Record error
    await prisma.testAnalytics.upsert({
      where: { testId },
      create: {
        testId,
        calculationStatus: 'error',
        calculationError: error.message
      },
      update: {
        calculationStatus: 'error',
        calculationError: error.message
      }
    });

    throw error;
  }
}

module.exports = {
  calculateForTest,
  calculateStandardDeviation,
  calculateScoreDistribution,
  calculateBatchPerformance,
  calculateQuestionAnalytics,
  calculateProctoringStats,
  calculateViolationDistribution,
  calculateSubmissionTimeline
};
