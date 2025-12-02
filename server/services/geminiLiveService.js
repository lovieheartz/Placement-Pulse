const WebSocket = require('ws');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * 🎤 GEMINI MULTIMODAL LIVE API SERVICE
 * Ultra-low latency (500-600ms) real-time bidirectional streaming
 * Natural voice, context-aware conversation, visual analysis
 */
class GeminiLiveService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.activeSessions = new Map();

    if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      console.warn('⚠️  Gemini API key not configured for Live API');
      this.available = false;
      return;
    }

    this.available = true;
    console.log('✅ Gemini Live API Service initialized');
  }

  /**
   * 🚀 START ULTRA-LOW LATENCY INTERVIEW SESSION
   * Target: 500-600ms response time
   */
  async startLiveInterview(sessionConfig) {
    const {
      sessionId,
      jobRole,
      industry,
      difficulty,
      experienceLevel,
      totalQuestions,
      onAudioResponse,
      onTextResponse,
      onTranscript,
      onError,
      onConnected
    } = sessionConfig;

    try {
      // Gemini Live API WebSocket URL - using gemini-2.0-flash-exp (the working model for Live API)
      const model = 'models/gemini-2.0-flash-exp';
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

      console.log(`🎤 Connecting to Gemini Live API for session ${sessionId} with model ${model}...`);

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);

      // Session state
      const sessionState = {
        ws,
        sessionId,
        config: sessionConfig,
        questionNumber: 0,
        conversationHistory: [],
        currentAudioBuffer: [],
        isConnected: false,
        isListening: false,
        messageQueue: []
      };

      // Connection opened
      ws.on('open', async () => {
        console.log(`✅ WebSocket connected for session ${sessionId}`);
        sessionState.isConnected = true;

        // Send setup configuration for Live API
        const setupMessage = {
          setup: {
            model: model,
            generation_config: {
              response_modalities: ['AUDIO'],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: 'Kore' // Professional female voice (Aoede, Charon, Fenrir, Kore, Puck)
                  }
                }
              },
              temperature: 0.9,
              top_p: 0.95,
              max_output_tokens: 150 // Keep responses short
            },
            system_instruction: {
              parts: [{
                text: `You are Alex, a friendly AI interviewer for a ${jobRole} position.

CRITICAL RULES:
1. Keep ALL responses under 3 sentences
2. Ask ONE question at a time
3. Be warm but brief
4. No long explanations

Interview structure (${totalQuestions} questions):
- Start: "Hi! I'm Alex. Tell me about yourself and why ${jobRole}?"
- Questions 2-${Math.floor(totalQuestions*0.6)}: Technical skills for ${jobRole}
- Questions ${Math.floor(totalQuestions*0.6)+1}-${totalQuestions-2}: Behavioral
- Final questions: Career goals, wrap up

After each answer: Brief acknowledgment ("Great!", "I see"), then next question.

Be conversational, natural, and FAST. Quality over quantity!`
              }]
            }
          }
        };

        try {
          ws.send(JSON.stringify(setupMessage));
          console.log('✅ Setup message sent to Gemini');
        } catch (error) {
          console.error('❌ Error sending setup message:', error);
          if (onError) onError(error);
        }

        if (onConnected) onConnected();

        // Wait for setup to complete before sending first message
        // We'll send the initial greeting after receiving setupComplete
      });

      // Receive messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('📨 Received message from Gemini:', JSON.stringify(message).substring(0, 200));

          // Setup acknowledgment
          if (message.setupComplete) {
            console.log('✅ Gemini Live API setup complete');

            // Now send initial greeting prompt - super simple
            setTimeout(() => {
              try {
                const session = this.activeSessions.get(sessionId);
                if (session && session.isConnected) {
                  const greetingPrompt = `Start the interview now. Say: "Hi! I'm Alex, your interviewer. Tell me about yourself and why you're interested in this ${session.config.jobRole} role."`;

                  this.sendText(sessionId, greetingPrompt);
                }
              } catch (error) {
                console.error('❌ Error sending initial greeting:', error);
              }
            }, 1000);
          }

          // Server content (AI response)
          if (message.serverContent) {
            const content = message.serverContent;

            // Model turn (AI speaking)
            if (content.modelTurn) {
              const parts = content.modelTurn.parts || [];

              for (const part of parts) {
                // Text response
                if (part.text) {
                  sessionState.conversationHistory.push({
                    role: 'assistant',
                    content: part.text,
                    timestamp: Date.now()
                  });

                  if (onTextResponse) onTextResponse(part.text);
                }

                // Audio response (natural voice)
                if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
                  const audioData = Buffer.from(part.inlineData.data, 'base64');
                  if (onAudioResponse) onAudioResponse(audioData);
                }
              }
            }

            // Turn complete
            if (content.turnComplete) {
              console.log('✅ AI turn complete');
            }

            // Interrupted
            if (content.interrupted) {
              console.log('🛑 AI interrupted by user');
            }
          }

          // Tool call
          if (message.toolCall) {
            this.handleFunctionCall(sessionId, message.toolCall);
          }

        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      // Error handling
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${sessionId}:`, error);
        console.error(`❌ Error details:`, error.message, error.code);
        if (onError) onError(error);
      });

      // Connection closed
      ws.on('close', (code, reason) => {
        console.log(`🔌 WebSocket closed for ${sessionId}`);
        console.log(`   Close code: ${code}, Reason: ${reason.toString() || 'No reason provided'}`);
        sessionState.isConnected = false;
        this.activeSessions.delete(sessionId);
      });

      // Store session
      this.activeSessions.set(sessionId, sessionState);

      return {
        success: true,
        sessionId,
        message: 'Live interview session started'
      };

    } catch (error) {
      console.error('❌ Failed to start live interview:', error);
      throw error;
    }
  }

  /**
   * 🎤 SEND AUDIO (OPTIMIZED FOR LOW LATENCY)
   * Audio format: 16-bit PCM, 16kHz, mono
   */
  async sendAudio(sessionId, audioData) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isConnected) {
      throw new Error('Session not connected');
    }

    try {
      const message = {
        realtimeInput: {
          mediaChunks: [{
            mimeType: 'audio/pcm;rate=16000',
            data: audioData.toString('base64')
          }]
        }
      };

      session.ws.send(JSON.stringify(message));
      session.isListening = true;

    } catch (error) {
      console.error('Error sending audio:', error);
      throw error;
    }
  }

  /**
   * 📹 SEND VIDEO FRAME (For facial expression analysis)
   */
  async sendVideoFrame(sessionId, frameData) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isConnected) return;

    try {
      const message = {
        realtimeInput: {
          mediaChunks: [{
            mimeType: 'image/jpeg',
            data: frameData.toString('base64')
          }]
        }
      };

      session.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending video:', error);
    }
  }

  /**
   * 💬 SEND TEXT (For hybrid mode or testing)
   */
  async sendText(sessionId, text) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isConnected) {
      throw new Error('Session not connected');
    }

    try {
      const message = {
        clientContent: {
          turns: [{
            role: 'user',
            parts: [{ text }]
          }],
          turnComplete: true
        }
      };

      session.ws.send(JSON.stringify(message));

      session.conversationHistory.push({
        role: 'user',
        content: text,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error sending text:', error);
      throw error;
    }
  }

  /**
   * 🛑 END AUDIO STREAM (Signal user finished speaking)
   */
  async endAudioStream(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      const message = {
        realtimeInput: {
          mediaChunks: []
        }
      };

      session.ws.send(JSON.stringify(message));
      session.isListening = false;

    } catch (error) {
      console.error('Error ending audio stream:', error);
    }
  }

  /**
   * 🔧 HANDLE FUNCTION CALLS
   */
  handleFunctionCall(sessionId, toolCall) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const calls = toolCall.functionCalls || [];

    for (const call of calls) {
      console.log(`🔧 Function: ${call.name}`, call.args);

      if (call.name === 'next_question') {
        session.questionNumber = call.args.question_number;
      } else if (call.name === 'score_answer') {
        console.log(`📊 Score: ${call.args.score}/10 - ${call.args.feedback}`);
      }

      // Send function response
      try {
        const response = {
          toolResponse: {
            functionResponses: [{
              id: call.id,
              name: call.name,
              response: {
                result: 'success'
              }
            }]
          }
        };

        session.ws.send(JSON.stringify(response));
      } catch (error) {
        console.error('Error sending function response:', error);
      }
    }
  }

  /**
   * 🎯 BUILD OPTIMIZED SYSTEM PROMPT
   */
  buildInterviewSystemPrompt(context) {
    const { jobRole, industry, difficulty, experienceLevel, totalQuestions } = context;

    return `You are Alex, a friendly and professional AI interviewer conducting a ${difficulty}-level interview for a ${jobRole} position in the ${industry} industry.

