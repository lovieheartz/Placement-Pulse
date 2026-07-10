import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhone, FiSettings } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import StudentSidebar from '../components/StudentSidebar';
import StudentHeader from '../components/StudentHeader';
import StudentFooter from '../components/StudentFooter';
import { WS_BASE } from '../config/api';
import './Dashboard.css';

/**
 * PROFESSIONAL MOCK INTERVIEW - Production Ready
 * Real-time WebSocket with Gemini 2.0 Flash Exp
 */
const ProfessionalMockInterview = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  // Views
  const [currentView, setCurrentView] = useState('setup');

  // Config
  const [config, setConfig] = useState({
    jobRole: '',
    industry: 'Information Technology',
    difficulty: 'medium',
    totalQuestions: 15
  });

  // WebSocket
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Interview state
  const [messages, setMessages] = useState([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('Ready');

  // Camera
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Audio
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Camera toggle
  const toggleCamera = async () => {
    if (cameraOn) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        streamRef.current = stream;
        setCameraOn(true);
      } catch (err) {
        console.error('Camera error:', err);
        alert('Camera not available');
      }
    }
  };

  // Microphone toggle
  const toggleMic = async () => {
    if (isMicActive) {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsMicActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true
          }
        });

        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = convertToPCM16(inputData);

          wsRef.current.send(JSON.stringify({
            type: 'audio_chunk',
            data: arrayBufferToBase64(pcm16.buffer)
          }));
        };

        source.connect(processor);
        processor.connect(audioContextRef.current.destination);
        setIsMicActive(true);
      } catch (err) {
        console.error('Microphone error:', err);
        alert('Microphone access denied');
      }
    }
  };

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
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const playAudio = async (base64Audio) => {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        setIsAISpeaking(false);
        isPlayingRef.current = false;
        if (audioQueueRef.current.length > 0) {
          playAudio(audioQueueRef.current.shift());
        }
      };

      setIsAISpeaking(true);
      isPlayingRef.current = true;
      source.start(0);
    } catch (err) {
      console.error('Audio playback error:', err);
      setIsAISpeaking(false);
      isPlayingRef.current = false;
    }
  };

  // Connect WebSocket
  const connectWebSocket = () => {
    const token = sessionStorage.getItem('authToken');
    const wsUrl = `${WS_BASE}/api/live-interview?token=${token}`;

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
            setCurrentStatus('Interview Active');
            await toggleCamera();
            await toggleMic();
            break;

          case 'audio_response':
            if (isPlayingRef.current) {
              audioQueueRef.current.push(message.data);
            } else {
              playAudio(message.data);
            }
            break;

          case 'text_response':
            setMessages(prev => [...prev, {
              role: 'ai',
              text: message.data,
              timestamp: Date.now()
            }]);
            break;

          case 'user_transcript':
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'user' && last.isLive) {
                return [...prev.slice(0, -1), { ...last, text: message.data }];
              }
              return [...prev, {
                role: 'user',
                text: message.data,
                isLive: true,
                timestamp: Date.now()
              }];
            });
            break;

          case 'interview_ended':
            setCurrentStatus('Interview Complete');
            setCurrentView('results');
            break;

          case 'error':
            console.error('Server error:', message.data.message);
            alert(`Error: ${message.data.message}`);
            break;
        }
      } catch (err) {
        console.error('Message handling error:', err);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setCurrentStatus('Connection Error');
    };

    websocket.onclose = () => {
      console.log('WebSocket closed');
      setIsConnected(false);
      setCurrentStatus('Disconnected');
    };

    const pingInterval = setInterval(() => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    websocket.pingInterval = pingInterval;

    return websocket;
  };

  // Start interview
  const startInterview = async () => {
    if (!config.jobRole.trim()) {
      alert('Please enter a job role');
      return;
    }

    const websocket = connectWebSocket();

    websocket.addEventListener('open', () => {
      setTimeout(() => {
        websocket.send(JSON.stringify({
          type: 'start_interview',
          data: {
            ...config,
            experienceLevel: 'intermediate'
          }
        }));
      }, 500);
    });
  };

  // End interview
  const endInterview = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_interview' }));
      toggleMic();
      toggleCamera();
    }
  };

  // Render Setup
  const renderSetup = () => (
    <div className="flex items-center justify-center min-h-[600px]">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mb-6">
            <FiMic className="text-white text-4xl" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">AI Mock Interview</h1>
          <p className="text-gray-600 text-lg">Real-time voice conversation with AI</p>
        </div>

        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Job Role *</label>
            <input
              type="text"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
              placeholder="e.g., Software Engineer"
              value={config.jobRole}
              onChange={(e) => setConfig({ ...config, jobRole: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Industry</label>
              <select
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                value={config.industry}
                onChange={(e) => setConfig({ ...config, industry: e.target.value })}
              >
                <option>Information Technology</option>
                <option>Software Development</option>
                <option>Data Science & AI</option>
                <option>Finance & Banking</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
              <select
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                value={config.difficulty}
                onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={startInterview}
          disabled={!config.jobRole.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          Start Interview
        </button>
      </div>
    </div>
  );

  // Render Interview
  const renderInterview = () => (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-gray-50 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <FiMic className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{config.jobRole} Interview</h2>
            <p className="text-sm text-gray-500">{currentStatus}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={toggleMic}
            className={`p-3 rounded-full ${isMicActive ? 'bg-green-500' : 'bg-gray-300'} hover:scale-110 transition-all`}
          >
            {isMicActive ? <FiMic className="text-white" /> : <FiMicOff className="text-gray-600" />}
          </button>

          <button
            onClick={toggleCamera}
            className={`p-3 rounded-full ${cameraOn ? 'bg-green-500' : 'bg-gray-300'} hover:scale-110 transition-all`}
          >
            {cameraOn ? <FiVideo className="text-white" /> : <FiVideoOff className="text-gray-600" />}
          </button>

          <button
            onClick={endInterview}
            className="px-6 py-2 bg-red-500 text-white font-semibold rounded-full hover:bg-red-600 transition-all"
          >
            End
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                  msg.role === 'ai'
                    ? 'bg-purple-100 text-purple-900'
                    : 'bg-blue-100 text-blue-900'
                }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-bold">
                      {msg.role === 'ai' ? '🤖 Alex' : '👤 You'}
                    </span>
                    {msg.isLive && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">LIVE</span>}
                  </div>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Status Bar */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
                isMicActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
              }`}>
                <FiMic className={isMicActive ? 'animate-pulse' : ''} />
                <span className="text-sm font-semibold">
                  {isMicActive ? 'Listening' : 'Mic Off'}
                </span>
              </div>

              <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
                isAISpeaking ? 'bg-purple-100 text-purple-800' : 'bg-gray-200 text-gray-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isAISpeaking ? 'bg-purple-600 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-semibold">
                  {isAISpeaking ? 'AI Speaking' : 'AI Ready'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Panel */}
        <div className="w-80 bg-gray-900 flex flex-col">
          {/* AI Avatar */}
          <div className="flex-1 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-6">
            <div className="text-center">
              <img
                src="https://api.dicebear.com/7.x/adventurer/svg?seed=Alex&backgroundColor=b6e3f4"
                alt="AI"
                className={`w-32 h-32 rounded-full border-4 border-white/40 shadow-2xl mx-auto mb-4 ${
                  isAISpeaking ? 'scale-110 animate-pulse' : ''
                }`}
              />
              <h3 className="text-white text-xl font-bold">Alex</h3>
              <p className="text-purple-200 text-sm">AI Interviewer</p>
            </div>
          </div>

          {/* User Camera */}
          <div className="h-48 bg-gray-800">
            {cameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FiVideoOff className="text-gray-600 text-4xl" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Results
  const renderResults = () => (
    <div className="flex items-center justify-center min-h-[600px]">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-12 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-4">Interview Complete!</h2>
        <p className="text-xl text-gray-600 mb-8">Your results are being prepared...</p>

        <button
          onClick={() => {
            setCurrentView('setup');
            setMessages([]);
            setSessionId(null);
            if (wsRef.current) wsRef.current.close();
          }}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-8 rounded-xl hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          Start New Interview
        </button>
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

        <div className="px-6 py-6 min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
          {currentView === 'setup' && renderSetup()}
          {currentView === 'interview' && renderInterview()}
          {currentView === 'results' && renderResults()}
        </div>

        <StudentFooter />
      </div>
    </div>
  );
};

export default ProfessionalMockInterview;
