const prisma = require('../lib/prisma');
const pdfExtractionService = require('../services/pdfQuestionExtractionService');
const excelExportService = require('../services/excelExportService');
const aiTestGenerationService = require('../services/aiTestGenerationService');
const storageService = require('../services/storageService');
const aptitudeTestService = require('../services/aptitudeTestService');
const testAnalyticsService = require('../services/testAnalyticsService');

// ---------------------------------------------
// populate helpers (no Prisma relations declared — attach manually)
// ---------------------------------------------

// populate('assignedBatches') — assignedBatches is a String[] of batch ids.
async function populateAssignedBatches(test, select = null) {
  const ids = Array.isArray(test.assignedBatches) ? test.assignedBatches : [];
  if (!ids.length) {
    test.assignedBatches = [];
    return test;
  }
  const batches = await prisma.testBatch.findMany({ where: { id: { in: ids } } });
  const map = new Map(batches.map(b => [b.id, b]));
  test.assignedBatches = ids
    .map(id => {
      const b = map.get(id);
      if (!b) return null;
      if (!select) return b;
      const picked = {};
      select.forEach(f => { picked[f] = b[f]; });
      return picked;
    })
    .filter(Boolean);
  return test;
}

// populate('createdBy', 'name email') — createdBy references Admin or HOD
// (createdByModel). Look up in the correct table.
async function populateCreatedBy(test, select = null) {
  if (!test.createdBy) return test;
  const delegate = test.createdByModel === 'HOD' ? prisma.hOD : prisma.admin;
  let creator = null;
  try {
    creator = await delegate.findUnique({ where: { id: test.createdBy } });
  } catch (e) {
    creator = null;
  }
  if (creator) {
    if (select) {
      const picked = { id: creator.id };
      select.forEach(f => { picked[f] = creator[f]; });
      test.createdBy = picked;
    } else {
      test.createdBy = creator;
    }
  }
  return test;
}

// =============================================
// CREATE TEST
// =============================================

exports.createTest = async (req, res) => {
  try {
    const {
      title,
      description,
      instructions,
      duration,
      totalMarks,
      markingScheme,
      passPercentage,
      settings,
      assignedBatches,
      recipients,
      schedule
    } = req.body;

    // Validate required fields
    if (!title || !duration || !totalMarks || !schedule) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, duration, totalMarks, and schedule'
      });
    }

    // Pre-validate: end date must be after start date
    aptitudeTestService.validateSchedule(schedule);

    // Create test with recipients
    const test = await prisma.aptitudeTest.create({
      data: {
        title,
        description,
        instructions,
        duration,
        totalMarks,
        markingScheme,
        passPercentage,
        settings,
        assignedBatches: assignedBatches || [],  // Keep for backwards compatibility
        recipients: recipients || {               // New recipient system
          students: { all: false, courses: [], branches: [], passoutYears: [] },
          faculty: { all: false, courses: [], departments: [] },
          hods: { all: false, courses: [], departments: [] },
          admins: { all: false }
        },
        schedule,
        createdBy: req.user.id,
        createdByModel: req.user.role === 'admin' ? 'Admin' : 'HOD',
        status: 'draft'
      }
    });

    // Populate batches
    await populateAssignedBatches(test);

    res.status(201).json({
      success: true,
      message: 'Test created successfully',
      data: test
    });

  } catch (error) {
    console.error('Error creating test:', error);
    res.status(error.statusCode === 400 ? 400 : 500).json({
      success: false,
      message: error.statusCode === 400 ? error.message : 'Error creating test',
      error: error.message
    });
  }
};

// =============================================
// GET ALL TESTS
// =============================================

