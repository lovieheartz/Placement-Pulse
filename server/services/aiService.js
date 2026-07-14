const aiProvider = require('./aiProvider');
const { Type } = aiProvider;

const score10 = { type: Type.INTEGER, description: '1-10' };
const strings = { type: Type.ARRAY, items: { type: Type.STRING } };

const ANSWER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    aiScore: score10,
    technicalAccuracy: score10,
    communication: score10,
    confidence: score10,
    completeness: score10,
    strengths: strings,
    weaknesses: strings,
    improvementSuggestions: strings,
    idealAnswer: { type: Type.STRING },
  },
  required: [
    'aiScore', 'technicalAccuracy', 'communication', 'confidence',
    'completeness', 'strengths', 'weaknesses', 'improvementSuggestions', 'idealAnswer',
  ],
};

/**
 * 🤖 DOMAIN AI SERVICE
 * Interview questions, answer analysis, resume feedback.
 *
 * This class owns the prompts and nothing else. Model choice, fallback and
 * JSON enforcement live in aiProvider, so there is one place to update when a
 * model is retired.
 */
class AIService {
  /**
   * @param {string} prompt
   * @param {object} [options] responseFormat: 'text' | 'json', schema, temperature, maxTokens
   */
  async generate(prompt, options = {}) {
    const {
      responseFormat = 'text',
      schema,
      temperature = 0.8,
      // Shared with the model's internal thinking — a tight cap truncates the answer.
      maxTokens = 16384,
    } = options;

    return responseFormat === 'json'
      ? aiProvider.generateJSON(prompt, { schema, temperature, maxTokens })
      : aiProvider.generateText(prompt, { temperature, maxTokens });
  }

