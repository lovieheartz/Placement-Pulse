import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FiVideo, FiPlay, FiSend, FiClock, FiTarget, FiTrendingUp, FiCheckCircle, FiAlertCircle, FiTrash2, FiEye, FiCamera, FiMic, FiVideoOff } from 'react-icons/fi';
import StudentSidebar from '../components/StudentSidebar';

const MockInterviewPage = () => {
  const [currentView, setCurrentView] = useState('setup'); // 'setup', 'interview', 'results', 'history'
  const [interviewConfig, setInterviewConfig] = useState({
    jobRole: '',
    industry: '',
    difficulty: 'medium',
    totalQuestions: 5
  });

  const [currentInterview, setCurrentInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  // Camera states
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraPermission, setCameraPermission] = useState('prompt'); // 'prompt', 'granted', 'denied'
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // AI Avatar animation states
  const [aiSpeaking, setAiSpeaking] = useState(false);

  useEffect(() => {
    fetchHistory();
    checkCameraPermission();

    return () => {
      // Cleanup camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // ========== CAMERA FUNCTIONS ==========
  const checkCameraPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'camera' });
      setCameraPermission(result.state);
      result.addEventListener('change', () => {
        setCameraPermission(result.state);
      });
    } catch (error) {
      console.log('Permission API not supported');
    }
  };

  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setCameraEnabled(true);
      setCameraPermission('granted');
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraPermission('denied');
      alert('Camera access denied. You can continue without camera, but it\'s recommended for better interview practice.');
    }
  };

  const disableCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraEnabled(false);
  };

  // ========== FETCH HISTORY ==========
  const fetchHistory = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.get('http://localhost:3001/api/mock-interview/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHistory(response.data.data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  // ========== START INTERVIEW ==========
  const startInterview = async () => {
    if (!interviewConfig.jobRole.trim()) {
      alert('Please enter a job role');
      return;
    }

    // Enable camera before starting
    if (!cameraEnabled) {
      await enableCamera();
    }

    setIsSubmitting(true);
    setAiSpeaking(true);

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        'http://localhost:3001/api/mock-interview/start',
        {
          ...interviewConfig,
          experienceLevel: 'fresher' // All students are freshers
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const { interviewId, currentQuestion: firstQuestion } = response.data.data;
      setCurrentInterview(interviewId);
      setCurrentQuestion(firstQuestion.question);
      setQuestionNumber(firstQuestion.questionNumber);
      setCurrentView('interview');

      // Simulate AI speaking animation
      setTimeout(() => setAiSpeaking(false), 2000);
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== SUBMIT ANSWER ==========
  const submitAnswer = async () => {
    if (!currentAnswer.trim()) {
      alert('Please provide an answer');
      return;
    }

    setIsSubmitting(true);
    setAiSpeaking(true);

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        `http://localhost:3001/api/mock-interview/${currentInterview}/submit`,
        { answer: currentAnswer },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const { isCompleted, nextQuestion, finalReport } = response.data.data;

      if (isCompleted) {
        // Interview completed
        setResults(finalReport);
        setCurrentView('results');
        fetchHistory();
        disableCamera(); // Turn off camera
      } else {
        // Move to next question
        setCurrentQuestion(nextQuestion.question);
        setQuestionNumber(nextQuestion.questionNumber);
        setCurrentAnswer('');
        setTimeout(() => setAiSpeaking(false), 2000);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
      setAiSpeaking(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== VIEW HISTORY DETAILS ==========
  const viewHistoryDetails = async (interviewId) => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.get(
        `http://localhost:3001/api/mock-interview/${interviewId}/results`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setSelectedHistoryItem(response.data.data);
      setCurrentView('history-detail');
    } catch (error) {
      console.error('Error fetching interview details:', error);
      alert('Failed to load interview details');
    }
  };

  // ========== DELETE HISTORY ITEM ==========
  const deleteHistoryItem = async (interviewId) => {
    if (!confirm('Are you sure you want to delete this interview?')) return;

    try {
      const token = sessionStorage.getItem('authToken');
      await axios.delete(
        `http://localhost:3001/api/mock-interview/${interviewId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      fetchHistory();
      alert('Interview deleted successfully');
    } catch (error) {
      console.error('Error deleting interview:', error);
      alert('Failed to delete interview');
    }
  };

  // ========== RENDER SETUP VIEW ==========
  const renderSetupView = () => (
    <div className="max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Configuration */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-purple-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl mb-4 shadow-lg">
              <FiVideo className="text-white text-4xl" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Mock Interview</h2>
            <p className="text-gray-600">Practice with AI-powered interview simulation</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Job Role <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800"
                placeholder="e.g., Software Engineer, Data Analyst"
                value={interviewConfig.jobRole}
                onChange={(e) => setInterviewConfig({ ...interviewConfig, jobRole: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Industry (Optional)</label>
              <input
                type="text"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800"
                placeholder="e.g., Technology, Finance, Healthcare"
                value={interviewConfig.industry}
                onChange={(e) => setInterviewConfig({ ...interviewConfig, industry: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Difficulty</label>
                <select
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800"
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800"
                  value={interviewConfig.totalQuestions}
                  onChange={(e) => setInterviewConfig({ ...interviewConfig, totalQuestions: parseInt(e.target.value) })}
                >
                  <option value={3}>3 (~5 min)</option>
                  <option value={5}>5 (~10 min)</option>
                  <option value={7}>7 (~15 min)</option>
                  <option value={10}>10 (~20 min)</option>
                </select>
              </div>
            </div>

            <button
              onClick={startInterview}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiPlay className="text-xl" />
              <span>{isSubmitting ? 'Starting Interview...' : 'Start Interview'}</span>
            </button>

            {/* Camera Permission Info */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <FiCamera className="text-blue-600 text-xl flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-blue-900 mb-1">Camera Required</h4>
                  <p className="text-sm text-blue-700">
                    We'll request camera access for a realistic interview experience.
                    Your video is not recorded or stored.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI Interviewer Preview */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-6">Meet Your AI Interviewer</h3>

          {/* AI Avatar */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 bg-gradient-to-br from-white/30 to-white/10 rounded-full flex items-center justify-center shadow-2xl">
                  <div className={`w-28 h-28 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center ${aiSpeaking ? 'animate-pulse' : ''}`}>
                    <FiVideo className="text-6xl text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>

              <h4 className="text-xl font-bold mb-2">AI Interview Assistant</h4>
              <p className="text-purple-100 text-center text-sm">
                Powered by Google Gemini AI
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <FiCheckCircle className="text-green-300 text-xl flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-bold mb-1">Personalized Questions</h5>
                <p className="text-sm text-purple-100">Role-specific questions tailored to your target job</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <FiCheckCircle className="text-green-300 text-xl flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-bold mb-1">Instant Feedback</h5>
                <p className="text-sm text-purple-100">Get detailed analysis and improvement suggestions</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <FiCheckCircle className="text-green-300 text-xl flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-bold mb-1">Realistic Experience</h5>
                <p className="text-sm text-purple-100">Practice in a safe environment before the real thing</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Preview */}
      {history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-gray-900">Recent Interviews</h3>
            <button
              onClick={() => setCurrentView('history')}
              className="text-purple-600 font-bold hover:text-purple-700 transition-colors flex items-center space-x-2"
            >
              <span>View All</span>
              <span>→</span>
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {history.slice(0, 3).map((item) => (
              <div key={item._id} className="bg-white rounded-xl p-5 shadow-lg border border-purple-100 hover:shadow-xl transition-all cursor-pointer" onClick={() => viewHistoryDetails(item._id)}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-900 truncate flex-1">{item.jobRole}</h4>
                  {item.overallScore && (
                    <div className="flex items-center space-x-1 ml-2">
                      <div className={`text-2xl font-bold ${item.overallScore >= 75 ? 'text-green-600' : item.overallScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {item.overallScore}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(item.startedAt).toLocaleDateString()} • {item.difficulty}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ========== RENDER INTERVIEW VIEW ==========
  const renderInterviewView = () => (
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: AI Interviewer & Your Video */}
        <div className="lg:col-span-1 space-y-6">
          {/* AI Interviewer */}
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white font-bold">AI Interviewer</span>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
                <div className="flex flex-col items-center">
                  <div className={`w-40 h-40 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center mb-4 ${aiSpeaking ? 'animate-pulse ring-4 ring-white/50' : ''}`}>
                    <FiVideo className="text-7xl text-white" />
                  </div>
                  <p className="text-white text-center text-sm">
                    {aiSpeaking ? 'Analyzing your response...' : 'Listening...'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Your Video */}
          <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-gray-800 flex items-center justify-between">
              <span className="text-white font-bold flex items-center space-x-2">
                <FiCamera />
                <span>You</span>
              </span>
              {cameraEnabled ? (
                <button onClick={disableCamera} className="text-red-400 hover:text-red-300 flex items-center space-x-2 text-sm">
                  <FiVideoOff />
                  <span>Turn Off</span>
                </button>
              ) : (
                <button onClick={enableCamera} className="text-green-400 hover:text-green-300 flex items-center space-x-2 text-sm">
                  <FiCamera />
                  <span>Turn On</span>
                </button>
              )}
            </div>
            <div className="relative bg-gray-900" style={{ paddingBottom: '75%' }}>
              {cameraEnabled ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <FiVideoOff className="text-6xl text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">Camera Off</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interview Progress */}
          <div className="bg-white rounded-xl shadow-lg p-5 border border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-700">Progress</span>
              <span className="text-sm font-bold text-purple-600">
                {questionNumber}/{interviewConfig.totalQuestions}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(questionNumber / interviewConfig.totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Right: Question & Answer */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold">{interviewConfig.jobRole}</h2>
                <div className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <FiClock />
                  <span className="font-bold">Question {questionNumber}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded-full">{interviewConfig.difficulty}</span>
                {interviewConfig.industry && (
                  <span className="bg-white/20 px-3 py-1 rounded-full">{interviewConfig.industry}</span>
                )}
              </div>
            </div>

            {/* Question */}
            <div className="p-8 flex-1 flex flex-col">
              <div className="mb-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    Q{questionNumber}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Interview Question</h3>
                    <p className="text-xl text-gray-800 leading-relaxed">{currentQuestion}</p>
                  </div>
                </div>
              </div>

              {/* Answer Input */}
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-bold text-gray-700 mb-2">Your Answer</label>
                <textarea
                  className="flex-1 w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none resize-none text-gray-800"
                  placeholder="Type your answer here... Be specific and provide examples."
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  style={{ minHeight: '200px' }}
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold">{currentAnswer.split(' ').filter(w => w).length}</span> words
                  </p>
                  <p className="text-xs text-gray-400">
                    Tip: Aim for 50-150 words
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={submitAnswer}
                disabled={isSubmitting || !currentAnswer.trim()}
                className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <FiSend className="text-xl" />
                <span className="text-lg">
                  {isSubmitting
                    ? 'Analyzing Answer...'
                    : questionNumber === interviewConfig.totalQuestions
                      ? 'Complete Interview'
                      : 'Submit & Continue'}
                </span>
              </button>
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

    const getReadinessColor = (level) => {
      const colors = {
        'excellent': 'bg-green-100 text-green-800 border-green-300',
        'well_prepared': 'bg-blue-100 text-blue-800 border-blue-300',
        'ready': 'bg-purple-100 text-purple-800 border-purple-300',
        'needs_improvement': 'bg-yellow-100 text-yellow-800 border-yellow-300',
        'not_ready': 'bg-red-100 text-red-800 border-red-300'
      };
      return colors[level] || 'bg-gray-100 text-gray-800 border-gray-300';
    };

    const getReadinessText = (level) => {
      const texts = {
        'excellent': '🌟 Excellent!',
        'well_prepared': '💪 Well Prepared',
        'ready': '✅ Ready',
        'needs_improvement': '📈 Needs Improvement',
        'not_ready': '🔄 Keep Practicing'
      };
      return texts[level] || level;
    };

    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 rounded-full mb-6 backdrop-blur-lg">
                <FiCheckCircle className="text-6xl" />
              </div>
              <h2 className="text-4xl font-bold mb-3">Interview Complete! 🎉</h2>
              <p className="text-xl text-purple-100">Here's your detailed performance analysis</p>
            </div>
          </div>

          {/* Overall Score */}
          <div className="p-10 border-b border-gray-100">
            <div className="text-center mb-10">
              <div className={`text-8xl font-black ${getScoreColor(results.overallScore)} mb-3`}>
                {results.overallScore}
              </div>
              <div className="text-3xl text-gray-400 font-light mb-6">out of 100</div>
              {results.overallFeedback?.readinessLevel && (
                <span className={`inline-block px-8 py-3 rounded-full text-lg font-bold border-2 ${getReadinessColor(results.overallFeedback.readinessLevel)}`}>
                  {getReadinessText(results.overallFeedback.readinessLevel)}
                </span>
              )}
            </div>

            {/* Category Scores */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200">
                <FiTarget className="text-4xl text-purple-600 mx-auto mb-3" />
                <div className="text-4xl font-bold text-purple-900 mb-2">{results.technicalScore}</div>
                <div className="text-sm font-semibold text-purple-700">Technical Skills</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200">
                <FiTrendingUp className="text-4xl text-blue-600 mx-auto mb-3" />
                <div className="text-4xl font-bold text-blue-900 mb-2">{results.communicationScore}</div>
                <div className="text-sm font-semibold text-blue-700">Communication</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200">
                <FiCheckCircle className="text-4xl text-green-600 mx-auto mb-3" />
                <div className="text-4xl font-bold text-green-900 mb-2">{results.confidenceScore}</div>
                <div className="text-sm font-semibold text-green-700">Confidence</div>
              </div>
            </div>
          </div>

          {/* Detailed Feedback */}
          {results.overallFeedback && (
            <div className="p-10 space-y-8">
              {/* Strengths */}
              {results.overallFeedback.strengths?.length > 0 && (
                <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-200">
                  <h3 className="text-2xl font-bold text-green-900 mb-4 flex items-center">
                    <FiCheckCircle className="mr-3 text-3xl" />
                    Key Strengths
                  </h3>
                  <ul className="space-y-3">
                    {results.overallFeedback.strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-start text-lg">
                        <span className="text-green-600 mr-3 text-2xl font-bold">✓</span>
                        <span className="text-green-900">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Areas for Improvement */}
              {results.overallFeedback.areasForImprovement?.length > 0 && (
                <div className="bg-yellow-50 rounded-2xl p-6 border-2 border-yellow-200">
                  <h3 className="text-2xl font-bold text-yellow-900 mb-4 flex items-center">
                    <FiAlertCircle className="mr-3 text-3xl" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-3">
                    {results.overallFeedback.areasForImprovement.map((area, idx) => (
                      <li key={idx} className="flex items-start text-lg">
                        <span className="text-yellow-600 mr-3 text-2xl font-bold">→</span>
                        <span className="text-yellow-900">{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {results.overallFeedback.recommendations?.length > 0 && (
                <div className="bg-purple-50 rounded-2xl p-6 border-2 border-purple-200">
                  <h3 className="text-2xl font-bold text-purple-900 mb-4 flex items-center">
                    <FiTarget className="mr-3 text-3xl" />
                    Recommendations
                  </h3>
                  <ul className="space-y-3">
                    {results.overallFeedback.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start text-lg">
                        <span className="text-purple-600 mr-3 text-2xl font-bold">●</span>
                        <span className="text-purple-900">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="p-8 bg-gray-50 flex gap-4">
            <button
              onClick={() => {
                setCurrentView('setup');
                setCurrentInterview(null);
                setResults(null);
                setCurrentAnswer('');
              }}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all text-lg"
            >
              Try Another Interview
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className="flex-1 bg-white text-purple-600 font-bold py-4 rounded-xl border-2 border-purple-600 hover:bg-purple-50 transition-all text-lg"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========== RENDER HISTORY VIEW ==========
  const renderHistoryView = () => (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Interview History</h2>
        <button
          onClick={() => setCurrentView('setup')}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:shadow-xl hover:scale-105 transition-all"
        >
          New Interview
        </button>
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-2xl p-16 text-center">
          <FiVideo className="text-8xl text-gray-300 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No interviews yet</h3>
          <p className="text-gray-500 text-lg mb-8">Start your first mock interview to practice and improve!</p>
          <button
            onClick={() => setCurrentView('setup')}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:shadow-xl transition-all"
          >
            Start First Interview
          </button>
        </div>
      ) : (
        <div className="grid gap-5">
          {history.map((item) => (
            <div key={item._id} className="bg-white rounded-2xl shadow-xl p-7 border-2 border-purple-100 hover:shadow-2xl hover:scale-[1.01] transition-all">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{item.jobRole}</h3>
                  <div className="flex items-center flex-wrap gap-3 text-sm text-gray-600 mb-4">
                    <span className="flex items-center bg-gray-100 px-3 py-1 rounded-lg">
                      <FiClock className="mr-2" />
                      {new Date(item.startedAt).toLocaleDateString()}
                    </span>
                    <span className="bg-purple-100 text-purple-700 px-4 py-1 rounded-lg font-bold">
                      {item.difficulty}
                    </span>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg">
                      {item.questions?.length || 0} Questions
                    </span>
                    {item.duration && (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg">
                        {item.duration} mins
                      </span>
                    )}
                  </div>
                  {item.overallScore !== undefined && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-semibold text-gray-700">Score:</span>
                      <div className="flex items-baseline">
                        <span className={`text-5xl font-black ${item.overallScore >= 75 ? 'text-green-600' : item.overallScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {item.overallScore}
                        </span>
                        <span className="text-2xl text-gray-400 ml-1">/100</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3 ml-6">
                  <button
                    onClick={() => viewHistoryDetails(item._id)}
                    className="bg-purple-600 text-white p-4 rounded-xl hover:bg-purple-700 transition-all shadow-lg hover:scale-110"
                    title="View Details"
                  >
                    <FiEye className="text-2xl" />
                  </button>
                  <button
                    onClick={() => deleteHistoryItem(item._id)}
                    className="bg-red-600 text-white p-4 rounded-xl hover:bg-red-700 transition-all shadow-lg hover:scale-110"
                    title="Delete"
                  >
                    <FiTrash2 className="text-2xl" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ========== RENDER HISTORY DETAIL VIEW ==========
  const renderHistoryDetailView = () => {
    if (!selectedHistoryItem) return null;

    return (
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => {
            setCurrentView('history');
            setSelectedHistoryItem(null);
          }}
          className="mb-6 text-purple-600 font-bold hover:text-purple-700 flex items-center space-x-2 text-lg"
        >
          <span>←</span>
          <span>Back to History</span>
        </button>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-8">
            <h2 className="text-3xl font-bold mb-3">{selectedHistoryItem.jobRole}</h2>
            <div className="flex items-center space-x-4 text-sm">
              <span className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                {new Date(selectedHistoryItem.startedAt).toLocaleDateString()}
              </span>
              <span className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                {selectedHistoryItem.difficulty}
              </span>
              <span className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                Score: {selectedHistoryItem.overallScore}/100
              </span>
            </div>
          </div>

          {/* Questions and Answers */}
          <div className="p-8 space-y-6">
            {selectedHistoryItem.questions?.map((q, idx) => (
              <div key={idx} className="border-2 border-gray-100 rounded-2xl p-6 hover:border-purple-200 transition-all">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    {q.questionNumber}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-3">{q.question}</h3>
                    <div className="bg-gray-50 p-5 rounded-xl mb-4 border border-gray-200">
                      <p className="text-gray-800 leading-relaxed">{q.studentAnswer}</p>
                    </div>
                    {q.aiScore !== undefined && (
                      <div className="flex items-center flex-wrap gap-3 text-sm">
                        <span className="font-bold text-purple-600 bg-purple-100 px-4 py-2 rounded-lg">
                          Score: {q.aiScore}/10
                        </span>
                        {q.strengths?.length > 0 && (
                          <span className="text-green-600 bg-green-100 px-4 py-2 rounded-lg font-semibold">
                            ✓ {q.strengths.length} strengths
                          </span>
                        )}
                        {q.weaknesses?.length > 0 && (
                          <span className="text-yellow-600 bg-yellow-100 px-4 py-2 rounded-lg font-semibold">
                            → {q.weaknesses.length} improvements
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <StudentSidebar />
      <div className="flex-1 md:ml-[240px]">
        {/* Main Header - Always Visible */}
        <div className="bg-white border-b-2 border-purple-100 shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  AI Mock Interview
                </h1>
                <p className="text-gray-600 text-lg">Practice and perfect your interview skills with AI-powered feedback</p>
              </div>
              {currentView !== 'setup' && currentView !== 'interview' && (
                <button
                  onClick={() => setCurrentView('setup')}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:shadow-xl transition-all"
                >
                  New Interview
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === 'setup' && renderSetupView()}
            {currentView === 'interview' && renderInterviewView()}
            {currentView === 'results' && renderResultsView()}
            {currentView === 'history' && renderHistoryView()}
            {currentView === 'history-detail' && renderHistoryDetailView()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockInterviewPage;