**YOUR PERSONALITY:**
- Warm, encouraging, and genuinely interested
- Professional but conversational
- Patient and supportive
- You make candidates feel comfortable

**CRITICAL CONVERSATION RULES:**
1. Keep responses SHORT (1-2 sentences max per turn)
2. Ask ONE question at a time
3. Brief acknowledgments: "Great!", "I see", "Interesting", "That's helpful"
4. NO long speeches - this is a CONVERSATION, not a lecture
5. Listen more, talk less
6. Be natural and human-like

**INTERVIEW PLAN (${totalQuestions} questions total):**

Phase 1 - Warm-up (2-3 questions):
- "Tell me about yourself and what interests you about ${jobRole}"
- Ask about their background and motivation
- Build rapport, make them comfortable

Phase 2 - Technical Basics (${Math.floor(totalQuestions * 0.3)} questions):
- Core skills and technologies for ${jobRole}
- Fundamental concepts in ${industry}
- Tools and frameworks they've used
- KEEP IT CONVERSATIONAL: "How do you...", "What's your experience with..."

Phase 3 - Technical Deep Dive (${Math.floor(totalQuestions * 0.3)} questions):
- Problem-solving scenarios
- "Tell me about a time when you had to..."
- Design questions
- Trade-offs and best practices

Phase 4 - Behavioral (${Math.floor(totalQuestions * 0.2)} questions):
- Teamwork and collaboration
- Handling challenges and conflicts
- Learning and growth mindset
- Communication skills

