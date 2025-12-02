const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * 🤖 UNIFIED AI SERVICE
 * Seamlessly integrates Gemini and OpenRouter for maximum reliability
 * Automatic fallback, retry logic, and intelligent prompt optimization
 */
class AIService {
  constructor() {
    this.initializeProviders();
    this.circuitBreaker = {
      gemini: { failures: 0, lastFailure: null, isOpen: false },
      openrouter: { failures: 0, lastFailure: null, isOpen: false }
    };
    this.CIRCUIT_THRESHOLD = 3; // Open circuit after 3 failures
    this.CIRCUIT_TIMEOUT = 60000; // Reset after 60 seconds
  }

  initializeProviders() {
    // Initialize Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      try {
        this.gemini = new GoogleGenerativeAI(geminiKey);
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        this.geminiModel = this.gemini.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 4096,
          },
        });
        console.log(`✅ Gemini initialized: ${modelName}`);
      } catch (error) {
        console.error('⚠️  Gemini init failed:', error.message);
        this.geminiModel = null;
      }
    } else {
      this.geminiModel = null;
    }

    // Initialize OpenRouter
    this.openRouterKey = process.env.OPENROUTER_API_KEY;
    if (this.openRouterKey && this.openRouterKey !== 'YOUR_OPENROUTER_KEY_HERE') {
      console.log('✅ OpenRouter initialized');
    } else {
      this.openRouterKey = null;
    }
  }

  /**
   * ⚡ CIRCUIT BREAKER MANAGEMENT
   */
  checkCircuit(provider) {
    const circuit = this.circuitBreaker[provider];
    if (!circuit) return false;

    // Reset circuit if timeout expired
    if (circuit.isOpen && circuit.lastFailure) {
      const elapsed = Date.now() - circuit.lastFailure;
      if (elapsed > this.CIRCUIT_TIMEOUT) {
        console.log(`🔄 Resetting circuit breaker for ${provider}`);
        circuit.failures = 0;
        circuit.isOpen = false;
        circuit.lastFailure = null;
      }
    }

    return circuit.isOpen;
  }

  recordFailure(provider) {
    const circuit = this.circuitBreaker[provider];
    if (!circuit) return;

    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= this.CIRCUIT_THRESHOLD) {
      circuit.isOpen = true;
      console.log(`⚠️  Circuit breaker OPENED for ${provider} (${circuit.failures} failures)`);
    }
  }

  recordSuccess(provider) {
    const circuit = this.circuitBreaker[provider];
    if (!circuit) return;

    circuit.failures = 0;
    circuit.isOpen = false;
    circuit.lastFailure = null;
  }

  /**
   * 🎯 INTELLIGENT GENERATION WITH MULTI-PROVIDER FALLBACK
   * OPTIMIZED: Reduced retries for faster response times + Circuit breaker pattern
   */
  async generate(prompt, options = {}) {
    const {
      maxRetries = 0, // Changed from 2 to 0 - only 1 attempt per provider
      preferredProvider = 'gemini', // 'gemini' or 'openrouter'
      responseFormat = 'text', // 'text' or 'json'
      temperature = 0.8,
      maxTokens = 2048
    } = options;

    let lastError;
    const providers = preferredProvider === 'gemini'
      ? ['gemini', 'openrouter']
      : ['openrouter', 'gemini'];

    // Try each provider with minimal retries for speed
    for (const provider of providers) {
      // Skip if circuit breaker is open
      if (this.checkCircuit(provider)) {
        console.log(`⏭️  Skipping ${provider} (circuit breaker open)`);
        continue;
      }

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🤖 Trying ${provider}${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}...`);

          if (provider === 'gemini' && this.geminiModel) {
            const result = await this.generateWithGemini(prompt, { temperature, maxTokens });
            console.log(`✅ Success with Gemini`);
            this.recordSuccess(provider);
            return this.parseResponse(result, responseFormat);
          } else if (provider === 'openrouter' && this.openRouterKey) {
            const result = await this.generateWithOpenRouter(prompt, { temperature, maxTokens });
            console.log(`✅ Success with OpenRouter`);
            this.recordSuccess(provider);
            return this.parseResponse(result, responseFormat);
          }
        } catch (error) {
          lastError = error;
          this.recordFailure(provider);
          console.log(`❌ ${provider} failed: ${error.message}`);

          // Minimal delay before retry (only if retries enabled)
          if (attempt < maxRetries) {
            const delay = 500; // Fixed 500ms delay instead of exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

    throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  async generateWithGemini(prompt, options) {
    if (!this.geminiModel) {
      throw new Error('Gemini not available');
    }

    const result = await this.geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  async generateWithOpenRouter(prompt, options) {
    if (!this.openRouterKey) {
      throw new Error('OpenRouter not available');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openRouterKey}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
        'X-Title': 'Placement Management System'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free', // Free, fast, powerful
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.8,
        max_tokens: options.maxTokens || 2048
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  parseResponse(text, format) {
    if (format === 'text') {
      return text.trim();
    }

    if (format === 'json') {
      // Clean markdown code blocks
      let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Try to extract JSON if wrapped in text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      try {
        return JSON.parse(cleaned);
      } catch (error) {
        console.error('JSON parse error:', error.message);
        console.error('Raw text:', cleaned.substring(0, 200));
        throw new Error('Failed to parse JSON response');
      }
    }

    return text;
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
        maxRetries: 3,
        preferredProvider: 'openrouter', // OpenRouter often better for analysis
        responseFormat: 'json',
        temperature: 0.7,
        maxTokens: 1000
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
      preferredProvider: 'openrouter',
      responseFormat: 'json',
      temperature: 0.7,
      maxTokens: 3000
    });
  }

  isAvailable() {
    return this.geminiModel !== null || this.openRouterKey !== null;
  }
}

module.exports = new AIService();
