const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const interviewService = require('../services/geminiRealtimeService');
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { parseResume } = require('../utils/resumeParser');

/**
 * 🎤 AI MOCK INTERVIEW ROUTES  (Gemini Live)
 * REST for lifecycle + a WebSocket at /api/interview/ws for the audio stream.
 */

const READINESS_LEVELS = new Set([
  'excellent', 'well_prepared', 'ready', 'needs_improvement', 'not_ready',
]);

// How long a dropped client has to reconnect before we tear the session down.
const ABANDON_GRACE_MS = 60_000;

function normalizeReadiness(level, score = 0) {
  const key = String(level || '').toLowerCase().trim().replace(/\s+/g, '_');
  if (READINESS_LEVELS.has(key)) return key;

  // Fall back to deriving it from the score rather than silently defaulting.
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'well_prepared';
  if (score >= 60) return 'ready';
  if (score >= 40) return 'needs_improvement';
  return 'not_ready';
}

/**
 * 🚀 START INTERVIEW  —  POST /api/interview/start
 */
router.post('/start', authenticateToken, upload.single('resume'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { company, jobRole, industry, difficulty, interviewType } = req.body;

    if (!jobRole || !industry || !difficulty || !interviewType) {
      return res.status(400).json({ error: 'Missing required fields: jobRole, industry, difficulty, interviewType' });
    }

    if (!interviewService.isAvailable()) {
      return res.status(503).json({ error: 'The AI interviewer is not configured. Ask an admin to set GEMINI_API_KEY.' });
    }

    const student = await prisma.student.findUnique({ where: { id: userId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    console.log(`🎬 Starting interview for ${student.name}: ${company} | ${jobRole} | ${difficulty} | ${interviewType}`);

    // Resume is optional — a bad PDF must not kill the interview.
    let resumeData = null;
    if (req.file) {
      try {
        const parsed = await parseResume(req.file.buffer);
        resumeData = {
          fileName: req.file.originalname,
          uploadedAt: new Date(),
          parsedText: parsed.fullText,
          projects: parsed.projects,
          skills: parsed.skills,
          experience: parsed.experience,
          education: parsed.education,
        };
        console.log(`📄 Resume parsed: ${parsed.projects?.length || 0} projects, ${parsed.skills?.length || 0} skills`);
      } catch (error) {
        console.error('❌ Resume parse failed, continuing without it:', error.message);
      }
    }

    const interview = await prisma.mockInterview.create({
      data: {
        studentId: userId,
        jobRole,
        industry,
        difficulty,
        status: 'in_progress',
        aiModel: 'gemini-live',
        startedAt: new Date(),
        resumeData,
      },
    });

    const sessionId = interview.id;

    try {
      await interviewService.createSession(sessionId, {
        company: company || 'the company',
        jobRole,
        industry,
        difficulty,
        interviewType,
        userName: student.name,
        resumeData,
      });
    } catch (error) {
      // Don't leave an orphaned in_progress row behind if the AI never came up.
      await prisma.mockInterview.delete({ where: { id: interview.id } }).catch(() => {});
      throw error;
    }

    const info = interviewService.getSessionInfo(sessionId);
    console.log(`✅ Interview session ready: ${sessionId} (${info?.model})`);

    res.json({
      success: true,
      sessionId,
      interviewId: interview.id,
      model: info?.model,
      voice: info?.voice,
      estimatedQuestions: info?.estimatedQuestions,
      resumeUploaded: !!resumeData,
    });
  } catch (error) {
    console.error('❌ Error starting interview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📊 SESSION INFO  —  GET /api/interview/session/:sessionId
 */
router.get('/session/:sessionId', authenticateToken, (req, res) => {
  const info = interviewService.getSessionInfo(req.params.sessionId);
  if (!info) return res.status(404).json({ error: 'Session not found' });
  res.json(info);
});

/**
 * 🏁 END INTERVIEW + ANALYZE  —  POST /api/interview/end
 */
router.post('/end', authenticateToken, async (req, res) => {
  const { sessionId, interviewId } = req.body;

  try {
    console.log(`🏁 Ending interview session: ${sessionId}`);

    const analysis = await interviewService.analyzeInterview(sessionId);
    const readinessLevel = normalizeReadiness(analysis.readinessLevel, analysis.overallScore);

    const interview = await prisma.mockInterview.findUnique({ where: { id: interviewId } });
    if (interview) {
      await prisma.mockInterview.update({
        where: { id: interview.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          overallScore: analysis.overallScore,
          overallFeedback: {
            strengths: analysis.strengthAreas,
            areasForImprovement: analysis.improvementAreas,
            recommendations: analysis.recommendations,
            closingMessage: analysis.summaryFeedback,
            readinessLevel,
            detailedScores: analysis.detailedScores,
            questionAnalysis: analysis.questionAnalysis,
          },
        },
      });
    }

    interviewService.endSession(sessionId);
    console.log(`✅ Interview completed: ${sessionId} (${analysis.overallScore}/100)`);

    res.json({ success: true, analysis: { ...analysis, readinessLevel } });
  } catch (error) {
    console.error('❌ Error ending interview:', error.message);

    // The session is over either way — never strand it in `in_progress`.
    interviewService.endSession(sessionId);
    if (interviewId) {
      await prisma.mockInterview.update({
        where: { id: interviewId },
        data: { status: 'abandoned', completedAt: new Date() },
      }).catch(() => {});
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * 📈 RESULTS  —  GET /api/interview/results/:interviewId
 */
router.get('/results/:interviewId', authenticateToken, async (req, res) => {
  try {
    const interview = await prisma.mockInterview.findUnique({ where: { id: req.params.interviewId } });
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    if (interview.studentId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    res.json({ success: true, interview });
  } catch (error) {
    console.error('❌ Error getting results:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📜 HISTORY  —  GET /api/interview/history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const interviews = await prisma.mockInterview.findMany({
      where: { studentId: req.user.id },
      orderBy: { startedAt: 'desc' },
      take: 50,
      select: {
        id: true, jobRole: true, industry: true, difficulty: true, status: true,
        startedAt: true, completedAt: true, overallScore: true, overallFeedback: true, aiModel: true,
      },
    });

    res.json({ success: true, interviews });
  } catch (error) {
    console.error('❌ Error getting history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🗑️ DELETE  —  DELETE /api/interview/:interviewId
 */
router.delete('/:interviewId', authenticateToken, async (req, res) => {
  try {
    const interview = await prisma.mockInterview.findUnique({ where: { id: req.params.interviewId } });
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    if (interview.studentId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    await prisma.mockInterview.delete({ where: { id: req.params.interviewId } });
    res.json({ success: true, message: 'Interview deleted' });
  } catch (error) {
    console.error('❌ Error deleting interview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🎧 WEBSOCKET  —  /api/interview/ws
 * Client streams 16kHz PCM16 up; we stream Gemini's 24kHz PCM16 + transcripts down.
 */
function setupWebSocket(wss) {
  wss.on('connection', (ws) => {
    let sessionId = null;
    let isAuthenticated = false;

    // Drop sockets that connect and never authenticate.
    const authDeadline = setTimeout(() => {
      if (!isAuthenticated) ws.close(4001, 'Authentication timeout');
    }, 15000);

    ws.on('message', (raw) => {
      let data;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (data.type === 'auth') {
        try {
          const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
          isAuthenticated = true;
          clearTimeout(authDeadline);
          ws.send(JSON.stringify({ type: 'auth_success', userId: decoded.id }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'auth_failed',
            error: error.message,
            requiresLogin: error.name === 'TokenExpiredError',
          }));
        }
        return;
      }

      if (!isAuthenticated) {
        ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }));
        return;
      }

      switch (data.type) {
        case 'init': {
          sessionId = data.sessionId;
          const info = interviewService.getSessionInfo(sessionId);
          if (!info) {
            ws.send(JSON.stringify({ type: 'error', error: 'Session not found' }));
            ws.close(4004, 'Session not found');
            return;
          }
          interviewService.attachClientWebSocket(sessionId, ws);
          ws.send(JSON.stringify({ type: 'initialized', sessionId, sessionInfo: info }));
          console.log(`🔌 Client attached to interview session ${sessionId}`);
          return;
        }

        case 'audio':
          if (sessionId) interviewService.sendAudio(sessionId, data.audio);
          return;

        case 'text':
          if (sessionId) interviewService.sendText(sessionId, data.text);
          return;

        default:
          return;
      }
    });

    ws.on('close', () => {
      clearTimeout(authDeadline);
      if (!sessionId) return;

      console.log(`🔌 Client detached from session ${sessionId}`);

      // They may just be reconnecting. If they don't come back, close the Live
      // session (it bills while open) and stop the row sitting in `in_progress`.
      // sessionId is the MockInterview id — see the /start route.
      interviewService.scheduleAbandon(sessionId, ABANDON_GRACE_MS, async () => {
        await prisma.mockInterview.updateMany({
          where: { id: sessionId, status: 'in_progress' },
          data: { status: 'abandoned', completedAt: new Date() },
        }).catch(() => {});
      });
    });

    ws.on('error', (error) => console.error('❌ Client WebSocket error:', error.message));
  });
}

module.exports = { router, setupWebSocket };
