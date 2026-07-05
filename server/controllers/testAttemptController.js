const prisma = require('../lib/prisma');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const storageService = require('../services/storageService');
const attemptService = require('../services/testAttemptService');

// Fields the Mongoose code selected on populated Student docs.
// (universityRollNumber is not a column in the Prisma Student model, so it
// resolves to undefined here — matching the previous select behavior.)
const STUDENT_PUBLIC_FIELDS = ['id', 'name', 'email', 'universityRollNumber'];

function pickStudent(student) {
  if (!student) return student;
  const out = {};
  for (const f of STUDENT_PUBLIC_FIELDS) out[f] = student[f];
  return out;
}

// =============================================
// START ATTEMPT
// =============================================

exports.startAttempt = async (req, res) => {
  try {
    const testId = req.params.testId;
    const studentId = req.user.id;

    // Check if test exists and is published
    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: testId,
        status: 'published',
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found or not published'
      });
    }

    // Check if student already has an attempt
    const existingAttempt = await prisma.testAttempt.findFirst({
      where: {
        testId,
        studentId,
        isDeleted: false
      }
    });

    if (existingAttempt) {
      if (existingAttempt.status === 'completed' || existingAttempt.status === 'submitted') {
        return res.status(400).json({
          success: false,
          message: 'You have already completed this test'
        });
      }

      if (existingAttempt.status === 'in-progress' || existingAttempt.status === 'paused' || existingAttempt.status === 'not-started') {
        console.log('Resuming existing attempt:', existingAttempt.id);

        // Get questions for this test
        let questions = await prisma.testQuestion.findMany({
          where: {
            testId: test.id,
            isActive: true
          },
          orderBy: { questionNumber: 'asc' }
        });

        // Shuffle questions if enabled (but keep same order for resumed attempts)
        if (test.settings && test.settings.shuffleQuestions && existingAttempt.status === 'not-started') {
          questions = questions.sort(() => Math.random() - 0.5);
        }

        // Shuffle options if enabled (but keep same order for resumed attempts)
        if (test.settings && test.settings.shuffleOptions && existingAttempt.status === 'not-started') {
          questions = questions.map(q => {
            const question = { ...q };
            question.options = [...question.options].sort(() => Math.random() - 0.5);
            return question;
          });
        }

        // Remove correct answers from response
        const questionsForStudent = questions.map(q => {
          const question = { ...q };
          delete question.correctAnswer;
          delete question.explanation;
          delete question.stats;
          return question;
        });

        // Populate the test details in attempt
        existingAttempt.testId = test;

        // Update status to in-progress if it was not-started or paused
        if (existingAttempt.status !== 'in-progress') {
          const updated = await prisma.testAttempt.update({
            where: { id: existingAttempt.id },
            data: { status: 'in-progress', startedAt: new Date() }
          });
          existingAttempt.status = updated.status;
          existingAttempt.startedAt = updated.startedAt;
        }

        return res.status(200).json({
          success: true,
          message: 'Resuming existing attempt',
          data: {
            attempt: existingAttempt,
            questions: questionsForStudent
          }
        });
      }
    }

    // Check test schedule
    const now = new Date();
    if (new Date(test.schedule.startDate) > now) {
      return res.status(400).json({
        success: false,
        message: 'Test has not started yet'
      });
    }

    if (new Date(test.schedule.endDate) < now) {
      return res.status(400).json({
        success: false,
        message: 'Test has expired'
      });
    }

    // Check student eligibility based on recipients
    const student = await prisma.student.findUnique({ where: { id: studentId } });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log('=== START TEST ELIGIBILITY CHECK ===');
    console.log('Test ID:', testId);
    console.log('Student ID:', studentId);
    console.log('Student Data:', {
      course: student.course,
      branch: student.branch,
      passoutYear: student.passoutYear
    });

    let isEligible = false;
    let batchId = null;

    // Check if test uses new recipient system
    if (test.recipients) {
      console.log('Test Recipients Structure:', JSON.stringify(test.recipients, null, 2));

      // Check students eligibility
      if (test.recipients.students) {
        const { students: studentRecipients } = test.recipients;
        console.log('Student Recipients:', JSON.stringify(studentRecipients, null, 2));

        // Check if all students are selected
        if (studentRecipients.all === true) {
          console.log('All students selected - ELIGIBLE');
          isEligible = true;
        } else {
          // Check if any filters are actually specified
          const hasCoursesFilter = studentRecipients.courses && studentRecipients.courses.length > 0;
          const hasBranchesFilter = studentRecipients.branches && studentRecipients.branches.length > 0;
          const hasPassoutYearsFilter = studentRecipients.passoutYears && studentRecipients.passoutYears.length > 0;

          console.log('Filters Present:', {
            hasCoursesFilter,
            hasBranchesFilter,
            hasPassoutYearsFilter
          });

          // If NO filters are specified, but recipients.students exists, allow all students
          if (!hasCoursesFilter && !hasBranchesFilter && !hasPassoutYearsFilter) {
            console.log('No filters specified - ELIGIBLE');
            isEligible = true;
          } else {
            // Check specific filters
            let matchesCourse = true;
            let matchesBranch = true;
            let matchesPassoutYear = true;

            // If courses are specified, student must match
            if (hasCoursesFilter) {
              matchesCourse = studentRecipients.courses.includes(student.course);
              console.log('Course Match:', matchesCourse, '(Student:', student.course, ', Required:', studentRecipients.courses, ')');
            }

            // If branches are specified, student must match
            if (hasBranchesFilter) {
              matchesBranch = studentRecipients.branches.includes(student.branch);
              console.log('Branch Match:', matchesBranch, '(Student:', student.branch, ', Required:', studentRecipients.branches, ')');
            }

            // If passout years are specified, student must match
            if (hasPassoutYearsFilter) {
              matchesPassoutYear = studentRecipients.passoutYears.includes(student.passoutYear);
              console.log('PassoutYear Match:', matchesPassoutYear, '(Student:', student.passoutYear, ', Required:', studentRecipients.passoutYears, ')');
            }

            // Student must match ALL specified filters
            isEligible = matchesCourse && matchesBranch && matchesPassoutYear;
            console.log('Final Eligibility:', isEligible);
          }
        }
      } else {
        console.log('WARNING: recipients.students not found, checking other recipient types');
      }

      // If not eligible as student, check if test is for faculty/hod/admin
      // (This shouldn't happen for students, but adding for safety)
      if (!isEligible) {
        console.log('Student not eligible based on recipient filters');
      }
    }
    // Fallback to old batch system for backwards compatibility
    else if (test.assignedBatches && test.assignedBatches.length > 0) {
      console.log('Using old batch system');
      console.log('Assigned Batches:', test.assignedBatches);

      const batches = await prisma.testBatch.findMany({
        where: {
          students: { has: studentId },
          id: { in: test.assignedBatches }
        }
      });

      console.log('Found Batches:', batches.length);

      if (batches.length > 0) {
        isEligible = true;
        batchId = batches[0].id;
      }
    } else {
      console.log('WARNING: No recipient system or batch system found on test - ALLOWING ACCESS FOR TESTING');
      // For tests without recipients configured, allow access (for backward compatibility)
      isEligible = true;
    }

    console.log('=== FINAL ELIGIBILITY RESULT:', isEligible, '===');

    if (!isEligible) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this test'
      });
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Create new attempt
    const attempt = await prisma.testAttempt.create({
      data: {
        testId,
        studentId,
        batchId: batchId,  // Will be null for recipient-based tests
        sessionToken,
        startedAt: new Date(),
        status: 'in-progress',
        timeRemaining: test.duration,
        proctoring: {
          browserInfo: {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress
          }
        }
      }
    });

    // Get questions for this test
    let questions = await prisma.testQuestion.findMany({
      where: {
        testId: test.id,
        isActive: true
      },
      orderBy: { questionNumber: 'asc' }
    });

    // Shuffle questions if enabled
    if (test.settings.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Shuffle options if enabled
    if (test.settings.shuffleOptions) {
      questions = questions.map(q => {
        const question = { ...q };
        question.options = [...question.options].sort(() => Math.random() - 0.5);
        return question;
      });
    }

    // Remove correct answers from response
    const questionsForStudent = questions.map(q => {
      const question = { ...q };
      delete question.correctAnswer;
      delete question.explanation;
      delete question.stats;
      return question;
    });

    // Populate the test details in attempt
    attempt.testId = test;

    res.status(201).json({
      success: true,
      message: 'Test started successfully',
      data: {
        attempt: attempt,
        questions: questionsForStudent
      }
    });

  } catch (error) {
    console.error('=== ERROR STARTING ATTEMPT ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.error('Test ID:', req.params.testId);
    console.error('Student ID:', req.user.id);

    res.status(500).json({
      success: false,
      message: 'Error starting test attempt',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// =============================================
// GET ATTEMPT
// =============================================

exports.getAttempt = async (req, res) => {
  try {
    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    // Manual populate: testId, batchId, studentId
    const test = await prisma.aptitudeTest.findUnique({ where: { id: attempt.testId } });
    attempt.testId = test
      ? {
          id: test.id,
          title: test.title,
          duration: test.duration,
          totalMarks: test.totalMarks,
          totalQuestions: test.totalQuestions,
          settings: test.settings
        }
      : null;

    if (attempt.batchId) {
      const batch = await prisma.testBatch.findUnique({ where: { id: attempt.batchId } });
      attempt.batchId = batch ? { id: batch.id, batchName: batch.batchName } : null;
    }

    const student = await prisma.student.findUnique({ where: { id: attempt.studentId } });
    attempt.studentId = pickStudent(student);

    // Check access permissions
    if (req.user.role === 'student' && (!attempt.studentId || attempt.studentId.id.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: attempt
    });

  } catch (error) {
    console.error('Error fetching attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attempt',
      error: error.message
    });
  }
};

// =============================================
// GET ATTEMPT QUESTIONS
// =============================================

exports.getAttemptQuestions = async (req, res) => {
  try {
    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        studentId: req.user.id,
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    if (attempt.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'This attempt is not active'
      });
    }

    // Get questions for this test
    const test = await prisma.aptitudeTest.findUnique({ where: { id: attempt.testId } });
    attempt.testId = test;
    let questions = await prisma.testQuestion.findMany({
      where: {
        testId: test.id,
        isActive: true
      },
      orderBy: { questionNumber: 'asc' }
    });

    // Shuffle questions if enabled
    if (test.settings.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Shuffle options if enabled
    if (test.settings.shuffleOptions) {
      questions = questions.map(q => {
        const question = { ...q };
        question.options = [...question.options].sort(() => Math.random() - 0.5);
        return question;
      });
    }

    // Remove correct answers from response
    const questionsForStudent = questions.map(q => {
      const question = { ...q };
      delete question.correctAnswer;
      delete question.explanation;
      delete question.stats;
      return question;
    });

    res.status(200).json({
      success: true,
      data: questionsForStudent
    });

  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
};

// =============================================
// SUBMIT ANSWER
// =============================================

exports.submitAnswer = async (req, res) => {
  try {
    const { questionId, selectedAnswer, timeTaken } = req.body;

    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        studentId: req.user.id,
        status: 'in-progress',
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Active attempt not found'
      });
    }

    // Validate question belongs to this test
    const question = await prisma.testQuestion.findFirst({
      where: {
        id: questionId,
        testId: attempt.testId
      }
    });

    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question'
      });
    }

    // Record answer
    await attemptService.recordAnswer(attempt, questionId, question.questionNumber, selectedAnswer, timeTaken);

    res.status(200).json({
      success: true,
      message: 'Answer saved successfully'
    });

  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting answer',
      error: error.message
    });
  }
};

