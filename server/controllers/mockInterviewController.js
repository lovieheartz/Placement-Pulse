const prisma = require('../lib/prisma');
const aiService = require('../services/aiService');

// ===== Ported MockInterview model logic (Prisma returns plain objects) =====

// Ported from mockInterviewSchema.methods.calculateOverallScore.
// Mutates the plain `interview` object's score fields and returns overallScore.
function calculateOverallScore(interview) {
  const questions = interview.questions || [];
  if (questions.length === 0) {
    interview.overallScore = 0;
    return 0;
  }

  const totalScore = questions.reduce((sum, q) => sum + (q.aiScore || 0), 0);
  interview.overallScore = Math.round((totalScore / questions.length) * 10);

  interview.technicalScore = Math.round(
    questions.reduce((sum, q) => sum + (q.technicalAccuracy || 0), 0) / questions.length * 10
  );

  interview.communicationScore = Math.round(
    questions.reduce((sum, q) => sum + (q.communication || 0), 0) / questions.length * 10
  );

  interview.confidenceScore = Math.round(
    questions.reduce((sum, q) => sum + (q.confidence || 0), 0) / questions.length * 10
  );

  return interview.overallScore;
}

// Ported from mockInterviewSchema.methods.calculateReadinessLevel.
function calculateReadinessLevel(interview) {
  const score = interview.overallScore;

  if (score >= 90) return 'excellent';
  if (score >= 75) return 'well_prepared';
  if (score >= 60) return 'ready';
  if (score >= 40) return 'needs_improvement';
  return 'not_ready';
}

// Ported from mockInterviewSchema.virtual('duration').
function getDuration(interview) {
  if (interview.completedAt && interview.startedAt) {
    return Math.round(
      (new Date(interview.completedAt) - new Date(interview.startedAt)) / 1000 / 60
    ); // in minutes
  }
  return null;
}

class MockInterviewController {

  // ========== START NEW INTERVIEW ==========
  static async startInterview(req, res) {
    try {
      const { jobRole, experienceLevel, industry, difficulty, totalQuestions } = req.body;
      const studentId = req.user.id;

      // Validate input
      if (!jobRole || !industry) {
        return res.status(400).json({
          success: false,
          message: 'Job role and industry are required'
        });
      }

      // Set question count based on difficulty
      let questionCount = totalQuestions || 15;
      if (difficulty === 'easy') {
        questionCount = Math.floor(Math.random() * 11) + 10; // 10-20
      } else if (difficulty === 'medium') {
        questionCount = Math.floor(Math.random() * 11) + 20; // 20-30
      } else if (difficulty === 'hard') {
        questionCount = Math.floor(Math.random() * 6) + 30; // 30-35
      }

      console.log(`🎤 Starting ${difficulty} level mock interview for: ${jobRole} in ${industry} (${questionCount} questions)`);

      // Generate first question using Gemini with timeout
      let firstQuestion;
      try {
        console.log('📝 Generating first question...');
        firstQuestion = await Promise.race([
          MockInterviewController.generateQuestion(
            jobRole,
            experienceLevel || 'fresher',
            industry,
            difficulty,
            1,
            questionCount,
            []
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Question generation timeout')), 15000)
          )
        ]);
        console.log('✅ First question generated successfully');
      } catch (questionError) {
        console.error('⚠️  Question generation failed, using fallback:', questionError.message);
        firstQuestion = MockInterviewController.getFallbackQuestion(jobRole, 1);
      }

      // Create interview session
      const interview = await prisma.mockInterview.create({
        data: {
          studentId,
          jobRole,
          experienceLevel: experienceLevel || 'fresher',
          industry,
          difficulty: difficulty || 'medium',
          totalQuestions: questionCount,
          currentQuestionIndex: 0,
          questions: [{
            questionNumber: 1,
            question: firstQuestion,
            askedAt: new Date()
          }],
          status: 'in_progress'
        }
      });

      console.log(`✅ Interview created with ID: ${interview.id}`);

      return res.status(201).json({
        success: true,
        message: 'Interview started successfully',
        data: {
          interviewId: interview.id,
          jobRole: interview.jobRole,
          industry: interview.industry,
          difficulty: interview.difficulty,
          totalQuestions: interview.totalQuestions,
          currentQuestion: {
            questionNumber: 1,
            question: firstQuestion
          }
        }
      });

    } catch (error) {
      console.error('❌ Error starting interview:', error);
      console.error('Error stack:', error.stack);
      return res.status(500).json({
        success: false,
        message: 'Failed to start interview. Please try again.',
        error: error.message
      });
    }
  }