exports.getAllTests = async (req, res) => {
  try {
    const {
      status,
      batchId,
      createdBy,
      search,
      page = 1,
      limit = 10,
      sortBy = '-createdAt'
    } = req.query;

    // Build query
    const query = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    if (batchId) {
      // assignedBatches is a String[] — membership uses `has`.
      query.assignedBatches = { has: batchId };
    }

    // If HOD, only show tests created by them
    if (req.user.role === 'hod' && !createdBy) {
      query.createdBy = req.user.id;
    } else if (createdBy) {
      query.createdBy = createdBy;
    }

    if (search) {
      query.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Translate sortBy (e.g. '-createdAt') to Prisma orderBy
    const orderBy = {};
    if (sortBy) {
      const desc = sortBy.startsWith('-');
      const field = desc ? sortBy.slice(1) : sortBy;
      orderBy[field] = desc ? 'desc' : 'asc';
    }

    // Execute query with pagination
    const tests = await prisma.aptitudeTest.findMany({
      where: query,
      orderBy,
      take: limit * 1,
      skip: (page - 1) * limit
    });

    // populate('assignedBatches', 'batchName batchCode studentCount')
    // populate('createdBy', 'name email')
    for (const test of tests) {
      await populateAssignedBatches(test, ['batchName', 'batchCode', 'studentCount']);
      await populateCreatedBy(test, ['name', 'email']);
    }

    const total = await prisma.aptitudeTest.count({ where: query });

    res.status(200).json({
      success: true,
      data: tests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tests',
      error: error.message
    });
  }
};

// =============================================
// GET TEST BY ID
// =============================================

exports.getTestById = async (req, res) => {
  try {
    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check access permissions (before populate: createdBy is still the id string)
    if (req.user.role === 'hod' && test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await populateAssignedBatches(test);
    await populateCreatedBy(test, ['name', 'email']);

    res.status(200).json({
      success: true,
      data: test
    });

  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test',
      error: error.message
    });
  }
};

// =============================================
// UPDATE TEST
// =============================================

exports.updateTest = async (req, res) => {
  try {
    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if user is creator
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can update this test'
      });
    }

    // Don't allow updates to published tests with attempts
    if (test.status === 'published') {
      const attemptCount = await prisma.testAttempt.count({ where: { testId: test.id } });
      if (attemptCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update test that has already been attempted by students'
        });
      }
    }

    // Update test
    const allowedUpdates = [
      'title', 'description', 'instructions', 'duration', 'totalMarks',
      'markingScheme', 'passPercentage', 'settings', 'schedule', 'assignedBatches', 'recipients'
    ];

    const data = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    });

    // Pre-validate: end date must be after start date. Use the incoming
    // schedule if provided, otherwise the existing one.
    aptitudeTestService.validateSchedule(
      data.schedule !== undefined ? data.schedule : test.schedule
    );

    data.version = (test.version || 0) + 1;

    const updatedTest = await prisma.aptitudeTest.update({
      where: { id: test.id },
      data
    });

    res.status(200).json({
      success: true,
      message: 'Test updated successfully',
      data: updatedTest
    });

  } catch (error) {
    console.error('Error updating test:', error);
    res.status(error.statusCode === 400 ? 400 : 500).json({
      success: false,
      message: error.statusCode === 400 ? error.message : 'Error updating test',
      error: error.message
    });
  }
};

// =============================================
// DELETE TEST
// =============================================

exports.deleteTest = async (req, res) => {
  try {
    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if user is creator
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can delete this test'
      });
    }

    // Soft delete
    await prisma.aptitudeTest.update({
      where: { id: test.id },
      data: { isDeleted: true, status: 'archived' }
    });

    res.status(200).json({
      success: true,
      message: 'Test deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting test:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting test',
      error: error.message
    });
  }
};

// =============================================
// PUBLISH TEST
// =============================================

exports.publishTest = async (req, res) => {
  try {
    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if user is creator
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can publish this test'
      });
    }

    // Validate test has questions
    const questionCount = await prisma.testQuestion.count({
      where: {
        testId: test.id,
        isActive: true
      }
    });

    if (questionCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish test without questions'
      });
    }

    // Warning if test has no batches assigned (but allow publishing)
    const hasNoBatches = !test.assignedBatches || test.assignedBatches.length === 0;

    // Update test
    const updatedTest = await prisma.aptitudeTest.update({
      where: { id: test.id },
      data: { status: 'published', totalQuestions: questionCount }
    });

    // Send notifications to recipients
    try {
      const schedule = updatedTest.schedule || {};
      const endDate = schedule.endDate ? new Date(schedule.endDate) : null;

      // Create notification for test
      await prisma.notification.create({
        data: {
          title: `New Aptitude Test Assigned: ${updatedTest.title}`,
          description: `An aptitude test has been assigned to you. Test Duration: ${updatedTest.duration} minutes. Total Questions: ${questionCount}. Please complete the test before ${endDate ? endDate.toLocaleString() : ''}.`,
          type: 'message',
          recipients: updatedTest.recipients,  // Use the same recipient structure
          createdBy: req.user.id,
          createdByModel: req.user.role === 'admin' ? 'Admin' : 'HOD',
          priority: 'high'
        }
      });

      console.log('Notification created for test:', updatedTest.title);
    } catch (notifyError) {
      console.error('Failed to create notification:', notifyError);
      // Continue even if notification fails
    }

    // Also notify batches if using old batch system (backwards compatibility)
    if (!hasNoBatches) {
      for (const batchId of updatedTest.assignedBatches) {
        try {
          const batch = await prisma.testBatch.findUnique({ where: { id: batchId } });
          if (batch) {
            await aptitudeTestService.notifyBatchStudentsAboutTest(batch, updatedTest.id);
          }
        } catch (notifyError) {
          console.error(`Failed to notify batch ${batchId}:`, notifyError);
          // Continue even if notification fails
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Test published successfully and notifications sent to recipients',
      data: updatedTest
    });

  } catch (error) {
    console.error('Error publishing test:', error);
    res.status(500).json({
      success: false,
      message: 'Error publishing test',
      error: error.message
    });
  }
};

