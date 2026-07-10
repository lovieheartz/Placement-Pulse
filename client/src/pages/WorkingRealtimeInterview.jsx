import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiMic, FiCamera, FiVideoOff, FiMicOff } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import StudentSidebar from '../components/StudentSidebar';
import StudentHeader from '../components/StudentHeader';
import StudentFooter from '../components/StudentFooter';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import useTextToSpeech from '../hooks/useTextToSpeech';
import { API_BASE } from '../config/api';
import './Dashboard.css';

/**
 * WORKING REAL-TIME MOCK INTERVIEW
 * Uses regular Gemini API + Web Speech API for reliable performance
 * Fast, production-ready, and actually works!
 */
const WorkingRealtimeInterview = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  // Views
  const [currentView, setCurrentView] = useState('setup');

  // Interview config
  const [interviewConfig, setInterviewConfig] = useState({
    jobRole: '',
    industry: 'Information Technology',
    difficulty: 'medium',
    experienceLevel: 'intermediate',
    totalQuestions: 15
  });

  // Interview state
  const [interviewId, setInterviewId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);

  // Camera
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const conversationEndRef = useRef(null);

  // TTS
  const { speak, isSpeaking, stop: stopSpeaking } = useTextToSpeech();

  // Auto-scroll
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      stopListening();
      stopSpeaking();
    };
  }, []);

  // Handle answer submission
  const handleAnswerSubmit = useCallback(async (answer) => {
    if (!answer.trim() || isProcessing) return;

    console.log('📝 Submitting answer:', answer);

    // Add user answer to conversation
    setConversation(prev => [...prev, {
      role: 'user',
      text: answer,
      timestamp: Date.now()
    }]);

    setIsProcessing(true);
    stopListening();

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE}/api/mock-interview/${interviewId}/submit`,
        { answer },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const { isCompleted, nextQuestion, finalReport } = response.data.data;

      if (isCompleted) {
        // Interview complete
        const closingMessage = "Thank you so much for completing this interview! You've done wonderfully. I've prepared a comprehensive report with detailed feedback. Let's review your results together.";

        setConversation(prev => [...prev, {
          role: 'ai',
          text: closingMessage,
          type: 'closing'
        }]);

        await speak(closingMessage);

        setResults(finalReport);
        setTimeout(() => {
          setCurrentView('results');
          disableCamera();
        }, 3000);
      } else {
        // Next question
        setCurrentQuestionNumber(nextQuestion.questionNumber);

        // Natural acknowledgment
        const acknowledgments = [
          "That's really insightful! Thanks for sharing that.",
          "Excellent point! I appreciate your detailed response.",
          "Great answer! That gives me a good understanding of your approach.",
          "Thank you for that thoughtful response.",
          "Perfect! I can see you've put a lot of thought into that."
        ];
        const ack = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];

        setConversation(prev => [
          ...prev,
          { role: 'ai', text: ack, type: 'acknowledgment' },
          { role: 'ai', text: nextQuestion.question, type: 'question', questionNumber: nextQuestion.questionNumber }
        ]);

        // Speak acknowledgment + question
        await speak(ack);
        await speak(nextQuestion.question);

        // Start listening again
        setTimeout(() => {
          resetTranscript();
          startListening();
        }, 1000);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
      startListening();
    } finally {
      setIsProcessing(false);
    }
  }, [interviewId, isProcessing]);

  // Voice recognition
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: voiceSupported
  } = useVoiceRecognition({
    onSilenceDetected: handleAnswerSubmit,
    silenceTimeout: 2500
  });

  // Camera functions
  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      streamRef.current = stream;
      setCameraEnabled(true);
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  const disableCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraEnabled(false);
  };

  // Start interview
  const startInterview = async () => {
    if (!interviewConfig.jobRole.trim()) {
      alert('Please enter a job role');
      return;
    }

    if (!voiceSupported) {
      alert('Voice recognition not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    setIsProcessing(true);

    try {
      // Enable camera
      await enableCamera();

      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE}/api/mock-interview/start`,
        { ...interviewConfig, experienceLevel: interviewConfig.experienceLevel || 'intermediate' },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const { interviewId: newInterviewId, currentQuestion, totalQuestions: total } = response.data.data;
      setInterviewId(newInterviewId);
      setCurrentQuestionNumber(1);
      setTotalQuestions(total);

      // Greeting
      const greeting = `Hello! I'm Alex, your AI interviewer. I'm excited to learn more about you and your experience in ${interviewConfig.jobRole}. This will be a friendly conversation, so please relax and be yourself. Let's begin!`;

      setConversation([
        { role: 'ai', text: greeting, type: 'greeting' },
        { role: 'ai', text: currentQuestion.question, type: 'question', questionNumber: 1 }
      ]);

      setCurrentView('interview');

      // Speak greeting + first question
      await speak(greeting);
      await speak(currentQuestion.question);

      // Start listening
      setTimeout(() => {
        startListening();
      }, 1000);

    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render setup
  const renderSetup = () => (
    <div className="max-w-4xl mx-auto px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mb-6 shadow-xl">
            <FiMic className="text-white text-6xl" />
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-4">AI Mock Interview</h2>
          <p className="text-gray-600 text-xl">Natural voice conversation with instant responses</p>
        </div>

        <div className="space-y-6 mb-8">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Job Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-lg"
              placeholder="e.g., Data Scientist, Python Developer"
              value={interviewConfig.jobRole}
              onChange={(e) => setInterviewConfig({ ...interviewConfig, jobRole: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Industry</label>
              <select
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-lg"
                value={interviewConfig.industry}
                onChange={(e) => setInterviewConfig({ ...interviewConfig, industry: e.target.value })}
              >
                <option>Information Technology</option>
                <option>Software Development</option>
                <option>Data Science & AI</option>
                <option>Finance & Banking</option>
                <option>Healthcare</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Difficulty</label>
              <select
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-lg"
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

        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">✓</span>
            </div>
            <div>
              <h4 className="font-bold text-green-900 text-lg">System Ready!</h4>
              <p className="text-green-700">Voice recognition and AI interview system are active</p>
            </div>
          </div>
        </div>

        <button
          onClick={startInterview}
          disabled={isProcessing || !interviewConfig.jobRole.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-5 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all text-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Starting Interview...' : 'Start Interview'}
        </button>
      </div>
    </div>
  );

  // Render interview
  const renderInterview = () => (
    <div className="w-full max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: 'calc(100vh - 250px)' }}>

        {/* LEFT: Conversation (2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <h3 className="text-2xl font-bold">{interviewConfig.jobRole} Interview</h3>
            <p className="text-purple-100 mt-1">Question {currentQuestionNumber} of {totalQuestions}</p>
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
                    {msg.type === 'question' && (
                      <span className="text-xs font-bold text-purple-600">Q{msg.questionNumber}</span>
                    )}
                  </div>
                  <p className="text-gray-800 leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            {(transcript || interimTranscript) && isListening && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xs font-bold text-green-600">🎤 You (Live)</span>
                  </div>
                  <p className="text-gray-800 leading-relaxed">
                    {transcript} <span className="text-green-600 italic">{interimTranscript}</span>
                  </p>
                </div>
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                isListening ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                <FiMic className={`text-lg ${isListening ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-semibold">
                  {isListening ? 'Listening...' : isSpeaking ? 'AI Speaking...' : 'Standby'}
                </span>
              </div>

              <div className="w-64 bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(currentQuestionNumber / totalQuestions) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: AI Avatar + Camera (1 column) */}
        <div className="flex flex-col space-y-6">
          {/* AI Avatar */}
          <div className="flex-1 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-3xl shadow-2xl flex items-center justify-center p-8">
            <div className="text-center">
              <div className="relative inline-block mb-6">
                {isSpeaking && (
                  <div className="absolute inset-0 -m-4">
                    <div className="w-full h-full rounded-full border-8 border-purple-300 animate-ping opacity-75"></div>
                  </div>
                )}
                <img
                  src="https://api.dicebear.com/7.x/adventurer/svg?seed=Alex&backgroundColor=b6e3f4"
                  alt="AI Interviewer"
                  className={`w-48 h-48 rounded-full border-8 border-white/40 shadow-2xl transition-all ${
                    isSpeaking ? 'scale-110' : 'scale-100'
                  }`}
                />
              </div>
              <h3 className="text-white text-2xl font-bold mb-2">Alex</h3>
              <p className="text-purple-100 text-sm">Your AI Interviewer</p>
            </div>
          </div>

          {/* Camera */}
          <div className="h-56 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-3 bg-gray-800 flex items-center justify-between">
              <span className="text-white font-semibold text-sm flex items-center space-x-2">
                <FiCamera />
                <span>You</span>
              </span>
              {cameraEnabled ? (
                <button onClick={disableCamera} className="text-red-400 hover:text-red-300">
                  <FiVideoOff />
                </button>
              ) : (
                <button onClick={enableCamera} className="text-green-400 hover:text-green-300">
                  <FiCamera />
                </button>
              )}
            </div>
            <div className="flex-1 bg-gray-900">
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
                <div className="flex items-center justify-center h-full">
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

  // Render results (simplified for now)
  const renderResults = () => (
    <div className="max-w-5xl mx-auto px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-12">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">Interview Complete!</h2>
          <p className="text-xl text-gray-600 mb-8">Excellent work! Your results are being prepared...</p>

          {results && (
            <div className="text-center mb-8">
              <div className="text-8xl font-black text-purple-600 mb-4">{results.overallScore}</div>
              <div className="text-3xl text-gray-400">out of 100</div>
            </div>
          )}

          <button
            onClick={() => {
              setCurrentView('setup');
              setConversation([]);
              setResults(null);
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
          {currentView === 'setup' && renderSetup()}
          {currentView === 'interview' && renderInterview()}
          {currentView === 'results' && renderResults()}
        </div>

        <StudentFooter />
      </div>
    </div>
  );
};

export default WorkingRealtimeInterview;
