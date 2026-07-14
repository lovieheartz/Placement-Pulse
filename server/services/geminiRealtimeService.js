const { GoogleGenAI, Modality, Type, StartSensitivity, EndSensitivity } = require('@google/genai');

/**
 * 🎤 GEMINI LIVE INTERVIEW SERVICE
 *
 * Real-time bidirectional voice interviews on the Gemini Live API.
 *  - Native-audio voice out (24kHz PCM16), mic in (16kHz PCM16)
 *  - Server-side VAD: the candidate just talks, no push-to-talk
 *  - Barge-in: speaking over the AI cancels its current turn
 *  - Session resumption + context-window compression so long interviews
 *    (20-25 questions) survive the Live API's per-connection time limit
 *  - Post-interview analysis on a Gemini text model with a strict JSON schema
 */

// Live models, best first. We fall through the list if one is unavailable to
// the key/region, so a preview model being retired can't take the feature down.
const LIVE_MODELS = (process.env.GEMINI_LIVE_MODEL
  ? [process.env.GEMINI_LIVE_MODEL]
  : []
).concat([
  'gemini-3.1-flash-live-preview',
  'gemini-2.5-flash-native-audio-latest',
  'gemini-2.5-flash-native-audio-preview-12-2025',
]);

const ANALYSIS_MODELS = (process.env.GEMINI_ANALYSIS_MODEL
  ? [process.env.GEMINI_ANALYSIS_MODEL]
  : []
).concat(['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']);

// Prebuilt Live voices. Charon reads as calm and authoritative — the closest
// to a real interviewer. Override with GEMINI_LIVE_VOICE.
const VOICE = process.env.GEMINI_LIVE_VOICE || 'Charon';

const QUESTION_RANGES = {
  easy: { min: 10, max: 12, target: 11 },
  medium: { min: 12, max: 20, target: 16 },
  hard: { min: 20, max: 25, target: 23 },
};

class GeminiRealtimeService {
  constructor() {
    this.sessions = new Map();
    this.apiKey = process.env.GEMINI_API_KEY;

    if (!this.apiKey) {
      console.warn('⚠️  GEMINI_API_KEY missing — AI mock interview will not work');
      this.available = false;
      return;
    }

    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    this.available = true;
    console.log(`✅ Gemini Live interview service ready (voice: ${VOICE})`);
  }

  /* ------------------------------------------------------------------ */
  /* Session lifecycle                                                   */
  /* ------------------------------------------------------------------ */

  async createSession(sessionId, context) {
    if (!this.available) throw new Error('Gemini API key is not configured on the server');

    const range = QUESTION_RANGES[context.difficulty] || QUESTION_RANGES.medium;

    const session = {
      id: sessionId,
      context,
      range,
      live: null,
      model: null,
      clientWs: null,
      isActive: true,
      ended: false,
      startTime: Date.now(),

      // conversation state
      conversationHistory: [],
      questions: [],
      answers: [],
      questionCount: 0,
      pendingAiText: '',
      pendingUserText: '',
      concluded: false,

      // resumption
      resumptionHandle: null,
      reconnecting: false,
      reconnectAttempts: 0,
    };

    this.sessions.set(sessionId, session);

    await this.connect(session);
    return session;
  }

