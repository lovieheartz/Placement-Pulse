const WebSocket = require('ws');
const OpenAI = require('openai');

/**
 * 🎤 OPENAI REALTIME API SERVICE
 * Ultra-low latency voice interviews with GPT-4o Realtime
 * Features:
 * - <200ms latency for voice responses
 * - Intelligent question generation based on conversation context
 * - Real-time answer analysis and scoring
 * - Natural conversation flow with interruption handling
 * - Progressive difficulty adjustment
 */
class OpenAIRealtimeService {
  constructor() {
    this.sessions = new Map();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ OpenAI Realtime API Service initialized');
  }

  /**
   * 🚀 CREATE NEW INTERVIEW SESSION
   * Sets up a WebSocket connection to OpenAI Realtime API
   */
  async createSession(sessionId, context) {
    try {
      const {
        jobRole,
        industry,
        difficulty,
        experienceLevel,
        totalQuestions,
        userName = 'candidate'
      } = context;

      // Create WebSocket connection to OpenAI Realtime API
      const realtimeWs = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        }
      );

      // Session state
      const session = {
        id: sessionId,
        realtimeWs,
        context,
        currentQuestion: 0,
        questions: [],
        answers: [],
        scores: [],
        conversationHistory: [],
        isActive: true,
        startTime: Date.now(),
        clientWs: null // Will be set when client WebSocket connects
      };

      this.sessions.set(sessionId, session);

      // Set up WebSocket event handlers
      this.setupRealtimeHandlers(session);

      // Wait for connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);

        realtimeWs.on('open', () => {
          clearTimeout(timeout);
          console.log(`✅ OpenAI Realtime session created: ${sessionId}`);
          resolve();
        });

        realtimeWs.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Configure session with interview instructions
      await this.configureSession(session);