Phase 5 - Closing (final questions):
- Career goals and aspirations
- Why this role/company
- Their questions for you
- Wrap up warmly

**DIFFICULTY CALIBRATION:**
${difficulty === 'easy' ? '- Focus on fundamentals and basic concepts\n- Be encouraging and supportive\n- Help them if they struggle' : difficulty === 'medium' ? '- Balance between basics and advanced topics\n- Ask about practical experience\n- Probe deeper on interesting points' : '- Advanced technical questions\n- System design and architecture\n- Complex problem-solving\n- Expect detailed, nuanced answers'}

**CONVERSATION STYLE:**
✅ DO:
- "That's a great point about..."
- "I'm curious, how would you..."
- "Interesting! Could you elaborate on..."
- Natural pauses and acknowledgments
- Reference their previous answers
- Show you're listening actively

❌ DON'T:
- Long monologues
- Multiple questions at once
- Interrupt or rush them
- Be robotic or scripted
- Ignore what they just said

**NATURAL FLOW EXAMPLE:**
You: "Hi! I'm Alex. Tell me a bit about yourself and what draws you to ${jobRole}."
[They answer]
You: "That's great! I love your passion for [something they mentioned]. So, how much experience do you have with [relevant skill]?"
[They answer]
You: "Interesting approach! Can you walk me through how you'd handle [specific scenario]?"

**ENDING THE INTERVIEW:**
After ${totalQuestions} questions or when it feels natural:
1. Thank them genuinely
2. "You've done really well today"
3. "We'll compile your results and feedback"
4. Ask if they have any questions
5. Warm, encouraging closing

REMEMBER: This is a CONVERSATION with a real person. Be human, be present, be encouraging. Quality over quantity!`;
  }

  /**
   * 📊 GET SESSION STATUS
   */
  getSessionStatus(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { exists: false };
    }

    return {
      exists: true,
      connected: session.isConnected,
      questionNumber: session.questionNumber,
      conversationLength: session.conversationHistory.length,
      isListening: session.isListening
    };
  }

  /**
   * 🗑️ END SESSION
   */
  async endSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      if (session.ws && session.isConnected) {
        session.ws.close();
      }
      this.activeSessions.delete(sessionId);
      console.log(`✅ Session ${sessionId} ended`);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  /**
   * 📜 GET CONVERSATION HISTORY
   */
  getConversationHistory(sessionId) {
    const session = this.activeSessions.get(sessionId);
    return session ? session.conversationHistory : [];
  }

  /**
   * ✅ CHECK AVAILABILITY
   */
  isAvailable() {
    return this.available;
  }
}

module.exports = new GeminiLiveService();