  // ========== SUBMIT ANSWER & GET NEXT QUESTION ==========
  static async submitAnswer(req, res) {
    try {
      const { interviewId } = req.params;
      const { answer } = req.body;
      const studentId = req.user.id;

      // Find interview
      const interview = await prisma.mockInterview.findFirst({
        where: { id: interviewId, studentId }
      });

      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      // Ensure questions is a mutable array (JSON column)
      if (!Array.isArray(interview.questions)) {
        interview.questions = [];
      }

      if (interview.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          message: 'Interview is not in progress'
        });
      }

      const currentIndex = interview.currentQuestionIndex;
      const currentQuestion = interview.questions[currentIndex];

      if (!currentQuestion) {
        return res.status(400).json({
          success: false,
          message: 'No active question found'
        });
      }

      console.log(`📝 Answer submitted for Q${currentQuestion.questionNumber}`);

      // Determine question type for better analysis
      const progress = currentQuestion.questionNumber / interview.totalQuestions;
      let questionType = 'general';
      if (currentQuestion.questionNumber === 1) questionType = 'introduction';
      else if (progress <= 0.3) questionType = 'technical_basic';
      else if (progress <= 0.6) questionType = 'technical_advanced';
      else if (progress <= 0.8) questionType = 'behavioral';
      else questionType = 'situational_hr';

      // Analyze the answer using AI Service
      const analysis = await MockInterviewController.analyzeAnswer(
        currentQuestion.question,
        answer,
        interview.jobRole,
        interview.experienceLevel,
        interview.industry,
        interview.difficulty,
        currentQuestion.questionNumber,
        questionType
      );

      // Update the question with answer and analysis
      interview.questions[currentIndex] = {
        ...currentQuestion,
        studentAnswer: answer,
        answeredAt: new Date(),
        aiScore: analysis.aiScore,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        improvementSuggestions: analysis.improvementSuggestions,
        idealAnswer: analysis.idealAnswer,
        technicalAccuracy: analysis.technicalAccuracy,
        communication: analysis.communication,
        confidence: analysis.confidence,
        completeness: analysis.completeness
      };

      // Move to next question or complete interview
      const nextQuestionNumber = currentIndex + 2;
      const isLastQuestion = nextQuestionNumber > interview.totalQuestions;

      let nextQuestion = null;

      if (!isLastQuestion) {
        // Generate next question
        const previousQuestions = interview.questions.map(q => q.question);
        nextQuestion = await MockInterviewController.generateQuestion(
          interview.jobRole,
          interview.experienceLevel,
          interview.industry,
          interview.difficulty,
          nextQuestionNumber,
          interview.totalQuestions,
          previousQuestions
        );

        // Add next question
        interview.questions.push({
          questionNumber: nextQuestionNumber,
          question: nextQuestion,
          askedAt: new Date()
        });

        interview.currentQuestionIndex = currentIndex + 1;
      } else {
        // Complete the interview
        interview.status = 'completed';
        interview.completedAt = new Date();

        // Calculate scores
        calculateOverallScore(interview);

        // Generate overall feedback with closing
        const overallFeedback = await MockInterviewController.generateOverallFeedback(interview);
        interview.overallFeedback = overallFeedback;
        interview.overallFeedback.readinessLevel = calculateReadinessLevel(interview);

        // Generate closing message
        interview.overallFeedback.closingMessage = await MockInterviewController.generateClosingMessage(interview);
      }

      // Persist all mutations to the interview row
      await prisma.mockInterview.update({
        where: { id: interview.id },
        data: {
          questions: interview.questions,
          currentQuestionIndex: interview.currentQuestionIndex,
          status: interview.status,
          completedAt: interview.completedAt,
          overallScore: interview.overallScore,
          technicalScore: interview.technicalScore,
          communicationScore: interview.communicationScore,
          confidenceScore: interview.confidenceScore,
          overallFeedback: interview.overallFeedback
        }
      });

      // Prepare response
      const response = {
        success: true,
        message: isLastQuestion ? 'Interview completed!' : 'Answer submitted successfully',
        data: {
          analysis,
          isCompleted: isLastQuestion,
          currentQuestionNumber: isLastQuestion ? interview.totalQuestions : nextQuestionNumber - 1
        }
      };

