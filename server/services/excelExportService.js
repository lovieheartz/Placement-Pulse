const ExcelJS = require('exceljs');
const prisma = require('../lib/prisma');

/**
 * Generate Excel file for test results
 * @param {string} testId - Test ID
 * @param {string} batchId - Optional batch ID to filter
 * @returns {Promise<Buffer>} - Excel file buffer
 */
exports.generateTestResultsExcel = async (testId, batchId = null) => {
  try {
    // Fetch test details
    const test = await prisma.aptitudeTest.findUnique({ where: { id: testId } });

    if (!test) {
      throw new Error('Test not found');
    }

    // Attach assigned batches (name/code only)
    if (Array.isArray(test.assignedBatches) && test.assignedBatches.length) {
      const assignedBatches = await prisma.testBatch.findMany({
        where: { id: { in: test.assignedBatches } }
      });
      const assignedBatchMap = new Map(assignedBatches.map((b) => [b.id, b]));
      test.assignedBatches = test.assignedBatches.map((bid) => {
        const b = assignedBatchMap.get(bid);
        return b ? { id: b.id, batchName: b.batchName, batchCode: b.batchCode } : bid;
      });
    }

    // Fetch attempts
    const query = {
      testId,
      status: 'completed',
      isDeleted: false
    };

    if (batchId) {
      query.batchId = batchId;
    }

    const attempts = await prisma.testAttempt.findMany({
      where: query,
      orderBy: [{ score: 'desc' }, { timeTaken: 'asc' }]
    });

    // Manually populate studentId (name email universityRollNumber branch course passoutYear semester)
    const studentIds = [...new Set(attempts.map((a) => a.studentId).filter(Boolean))];
    const studentMap = new Map();
    if (studentIds.length) {
      const students = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: {
          id: true,
          name: true,
          email: true,
          universityRollNumber: true,
          branch: true,
          course: true,
          passoutYear: true,
          semester: true
        }
      });
      students.forEach((s) => studentMap.set(s.id, s));
    }

    // Manually populate batchId (batchName batchCode)
    const attemptBatchIds = [...new Set(attempts.map((a) => a.batchId).filter(Boolean))];
    const batchMap = new Map();
    if (attemptBatchIds.length) {
      const batches = await prisma.testBatch.findMany({
        where: { id: { in: attemptBatchIds } },
        select: { id: true, batchName: true, batchCode: true }
      });
      batches.forEach((b) => batchMap.set(b.id, b));
    }

    attempts.forEach((attempt) => {
      attempt.studentId = attempt.studentId ? studentMap.get(attempt.studentId) || null : null;
      attempt.batchId = attempt.batchId ? batchMap.get(attempt.batchId) || null : null;
    });

    // Fetch questions
    const questions = await prisma.testQuestion.findMany({
      where: {
        testId,
        isActive: true
      },
      orderBy: { questionNumber: 'asc' }
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Placement Portal';
    workbook.created = new Date();

    // Sheet 1: Student Results
    await createResultsSheet(workbook, test, attempts, questions);

    // Sheet 2: Batch-wise Summary
    await createBatchSummarySheet(workbook, test, attempts);

    // Sheet 3: Question-wise Analysis
    await createQuestionAnalysisSheet(workbook, test, questions, attempts);

    // Sheet 4: Proctoring Report
    await createProctoringReportSheet(workbook, test, attempts);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return buffer;

  } catch (error) {
    console.error('Error generating Excel:', error);
    throw new Error(`Failed to generate Excel: ${error.message}`);
  }
};

/**
 * Create main results sheet
 */
async function createResultsSheet(workbook, test, attempts, questions) {
  const sheet = workbook.addWorksheet('Student Results');

  // Define columns
  const columns = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Student Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'University Roll', key: 'rollNumber', width: 15 },
    { header: 'Branch', key: 'branch', width: 15 },
    { header: 'Course', key: 'course', width: 10 },
    { header: 'Batch', key: 'batch', width: 20 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Total Marks', key: 'totalMarks', width: 12 },
    { header: 'Percentage', key: 'percentage', width: 12 },
    { header: 'Pass/Fail', key: 'result', width: 10 },
    { header: 'Correct', key: 'correct', width: 10 },
    { header: 'Wrong', key: 'wrong', width: 10 },
    { header: 'Skipped', key: 'skipped', width: 10 },
    { header: 'Time Taken (min)', key: 'timeTaken', width: 15 },
    { header: 'Tab Switches', key: 'tabSwitches', width: 12 },
    { header: 'Submitted At', key: 'submittedAt', width: 20 }
  ];

  sheet.columns = columns;

  // Style header row
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  attempts.forEach((attempt, index) => {
    const student = attempt.studentId;
    const row = sheet.addRow({
      rank: attempt.rank || index + 1,
      name: student.name,
      email: student.email,
      rollNumber: student.universityRollNumber,
      branch: student.branch,
      course: student.course,
      batch: attempt.batchId ? attempt.batchId.batchName : 'N/A',
      score: attempt.score,
      totalMarks: test.totalMarks,
      percentage: attempt.percentage.toFixed(2) + '%',
      result: attempt.passed ? 'PASS' : 'FAIL',
      correct: attempt.totalCorrect,
      wrong: attempt.totalWrong,
      skipped: attempt.totalSkipped,
      timeTaken: attempt.timeTaken,
      tabSwitches: attempt.proctoring.tabSwitchCount,
      submittedAt: attempt.submittedAt ? attempt.submittedAt.toLocaleString() : 'N/A'
    });

    // Color code pass/fail
    const resultCell = row.getCell('result');
    resultCell.font = { bold: true, color: { argb: attempt.passed ? 'FF00B050' : 'FFFF0000' } };
  });

  // Add borders
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * Create batch summary sheet
 */
