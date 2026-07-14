// =============================================
// TestAttemptService
// Plain-function ports of the Mongoose instance/static methods that used to
// live on the TestAttempt / TestQuestion / AptitudeTest / TestBatch models.
// Every function operates on a plain Prisma row object, mutates the JSON
// columns (responses / proctoring / reviewStatus / navigationHistory / stats)
// in JS, and persists via prisma.*.update.
//
// Logic is ported EXACTLY from the original Mongoose models. See
// models/TestAttempt.js, models/TestQuestion.js, models/AptitudeTest.js,
// models/TestBatch.js for the originals.
// =============================================

const prisma = require('../lib/prisma');
const { sendTestScoreEmail } = require('./mailService');

// ---------------------------------------------
// JSON-column normalizers
// Prisma Json? columns can be null; the Mongoose subdocuments always existed
// with defaults. Normalize so the ported logic behaves identically.
// ---------------------------------------------

function ensureProctoring(attempt) {
  const p = attempt.proctoring || {};
  return {
    tabSwitches: Array.isArray(p.tabSwitches) ? p.tabSwitches : [],
    tabSwitchCount: typeof p.tabSwitchCount === 'number' ? p.tabSwitchCount : 0,
    cameraSnapshots: Array.isArray(p.cameraSnapshots) ? p.cameraSnapshots : [],
    fullscreenExits: Array.isArray(p.fullscreenExits) ? p.fullscreenExits : [],
    fullscreenExitCount: typeof p.fullscreenExitCount === 'number' ? p.fullscreenExitCount : 0,
    browserInfo: p.browserInfo || {},
    hasViolations: typeof p.hasViolations === 'boolean' ? p.hasViolations : false,
    violationSeverity: p.violationSeverity || 'none',
    autoSubmittedDueToViolation: typeof p.autoSubmittedDueToViolation === 'boolean'
      ? p.autoSubmittedDueToViolation
      : false
  };
}

function ensureReviewStatus(attempt) {
  const r = attempt.reviewStatus || {};
  return {
    isReviewed: typeof r.isReviewed === 'boolean' ? r.isReviewed : false,
    reviewedBy: r.reviewedBy !== undefined ? r.reviewedBy : null,
    reviewedByModel: r.reviewedByModel !== undefined ? r.reviewedByModel : null,
    reviewedAt: r.reviewedAt !== undefined ? r.reviewedAt : null,
    reviewNotes: r.reviewNotes !== undefined ? r.reviewNotes : null,
    flaggedForReview: typeof r.flaggedForReview === 'boolean' ? r.flaggedForReview : false,
    flagReason: r.flagReason !== undefined ? r.flagReason : null
  };
}

function getResponses(attempt) {
  return Array.isArray(attempt.responses) ? attempt.responses : [];
}

function ensureQuestionStats(question) {
  const s = question.stats || {};
  return {
    totalAttempts: typeof s.totalAttempts === 'number' ? s.totalAttempts : 0,
    correctAttempts: typeof s.correctAttempts === 'number' ? s.correctAttempts : 0,
    wrongAttempts: typeof s.wrongAttempts === 'number' ? s.wrongAttempts : 0,
    skippedAttempts: typeof s.skippedAttempts === 'number' ? s.skippedAttempts : 0,
    averageTimeTaken: typeof s.averageTimeTaken === 'number' ? s.averageTimeTaken : 0,
    difficultyScore: typeof s.difficultyScore === 'number' ? s.difficultyScore : 0
  };
}

// ---------------------------------------------
// pre('save') recompute — recomputes stats from `responses`.
// Ported from testAttemptSchema.pre('save'). We ALWAYS recompute (the original
// only recomputed when `responses` was modified, but recomputing on every
// persist is safe & idempotent since it derives purely from `responses`).
// Also refreshes lastActivityAt like the original hook did.
// Returns the fields to merge into the update `data`.
// ---------------------------------------------

