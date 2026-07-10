import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiMic, FiMicOff, FiVolume2, FiVolumeX, FiPlay, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import StudentSidebar from '../components/StudentSidebar';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import useTextToSpeech from '../hooks/useTextToSpeech';
import { API_BASE } from '../config/api';

const VoiceInterviewPage = () => {
  const navigate = useNavigate();

  // Interview states
  const [currentView, setCurrentView] = useState('setup'); // 'setup', 'interview', 'results'
  const [interviewConfig, setInterviewConfig] = useState({
    jobRole: '',
    industry: '',
    difficulty: 'medium',
    totalQuestions: 5
  });

  const [currentInterview, setCurrentInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  // Voice hooks
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: voiceSupported,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript
  } = useVoiceRecognition();

  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
    isSupported: ttsSupported
  } = useTextToSpeech();

  // Settings
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [studentName, setStudentName] = useState('Student');

  useEffect(() => {
    // Get student name
    const name = sessionStorage.getItem('studentName') || sessionStorage.getItem('userName') || 'Student';
    setStudentName(name);
  }, []);

  // Auto-speak questions when they load
  useEffect(() => {
    if (currentQuestion && currentView === 'interview' && audioEnabled && ttsSupported) {
      setTimeout(() => {
        speak(currentQuestion).then(() => {
          console.log('✅ Question spoken, ready for answer');
        });
      }, 800);
    }
  }, [currentQuestion]);

  // Auto-speak welcome message
  useEffect(() => {
    if (currentView === 'interview' && audioEnabled && ttsSupported && questionNumber === 1) {
      setTimeout(() => {
        speak(`Hello ${studentName}! Welcome to your AI mock interview. Let's begin with the first question.`);
      }, 1000);
    }
  }, [currentView]);

  // ========== START INTERVIEW ==========
  const startInterview = async () => {
    if (!interviewConfig.jobRole.trim()) {
      alert('Please enter a job role');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE}/api/mock-interview/start`,
        {
          ...interviewConfig,
          experienceLevel: 'fresher'
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const { interviewId, currentQuestion: firstQuestion } = response.data.data;
      setCurrentInterview(interviewId);
      setCurrentQuestion(firstQuestion.question);
      setQuestionNumber(firstQuestion.questionNumber);
      setCurrentView('interview');

    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview. Please ensure you\'re logged in as a student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== SUBMIT ANSWER ==========
  const submitAnswer = async () => {
    const answer = transcript.trim();

    if (!answer) {
      alert('Please provide an answer by speaking into the microphone');
      return;
    }

    // Stop listening and speaking
    if (isListening) stopListening();
    if (isSpeaking) stopSpeaking();

    setIsSubmitting(true);

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE}/api/mock-interview/${currentInterview}/submit`,
        { answer },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const { isCompleted, nextQuestion, finalReport } = response.data.data;

      resetTranscript();

      if (isCompleted) {
        setResults(finalReport);
        setCurrentView('results');

        // Speak final results
        if (audioEnabled) {
          setTimeout(() => {
            const summary = `Congratulations! You've completed the interview. Your overall score is ${finalReport.overallScore} out of 100.
            Your technical score is ${finalReport.technicalScore},
            communication score is ${finalReport.communicationScore},
            and confidence score is ${finalReport.confidenceScore}.`;
            speak(summary);
          }, 1000);
        }
      } else {
        setCurrentQuestion(nextQuestion.question);
        setQuestionNumber(nextQuestion.questionNumber);
      }

    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== RENDER SETUP VIEW ==========
  const renderSetupView = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-lg">
              <FiMic className="text-5xl" />
            </div>
            <h2 className="text-4xl font-bold mb-2">🎤 Voice AI Interview</h2>
            <p className="text-xl text-purple-100">Speak naturally, get instant AI feedback</p>
          </div>
        </div>

        {/* Setup Form */}
        <div className="p-8 space-y-6">
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
              placeholder="e.g., Technology, Finance"
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
              </select>
            </div>
          </div>

          {/* Browser Compatibility Check */}
          <div className={`p-4 rounded-xl ${voiceSupported && ttsSupported ? 'bg-green-50 border-2 border-green-200' : 'bg-yellow-50 border-2 border-yellow-200'}`}>
            <div className="flex items-start space-x-3">
              {voiceSupported && ttsSupported ? (
                <>
                  <FiCheckCircle className="text-green-600 text-xl flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-green-900 mb-1">✅ Voice Ready!</h4>
                    <p className="text-sm text-green-700">
                      Your browser supports voice recognition and AI speech.
                      The AI will speak questions and listen to your answers.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <FiAlertCircle className="text-yellow-600 text-xl flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-yellow-900 mb-1">⚠️ Limited Voice Support</h4>
                    <p className="text-sm text-yellow-700">
                      Please use Chrome or Edge for full voice features.
                      {!voiceSupported && ' Voice recognition not supported.'}
                      {!ttsSupported && ' AI voice not supported.'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={startInterview}
            disabled={isSubmitting || !voiceSupported}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            <FiPlay className="text-xl" />
            <span>{isSubmitting ? 'Starting...' : '🎤 Start Voice Interview'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  // ========== RENDER INTERVIEW VIEW ==========
  const renderInterviewView = () => (
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: AI Avatar */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-2xl overflow-hidden sticky top-4">
            <div className="p-6">
              {/* Status */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-green-400 animate-pulse' : isListening ? 'bg-red-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-white font-bold text-sm">
                    {isSpeaking ? '🔊 AI Speaking' : isListening ? '🎤 Listening' : '⏸️ Waiting'}
                  </span>
                </div>

                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                >
                  {audioEnabled ? <FiVolume2 className="text-white" /> : <FiVolumeX className="text-white" />}
                </button>
              </div>

              {/* AI Avatar - Realistic Human */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 relative">
                <div className="flex flex-col items-center">
                  {/* Avatar with Animation */}
                  <div className="relative">
                    {/* Speaking waves */}
                    {isSpeaking && (
                      <>
                        <div className="absolute inset-0 w-48 h-48 -left-4 -top-4 border-4 border-white/30 rounded-full animate-ping"></div>
                        <div className="absolute inset-0 w-52 h-52 -left-6 -top-6 border-4 border-white/20 rounded-full animate-ping" style={{ animationDelay: '0.3s' }}></div>
                      </>
                    )}

                    {/* Human Avatar - Professional female interviewer */}
                    <div className={`w-40 h-40 rounded-full overflow-hidden shadow-2xl border-4 ${isSpeaking ? 'border-green-400 animate-pulse' : 'border-white'} transition-all`}>
                      <img
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=interviewer&backgroundColor=b6e3f4&hair=shortHair&facialHair=none&mouth=smile&eyes=default&eyebrow=default&top=shortHairShortFlat&clothesColor=blue"
                        alt="AI Interviewer"
                        className={`w-full h-full object-cover ${isSpeaking ? 'scale-110' : 'scale-100'} transition-transform`}
                      />
                    </div>

                    {/* Listening indicator */}
                    {isListening && (
                      <div className="absolute -bottom-2 -right-2 bg-red-500 rounded-full p-3 animate-pulse">
                        <FiMic className="text-white text-xl" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-white font-bold text-lg mt-4">AI Interview Assistant</h3>
                  <p className="text-purple-100 text-center text-sm mt-2">
                    {isSpeaking
                      ? 'Asking you a question...'
                      : isListening
                        ? 'Listening carefully to your answer...'
                        : 'Ready when you are!'}
                  </p>

                  {/* Waveform when listening */}
                  {isListening && (
                    <div className="flex items-center justify-center space-x-1 mt-4 h-12">
                      {[...Array(15)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-white/80 rounded-full animate-pulse"
                          style={{
                            height: `${20 + Math.sin(i) * 20}px`,
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: '0.6s'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-semibold">Progress</span>
                  <span className="text-white text-sm font-bold">
                    {questionNumber}/{interviewConfig.totalQuestions}
                  </span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(questionNumber / interviewConfig.totalQuestions) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Question & Answer */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
              <h2 className="text-2xl font-bold mb-2">{interviewConfig.jobRole}</h2>
              <div className="flex items-center space-x-3 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded-full">Question {questionNumber}</span>
                <span className="bg-white/20 px-3 py-1 rounded-full">{interviewConfig.difficulty}</span>
              </div>
            </div>

            {/* Question */}
            <div className="p-8">
              <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6 mb-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg text-xl">
                    Q{questionNumber}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Interview Question</h3>
                    <p className="text-xl text-gray-800 leading-relaxed">{currentQuestion}</p>

                    {isSpeaking && (
                      <div className="mt-4 flex items-center space-x-2 text-purple-600">
                        <FiVolume2 className="animate-pulse" />
                        <span className="text-sm font-semibold">AI is speaking this question...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Voice Answer Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">🎤 Speak Your Answer</h3>
                  {transcript && (
                    <span className="text-sm text-purple-600 font-semibold">
                      {transcript.split(' ').filter(w => w).length} words
                    </span>
                  )}
                </div>

                {/* Microphone Control */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-8 flex flex-col items-center">
                  {/* Main Mic Button */}
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isSubmitting || isSpeaking}
                    className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                      isListening
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110'
                        : 'bg-gradient-to-br from-purple-600 to-blue-600 hover:scale-110'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isListening ? (
                      <FiMicOff className="text-white text-5xl" />
                    ) : (
                      <FiMic className="text-white text-5xl" />
                    )}
                  </button>

                  <p className="mt-6 text-lg font-bold text-gray-700">
                    {isListening ? '🎤 Recording... Click to stop' : '🎤 Click to start speaking'}
                  </p>

                  {/* Live Transcript */}
                  {(transcript || interimTranscript) && (
                    <div className="mt-6 w-full bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-gray-700">Your Answer (Live)</h4>
                        <button
                          onClick={resetTranscript}
                          disabled={isListening}
                          className="text-sm text-red-600 hover:text-red-700 font-semibold disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>
                      <p className="text-gray-800 text-lg leading-relaxed">
                        {transcript}
                        {interimTranscript && (
                          <span className="text-gray-400 italic"> {interimTranscript}...</span>
                        )}
                      </p>
                    </div>
                  )}

                  {voiceError && (
                    <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm">
                      ⚠️ {voiceError}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  onClick={submitAnswer}
                  disabled={isSubmitting || !transcript || isListening || isSpeaking}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-lg"
                >
                  <FiCheckCircle className="text-2xl" />
                  <span>
                    {isSubmitting
                      ? '⏳ Analyzing...'
                      : questionNumber === interviewConfig.totalQuestions
                        ? '🎉 Complete Interview'
                        : '➡️ Submit & Next Question'}
                  </span>
                </button>
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
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 rounded-full mb-6 backdrop-blur-lg">
                <FiCheckCircle className="text-6xl" />
              </div>
              <h2 className="text-4xl font-bold mb-3">🎉 Interview Complete!</h2>
              <p className="text-xl text-purple-100">Here's your performance analysis</p>
            </div>
          </div>

          <div className="p-10">
            <div className="text-center mb-10">
              <div className={`text-8xl font-black ${getScoreColor(results.overallScore)} mb-3`}>
                {results.overallScore}
              </div>
              <div className="text-3xl text-gray-400 font-light mb-6">out of 100</div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200">
                <div className="text-4xl font-bold text-purple-900 mb-2">{results.technicalScore}</div>
                <div className="text-sm font-semibold text-purple-700">Technical</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200">
                <div className="text-4xl font-bold text-blue-900 mb-2">{results.communicationScore}</div>
                <div className="text-sm font-semibold text-blue-700">Communication</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200">
                <div className="text-4xl font-bold text-green-900 mb-2">{results.confidenceScore}</div>
                <div className="text-sm font-semibold text-green-700">Confidence</div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:shadow-2xl transition-all text-lg"
              >
                Try Another Interview
              </button>
              <button
                onClick={() => navigate('/student/dashboard')}
                className="flex-1 bg-white text-purple-600 font-bold py-4 rounded-xl border-2 border-purple-600 hover:bg-purple-50 transition-all text-lg"
              >
                Back to Dashboard
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
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  🎤 Voice AI Interview
                </h1>
                <p className="text-gray-600 text-lg">Real-time voice-to-voice interview with AI</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8">
          {currentView === 'setup' && renderSetupView()}
          {currentView === 'interview' && renderInterviewView()}
          {currentView === 'results' && renderResultsView()}
        </div>
      </div>
    </div>
  );
};

export default VoiceInterviewPage;