async function createBatchSummarySheet(workbook, test, attempts) {
  const sheet = workbook.addWorksheet('Batch Summary');

  // Group attempts by batch
  const batchMap = new Map();

  attempts.forEach(attempt => {
    const batchId = attempt.batchId ? attempt.batchId.id : 'Unknown';
    const batchName = attempt.batchId ? attempt.batchId.batchName : 'Unknown';

    if (!batchMap.has(batchId)) {
      batchMap.set(batchId, {
        batchName,
        attempts: [],
        scores: [],
        passCount: 0,
        failCount: 0
      });
    }

    const batchData = batchMap.get(batchId);
    batchData.attempts.push(attempt);
    batchData.scores.push(attempt.score);
    if (attempt.passed) batchData.passCount++;
    else batchData.failCount++;
  });

  // Define columns
  sheet.columns = [
    { header: 'Batch Name', key: 'batchName', width: 25 },
    { header: 'Total Students', key: 'total', width: 15 },
    { header: 'Appeared', key: 'appeared', width: 12 },
    { header: 'Passed', key: 'passed', width: 10 },
    { header: 'Failed', key: 'failed', width: 10 },
    { header: 'Pass %', key: 'passPercent', width: 10 },
    { header: 'Avg Score', key: 'avgScore', width: 12 },
    { header: 'Highest', key: 'highest', width: 10 },
    { header: 'Lowest', key: 'lowest', width: 10 }
  ];

  // Style header
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' }
  };

  // Add batch data
  for (const [batchId, data] of batchMap) {
    const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    const highest = Math.max(...data.scores);
    const lowest = Math.min(...data.scores);
    const passPercent = (data.passCount / data.attempts.length) * 100;

    // Get batch total students
    const batch = batchId === 'Unknown'
      ? null
      : await prisma.testBatch.findUnique({ where: { id: batchId } });
    const totalStudents = batch ? batch.studentCount : data.attempts.length;

    sheet.addRow({
      batchName: data.batchName,
      total: totalStudents,
      appeared: data.attempts.length,
      passed: data.passCount,
      failed: data.failCount,
      passPercent: passPercent.toFixed(2) + '%',
      avgScore: avgScore.toFixed(2),
      highest,
      lowest
    });
  }

  // Add borders
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * Create question analysis sheet
 */
async function createQuestionAnalysisSheet(workbook, test, questions, attempts) {
  const sheet = workbook.addWorksheet('Question Analysis');

  sheet.columns = [
    { header: 'Q#', key: 'qNum', width: 6 },
    { header: 'Question', key: 'question', width: 50 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Difficulty', key: 'difficulty', width: 12 },
    { header: 'Attempts', key: 'attempts', width: 10 },
    { header: 'Correct', key: 'correct', width: 10 },
    { header: 'Wrong', key: 'wrong', width: 10 },
    { header: 'Skipped', key: 'skipped', width: 10 },
    { header: 'Accuracy %', key: 'accuracy', width: 12 }
  ];

  // Style header
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' }
  };

  // Add question data
  questions.forEach(q => {
    const correctCount = q.stats.correctAttempts || 0;
    const wrongCount = q.stats.wrongAttempts || 0;
    const skippedCount = q.stats.skippedAttempts || 0;
    const totalAttempts = q.stats.totalAttempts || 0;
    const accuracy = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;

    sheet.addRow({
      qNum: q.questionNumber,
      question: q.questionText.substring(0, 100) + (q.questionText.length > 100 ? '...' : ''),
      category: q.category,
      difficulty: q.difficultyLevel,
      attempts: totalAttempts,
      correct: correctCount,
      wrong: wrongCount,
      skipped: skippedCount,
      accuracy: accuracy.toFixed(2) + '%'
    });
  });

  // Add borders
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * Create proctoring report sheet
 */
async function createProctoringReportSheet(workbook, test, attempts) {
  const sheet = workbook.addWorksheet('Proctoring Report');

  sheet.columns = [
    { header: 'Student Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Batch', key: 'batch', width: 20 },
    { header: 'Tab Switches', key: 'tabSwitches', width: 15 },
    { header: 'Fullscreen Exits', key: 'fullscreenExits', width: 17 },
    { header: 'Snapshots Captured', key: 'snapshots', width: 18 },
    { header: 'Violation Severity', key: 'severity', width: 18 },
    { header: 'Auto-Submitted', key: 'autoSubmitted', width: 15 },
    { header: 'IP Address', key: 'ipAddress', width: 18 }
  ];

  // Style header
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE74C3C' }
  };

  // Add proctoring data
  attempts.forEach(attempt => {
    const row = sheet.addRow({
      name: attempt.studentId.name,
      email: attempt.studentId.email,
      batch: attempt.batchId ? attempt.batchId.batchName : 'N/A',
      tabSwitches: attempt.proctoring.tabSwitchCount,
      fullscreenExits: attempt.proctoring.fullscreenExitCount,
      snapshots: attempt.proctoring.cameraSnapshots.length,
      severity: attempt.proctoring.violationSeverity.toUpperCase(),
      autoSubmitted: attempt.proctoring.autoSubmittedDueToViolation ? 'YES' : 'NO',
      ipAddress: attempt.proctoring.browserInfo.ipAddress || 'N/A'
    });

    // Color code severity
    const severityCell = row.getCell('severity');
    if (attempt.proctoring.violationSeverity === 'critical') {
      severityCell.font = { bold: true, color: { argb: 'FFFF0000' } };
    } else if (attempt.proctoring.violationSeverity === 'high') {
      severityCell.font = { bold: true, color: { argb: 'FFFF6600' } };
    }
  });

  // Add borders
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

module.exports = exports;