  /**
   * 🎤 GENERATE INTERVIEW QUESTION
   * Context-aware, progressive difficulty
   */
  async generateInterviewQuestion(context) {
    const {
      jobRole,
      industry,
      difficulty,
      experienceLevel,
      questionNumber,
      totalQuestions,
      previousQuestions = [],
      conversationHistory = []
    } = context;

    const progress = questionNumber / totalQuestions;
    const phase = this.determineInterviewPhase(progress, questionNumber);

    const prompt = `You are Alex, an expert AI interviewer conducting a professional interview.

**CONTEXT:**
- Position: ${jobRole}
- Industry: ${industry}
- Difficulty: ${difficulty}
- Experience: ${experienceLevel}
- Progress: Question ${questionNumber}/${totalQuestions} (${Math.round(progress * 100)}%)
- Current Phase: ${phase.type.toUpperCase()}
- Focus: ${phase.focus}

${previousQuestions.length > 0 ? `**PREVIOUS QUESTIONS:**
${previousQuestions.slice(-3).map((q, i) => `${i + 1}. ${q}`).join('\n')}
` : ''}
${conversationHistory.length > 0 ? `**RECENT CONVERSATION:**
${conversationHistory.slice(-2).map(msg => `${msg.role === 'ai' ? 'You' : 'Candidate'}: ${msg.text.substring(0, 100)}...`).join('\n')}
` : ''}
**YOUR TASK:**
Generate ONE interview question that:
1. Matches "${difficulty}" difficulty level
2. Fits the ${phase.type} phase perfectly
3. Tests ${phase.focus}
4. Feels natural and conversational
5. Is relevant to ${jobRole} in ${industry}
6. Builds on the conversation flow
7. Is distinct from previous questions

**IMPORTANT:**
- Return ONLY the question text
- No numbering, no labels, no explanations
- Keep it professional yet warm
- Make it sound human and natural

Question:`;

    try {
      const question = await this.generate(prompt, {
        maxRetries: 0, // No retries for speed
        preferredProvider: 'gemini',
        responseFormat: 'text',
        temperature: 0.85,
        maxTokens: 200
      });

      return question.replace(/^["']|["']$/g, '').trim();
    } catch (error) {
      console.log(`⚡ Using fallback question (API failed: ${error.message})`);
      return this.getFallbackQuestion(jobRole, questionNumber, phase.type);
    }
  }

  /**
   * 📊 ANALYZE INTERVIEW ANSWER
   * Multi-dimensional scoring with detailed feedback
   */
  async analyzeAnswer(context) {
    const {
      question,
      answer,
      jobRole,
      industry,
      difficulty,
      questionNumber,
      questionType
    } = context;

    const prompt = `You are Alex, an expert interview assessor analyzing a candidate's response.

**INTERVIEW CONTEXT:**
- Position: ${jobRole}
- Industry: ${industry}
- Difficulty: ${difficulty}
- Question #${questionNumber}
- Type: ${questionType}

**QUESTION:**
"${question}"

**CANDIDATE'S ANSWER:**
"${answer}"

**YOUR TASK:**
Analyze this answer comprehensively and provide detailed, constructive feedback.

**RESPONSE FORMAT (MUST BE VALID JSON):**
{
  "aiScore": <number 1-10>,
  "technicalAccuracy": <number 1-10>,
  "communication": <number 1-10>,
  "confidence": <number 1-10>,
  "completeness": <number 1-10>,
  "strengths": [
    "Specific strength 1",
    "Specific strength 2"
  ],
  "weaknesses": [
    "Constructive weakness 1"
  ],
  "improvementSuggestions": [
    "Actionable suggestion 1",
    "Actionable suggestion 2",
    "Actionable suggestion 3"
  ],
  "idealAnswer": "A brief example of a stronger response (2-3 sentences)"
}

**SCORING GUIDELINES:**
- Technical Accuracy: Correctness of information, industry knowledge
- Communication: Clarity, structure, articulation
- Confidence: Assertiveness, conviction, poise
- Completeness: Thoroughness, depth, examples provided

**IMPORTANT:**
- Be fair but honest
- Provide specific, actionable feedback
- Focus on improvement, not criticism
- Consider the difficulty level
- Return ONLY valid JSON, no markdown`;

    try {
      const analysis = await this.generate(prompt, {
        responseFormat: 'json',
        schema: ANSWER_SCHEMA,
        temperature: 0.7,
      });

      // Validate structure
      if (!analysis.aiScore || !analysis.strengths) {
        throw new Error('Invalid analysis structure');
      }

      console.log(`✅ Answer analyzed successfully`);
      return analysis;
    } catch (error) {
      console.error('Answer analysis failed:', error.message);
      return this.getFallbackAnalysis(answer);
    }
  }

  /**
   * 🎬 GENERATE CLOSING MESSAGE
   * Warm, personalized interview conclusion
   */
  async generateClosingMessage(context) {
    const {
      jobRole,
      industry,
      totalQuestions,
      overallScore,
      readinessLevel
    } = context;

    const prompt = `You are Alex, the AI interviewer concluding a ${totalQuestions}-question interview.

**INTERVIEW SUMMARY:**
- Position: ${jobRole}
- Industry: ${industry}
- Questions: ${totalQuestions}
- Score: ${overallScore}/100
- Level: ${readinessLevel}

**YOUR TASK:**
Generate a warm, professional closing message that:
1. Thanks the candidate genuinely
2. Acknowledges their effort and performance positively
3. Mentions the comprehensive analysis available
4. Encourages them for their job search
5. Ends naturally like a real interviewer
6. Keeps it brief (2-3 sentences)
7. Sounds human, warm, and authentic

Return ONLY the closing message text.`;

    try {
      const message = await this.generate(prompt, {
        maxRetries: 2,
        preferredProvider: 'gemini',
        responseFormat: 'text',
        temperature: 0.9,
        maxTokens: 200
      });

      return message.trim();
    } catch (error) {
      console.error('Closing message generation failed:', error.message);
      return `Thank you so much for completing this interview! You've shown great potential and I'm impressed by your thoughtful responses. Your comprehensive analysis is now ready - use it to refine your skills and approach. Best of luck with your ${jobRole} job search!`;
    }
  }

  /**
   * 🎯 DETERMINE INTERVIEW PHASE
   */
  determineInterviewPhase(progress, questionNumber) {
    if (questionNumber === 1) {
      return {
        type: 'introduction',
        focus: 'Build rapport, understand background and motivation'
      };
    } else if (progress <= 0.3) {
      return {
        type: 'technical_basic',
        focus: 'Fundamental knowledge, core skills, basic concepts'
      };
    } else if (progress <= 0.6) {
      return {
        type: 'technical_advanced',
        focus: 'Complex problem-solving, system design, best practices'
      };
    } else if (progress <= 0.8) {
      return {
        type: 'behavioral',
        focus: 'Teamwork, communication, conflict resolution, leadership'
      };
    } else {
      return {
        type: 'situational_hr',
        focus: 'Career goals, motivation, company fit, expectations'
      };
    }
  }

  /**
   * 🔄 FALLBACK QUESTION BANK (EXPANDED)
   * Large set of quality questions for when APIs fail
   */
  getFallbackQuestion(jobRole, questionNumber, type) {
    const bank = {
      introduction: [
        `So, tell me about yourself and what draws you to this ${jobRole} position.`,
        `I'd love to hear about your journey and why you're interested in ${jobRole}.`,
        `Walk me through your background and what excites you about ${jobRole}.`,
        `What sparked your interest in becoming a ${jobRole}?`
      ],
      technical_basic: [
        `What are the core technologies and tools you've worked with for ${jobRole}?`,
        `Can you explain your understanding of the fundamental concepts in ${jobRole}?`,
        `What technical skills do you consider most important for a ${jobRole}?`,
        `Tell me about your experience with the main tools used in ${jobRole}.`,
        `How do you stay updated with the latest developments in ${jobRole}?`,
        `What programming languages or frameworks are you most comfortable with?`
      ],
      technical_advanced: [
        `Describe a complex technical challenge you faced and how you solved it.`,
        `How do you approach debugging and troubleshooting difficult problems?`,
        `Walk me through your process for designing a scalable system.`,
        `Tell me about a time when you had to optimize code or system performance.`,
        `How do you handle technical debt in your projects?`,
        `Explain a complex technical concept you've recently learned.`,
        `What's your approach to testing and ensuring code quality?`
      ],
      behavioral: [
        `Tell me about a time when you had to work with a difficult team member.`,
        `Describe a situation where you had to meet a tight deadline under pressure.`,
        `How do you handle disagreements with colleagues or managers?`,
        `Give me an example of when you showed leadership in a project.`,
        `Tell me about a time when you failed and what you learned from it.`,
        `How do you prioritize tasks when everything seems urgent?`,
        `Describe a situation where you had to adapt to significant changes.`
      ],
      situational_hr: [
        `Why do you want to work in this industry specifically?`,
        `Where do you see yourself in 3-5 years with this career path?`,
        `What motivates you in your professional work?`,
        `How do you define success in your career as a ${jobRole}?`,
        `What's your ideal work environment and company culture?`,
        `Why are you looking to make a change in your career right now?`,
        `What are your salary expectations for this ${jobRole} position?`
      ]
    };

    const questions = bank[type] || bank.introduction;
    return questions[questionNumber % questions.length];
  }

  /**
   * 🔄 FALLBACK ANALYSIS
   */
  getFallbackAnalysis(answer) {
    const wordCount = answer.split(' ').length;
    const hasExamples = /example|instance|time|situation|project/i.test(answer);
    const hasTechnical = /\b(code|design|implement|system|data|api)\b/i.test(answer);
    const hasNumbers = /\d+/.test(answer);

    let score = 5;
    if (wordCount > 50) score += 1;
    if (hasExamples) score += 1;
    if (hasTechnical) score += 1;
    if (hasNumbers) score += 1;

    return {
      aiScore: Math.min(10, score),
      technicalAccuracy: Math.min(10, score),
      communication: Math.min(10, score + 1),
      confidence: Math.min(10, score),
      completeness: Math.min(10, wordCount > 30 ? score + 1 : score),
      strengths: [
        hasExamples ? 'Provided concrete examples' : 'Clear communication',
        hasTechnical ? 'Demonstrated technical knowledge' : 'Good structure'
      ],
      weaknesses: [
        wordCount < 30 ? 'Could provide more detail' : 'Could add specific examples'
      ],
      improvementSuggestions: [
        'Include specific examples from your experience',
        'Add quantifiable metrics or results',
        'Structure your response using the STAR method'
      ],
      idealAnswer: 'A strong answer would include specific examples, quantify achievements, and demonstrate both technical knowledge and soft skills relevant to the role.'
    };
  }

  /**
   * 📈 ANALYZE RESUME (Legacy support)
   */
  async analyzeResume(resumeText, jobDescription) {
    const prompt = `You are an expert ATS resume analyzer.

**Resume:**
${resumeText.substring(0, 3000)}

**Job Description:**
${jobDescription.substring(0, 1500)}

**Task:** Analyze and return JSON with: atsScore, scoreBreakdown, matchedKeywords, missingKeywords, suggestions, skillGapAnalysis.

Provide detailed, actionable feedback. Return ONLY valid JSON.`;

    return await this.generate(prompt, {
      responseFormat: 'json',
      temperature: 0.7,
      maxTokens: 3000
    });
  }

  isAvailable() {
    return aiProvider.isAvailable();
  }
}

module.exports = new AIService();
