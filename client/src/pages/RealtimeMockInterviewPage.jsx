import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMic, FiCamera, FiVideoOff, FiVolume2, FiMicOff } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import StudentSidebar from '../components/StudentSidebar';
import StudentHeader from '../components/StudentHeader';
import StudentFooter from '../components/StudentFooter';
import './Dashboard.css';

/**
 * REAL-TIME MOCK INTERVIEW WITH GEMINI MULTIMODAL LIVE API
 * - Ultra-low latency (~500ms)
 * - Bidirectional audio streaming
 * - Natural voice conversation
 * - Production-ready
 */
const RealtimeMockInterviewPage = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  // Views: 'setup', 'interview', 'results'
  const [currentView, setCurrentView] = useState('setup');

  // Interview configuration
  const [interviewConfig, setInterviewConfig] = useState({
    jobRole: '',
    industry: 'Information Technology',
    difficulty: 'medium',
    experienceLevel: 'intermediate',
    totalQuestions: 15
  });

  // WebSocket state
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Interview state
  const [conversation, setConversation] = useState([]);
  const [currentStatus, setCurrentStatus] = useState('Ready');
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  // Audio state
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Camera state
  const [cameraEnabled, setCameraEnabled] = useState(false);

  // Refs
  const wsRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const conversationEndRef = useRef(null);
  const isPlayingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Auto-scroll conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // ========== CAMERA FUNCTIONS ==========
  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      streamRef.current = stream;
      setCameraEnabled(true);
      console.log('✅ Camera enabled');
    } catch (error) {
      console.error('❌ Camera error:', error);
      alert('Camera access denied or not available. You can continue without video.');
    }
  };

  const disableCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraEnabled(false);
  };

  // ========== AUDIO FUNCTIONS ==========
  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create AudioContext for processing
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);

      // Create ScriptProcessor for real-time audio chunks
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isMicEnabled) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = convertFloat32ToPCM16(inputData);

        // Send audio chunk to server
        wsRef.current.send(JSON.stringify({
          type: 'audio_chunk',
          data: arrayBufferToBase64(pcm16.buffer)
        }));

        setIsUserSpeaking(true);
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      setIsMicEnabled(true);
      console.log('✅ Microphone started');

    } catch (error) {
      console.error('❌ Microphone error:', error);
      alert('Microphone access denied. Please allow microphone access to continue.');
    }
  };

  const stopMicrophone = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsMicEnabled(false);
    setIsUserSpeaking(false);
    console.log('🎤 Microphone stopped');
  };

  // Convert Float32Array to PCM16
  const convertFloat32ToPCM16 = (float32Array) => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  };

  // Convert ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Play audio response from AI
  const playAudioResponse = async (base64Audio) => {
    try {
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create audio context if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Decode audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);

      // Create source and play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        setIsAISpeaking(false);
        setIsAudioPlaying(false);
        isPlayingRef.current = false;
        // Play next in queue
        playNextInQueue();
      };

      setIsAISpeaking(true);
      setIsAudioPlaying(true);
      isPlayingRef.current = true;
      source.start(0);

    } catch (error) {
      console.error('❌ Error playing audio:', error);
      setIsAISpeaking(false);
      setIsAudioPlaying(false);
      isPlayingRef.current = false;
      playNextInQueue();
    }
  };

  // Queue management for audio
  const playNextInQueue = () => {
    if (audioQueueRef.current.length > 0 && !isPlayingRef.current) {
      const next = audioQueueRef.current.shift();
      playAudioResponse(next);
    }
  };

  // ========== WEBSOCKET FUNCTIONS ==========
  const connectWebSocket = () => {
    const token = sessionStorage.getItem('authToken');
    const wsUrl = `ws://localhost:3001/api/live-interview?token=${token}`;

    console.log('🔌 Connecting to WebSocket...');
    setCurrentStatus('Connecting...');

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      setCurrentStatus('Connected');
      wsRef.current = websocket;
      setWs(websocket);
    };

    websocket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Received:', message.type);

        switch (message.type) {
          case 'connected':
            setSessionId(message.data.sessionId);
            break;

          case 'interview_started':
            setCurrentView('interview');
            setCurrentStatus('Interview Started');
            await enableCamera();
            await startMicrophone();
            break;

          case 'audio_response':
            // Queue audio for playback
            if (isPlayingRef.current) {
              audioQueueRef.current.push(message.data);
            } else {
              playAudioResponse(message.data);
            }
            break;

          case 'text_response':
            setConversation(prev => [...prev, {
              role: 'ai',
              text: message.data,
              timestamp: Date.now()
            }]);
            break;

          case 'user_transcript':
            setConversation(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'user' && lastMsg.isTranscript) {
                // Update existing transcript
                return [...prev.slice(0, -1), {
                  ...lastMsg,
                  text: message.data
                }];
              } else {
                // Add new transcript
                return [...prev, {
                  role: 'user',
                  text: message.data,
                  isTranscript: true,
                  timestamp: Date.now()
                }];
              }
            });
            break;

          case 'interview_ended':
            setCurrentStatus('Interview Complete');
            setCurrentView('results');
            stopMicrophone();
            disableCamera();
            break;

          case 'error':
            console.error('❌ Server error:', message.data.message);
            alert(`Error: ${message.data.message}`);
            break;

          case 'pong':
            // Keep-alive response
            break;

          default:
            console.warn('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('❌ Error handling message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setCurrentStatus('Connection Error');
      alert('Connection error. Please check your network and try again.');
    };

    websocket.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
      setCurrentStatus('Disconnected');
      wsRef.current = null;
      setWs(null);
    };

    // Keep-alive ping
    const pingInterval = setInterval(() => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    websocket.pingInterval = pingInterval;

    return websocket;
  };

  // ========== START INTERVIEW ==========
  const startInterview = async () => {
    if (!interviewConfig.jobRole.trim()) {
      alert('Please enter a job role');
      return;
    }

    try {
      // Connect WebSocket
      const websocket = connectWebSocket();

      // Wait for connection
      websocket.addEventListener('open', () => {
        setTimeout(() => {
          // Send start interview message
          websocket.send(JSON.stringify({
            type: 'start_interview',
            data: {
              ...interviewConfig
            }
          }));
        }, 500);
      });

    } catch (error) {
      console.error('❌ Error starting interview:', error);
      alert('Failed to start interview. Please try again.');
    }
  };

  // ========== END INTERVIEW ==========
  const endInterview = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_interview' }));
      stopMicrophone();
      disableCamera();
    }
  };

  // ========== RENDER FUNCTIONS ==========
  const renderSetupView = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-12 animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mb-6 shadow-xl animate-pulse-slow">
            <FiMic className="text-white text-6xl" />
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-4">Real-Time AI Interview</h2>
          <p className="text-gray-600 text-xl max-w-2xl mx-auto">Natural voice conversation with ultra-low latency (~500ms)</p>
        </div>

        <div className="space-y-6 mb-8">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Job Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800 text-lg"
              placeholder="e.g., Software Engineer, Data Scientist"
              value={interviewConfig.jobRole}
              onChange={(e) => setInterviewConfig({ ...interviewConfig, jobRole: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Industry</label>
              <select
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800 text-lg"
                value={interviewConfig.industry}
                onChange={(e) => setInterviewConfig({ ...interviewConfig, industry: e.target.value })}
              >
                <option value="Information Technology">Information Technology</option>
                <option value="Software Development">Software Development</option>
                <option value="Data Science & AI">Data Science & AI</option>
                <option value="Finance & Banking">Finance & Banking</option>
                <option value="Healthcare">Healthcare</option>
                <option value="E-commerce">E-commerce</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Difficulty</label>
              <select
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800 text-lg"
                value={interviewConfig.difficulty}
                onChange={(e) => setInterviewConfig({ ...interviewConfig, difficulty: e.target.value })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl">✓</span>
            </div>
            <div>
              <h4 className="font-bold text-green-900 text-lg mb-2">Real-Time Features</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Ultra-low latency (~500ms response time)</li>
                <li>• Natural voice conversation with AI</li>
                <li>• Bidirectional audio streaming</li>
                <li>• Live transcription</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={startInterview}
          disabled={!interviewConfig.jobRole.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-5 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
        >
          <FiMic className="text-2xl" />
          <span>Start Real-Time Interview</span>
        </button>
      </div>
    </div>
  );

  const renderInterviewView = () => (
    <div className="w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-250px)]">

        {/* LEFT: Chat History (40%) */}
        <div className="col-span-5 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <h3 className="text-2xl font-bold">Interview Conversation</h3>
            <p className="text-purple-100 text-sm mt-1">{interviewConfig.jobRole}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {conversation.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
                  msg.role === 'ai'
                    ? 'bg-gradient-to-br from-purple-100 to-blue-100 border border-purple-200'
                    : 'bg-gradient-to-br from-green-100 to-emerald-100 border border-green-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xs font-bold text-gray-600">
                      {msg.role === 'ai' ? '🤖 Alex (AI)' : '👤 You'}
                    </span>
                    {msg.isTranscript && <span className="text-xs text-green-600 font-semibold">(Live)</span>}
                  </div>
                  <p className="text-gray-800 leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={conversationEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  isMicEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  <FiMic className={`text-lg ${isMicEnabled && isUserSpeaking ? 'animate-pulse' : ''}`} />
                  <span className="text-sm font-semibold">
                    {isMicEnabled ? (isUserSpeaking ? 'Speaking...' : 'Listening') : 'Mic Off'}
                  </span>
                </div>

                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  isAISpeaking ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  <FiVolume2 className={`text-lg ${isAISpeaking ? 'animate-pulse' : ''}`} />
                  <span className="text-sm font-semibold">
                    {isAISpeaking ? 'AI Speaking' : 'AI Ready'}
                  </span>
                </div>
              </div>

              <button
                onClick={endInterview}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition-all"
              >
                End Interview
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: AI Avatar + Student Video (60%) */}
        <div className="col-span-7 flex flex-col space-y-4">

          {/* AI Interviewer - Large */}
          <div className="flex-1 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center">

                {/* AI Avatar */}
                <div className="relative inline-block mb-6">
                  {isAISpeaking && (
                    <div className="absolute inset-0 -m-6">
                      <div className="w-full h-full rounded-full border-8 border-purple-300 animate-ping opacity-75"></div>
                      <div className="absolute inset-0 w-full h-full rounded-full border-8 border-purple-300 opacity-50"></div>
                    </div>
                  )}

                  <img
                    src="https://api.dicebear.com/7.x/adventurer/svg?seed=Alex&backgroundColor=b6e3f4"
                    alt="AI Interviewer - Alex"
                    className={`w-64 h-64 rounded-full border-8 border-white/40 shadow-2xl transition-all duration-300 ${
                      isAISpeaking ? 'scale-110 border-purple-300' : 'scale-100'
                    }`}
                  />

                  {/* Speaking Indicator */}
                  {isAISpeaking && (
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
                      <div className="w-2 h-8 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-14 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-10 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                      <div className="w-2 h-16 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '450ms' }}></div>
                      <div className="w-2 h-8 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
                    </div>
                  )}
                </div>

                <h3 className="text-white text-4xl font-bold mb-3">Alex - AI Interviewer</h3>
                <div className="inline-block bg-white/20 backdrop-blur-md px-8 py-3 rounded-full">
                  <p className="text-white text-xl font-semibold">
                    {isAISpeaking ? '🎙️ Speaking...' : isUserSpeaking ? '👂 Listening...' : '💭 Ready'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="absolute top-6 left-6">
              <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
                <p className="text-white text-sm font-semibold flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span>{currentStatus}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Student Video - Smaller */}
          <div className="h-56 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-3 bg-gray-800 flex items-center justify-between flex-shrink-0">
              <span className="text-white font-semibold text-sm flex items-center space-x-2">
                <FiCamera />
                <span>You</span>
              </span>
              {cameraEnabled ? (
                <button onClick={disableCamera} className="text-red-400 hover:text-red-300 text-lg">
                  <FiVideoOff />
                </button>
              ) : (
                <button onClick={enableCamera} className="text-green-400 hover:text-green-300 text-lg">
                  <FiCamera />
                </button>
              )}
            </div>
            <div className="relative bg-gray-900 flex-1">
              {cameraEnabled ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-800">
                  <div className="text-center">
                    <FiVideoOff className="text-5xl text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Camera Off</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderResultsView = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-2xl p-12">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">Interview Complete!</h2>
          <p className="text-xl text-gray-600 mb-8">Your comprehensive analysis is being prepared...</p>

          <button
            onClick={() => {
              setCurrentView('setup');
              setConversation([]);
              setSessionId(null);
              if (wsRef.current) {
                wsRef.current.close();
              }
            }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-8 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all text-lg"
          >
            Start New Interview
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard">
      <StudentSidebar />

      <div className="main">
        <StudentHeader
          user={user}
          toggleDropdown={() => setDropdownOpen(!isDropdownOpen)}
          isDropdownOpen={isDropdownOpen}
          handleLogout={() => {
            logout();
            navigate('/login', { replace: true });
          }}
          navigate={navigate}
        />

        <div className="px-8 py-8 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 min-h-screen">
          {currentView === 'setup' && renderSetupView()}
          {currentView === 'interview' && renderInterviewView()}
          {currentView === 'results' && renderResultsView()}
        </div>

        <StudentFooter />
      </div>
    </div>
  );
};

export default RealtimeMockInterviewPage;