function recomputeStats(attempt) {
  const responses = getResponses(attempt);

  const totalAttempted = responses.filter(
    r => r.selectedAnswer && r.selectedAnswer.length > 0
  ).length;
  const totalSkipped = responses.filter(
    r => r.isSkipped || !r.selectedAnswer || r.selectedAnswer.length === 0
  ).length;

  const data = {
    totalAttempted,
    totalSkipped,
    lastActivityAt: new Date()
  };

  if (attempt.status === 'completed') {
    data.totalCorrect = responses.filter(r => r.isCorrect === true).length;
    data.totalWrong = responses.filter(r => r.isCorrect === false && !r.isSkipped).length;
  }

  return data;
}

// =============================================
// TestQuestion instance-method ports
// =============================================

// TestQuestion.checkAnswer
function checkAnswer(question, selectedAnswers) {
  if (!Array.isArray(selectedAnswers)) {
    selectedAnswers = [selectedAnswers];
  }

  const correctSorted = [...(question.correctAnswer || [])].sort();
  const selectedSorted = [...selectedAnswers].sort();

  if (correctSorted.length !== selectedSorted.length) {
    return false;
  }

  return correctSorted.every((ans, index) => ans === selectedSorted[index]);
}

// TestQuestion.calculateMarks
function calculateMarks(question, selectedAnswers, partialMarking = false) {
  if (!selectedAnswers || selectedAnswers.length === 0) {
    return 0; // Skipped question
  }

  const isCorrect = checkAnswer(question, selectedAnswers);

  if (isCorrect) {
    return question.marks; // Full marks
  }

  if (partialMarking && question.questionType === 'multiple-choice') {
    const correctCount = selectedAnswers.filter(ans => question.correctAnswer.includes(ans)).length;
    const wrongCount = selectedAnswers.length - correctCount;

    if (correctCount > 0) {
      const partialScore = (correctCount / question.correctAnswer.length) * question.marks;
      const penalty = wrongCount * question.negativeMarks;
      return Math.max(0, partialScore - penalty);
    }
  }

  return -question.negativeMarks;
}

// TestQuestion.updateStats — mutates a stats object in JS and persists it.
// Returns the new stats object (already written to DB).
async function updateQuestionStats(question, wasCorrect, timeTaken, wasSkipped = false) {
  const stats = ensureQuestionStats(question);

  stats.totalAttempts += 1;

  if (wasSkipped) {
    stats.skippedAttempts += 1;
  } else if (wasCorrect) {
    stats.correctAttempts += 1;
  } else {
    stats.wrongAttempts += 1;
  }

  const totalTime = stats.averageTimeTaken * (stats.totalAttempts - 1) + timeTaken;
  stats.averageTimeTaken = totalTime / stats.totalAttempts;

  if (stats.totalAttempts > 0) {
    const correctRate = stats.correctAttempts / stats.totalAttempts;
    stats.difficultyScore = Math.round((1 - correctRate) * 100);
  }

  await prisma.testQuestion.update({
    where: { id: question.id },
    data: { stats }
  });

  return stats;
}

// =============================================
// AptitudeTest.updateStats port
// =============================================
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
// TestBatch.updateStats port
// =============================================
async function updateBatchStats(batchId) {
  const batch = await prisma.testBatch.findUnique({ where: { id: batchId } });
  if (!batch) return;

  const attempts = await prisma.testAttempt.findMany({
    where: { batchId, status: 'completed' }
  });

  if (attempts.length > 0) {
    const scores = attempts.map(a => a.score);
    const uniqueTests = new Set(attempts.map(a => a.testId.toString()));

    const assignedTests = Array.isArray(batch.assignedTests) ? batch.assignedTests : [];
    const studentCount = batch.studentCount || 0;

    const stats = { ...(batch.stats || {}) };
    stats.completedTests = uniqueTests.size;
    stats.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const expectedAttempts = assignedTests.length * studentCount;
    if (expectedAttempts > 0) {
      stats.participationRate = (attempts.length / expectedAttempts) * 100;
    }

    await prisma.testBatch.update({
      where: { id: batch.id },
      data: { stats }
    });
  }
}