// =============================================
// MARK FOR REVIEW
// =============================================

exports.markForReview = async (req, res) => {
  try {
    const { questionId } = req.body;

    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        studentId: req.user.id,
        status: 'in-progress',
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Active attempt not found'
      });
    }

    await attemptService.markForReview(attempt, questionId);

    res.status(200).json({
      success: true,
      message: 'Question marked for review'
    });

  } catch (error) {
    console.error('Error marking for review:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking for review',
      error: error.message
    });
  }
};

// =============================================
// SUBMIT TEST
// =============================================

exports.submitTest = async (req, res) => {
  try {
    const { submissionType = 'manual' } = req.body;

    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        studentId: req.user.id,
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    if (attempt.status === 'completed' || attempt.status === 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Test already submitted'
      });
    }

    // Submit test
    let updated = await attemptService.submitTest(attempt, submissionType);

    // Calculate rank
    const rankResult = await attemptService.calculateRank(updated);
    updated = rankResult.attempt;

    res.status(200).json({
      success: true,
      message: 'Test submitted successfully',
      data: {
        score: updated.score,
        percentage: updated.percentage,
        passed: updated.passed,
        rank: updated.rank
      }
    });

  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting test',
      error: error.message
    });
  }
};

// =============================================
// PAUSE TEST
// =============================================

