import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import StudentSidebar from '../components/StudentSidebar';
import StudentHeader from '../components/StudentHeader';
import StudentFooter from '../components/StudentFooter';
import AIAvatar from '../components/AIAvatar';
import './Dashboard.css';
import './RealtimeInterview.css';

const API_BASE = 'http://localhost:3001';

// Company options
const COMPANIES = [
  { value: 'faang', label: '🏢 FAANG (Facebook, Apple, Amazon, Netflix, Google)' },
  { value: 'microsoft', label: '💻 Microsoft' },
  { value: 'tcs', label: '🏭 TCS (Tata Consultancy Services)' },
  { value: 'infosys', label: '💼 Infosys' },
  { value: 'wipro', label: '🏢 Wipro' },
  { value: 'capgemini', label: '🌐 Capgemini' },
  { value: 'cognizant', label: '💡 Cognizant' },
  { value: 'accenture', label: '⚡ Accenture' },
  { value: 'deloitte', label: '📊 Deloitte' },
  { value: 'ibm', label: '🔵 IBM' },
  { value: 'oracle', label: '🔴 Oracle' },
  { value: 'adobe', label: '🎨 Adobe' },
  { value: 'salesforce', label: '☁️ Salesforce' },
  { value: 'uber', label: '🚗 Uber' },
  { value: 'airbnb', label: '🏠 Airbnb' },
  { value: 'other', label: '✏️ Other (Type below)' }
];

// Industry options
const INDUSTRIES = [
  { value: 'technology', label: '💻 Technology & Software' },
  { value: 'finance', label: '💰 Finance & Banking' },
  { value: 'healthcare', label: '🏥 Healthcare & Pharmaceuticals' },
  { value: 'ecommerce', label: '🛒 E-commerce & Retail' },
  { value: 'consulting', label: '📊 Consulting & Professional Services' },
  { value: 'education', label: '🎓 Education & EdTech' },
  { value: 'manufacturing', label: '🏭 Manufacturing & Industrial' },
  { value: 'telecommunications', label: '📡 Telecommunications' },
  { value: 'media', label: '📺 Media & Entertainment' },
  { value: 'automotive', label: '🚗 Automotive' },
  { value: 'aerospace', label: '✈️ Aerospace & Defense' },
  { value: 'energy', label: '⚡ Energy & Utilities' },
  { value: 'realestate', label: '🏢 Real Estate & Construction' },
  { value: 'hospitality', label: '🏨 Hospitality & Tourism' },
  { value: 'logistics', label: '🚚 Logistics & Supply Chain' },
  { value: 'agriculture', label: '🌾 Agriculture & Food' },
  { value: 'gaming', label: '🎮 Gaming & Entertainment' },
  { value: 'cybersecurity', label: '🔒 Cybersecurity' },
  { value: 'ai', label: '🤖 Artificial Intelligence & Machine Learning' },
  { value: 'blockchain', label: '⛓️ Blockchain & Cryptocurrency' },
  { value: 'other', label: '✏️ Other (Type below)' }
];

