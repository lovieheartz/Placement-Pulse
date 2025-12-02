import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import axios from 'axios';
import { FiMic, FiCamera, FiVideoOff } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import StudentSidebar from '../components/StudentSidebar';
import StudentHeader from '../components/StudentHeader';
import StudentFooter from '../components/StudentFooter';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import useTextToSpeech from '../hooks/useTextToSpeech';
import './Dashboard.css';

const MockInterviewPage = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Views: 'setup', 'conversation', 'results'
  const [currentView, setCurrentView] = useState('setup');

  // Interview config
  const [interviewConfig, setInterviewConfig] = useState({
    jobRole: '',
    industry: '',
    difficulty: 'medium',
    totalQuestions: 15 // Default for easy level
  });

  // Interview state
  const [interviewId, setInterviewId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);

  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const conversationEndRef = useRef(null);

  // Camera state
  const [cameraEnabled, setCameraEnabled] = useState(false);

  // Text-to-speech hook
  const { speak, isSpeaking } = useTextToSpeech();

  // Handle auto-submit when silence detected
  const handleAutoSubmit = useCallback(async (finalAnswer) => {
    if (!finalAnswer.trim() || isProcessing) return;

    console.log('📝 Auto-submitting answer:', finalAnswer);

    // Add student answer to conversation
    setConversation(prev => [...prev, {
      role: 'student',
      text: finalAnswer,
      questionNumber: currentQuestionNumber
    }]);

    setIsProcessing(true);

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        `http://localhost:3001/api/mock-interview/${interviewId}/submit`,
        { answer: finalAnswer },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const { isCompleted, nextQuestion, finalReport } = response.data.data;

      if (isCompleted) {
        // Interview complete - use AI-generated closing message
        const closingMessage = finalReport.overallFeedback?.closingMessage ||
          `Thank you so much for taking the time to speak with me today! You've done a wonderful job sharing your experiences and insights. I've carefully analyzed our entire conversation, and I'm preparing a comprehensive report with personalized feedback to help you excel in your future interviews. Let's take a look at your results together.`;

        setConversation(prev => [...prev, { role: 'ai', text: closingMessage, type: 'closing' }]);
        await speak(closingMessage);

        setResults(finalReport);
        setCurrentView('results');
        disableCamera();
        stopListening();
      } else {
        // Continue to next question
        setCurrentQuestionNumber(nextQuestion.questionNumber);

        // Natural transitions
        const transitions = [
          "That's really insightful! I appreciate you sharing that with me.",
          "Thank you for that detailed response. It gives me a great understanding of your approach.",
          "Excellent! I can see you've put a lot of thought into that.",
          "That's wonderful to hear. I'm getting a great sense of your capabilities.",
          "I really appreciate your perspective on that. It's very interesting!"
        ];
        const transition = transitions[Math.floor(Math.random() * transitions.length)];

        setConversation(prev => [
          ...prev,
          { role: 'ai', text: transition, type: 'transition' },
          { role: 'ai', text: nextQuestion.question, type: 'question', questionNumber: nextQuestion.questionNumber }
        ]);

        // Speak transition + next question, then auto-start listening
        await speak(transition);
        await speak(nextQuestion.question);

        // Auto-start listening after AI finishes speaking
        setTimeout(() => {
          console.log('🎤 Auto-starting listening...');
          resetTranscript();
          startListening();
        }, 1000);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
      // Restart listening on error
      resetTranscript();
      startListening();
    } finally {
      setIsProcessing(false);
    }
  }, [interviewId, currentQuestionNumber, isProcessing]);

  // Voice recognition with auto-silence detection
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: voiceSupported
  } = useVoiceRecognition({
    onSilenceDetected: handleAutoSubmit,
    silenceTimeout: 2500 // 2.5 seconds of silence triggers auto-submit
  });

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      stopListening();
    };
  }, []);

  // ========== CAMERA FUNCTIONS ==========
  const enableCamera = async () => {
    try {
      console.log('📷 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      streamRef.current = stream;
      setCameraEnabled(true);
      console.log('✅ Camera enabled successfully');
    } catch (error) {
      console.error('❌ Camera error:', error);
      if (error.name === 'NotAllowedError') {
        alert('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No camera found. You can continue without video.');
      } else {
        alert(`Camera error: ${error.message}. You can continue without camera.`);
      }
    }
  };

  const disableCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraEnabled(false);
  };

  // ========== START CONVERSATION ==========
  const startConversation = async () => {
    if (!interviewConfig.jobRole.trim()) {
      alert('Please enter a job role');
      return;
    }

    if (!interviewConfig.industry) {
      alert('Please select an industry');
      return;
    }

    if (!voiceSupported) {
      alert('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (!cameraEnabled) await enableCamera();

    setIsProcessing(true);

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        'http://localhost:3001/api/mock-interview/start',
        { ...interviewConfig, experienceLevel: 'fresher' },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const { interviewId: newInterviewId, currentQuestion } = response.data.data;
      setInterviewId(newInterviewId);
      setCurrentQuestionNumber(1);

      // Warm, natural greeting
      const greeting = `Hello! It's wonderful to meet you. My name is Alex, and I'll be your interviewer today. I'm really looking forward to our conversation about the ${interviewConfig.jobRole} position. This is a friendly, supportive space, so please relax and be yourself. I'm here to learn about your unique experiences and perspectives. Let's begin with our first question, shall we?`;

      // Add greeting and first question to conversation
      setConversation([
        { role: 'ai', text: greeting, type: 'greeting' },
        { role: 'ai', text: currentQuestion.question, type: 'question', questionNumber: 1 }
      ]);

      setCurrentView('conversation');

      // Speak greeting + first question
      await speak(greeting);
      await speak(currentQuestion.question);

      // Auto-start listening after AI finishes speaking
      setTimeout(() => {
        console.log('🎤 Auto-starting listening for your answer...');
        startListening();
      }, 1000);

    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ========== SPEAK RESULTS SUMMARY ==========
  const speakResultsSummary = async () => {
    if (!results) return;

    const summary = `Congratulations on completing your interview! Here's your comprehensive analysis. Your overall performance score is ${results.overallScore} out of 100.
      Breaking that down: you scored ${results.technicalScore} in technical skills, ${results.communicationScore} in communication abilities, and ${results.confidenceScore} in confidence and presence.
      ${results.overallFeedback?.strengths?.length > 0 ? 'Your key strengths that really stood out include: ' + results.overallFeedback.strengths.join(', ') + '.' : ''}
      ${results.overallFeedback?.areasForImprovement?.length > 0 ? 'Some areas where you can grow and improve are: ' + results.overallFeedback.areasForImprovement.join(', ') + '.' : ''}
      Keep practicing, stay confident, and you'll do amazingly well in your real interviews! Best of luck!`;

    await speak(summary);
  };

  // ========== RENDER SETUP VIEW ==========
  const renderSetupView = () => (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 sm:p-8 md:p-10 lg:p-12 animate-fade-in">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mb-5 sm:mb-6 shadow-xl animate-pulse-slow">
            <FiMic className="text-white text-4xl sm:text-5xl md:text-6xl" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">AI Mock Interview</h2>
          <p className="text-gray-600 text-base sm:text-lg md:text-xl max-w-2xl mx-auto">Natural voice conversation with automatic listening</p>
        </div>

        <div className="space-y-4 sm:space-y-5 md:space-y-6 mb-6 sm:mb-8">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
              Job Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-4 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-purple-500 focus:ring-2 sm:focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800 text-sm sm:text-base md:text-lg"
              placeholder="e.g., Software Engineer, Data Analyst"
              value={interviewConfig.jobRole}
              onChange={(e) => setInterviewConfig({ ...interviewConfig, jobRole: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Industry <span className="text-red-500">*</span></label>
            <select
              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-4 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-purple-500 focus:ring-2 sm:focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800 text-sm sm:text-base md:text-lg"
              value={interviewConfig.industry}
              onChange={(e) => setInterviewConfig({ ...interviewConfig, industry: e.target.value })}
            >
              <option value="">Select Industry</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Software Development">Software Development</option>
              <option value="Web Development">Web Development</option>
              <option value="Data Science & AI">Data Science & AI</option>
              <option value="Cybersecurity">Cybersecurity</option>
              <option value="Cloud Computing">Cloud Computing</option>
              <option value="Mobile App Development">Mobile App Development</option>
              <option value="DevOps & Infrastructure">DevOps & Infrastructure</option>
              <option value="Finance & Banking">Finance & Banking</option>
              <option value="E-commerce">E-commerce</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Education">Education</option>
              <option value="Marketing & Sales">Marketing & Sales</option>
              <option value="Consulting">Consulting</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Telecommunications">Telecommunications</option>
              <option value="Automotive">Automotive</option>
              <option value="Retail">Retail</option>
              <option value="Media & Entertainment">Media & Entertainment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">Difficulty Level</label>
              <select
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-4 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-purple-500 focus:ring-2 sm:focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800 text-sm sm:text-base md:text-lg"
                value={interviewConfig.difficulty}
                onChange={(e) => {
                  const level = e.target.value;
                  let questions = 15;
                  if (level === 'easy') questions = 15;
                  else if (level === 'medium') questions = 25;
                  else if (level === 'hard') questions = 32;
                  setInterviewConfig({ ...interviewConfig, difficulty: level, totalQuestions: questions });
                }}
              >
                <option value="easy">Easy (10-20 questions, ~20-25 min)</option>
                <option value="medium">Medium (20-30 questions, ~30-40 min)</option>
                <option value="hard">Hard (30-35 questions, ~45-60 min)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Voice Support Check */}
        <div className={`p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border-2 mb-6 sm:mb-8 ${voiceSupported ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
            {voiceSupported ? (
              <>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg sm:text-xl">✓</span>
                </div>
                <div>
                  <h4 className="font-bold text-green-900 text-sm sm:text-base">Voice Ready!</h4>
                  <p className="text-xs sm:text-sm text-green-700">Auto-listening enabled - just speak naturally!</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg sm:text-xl">✗</span>
                </div>
                <div>
                  <h4 className="font-bold text-red-900 text-sm sm:text-base">Voice Not Supported</h4>
                  <p className="text-xs sm:text-sm text-red-700">Please use Chrome, Edge, or Safari for voice features</p>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          onClick={startConversation}
          disabled={isProcessing || !interviewConfig.jobRole.trim() || !voiceSupported}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 sm:py-4 md:py-5 rounded-lg sm:rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-base sm:text-lg md:text-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 sm:space-x-3"
        >
          <FiMic className="text-xl sm:text-2xl" />
          <span>{isProcessing ? 'Starting Interview...' : 'Start Interview'}</span>
        </button>
      </div>
    </div>
  );

  // ========== RENDER CONVERSATION VIEW ==========
  const renderConversationView = () => (
    <div className="w-full h-auto lg:h-[calc(100vh-200px)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 h-full">

        {/* LEFT: AI Interviewer (LARGE - 70% on desktop) */}
        <div className="lg:col-span-9 flex flex-col order-2 lg:order-1">
          <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex-1 relative min-h-[400px] sm:min-h-[500px] lg:min-h-0">

            {/* AI Avatar - Responsive Size */}
            <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
              <div className="text-center w-full">

                {/* Large Human Avatar with Listening Ring */}
                <div className="relative inline-block mb-4 sm:mb-6 md:mb-8">
                  {/* Pulsing ring when listening */}
                  {isListening && !isSpeaking && (
                    <div className="absolute inset-0 -m-3 sm:-m-4 md:-m-6">
                      <div className="w-full h-full rounded-full border-4 sm:border-6 md:border-8 border-green-400 animate-ping opacity-75"></div>
                      <div className="absolute inset-0 w-full h-full rounded-full border-4 sm:border-6 md:border-8 border-green-400 opacity-50"></div>
                    </div>
                  )}

                  {/* Human Avatar - Responsive Size */}
                  <img
                    src="https://api.dicebear.com/7.x/adventurer/svg?seed=Katherine&backgroundColor=b6e3f4"
                    alt="AI Interviewer - Alex"
                    className={`w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 lg:w-96 lg:h-96 xl:w-[500px] xl:h-[500px] rounded-full border-4 sm:border-6 md:border-8 border-white/40 shadow-2xl transition-all duration-300 ${
                      isSpeaking ? 'scale-110 border-purple-300' : isListening ? 'scale-105 border-green-300' : 'scale-100'
                    }`}
                  />

                  {/* Speaking indicator */}
                  {isSpeaking && (
                    <div className="absolute -bottom-6 sm:-bottom-8 md:-bottom-12 left-1/2 transform -translate-x-1/2 flex items-center space-x-1 sm:space-x-2">
                      <div className="w-1.5 sm:w-2 h-6 sm:h-8 md:h-10 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 sm:w-2 h-8 sm:h-10 md:h-16 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 sm:w-2 h-7 sm:h-9 md:h-12 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                      <div className="w-1.5 sm:w-2 h-10 sm:h-12 md:h-20 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '450ms' }}></div>
                      <div className="w-1.5 sm:w-2 h-6 sm:h-8 md:h-10 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
                    </div>
                  )}
                </div>

                {/* AI Name and Status */}
                <div className="mt-6 sm:mt-8 md:mt-12 px-2">
                  <h3 className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3">Alex - Your AI Interviewer</h3>
                  <div className="inline-block bg-white/20 backdrop-blur-md px-4 py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-3 rounded-full">
                    <p className="text-white text-sm sm:text-base md:text-lg lg:text-xl font-semibold">
                      {isSpeaking ? '🎙️ Speaking...' : isListening ? '👂 Listening...' : isProcessing ? '🤔 Thinking...' : '💭 Ready'}
                    </p>
                  </div>
                </div>

                {/* Live Transcript while speaking */}
                {isListening && (transcript || interimTranscript) && (
                  <div className="mt-4 sm:mt-6 md:mt-8 bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 max-w-xs sm:max-w-md md:max-w-2xl mx-auto">
                    <p className="text-xs sm:text-sm text-green-300 font-semibold mb-1 sm:mb-2">You're saying:</p>
                    <p className="text-white text-sm sm:text-base md:text-lg leading-relaxed">
                      {transcript} <span className="text-green-200 italic">{interimTranscript}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6">
              <div className="bg-white/20 backdrop-blur-md rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-white font-bold text-xs sm:text-sm md:text-base">Interview Progress</span>
                  <span className="text-white font-bold text-xs sm:text-sm md:text-base">
                    Q{currentQuestionNumber}/{interviewConfig.totalQuestions}
                  </span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2 sm:h-3 md:h-4">
                  <div
                    className="bg-white h-2 sm:h-3 md:h-4 rounded-full transition-all duration-500 shadow-lg"
                    style={{ width: `${(currentQuestionNumber / interviewConfig.totalQuestions) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Student Video + Conversation (30% on desktop, shows first on mobile) */}
        <div className="lg:col-span-3 flex flex-col space-y-3 sm:space-y-4 order-1 lg:order-2">

          {/* Student Video */}
          <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden" style={{ height: '240px' }}>
            <div className="p-2 bg-gray-800 flex items-center justify-between">
              <span className="text-white font-semibold text-sm flex items-center space-x-1">
                <FiCamera className="text-xs" />
                <span>You</span>
              </span>
              {cameraEnabled ? (
                <button onClick={disableCamera} className="text-red-400 hover:text-red-300 text-xs">
                  <FiVideoOff />
                </button>
              ) : (
                <button onClick={enableCamera} className="text-green-400 hover:text-green-300 text-xs">
                  <FiCamera />
                </button>
              )}
            </div>
            <div className="relative bg-gray-900 h-full">
              {cameraEnabled ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-800">
                  <div className="text-center">
                    <FiVideoOff className="text-4xl text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-xs">Camera Off</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conversation History */}
          <div className="flex-1 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <h4 className="font-bold text-sm">Conversation</h4>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
              {conversation.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-xl p-3 text-xs ${
                    msg.role === 'ai'
                      ? 'bg-gradient-to-br from-purple-100 to-blue-100 border border-purple-200'
                      : 'bg-gradient-to-br from-green-100 to-emerald-100 border border-green-200'
                  }`}>
                    {msg.type === 'question' && (
                      <div className="text-xs font-bold text-purple-600 mb-1">Q{msg.questionNumber}</div>
                    )}
                    <p className={`leading-relaxed ${msg.role === 'ai' ? 'text-gray-800' : 'text-gray-900 font-medium'}`}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={conversationEndRef} />
            </div>

            {/* Mic Status Indicator */}
            <div className="p-3 bg-white border-t border-gray-100">
              <div className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-lg ${
                isListening ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                <FiMic className={`text-lg ${isListening ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-semibold">
                  {isListening ? 'Listening (Auto)...' : 'Standby'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ========== RENDER RESULTS VIEW ==========
  const renderResultsView = () => {
    if (!results) return null;

    const getScoreColor = (score) => {
      if (score >= 75) return 'text-green-600';
      if (score >= 50) return 'text-yellow-600';
      return 'text-red-600';
    };

    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white p-12 text-center">
            <h2 className="text-5xl font-bold mb-4">Interview Complete! 🎉</h2>
            <p className="text-2xl text-purple-100">Here's your comprehensive performance analysis</p>
          </div>

          {/* Overall Score */}
          <div className="p-12">
            <div className="text-center mb-12">
              <div className={`text-9xl font-black ${getScoreColor(results.overallScore)} mb-4`}>
                {results.overallScore}
              </div>
              <div className="text-4xl text-gray-400 font-light mb-8">out of 100</div>
            </div>

            {/* Score Breakdown */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl">
                <div className="text-5xl font-bold text-purple-600 mb-3">{results.technicalScore}</div>
                <div className="text-lg font-semibold text-purple-700">Technical Skills</div>
              </div>
              <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
                <div className="text-5xl font-bold text-blue-600 mb-3">{results.communicationScore}</div>
                <div className="text-lg font-semibold text-blue-700">Communication</div>
              </div>
              <div className="text-center p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                <div className="text-5xl font-bold text-green-600 mb-3">{results.confidenceScore}</div>
                <div className="text-lg font-semibold text-green-700">Confidence</div>
              </div>
            </div>

            {/* Feedback */}
            {results.overallFeedback && (
              <div className="space-y-8">
                {results.overallFeedback.strengths?.length > 0 && (
                  <div className="bg-green-50 rounded-2xl p-8 border-2 border-green-200">
                    <h3 className="text-3xl font-bold text-green-900 mb-6">💪 Key Strengths</h3>
                    <ul className="space-y-4">
                      {results.overallFeedback.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start text-lg">
                          <span className="text-green-600 mr-4 text-2xl font-bold">✓</span>
                          <span className="text-green-900">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.overallFeedback.areasForImprovement?.length > 0 && (
                  <div className="bg-yellow-50 rounded-2xl p-8 border-2 border-yellow-200">
                    <h3 className="text-3xl font-bold text-yellow-900 mb-6">📈 Areas for Improvement</h3>
                    <ul className="space-y-4">
                      {results.overallFeedback.areasForImprovement.map((area, idx) => (
                        <li key={idx} className="flex items-start text-lg">
                          <span className="text-yellow-600 mr-4 text-2xl font-bold">→</span>
                          <span className="text-yellow-900">{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.overallFeedback.recommendations?.length > 0 && (
                  <div className="bg-purple-50 rounded-2xl p-8 border-2 border-purple-200">
                    <h3 className="text-3xl font-bold text-purple-900 mb-6">🎯 Recommendations</h3>
                    <ul className="space-y-4">
                      {results.overallFeedback.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start text-lg">
                          <span className="text-purple-600 mr-4 text-2xl font-bold">●</span>
                          <span className="text-purple-900">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-6 mt-12">
              <button
                onClick={speakResultsSummary}
                disabled={isSpeaking}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-5 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all text-xl flex items-center justify-center space-x-3 disabled:opacity-50"
              >
                <span>🔊</span>
                <span>{isSpeaking ? 'Speaking...' : 'Hear Summary'}</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView('setup');
                  setConversation([]);
                  setInterviewId(null);
                  setResults(null);
                  resetTranscript();
                }}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-5 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all text-xl"
              >
                Try Another Interview
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

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

        <div className="px-6 md:px-8 py-6 md:py-8 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
          {currentView === 'setup' && renderSetupView()}
          {currentView === 'conversation' && renderConversationView()}
          {currentView === 'results' && renderResultsView()}
        </div>

        <StudentFooter />
      </div>
    </div>
  );
};

export default MockInterviewPage;