// =============================================
// TestAttempt instance-method ports
// Each takes the attempt row, mutates JSON in JS, persists via update, and
// returns the fresh attempt row (so callers can read updated fields).
// =============================================

// TestAttempt.recordAnswer
async function recordAnswer(attempt, questionId, questionNumber, selectedAnswer, timeTaken = 0) {
  const responses = getResponses(attempt).slice();

  const existingIndex = responses.findIndex(
    r => r.questionId.toString() === questionId.toString()
  );

  const response = {
    questionId,
    questionNumber,
    selectedAnswer: Array.isArray(selectedAnswer) ? selectedAnswer : [selectedAnswer],
    timeTaken,
    answeredAt: new Date(),
    isSkipped: false
  };

  if (existingIndex !== -1) {
    responses[existingIndex] = { ...responses[existingIndex], ...response };
  } else {
    responses.push(response);
  }

  const nextAttempt = { ...attempt, responses };
  const recomputed = recomputeStats(nextAttempt);

  return prisma.testAttempt.update({
    where: { id: attempt.id },
    data: { responses, ...recomputed }
  });
}

// TestAttempt.markForReview
async function markForReview(attempt, questionId) {
  const responses = getResponses(attempt).slice();

  const response = responses.find(
    r => r.questionId.toString() === questionId.toString()
  );

  if (response) {
    response.isMarkedForReview = true;
  } else {
    responses.push({
      questionId,
      isMarkedForReview: true
    });
  }

  const nextAttempt = { ...attempt, responses };
  const recomputed = recomputeStats(nextAttempt);

  return prisma.testAttempt.update({
    where: { id: attempt.id },
    data: { responses, ...recomputed }
  });
}

// TestAttempt.recordTabSwitch
async function recordTabSwitch(attempt, duration = 0) {
  const proctoring = ensureProctoring(attempt);

  proctoring.tabSwitches.push({
    timestamp: new Date(),
    duration,
    returnedAt: duration > 0 ? new Date(Date.now() + duration * 1000) : null
  });

  proctoring.tabSwitchCount += 1;
  proctoring.hasViolations = true;

  if (proctoring.tabSwitchCount >= 5) {
    proctoring.violationSeverity = 'critical';
  } else if (proctoring.tabSwitchCount >= 3) {
    proctoring.violationSeverity = 'high';
  } else if (proctoring.tabSwitchCount >= 2) {
    proctoring.violationSeverity = 'medium';
  } else {
    proctoring.violationSeverity = 'low';
  }

  const nextAttempt = { ...attempt, proctoring };
  const recomputed = recomputeStats(nextAttempt);

  return prisma.testAttempt.update({
    where: { id: attempt.id },
    data: { proctoring, ...recomputed }
  });
}

// TestAttempt.recordFullscreenExit
async function recordFullscreenExit(attempt) {
  const proctoring = ensureProctoring(attempt);

  proctoring.fullscreenExits.push({
    timestamp: new Date()
  });

  proctoring.fullscreenExitCount += 1;
  proctoring.hasViolations = true;

  if (proctoring.fullscreenExitCount >= 3) {
    proctoring.violationSeverity =
      proctoring.violationSeverity === 'critical' ? 'critical' : 'high';
  }

  const nextAttempt = { ...attempt, proctoring };
  const recomputed = recomputeStats(nextAttempt);

  return prisma.testAttempt.update({
    where: { id: attempt.id },
    data: { proctoring, ...recomputed }
  });
}

// TestAttempt.addCameraSnapshot
async function addCameraSnapshot(attempt, filename, path, url) {
  const proctoring = ensureProctoring(attempt);

  proctoring.cameraSnapshots.push({
    timestamp: new Date(),
    filename,
    path,
    url
  });

  const nextAttempt = { ...attempt, proctoring };
  const recomputed = recomputeStats(nextAttempt);

  return prisma.testAttempt.update({
    where: { id: attempt.id },
    data: { proctoring, ...recomputed }
  });
}

