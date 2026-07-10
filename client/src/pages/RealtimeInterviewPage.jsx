import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import PortalLayout from '@/components/app/PortalLayout';
import AIAvatar from '../components/AIAvatar';
import { GlassPanel } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { API_BASE, WS_BASE } from '../config/api';
import {
  Building2,
  Briefcase,
  Factory,
  Upload,
  CheckCircle2,
  X as XIcon,
  Mic,
  MicOff,
  Camera,
  Flag,
  MessageSquare,
  MessageSquareQuote,
  BarChart3,
  Home,
  RotateCcw,
  Users,
  Code2,
  Target,
  Sparkles,
  Info,
  Loader2,
} from 'lucide-react';
import './Dashboard.css';
import './RealtimeInterview.css';


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

// Decorative chevron for native <select> fields
const ChevronDownIcon = () => (
  <svg
    className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const RealtimeInterviewPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const token = sessionStorage.getItem('authToken');

  // Fetch profile with avatar
  const { data: profileData } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/student/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });

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
      const ws = new WebSocket(`${WS_BASE}/api/interview/ws`);

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

  const selectCls =
    'w-full appearance-none rounded-xl border border-input bg-background/70 px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';
  const inputCls =
    'w-full rounded-xl border border-input bg-background/70 px-4 py-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';
  const labelCls = 'mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground';

  const startDisabled =
    isPreparing ||
    !config.jobRole ||
    !config.industry ||
    (config.company === 'other' && !config.customCompany.trim()) ||
    (config.industry === 'other' && !config.customIndustry.trim());

  const INTERVIEW_TYPES = [
    { id: 'hr', icon: Users, title: 'HR Round', desc: 'Behavioral, soft skills, culture fit' },
    { id: 'technical', icon: Code2, title: 'Technical', desc: 'Domain knowledge & problem-solving' },
    { id: 'mixed', icon: Target, title: 'Mixed', desc: 'HR + Technical combined', badge: 'Recommended' },
  ];

  const DIFFICULTIES = [
    { id: 'easy', dot: 'bg-emerald-500', title: 'Easy', desc: '10–12 questions' },
    { id: 'medium', dot: 'bg-amber-500', title: 'Medium', desc: '12–20 questions' },
    { id: 'hard', dot: 'bg-rose-500', title: 'Hard', desc: '20–25 questions' },
  ];

  const renderSetup = () => (
    <div className="mx-auto max-w-3xl">
      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-7 text-white shadow-xl sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 size-56 rounded-full bg-black/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Mic className="size-7" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">AI Mock Interview</h1>
            <p className="mt-1 max-w-lg text-sm text-white/85 sm:text-base">
              Practice with a production-grade AI interviewer. Configure your session below and get
              detailed, personalized feedback.
            </p>
          </div>
        </div>
      </div>

      <GlassPanel className="space-y-6 p-5 sm:p-7">
        {/* Company + Job Role */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls}>
              <Building2 className="size-4 text-primary" /> Target Company <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                className={selectCls}
                value={config.company}
                onChange={(e) => setConfig({ ...config, company: e.target.value, customCompany: '' })}
              >
                {COMPANIES.map((company) => (
                  <option key={company.value} value={company.value}>
                    {company.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              <Briefcase className="size-4 text-primary" /> Job Role <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g., Software Engineer, Data Analyst"
              value={config.jobRole}
              onChange={(e) => setConfig({ ...config, jobRole: e.target.value })}
            />
          </div>
        </div>

        {config.company === 'other' && (
          <div>
            <label className={labelCls}>Company Name <span className="text-rose-500">*</span></label>
            <input
              type="text"
              className={inputCls}
              placeholder="Enter company name"
              value={config.customCompany}
              onChange={(e) => setConfig({ ...config, customCompany: e.target.value })}
            />
          </div>
        )}

        {/* Industry */}
        <div>
          <label className={labelCls}>
            <Factory className="size-4 text-primary" /> Industry <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              className={selectCls}
              value={config.industry}
              onChange={(e) => setConfig({ ...config, industry: e.target.value, customIndustry: '' })}
            >
              {INDUSTRIES.map((industry) => (
                <option key={industry.value} value={industry.value}>
                  {industry.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon />
          </div>
        </div>

        {config.industry === 'other' && (
          <div>
            <label className={labelCls}>Industry Name <span className="text-rose-500">*</span></label>
            <input
              type="text"
              className={inputCls}
              placeholder="Enter industry name"
              value={config.customIndustry}
              onChange={(e) => setConfig({ ...config, customIndustry: e.target.value })}
            />
          </div>
        )}

        {/* Interview Type */}
        <div>
          <label className={labelCls}>Interview Type</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {INTERVIEW_TYPES.map((t) => {
              const active = config.interviewType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setConfig({ ...config, interviewType: t.id })}
                  className={`group relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                    active
                      ? 'border-primary bg-primary/[0.06] shadow-md'
                      : 'border-border bg-card/60 hover:border-primary/40 hover:bg-primary/[0.03]'
                  }`}
                >
                  {t.badge && (
                    <span className="absolute right-2 top-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                      {t.badge}
                    </span>
                  )}
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <t.icon className="size-5" />
                  </span>
                  <span className="text-sm font-bold text-foreground">{t.title}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className={labelCls}>Difficulty Level</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {DIFFICULTIES.map((d) => {
              const active = config.difficulty === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setConfig({ ...config, difficulty: d.id })}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all duration-200 ${
                    active
                      ? 'border-primary bg-primary/[0.06] shadow-md'
                      : 'border-border bg-card/60 hover:border-primary/40'
                  }`}
                >
                  <span className={`size-3 shrink-0 rounded-full ${d.dot}`} />
                  <span className="text-left">
                    <span className="block text-sm font-bold text-foreground">{d.title}</span>
                    <span className="block text-xs text-muted-foreground">{d.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resume Upload */}
        <div>
          <label className={labelCls}>
            <Upload className="size-4 text-primary" /> Upload Resume
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Optional
            </span>
          </label>
          <div
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 ${
              config.resumeFile
                ? 'border-emerald-500/40 bg-emerald-500/[0.05]'
                : 'cursor-pointer border-border hover:border-primary/50 hover:bg-primary/[0.03]'
            }`}
            onClick={() => !config.resumeFile && document.getElementById('resumeUpload').click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file && file.type === 'application/pdf') {
                setConfig({ ...config, resumeFile: file });
              } else {
                alert('Please upload a PDF file');
              }
            }}
          >
            <input
              id="resumeUpload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setConfig({ ...config, resumeFile: file });
              }}
            />
            {config.resumeFile ? (
              <>
                <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="size-6" />
                </div>
                <div className="text-sm font-semibold text-foreground">{config.resumeFile.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {(config.resumeFile.size / 1024).toFixed(2)} KB
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfig({ ...config, resumeFile: null });
                    const el = document.getElementById('resumeUpload');
                    if (el) el.value = '';
                  }}
                >
                  <XIcon className="size-4" /> Remove
                </Button>
              </>
            ) : (
              <>
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Upload className="size-6" />
                </div>
                <div className="text-sm font-semibold text-foreground">Click to upload or drag & drop</div>
                <div className="mt-1 max-w-xs text-xs text-muted-foreground">
                  PDF only (Max 5MB) — the AI will ask about your projects & experience
                </div>
              </>
            )}
          </div>
        </div>

        {/* Start button */}
        <Button
          variant="gradient"
          size="xl"
          className="w-full shadow-lg shadow-indigo-500/20"
          onClick={startInterview}
          disabled={startDisabled}
        >
          {isPreparing ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Preparing Interview…
            </>
          ) : (
            <>
              <Mic className="size-5" /> Start Interview
            </>
          )}
        </Button>
      </GlassPanel>

      {/* Tips */}
      <div className="mt-5 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Info className="size-4 text-blue-600 dark:text-blue-400" /> Before you start
        </h3>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            "Ensure you're in a quiet environment",
            'Test your microphone and speakers',
            'Speak clearly and at a natural pace',
            'The AI decides when to end based on performance',
            'You can end the interview manually anytime',
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderInterview = () => (
    <div className="relative -mx-4 -my-6 flex min-h-[calc(100vh-4rem)] flex-col sm:-mx-6 lg:-mx-8">
      {/* Sticky control bar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6">
        {/* Camera preview */}
        <div className="h-[96px] w-[128px] shrink-0 sm:h-[108px] sm:w-[144px]">
          {isCameraOn ? (
            <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black shadow-md ring-1 ring-border">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play().catch((e) => console.error('Video play error:', e));
                  }
                }}
                className="h-full w-full -scale-x-100 object-cover"
              />
              <div className="absolute right-2 top-2 flex items-center gap-1.5">
                {isRecording && (
                  <span className="size-2.5 animate-pulse rounded-full bg-rose-500 ring-2 ring-white/40" />
                )}
                <button
                  onClick={toggleCamera}
                  className="flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={toggleCamera}
              className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-white/40 bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-semibold text-white transition-transform hover:scale-[1.02]"
            >
              <Camera className="size-5" />
              Enable Camera
            </button>
          )}
        </div>

        {/* AI avatar */}
        <div className="shrink-0">
          <AIAvatar isSpeaking={isAISpeaking} isListening={isRecording && !isAISpeaking} />
        </div>

        {/* Mic toggle */}
        <button
          onClick={toggleMicrophone}
          className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 font-semibold text-white shadow-md transition-all duration-300 ${
            isRecording
              ? 'scale-[1.02] bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/30'
              : 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/30 hover:scale-[1.03]'
          }`}
        >
          {isRecording ? (
            <Mic className="size-5 animate-pulse" />
          ) : (
            <MicOff className="size-5" />
          )}
          <span className="text-left leading-tight">
            <span className="block text-sm font-bold">
              {isRecording ? 'SPEAKING' : 'CLICK TO SPEAK'}
            </span>
            <span className="block text-[11px] font-normal opacity-85">
              {isRecording ? 'AI is listening…' : 'Turn on microphone'}
            </span>
          </span>
        </button>

        {/* Status */}
        <div className="ml-auto flex items-center gap-2.5">
          <div className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm">
            Question {currentQuestion > 0 ? currentQuestion : '—'} / {estimatedQuestions}
          </div>
          {isRecording && (
            <span className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600">
              <span className="size-2 animate-pulse rounded-full bg-rose-500" /> Recording
            </span>
          )}
          <Button variant="destructive" onClick={endInterview} className="rounded-full">
            <Flag className="size-4" /> End
          </Button>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex flex-1 flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 p-4 dark:from-background dark:via-background dark:to-background sm:p-6">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <h3 className="flex items-center gap-2 border-b border-border px-6 py-4 text-base font-bold text-foreground">
            <MessageSquare className="size-5 text-primary" /> Interview Conversation
          </h3>
          <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
            {conversationHistory.map((msg, idx) => {
              const isAI = msg.role === 'assistant';
              return (
                <div
                  key={idx}
                  className={`flex items-end gap-2.5 ${isAI ? 'justify-start' : 'flex-row-reverse'}`}
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full text-lg shadow-sm ${
                      isAI ? 'bg-primary/10' : 'bg-emerald-500/10'
                    }`}
                  >
                    {isAI ? '🤖' : '🧑'}
                  </span>
                  <div className={`max-w-[78%] ${isAI ? 'items-start' : 'items-end'} flex flex-col`}>
                    <span className="mb-1 px-1 text-[11px] font-semibold text-muted-foreground">
                      {isAI ? 'Alex · AI Interviewer' : 'You'}
                    </span>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                        isAI
                          ? 'rounded-bl-md border border-border bg-muted/60 text-foreground'
                          : 'rounded-br-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="mt-1 px-1 text-[10px] text-muted-foreground/70">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
            {conversationHistory.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
                  💭
                </span>
                Waiting for the AI to start the interview…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );

  const readinessLabel = (level) =>
    ({
      excellent: '🌟 Excellent',
      well_prepared: '✨ Well Prepared',
      ready: '👍 Ready',
      needs_improvement: '📈 Needs Improvement',
      not_ready: '🔄 Not Ready',
    }[level] || 'Overall Performance');

  const scoreHex = (s) => (s >= 75 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444');
  const scoreGrad = (s) =>
    s >= 75 ? 'from-emerald-500 to-teal-600' : s >= 60 ? 'from-amber-500 to-orange-600' : 'from-rose-500 to-red-600';

  const renderResults = () => (
    <div className="mx-auto max-w-4xl">
      {isAnalyzing ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
          <Loader2 className="mb-6 size-16 animate-spin text-primary" />
          <h2 className="mb-2 text-2xl font-extrabold text-foreground">Analyzing your interview…</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Please wait while we comprehensively evaluate your responses using advanced AI analysis.
          </p>
          <div className="mt-6 flex gap-1.5">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="size-2.5 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        </div>
      ) : (
        analysis && (
          <div className="space-y-6">
            {/* Hero */}
            <div
              className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${scoreGrad(
                analysis.overallScore
              )} p-7 text-white shadow-xl sm:p-9`}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-10 size-56 rounded-full bg-black/10 blur-3xl" />
              <div className="relative">
                <h1 className="mb-6 flex items-center justify-center gap-2 text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
                  <BarChart3 className="size-7" /> Your Interview Results
                </h1>
                <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
                  <div className="flex size-40 shrink-0 flex-col items-center justify-center rounded-full bg-white shadow-2xl">
                    <span
                      className="text-6xl font-black leading-none"
                      style={{ color: scoreHex(analysis.overallScore) }}
                    >
                      {analysis.overallScore}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">/ 100</span>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="inline-block rounded-full bg-white/20 px-6 py-3 text-xl font-bold capitalize backdrop-blur-md sm:text-2xl">
                      {readinessLabel(analysis.readinessLevel)}
                    </div>
                    <p className="mt-2 text-sm font-medium text-white/85">Interview Readiness Level</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 sm:p-6">
                <h3 className="mb-4 flex items-center gap-2.5 text-base font-bold text-emerald-700 dark:text-emerald-300">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15">
                    <TrendingUp className="size-4" />
                  </span>
                  Your Strengths
                </h3>
                <ul className="space-y-2.5">
                  {(analysis.strengthAreas || []).map((s, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card p-3.5 text-sm text-foreground shadow-sm"
                    >
                      <span className="shrink-0">✅</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5 sm:p-6">
                <h3 className="mb-4 flex items-center gap-2.5 text-base font-bold text-amber-700 dark:text-amber-300">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15">
                    <TrendingUp className="size-4" />
                  </span>
                  Areas to Improve
                </h3>
                <ul className="space-y-2.5">
                  {(analysis.improvementAreas || []).map((a, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card p-3.5 text-sm text-foreground shadow-sm"
                    >
                      <span className="shrink-0">🔸</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Detailed breakdown */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
                <BarChart3 className="size-5 text-primary" /> Detailed Performance Breakdown
              </h3>
              <div className="space-y-4">
                {(analysis.detailedScores && Object.keys(analysis.detailedScores).length > 0
                  ? Object.entries(analysis.detailedScores)
                  : ['Technical Knowledge', 'Communication', 'Problem Solving', 'Behavioral Skills', 'Overall Fit'].map(
                      (c) => [c, Math.max(1, Math.min(10, Math.round((analysis.overallScore / 100) * 10)))]
                    )
                ).map(([category, score]) => {
                  const val = Math.round(score);
                  const barHex = val >= 8 ? '#10b981' : val >= 6 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={category} className="rounded-xl border border-border bg-muted/40 p-4">
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className="text-sm font-semibold capitalize text-foreground">
                          {String(category).replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span
                          className="rounded-lg bg-card px-2.5 py-1 text-sm font-bold shadow-sm"
                          style={{ color: barHex }}
                        >
                          {val}/10
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-[width] duration-1000 ease-out"
                          style={{ width: `${val * 10}%`, background: barHex }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question-by-question */}
            {analysis.questionAnalysis?.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
                  <MessageSquare className="size-5 text-primary" /> Question-by-Question Analysis
                </h3>
                <div className="space-y-4">
                  {analysis.questionAnalysis.map((qa, idx) => (
                    <div key={idx} className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                          Q{qa.questionNumber}
                        </span>
                        <span className="text-sm font-bold" style={{ color: scoreHex((qa.score || 0) * 10) }}>
                          Score: {qa.score}/10
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-foreground">
                          <span className="font-semibold text-muted-foreground">Question: </span>
                          {qa.question}
                        </p>
                        <p className="text-foreground">
                          <span className="font-semibold text-muted-foreground">Your Answer: </span>
                          {qa.answer}
                        </p>
                        <p className="rounded-lg bg-card p-3 text-foreground">
                          <span className="font-semibold text-primary">Feedback: </span>
                          {qa.feedback}
                        </p>
                      </div>
                      {qa.strengths?.length > 0 && (
                        <div className="mt-3 text-sm">
                          <span className="font-semibold text-emerald-600">✅ Strengths</span>
                          <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                            {qa.strengths.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {qa.improvements?.length > 0 && (
                        <div className="mt-3 text-sm">
                          <span className="font-semibold text-amber-600">📈 Improvements</span>
                          <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                            {qa.improvements.map((imp, i) => (
                              <li key={i}>{imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations?.length > 0 && (
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-5 sm:p-6">
                <h3 className="mb-4 flex items-center gap-2.5 text-base font-bold text-indigo-700 dark:text-indigo-300">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/15">
                    <Sparkles className="size-4" />
                  </span>
                  Personalized Recommendations
                </h3>
                <ul className="space-y-2.5">
                  {analysis.recommendations.map((rec, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card p-3.5 text-sm text-foreground shadow-sm"
                    >
                      <span className="shrink-0 text-indigo-500">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary */}
            {analysis.summaryFeedback && (
              <div className="rounded-2xl border border-border bg-muted/40 p-5 sm:p-6">
                <h3 className="mb-2.5 flex items-center gap-2 text-base font-bold text-foreground">
                  <MessageSquareQuote className="size-5 text-primary" /> Overall Summary
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{analysis.summaryFeedback}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/student-dashboard')}>
                <Home className="size-4" /> Back to Dashboard
              </Button>
              <Button variant="gradient" className="flex-1" onClick={() => window.location.reload()}>
                <RotateCcw className="size-4" /> Take Another Interview
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );

  if (!user) {
    return null;
  }

  return (
    <PortalLayout role="student" title="AI Mock Interview" user={profileData}>
        {step === 'setup' && renderSetup()}
        {step === 'interview' && renderInterview()}
        {step === 'completed' && renderResults()}
    </PortalLayout>
  );
};

export default RealtimeInterviewPage;