      return session;
    } catch (error) {
      console.error('❌ Failed to create OpenAI Realtime session:', error);
      throw error;
    }
  }

  /**
   * ⚙️ CONFIGURE SESSION
   * Set up interview persona, voice, and instructions
   */
  async configureSession(session) {
    const { company, jobRole, industry, difficulty, interviewType, resumeData } = session.context;

    // Determine question count based on difficulty
    const questionRanges = {
      easy: { min: 10, max: 12, target: 11 },
      medium: { min: 12, max: 20, target: 16 },
      hard: { min: 20, max: 25, target: 23 }
    };
    const questionTarget = questionRanges[difficulty].target;

    // Build interview type specific instructions
    const interviewFocus = {
      hr: `This is a **PURE HR INTERVIEW**. Focus ONLY on:
- Behavioral questions (STAR method)
- Communication and interpersonal skills
- Cultural fit and values alignment
- Conflict resolution and teamwork
- Leadership potential and adaptability
- Career motivations and goals
- Work ethics and professionalism
NO technical questions at all!`,

      technical: `This is a **PURE TECHNICAL INTERVIEW**. Focus ONLY on:
- Role-specific technical knowledge for ${jobRole}
- Problem-solving and analytical skills
- Industry-specific tools and technologies in ${industry}
- Practical scenarios and case studies
- Technical decision-making processes
- Domain expertise and best practices
NO behavioral/HR questions at all!`,

      mixed: `This is a **COMPREHENSIVE MIXED INTERVIEW** (HR + Technical).
Balance your questions:
- 40% Technical: ${jobRole} knowledge, problem-solving, ${industry} expertise
- 40% Behavioral/HR: Teamwork, communication, cultural fit, leadership
- 20% Scenario-based: Real-world situations combining both technical and soft skills`
    };

    // Build resume context if available
    let resumeContext = '';
    if (resumeData) {
      resumeContext = `\n\n**🎯 CANDIDATE RESUME INFORMATION:**
The candidate has uploaded their resume. Use this information to ask SPECIFIC, PERSONALIZED questions about their background:

**Projects:** ${resumeData.projects && resumeData.projects.length > 0 ? resumeData.projects.map((p, i) => `\n  ${i + 1}. ${p}`).join('') : 'Not specified'}

**Skills:** ${resumeData.skills && resumeData.skills.length > 0 ? resumeData.skills.join(', ') : 'Not specified'}

**Experience:** ${resumeData.experience || 'Not specified'}

**Education:** ${resumeData.education || 'Not specified'}

**IMPORTANT RESUME-BASED QUESTIONING RULES:**
✓ Ask about SPECIFIC PROJECTS mentioned in their resume - "Tell me about your [Project Name]..."
✓ Probe TECHNICAL DEPTH of mentioned skills - "You mentioned ${resumeData.skills?.[0] || 'a skill'}, how have you applied it in real scenarios?"
✓ Reference their ACTUAL EXPERIENCE - "I see you worked on [specific project], what was your role and contribution?"
✓ Ask about CHALLENGES in their projects - "What was the most difficult part of building [project]?"
✓ Explore TECHNICAL DECISIONS - "Why did you choose [technology] for [project]?"
✓ Make it CONVERSATIONAL and NATURAL - don't interrogate, discuss their work genuinely
✓ Balance resume questions with general assessment questions
✓ If technical interview: Deep dive into 2-3 key projects
✓ If HR interview: Focus on teamwork, challenges, and learning from their experiences
✓ If mixed: Blend technical project questions with behavioral questions about their work

**NOTE:** The resume provides context - use it to make the interview highly personalized and relevant to their actual experience!`;
    }

    const instructions = `You are Alex, an elite AI interviewer conducting a ${difficulty.toUpperCase()} DIFFICULTY ${interviewType.toUpperCase()} INTERVIEW for a ${jobRole} position at ${company} in the ${industry} industry.${resumeContext}

**CORE MISSION:**
${interviewFocus[interviewType]}

**YOUR PERSONALITY:**
- Warm, professional, highly intelligent, and genuinely engaged
- Excellent active listener who builds on candidate responses
- Encouraging yet challenging - push them to demonstrate their best
- Natural conversationalist with authentic human-like interaction
- Adaptive intelligence - adjust based on candidate's performance

**SMART INTERVIEW MANAGEMENT:**
TARGET: Ask approximately ${questionTarget} questions (range: ${questionRanges[difficulty].min}-${questionRanges[difficulty].max})

**YOU MUST INTELLIGENTLY DECIDE WHEN TO END THE INTERVIEW BASED ON:**
1. **Question Count:** Reached ${questionTarget} meaningful questions (~${questionRanges[difficulty].max} max)
2. **Coverage Depth:** Thoroughly covered key areas for ${interviewType} interview
3. **Candidate Performance:**
   - If candidate struggling heavily: May end earlier (~${questionRanges[difficulty].min} questions) to avoid stress
   - If candidate excelling: Can extend slightly for deeper exploration
4. **Natural Flow:** Interview feels complete and comprehensive

**AUTOMATIC CLOSING TRIGGERS:**
When you've asked enough questions AND covered the core areas, naturally conclude with:
"Thank you so much for your time today. You've shared some really valuable insights about your experience and approach to ${jobRole}. We'll be thoroughly analyzing our conversation, and you'll receive comprehensive feedback shortly. Best of luck moving forward!"

**INTERVIEW FLOW:**

**OPENING (1-2 questions):**
Start warm and welcoming:
"Hi! Welcome. I'm Alex, and I'm really excited to talk with you today about the ${jobRole} position at ${company}. Before we dive in, tell me a bit about yourself and what draws you to ${jobRole}, and specifically why ${company}?"

**CORE QUESTIONS (${questionTarget - 3} questions):**
${interviewType === 'hr' ? `
**HR FOCUS AREAS:**
- Background and career journey: "Walk me through your professional path..."
- Teamwork: "Tell me about a time you had to work with a difficult team member..."
- Conflict resolution: "Describe a situation where you disagreed with your manager..."
- Leadership: "Give me an example of when you led a project or initiative..."
- Adaptability: "How do you handle major changes or setbacks?"
- Communication: "Tell me about a time you had to explain something complex to non-experts..."
- Motivation: "What drives you in your career? What are you passionate about?"
- Cultural fit: "What kind of work environment helps you thrive?"
` : interviewType === 'technical' ? `
**TECHNICAL FOCUS AREAS:**
- Core knowledge: "Explain your approach to [key technical concept for ${jobRole}]..."
- Problem-solving: "How would you solve [specific ${industry} problem]?"
- Tools & technologies: "What's your experience with [relevant tools/platforms]?"
- Best practices: "What do you consider best practices for ${jobRole}?"
- Real scenarios: "Walk me through how you would [technical task]..."
- Decision making: "How do you decide between [technical approach A vs B]?"
- Debugging/optimization: "Tell me about a challenging technical problem you solved..."
- Industry trends: "What emerging trends in ${industry} excite you?"
` : `
**MIXED INTERVIEW BALANCE:**

**Technical Component (40%):**
- Core ${jobRole} technical skills and knowledge
- Problem-solving with ${industry}-specific scenarios
- Tools, technologies, and best practices
- Technical decision-making and trade-offs

**Behavioral/HR Component (40%):**
- Teamwork and collaboration experiences
- Communication and conflict resolution
- Leadership and initiative-taking
- Adaptability and learning mindset

**Integrated Scenarios (20%):**
- Real-world situations combining technical + soft skills
- Project management and stakeholder communication
- Handling pressure and deadline situations
`}

**CLOSING (1-2 questions):**
- Career goals: "Where do you see yourself in the next few years?"
- Role fit: "Why this position at ${company}? What specifically attracts you to ${company} in the ${industry} space?"
- Their questions: "What questions do you have for us about ${company} or this role?"

**RESPONSE STYLE:**
- **Brief acknowledgments:** "I see", "That makes sense", "Interesting approach", "I appreciate that perspective"
- **Natural transitions:** "Let me ask you about...", "I'm curious to hear...", "Tell me more about..."
- **Building connections:** "That ties into...", "Building on that..."
- **If vague answer:** "Can you elaborate?", "Walk me through your thought process", "Give me a specific example"
- **Keep it conversational** - like a professional coffee chat, not an interrogation
- **1-2 sentence responses** between their answers - don't dominate the conversation

**ADAPTIVE INTELLIGENCE:**
- Struggling candidate → Offer rephrasing, simpler questions, supportive tone
- Strong candidate → Deeper follow-ups, more complex scenarios, probe for nuance
- Off-topic rambling → Gently redirect: "That's interesting, but let's focus on..."
- Excellent answers → Acknowledge subtly and move forward (don't praise excessively)

**CRITICAL RULES - MUST FOLLOW:**
✓ Ask ONE question at a time, wait for complete answer
✓ Track mental count of questions asked
✓ After ~${questionTarget} questions, check if core areas covered → END naturally
✓ NEVER evaluate, score, or give feedback during interview
✓ NEVER say "good answer", "that's correct", "you did well"
✓ NEVER rush - allow natural pauses for thinking
✓ Maintain ${difficulty} difficulty consistently
✓ Keep focus on ${interviewType} interview type
✓ When ending, be warm and professional - thank them genuinely

**ENDING THE INTERVIEW:**
After approximately ${questionTarget} solid questions and comprehensive coverage:
"Thank you so much for your time today, [briefly reference something specific they mentioned]. You've shared some really valuable insights. We'll be thoroughly analyzing our conversation, and you'll receive detailed feedback shortly. Best of luck with everything!"

**NOTE:** You have the intelligence to decide when the interview is complete. Don't mechanically ask exactly ${questionTarget} questions - use judgment based on quality and depth of coverage.`;

    const config = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: instructions,
        voice: 'alloy', // Professional, warm, clear voice (alternatives: shimmer, echo)
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad', // Server-side voice activity detection for natural pauses
          threshold: 0.5, // Sensitivity to speech detection
          prefix_padding_ms: 300, // Capture 300ms before speech starts
          silence_duration_ms: 1000 // Wait 1 second of silence before assuming user finished
        },
        temperature: 0.8, // Natural, conversational responses
        max_response_output_tokens: 'inf' // No limit - let AI complete its thoughts
      }
    };

    session.realtimeWs.send(JSON.stringify(config));
    console.log(`⚙️ Session configured for ${jobRole} interview`);
  }

  /**
   * 🎧 SETUP REALTIME HANDLERS
   * Handle all OpenAI Realtime API events
   */
  setupRealtimeHandlers(session) {
    const { realtimeWs, id: sessionId } = session;

    realtimeWs.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());
        this.handleRealtimeEvent(session, event);
      } catch (error) {
        console.error('Error parsing realtime message:', error);
      }
    });

    realtimeWs.on('close', (code, reason) => {
      console.log(`🔌 OpenAI Realtime WebSocket closed: ${sessionId} (${code}: ${reason})`);
      session.isActive = false;
    });

    realtimeWs.on('error', (error) => {
      console.error(`❌ OpenAI Realtime WebSocket error: ${sessionId}`, error);
    });
  }

  /**
   * 📨 HANDLE REALTIME EVENTS
   * Process different event types from OpenAI
   */
  handleRealtimeEvent(session, event) {
    switch (event.type) {
      case 'session.created':
        console.log(`✅ Session created: ${event.session.id}`);
        break;

      case 'session.updated':
        console.log('⚙️ Session configuration updated');
        // Send initial greeting to start interview
        this.sendInitialGreeting(session);
        // Notify client that session is ready
        this.forwardToClient(session, { type: 'session_ready' });
        break;

      case 'input_audio_buffer.speech_started':
        console.log('🎤 Candidate started speaking');
        session.lastSpeechStart = Date.now();
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('⏸️ Candidate stopped speaking');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // Candidate's speech transcribed
        const transcript = event.transcript;
        console.log(`📝 Candidate: "${transcript}"`);

        session.conversationHistory.push({
          role: 'user',
          content: transcript,
          timestamp: Date.now()
        });

        // Store as answer if we're expecting one
        if (session.currentQuestion > 0) {
          session.answers.push({
            questionNumber: session.currentQuestion,
            answer: transcript,
            timestamp: Date.now()
          });
        }

        // Forward transcript to client
        this.forwardToClient(session, {
          type: 'user_transcript',
          text: transcript,
          timestamp: Date.now()
        });
        break;

      case 'response.audio_transcript.delta':
        // AI speaking (partial transcript)
        process.stdout.write(event.delta);
        break;

      case 'response.audio_transcript.done':
        // AI finished speaking (complete transcript)
        const aiText = event.transcript;
        console.log(`\n🤖 Alex: "${aiText}"`);

        session.conversationHistory.push({
          role: 'assistant',
          content: aiText,
          timestamp: Date.now()
        });

        // Detect if this was a question
        if (this.isQuestion(aiText)) {
          session.currentQuestion++;
          session.questions.push({
            questionNumber: session.currentQuestion,
            question: aiText,
            timestamp: Date.now()
          });
          console.log(`📊 Question ${session.currentQuestion} asked`);
        }

        // Forward AI response to client
        this.forwardToClient(session, {
          type: 'ai_transcript',
          text: aiText,
          questionNumber: session.currentQuestion,
          timestamp: Date.now()
        });
        break;

      case 'response.audio.delta':
        // Audio chunk - forward to client
        this.forwardToClient(session, {
          type: 'audio_delta',
          audio: event.delta, // base64 PCM16 audio
          timestamp: Date.now()
        });
        break;

      case 'response.audio.done':
        // Audio response complete
        this.forwardToClient(session, {
          type: 'audio_done',
          timestamp: Date.now()
        });
        break;

      case 'response.done':
        // Response complete
        const latency = Date.now() - (session.lastSpeechStart || Date.now());
        console.log(`⚡ Response latency: ${latency}ms`);
        break;

      case 'error':
        console.error('❌ OpenAI Realtime API error:', event.error);
        break;

      default:
        // Log other events for debugging
        if (process.env.DEBUG_REALTIME) {
          console.log(`[${event.type}]`, event);
        }
    }
  }

  /**
   * 👋 SEND INITIAL GREETING
   */
  async sendInitialGreeting(session) {
    const { userName, jobRole } = session.context;

    const greeting = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Hello! I'm ready to start my interview for the ${jobRole} position.`
          }
        ]
      }
    };

    session.realtimeWs.send(JSON.stringify(greeting));

    // Trigger response
    session.realtimeWs.send(JSON.stringify({ type: 'response.create' }));
  }

  /**
   * 🎤 SEND AUDIO FROM CLIENT
   * Forward client's audio to OpenAI
   */
  sendAudio(sessionId, audioData) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      console.warn(`⚠️ No active session: ${sessionId}`);
      return;
    }

    const event = {
      type: 'input_audio_buffer.append',
      audio: audioData // base64 encoded PCM16 audio
    };

    session.realtimeWs.send(JSON.stringify(event));
  }

  /**
   * 💬 SEND TEXT MESSAGE
   * For testing or text-based interaction
   */
  sendText(sessionId, text) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      console.warn(`⚠️ No active session: ${sessionId}`);
      return;
    }

    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text
          }
        ]
      }
    };

    session.realtimeWs.send(JSON.stringify(message));

    // Trigger response
    session.realtimeWs.send(JSON.stringify({ type: 'response.create' }));
  }

  /**
   * 🎯 ANALYZE INTERVIEW PERFORMANCE
   * Use GPT-4 to analyze answers and generate comprehensive feedback
   */
  async analyzeInterview(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const { jobRole, industry, difficulty, interviewType } = session.context;
    const { questions, answers, conversationHistory } = session;

    console.log(`📊 Analyzing ${interviewType} interview for session ${sessionId}...`);

    // Build conversation for analysis
    const conversation = conversationHistory.map(msg =>
      `${msg.role === 'user' ? 'Candidate' : 'Interviewer'}: ${msg.content}`
    ).join('\n\n');

    const totalQuestions = questions.length;

    const analysisPrompt = `You are an elite interview assessment specialist analyzing a ${difficulty.toUpperCase()} DIFFICULTY ${interviewType.toUpperCase()} INTERVIEW for a ${jobRole} position in the ${industry} industry.

**INTERVIEW TRANSCRIPT:**
${conversation}

**INTERVIEW DETAILS:**
- Type: ${interviewType} (${interviewType === 'hr' ? 'HR/Behavioral only' : interviewType === 'technical' ? 'Technical only' : 'Mixed HR + Technical'})
- Difficulty: ${difficulty}
- Total Questions Asked: ${totalQuestions}
- Job Role: ${jobRole}
- Industry: ${industry}

**YOUR TASK:**
Provide a **COMPREHENSIVE, DETAILED, and ACTIONABLE** analysis of the candidate's performance. Be thorough and specific in your evaluation.

**ANALYSIS FORMAT (MUST BE VALID JSON):**
{
  "overallScore": <number 1-100 based on all criteria>,
  "readinessLevel": "<excellent/well_prepared/ready/needs_improvement/not_ready>",
  "strengthAreas": [
    "Detailed specific strength with examples from their answers",
    "Another strength with context",
    "Third strength with specific reference",
    "More strengths as appropriate (3-5 total)"
  ],
  "improvementAreas": [
    "Specific area to improve with actionable advice",
    "Another area with concrete suggestions",
    "Third area if applicable (2-4 total)"
  ],
  "detailedScores": {
    ${interviewType === 'hr' ? `
    "communication": <1-10>,
    "behavioralResponses": <1-10>,
    "culturalFit": <1-10>,
    "interpersonalSkills": <1-10>,
    "leadershipPotential": <1-10>
    ` : interviewType === 'technical' ? `
    "technicalKnowledge": <1-10>,
    "problemSolving": <1-10>,
    "analyticalThinking": <1-10>,
    "domainExpertise": <1-10>,
    "practicalApplication": <1-10>
    ` : `
    "technicalKnowledge": <1-10>,
    "communication": <1-10>,
    "problemSolving": <1-10>,
    "behavioralSkills": <1-10>,
    "overallFit": <1-10>
    `}
  },
  "questionAnalysis": [
    {
      "questionNumber": 1,
      "question": "Full question text",
      "answer": "Candidate's complete answer",
      "score": <1-10>,
      "feedback": "Detailed, specific, constructive feedback on this answer (2-3 sentences minimum)",
      "strengths": ["Specific strength 1 from this answer", "Specific strength 2 if applicable"],
      "improvements": ["Specific improvement 1", "Specific improvement 2 if applicable"]
    }
    // Include analysis for EVERY question asked in the interview
  ],
  "recommendations": [
    "Highly specific, actionable recommendation 1 with concrete steps",
    "Detailed recommendation 2 tailored to their performance",
    "Recommendation 3 with resources or practices to improve",
    "Additional recommendations as needed (4-6 total)"
  ],
  "summaryFeedback": "Comprehensive 3-4 sentence summary of overall performance, highlighting key strengths and most important areas for development. Be honest but encouraging."
}

**DETAILED SCORING GUIDELINES:**

${interviewType === 'hr' ? `
**HR INTERVIEW SCORING:**
- Communication (1-10): Clarity, articulation, structure, storytelling ability
- Behavioral Responses (1-10): Use of STAR method, specific examples, relevance
- Cultural Fit (1-10): Values alignment, team orientation, work style compatibility
- Interpersonal Skills (1-10): Emotional intelligence, conflict resolution, collaboration
- Leadership Potential (1-10): Initiative, influence, decision-making, accountability
` : interviewType === 'technical' ? `
**TECHNICAL INTERVIEW SCORING:**
- Technical Knowledge (1-10): Accuracy, depth, breadth of ${jobRole} expertise
- Problem Solving (1-10): Analytical approach, logical reasoning, solution quality
- Analytical Thinking (1-10): Breaking down problems, identifying patterns, critical thinking
- Domain Expertise (1-10): ${industry}-specific knowledge, best practices, tools/tech
- Practical Application (1-10): Real-world experience, hands-on skills, implementation ability
` : `
**MIXED INTERVIEW SCORING:**
- Technical Knowledge (1-10): ${jobRole} expertise, problem-solving ability
- Communication (1-10): Clarity, structure, ability to explain technical and non-technical topics
- Problem Solving (1-10): Analytical thinking for both technical and situational challenges
- Behavioral Skills (1-10): STAR responses, teamwork, adaptability, conflict resolution
- Overall Fit (1-10): Balance of technical competence and cultural fit for ${jobRole} in ${industry}
`}

**QUESTION-BY-QUESTION ANALYSIS REQUIREMENTS:**
- Analyze EVERY SINGLE QUESTION and answer pair
- Provide specific, detailed feedback for each
- Reference actual content from their answers
- Be constructive yet honest
- Highlight both what they did well AND what could be improved
- Give concrete examples of better responses where applicable

**OVERALL SCORE CALCULATION:**
- 90-100: Exceptional candidate, ready for the role, minimal improvements needed
- 80-89: Strong candidate, good fit, some areas to polish
- 70-79: Decent candidate, competent but needs development
- 60-69: Fair candidate, significant improvement needed
- Below 60: Needs substantial work before being interview-ready

**READINESS LEVEL CRITERIA (MUST USE EXACT VALUES):**
- "excellent": 90-100 score, exceptional across all dimensions, outstanding answers
- "well_prepared": 75-89 score, strong performance, clearly ready, minor improvements
- "ready": 60-74 score, acceptable performance, competent but needs some development
- "needs_improvement": 40-59 score, significant gaps, requires substantial improvement
- "not_ready": Below 40, multiple critical weaknesses, not yet interview-ready

**CRITICAL REQUIREMENTS:**
✓ Be THOROUGH and DETAILED - this is a premium analysis
✓ Provide SPECIFIC examples from their actual answers
✓ Make recommendations ACTIONABLE with concrete next steps
✓ Consider ${difficulty} difficulty level - be appropriately demanding
✓ Account for ${interviewType} interview focus in evaluation
✓ Question analysis must cover ALL ${totalQuestions} questions
✓ Be honest but professional and encouraging
✓ Return ONLY valid JSON, no additional text`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert interview assessor.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      console.log(`✅ Analysis complete: ${analysis.overallScore}/100 (${analysis.readinessLevel})`);

      return analysis;
    } catch (error) {
      console.error('❌ Failed to analyze interview:', error);
      throw error;
    }
  }

  /**
   * 🛑 END SESSION
   */
  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.realtimeWs.readyState === WebSocket.OPEN) {
      session.realtimeWs.close(1000, 'Interview completed');
    }

    session.isActive = false;
    this.sessions.delete(sessionId);
    console.log(`✅ Session ended: ${sessionId}`);
  }

  /**
   * 🔍 GET SESSION INFO
   */
  getSessionInfo(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      isActive: session.isActive,
      currentQuestion: session.currentQuestion,
      totalQuestions: session.context.totalQuestions,
      questionsAsked: session.questions.length,
      answersReceived: session.answers.length,
      duration: Date.now() - session.startTime
    };
  }

  /**
   * 🔧 UTILITY: Check if text is a question
   */
  isQuestion(text) {
    // Simple heuristic: ends with ? or starts with question words
    const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'tell me', 'describe', 'explain', 'can you'];
    const lowerText = text.toLowerCase().trim();

    return lowerText.endsWith('?') ||
           questionWords.some(word => lowerText.startsWith(word));
  }

  /**
   * 🔗 ATTACH CLIENT WEBSOCKET
   * Store client WebSocket reference to forward events
   */
  attachClientWebSocket(sessionId, clientWs) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ No session found for: ${sessionId}`);
      return false;
    }

    session.clientWs = clientWs;
    console.log(`✅ Client WebSocket attached to session: ${sessionId}`);
    return true;
  }

  /**
   * 📤 FORWARD EVENT TO CLIENT
   * Send events from OpenAI to client WebSocket
   */
  forwardToClient(session, event) {
    if (session.clientWs && session.clientWs.readyState === 1) { // OPEN = 1
      try {
        session.clientWs.send(JSON.stringify(event));
      } catch (error) {
        console.error('Error forwarding to client:', error);
      }
    }
  }
}

module.exports = new OpenAIRealtimeService();