// TestAttempt.calculateScore
// Mutates responses (marksAwarded/isCorrect), updates question stats, computes
// score/percentage/passed, and persists. Returns the fresh attempt row.
async function calculateScore(attempt) {
  let totalScore = 0;
  let correctCount = 0;
  let wrongCount = 0;

  const questions = await prisma.testQuestion.findMany({
    where: { testId: attempt.testId, isActive: true }
  });
  const questionMap = new Map(questions.map(q => [q.id.toString(), q]));

  const responses = getResponses(attempt).map(r => ({ ...r }));

  for (const response of responses) {
    const question = questionMap.get(response.questionId.toString());
    if (!question) continue;

    const marks = calculateMarks(question, response.selectedAnswer, false); // partialMarking from test settings

    response.marksAwarded = marks;
    response.isCorrect = marks > 0;

    totalScore += marks;

    if (marks > 0) {
      correctCount++;
    } else if (response.selectedAnswer && response.selectedAnswer.length > 0) {
      wrongCount++;
    }

    // Update question statistics
    const timeTakenSeconds = response.timeTaken || 0;
    await updateQuestionStats(question, response.isCorrect, timeTakenSeconds, response.isSkipped);
  }

  const score = Math.max(0, totalScore); // Ensure score is not negative
  const data = {
    responses,
    score,
    totalCorrect: correctCount,
    totalWrong: wrongCount
  };

  const test = await prisma.aptitudeTest.findUnique({ where: { id: attempt.testId } });
  if (test) {
    data.percentage = (score / test.totalMarks) * 100;
    data.passed = data.percentage >= test.passPercentage;
  }

  // Run pre('save') recompute against the up-to-date attempt state.
  const nextAttempt = { ...attempt, ...data };
  const recomputed = recomputeStats(nextAttempt);
  // recompute may set totalCorrect/totalWrong when status === 'completed';
  // preserve original ordering: pre-save runs last, so it wins (matches Mongoose).
  Object.assign(data, recomputed);

  return prisma.testAttempt.update({
    where: { id: attempt.id },
    data
  });
}

// TestAttempt.submitTest
// Returns the fresh attempt row (completed + scored).
async function submitTest(attempt, submissionType = 'manual') {
  const submittedAt = new Date();
  const startedAt = attempt.startedAt ? new Date(attempt.startedAt) : submittedAt;

  const timeTakenMs = submittedAt - startedAt;
  const timeTaken = Math.round(timeTakenMs / 60000); // Convert to minutes

  // First persist submittedAt / status='submitted' / submissionType / timeTaken.
  let updated = await prisma.testAttempt.update({
    where: { id: attempt.id },
    data: {
      submittedAt,
      status: 'submitted',
      submissionType,
      timeTaken,
      ...recomputeStats(attempt)
    }
  });

  // Calculate score (mutates responses, question stats, score, %, passed).
  updated = await calculateScore(updated);

  // Mark as completed.
  updated = await prisma.testAttempt.update({
    where: { id: updated.id },
    data: {
      status: 'completed',
      ...recomputeStats({ ...updated, status: 'completed' })
    }
  });

  // Update test statistics.
  await updateTestStats(updated.testId);

  // Update batch statistics (only if batchId exists).
  if (updated.batchId) {
    await updateBatchStats(updated.batchId);
  }

  // Compute the rank now so the score email can include it. The controller may call
  // calculateRank again afterwards — it's idempotent.
  try {
    const ranked = await calculateRank(updated);
    updated = ranked.attempt;
  } catch (err) {
    console.error('Rank calculation failed:', err.message);
  }

  // Email the student their score. Fire-and-forget: a mail failure must never
  // fail the submission or slow the response down.
  sendScoreEmail(updated).catch((err) =>
    console.error('Score email failed:', err.message)
  );

  return updated;
}