exports.pauseTest = async (req, res) => {
  try {
    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        studentId: req.user.id,
        status: 'in-progress',
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Active attempt not found'
      });
    }

    await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: { status: 'paused', ...attemptService.recomputeStats(attempt) }
    });

    res.status(200).json({
      success: true,
      message: 'Test paused successfully'
    });

  } catch (error) {
    console.error('Error pausing test:', error);
    res.status(500).json({
      success: false,
      message: 'Error pausing test',
      error: error.message
    });
  }
};

// =============================================
// RESUME TEST
// =============================================

exports.resumeTest = async (req, res) => {
  try {
    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        studentId: req.user.id,
        status: 'paused',
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Paused attempt not found'
      });
    }

    await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: { status: 'in-progress', ...attemptService.recomputeStats(attempt) }
    });

    res.status(200).json({
      success: true,
      message: 'Test resumed successfully'
    });

  } catch (error) {
    console.error('Error resuming test:', error);
    res.status(500).json({
      success: false,
      message: 'Error resuming test',
      error: error.message
    });
  }
};

// =============================================
// RECORD TAB SWITCH
// =============================================

exports.recordTabSwitch = async (req, res) => {
  try {
    const { duration = 0 } = req.body;

    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        studentId: req.user.id,
        status: 'in-progress',
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Active attempt not found'
      });
    }

    const test = await prisma.aptitudeTest.findUnique({ where: { id: attempt.testId } });
    attempt.testId = test;

    // Record tab switch
    let updated = await attemptService.recordTabSwitch(attempt, duration);

    // Check if max tab switches exceeded
    const maxTabSwitches = test.settings.maxTabSwitches;
    if (updated.proctoring.tabSwitchCount >= maxTabSwitches) {
      // Auto-submit test
      const proctoring = { ...updated.proctoring, autoSubmittedDueToViolation: true };
      updated = await prisma.testAttempt.update({
        where: { id: updated.id },
        data: { proctoring, ...attemptService.recomputeStats(updated) }
      });
      updated = await attemptService.submitTest(updated, 'auto-violation');

      return res.status(200).json({
        success: true,
        autoSubmitted: true,
        message: `Test auto-submitted due to exceeding ${maxTabSwitches} tab switches`,
        data: {
          score: updated.score,
          percentage: updated.percentage
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tab switch recorded',
      data: {
        tabSwitchCount: updated.proctoring.tabSwitchCount,
        maxAllowed: maxTabSwitches,
        remaining: maxTabSwitches - updated.proctoring.tabSwitchCount
      }
    });

  } catch (error) {
    console.error('Error recording tab switch:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording tab switch',
      error: error.message
    });
  }
};