      if (!isLastQuestion) {
        response.data.nextQuestion = {
          questionNumber: nextQuestionNumber,
          question: nextQuestion
        };
      } else {
        response.data.finalReport = {
          overallScore: interview.overallScore,
          technicalScore: interview.technicalScore,
          communicationScore: interview.communicationScore,
          confidenceScore: interview.confidenceScore,
          overallFeedback: interview.overallFeedback,
          duration: getDuration(interview)
        };
      }

      return res.status(200).json(response);

    } catch (error) {
      console.error('❌ Error submitting answer:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to submit answer',
        error: error.message
      });
    }
  }

  // ========== GET INTERVIEW RESULTS ==========
  static async getInterviewResults(req, res) {
    try {
      const { interviewId } = req.params;
      const studentId = req.user.id;

      const interview = await prisma.mockInterview.findFirst({
        where: { id: interviewId, studentId }
      });

      if (!interview) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          interviewId: interview.id,
          jobRole: interview.jobRole,
          difficulty: interview.difficulty,
          status: interview.status,
          startedAt: interview.startedAt,
          completedAt: interview.completedAt,
          duration: getDuration(interview),
          overallScore: interview.overallScore,
          technicalScore: interview.technicalScore,
          communicationScore: interview.communicationScore,
          confidenceScore: interview.confidenceScore,
          questions: interview.questions,
          overallFeedback: interview.overallFeedback
        }
      });

    } catch (error) {
      console.error('❌ Error fetching interview results:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch interview results',
        error: error.message
      });
    }
  }

  // ========== GET INTERVIEW HISTORY ==========
  static async getInterviewHistory(req, res) {
    try {
      const studentId = req.user.id;

      const interviews = await prisma.mockInterview.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Strip idealAnswer / improvementSuggestions from each question (JSON column),
      // preserving the original `.select('-questions.idealAnswer ...')` behavior.
      interviews.forEach((interview) => {
        if (Array.isArray(interview.questions)) {
          interview.questions = interview.questions.map((q) => {
            const { idealAnswer, improvementSuggestions, ...rest } = q;
            return rest;
          });
        }
      });

      return res.status(200).json({
        success: true,
        count: interviews.length,
        data: interviews
      });

    } catch (error) {
      console.error('❌ Error fetching interview history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch interview history',
        error: error.message
      });
    }
  }

  // ========== DELETE INTERVIEW ==========
  static async deleteInterview(req, res) {
    try {
      const { interviewId } = req.params;
      const studentId = req.user.id;

      const deleted = await prisma.mockInterview.deleteMany({
        where: { id: interviewId, studentId }
      });

      if (deleted.count === 0) {
        return res.status(404).json({
          success: false,
          message: 'Interview not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Interview deleted successfully'
      });

    } catch (error) {
      console.error('❌ Error deleting interview:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete interview',
        error: error.message
      });
    }
  }

  // ========== HELPER: GENERATE QUESTION USING AI SERVICE ==========
  static async generateQuestion(jobRole, experienceLevel, industry, difficulty, questionNumber, totalQuestions, previousQuestions) {
    try {
      if (!aiService.isAvailable()) {
        return MockInterviewController.getFallbackQuestion(jobRole, questionNumber);
      }

      // Determine question category based on interview progression
      const progress = questionNumber / totalQuestions;
      let questionType;
      let questionFocus;

      if (questionNumber === 1) {
        questionType = 'introduction';
        questionFocus = 'Build rapport, understand background';
      } else if (progress <= 0.3) {
        questionType = 'technical_basic';
        questionFocus = `Core technical skills for ${jobRole}`;
      } else if (progress <= 0.6) {
        questionType = 'technical_advanced';
        questionFocus = `Advanced concepts, problem-solving for ${jobRole}`;
      } else if (progress <= 0.8) {
        questionType = 'behavioral';
        questionFocus = 'Soft skills, teamwork, communication, conflict resolution';
      } else {
        questionType = 'situational_hr';
        questionFocus = 'Career goals, motivation, company fit, salary expectations';
      }

      const prompt = `You are Alex, an expert AI interviewer conducting a comprehensive ${difficulty} level interview for a ${jobRole} position in the ${industry} industry.

**Interview Context:**
- Position: ${jobRole}
- Industry: ${industry}
- Experience Level: ${experienceLevel}
- Difficulty: ${difficulty}
- Progress: Question ${questionNumber} of ${totalQuestions} (${Math.round(progress * 100)}% complete)
- Current Phase: ${questionType.toUpperCase().replace('_', ' ')}
- Focus Area: ${questionFocus}

${previousQuestions.length > 0 ? `**Previous Questions:**\n${previousQuestions.slice(-5).map((q, i) => `${i + 1}. ${q}`).join('\n')}\n` : ''}

**Your Objective:**
Generate ONE highly relevant, professional interview question that:
1. **Matches ${difficulty} difficulty** - ${difficulty === 'easy' ? 'Fundamental concepts, basic knowledge' : difficulty === 'medium' ? 'Intermediate complexity, practical application' : 'Advanced concepts, deep expertise, complex scenarios'}
2. **Fits the ${questionType} category** perfectly
3. **Tests ${questionFocus}** specifically
4. **Aligns with ${industry} industry** context and requirements
5. **Feels natural** in the conversation flow
6. **Is distinct** from previous questions (no repetition)
7. **Appropriate for ${experienceLevel}** level candidate

**Question Type Guidelines:**
- **Introduction (Q1)**: "So, tell me about yourself and what draws you to this ${jobRole} position in ${industry}?"
- **Technical Basic**: Core concepts, tools, technologies, fundamentals
- **Technical Advanced**: Problem-solving, system design, optimization, best practices
- **Behavioral**: "Tell me about a time when...", "How did you handle...", "Describe a situation where..."
- **Situational/HR**: Career goals, why this company, strengths/weaknesses, expectations

**Difficulty Calibration:**
- Easy: Basic definitions, simple scenarios, straightforward questions
- Medium: Practical applications, moderate complexity, trade-off questions
- Hard: Complex scenarios, multi-layered problems, deep technical knowledge

Return ONLY the question text - natural, professional, no numbering or labels.`;

      let generatedQuestion = await aiService.generateInterviewQuestion({
        jobRole,
        industry,
        difficulty,
        experienceLevel,
        questionNumber,
        totalQuestions,
        previousQuestions
      });

      // Clean up
      generatedQuestion = generatedQuestion.replace(/^["']|["']$/g, '').trim();
      generatedQuestion = generatedQuestion.replace(/^\d+\.\s*/, '');
      generatedQuestion = generatedQuestion.replace(/^Q\d+:\s*/i, '');

      console.log(`✅ Generated Q${questionNumber} (${questionType}): ${generatedQuestion.substring(0, 80)}...`);

      return generatedQuestion;

    } catch (error) {
      console.error('❌ Error generating question with Gemini:', error);
      return MockInterviewController.getFallbackQuestion(jobRole, questionNumber);
    }
  }

  // ========== HELPER: ANALYZE ANSWER USING AI SERVICE ==========
  static async analyzeAnswer(question, answer, jobRole, experienceLevel, industry, difficulty, questionNumber, questionType) {
    try {
      if (!aiService.isAvailable()) {
        return MockInterviewController.getFallbackAnalysis(answer);
      }

      const analysis = await aiService.analyzeAnswer({
        question,
        answer,
        jobRole,
        industry,
        difficulty,
        questionNumber,
        questionType
      });

      return analysis;

    } catch (error) {
      console.error('❌ Error analyzing answer with Gemini:', error);
      return MockInterviewController.getFallbackAnalysis(answer);
    }
  }

  // ========== HELPER: GENERATE OVERALL FEEDBACK ==========
  static async generateOverallFeedback(interview) {
    try {
      if (!aiService.isAvailable()) {
        return MockInterviewController.getFallbackFeedback(interview);
      }

      const questionsAnalysis = interview.questions.map(q => ({
        question: q.question,
        answer: q.studentAnswer,
        score: q.aiScore,
        strengths: q.strengths,
        weaknesses: q.weaknesses
      }));

      const prompt = `You are Alex, a warm and experienced career coach who just completed analyzing a ${interview.totalQuestions}-question mock interview.
Your goal is to provide encouraging, honest, and actionable feedback that motivates the candidate and gives them a clear path forward.

**Interview Summary:**
- Position: ${interview.jobRole}
- Experience Level: ${interview.experienceLevel}
- Overall Performance Score: ${interview.overallScore}/100
- Total Questions: ${interview.totalQuestions}

**Detailed Performance Analysis:**
${JSON.stringify(questionsAnalysis, null, 2)}

**Your Task:**
Provide comprehensive, personalized overall feedback in JSON format:

{
  "strengths": [
    "<Major strength 1 with specific example from their answers>",
    "<Major strength 2 with specific example from their answers>",
    "<Major strength 3 with specific example from their answers>",
    "<Major strength 4 with specific example from their answers>"
  ],
  "areasForImprovement": [
    "<Key area 1 to work on with specific observation>",
    "<Key area 2 to work on with specific observation>",
    "<Key area 3 to work on with specific observation>"
  ],
  "recommendations": [
    "<Specific, actionable recommendation 1 with resources/approach>",
    "<Specific, actionable recommendation 2 with resources/approach>",
    "<Specific, actionable recommendation 3 with resources/approach>",
    "<Specific, actionable recommendation 4 with resources/approach>",
    "<Specific, actionable recommendation 5 with resources/approach>"
  ]
}

**Feedback Guidelines:**
- Be warm, encouraging, and supportive - you want them to succeed!
- Reference specific moments from their interview (use their actual responses)
- Balance honesty with encouragement
- Make recommendations specific and actionable (not generic like "practice more")
- Provide a clear path forward with concrete steps
- Acknowledge their effort and improvement potential
- Use professional but friendly language
- Focus on growth mindset

Return ONLY valid JSON, no markdown or extra text.`;

      return await geminiService.generateJSON(prompt);

    } catch (error) {
      console.error('❌ Error generating overall feedback:', error);
      return MockInterviewController.getFallbackFeedback(interview);
    }
  }

  // ========== HELPER: GENERATE CLOSING MESSAGE ==========
  static async generateClosingMessage(interview) {
    try {
      if (!aiService.isAvailable()) {
        return `Thank you so much for completing this interview! You did a great job, and I've compiled all your responses into a comprehensive report. Best of luck with your ${interview.jobRole} journey!`;
      }

      const closing = await aiService.generateClosingMessage({
        jobRole: interview.jobRole,
        industry: interview.industry,
        totalQuestions: interview.totalQuestions,
        overallScore: interview.overallScore,
        readinessLevel: interview.overallFeedback?.readinessLevel || 'ready'
      });

      console.log(`✅ Generated closing message: ${closing}`);

      return closing;

    } catch (error) {
      console.error('❌ Error generating closing message:', error);
      return `Thank you so much for completing this interview! You did wonderfully, and I've prepared a detailed report with personalized feedback to help you succeed. Best of luck in your ${interview.jobRole} journey!`;
    }
  }

  // ========== INTELLIGENT FALLBACK METHODS ==========
  static getFallbackQuestion(jobRole, questionNumber) {
    // Comprehensive question bank organized by type
    const questionBank = {
      introduction: [
        `So, tell me about yourself and what draws you to this ${jobRole} position.`,
        `I'd love to hear about your journey and why you're interested in ${jobRole}.`,
        `Walk me through your background and what led you to apply for this role.`
      ],
      technical_basic: [
        `What are the core technologies and tools you've worked with for ${jobRole}?`,
        `Can you explain your understanding of the fundamental concepts in ${jobRole}?`,
        `What technical skills do you consider your strongest for this ${jobRole} role?`,
        `Describe your experience with the key tools used in ${jobRole}.`,
        `What programming languages or frameworks are you most comfortable with?`,
        `How would you approach learning a new technology required for this role?`
      ],
      technical_advanced: [
        `Describe a complex technical challenge you faced and how you solved it.`,
        `How do you approach debugging and troubleshooting in your projects?`,
        `Can you walk me through how you would design a system for [specific scenario]?`,
        `What are some best practices you follow in your development workflow?`,
        `Tell me about a time when you had to optimize code or improve performance.`,
        `How do you ensure code quality and maintainability in your projects?`,
        `Explain a technical concept you recently learned and how you applied it.`
      ],
      behavioral: [
        `Tell me about a time when you had to work with a difficult team member.`,
        `Describe a situation where you had to meet a tight deadline.`,
        `How do you handle constructive criticism or feedback?`,
        `Can you give an example of when you demonstrated leadership?`,
        `Tell me about a time you failed and what you learned from it.`,
        `How do you prioritize tasks when you have multiple deadlines?`,
        `Describe a situation where you had to adapt to a major change.`
      ],
      situational_hr: [
        `Why do you want to work for our company specifically?`,
        `What are your salary expectations for this ${jobRole} position?`,
        `Where do you see yourself in 3-5 years?`,
        `What motivates you in your professional life?`,
        `How do you define success in your career?`,
        `What are your biggest professional strengths and weaknesses?`,
        `Why should we hire you for this ${jobRole} role?`,
        `Do you have any questions for us about the role or company?`
      ]
    };

    // Determine question category based on number
    let category, questions;
    if (questionNumber === 1) {
      category = 'introduction';
    } else if (questionNumber <= 8) {
      category = 'technical_basic';
    } else if (questionNumber <= 16) {
      category = 'technical_advanced';
    } else if (questionNumber <= 24) {
      category = 'behavioral';
    } else {
      category = 'situational_hr';
    }

    questions = questionBank[category];
    const index = (questionNumber - 1) % questions.length;
    return questions[index];
  }

  static getFallbackAnalysis(answer) {
    const wordCount = answer.split(' ').length;
    const sentenceCount = answer.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

    // Intelligent scoring based on answer quality indicators
    const hasExamples = /example|instance|time when|situation|experience|project/i.test(answer);
    const hasNumbers = /\d+/.test(answer);
    const hasTechnicalTerms = /\b(code|develop|design|implement|system|data|algorithm|framework|api|database)\b/i.test(answer);
    const isDetailed = wordCount > 50;
    const isStructured = sentenceCount > 2;

    // Calculate scores
    let technicalScore = 5;
    if (hasTechnicalTerms) technicalScore += 2;
    if (hasNumbers) technicalScore += 1;
    if (isDetailed) technicalScore += 2;

    let communicationScore = 5;
    if (isStructured) communicationScore += 2;
    if (wordCount > 30 && wordCount < 150) communicationScore += 2;
    if (sentenceCount >= 3) communicationScore += 1;

    let confidenceScore = 5;
    if (wordCount > 40) confidenceScore += 2;
    if (hasExamples) confidenceScore += 2;
    if (!answer.includes('um') && !answer.includes('uh')) confidenceScore += 1;

    let completenessScore = 5;
    if (isDetailed) completenessScore += 2;
    if (hasExamples) completenessScore += 2;
    if (sentenceCount >= 4) completenessScore += 1;

    const avgScore = Math.round((technicalScore + communicationScore + confidenceScore + completenessScore) / 4);

    // Generate contextual feedback
    const strengths = [];
    const weaknesses = [];
    const suggestions = [];

    if (wordCount > 50) {
      strengths.push('Provided a detailed response');
    } else {
      weaknesses.push('Answer could be more detailed');
      suggestions.push('Expand your answer with more details and examples');
    }

    if (hasExamples) {
      strengths.push('Included specific examples or experiences');
    } else {
      suggestions.push('Add specific examples from your experience to strengthen your answer');
    }

    if (hasTechnicalTerms) {
      strengths.push('Demonstrated technical knowledge');
    } else if (weaknesses.length < 2) {
      weaknesses.push('Could include more technical terminology where relevant');
    }

    if (isStructured) {
      strengths.push('Answer was well-structured and clear');
    } else {
      suggestions.push('Structure your answer with clear points (e.g., situation, action, result)');
    }

    // Add general suggestion if needed
    if (suggestions.length < 2) {
      suggestions.push('Practice articulating your thoughts more confidently');
    }

    return {
      aiScore: Math.min(10, avgScore),
      technicalAccuracy: Math.min(10, technicalScore),
      communication: Math.min(10, communicationScore),
      confidence: Math.min(10, confidenceScore),
      completeness: Math.min(10, completenessScore),
      strengths: strengths.length > 0 ? strengths : ['Provided a response', 'Engaged with the question'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['Could provide more depth'],
      improvementSuggestions: suggestions,
      idealAnswer: 'A comprehensive answer that includes specific examples, demonstrates relevant technical knowledge, and is well-structured with clear communication.'
    };
  }

  static getFallbackFeedback(interview) {
    return {
      strengths: ['Completed the interview', 'Provided answers to all questions'],
      areasForImprovement: ['Practice more mock interviews', 'Work on specific technical skills'],
      recommendations: [
        'Continue practicing mock interviews',
        'Review common interview questions',
        'Work on communication skills'
      ]
    };
  }
}

module.exports = MockInterviewController;