// Look up the student + test, then send the score report email.
async function sendScoreEmail(attempt) {
  const [student, test] = await Promise.all([
    prisma.student.findUnique({
      where: { id: attempt.studentId },
      select: { name: true, email: true }
    }),
    prisma.aptitudeTest.findUnique({
      where: { id: attempt.testId },
      select: { title: true, totalMarks: true, passPercentage: true }
    })
  ]);

  if (!student?.email || !test) {
    console.warn('Score email skipped: missing student email or test');
    return;
  }
  await sendTestScoreEmail(student, test, attempt);
}

// TestAttempt.calculateRank
// Returns { attempt, rank } where attempt is the fresh row.
async function calculateRank(attempt) {
  const where = {
    testId: attempt.testId,
    status: 'completed',
    score: { gt: attempt.score }
  };

  if (attempt.batchId) {
    where.batchId = attempt.batchId;
  }

  const higherScores = await prisma.testAttempt.count({ where });

  const rank = higherScores + 1;
  const updated = await prisma.testAttempt.update({
    where: { id: attempt.id },
    data: { rank, ...recomputeStats(attempt) }
  });

  return { attempt: updated, rank };
}

// =============================================
// TestAttempt static-method ports
// =============================================

// TestAttempt.getStudentAttempt — findFirst + manual populate of testId/batchId
async function getStudentAttempt(testId, studentId) {
  const attempt = await prisma.testAttempt.findFirst({
    where: { testId, studentId, isDeleted: false }
  });
  if (!attempt) return null;

  attempt.testId = await prisma.aptitudeTest.findUnique({ where: { id: attempt.testId } });
  if (attempt.batchId) {
    attempt.batchId = await prisma.testBatch.findUnique({ where: { id: attempt.batchId } });
  }
  return attempt;
}

// TestAttempt.hasStudentAttempted
async function hasStudentAttempted(testId, studentId) {
  const attempt = await prisma.testAttempt.findFirst({
    where: {
      testId,
      studentId,
      status: { in: ['completed', 'submitted'] }
    }
  });
  return !!attempt;
}

// TestAttempt.getTestRankings — findMany + manual populate of studentId/batchId
async function getTestRankings(testId, batchId = null) {
  const where = {
    testId,
    status: 'completed',
    isDeleted: false
  };

  if (batchId) {
    where.batchId = batchId;
  }

  const attempts = await prisma.testAttempt.findMany({
    where,
    orderBy: [{ score: 'desc' }, { timeTaken: 'asc' }]
  });

  const studentIds = [...new Set(attempts.map(a => a.studentId).filter(Boolean))];
  const batchIds = [...new Set(attempts.map(a => a.batchId).filter(Boolean))];

  const students = studentIds.length
    ? await prisma.student.findMany({ where: { id: { in: studentIds } } })
    : [];
  const batches = batchIds.length
    ? await prisma.testBatch.findMany({ where: { id: { in: batchIds } } })
    : [];

  const studentMap = new Map(students.map(s => [s.id, s]));
  const batchMap = new Map(batches.map(b => [b.id, b]));

  return attempts.map(a => {
    const student = studentMap.get(a.studentId);
    a.studentId = student
      ? {
          id: student.id,
          name: student.name,
          email: student.email,
          universityRollNumber: student.universityRollNumber
        }
      : a.studentId;
    if (a.batchId) {
      const batch = batchMap.get(a.batchId);
      a.batchId = batch ? { id: batch.id, batchName: batch.batchName } : a.batchId;
    }
    return a;
  });
}

module.exports = {
  // helpers
  ensureProctoring,
  ensureReviewStatus,
  recomputeStats,
  // TestQuestion
  checkAnswer,
  calculateMarks,
  updateQuestionStats,
  // stats
  updateTestStats,
  updateBatchStats,
  // TestAttempt instance
  recordAnswer,
  markForReview,
  recordTabSwitch,
  recordFullscreenExit,
  addCameraSnapshot,
  calculateScore,
  submitTest,
  calculateRank,
  // TestAttempt statics
  getStudentAttempt,
  hasStudentAttempted,
  getTestRankings
};
