const express = require('express');
const router = express.Router();
const WebSocket = require('ws');
const geminiLiveService = require('../services/geminiLiveService');
const { verifyToken } = require('../middleware/auth');

/**
 * 🎤 REAL-TIME INTERVIEW WEBSOCKET HANDLER
 * Handles WebSocket connections for live audio/video interview streaming
 */
function setupLiveInterviewWebSocket(server) {
  const wss = new WebSocket.Server({
    server,
    path: '/api/live-interview',
    verifyClient: (info, callback) => {
      // Extract token from query parameters
      const url = new URL(info.req.url, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        callback(false, 401, 'Unauthorized');
        return;
      }

      // Verify JWT token
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        info.req.user = decoded;
        callback(true);
      } catch (error) {
        callback(false, 401, 'Invalid token');
      }
    }
  });

  wss.on('connection', async (ws, req) => {
    const user = req.user;
    const sessionId = `live_${user.id}_${Date.now()}`;

    console.log(`🎤 New live interview connection: ${sessionId}`);

    let currentSession = null;

    // Message handler
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'start_interview':
            // Start live interview session
            const { jobRole, industry, difficulty, experienceLevel, totalQuestions } = message.data;

            currentSession = await geminiLiveService.startLiveInterview({
              sessionId,
              jobRole,
              industry,
              difficulty,
              experienceLevel: experienceLevel || 'intermediate',
              totalQuestions: totalQuestions || 15,

              // Callback: When AI generates audio response
              onAudioResponse: (audioData) => {
                ws.send(JSON.stringify({
                  type: 'audio_response',
                  data: audioData.toString('base64'),
                  timestamp: Date.now()
                }));
              },

              // Callback: When AI generates text response
              onTextResponse: (text) => {
                ws.send(JSON.stringify({
                  type: 'text_response',
                  data: text,
                  timestamp: Date.now()
                }));
              },

              // Callback: When user speech is transcribed
              onTranscript: (transcript) => {
                ws.send(JSON.stringify({
                  type: 'user_transcript',
                  data: transcript,
                  timestamp: Date.now()
                }));
              },

              // Callback: On error
              onError: (error) => {
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { message: error.message },
                  timestamp: Date.now()
                }));
              }
            });

            ws.send(JSON.stringify({
              type: 'interview_started',
              data: { sessionId },
              timestamp: Date.now()
            }));

            console.log(`✅ Interview session ${sessionId} started`);
            break;

          case 'audio_chunk':
            // User's audio data
            if (!currentSession) {
              ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'No active session' }
              }));
              return;
            }

            const audioData = Buffer.from(message.data, 'base64');
            await geminiLiveService.sendAudio(sessionId, audioData);
            break;

          case 'video_frame':
            // Camera frame for visual analysis
            if (!currentSession) return;

            const frameData = Buffer.from(message.data, 'base64');
            await geminiLiveService.sendVideoFrame(sessionId, frameData);
            break;

          case 'end_audio_stream':
            // Signal that user finished speaking
            if (!currentSession) return;
            await geminiLiveService.endAudioStream(sessionId);
            break;

          case 'text_message':
            // Fallback text input
            if (!currentSession) return;
            await geminiLiveService.sendText(sessionId, message.data);
            break;

          case 'get_status':
            // Get session status
            const status = geminiLiveService.getSessionStatus(sessionId);
            ws.send(JSON.stringify({
              type: 'session_status',
              data: status,
              timestamp: Date.now()
            }));
            break;

          case 'end_interview':
            // End interview session
            if (currentSession) {
              await geminiLiveService.endSession(sessionId);
              currentSession = null;

              ws.send(JSON.stringify({
                type: 'interview_ended',
                data: { sessionId },
                timestamp: Date.now()
              }));

              console.log(`🎬 Interview session ${sessionId} ended`);
            }
            break;

          case 'ping':
            // Keep-alive
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }));
            break;

          default:
            console.warn(`Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('Error handling message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: error.message },
          timestamp: Date.now()
        }));
      }
    });

    // Handle disconnection
    ws.on('close', async () => {
      console.log(`🔌 Client disconnected: ${sessionId}`);
      if (currentSession) {
        await geminiLiveService.endSession(sessionId);
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for ${sessionId}:`, error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      data: {
        sessionId,
        message: 'Connected to live interview service'
      },
      timestamp: Date.now()
    }));
  });

  console.log('✅ Live Interview WebSocket server initialized on /api/live-interview');

  return wss;
}

// REST endpoints for session management
router.get('/sessions/active', (req, res) => {
  // Get user's active sessions
  res.json({
    success: true,
    message: 'Use WebSocket for live interviews',
    websocketUrl: '/api/live-interview'
  });
});

module.exports = { router, setupLiveInterviewWebSocket };
