const express = require('express');
const router = express.Router();
const WebSocket = require('ws');
const openaiRealtimeService = require('../services/openaiRealtimeService');
const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { parseResume } = require('../utils/resumeParser');

/**
 * 🎤 OPENAI REALTIME INTERVIEW ROUTES
 * WebSocket-based real-time voice interview system
 */

/**
 * 🚀 START INTERVIEW SESSION (with optional resume upload)
 * POST /api/openai-interview/start
 */
router.post('/start', authenticateToken, upload.single('resume'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { company, jobRole, industry, difficulty, interviewType } = req.body;

    console.log(`🎬 Starting OpenAI Realtime interview for user ${userId}`);
    console.log(`📋 Config: ${company} | ${jobRole} | ${industry} | ${difficulty} | ${interviewType}`);

    // Validate inputs
    if (!jobRole || !industry || !difficulty || !interviewType) {
      return res.status(400).json({ error: 'Missing required fields: jobRole, industry, difficulty, interviewType' });
    }

    // Get student info
    const student = await prisma.student.findUnique({ where: { id: userId } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Parse resume if uploaded
    let resumeData = null;
    if (req.file) {
      console.log(`📄 Resume uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
      try {
        const parsedResume = await parseResume(req.file.buffer);
        resumeData = {
          fileName: req.file.originalname,
          uploadedAt: new Date(),
          parsedText: parsedResume.fullText,
          projects: parsedResume.projects,
          skills: parsedResume.skills,
          experience: parsedResume.experience,
          education: parsedResume.education
        };
        console.log(`✅ Resume parsed: ${parsedResume.projects.length} projects, ${parsedResume.skills.length} skills`);
      } catch (parseError) {
        console.error('❌ Error parsing resume:', parseError);
        // Continue without resume data - don't fail the interview
      }
    }

    // Create interview session in database
    // Note: `company` and `interviewType` are not persisted columns (they were
    // silently dropped under Mongoose too); they are still passed to the AI session below.
    const interviewSession = await prisma.mockInterview.create({
      data: {
        studentId: userId,
        jobRole,
        industry,
        difficulty,
        status: 'in_progress',
        aiModel: 'gpt-4o-realtime',
        startedAt: new Date(),
        resumeData: resumeData
      }
    });

    // Create OpenAI Realtime session with resume context
    const sessionId = interviewSession.id;
    await openaiRealtimeService.createSession(sessionId, {
      company: company || 'Not specified',
      jobRole,
      industry,
      difficulty,
      interviewType,
      userName: student.name,
      resumeData: resumeData // Pass resume data to AI
    });

    console.log(`✅ Interview session created: ${sessionId}`);

    res.json({
      success: true,
      sessionId,
      interviewId: interviewSession.id,
      message: 'OpenAI Realtime interview session started',
      resumeUploaded: !!resumeData
    });
  } catch (error) {
    console.error('❌ Error starting interview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📊 GET SESSION INFO
 * GET /api/openai-interview/session/:sessionId
 */
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionInfo = openaiRealtimeService.getSessionInfo(sessionId);

    if (!sessionInfo) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(sessionInfo);
  } catch (error) {
    console.error('❌ Error getting session info:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🛑 END INTERVIEW SESSION
 * POST /api/openai-interview/end
 */
router.post('/end', authenticateToken, async (req, res) => {
  try {
    const { sessionId, interviewId } = req.body;

    console.log(`🏁 Ending interview session: ${sessionId}`);

    // Analyze the interview
    const analysis = await openaiRealtimeService.analyzeInterview(sessionId);

    // Update database with results
    const interview = await prisma.mockInterview.findUnique({ where: { id: interviewId } });
    if (interview) {
      // Map readinessLevel to valid enum values
      const readinessLevelMap = {
        'excellent': 'excellent',
        'well_prepared': 'well_prepared',
        'well prepared': 'well_prepared',
        'ready': 'ready',
        'good': 'ready', // Fallback for old "good" value
        'fair': 'ready',
        'needs_improvement': 'needs_improvement',
        'needs improvement': 'needs_improvement',
        'not_ready': 'not_ready',
        'not ready': 'not_ready'
      };

      const normalizedLevel = analysis.readinessLevel.toLowerCase().trim().replace(/\s+/g, '_');
      const validLevel = readinessLevelMap[normalizedLevel] ||
                        readinessLevelMap[analysis.readinessLevel.toLowerCase().trim()] ||
                        'ready'; // Default fallback

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
            readinessLevel: validLevel
          }
        }
      });
    }

    // End the realtime session
    openaiRealtimeService.endSession(sessionId);

    console.log(`✅ Interview completed: ${sessionId} (Score: ${analysis.overallScore}/100)`);

    res.json({
      success: true,
      analysis,
      message: 'Interview completed and analyzed successfully'
    });
  } catch (error) {
    console.error('❌ Error ending interview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📈 GET INTERVIEW RESULTS
 * GET /api/openai-interview/results/:interviewId
 */
router.get('/results/:interviewId', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;

    const interview = await prisma.mockInterview.findUnique({ where: { id: interviewId } });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Verify user owns this interview
    if (interview.studentId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      success: true,
      interview: {
        id: interview.id,
        jobRole: interview.jobRole,
        industry: interview.industry,
        difficulty: interview.difficulty,
        status: interview.status,
        startedAt: interview.startedAt,
        completedAt: interview.completedAt,
        overallScore: interview.overallScore,
        overallFeedback: interview.overallFeedback
      }
    });
  } catch (error) {
    console.error('❌ Error getting results:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 📜 GET INTERVIEW HISTORY
 * GET /api/interview/history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const interviews = await prisma.mockInterview.findMany({
      where: { studentId: userId },
      orderBy: { startedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        jobRole: true,
        industry: true,
        difficulty: true,
        status: true,
        startedAt: true,
        completedAt: true,
        overallScore: true,
        overallFeedback: true,
        aiModel: true
      }
    });

    res.json({
      success: true,
      interviews
    });
  } catch (error) {
    console.error('❌ Error getting history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🗑️ DELETE INTERVIEW
 * DELETE /api/interview/:interviewId
 */
router.delete('/:interviewId', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;

    const interview = await prisma.mockInterview.findUnique({ where: { id: interviewId } });

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Verify user owns this interview
    if (interview.studentId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.mockInterview.delete({ where: { id: interviewId } });

    console.log(`🗑️ Interview deleted: ${interviewId}`);

    res.json({
      success: true,
      message: 'Interview deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting interview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 🎧 WEBSOCKET HANDLER
 * Bidirectional audio streaming with OpenAI Realtime API
 */
function setupWebSocket(wss) {
  wss.on('connection', async (ws, req) => {
    console.log('🔌 New WebSocket connection for OpenAI Realtime');

    let sessionId = null;
    let isAuthenticated = false;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle authentication
        if (data.type === 'auth') {
          try {
            const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
            isAuthenticated = true;
            ws.send(JSON.stringify({ type: 'auth_success', userId: decoded.id }));
            console.log('✅ WebSocket authenticated for user:', decoded.id);
          } catch (error) {
            console.error('❌ WebSocket auth failed:', error.message);
            ws.send(JSON.stringify({
              type: 'auth_failed',
              error: error.message,
              requiresLogin: error.name === 'TokenExpiredError'
            }));
            // Don't close immediately - give client chance to handle
            setTimeout(() => {
              if (!isAuthenticated) {
                ws.close();
              }
            }, 5000);
          }
          return;
        }

        if (!isAuthenticated) {
          ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }));
          return;
        }

        // Handle session initialization
        if (data.type === 'init') {
          sessionId = data.sessionId;
          const sessionInfo = openaiRealtimeService.getSessionInfo(sessionId);

          if (!sessionInfo) {
            ws.send(JSON.stringify({ type: 'error', error: 'Session not found' }));
            ws.close();
            return;
          }

          // Attach client WebSocket to session for event forwarding
          openaiRealtimeService.attachClientWebSocket(sessionId, ws);

          ws.send(JSON.stringify({
            type: 'initialized',
            sessionId,
            sessionInfo
          }));

          console.log(`✅ WebSocket initialized with session: ${sessionId}`);
          return;
        }

        // Handle audio data
        if (data.type === 'audio' && sessionId) {
          // Forward audio to OpenAI Realtime API
          openaiRealtimeService.sendAudio(sessionId, data.audio);
          return;
        }

        // Handle text messages (for testing)
        if (data.type === 'text' && sessionId) {
          openaiRealtimeService.sendText(sessionId, data.text);
          return;
        }

      } catch (error) {
        console.error('❌ WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', error: error.message }));
      }
    });

    ws.on('close', () => {
      console.log(`🔌 WebSocket disconnected${sessionId ? ` (session: ${sessionId})` : ''}`);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  });
}

module.exports = { router, setupWebSocket };