// =============================================
// RECORD FULLSCREEN EXIT
// =============================================

exports.recordFullscreenExit = async (req, res) => {
  try {
    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        studentId: req.user.id,
        status: 'in-progress',
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Active attempt not found'
      });
    }

    const updated = await attemptService.recordFullscreenExit(attempt);

    res.status(200).json({
      success: true,
      message: 'Fullscreen exit recorded',
      data: {
        fullscreenExitCount: updated.proctoring.fullscreenExitCount
      }
    });

  } catch (error) {
    console.error('Error recording fullscreen exit:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording fullscreen exit',
      error: error.message
    });
  }
};

// =============================================
// UPLOAD SNAPSHOT
// =============================================

exports.uploadSnapshot = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No snapshot file uploaded'
      });
    }

    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        studentId: req.user.id,
        status: 'in-progress',
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Active attempt not found'
      });
    }

    // Upload the proctoring snapshot to Supabase Storage
    const uploaded = await storageService.uploadMulterFile(
      req.file,
      storageService.FOLDERS.PROCTORING
    );
    const snapshotFilename = uploaded.path.split('/').pop();
    await attemptService.addCameraSnapshot(attempt, snapshotFilename, uploaded.path, uploaded.publicUrl);

    res.status(200).json({
      success: true,
      message: 'Snapshot uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading snapshot:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading snapshot',
      error: error.message
    });
  }
};

// =============================================
// RECORD BROWSER INFO
// =============================================