  /**
   * Open the Live connection, trying each model until one accepts us.
   * Used for both the initial connect and transparent resumption.
   */
  async connect(session, { resume = false } = {}) {
    const models = session.model ? [session.model] : LIVE_MODELS;
    let lastError;

    for (const model of models) {
      try {
        const live = await this.ai.live.connect({
          model,
          config: this.buildLiveConfig(session, resume),
          callbacks: {
            onopen: () => console.log(`🔗 Live session open: ${session.id} (${model})`),
            onmessage: (msg) => this.handleLiveMessage(session, msg),
            onerror: (err) => console.error(`❌ Live error (${session.id}):`, err?.message || err),
            onclose: (evt) => this.handleLiveClose(session, evt),
          },
        });

        session.live = live;
        session.model = model;
        session.reconnectAttempts = 0;
        console.log(`✅ Interview session ${resume ? 'resumed' : 'created'}: ${session.id} on ${model}`);
        return live;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️  Live model ${model} unavailable: ${error.message}`);
      }
    }

    throw new Error(`Could not open a Gemini Live session: ${lastError?.message || 'unknown error'}`);
  }

  buildLiveConfig(session, resume) {
    const config = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
        languageCode: 'en-US',
      },
      systemInstruction: this.buildInstructions(session),

      // We need text for the on-screen transcript AND for the final analysis.
      inputAudioTranscription: {},
      outputAudioTranscription: {},

      // Server-side VAD.
      //
      // START must be HIGH: the sensitivities read backwards from what you'd
      // guess — HIGH means "detect the start of speech MORE often". With LOW,
      // a normal speaking voice never cleared the bar and the interviewer
      // simply never heard the candidate. (It slipped through testing because
      // synthesized speech is louder and cleaner than a real mic.)
      //
      // END stays LOW so pausing mid-thought isn't taken as "I'm done", which
      // is what makes the AI talk over people.
      realtimeInputConfig: {
        automaticActivityDetection: {
          startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
          endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
          prefixPaddingMs: 300,
          silenceDurationMs: 900,
        },
      },

      // Without this the connection is capped at ~10 minutes of audio and a
      // hard-difficulty interview would be cut off mid-way.
      contextWindowCompression: { slidingWindow: {} },
      sessionResumption: resume && session.resumptionHandle
        ? { handle: session.resumptionHandle }
        : {},

      tools: [{
        functionDeclarations: [{
          name: 'conclude_interview',
          description:
            'Call this ONLY after you have delivered your spoken closing remarks and the interview is genuinely over. It ends the session and triggers the candidate\'s feedback report.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              reason: {
                type: Type.STRING,
                description: 'Brief reason the interview is complete (e.g. "covered all areas").',
              },
            },
            required: ['reason'],
          },
        }],
      }],

      temperature: 0.85,
    };

    return config;
  }

  /* ------------------------------------------------------------------ */
  /* Prompt                                                              */
  /* ------------------------------------------------------------------ */

  buildInstructions(session) {
    const { company, jobRole, industry, difficulty, interviewType, userName, resumeData } = session.context;
    const { min, max, target } = session.range;

    const focus = {
      hr: `This is a PURE HR / BEHAVIOURAL interview. Cover: career journey, teamwork, conflict, leadership, adaptability, communication, motivation, culture fit. Ask NO technical questions.`,
      technical: `This is a PURE TECHNICAL interview. Cover: core ${jobRole} knowledge, problem solving, ${industry} tools and practices, technical trade-offs, debugging and real scenarios. Ask NO behavioural/HR questions.`,
      mixed: `This is a MIXED interview: roughly 40% technical (${jobRole} knowledge, problem solving), 40% behavioural (teamwork, communication, leadership), 20% scenario questions that blend both.`,
    }[interviewType] || '';

    // Difficulty has to change how you BEHAVE, not just how many questions you
    // ask. Otherwise all three levels feel like the same quiz with a different
    // length, which is exactly what a mock interview must not be.
    const bar = {
      easy: `DIFFICULTY: EASY — you are coaching, not screening.
- Stay on fundamentals and their own experience. No trick questions, no obscure corners.
- Ask ONE thing at a time and keep questions short and concrete.
- If they stall for a few seconds, help: rephrase it, give a nudge, or offer a starting point.
  ("No worries — think of any project where you had to debug something tricky.")
- Accept a decent answer and move on. At most ONE follow-up per topic.
- Warm, patient, encouraging tone. Your job is to build their confidence.`,

      medium: `DIFFICULTY: MEDIUM — a realistic first-round interview.
- Mix fundamentals with applied questions: "how would you actually do this?"
- Always ask ONE follow-up that goes a level deeper than their answer.
  Their answer decides your next question — do not run a fixed script.
- If an answer is vague, ask for a specific example before you move on.
- If they're clearly strong on a topic, skip ahead rather than labouring it.
- Professional and friendly, but you are genuinely assessing them.`,

      hard: `DIFFICULTY: HARD — a senior bar-raiser round. Be demanding but never rude.
- Probe two or three levels deep on every topic. Keep asking "why?" and "what would break?"
- Challenge their reasoning, even when they're right: "What's the trade-off there?",
  "What happens at 100x the load?", "What would you do differently now?"
- Push politely on hand-waving. If they claim something, ask them to justify it.
- Introduce constraints mid-answer to see how they adapt ("Now assume you can't use a database.").
- Do NOT hint or rescue them. Let them sit with a hard question and think.
- Respectful, sharp, unhurried. Silence is a tool — use it.`,
    }[difficulty] || '';

    let resume = '';
    if (resumeData) {
      const projects = (resumeData.projects || []).slice(0, 6).map((p, i) => `  ${i + 1}. ${p}`).join('\n');
      resume = `
THE CANDIDATE'S RESUME (use it — make this interview personal, not generic):
Projects:
${projects || '  (none listed)'}
Skills: ${(resumeData.skills || []).join(', ') || '(none listed)'}
Experience: ${resumeData.experience || '(none listed)'}
Education: ${resumeData.education || '(none listed)'}

Ask about their ACTUAL projects by name. Probe the technical decisions they made, what was hard,
and what they'd do differently. Do not interrogate — discuss their work like a curious peer.`;
    }

    return `You are Alex, a senior interviewer at ${company}, running a ${difficulty} ${interviewType} interview for a ${jobRole} role in the ${industry} industry. The candidate is ${userName}.

${focus}

${bar}
${resume}

THIS IS A CONVERSATION, NOT A QUIZ — the most important rule:
You are NOT reading out a list of prepared questions. You are talking to a person.
- Every question after the first must come from something THEY just said. Quote their own
  words back at them: "You mentioned you rewrote the caching layer — what forced that?"
- React before you ask. One short human beat ("Got it." / "Huh, interesting.") and then dig in.
- Follow the thread. If they say something surprising, chase it, even if it's off your plan.
- If two answers in a row are thin, change tack — try a different angle or an easier entry point.
- Never number your questions out loud. Never say "next question" or "moving on to question 4".
  A real interviewer never does this, and it is the fastest way to make this feel fake.

HOW YOU SPEAK — this is a live VOICE call, so it matters:
- Talk like a person, not a document. Short sentences. Contractions. Natural rhythm.
- Your turns are 1-2 sentences. Ask ONE question, then STOP and listen.
- Never read lists aloud, never use markdown, never say "bullet point" or emoji.
- NEVER score them, praise them, or give feedback during the interview. No "great answer".
- Let silence happen. They are thinking. Do not fill the gap.
- If they interrupt you, stop immediately and let them talk.

INTERVIEW SHAPE (aim for about ${target} questions; ${min}-${max} is the acceptable range):
1. Open warmly: one line about yourself, then ask them to tell you about themselves and why
   ${jobRole} at ${company}.
2. Work through the areas above — but let their answers steer the order and the depth.
3. Close with where they want to go next, and whether they have questions for you.

The question count is a guide, not a script. A great exchange that goes deep on four topics beats
${target} shallow ones. Track roughly where you are and make sure you cover the core ground.

ENDING — follow this exactly:
When you have covered the core areas in about ${target} questions, say a warm closing out loud that
references something specific they told you, thanks them, and tells them detailed feedback is coming.
THEN, and only then, call the conclude_interview function. Do not call it before you have spoken your closing.
Do not announce the function or read it aloud.

Begin as soon as the candidate joins.`;
  }

  /* ------------------------------------------------------------------ */
  /* Inbound Live messages                                               */
  /* ------------------------------------------------------------------ */

  handleLiveMessage(session, msg) {
    // Session resumption handle — lets us silently reconnect if the socket drops.
    if (msg.sessionResumptionUpdate) {
      if (msg.sessionResumptionUpdate.resumable && msg.sessionResumptionUpdate.newHandle) {
        session.resumptionHandle = msg.sessionResumptionUpdate.newHandle;
      }
      return;
    }

    // The server is about to hang up; reconnect ahead of it.
    if (msg.goAway) {
      console.log(`⏳ Live server going away in ${msg.goAway.timeLeft ?? '?'} — reconnecting ${session.id}`);
      this.reconnect(session);
      return;
    }

    if (msg.setupComplete) {
      this.forwardToClient(session, { type: 'session_ready' });
      // Nudge the model to take the first turn.
      try {
        session.live.sendClientContent({
          turns: [{
            role: 'user',
            parts: [{ text: `${session.context.userName} has joined the call. Greet them and begin the interview.` }],
          }],
          turnComplete: true,
        });
      } catch (error) {
        console.error('❌ Could not send opening turn:', error.message);
      }
      return;
    }

    if (msg.toolCall) {
      this.handleToolCall(session, msg.toolCall);
      return;
    }

    const sc = msg.serverContent;
    if (!sc) return;

    // Candidate spoke (streamed transcript of their mic).
    if (sc.inputTranscription?.text) {
      session.pendingUserText += sc.inputTranscription.text;
      this.forwardToClient(session, {
        type: 'user_transcript_delta',
        text: sc.inputTranscription.text,
      });
    }

    // Alex spoke (streamed transcript of the synthesized voice).
    if (sc.outputTranscription?.text) {
      // Alex opening his mouth is the definitive end of the candidate's turn —
      // commit their answer NOW rather than at turnComplete, which only fires
      // once Alex has finished his whole reply. Waiting meant a student's answer
      // sat in limbo for 10+ seconds and then landed at the same moment as
      // Alex's, so it read as though it had never been transcribed at all.
      this.commitUserTurn(session);

      session.pendingAiText += sc.outputTranscription.text;
      this.forwardToClient(session, {
        type: 'ai_transcript_delta',
        text: sc.outputTranscription.text,
      });
    }

    // Audio + any text parts of the model's turn.
    for (const part of sc.modelTurn?.parts || []) {
      if (part.inlineData?.data) {
        this.commitUserTurn(session); // same reasoning: he's started talking
        this.forwardToClient(session, { type: 'audio_delta', audio: part.inlineData.data });
      }
      if (part.text) {
        session.pendingAiText += part.text;
        this.forwardToClient(session, { type: 'ai_transcript_delta', text: part.text });
      }
    }

    // Candidate talked over Alex — drop whatever audio is still queued client-side.
    if (sc.interrupted) {
      this.forwardToClient(session, { type: 'interrupted' });
    }

    // A turn boundary: flush anything still pending.
    if (sc.turnComplete || sc.generationComplete) {
      this.commitTurn(session);
    }
  }

  /**
   * Commit the candidate's answer on its own, as soon as we know their turn is
   * over. Safe to call repeatedly — it no-ops when there is nothing pending.
   */
  commitUserTurn(session) {
    const userText = session.pendingUserText.trim();
    if (!userText) return;

    session.pendingUserText = '';
    session.conversationHistory.push({ role: 'user', content: userText, timestamp: Date.now() });
    session.answers.push({ questionNumber: session.questionCount, answer: userText });

    console.log(`🗣️  ${session.context.userName}: "${userText}"`);
    this.forwardToClient(session, { type: 'user_transcript', text: userText, timestamp: Date.now() });
  }

  commitTurn(session) {
    this.commitUserTurn(session);

    const aiText = session.pendingAiText.trim();
    session.pendingAiText = '';

    if (aiText) {
      session.conversationHistory.push({ role: 'assistant', content: aiText, timestamp: Date.now() });

      if (this.isQuestion(aiText)) {
        session.questionCount += 1;
        session.questions.push({ questionNumber: session.questionCount, question: aiText });
      }

      this.forwardToClient(session, {
        type: 'ai_transcript',
        text: aiText,
        questionNumber: session.questionCount,
        timestamp: Date.now(),
      });
    }

    this.forwardToClient(session, { type: 'turn_complete', questionNumber: session.questionCount });
  }

  handleToolCall(session, toolCall) {
    const calls = toolCall.functionCalls || [];

    for (const call of calls) {
      if (call.name === 'conclude_interview') {
        console.log(`🏁 Alex concluded interview ${session.id}: ${call.args?.reason || 'no reason given'}`);
        session.concluded = true;
        // Flush any closing remarks that haven't hit a turn boundary yet.
        this.commitTurn(session);
        this.forwardToClient(session, { type: 'interview_complete', reason: call.args?.reason || '' });
      }

      try {
        session.live.sendToolResponse({
          functionResponses: [{ id: call.id, name: call.name, response: { result: 'ok' } }],
        });
      } catch (error) {
        console.error('❌ Tool response failed:', error.message);
      }
    }
  }

  handleLiveClose(session, evt) {
    if (session.ended || session.concluded) return; // expected
    console.log(`🔌 Live socket closed for ${session.id}: ${evt?.reason || 'no reason'}`);
    this.reconnect(session);
  }

  /**
   * Transparently re-open the Live connection using the resumption handle.
   * The candidate hears nothing; the conversation continues where it left off.
   */
  async reconnect(session) {
    if (session.ended || session.concluded || session.reconnecting) return;
    if (session.reconnectAttempts >= 3) {
      this.forwardToClient(session, {
        type: 'fatal',
        error: 'Lost connection to the interviewer. Please end and restart the interview.',
      });
      return;
    }

    session.reconnecting = true;
    session.reconnectAttempts += 1;
    this.forwardToClient(session, { type: 'reconnecting' });

    try {
      await new Promise((r) => setTimeout(r, 400 * session.reconnectAttempts));
      await this.connect(session, { resume: true });
      this.forwardToClient(session, { type: 'reconnected' });
    } catch (error) {
      console.error(`❌ Resume failed for ${session.id}:`, error.message);
      this.forwardToClient(session, { type: 'fatal', error: 'Could not reconnect to the interviewer.' });
    } finally {
      session.reconnecting = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Outbound from client                                                */
  /* ------------------------------------------------------------------ */

  /** @param audioBase64 16kHz mono PCM16 */
  sendAudio(sessionId, audioBase64) {
    const session = this.sessions.get(sessionId);
    if (!session?.isActive || !session.live || session.reconnecting) return;

    try {
      session.live.sendRealtimeInput({
        audio: { data: audioBase64, mimeType: 'audio/pcm;rate=16000' },
      });

      // "The AI can't hear me" is otherwise invisible from the server side —
      // mic audio arriving but no transcription coming back is the signature of
      // a VAD/format problem, and this is what makes that visible.
      session.audioChunks = (session.audioChunks || 0) + 1;
      if (session.audioChunks % 100 === 0) {
        console.log(
          `🎤 ${session.id}: ${session.audioChunks} mic chunks in, ` +
          `${session.answers.length} answers heard so far`
        );
      }
    } catch (error) {
      console.error('❌ sendAudio failed:', error.message);
    }
  }

  sendText(sessionId, text) {
    const session = this.sessions.get(sessionId);
    if (!session?.isActive || !session.live) return;

    try {
      session.live.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      });
      session.conversationHistory.push({ role: 'user', content: text, timestamp: Date.now() });
    } catch (error) {
      console.error('❌ sendText failed:', error.message);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Analysis                                                            */
  /* ------------------------------------------------------------------ */

  async analyzeInterview(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const { jobRole, industry, difficulty, interviewType } = session.context;
    const transcript = session.conversationHistory
      .map((m) => `${m.role === 'user' ? 'Candidate' : 'Alex (interviewer)'}: ${m.content}`)
      .join('\n\n');

    console.log(`📊 Analyzing ${interviewType} interview ${sessionId} (${session.questions.length} questions)...`);

    // A candidate who said nothing shouldn't get a hallucinated score.
    const spoken = session.conversationHistory.filter((m) => m.role === 'user');
    if (spoken.length === 0) {
      return this.emptyAnalysis(interviewType);
    }

    const scoreKeys = {
      hr: ['communication', 'behavioralResponses', 'culturalFit', 'interpersonalSkills', 'leadershipPotential'],
      technical: ['technicalKnowledge', 'problemSolving', 'analyticalThinking', 'domainExpertise', 'practicalApplication'],
      mixed: ['technicalKnowledge', 'communication', 'problemSolving', 'behavioralSkills', 'overallFit'],
    }[interviewType] || ['technicalKnowledge', 'communication', 'problemSolving', 'behavioralSkills', 'overallFit'];

    const schema = {
      type: Type.OBJECT,
      properties: {
        overallScore: { type: Type.INTEGER, description: '0-100' },
        readinessLevel: {
          type: Type.STRING,
          enum: ['excellent', 'well_prepared', 'ready', 'needs_improvement', 'not_ready'],
        },
        strengthAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvementAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
        detailedScores: {
          type: Type.OBJECT,
          properties: Object.fromEntries(
            scoreKeys.map((k) => [k, { type: Type.INTEGER, description: '1-10' }])
          ),
          required: scoreKeys,
        },
        questionAnalysis: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionNumber: { type: Type.INTEGER },
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
              score: { type: Type.INTEGER, description: '1-10' },
              feedback: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['questionNumber', 'question', 'answer', 'score', 'feedback'],
          },
        },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        summaryFeedback: { type: Type.STRING },
      },
      required: [
        'overallScore', 'readinessLevel', 'strengthAreas', 'improvementAreas',
        'detailedScores', 'questionAnalysis', 'recommendations', 'summaryFeedback',
      ],
    };

    const prompt = `You are an elite interview assessor. Below is the full transcript of a ${difficulty} ${interviewType} interview for a ${jobRole} role in ${industry}.

TRANSCRIPT:
${transcript}

Assess the CANDIDATE only (never Alex). Rules:
- Quote and reference what they actually said. No invented detail.
- Analyse every question Alex asked that the candidate answered.
- Grade against a ${difficulty} bar: be demanding at hard, supportive at easy.
- Note that this was a spoken interview — judge substance and structure, not transcription artefacts.
- Recommendations must be concrete and actionable, not platitudes.
- If the candidate barely engaged, score low and say so plainly.

Score bands: 90-100 excellent, 75-89 well_prepared, 60-74 ready, 40-59 needs_improvement, below 40 not_ready.
Set readinessLevel to match overallScore. detailedScores are 1-10.`;

    let lastError;
    for (const model of ANALYSIS_MODELS) {
      try {
        const res = await this.ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.4,
          },
        });

        const analysis = JSON.parse(res.text);
        analysis.overallScore = Math.max(0, Math.min(100, Math.round(analysis.overallScore)));
        console.log(`✅ Analysis complete (${model}): ${analysis.overallScore}/100 — ${analysis.readinessLevel}`);
        return analysis;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️  Analysis model ${model} failed: ${error.message}`);
      }
    }

    throw new Error(`Interview analysis failed: ${lastError?.message || 'unknown error'}`);
  }

  emptyAnalysis(interviewType) {
    console.log('⚠️  No candidate speech captured — returning a zero analysis');
    const keys = {
      hr: ['communication', 'behavioralResponses', 'culturalFit', 'interpersonalSkills', 'leadershipPotential'],
      technical: ['technicalKnowledge', 'problemSolving', 'analyticalThinking', 'domainExpertise', 'practicalApplication'],
      mixed: ['technicalKnowledge', 'communication', 'problemSolving', 'behavioralSkills', 'overallFit'],
    }[interviewType] || ['technicalKnowledge', 'communication', 'problemSolving', 'behavioralSkills', 'overallFit'];

    return {
      overallScore: 0,
      readinessLevel: 'not_ready',
      strengthAreas: [],
      improvementAreas: ['No answers were recorded, so there is nothing to assess yet.'],
      detailedScores: Object.fromEntries(keys.map((k) => [k, 0])),
      questionAnalysis: [],
      recommendations: [
        'Check that your microphone is allowed for this site and is not muted in the interview toolbar.',
        'Retake the interview and speak your answers out loud — Alex responds as soon as you stop talking.',
      ],
      summaryFeedback:
        'We could not hear any answers during this session, so no score could be produced. Please check your microphone and try again.',
    };
  }

  /* ------------------------------------------------------------------ */
  /* Plumbing                                                            */
  /* ------------------------------------------------------------------ */

  attachClientWebSocket(sessionId, clientWs) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    clearTimeout(session.abandonTimer); // they're back (or arriving for the first time)
    session.abandonTimer = null;
    session.clientWs = clientWs;
    return true;
  }

  /**
   * The candidate's browser went away (tab closed, laptop slept, network died).
   * Give them a grace period to come back, then tear the Live session down —
   * otherwise it stays open against the API and keeps billing.
   */
  scheduleAbandon(sessionId, graceMs, onReap) {
    const session = this.sessions.get(sessionId);
    if (!session || session.ended) return;

    clearTimeout(session.abandonTimer);
    session.abandonTimer = setTimeout(() => {
      if (!this.sessions.has(sessionId)) return;
      console.log(`🧹 Reaping abandoned interview session ${sessionId}`);
      this.endSession(sessionId);
      onReap?.();
    }, graceMs);
  }

  forwardToClient(session, event) {
    const ws = session.clientWs;
    if (ws && ws.readyState === 1) {
      try {
        ws.send(JSON.stringify(event));
      } catch (error) {
        console.error('❌ Forward to client failed:', error.message);
      }
    }
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.ended = true;
    session.isActive = false;
    clearTimeout(session.abandonTimer);

    try {
      session.live?.close();
    } catch { /* already closed */ }

    this.sessions.delete(sessionId);
    console.log(`✅ Session ended: ${sessionId}`);
  }

  getSessionInfo(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      isActive: session.isActive,
      model: session.model,
      voice: VOICE,
      questionsAsked: session.questionCount,
      answersReceived: session.answers.length,
      estimatedQuestions: `${session.range.min}-${session.range.max}`,
      duration: Date.now() - session.startTime,
    };
  }

  isQuestion(text) {
    const t = text.toLowerCase().trim();
    if (t.includes('?')) return true;
    return ['tell me', 'describe', 'explain', 'walk me through', 'talk me through', 'give me an example']
      .some((p) => t.includes(p));
  }

  isAvailable() {
    return this.available;
  }
}

module.exports = new GeminiRealtimeService();
