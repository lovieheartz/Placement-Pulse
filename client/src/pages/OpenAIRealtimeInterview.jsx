import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AIAvatar from '../components/AIAvatar';
import { API_BASE, WS_BASE } from '../config/api';

/**
 * 🎤 OPENAI REALTIME INTERVIEW
 * Ultra-low latency voice interview with GPT-4o Realtime API
 * Features:
 * - <200ms response latency
 * - Natural conversation flow
 * - Real-time transcription
 * - Intelligent question generation
 * - Comprehensive analysis
 */

const OpenAIRealtimeInterview = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('setup'); // setup, connecting, connected, interviewing, analyzing, completed
  const [error, setError] = useState(null);

  // Interview configuration
  const [config, setConfig] = useState({
    company: 'FAANG (Facebook, Apple, Amazon, Netflix, Google)',
    jobRole: 'SDE',
    industry: 'Technology',
    difficulty: 'easy',
    interviewType: 'mixed'
  });

  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [interviewId, setInterviewId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [latency, setLatency] = useState(null);

  // Audio/Video state
  const [isMicActive, setIsMicActive] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isAIListening, setIsAIListening] = useState(false);

  // Results
  const [analysis, setAnalysis] = useState(null);

  // Refs
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const audioPlayerRef = useRef(null);

  /**
   * 🚀 START INTERVIEW
   */
  const startInterview = async () => {
    try {
      setStatus('connecting');
      setError(null);

      // Validate inputs
      if (!config.jobRole || !config.industry) {
        setError('Please fill in all required fields');
        setStatus('setup');
        return;
      }

      const token = localStorage.getItem('token');

      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setStatus('setup');
        return;
      }

      console.log('🚀 Starting interview with config:', config);
      console.log('🔑 Token present:', token ? 'Yes' : 'No');

      // Create interview session
      const response = await axios.post(
        `${API_BASE}/api/openai-interview/start`,
        config,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Interview session created:', response.data);

      const { sessionId: newSessionId, interviewId: newInterviewId } = response.data;
      setSessionId(newSessionId);
      setInterviewId(newInterviewId);

      // Connect to WebSocket
      await connectWebSocket(newSessionId, token);

      // Start microphone and camera
      await startMicrophone();
      await startCamera();

      setStatus('interviewing');
      console.log('✅ Interview started successfully');

    } catch (error) {
      console.error('❌ Failed to start interview:', error);
      console.error('Error details:', error.response?.data);

      let errorMessage = 'Failed to start interview. ';

      if (error.response?.status === 403) {
        errorMessage += 'Authentication failed. Your session may have expired. Please log in again.';
      } else if (error.response?.status === 401) {
        errorMessage += 'No authentication token found. Please log in again.';
      } else if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else {
        errorMessage += error.message;
      }

      setError(errorMessage);
      setStatus('setup');
    }
  };

  /**
   * 🔌 CONNECT TO WEBSOCKET
   */
  const connectWebSocket = (sessionId, token) => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_BASE}/api/openai-interview/ws`);
      wsRef.current = ws;

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      ws.onopen = () => {
        console.log('🔌 WebSocket connected');

        // Authenticate
        ws.send(JSON.stringify({ type: 'auth', token }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);

        if (data.type === 'auth_success') {
          // Initialize session
          ws.send(JSON.stringify({ type: 'init', sessionId }));
        } else if (data.type === 'initialized') {
          clearTimeout(timeout);
          resolve();
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        clearTimeout(timeout);
        reject(error);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        if (status === 'interviewing') {
          setError('Connection lost. Please try again.');
          setStatus('setup');
        }
      };
    });
  };

  /**
   * 📨 HANDLE WEBSOCKET MESSAGES
   */
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'auth_success':
        console.log('✅ Authenticated');
        break;

      case 'initialized':
        console.log('✅ Session initialized');
        break;

      case 'session_ready':
        console.log('✅ Session ready');
        setIsAIListening(true);
        break;

      case 'user_transcript':
        // User's speech transcribed
        setConversationHistory(prev => [...prev, {
          role: 'user',
          text: data.text,
          timestamp: data.timestamp
        }]);
        setIsAIListening(false);
        console.log('📝 User said:', data.text);
        break;

      case 'ai_transcript':
        // AI's response transcribed
        setConversationHistory(prev => [...prev, {
          role: 'assistant',
          text: data.text,
          timestamp: data.timestamp
        }]);
        setCurrentQuestion(data.questionNumber);
        setIsAISpeaking(false);
        setIsAIListening(true);
        console.log('🤖 AI said:', data.text);
        break;

      case 'audio_delta':
        // AI is speaking - play audio
        setIsAISpeaking(true);
        setIsAIListening(false);
        playAudioChunk(data.audio);
        break;

      case 'audio_done':
        // AI finished speaking
        setIsAISpeaking(false);
        setIsAIListening(true);
        break;

      case 'latency':
        setLatency(data.latency);
        break;

      case 'error':
        console.error('❌ WebSocket error:', data.error);
        setError(data.error);
        break;

      default:
        console.log('[WebSocket]', data.type, data);
    }
  };

  /**
   * 🔊 PLAY AUDIO CHUNK
   * Play audio received from OpenAI
   */
  const playAudioChunk = (base64Audio) => {
    try {
      if (!audioPlayerRef.current) {
        // Initialize Web Audio API for playback
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24000 // OpenAI uses 24kHz
        });
        audioPlayerRef.current = audioCtx;
      }

      // Decode base64 to audio buffer
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert to Int16Array (PCM16)
      const pcm16 = new Int16Array(bytes.buffer);

      // Convert to Float32Array for Web Audio API
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0; // Convert to -1.0 to 1.0 range
      }

      // Create audio buffer
      const audioBuffer = audioPlayerRef.current.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      // Play it
      const source = audioPlayerRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioPlayerRef.current.destination);
      source.start();

    } catch (error) {
      console.error('Error playing audio chunk:', error);
    }
  };

  /**
   * 🎤 START MICROPHONE
   */
  const startMicrophone = async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      micStreamRef.current = stream;

      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Create processor for audio level visualization
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      audioProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate audio level
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const level = Math.sqrt(sum / inputData.length);
        setAudioLevel(Math.min(100, level * 500));

        // Send audio to WebSocket
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          // Convert to PCM16
          const pcm16 = convertToPCM16(inputData);
          const base64Audio = arrayBufferToBase64(pcm16.buffer);

          wsRef.current.send(JSON.stringify({
            type: 'audio',
            audio: base64Audio
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsMicActive(true);
      console.log('✅ Microphone started');

    } catch (error) {
      console.error('❌ Failed to start microphone:', error);
      setError('Microphone access denied. Please allow microphone access.');
      throw error;
    }
  };

  /**
   * 📹 START CAMERA
   */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsCameraActive(true);
      console.log('✅ Camera started');

    } catch (error) {
      console.error('❌ Failed to start camera:', error);
      // Camera is optional, don't throw error
      console.log('⚠️ Continuing without camera');
    }
  };

  /**
   * 🛑 END INTERVIEW
   */
  const endInterview = async () => {
    try {
      setStatus('analyzing');

      // Stop microphone
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      // Stop camera
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
      }

      if (wsRef.current) {
        wsRef.current.close();
      }

      setIsMicActive(false);
      setIsCameraActive(false);

      const token = localStorage.getItem('token');

      // Get analysis
      const response = await axios.post(
        `${API_BASE}/api/openai-interview/end`,
        { sessionId, interviewId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAnalysis(response.data.analysis);
      setStatus('completed');
      console.log('✅ Interview ended and analyzed');

    } catch (error) {
      console.error('❌ Failed to end interview:', error);
      setError(error.response?.data?.error || error.message);
    }
  };

  /**
   * 🔧 UTILITIES
   */
  const convertToPCM16 = (float32Array) => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  };

  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  /**
   * 🎨 RENDER
   */
  if (status === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🎤 AI Voice Interview
              </h1>
              <p className="text-gray-600">
                Ultra-low latency interview powered by OpenAI Realtime API
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={config.company}
                  onChange={(e) => setConfig({ ...config, company: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Google, Amazon, Microsoft"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Role *
                </label>
                <input
                  type="text"
                  value={config.jobRole}
                  onChange={(e) => setConfig({ ...config, jobRole: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Software Engineer, Data Scientist"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry *
                </label>
                <input
                  type="text"
                  value={config.industry}
                  onChange={(e) => setConfig({ ...config, industry: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Technology, Finance, Healthcare"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interview Type *
                </label>
                <select
                  value={config.interviewType}
                  onChange={(e) => setConfig({ ...config, interviewType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="hr">HR/Behavioral Only</option>
                  <option value="technical">Technical Only</option>
                  <option value="mixed">Mixed (HR + Technical)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={config.difficulty}
                  onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="easy">Easy (10-12 questions)</option>
                  <option value="medium">Medium (12-20 questions)</option>
                  <option value="hard">Hard (20-25 questions)</option>
                </select>
              </div>

              <button
                onClick={startInterview}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                🚀 Start Interview
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Connecting to interview system...</p>
        </div>
      </div>
    );
  }

  if (status === 'interviewing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto h-screen flex flex-col">
          {/* Header */}
          <div className="bg-white rounded-t-2xl shadow-lg p-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {config.company} - {config.jobRole}
              </h1>
              <p className="text-gray-600">
                {config.interviewType.toUpperCase()} Interview | {config.difficulty} difficulty
              </p>
            </div>
            <div className="flex items-center gap-4">
              {latency && (
                <div className="text-sm">
                  <span className="text-gray-600">Latency:</span>{' '}
                  <span className={`font-semibold ${latency < 200 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {latency}ms
                  </span>
                </div>
              )}
              <button
                onClick={endInterview}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                End Interview
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 bg-white shadow-lg p-6 overflow-hidden">
            <div className="h-full grid grid-cols-3 gap-6">
              {/* Left: AI Avatar */}
              <div className="col-span-1 flex flex-col items-center justify-start space-y-4">
                <div className="w-full aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg">
                  <AIAvatar isSpeaking={isAISpeaking} isListening={isAIListening} />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900">Alex - AI Interviewer</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {isAISpeaking ? '🗣️ Speaking...' : isAIListening ? '👂 Listening...' : '💭 Thinking...'}
                  </p>
                </div>
              </div>

              {/* Middle: Conversation Transcript */}
              <div className="col-span-1 flex flex-col h-full">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Conversation</h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {conversationHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-full px-4 py-3 rounded-xl ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="text-xs font-semibold mb-1 opacity-75">
                          {msg.role === 'user' ? 'You' : 'Alex'}
                        </div>
                        <div className="text-sm">{msg.text}</div>
                      </div>
                    </div>
                  ))}
                  {conversationHistory.length === 0 && (
                    <div className="text-center text-gray-400 mt-8">
                      Waiting for interview to begin...
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Your Camera Feed */}
              <div className="col-span-1 flex flex-col items-center justify-start space-y-4">
                <div className="w-full aspect-square bg-gray-900 rounded-2xl overflow-hidden shadow-lg relative">
                  {isCameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Microphone indicator overlay */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black bg-opacity-50 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${isMicActive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                            <span className="text-white text-sm font-medium">
                              {isMicActive ? 'Mic Active' : 'Mic Off'}
                            </span>
                          </div>
                          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-100"
                              style={{ width: `${audioLevel}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-6xl mb-4">📷</div>
                        <p>Camera not available</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900">You</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {isMicActive ? '🎤 Recording your responses' : '🔇 Microphone off'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'analyzing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Analyzing your performance...</p>
          <p className="text-gray-600 mt-2">This may take a minute</p>
        </div>
      </div>
    );
  }

  if (status === 'completed' && analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Interview Complete!
              </h1>
              <p className="text-gray-600">Here's your comprehensive analysis</p>
            </div>

            {/* Overall Score */}
            <div className="mb-8 text-center">
              <div className="inline-block px-8 py-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200">
                <div className="text-6xl font-bold text-blue-600 mb-2">
                  {analysis.overallScore}/100
                </div>
                <div className="text-xl font-semibold text-gray-700">
                  {analysis.readinessLevel}
                </div>
              </div>
            </div>

            {/* Detailed Scores */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {Object.entries(analysis.detailedScores).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{value}/10</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              ))}
            </div>

            {/* Strengths */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Strengths</h3>
              <ul className="space-y-2">
                {analysis.strengthAreas.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvement Areas */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Areas for Improvement</h3>
              <ul className="space-y-2">
                {analysis.improvementAreas.map((area, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-1">→</span>
                    <span className="text-gray-700">{area}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Recommendations</h3>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Summary */}
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Summary</h3>
              <p className="text-gray-700">{analysis.summaryFeedback}</p>
            </div>

            {/* Actions */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={() => navigate('/student/mock-interview')}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Take Another Interview
              </button>
              <button
                onClick={() => navigate('/student/dashboard')}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default OpenAIRealtimeInterview;