exports.recordBrowserInfo = async (req, res) => {
  try {
    const { userAgent, platform, screenResolution, ipAddress } = req.body;

    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        studentId: req.user.id,
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    const proctoring = attemptService.ensureProctoring(attempt);
    proctoring.browserInfo = {
      userAgent: userAgent || req.headers['user-agent'],
      platform,
      screenResolution,
      ipAddress: ipAddress || req.ip
    };

    await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: { proctoring, ...attemptService.recomputeStats(attempt) }
    });

    res.status(200).json({
      success: true,
      message: 'Browser info recorded'
    });

  } catch (error) {
    console.error('Error recording browser info:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording browser info',
      error: error.message
    });
  }
};

// =============================================
// UPDATE HEARTBEAT
// =============================================

exports.updateHeartbeat = async (req, res) => {
  try {
    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        studentId: req.user.id,
        status: 'in-progress',
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Active attempt not found'
      });
    }

    // lastActivityAt is refreshed by recomputeStats (matches the pre-save hook).
    await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: { lastActivityAt: new Date(), ...attemptService.recomputeStats(attempt) }
    });

    res.status(200).json({
      success: true,
      message: 'Heartbeat updated'
    });

  } catch (error) {
    console.error('Error updating heartbeat:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating heartbeat',
      error: error.message
    });
  }
};

// =============================================
// GET RESULT
// =============================================

exports.getResult = async (req, res) => {
  try {
    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    // Manual populate: testId, studentId, batchId
    const test = await prisma.aptitudeTest.findUnique({ where: { id: attempt.testId } });
    attempt.testId = test
      ? {
          id: test.id,
          title: test.title,
          totalMarks: test.totalMarks,
          totalQuestions: test.totalQuestions,
          passPercentage: test.passPercentage,
          settings: test.settings
        }
      : null;

    const student = await prisma.student.findUnique({ where: { id: attempt.studentId } });
    attempt.studentId = pickStudent(student);

    if (attempt.batchId) {
      const batch = await prisma.testBatch.findUnique({ where: { id: attempt.batchId } });
      attempt.batchId = batch ? { id: batch.id, batchName: batch.batchName } : null;
    }

    // Check access
    if (req.user.role === 'student' && (!attempt.studentId || attempt.studentId.id.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (attempt.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Test is not yet completed'
      });
    }

    // Check if student can see results immediately
    // Default to true if setting is undefined (backward compatibility)
    const showResultsImmediately = attempt.testId.settings && attempt.testId.settings.showResultsImmediately !== false;

    if (req.user.role === 'student' && !showResultsImmediately) {
      return res.status(403).json({
        success: false,
        message: 'Results will be available later'
      });
    }

    // Calculate rank if not already calculated
    if (!attempt.rank) {
      const rankResult = await attemptService.calculateRank(attempt);
      attempt.rank = rankResult.rank;
    }

    res.status(200).json({
      success: true,
      data: attempt
    });

  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching result',
      error: error.message
    });
  }
};

// =============================================
// GET ANSWERS
// =============================================

exports.getAnswers = async (req, res) => {
  try {
    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        isDeleted: false
      }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    // Populate testId
    const test = await prisma.aptitudeTest.findUnique({ where: { id: attempt.testId } });
    // Keep the raw testId string for question lookup below.
    const testIdValue = attempt.testId;
    attempt.testId = test;

    // Check access
    if (req.user.role === 'student') {
      if (attempt.studentId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (!attempt.testId.settings.allowAnswerReview) {
        return res.status(403).json({
          success: false,
          message: 'Answer review is not allowed for this test'
        });
      }
    }

    // Get all questions with correct answers
    const questions = await prisma.testQuestion.findMany({
      where: {
        testId: testIdValue,
        isActive: true
      }
    });

    // Map responses with questions
    const responses = Array.isArray(attempt.responses) ? attempt.responses : [];
    const answersWithQuestions = responses.map(response => {
      const question = questions.find(q => q.id.toString() === response.questionId.toString());

      return {
        questionNumber: response.questionNumber,
        questionText: question ? question.questionText : '',
        options: question ? question.options : [],
        correctAnswer: question ? question.correctAnswer : [],
        selectedAnswer: response.selectedAnswer,
        isCorrect: response.isCorrect,
        marksAwarded: response.marksAwarded,
        explanation: question ? question.explanation : '',
        timeTaken: response.timeTaken
      };
    });

    res.status(200).json({
      success: true,
      data: answersWithQuestions
    });

  } catch (error) {
    console.error('Error fetching answers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching answers',
      error: error.message
    });
  }
};