// =============================================
// ARCHIVE TEST
// =============================================

exports.archiveTest = async (req, res) => {
  try {
    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if user is creator
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can archive this test'
      });
    }

    const updatedTest = await prisma.aptitudeTest.update({
      where: { id: test.id },
      data: { status: 'archived' }
    });

    res.status(200).json({
      success: true,
      message: 'Test archived successfully',
      data: updatedTest
    });

  } catch (error) {
    console.error('Error archiving test:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving test',
      error: error.message
    });
  }
};

// =============================================
// ADD QUESTIONS
// =============================================

exports.addQuestions = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide questions array'
      });
    }

    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if user is creator
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can add questions'
      });
    }

    // Create questions
    const createdQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const questionData = {
        ...questions[i],
        testId: test.id,
        questionNumber: questions[i].questionNumber || i + 1,
        createdBy: req.user.id,
        createdByModel: req.user.role === 'admin' ? 'Admin' : 'HOD'
      };

      const question = await prisma.testQuestion.create({ data: questionData });
      createdQuestions.push(question);
    }

    // Update test question count
    const totalQuestions = await prisma.testQuestion.count({
      where: {
        testId: test.id,
        isActive: true
      }
    });
    await prisma.aptitudeTest.update({
      where: { id: test.id },
      data: { totalQuestions }
    });

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions added successfully`,
      data: createdQuestions
    });

  } catch (error) {
    console.error('Error adding questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding questions',
      error: error.message
    });
  }
};

// =============================================
// ADD MANUAL QUESTION (SINGLE)
// =============================================

exports.addManualQuestion = async (req, res) => {
  try {
    const {
      questionText,
      options,
      correctAnswer,
      marks,
      negativeMarks,
      difficultyLevel,
      category,
      topic,
      explanation
    } = req.body;

    // Validate required fields
    if (!questionText || !options || !correctAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Please provide questionText, options (4 options), and correctAnswer'
      });
    }

    // Validate options (must be exactly 4 with labels A, B, C, D)
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Options must be an array of exactly 4 options'
      });
    }

    const validLabels = ['A', 'B', 'C', 'D'];
    const optionLabels = options.map(opt => opt.optionLabel);
    const hasAllLabels = validLabels.every(label => optionLabels.includes(label));

    if (!hasAllLabels) {
      return res.status(400).json({
        success: false,
        message: 'Options must have labels A, B, C, D'
      });
    }

    // Validate correct answer
    if (!Array.isArray(correctAnswer) || correctAnswer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Correct answer must be a non-empty array'
      });
    }

    const invalidAnswers = correctAnswer.filter(ans => !validLabels.includes(ans));
    if (invalidAnswers.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Correct answer must be one of: ${validLabels.join(', ')}`
      });
    }

    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if user is creator
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can add questions'
      });
    }

    // Get current question count
    const questionCount = await prisma.testQuestion.count({
      where: {
        testId: test.id,
        isActive: true
      }
    });

    // Create question
    const question = await prisma.testQuestion.create({
      data: {
        testId: test.id,
        questionNumber: questionCount + 1,
        questionText,
        questionType: 'single-choice',
        options,
        correctAnswer,
        marks: marks || 1,
        negativeMarks: negativeMarks || 0,
        difficultyLevel: difficultyLevel || 'medium',
        category: category || 'General',
        topic: topic || '',
        explanation: explanation || '',
        createdBy: req.user.id,
        createdByModel: req.user.role === 'admin' ? 'Admin' : 'HOD'
      }
    });

    // Update test question count and total marks
    // Original used an aggregation summing `marks` over active questions.
    const activeQuestions = await prisma.testQuestion.findMany({
      where: { testId: test.id, isActive: true }
    });
    const totalMarks = activeQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

    await prisma.aptitudeTest.update({
      where: { id: test.id },
      data: {
        totalQuestions: questionCount + 1,
        totalMarks
      }
    });

    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      data: question
    });

  } catch (error) {
    console.error('Error adding manual question:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding question',
      error: error.message
    });
  }
};