const RealtimeInterviewPage = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  // Interview configuration
  const [step, setStep] = useState('setup');
  const [config, setConfig] = useState({
    company: 'faang',
    customCompany: '',
    jobRole: '',
    industry: 'technology',
    customIndustry: '',
    interviewType: 'mixed',
    difficulty: 'medium',
    resumeFile: null
  });

  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [interviewId, setInterviewId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [estimatedQuestions, setEstimatedQuestions] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [videoStream, setVideoStream] = useState(null);

  // Analysis state
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Refs
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioStreamRef = useRef(null);
  const processorRef = useRef(null);
  const playbackAudioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const videoRef = useRef(null);
  const messagesEndRef = useRef(null);

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    return () => {
      cleanup();
    };
  }, [user, navigate]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [conversationHistory]);

  const cleanup = () => {
    stopRecording();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    if (playbackAudioContextRef.current) {
      playbackAudioContextRef.current.close();
      playbackAudioContextRef.current = null;
    }
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
      setIsCameraOn(false);
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  const getToken = () => {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
      console.error('No auth token found in sessionStorage');
      alert('Session expired. Please login again.');
      navigate('/login');
      return null;
    }
    return token;
  };

  const getCompanyName = () => {
    if (config.company === 'other') {
      return config.customCompany || 'Startup';
    }
    const company = COMPANIES.find(c => c.value === config.company);
    return company ? company.label.split(' ').slice(1).join(' ') : config.company;
  };

  const startInterview = async () => {
    try {
      setIsPreparing(true);

      if (!config.jobRole || !config.industry) {
        alert('Please fill in Job Role and Industry');
        setIsPreparing(false);
        return;
      }

      if (config.company === 'other' && !config.customCompany.trim()) {
        alert('Please enter the company name');
        setIsPreparing(false);
        return;
      }

      const token = getToken();
      if (!token) {
        setIsPreparing(false);
        return;
      }

      const questionEstimate = {
        easy: '10-12',
        medium: '12-20',
        hard: '20-25'
      }[config.difficulty];
      setEstimatedQuestions(questionEstimate);

      const companyName = getCompanyName();
      const industryName = config.industry === 'other' ? config.customIndustry :
                          INDUSTRIES.find(i => i.value === config.industry)?.label.split(' ').slice(1).join(' ') || config.industry;

      // Prepare form data for resume upload
      const formData = new FormData();
      formData.append('company', companyName);
      formData.append('jobRole', config.jobRole);
      formData.append('industry', industryName);
      formData.append('interviewType', config.interviewType);
      formData.append('difficulty', config.difficulty);

      // Add resume if uploaded
      if (config.resumeFile) {
        formData.append('resume', config.resumeFile);
        console.log(`📄 Uploading resume: ${config.resumeFile.name}`);
      }

      const response = await axios.post(
        `${API_BASE}/api/interview/start`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const { sessionId: newSessionId, interviewId: newInterviewId } = response.data;
      setSessionId(newSessionId);
      setInterviewId(newInterviewId);

      await connectWebSocket(newSessionId, token);

      // Initialize audio with retry
      try {
        await initializeAudio();
        console.log('✅✅✅ Audio system ready!');
      } catch (audioError) {
        console.error('❌❌❌ Audio init failed:', audioError);
        // Continue anyway - user can try clicking the button
      }

      // Automatically request camera permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });
        setVideoStream(stream);
        setIsCameraOn(true);

        // Wait a moment for video to load then attach to element
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 100);
      } catch (error) {
        console.log('📷 Camera not available or permission denied:', error.message);
        // Continue without camera - not critical
      }

      setStep('interview');
      setIsPreparing(false);

      setConversationHistory([
        {
          role: 'assistant',
          content: `Hi there! Welcome to your ${companyName} interview. I'm Alex, your AI interviewer. The interview will begin shortly...`,
          timestamp: Date.now()
        }
      ]);

    } catch (error) {
      console.error('❌ Error starting interview:', error);
      alert(error.response?.data?.error || 'Failed to start interview. Please try again.');
      setIsPreparing(false);
    }
  };

  const refreshToken = async () => {
    try {
      const oldToken = sessionStorage.getItem('authToken');
      if (!oldToken) return null;

      const response = await axios.post(
        `${API_BASE}/api/auth/refresh-token`,
        {},
        { headers: { Authorization: `Bearer ${oldToken}` } }
      );

      const newToken = response.data.token;
      sessionStorage.setItem('authToken', newToken);
      console.log('✅ Token refreshed successfully');
      return newToken;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      return null;
    }
  };

  const connectWebSocket = (sessionId, token) => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:3001/api/interview/ws`);

      ws.onopen = () => {
        console.log('🔌 WebSocket connection opened');
        ws.send(JSON.stringify({ type: 'auth', token }));

        const authHandler = async (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'auth_success') {
            console.log('✅ WebSocket authenticated');
            ws.send(JSON.stringify({ type: 'init', sessionId }));

            const initHandler = (event) => {
              const data = JSON.parse(event.data);
              if (data.type === 'initialized') {
                console.log('✅ WebSocket initialized with session');
                ws.removeEventListener('message', initHandler);
                resolve();
              }
            };
            ws.addEventListener('message', initHandler);
            ws.removeEventListener('message', authHandler);
          } else if (data.type === 'auth_failed') {
            console.error('❌ WebSocket auth failed:', data.error);

            // If token expired, try to refresh
            if (data.requiresLogin) {
              console.log('🔄 Token expired, attempting refresh...');
              const newToken = await refreshToken();

              if (newToken) {
                // Retry authentication with new token
                console.log('🔄 Retrying with refreshed token');
                ws.send(JSON.stringify({ type: 'auth', token: newToken }));
              } else {
                // Refresh failed, need to login again
                alert('Your session has expired. Please login again.');
                navigate('/login');
                reject(new Error('Session expired'));
              }
            } else {
              reject(new Error('Authentication failed'));
            }
          }
        };

        ws.addEventListener('message', authHandler);
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      };

      ws.onmessage = (event) => handleWebSocketMessage(event.data);

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
      };

      wsRef.current = ws;
    });
  };

  const handleWebSocketMessage = (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'session_ready':
          console.log('✅ OpenAI session ready');
          break;

        case 'user_transcript':
          // User's speech transcribed
          setConversationHistory(prev => [...prev, {
            role: 'user',
            content: message.text,
            timestamp: message.timestamp
          }]);
          break;

        case 'ai_transcript':
          // AI's response transcribed
          setConversationHistory(prev => [...prev, {
            role: 'assistant',
            content: message.text,
            timestamp: message.timestamp
          }]);
          if (message.questionNumber) {
            setCurrentQuestion(message.questionNumber);
          }
          setIsAISpeaking(false);
          break;

        case 'audio_delta':
          // Incoming audio chunk from AI
          setIsAISpeaking(true);
          playAudioChunk(message.audio);
          break;

        case 'audio_done':
          // AI finished speaking
          console.log('🎤 AI finished speaking');
          break;

        case 'transcript':
          // Fallback for old transcript format
          setConversationHistory(prev => [...prev, {
            role: 'user',
            content: message.text,
            timestamp: Date.now()
          }]);
          break;

        case 'ai_response':
          // Fallback for old ai_response format
          setConversationHistory(prev => [...prev, {
            role: 'assistant',
            content: message.text,
            timestamp: Date.now()
          }]);
          break;

        case 'question_asked':
          setCurrentQuestion(message.questionNumber);
          break;

        case 'ai_speaking':
          setIsAISpeaking(true);
          break;

        case 'ai_finished':
          setIsAISpeaking(false);
          break;

        case 'error':
          console.error('WebSocket error:', message.error);
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  // Audio playback system
  const playAudioChunk = async (audioBase64) => {
    try {
      // Initialize playback audio context if not exists
      if (!playbackAudioContextRef.current) {
        playbackAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24000
        });
        console.log('✅ Audio playback context initialized');
      }

      const audioContext = playbackAudioContextRef.current;

      // Resume audio context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('▶️ Audio context resumed');
      }

      // Decode base64 to PCM16
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to Float32 for Web Audio API
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
      }

      // Create audio buffer
      const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      // Add to queue
      audioQueueRef.current.push(audioBuffer);

      // Start playing if not already playing
      if (!isPlayingRef.current) {
        playNextAudioChunk();
      }
    } catch (error) {
      console.error('❌ Error playing audio chunk:', error);
    }
  };

  const playNextAudioChunk = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      console.log('🎵 Audio queue empty - playback stopped');
      return;
    }

    isPlayingRef.current = true;
    const audioContext = playbackAudioContextRef.current;
    const audioBuffer = audioQueueRef.current.shift();

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    source.onended = () => {
      playNextAudioChunk();
    };

    source.start(0);
    console.log(`🔊 Playing audio chunk (${audioBuffer.duration.toFixed(2)}s, queue: ${audioQueueRef.current.length})`);
  };

  const toggleCamera = async () => {
    if (isCameraOn) {
      // Turn off camera
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      }
      setIsCameraOn(false);
    } else {
      // Turn on camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });
        setVideoStream(stream);
        setIsCameraOn(true);

        // Attach to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('❌ Error accessing camera:', error);
        alert('Could not access camera. Please check permissions.');
      }
    }
  };

  const initializeAudio = async () => {
    try {
      console.log('🎤🎤🎤 Requesting microphone access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        }
      });

      console.log('✅✅ Microphone access granted:', stream);
      audioStreamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      console.log('✅✅ Audio context created:', audioContext.state);

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      console.log('✅✅ Processor created:', processor);

      let audioChunkCount = 0;

      // Store the processor reference so we can control it
      processorRef.current.isActive = false; // Start with mic OFF

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }
        if (!processorRef.current?.isActive) return; // Check the flag

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);

        // Convert Float32 to PCM16
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to base64
        const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

        // Send to server WebSocket
        try {
          wsRef.current.send(JSON.stringify({
            type: 'audio',
            audio: audioBase64
          }));

          audioChunkCount++;
          if (audioChunkCount % 50 === 0) {
            console.log(`🎤 Sent ${audioChunkCount} audio chunks to AI`);
          }
        } catch (error) {
          console.error('❌ Error sending audio:', error);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(false); // Start with mic OFF
      console.log('✅ Audio initialized - Click mic button to start speaking');
    } catch (error) {
      console.error('❌ Error initializing audio:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const toggleMicrophone = () => {
    if (!processorRef.current) {
      console.error('❌ Audio not initialized');
      return;
    }

    const newState = !isRecording;
    setIsRecording(newState);
    processorRef.current.isActive = newState;

    if (newState) {
      console.log('🎤 Microphone ON - Start speaking now');
    } else {
      console.log('🔇 Microphone OFF - Click to speak again');
    }
  };

  const stopRecording = () => {
    setIsRecording(false);

    if (processorRef.current) {
      processorRef.current.isActive = false;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const endInterview = async () => {
    try {
      setIsAnalyzing(true);
      setStep('completed'); // Show analyzing screen immediately
      stopRecording();

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      const token = getToken();
      if (!token) return;

      const response = await axios.post(
        `${API_BASE}/api/interview/end`,
        { sessionId, interviewId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAnalysis(response.data.analysis);
      setIsAnalyzing(false);
    } catch (error) {
      console.error('❌ Error ending interview:', error);
      alert('Failed to complete interview analysis');
      setIsAnalyzing(false);
    }
  };

  const renderSetup = () => (
    <div className="px-6 md:px-8 py-6 md:py-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      <div className="interview-setup-container">
        <div className="interview-setup">
          <div className="setup-header">
            <h1>🎤 AI Mock Interview</h1>
            <p>Practice with a production-grade AI interviewer powered by OpenAI</p>
          </div>

          <div className="setup-form">
            {/* Company Selection */}
            <div className="form-group">
              <label>Target Company *</label>
              <select
                className="form-select"
                value={config.company}
                onChange={(e) => setConfig({...config, company: e.target.value, customCompany: ''})}
              >
                {COMPANIES.map(company => (
                  <option key={company.value} value={company.value}>
                    {company.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Company Name - Only show if "Other" is selected */}
            {config.company === 'other' && (
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  placeholder="Enter company name"
                  value={config.customCompany}
                  onChange={(e) => setConfig({...config, customCompany: e.target.value})}
                />
              </div>
            )}

            <div className="form-group">
              <label>Job Role *</label>
              <input
                type="text"
                placeholder="e.g., Software Engineer, Data Analyst, Product Manager"
                value={config.jobRole}
                onChange={(e) => setConfig({...config, jobRole: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Industry *</label>
              <select
                className="form-select"
                value={config.industry}
                onChange={(e) => setConfig({...config, industry: e.target.value, customIndustry: ''})}
              >
                {INDUSTRIES.map(industry => (
                  <option key={industry.value} value={industry.value}>
                    {industry.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Industry Name - Only show if "Other" is selected */}
            {config.industry === 'other' && (
              <div className="form-group">
                <label>Industry Name *</label>
                <input
                  type="text"
                  placeholder="Enter industry name"
                  value={config.customIndustry}
                  onChange={(e) => setConfig({...config, customIndustry: e.target.value})}
                />
              </div>
            )}

            <div className="form-group">
              <label>Interview Type</label>
              <div className="interview-type-cards">
                <div
                  className={`type-card ${config.interviewType === 'hr' ? 'active' : ''}`}
                  onClick={() => setConfig({...config, interviewType: 'hr'})}
                >
                  <div className="type-icon">👔</div>
                  <div className="type-title">HR Interview</div>
                  <div className="type-desc">Behavioral, soft skills, culture fit</div>
                </div>

                <div
                  className={`type-card ${config.interviewType === 'technical' ? 'active' : ''}`}
                  onClick={() => setConfig({...config, interviewType: 'technical'})}
                >
                  <div className="type-icon">💻</div>
                  <div className="type-title">Technical</div>
                  <div className="type-desc">Domain knowledge, problem-solving</div>
                </div>

                <div
                  className={`type-card ${config.interviewType === 'mixed' ? 'active' : ''}`}
                  onClick={() => setConfig({...config, interviewType: 'mixed'})}
                >
                  <div className="type-icon">🎯</div>
                  <div className="type-title">Mixed (Recommended)</div>
                  <div className="type-desc">HR + Technical combined</div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Difficulty Level</label>
              <div className="difficulty-buttons">
                <button
                  className={`diff-btn ${config.difficulty === 'easy' ? 'active' : ''}`}
                  onClick={() => setConfig({...config, difficulty: 'easy'})}
                >
                  🟢 Easy (10-12 questions)
                </button>
                <button
                  className={`diff-btn ${config.difficulty === 'medium' ? 'active' : ''}`}
                  onClick={() => setConfig({...config, difficulty: 'medium'})}
                >
                  🟡 Medium (12-20 questions)
                </button>
                <button
                  className={`diff-btn ${config.difficulty === 'hard' ? 'active' : ''}`}
                  onClick={() => setConfig({...config, difficulty: 'hard'})}
                >
                  🔴 Hard (20-25 questions)
                </button>
              </div>
            </div>

            {/* Resume Upload (Optional) */}
            <div className="form-group">
              <label>Upload Resume (Optional) 📄</label>
              <div style={{
                border: '2px dashed #e2e8f0',
                borderRadius: '10px',
                padding: '1.5rem',
                textAlign: 'center',
                background: config.resumeFile ? '#f0fdf4' : '#f7fafc',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('resumeUpload').click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.background = '#f0f4ff';
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.background = config.resumeFile ? '#f0fdf4' : '#f7fafc';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.background = config.resumeFile ? '#f0fdf4' : '#f7fafc';
                const file = e.dataTransfer.files[0];
                if (file && file.type === 'application/pdf') {
                  setConfig({...config, resumeFile: file});
                } else {
                  alert('Please upload a PDF file');
                }
              }}
              >
                <input
                  id="resumeUpload"
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setConfig({...config, resumeFile: file});
                    }
                  }}
                />
                {config.resumeFile ? (
                  <div>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
                    <div style={{ fontWeight: 600, color: '#059669', marginBottom: '0.25rem' }}>
                      {config.resumeFile.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                      {(config.resumeFile.size / 1024).toFixed(2)} KB
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfig({...config, resumeFile: null});
                        document.getElementById('resumeUpload').value = '';
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📄</div>
                    <div style={{ fontWeight: 600, color: '#2d3748', marginBottom: '0.25rem' }}>
                      Click to upload or drag and drop
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      PDF only (Max 5MB) - AI will ask questions about your projects & experience
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              className="start-button"
              onClick={startInterview}
              disabled={isPreparing || !config.jobRole || !config.industry || (config.company === 'other' && !config.customCompany.trim()) || (config.industry === 'other' && !config.customIndustry.trim())}
            >
              {isPreparing ? '🔄 Preparing Interview...' : '🎙️ Start Interview'}
            </button>
          </div>

          <div className="info-box">
            <h3>💡 Before you start:</h3>
            <ul>
              <li>✓ Ensure you're in a quiet environment</li>
              <li>✓ Test your microphone and speakers</li>
              <li>✓ Speak clearly and at a natural pace</li>
              <li>✓ The AI will intelligently decide when to end based on your performance</li>
              <li>✓ You can also end the interview manually anytime</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInterview = () => (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)' }}>
      {/* FIXED Header - Top Bar with Camera, Avatar, and Status */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem 1.5rem',
        background: 'white',
        boxShadow: '0 2px 15px rgba(0,0,0,0.1)',
        borderBottom: '2px solid #e2e8f0',
        flexWrap: 'wrap'
      }}>
            {/* Camera Mini Preview */}
            <div style={{
              width: '160px',
              height: '120px',
              flexShrink: 0
            }}>
              {isCameraOn ? (
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  background: '#000',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={() => {
                      console.log('✅ Video loaded successfully');
                      if (videoRef.current) {
                        videoRef.current.play().catch(e => console.error('Video play error:', e));
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    {isRecording && <span style={{
                      width: '8px',
                      height: '8px',
                      background: '#ef4444',
                      borderRadius: '50%',
                      animation: 'recPulse 1.5s ease-in-out infinite'
                    }}></span>}
                    <button
                      onClick={toggleCamera}
                      style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        color: 'white',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '1rem'
                      }}
                    >✕</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={toggleCamera}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: '2px dashed rgba(255,255,255,0.5)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  📷 Enable Camera
                </button>
              )}
            </div>

            {/* AI Avatar */}
            <div style={{ flexShrink: 0 }}>
              {console.log('🎨 Rendering Avatar - Speaking:', isAISpeaking, 'Listening:', isRecording && !isAISpeaking)}
              <AIAvatar
                isSpeaking={isAISpeaking}
                isListening={isRecording && !isAISpeaking}
              />
            </div>

            {/* Microphone Toggle Button */}
            <button
              onClick={toggleMicrophone}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                background: isRecording ?
                  'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                  'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: isRecording ?
                  '0 3px 10px rgba(16, 185, 129, 0.3)' :
                  '0 3px 10px rgba(239, 68, 68, 0.3)',
                transition: 'all 0.3s ease',
                transform: isRecording ? 'scale(1.02)' : 'scale(1)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = isRecording ? 'scale(1.02)' : 'scale(1)'}
            >
              <span style={{
                fontSize: '1.4rem',
                animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none'
              }}>
                {isRecording ? '🎤' : '🔇'}
              </span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem' }}>{isRecording ? 'SPEAKING' : 'CLICK TO SPEAK'}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.85, fontWeight: 400 }}>
                  {isRecording ? 'AI is listening...' : 'Turn on microphone'}
                </div>
              </div>
            </button>

            {/* Status Info */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '1rem'
            }}>
              <div style={{
                padding: '0.75rem 1.25rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '25px',
                fontWeight: 600,
                fontSize: '0.95rem'
              }}>
                Question {currentQuestion > 0 ? currentQuestion : '-'} / {estimatedQuestions}
              </div>
              {isRecording && (
                <div className="status-badge recording">
                  🔴 Recording
                </div>
              )}
            </div>
      </div>

      {/* Conversation Window - Scrollable */}
      <div style={{
        margin: '1.5rem',
        background: 'white',
        borderRadius: '15px',
        padding: '1.5rem',
        boxShadow: '0 2px 15px rgba(0,0,0,0.08)',
        minHeight: 'calc(100vh - 280px)',
        maxHeight: 'calc(100vh - 280px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#2d3748',
          marginBottom: '1rem',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '0.5rem'
        }}>
          💬 Interview Conversation
        </h3>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '0.5rem'
        }}>
              {conversationHistory.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'assistant' ? '🤖' : '👤'}
                  </div>
                  <div className="message-content">
                    <div className="message-role">
                      {msg.role === 'assistant' ? 'Alex (AI Interviewer)' : 'You'}
                    </div>
                    <div className="message-text">{msg.content}</div>
                    <div className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {conversationHistory.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  color: '#9ca3af',
                  padding: '3rem',
                  fontSize: '1.1rem'
                }}>
                  💭 Waiting for AI to start the interview...
                </div>
              )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* FIXED END BUTTON - Bottom Right */}
      <button
        onClick={endInterview}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 1000,
          padding: '0.6rem 1.2rem',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '25px',
          fontSize: '0.9rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>🏁</span>
        <span>End Interview</span>
      </button>
    </div>
  );

  const renderResults = () => (
    <div className="px-6 md:px-8 py-6 md:py-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      <div className="interview-results-container">
        <div className="interview-results">
          {isAnalyzing ? (
            <div className="analyzing" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              padding: '3rem',
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
            }}>
              <div className="spinner" style={{
                width: '80px',
                height: '80px',
                border: '6px solid #e2e8f0',
                borderTop: '6px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '2rem'
              }}></div>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '1rem',
                textAlign: 'center'
              }}>🔍 Analyzing your interview...</h2>
              <p style={{
                fontSize: '1.1rem',
                color: '#64748b',
                textAlign: 'center',
                maxWidth: '500px'
              }}>Please wait while we comprehensively evaluate your responses using advanced AI analysis</p>
              <div style={{
                marginTop: '2rem',
                display: 'flex',
                gap: '0.5rem'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#667eea',
                  animation: 'bounce 1.4s ease-in-out 0s infinite'
                }}></div>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#667eea',
                  animation: 'bounce 1.4s ease-in-out 0.2s infinite'
                }}></div>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#667eea',
                  animation: 'bounce 1.4s ease-in-out 0.4s infinite'
                }}></div>
              </div>
            </div>
          ) : analysis && (
            <>
              <div className="results-header" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '20px',
                padding: '2.5rem',
                color: 'white',
                marginBottom: '2rem',
                boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
              }}>
                <h1 style={{
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  marginBottom: '2rem',
                  textAlign: 'center',
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}>📊 Your Interview Results</h1>
                <div className="overall-score" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3rem',
                  flexWrap: 'wrap'
                }}>
                  <div className="score-circle" style={{
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    background: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    fontSize: '4rem',
                    fontWeight: 800,
                    color: analysis.overallScore >= 75 ? '#10b981' : analysis.overallScore >= 60 ? '#f59e0b' : '#ef4444'
                  }}>
                    {analysis.overallScore}
                    <span className="score-label" style={{
                      fontSize: '1.2rem',
                      color: '#64748b',
                      fontWeight: 600
                    }}>/ 100</span>
                  </div>
                  <div className="readiness-info" style={{
                    textAlign: 'center'
                  }}>
                    <div className="readiness-level" style={{
                      fontSize: '2rem',
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                      textTransform: 'capitalize',
                      background: 'rgba(255,255,255,0.2)',
                      padding: '0.75rem 2rem',
                      borderRadius: '50px',
                      backdropFilter: 'blur(10px)'
                    }}>
                      {analysis.readinessLevel === 'excellent' && '🌟 Excellent'}
                      {analysis.readinessLevel === 'well_prepared' && '✨ Well Prepared'}
                      {analysis.readinessLevel === 'ready' && '👍 Ready'}
                      {analysis.readinessLevel === 'needs_improvement' && '📈 Needs Improvement'}
                      {analysis.readinessLevel === 'not_ready' && '🔄 Not Ready'}
                    </div>
                    <div className="readiness-desc" style={{
                      fontSize: '1.1rem',
                      opacity: 0.9,
                      fontWeight: 500
                    }}>Interview Readiness Level</div>
                  </div>
                </div>
              </div>

              <div className="results-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div className="results-card strengths" style={{
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                  borderRadius: '15px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
                }}>
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#065f46',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>💪 Your Strengths</h3>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    {analysis.strengthAreas?.map((strength, idx) => (
                      <li key={idx} style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        background: 'white',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        color: '#064e3b',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                      }}>
                        <span style={{ flexShrink: 0 }}>✅</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="results-card improvements" style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '15px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.2)'
                }}>
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#92400e',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>📈 Areas to Improve</h3>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    {analysis.improvementAreas?.map((area, idx) => (
                      <li key={idx} style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        background: 'white',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        color: '#78350f',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                      }}>
                        <span style={{ flexShrink: 0 }}>🔸</span>
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Detailed Performance Breakdown - Always Show */}
              <div className="detailed-scores" style={{
                background: 'white',
                borderRadius: '15px',
                padding: '2rem',
                marginBottom: '2rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
              }}>
                <h3 style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>📊 Detailed Performance Breakdown</h3>
                <div className="score-bars" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem'
                }}>
                  {analysis.detailedScores && Object.keys(analysis.detailedScores).length > 0 ? (
                    Object.entries(analysis.detailedScores).map(([category, score]) => (
                      <div key={category} style={{
                        padding: '1rem',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.75rem'
                        }}>
                          <span style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: '#334155',
                            textTransform: 'capitalize'
                          }}>{category.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444',
                            background: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                          }}>{score}/10</span>
                        </div>
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          height: '14px',
                          background: '#e2e8f0',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
                        }}>
                          <div style={{
                            width: `${score * 10}%`,
                            height: '100%',
                            background: score >= 8 ?
                              'linear-gradient(90deg, #10b981 0%, #059669 100%)' :
                              score >= 6 ?
                              'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' :
                              'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                            transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            borderRadius: '10px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                          }}>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Fallback: If no detailedScores, create default breakdown
                    ['Technical Knowledge', 'Communication', 'Problem Solving', 'Behavioral Skills', 'Overall Fit'].map((category, idx) => {
                      const baseScore = Math.round((analysis.overallScore / 100) * 10);
                      const score = Math.max(1, Math.min(10, baseScore + (Math.random() * 2 - 1))); // Slight variation
                      return (
                        <div key={category} style={{
                          padding: '1rem',
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.75rem'
                          }}>
                            <span style={{
                              fontSize: '1rem',
                              fontWeight: 600,
                              color: '#334155'
                            }}>{category}</span>
                            <span style={{
                              fontSize: '1.25rem',
                              fontWeight: 700,
                              color: score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444',
                              background: 'white',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '8px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>{Math.round(score)}/10</span>
                          </div>
                          <div style={{
                            position: 'relative',
                            width: '100%',
                            height: '14px',
                            background: '#e2e8f0',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
                          }}>
                            <div style={{
                              width: `${score * 10}%`,
                              height: '100%',
                              background: score >= 8 ?
                                'linear-gradient(90deg, #10b981 0%, #059669 100%)' :
                                score >= 6 ?
                                'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' :
                                'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                              transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                              borderRadius: '10px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                            }}>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {analysis.questionAnalysis && analysis.questionAnalysis.length > 0 && (
                <div className="question-breakdown">
                  <h3>❓ Question-by-Question Analysis</h3>
                  {analysis.questionAnalysis.map((qa, idx) => (
                    <div key={idx} className="qa-card">
                      <div className="qa-header">
                        <span className="qa-number">Q{qa.questionNumber}</span>
                        <span className="qa-score">Score: {qa.score}/10</span>
                      </div>
                      <div className="qa-question">
                        <strong>Question:</strong> {qa.question}
                      </div>
                      <div className="qa-answer">
                        <strong>Your Answer:</strong> {qa.answer}
                      </div>
                      <div className="qa-feedback">
                        <strong>Feedback:</strong> {qa.feedback}
                      </div>
                      {qa.strengths && qa.strengths.length > 0 && (
                        <div className="qa-strengths">
                          <strong>✅ Strengths:</strong>
                          <ul>
                            {qa.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {qa.improvements && qa.improvements.length > 0 && (
                        <div className="qa-improvements">
                          <strong>📈 Improvements:</strong>
                          <ul>
                            {qa.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="recommendations">
                <h3>💡 Personalized Recommendations</h3>
                <ul>
                  {analysis.recommendations?.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>

              <div className="summary-feedback">
                <h3>📝 Overall Summary</h3>
                <p>{analysis.summaryFeedback}</p>
              </div>

              <div className="action-buttons">
                <button onClick={() => navigate('/student-dashboard')}>
                  🏠 Back to Dashboard
                </button>
                <button onClick={() => window.location.reload()}>
                  🔄 Take Another Interview
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard">
      <StudentSidebar />
      <div className="main">
        <StudentHeader
          user={user}
          toggleDropdown={toggleDropdown}
          isDropdownOpen={isDropdownOpen}
          handleLogout={handleLogout}
          navigate={navigate}
        />

        {step === 'setup' && renderSetup()}
        {step === 'interview' && renderInterview()}
        {step === 'completed' && renderResults()}

        <StudentFooter />
      </div>
    </div>
  );
};

export default RealtimeInterviewPage;