// =============================================
// GET MY ATTEMPTS
// =============================================

exports.getMyAttempts = async (req, res) => {
  try {
    const attempts = await prisma.testAttempt.findMany({
      where: {
        studentId: req.user.id,
        isDeleted: false
      },
      orderBy: { createdAt: 'desc' }
    });

    // Populate testId (title/totalMarks/totalQuestions) and batchId (batchName)
    const testIds = [...new Set(attempts.map(a => a.testId).filter(Boolean))];
    const batchIds = [...new Set(attempts.map(a => a.batchId).filter(Boolean))];

    const tests = testIds.length
      ? await prisma.aptitudeTest.findMany({ where: { id: { in: testIds } } })
      : [];
    const batches = batchIds.length
      ? await prisma.testBatch.findMany({ where: { id: { in: batchIds } } })
      : [];

    const testMap = new Map(tests.map(t => [t.id, t]));
    const batchMap = new Map(batches.map(b => [b.id, b]));

    attempts.forEach(a => {
      const t = testMap.get(a.testId);
      a.testId = t
        ? { id: t.id, title: t.title, totalMarks: t.totalMarks, totalQuestions: t.totalQuestions }
        : a.testId;
      if (a.batchId) {
        const b = batchMap.get(a.batchId);
        a.batchId = b ? { id: b.id, batchName: b.batchName } : a.batchId;
      }
    });

    res.status(200).json({
      success: true,
      data: attempts
    });

  } catch (error) {
    console.error('Error fetching my attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attempts',
      error: error.message
    });
  }
};

// =============================================
// GET MY RESULT FOR A TEST
// =============================================

exports.getMyResult = async (req, res) => {
  try {
    const testId = req.params.testId;
    const studentId = req.user.id;

    console.log('=== GET MY RESULT ===');
    console.log('Test ID:', testId);
    console.log('Student ID:', studentId);

    // Find the student's attempt for this test
    const attempt = await prisma.testAttempt.findFirst({
      where: {
        testId,
        studentId,
        status: 'completed',
        isDeleted: false
      }
    });

    console.log('Attempt found:', attempt ? 'YES' : 'NO');

    if (!attempt) {
      // Check if attempt exists with any status
      const anyAttempt = await prisma.testAttempt.findFirst({
        where: {
          testId,
          studentId,
          isDeleted: false
        }
      });

      console.log('Any attempt found:', anyAttempt ? `YES (status: ${anyAttempt.status})` : 'NO');

      return res.status(404).json({
        success: false,
        message: anyAttempt
          ? `Test is not yet completed. Current status: ${anyAttempt.status}`
          : 'No attempt found for this test'
      });
    }

    // Manual populate: testId, studentId, batchId
    const testDoc = await prisma.aptitudeTest.findUnique({ where: { id: attempt.testId } });
    attempt.testId = testDoc
      ? {
          id: testDoc.id,
          title: testDoc.title,
          totalMarks: testDoc.totalMarks,
          totalQuestions: testDoc.totalQuestions,
          passPercentage: testDoc.passPercentage,
          settings: testDoc.settings
        }
      : null;

    const student = await prisma.student.findUnique({ where: { id: attempt.studentId } });
    attempt.studentId = pickStudent(student);

    if (attempt.batchId) {
      const batch = await prisma.testBatch.findUnique({ where: { id: attempt.batchId } });
      attempt.batchId = batch ? { id: batch.id, batchName: batch.batchName } : null;
    }

    // Check if student can see results immediately
    // Default to true if setting is undefined (backward compatibility)
    const showResultsImmediately = attempt.testId.settings && attempt.testId.settings.showResultsImmediately !== false;

    console.log('Test settings:', attempt.testId.settings);
    console.log('Show results immediately:', showResultsImmediately);

    if (!showResultsImmediately) {
      return res.status(403).json({
        success: false,
        message: 'Results will be available later'
      });
    }

    // Calculate rank if not already calculated
    if (!attempt.rank) {
      console.log('Calculating rank...');
      const rankResult = await attemptService.calculateRank(attempt);
      attempt.rank = rankResult.rank;
    }

    // Get the test info
    const test = attempt.testId;

    console.log('Returning result successfully');

    res.status(200).json({
      success: true,
      data: {
        attempt,
        test
      }
    });

  } catch (error) {
    console.error('=== ERROR FETCHING MY RESULT ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error fetching result',
      error: error.message
    });
  }
};