// =============================================
// GET TEST QUESTIONS
// =============================================

exports.getTestQuestions = async (req, res) => {
  try {
    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    const questions = await prisma.testQuestion.findMany({
      where: {
        testId: test.id,
        isActive: true
      },
      orderBy: { questionNumber: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: questions
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
// UPDATE QUESTION
// =============================================

exports.updateQuestion = async (req, res) => {
  try {
    const question = await prisma.testQuestion.findUnique({
      where: { id: req.params.questionId }
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user is creator
    const test = await prisma.aptitudeTest.findUnique({ where: { id: question.testId } });
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the test creator can update questions'
      });
    }

    // Update question
    const allowedUpdates = [
      'questionText', 'options', 'correctAnswer', 'marks', 'negativeMarks',
      'difficultyLevel', 'category', 'topic', 'tags', 'explanation', 'questionImage'
    ];

    const data = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    });

    const updatedQuestion = await prisma.testQuestion.update({
      where: { id: question.id },
      data
    });

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: updatedQuestion
    });

  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating question',
      error: error.message
    });
  }
};

// =============================================
// DELETE QUESTION
// =============================================

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await prisma.testQuestion.findUnique({
      where: { id: req.params.questionId }
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user is creator
    const test = await prisma.aptitudeTest.findUnique({ where: { id: question.testId } });
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the test creator can delete questions'
      });
    }

    // Soft delete
    await prisma.testQuestion.update({
      where: { id: question.id },
      data: { isActive: false }
    });

    // Update test question count
    const totalQuestions = await prisma.testQuestion.count({
      where: {
        testId: test.id,
        isActive: true
      }
    });
    await prisma.aptitudeTest.update({
      where: { id: test.id },
      data: { totalQuestions }
    });

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting question',
      error: error.message
    });
  }
};

// =============================================
// UPLOAD AND EXTRACT PDF
// =============================================

exports.uploadAndExtractPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file'
      });
    }

    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if user is creator
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can upload PDF'
      });
    }

    // Upload the source PDF to Supabase Storage
    const uploadedPdf = await storageService.uploadMulterFile(
      req.file,
      storageService.FOLDERS.TEST_PDF
    );

    // Save PDF info
    const sourcePDF = {
      filename: req.file.originalname,
      path: uploadedPdf.publicUrl,
      uploadedAt: new Date()
    };
    await prisma.aptitudeTest.update({
      where: { id: test.id },
      data: { sourcePDF }
    });

    // Extract questions directly from the in-memory PDF buffer
    const extractedQuestions = await pdfExtractionService.extractQuestionsFromPDF(req.file.buffer);

    res.status(200).json({
      success: true,
      message: 'PDF uploaded and questions extracted successfully',
      data: {
        pdfInfo: sourcePDF,
        extractedQuestions
      }
    });

  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading PDF',
      error: error.message
    });
  }
};

// =============================================
// GET TEST ANALYTICS
// =============================================

