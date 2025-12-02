import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FiMic, FiMicOff, FiCamera, FiVideoOff, FiMessageCircle } from 'react-icons/fi';
import StudentSidebar from '../components/StudentSidebar';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import useTextToSpeech from '../hooks/useTextToSpeech';

const ConversationalMockInterview = () => {
  // Views: 'setup', 'conversation', 'results'
  const [currentView, setCurrentView] = useState('setup');

  // Interview config
  const [interviewConfig, setInterviewConfig] = useState({
    jobRole: '',
    industry: '',
    difficulty: 'medium',
    totalQuestions: 5
  });

  // Interview state
  const [interviewId, setInterviewId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);

  // Voice & Camera
  const { isListening, transcript, interimTranscript, startListening, stopListening, resetTranscript, isSupported: voiceSupported } = useVoiceRecognition();
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const conversationEndRef = useRef(null);

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
    };
  }, []);

  // ========== CAMERA FUNCTIONS ==========
  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setCameraEnabled(true);
    } catch (error) {
      console.error('Camera error:', error);
      alert('Camera access denied. You can continue without camera.');
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

      // AI Greeting
      const greeting = `Hello! I'm your AI interviewer. Welcome to this mock interview for the ${interviewConfig.jobRole} position. I'm excited to get to know you better. Let's start with our first question.`;

      // Add greeting to conversation
      setConversation([
        { role: 'ai', text: greeting, type: 'greeting' },
        { role: 'ai', text: currentQuestion.question, type: 'question', questionNumber: 1 }
      ]);

      setCurrentView('conversation');

      // Speak greeting + first question
      await speak(greeting);
      await speak(currentQuestion.question);

    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ========== HANDLE VOICE ANSWER ==========
  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      if (transcript.trim()) {
        submitAnswer(transcript);
      }
    } else {
      resetTranscript();
      startListening();
    }
  };

  // ========== SUBMIT ANSWER ==========
  const submitAnswer = async (answer) => {
    if (!answer.trim() || isProcessing) return;

    // Add student answer to conversation
    setConversation(prev => [...prev, { role: 'student', text: answer, questionNumber: currentQuestionNumber }]);

    setIsProcessing(true);
    stopSpeaking();

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        `http://localhost:3001/api/mock-interview/${interviewId}/submit`,
        { answer },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const { isCompleted, nextQuestion, finalReport } = response.data.data;

      if (isCompleted) {
        // Interview complete
        const closingMessage = `Thank you for completing the interview! You did a great job. I've analyzed our entire conversation and prepared a detailed report with your strengths and areas for improvement. Let's review your results.`;

        setConversation(prev => [...prev, { role: 'ai', text: closingMessage, type: 'closing' }]);
        await speak(closingMessage);

        setResults(finalReport);
        setCurrentView('results');
        disableCamera();
      } else {
        // Continue to next question
        setCurrentQuestionNumber(nextQuestion.questionNumber);

        // Natural transition phrases
        const transitions = [
          "Great answer! Let's move on to the next question.",
          "Thank you for sharing that. Here's my next question.",
          "Interesting perspective! Let me ask you about something else.",
          "I appreciate your detailed response. Now, let's discuss another topic.",
          "Excellent! Let's continue with the next question."
        ];
        const transition = transitions[Math.floor(Math.random() * transitions.length)];

        setConversation(prev => [
          ...prev,
          { role: 'ai', text: transition, type: 'transition' },
          { role: 'ai', text: nextQuestion.question, type: 'question', questionNumber: nextQuestion.questionNumber }
        ]);

        // Speak transition + next question
        await speak(transition);
        await speak(nextQuestion.question);
      }

      resetTranscript();
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ========== SPEAK RESULTS SUMMARY ==========
  const speakResultsSummary = async () => {
    if (!results) return;

    const summary = `Your overall interview score is ${results.overallScore} out of 100.
      You scored ${results.technicalScore} in technical skills,
      ${results.communicationScore} in communication,
      and ${results.confidenceScore} in confidence.
      ${results.overallFeedback?.strengths?.length > 0 ? 'Your key strengths include: ' + results.overallFeedback.strengths.join(', ') + '.' : ''}
      ${results.overallFeedback?.areasForImprovement?.length > 0 ? 'Areas for improvement: ' + results.overallFeedback.areasForImprovement.join(', ') + '.' : ''}
      Keep practicing and you'll do great!`;

    await speak(summary);
  };

  // ========== RENDER SETUP VIEW ==========
  const renderSetupView = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-2xl p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mb-6">
            <FiMessageCircle className="text-white text-5xl" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">Conversational AI Mock Interview</h2>
          <p className="text-gray-600 text-lg">Natural voice conversation with an AI interviewer</p>
        </div>

        <div className="space-y-6 mb-8">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Job Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800 text-lg"
              placeholder="e.g., Software Engineer, Data Analyst, Product Manager"
              value={interviewConfig.jobRole}
              onChange={(e) => setInterviewConfig({ ...interviewConfig, jobRole: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Industry (Optional)</label>
            <input
              type="text"
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800 text-lg"
              placeholder="e.g., Technology, Finance, Healthcare"
              value={interviewConfig.industry}
              onChange={(e) => setInterviewConfig({ ...interviewConfig, industry: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
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

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Questions</label>
              <select
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800 text-lg"
                value={interviewConfig.totalQuestions}
                onChange={(e) => setInterviewConfig({ ...interviewConfig, totalQuestions: parseInt(e.target.value) })}
              >
                <option value={3}>3 Questions (~5 min)</option>
                <option value={5}>5 Questions (~10 min)</option>
                <option value={7}>7 Questions (~15 min)</option>
                <option value={10}>10 Questions (~20 min)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Voice Support Check */}
        <div className={`p-5 rounded-xl border-2 mb-8 ${voiceSupported ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
          <div className="flex items-center space-x-3">
            {voiceSupported ? (
              <>
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">✓</span>
                </div>
                <div>
                  <h4 className="font-bold text-green-900">Voice Supported!</h4>
                  <p className="text-sm text-green-700">You can have a natural voice conversation with the AI</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">!</span>
                </div>
                <div>
                  <h4 className="font-bold text-yellow-900">Voice Not Available</h4>
                  <p className="text-sm text-yellow-700">Please use Chrome, Edge, or Safari for voice features</p>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          onClick={startConversation}
          disabled={isProcessing || !interviewConfig.jobRole.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-5 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
        >
          <FiMessageCircle className="text-2xl" />
          <span>{isProcessing ? 'Starting...' : 'Start Interview'}</span>
        </button>
      </div>
    </div>
  );

  // ========== RENDER CONVERSATION VIEW ==========
  const renderConversationView = () => (
    <div className="max-w-[1800px] mx-auto h-[calc(100vh-200px)]">
      <div className="grid grid-cols-12 gap-6 h-full">

        {/* LEFT: AI Interviewer (Large) */}
        <div className="col-span-8 flex flex-col">
          {/* AI Avatar - Large */}
          <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 rounded-3xl shadow-2xl overflow-hidden flex-1 relative">
            {/* AI Avatar */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`relative inline-block ${isSpeaking ? 'animate-pulse' : ''}`}>
                  {/* Avatar Image */}
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=ai-interviewer&hair=shortHair&mouth=smile&eyes=default&accessories=prescription01&accessoriesColor=black&clothe=blazerAndShirt&clotheColor=blue&eyebrow=default&facialHair=blank&top=shortHairShortFlat"
                    alt="AI Interviewer"
                    className="w-96 h-96 rounded-full border-8 border-white/30 shadow-2xl"
                  />

                  {/* Speaking Indicator */}
                  {isSpeaking && (
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
                      <div className="w-3 h-8 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-3 h-12 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-3 h-10 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                      <div className="w-3 h-14 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '450ms' }}></div>
                      <div className="w-3 h-8 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
                    </div>
                  )}
                </div>

                <div className="mt-16">
                  <h3 className="text-white text-3xl font-bold mb-2">AI Interviewer</h3>
                  <p className="text-purple-100 text-lg">
                    {isSpeaking ? '🎙️ Speaking...' : isProcessing ? '🤔 Thinking...' : '👂 Listening...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-bold text-sm">Interview Progress</span>
                  <span className="text-white font-bold text-sm">
                    {currentQuestionNumber}/{interviewConfig.totalQuestions} Questions
                  </span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-3">
                  <div
                    className="bg-white h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(currentQuestionNumber / interviewConfig.totalQuestions) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Student Video (Small) + Conversation */}
        <div className="col-span-4 flex flex-col space-y-6">

          {/* Student Video - Small */}
          <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden" style={{ height: '300px' }}>
            <div className="p-3 bg-gray-800 flex items-center justify-between">
              <span className="text-white font-bold flex items-center space-x-2">
                <FiCamera className="text-sm" />
                <span className="text-sm">You</span>
              </span>
              {cameraEnabled ? (
                <button onClick={disableCamera} className="text-red-400 hover:text-red-300 text-xs flex items-center space-x-1">
                  <FiVideoOff />
                  <span>Off</span>
                </button>
              ) : (
                <button onClick={enableCamera} className="text-green-400 hover:text-green-300 text-xs flex items-center space-x-1">
                  <FiCamera />
                  <span>On</span>
                </button>
              )}
            </div>
            <div className="relative bg-gray-900 h-full">
              {cameraEnabled ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-800">
                  <div className="text-center">
                    <FiVideoOff className="text-5xl text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Camera Off</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conversation History */}
          <div className="flex-1 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <h3 className="font-bold text-lg">Conversation</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {conversation.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.role === 'ai'
                      ? 'bg-gradient-to-br from-purple-100 to-blue-100 border-2 border-purple-200'
                      : 'bg-gradient-to-br from-green-100 to-emerald-100 border-2 border-green-200'
                  }`}>
                    {msg.type === 'question' && (
                      <div className="text-xs font-bold text-purple-600 mb-2">Question {msg.questionNumber}</div>
                    )}
                    <p className={`text-sm leading-relaxed ${
                      msg.role === 'ai' ? 'text-gray-800' : 'text-gray-900 font-medium'
                    }`}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}

              {/* Live Transcript */}
              {(isListening && (transcript || interimTranscript)) && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl p-4 bg-yellow-100 border-2 border-yellow-300">
                    <div className="text-xs font-bold text-yellow-700 mb-2">You're speaking...</div>
                    <p className="text-sm text-gray-800">
                      {transcript} <span className="text-gray-500 italic">{interimTranscript}</span>
                    </p>
                  </div>
                </div>
              )}

              <div ref={conversationEndRef} />
            </div>

            {/* Microphone Control */}
            <div className="p-4 bg-white border-t-2 border-gray-100">
              <button
                onClick={handleVoiceToggle}
                disabled={isProcessing || !voiceSupported}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200 animate-pulse'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-xl hover:scale-[1.02] text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isListening ? (
                  <>
                    <FiMicOff className="text-2xl" />
                    <span>Stop & Submit</span>
                  </>
                ) : (
                  <>
                    <FiMic className="text-2xl" />
                    <span>Speak Your Answer</span>
                  </>
                )}
              </button>
              {!voiceSupported && (
                <p className="text-xs text-center text-gray-500 mt-2">Voice not supported in this browser</p>
              )}
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
            <p className="text-2xl text-purple-100">Here's your comprehensive analysis</p>
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
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-5 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all text-xl flex items-center justify-center space-x-3"
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
    <div className="flex min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <StudentSidebar />
      <div className="flex-1 md:ml-[240px]">
        {/* Header */}
        <div className="bg-white border-b-2 border-purple-100 shadow-sm sticky top-0 z-40">
          <div className="max-w-[1800px] mx-auto px-8 py-6">
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              🎙️ Conversational AI Mock Interview
            </h1>
            <p className="text-gray-600 text-lg mt-2">Natural voice conversation with real-time feedback</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {currentView === 'setup' && renderSetupView()}
          {currentView === 'conversation' && renderConversationView()}
          {currentView === 'results' && renderResultsView()}
        </div>
      </div>
    </div>
  );
};

export default ConversationalMockInterview;