// =============================================
// GET MY HISTORY (All completed tests)
// =============================================

exports.getMyHistory = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Find all completed attempts for this student
    const attempts = await prisma.testAttempt.findMany({
      where: {
        studentId,
        status: 'completed',
        isDeleted: false
      },
      orderBy: { submittedAt: 'desc' } // Most recent first
    });

    // Populate testId
    const testIds = [...new Set(attempts.map(a => a.testId).filter(Boolean))];
    const tests = testIds.length
      ? await prisma.aptitudeTest.findMany({ where: { id: { in: testIds } } })
      : [];
    const testMap = new Map(tests.map(t => [t.id, t]));

    attempts.forEach(a => {
      const t = testMap.get(a.testId);
      a.testId = t
        ? {
            id: t.id,
            title: t.title,
            totalMarks: t.totalMarks,
            totalQuestions: t.totalQuestions,
            duration: t.duration,
            passPercentage: t.passPercentage
          }
        : a.testId;
    });

    res.status(200).json({
      success: true,
      data: attempts
    });

  } catch (error) {
    console.error('Error fetching test history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test history',
      error: error.message
    });
  }
};

// =============================================
// ADMIN/HOD ROUTES
// =============================================

exports.terminateAttempt = async (req, res) => {
  try {
    const { reason } = req.body;

    const attempt = await prisma.testAttempt.findUnique({ where: { id: req.params.attemptId } });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    if (attempt.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot terminate completed attempt'
      });
    }

    // Terminate attempt
    let updated = await attemptService.submitTest(attempt, 'force-admin');

    const reviewStatus = attemptService.ensureReviewStatus(updated);
    reviewStatus.flaggedForReview = true;
    reviewStatus.flagReason = reason || 'Terminated by admin';

    await prisma.testAttempt.update({
      where: { id: updated.id },
      data: { status: 'terminated', reviewStatus, ...attemptService.recomputeStats(updated) }
    });

    res.status(200).json({
      success: true,
      message: 'Attempt terminated successfully'
    });

  } catch (error) {
    console.error('Error terminating attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Error terminating attempt',
      error: error.message
    });
  }
};

exports.flagForReview = async (req, res) => {
  try {
    const { flagReason } = req.body;

    const attempt = await prisma.testAttempt.findUnique({ where: { id: req.params.attemptId } });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    const reviewStatus = attemptService.ensureReviewStatus(attempt);
    reviewStatus.flaggedForReview = true;
    reviewStatus.flagReason = flagReason;

    await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: { reviewStatus, ...attemptService.recomputeStats(attempt) }
    });

    res.status(200).json({
      success: true,
      message: 'Attempt flagged for review'
    });

  } catch (error) {
    console.error('Error flagging attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Error flagging attempt',
      error: error.message
    });
  }
};

exports.markAsReviewed = async (req, res) => {
  try {
    const { reviewNotes } = req.body;

    const attempt = await prisma.testAttempt.findUnique({ where: { id: req.params.attemptId } });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    const reviewStatus = attemptService.ensureReviewStatus(attempt);
    reviewStatus.isReviewed = true;
    reviewStatus.reviewedBy = req.user.id;
    reviewStatus.reviewedByModel = req.user.role === 'admin' ? 'Admin' : 'HOD';
    reviewStatus.reviewedAt = new Date();
    reviewStatus.reviewNotes = reviewNotes;

    await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: { reviewStatus, ...attemptService.recomputeStats(attempt) }
    });

    res.status(200).json({
      success: true,
      message: 'Attempt marked as reviewed'
    });

  } catch (error) {
    console.error('Error marking as reviewed:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking as reviewed',
      error: error.message
    });
  }
};