exports.getTestAnalytics = async (req, res) => {
  try {
    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Get or create analytics
    let analytics = await prisma.testAnalytics.findFirst({ where: { testId: test.id } });

    if (!analytics || analytics.calculationStatus === 'pending') {
      // Calculate analytics
      analytics = await testAnalyticsService.calculateForTest(test.id);
    }

    res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

// =============================================
// REFRESH ANALYTICS
// =============================================

exports.refreshAnalytics = async (req, res) => {
  try {
    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Recalculate analytics
    const analytics = await testAnalyticsService.calculateForTest(test.id);

    res.status(200).json({
      success: true,
      message: 'Analytics refreshed successfully',
      data: analytics
    });

  } catch (error) {
    console.error('Error refreshing analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing analytics',
      error: error.message
    });
  }
};

// =============================================
// EXPORT RESULTS TO EXCEL
// =============================================

exports.exportResultsToExcel = async (req, res) => {
  try {
    const { batchId } = req.query;

    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    await populateAssignedBatches(test);

    // Generate Excel file
    const excelBuffer = await excelExportService.generateTestResultsExcel(test.id, batchId);

    // Set headers for file download
    const filename = `${test.title.replace(/[^a-z0-9]/gi, '_')}_Results_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(excelBuffer);

  } catch (error) {
    console.error('Error exporting results:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting results',
      error: error.message
    });
  }
};

// =============================================
// GET TEST RESULTS
// =============================================

exports.getTestResults = async (req, res) => {
  try {
    const {
      batchId,
      page = 1,
      limit = 20,
      sortBy = '-score'
    } = req.query;

    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Build query
    const query = {
      testId: test.id,
      status: 'completed',
      isDeleted: false
    };

    if (batchId) {
      query.batchId = batchId;
    }

    // Translate sortBy (e.g. '-score') to Prisma orderBy
    const orderBy = {};
    if (sortBy) {
      const desc = sortBy.startsWith('-');
      const field = desc ? sortBy.slice(1) : sortBy;
      orderBy[field] = desc ? 'desc' : 'asc';
    }

    // Get results
    const results = await prisma.testAttempt.findMany({
      where: query,
      orderBy,
      take: limit * 1,
      skip: (page - 1) * limit
    });

    // populate('studentId', 'name email universityRollNumber branch course passoutYear')
    // populate('batchId', 'batchName batchCode')
    const studentIds = [...new Set(results.map(r => r.studentId).filter(Boolean))];
    const batchIds = [...new Set(results.map(r => r.batchId).filter(Boolean))];

    const students = studentIds.length
      ? await prisma.student.findMany({ where: { id: { in: studentIds } } })
      : [];
    const batches = batchIds.length
      ? await prisma.testBatch.findMany({ where: { id: { in: batchIds } } })
      : [];

    const studentMap = new Map(students.map(s => [s.id, s]));
    const batchMap = new Map(batches.map(b => [b.id, b]));

    results.forEach(r => {
      const student = studentMap.get(r.studentId);
      if (student) {
        r.studentId = {
          id: student.id,
          name: student.name,
          email: student.email,
          universityRollNumber: student.universityRollNumber,
          branch: student.branch,
          course: student.course,
          passoutYear: student.passoutYear
        };
      }
      if (r.batchId) {
        const batch = batchMap.get(r.batchId);
        if (batch) {
          r.batchId = {
            id: batch.id,
            batchName: batch.batchName,
            batchCode: batch.batchCode
          };
        }
      }
    });

    const total = await prisma.testAttempt.count({ where: query });

    res.status(200).json({
      success: true,
      data: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results',
      error: error.message
    });
  }
};

// =============================================
// ASSIGN BATCH TO TEST
// =============================================

exports.assignBatchToTest = async (req, res) => {
  try {
    const { batchId } = req.body;

    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if user is creator
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can assign batches'
      });
    }

    // Check if batch exists
    const batch = await prisma.testBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Check if already assigned
    const assignedBatches = Array.isArray(test.assignedBatches) ? test.assignedBatches : [];
    if (assignedBatches.includes(batchId)) {
      return res.status(400).json({
        success: false,
        message: 'Batch is already assigned to this test'
      });
    }

    // Add batch to test
    const newAssignedBatches = assignedBatches.slice();
    newAssignedBatches.push(batchId);
    const updatedTest = await prisma.aptitudeTest.update({
      where: { id: test.id },
      data: { assignedBatches: newAssignedBatches }
    });

    // Add test to batch
    await aptitudeTestService.assignTestToBatch(batch, updatedTest.id);

    res.status(200).json({
      success: true,
      message: 'Batch assigned successfully',
      data: updatedTest
    });

  } catch (error) {
    console.error('Error assigning batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning batch',
      error: error.message
    });
  }
};

// =============================================
// REMOVE BATCH FROM TEST
// =============================================

exports.removeBatchFromTest = async (req, res) => {
  try {
    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if user is creator
    if (test.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can remove batches'
      });
    }

    // Remove batch from test
    const assignedBatches = (Array.isArray(test.assignedBatches) ? test.assignedBatches : []).filter(
      id => id.toString() !== req.params.batchId
    );
    const updatedTest = await prisma.aptitudeTest.update({
      where: { id: test.id },
      data: { assignedBatches }
    });

    // Remove test from batch
    const batch = await prisma.testBatch.findUnique({ where: { id: req.params.batchId } });
    if (batch) {
      await aptitudeTestService.removeTestFromBatch(batch, updatedTest.id);
    }

    res.status(200).json({
      success: true,
      message: 'Batch removed successfully',
      data: updatedTest
    });

  } catch (error) {
    console.error('Error removing batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing batch',
      error: error.message
    });
  }
};

// =============================================
// GET LIVE MONITORING
// =============================================

exports.getLiveMonitoring = async (req, res) => {
  try {
    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Get all in-progress attempts
    const attempts = await prisma.testAttempt.findMany({
      where: {
        testId: test.id,
        status: 'in-progress',
        isDeleted: false
      },
      orderBy: { lastActivityAt: 'desc' }
    });

    // populate('studentId', 'name email avatar') and populate('batchId', 'batchName')
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
      const student = studentMap.get(a.studentId);
      a.studentId = student
        ? { id: student.id, name: student.name, email: student.email, avatar: student.avatar }
        : a.studentId;
      if (a.batchId) {
        const batch = batchMap.get(a.batchId);
        a.batchId = batch ? { id: batch.id, batchName: batch.batchName } : a.batchId;
      }
    });

    // Format monitoring data
    const monitoringData = attempts.map(attempt => {
      const totalQuestions = test.totalQuestions;
      const responses = Array.isArray(attempt.responses) ? attempt.responses : [];
      const answeredQuestions = responses.filter(r => r.selectedAnswer && r.selectedAnswer.length > 0).length;

      const proctoring = attempt.proctoring || {};
      const cameraSnapshots = Array.isArray(proctoring.cameraSnapshots) ? proctoring.cameraSnapshots : [];

      // Get latest snapshot
      const latestSnapshot = cameraSnapshots.length > 0
        ? cameraSnapshots[cameraSnapshots.length - 1]
        : null;

      return {
        attemptId: attempt.id,
        student: attempt.studentId,
        batch: attempt.batchId,
        progress: {
          answered: answeredQuestions,
          total: totalQuestions,
          percentage: Math.round((answeredQuestions / totalQuestions) * 100)
        },
        timeElapsed: attempt.timeTaken,
        timeRemaining: test.duration - attempt.timeTaken,
        lastActivity: attempt.lastActivityAt,
        violations: {
          tabSwitches: proctoring.tabSwitchCount,
          fullscreenExits: proctoring.fullscreenExitCount,
          severity: proctoring.violationSeverity,
          hasViolations: proctoring.hasViolations
        },
        latestSnapshot: latestSnapshot ? latestSnapshot.url : null
      };
    });

    res.status(200).json({
      success: true,
      data: {
        testInfo: {
          title: test.title,
          duration: test.duration,
          totalQuestions: test.totalQuestions
        },
        activeAttempts: monitoringData.length,
        attempts: monitoringData
      }
    });

  } catch (error) {
    console.error('Error fetching live monitoring:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching live monitoring',
      error: error.message
    });
  }
};

// =============================================
// GET PROCTORING SNAPSHOTS
// =============================================

exports.getProctoringSnapshots = async (req, res) => {
  try {
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: req.params.attemptId }
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    // populate('studentId', 'name email') and populate('testId', 'title')
    const student = attempt.studentId
      ? await prisma.student.findUnique({ where: { id: attempt.studentId } })
      : null;
    const test = attempt.testId
      ? await prisma.aptitudeTest.findUnique({ where: { id: attempt.testId } })
      : null;

    const proctoring = attempt.proctoring || {};

    res.status(200).json({
      success: true,
      data: {
        student: student
          ? { id: student.id, name: student.name, email: student.email }
          : attempt.studentId,
        test: test ? { id: test.id, title: test.title } : attempt.testId,
        snapshots: proctoring.cameraSnapshots,
        violations: {
          tabSwitches: proctoring.tabSwitches,
          fullscreenExits: proctoring.fullscreenExits
        }
      }
    });

  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching snapshots',
      error: error.message
    });
  }
};

// =============================================
// STUDENT ROUTES
// =============================================

exports.getMyTests = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.user.id } });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log('Student ID:', student.id);
    console.log('Student Info:', { name: student.name, email: student.email, course: student.course, branch: student.branch, passoutYear: student.passoutYear });

    // Find ALL published tests
    // schedule.startDate lives inside the JSON `schedule` column, so sort in JS.
    let allTests = await prisma.aptitudeTest.findMany({
      where: {
        status: 'published',
        isDeleted: false
      }
    });
    allTests = allTests.sort((a, b) => {
      const sa = (a.schedule && a.schedule.startDate) ? new Date(a.schedule.startDate).getTime() : 0;
      const sb = (b.schedule && b.schedule.startDate) ? new Date(b.schedule.startDate).getTime() : 0;
      return sb - sa; // -1 (descending)
    });

    console.log('Found total published tests:', allTests.length);

    // Filter tests based on recipients
    const tests = allTests.filter(test => {
      // If test uses old batch system (for backwards compatibility)
      if (test.assignedBatches && test.assignedBatches.length > 0) {
        return true; // Will be filtered by batch check later
      }

      // Check if test has recipients configured
      if (!test.recipients) {
        return false;
      }

      const { students: studentRecipients } = test.recipients;

      // Check if all students are selected
      if (studentRecipients && studentRecipients.all) {
        return true;
      }

      // Check if student matches course filter
      if (studentRecipients && studentRecipients.courses && studentRecipients.courses.length > 0) {
        if (!studentRecipients.courses.includes(student.course)) {
          return false;
        }
      }

      // Check if student matches branch filter
      if (studentRecipients && studentRecipients.branches && studentRecipients.branches.length > 0) {
        if (!studentRecipients.branches.includes(student.branch)) {
          return false;
        }
      }

      // Check if student matches passout year filter
      if (studentRecipients && studentRecipients.passoutYears && studentRecipients.passoutYears.length > 0) {
        if (!studentRecipients.passoutYears.includes(student.passoutYear)) {
          return false;
        }
      }

      // If we have specific filters but student doesn't match any, exclude
      if (studentRecipients &&
          (studentRecipients.courses.length > 0 ||
           studentRecipients.branches.length > 0 ||
           studentRecipients.passoutYears.length > 0)) {
        return true;
      }

      return false;
    });

    console.log('Tests after recipient filtering:', tests.length);
    console.log('Test Titles:', tests.map(t => t.title));

    // For each test, check if student has attempted
    const testsWithStatus = await Promise.all(tests.map(async (test) => {
      const attempt = await prisma.testAttempt.findFirst({
        where: {
          testId: test.id,
          studentId: student.id
        }
      });

      const now = new Date();
      let testStatus = 'upcoming';

      const schedule = test.schedule || {};
      const startDate = schedule.startDate ? new Date(schedule.startDate) : null;
      const endDate = schedule.endDate ? new Date(schedule.endDate) : null;

      if (attempt) {
        testStatus = attempt.status === 'completed' ? 'completed' : 'in-progress';
      } else if (endDate < now) {
        testStatus = 'expired';
      } else if (startDate <= now && endDate >= now) {
        testStatus = 'available';
      }

      return {
        ...test,
        attemptStatus: testStatus,
        attemptId: attempt ? attempt.id : null,
        score: attempt && attempt.status === 'completed' ? attempt.score : null,
        percentage: attempt && attempt.status === 'completed' ? attempt.percentage : null
      };
    }));

    res.status(200).json({
      success: true,
      data: testsWithStatus
    });

  } catch (error) {
    console.error('Error fetching my tests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tests',
      error: error.message
    });
  }
};

exports.getTestPreview = async (req, res) => {
  try {
    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        status: 'published',
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    // Check if student has access
    const student = await prisma.student.findUnique({ where: { id: req.user.id } });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check eligibility based on recipient system
    let isEligible = false;

    // Check if test uses new recipient system
    if (test.recipients && test.recipients.students) {
      const { students: studentRecipients } = test.recipients;

      // Check if all students are selected
      if (studentRecipients.all) {
        isEligible = true;
      } else {
        // Check if any filters are actually specified
        const hasCoursesFilter = studentRecipients.courses && studentRecipients.courses.length > 0;
        const hasBranchesFilter = studentRecipients.branches && studentRecipients.branches.length > 0;
        const hasPassoutYearsFilter = studentRecipients.passoutYears && studentRecipients.passoutYears.length > 0;

        // If NO filters are specified, but recipients.students exists, allow all students
        if (!hasCoursesFilter && !hasBranchesFilter && !hasPassoutYearsFilter) {
          isEligible = true;
        } else {
          // Check specific filters
          let matchesCourse = true;
          let matchesBranch = true;
          let matchesPassoutYear = true;

          // If courses are specified, student must match
          if (hasCoursesFilter) {
            matchesCourse = studentRecipients.courses.includes(student.course);
          }

          // If branches are specified, student must match
          if (hasBranchesFilter) {
            matchesBranch = studentRecipients.branches.includes(student.branch);
          }

          // If passout years are specified, student must match
          if (hasPassoutYearsFilter) {
            matchesPassoutYear = studentRecipients.passoutYears.includes(student.passoutYear);
          }

          // Student must match ALL specified filters
          isEligible = matchesCourse && matchesBranch && matchesPassoutYear;
        }
      }
    }
    // Fallback to old batch system for backwards compatibility
    else if (test.assignedBatches && test.assignedBatches.length > 0) {
      const batches = await prisma.testBatch.findMany({
        where: {
          students: { has: student.id },
          id: { in: test.assignedBatches }
        }
      });
      isEligible = batches.length > 0;
    }

    if (!isEligible) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this test'
      });
    }

    // Return test info without questions
    const testPreview = {
      _id: test.id,
      title: test.title,
      description: test.description,
      instructions: test.instructions,
      duration: test.duration,
      totalMarks: test.totalMarks,
      totalQuestions: test.totalQuestions,
      passPercentage: test.passPercentage,
      schedule: test.schedule,
      settings: test.settings
    };

    res.status(200).json({
      success: true,
      data: testPreview
    });

  } catch (error) {
    console.error('Error fetching test preview:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test preview',
      error: error.message
    });
  }
};

exports.checkEligibility = async (req, res) => {
  try {
    const test = await prisma.aptitudeTest.findFirst({
      where: {
        id: req.params.id,
        status: 'published',
        isDeleted: false
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    const student = await prisma.student.findUnique({ where: { id: req.user.id } });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student is eligible based on recipients
    let isEligible = false;

    // Check if test uses new recipient system
    if (test.recipients && test.recipients.students) {
      const { students: studentRecipients } = test.recipients;

      // Check if all students are selected
      if (studentRecipients.all) {
        isEligible = true;
      } else {
        // Check specific filters
        let matchesCourse = true;
        let matchesBranch = true;
        let matchesPassoutYear = true;

        // If courses are specified, student must match
        if (studentRecipients.courses && studentRecipients.courses.length > 0) {
          matchesCourse = studentRecipients.courses.includes(student.course);
        }

        // If branches are specified, student must match
        if (studentRecipients.branches && studentRecipients.branches.length > 0) {
          matchesBranch = studentRecipients.branches.includes(student.branch);
        }

        // If passout years are specified, student must match
        if (studentRecipients.passoutYears && studentRecipients.passoutYears.length > 0) {
          matchesPassoutYear = studentRecipients.passoutYears.includes(student.passoutYear);
        }

        // Student must match ALL specified filters
        if (studentRecipients.courses.length > 0 ||
            studentRecipients.branches.length > 0 ||
            studentRecipients.passoutYears.length > 0) {
          isEligible = matchesCourse && matchesBranch && matchesPassoutYear;
        }
      }
    }
    // Fallback to old batch system for backwards compatibility
    else if (test.assignedBatches && test.assignedBatches.length > 0) {
      const batches = await prisma.testBatch.findMany({
        where: {
          students: { has: student.id },
          id: { in: test.assignedBatches }
        }
      });
      isEligible = batches.length > 0;
    }

    if (!isEligible) {
      return res.status(200).json({
        success: true,
        data: {
          eligible: false,
          reason: 'You are not assigned to this test'
        }
      });
    }

    // Check if already attempted
    const existingAttempt = await prisma.testAttempt.findFirst({
      where: {
        testId: test.id,
        studentId: student.id
      }
    });

    if (existingAttempt) {
      return res.status(200).json({
        success: true,
        data: {
          eligible: false,
          reason: 'You have already attempted this test',
          attemptStatus: existingAttempt.status
        }
      });
    }

    // Check schedule
    const now = new Date();
    const schedule = test.schedule || {};
    const startDate = schedule.startDate ? new Date(schedule.startDate) : null;
    const endDate = schedule.endDate ? new Date(schedule.endDate) : null;

    if (startDate > now) {
      return res.status(200).json({
        success: true,
        data: {
          eligible: false,
          reason: 'Test has not started yet',
          startDate: test.schedule.startDate
        }
      });
    }

    if (endDate < now) {
      return res.status(200).json({
        success: true,
        data: {
          eligible: false,
          reason: 'Test has expired'
        }
      });
    }

    // Eligible
    res.status(200).json({
      success: true,
      data: {
        eligible: true,
        message: 'You are eligible to take this test'
      }
    });

  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking eligibility',
      error: error.message
    });
  }
};

// =============================================
// AI TEST GENERATION
// =============================================

exports.generateTestWithAI = async (req, res) => {
  try {
    const {
      companyName,
      numberOfQuestions,
      difficulty,
      topics,
      questionTypes,
      year,
      generationType // 'company' or 'previous-year'
    } = req.body;

    if (!companyName || !numberOfQuestions) {
      return res.status(400).json({
        success: false,
        message: 'Please provide company name and number of questions'
      });
    }

    let questions;

    if (generationType === 'previous-year' && year) {
      // Generate from previous year pattern
      questions = await aiTestGenerationService.generateFromPreviousYear({
        year,
        companyName,
        numberOfQuestions,
        difficulty: difficulty || 'medium'
      });
    } else {
      // Generate from company pattern
      questions = await aiTestGenerationService.generateTestFromCompany({
        companyName,
        numberOfQuestions,
        difficulty: difficulty || 'medium',
        topics: topics || [],
        questionTypes: questionTypes || ['aptitude', 'logical', 'verbal']
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully generated ${questions.length} questions`,
      data: questions
    });

  } catch (error) {
    console.error('Error generating test with AI:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating test with AI',
      error: error.message
    });
  }
};