exports.getProctoringData = async (req, res) => {
  try {
    const attempt = await prisma.testAttempt.findUnique({ where: { id: req.params.attemptId } });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    // Manual populate: studentId, testId
    const student = await prisma.student.findUnique({ where: { id: attempt.studentId } });
    const test = await prisma.aptitudeTest.findUnique({ where: { id: attempt.testId } });

    res.status(200).json({
      success: true,
      data: {
        student: pickStudent(student),
        test: test ? { id: test.id, title: test.title } : null,
        proctoring: attempt.proctoring,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        timeTaken: attempt.timeTaken
      }
    });

  } catch (error) {
    console.error('Error fetching proctoring data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching proctoring data',
      error: error.message
    });
  }
};

exports.deleteAttempt = async (req, res) => {
  try {
    const attempt = await prisma.testAttempt.findUnique({ where: { id: req.params.attemptId } });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: { isDeleted: true, ...attemptService.recomputeStats(attempt) }
    });

    res.status(200).json({
      success: true,
      message: 'Attempt deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting attempt',
      error: error.message
    });
  }
};

exports.recalculateScore = async (req, res) => {
  try {
    const attempt = await prisma.testAttempt.findUnique({ where: { id: req.params.attemptId } });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    let updated = await attemptService.calculateScore(attempt);
    const rankResult = await attemptService.calculateRank(updated);
    updated = rankResult.attempt;

    res.status(200).json({
      success: true,
      message: 'Score recalculated successfully',
      data: {
        score: updated.score,
        percentage: updated.percentage,
        rank: updated.rank
      }
    });

  } catch (error) {
    console.error('Error recalculating score:', error);
    res.status(500).json({
      success: false,
      message: 'Error recalculating score',
      error: error.message
    });
  }
};

exports.getAllAttempts = async (req, res) => {
  try {
    const {
      status,
      batchId,
      page = 1,
      limit = 20,
      sortBy = '-createdAt'
    } = req.query;

    const where = {
      testId: req.params.testId,
      isDeleted: false
    };

    if (status) {
      where.status = status;
    }

    if (batchId) {
      where.batchId = batchId;
    }

    // Translate a Mongoose-style sort string (e.g. '-createdAt' / 'score')
    // into a Prisma orderBy object.
    const sortField = sortBy.startsWith('-') ? sortBy.slice(1) : sortBy;
    const sortDir = sortBy.startsWith('-') ? 'desc' : 'asc';
    const orderBy = { [sortField]: sortDir };

    const take = limit * 1;
    const skip = (page - 1) * limit;

    const attempts = await prisma.testAttempt.findMany({
      where,
      orderBy,
      take,
      skip
    });

    // Populate studentId, batchId
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

    attempts.forEach(a => {
      a.studentId = pickStudent(studentMap.get(a.studentId)) || a.studentId;
      if (a.batchId) {
        const b = batchMap.get(a.batchId);
        a.batchId = b ? { id: b.id, batchName: b.batchName } : a.batchId;
      }
    });

    const total = await prisma.testAttempt.count({ where });

    res.status(200).json({
      success: true,
      data: attempts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attempts',
      error: error.message
    });
  }
};

exports.getBatchAttempts = async (req, res) => {
  try {
    const {
      testId,
      status,
      page = 1,
      limit = 20
    } = req.query;

    const where = {
      batchId: req.params.batchId,
      isDeleted: false
    };

    if (testId) {
      where.testId = testId;
    }

    if (status) {
      where.status = status;
    }

    const take = limit * 1;
    const skip = (page - 1) * limit;

    const attempts = await prisma.testAttempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip
    });

    // Populate studentId, testId
    const studentIds = [...new Set(attempts.map(a => a.studentId).filter(Boolean))];
    const testIds = [...new Set(attempts.map(a => a.testId).filter(Boolean))];

    const students = studentIds.length
      ? await prisma.student.findMany({ where: { id: { in: studentIds } } })
      : [];
    const tests = testIds.length
      ? await prisma.aptitudeTest.findMany({ where: { id: { in: testIds } } })
      : [];

    const studentMap = new Map(students.map(s => [s.id, s]));
    const testMap = new Map(tests.map(t => [t.id, t]));

    attempts.forEach(a => {
      a.studentId = pickStudent(studentMap.get(a.studentId)) || a.studentId;
      const t = testMap.get(a.testId);
      a.testId = t ? { id: t.id, title: t.title, totalMarks: t.totalMarks } : a.testId;
    });

    const total = await prisma.testAttempt.count({ where });

    res.status(200).json({
      success: true,
      data: attempts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching batch attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching batch attempts',
      error: error.message
    });
  }
};
