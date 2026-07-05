import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FiClock, FiCamera, FiAlertTriangle } from 'react-icons/fi';

const TakeTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [attemptId, setAttemptId] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const snapshotIntervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Start test attempt
  useEffect(() => {
    startTestAttempt();
    setupProctoring();

    return () => {
      cleanup();
    };
  }, [testId]);

  const startTestAttempt = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        `http://localhost:3001/api/attempts/start/${testId}`,
        {
          browserInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screenResolution: `${window.screen.width}x${window.screen.height}`
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const { attempt, questions: testQuestions } = response.data.data;
        setAttemptId(attempt._id);
        setSessionToken(attempt.sessionToken);
        setQuestions(testQuestions);
        setTest(attempt.testId);
        setTimeRemaining(attempt.testId.duration * 60); // Convert to seconds
        startTimeRef.current = Date.now();
      }
    } catch (error) {
      console.error('Error starting test:', error);
      alert(error.response?.data?.message || 'Failed to start test');
      navigate('/student/tests');
    } finally {
      setLoading(false);
    }
  };

  const setupProctoring = () => {
    // Start camera if required
    if (test?.settings?.requireCamera) {
      startCamera();
    }

    // Setup tab switch detection
    if (test?.settings?.detectTabSwitch) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Setup fullscreen exit detection
    if (test?.settings?.requireFullscreen) {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    }

    // Prevent right-click
    document.addEventListener('contextmenu', preventDefault);

    // Prevent copy/paste
    document.addEventListener('copy', preventDefault);
    document.addEventListener('paste', preventDefault);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Start snapshot interval
      if (test?.settings?.snapshotInterval) {
        snapshotIntervalRef.current = setInterval(
          captureSnapshot,
          test.settings.snapshotInterval * 1000
        );
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  const captureSnapshot = async () => {
    if (!videoRef.current || !attemptId) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('snapshot', blob, `snapshot-${Date.now()}.jpg`);

      try {
        const token = sessionStorage.getItem('authToken');
        await axios.post(
          `http://localhost:3001/api/attempts/${attemptId}/monitor/snapshot`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      } catch (error) {
        console.error('Snapshot upload failed:', error);
      }
    }, 'image/jpeg');
  };

  const handleVisibilityChange = async () => {
    if (document.hidden && test?.settings?.detectTabSwitch) {
      const newCount = tabSwitchCount + 1;
      setTabSwitchCount(newCount);

      // Record tab switch
      try {
        const token = sessionStorage.getItem('authToken');
        await axios.post(
          `http://localhost:3001/api/attempts/${attemptId}/monitor/tab-switch`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        console.error('Failed to record tab switch:', error);
      }

      // Show warning
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);

      // Auto-submit if limit exceeded
      if (newCount >= test.settings.maxTabSwitches) {
        alert('You have exceeded the maximum tab switch limit. Test will be submitted automatically.');
        handleSubmitTest('auto-violation');
      }
    }
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && test?.settings?.requireFullscreen) {
      alert('Please return to fullscreen mode to continue the test');
    }
  };

  const preventDefault = (e) => {
    e.preventDefault();
    return false;
  };

  // Timer
  useEffect(() => {
    if (!loading && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmitTest('auto-time');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loading, timeRemaining]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = async (optionLabel) => {
    const question = questions[currentQuestionIndex];
    const newResponses = {
      ...responses,
      [question._id]: question.questionType === 'single-choice' ? [optionLabel] :
        responses[question._id]?.includes(optionLabel)
          ? responses[question._id].filter(a => a !== optionLabel)
          : [...(responses[question._id] || []), optionLabel]
    };
    setResponses(newResponses);

    // Save answer to backend
    try {
      const token = sessionStorage.getItem('authToken');
      await axios.post(
        `http://localhost:3001/api/attempts/${attemptId}/answer`,
        {
          questionId: question._id,
          questionNumber: question.questionNumber,
          selectedAnswer: newResponses[question._id]
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to save answer:', error);
    }
  };

  const handleMarkForReview = () => {
    const question = questions[currentQuestionIndex];
    const newMarked = new Set(markedForReview);

    if (newMarked.has(question._id)) {
      newMarked.delete(question._id);
    } else {
      newMarked.add(question._id);
    }

    setMarkedForReview(newMarked);
  };

  const handleNavigation = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleSubmitTest = async (submissionType = 'manual') => {
    if (submitting) return;

    if (submissionType === 'manual') {
      const unanswered = questions.filter(q => !responses[q._id] || responses[q._id].length === 0).length;
      if (unanswered > 0) {
        const confirm = window.confirm(
          `You have ${unanswered} unanswered questions. Are you sure you want to submit?`
        );
        if (!confirm) return;
      }
    }

    setSubmitting(true);

    try {
      const token = sessionStorage.getItem('authToken');
      await axios.post(
        `http://localhost:3001/api/attempts/${attemptId}/submit`,
        { submissionType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Cleanup
      cleanup();

      // Navigate to result
      navigate(`/student/tests/${testId}/result`);
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit test. Please try again.');
      setSubmitting(false);
    }
  };

  const cleanup = () => {
    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Clear intervals
    if (timerRef.current) clearInterval(timerRef.current);
    if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);

    // Remove event listeners
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('contextmenu', preventDefault);
    document.removeEventListener('copy', preventDefault);
    document.removeEventListener('paste', preventDefault);

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const getQuestionStatus = (question) => {
    const answered = responses[question._id] && responses[question._id].length > 0;
    const marked = markedForReview.has(question._id);

    if (answered && marked) return 'answered-marked';
    if (answered) return 'answered';
    if (marked) return 'marked';
    return 'not-answered';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-white">Starting test...</p>
        </div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Warning Banner */}
      {showWarning && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-3 px-6 z-50 flex items-center justify-center gap-2 animate-pulse">
          <FiAlertTriangle size={24} />
          <span className="font-semibold">
            Warning: Tab switching detected! ({tabSwitchCount}/{test.settings.maxTabSwitches})
          </span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 shadow-lg px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{test.title}</h1>
            <p className="text-sm text-gray-400">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>

          <div className="flex items-center gap-6">
            {/* Timer */}
            <div className="flex items-center gap-2 bg-red-900 px-4 py-2 rounded-lg">
              <FiClock size={20} />
              <span className="text-lg font-mono font-bold">{formatTime(timeRemaining)}</span>
            </div>

            {/* Camera Indicator */}
            {test.settings?.requireCamera && (
              <div className="flex items-center gap-2 bg-green-900 px-4 py-2 rounded-lg">
                <FiCamera size={20} />
                <span className="text-sm">Recording</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Question Card */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-blue-600 rounded-full text-sm font-semibold">
                    Question {currentQuestion.questionNumber}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    currentQuestion.difficultyLevel === 'easy' ? 'bg-green-600' :
                    currentQuestion.difficultyLevel === 'medium' ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}>
                    {currentQuestion.difficultyLevel}
                  </span>
                  <span className="text-gray-400 text-sm">Marks: {currentQuestion.marks}</span>
                </div>
                <p className="text-lg text-white leading-relaxed">{currentQuestion.questionText}</p>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 mt-6">
              {currentQuestion.options.map((option) => {
                const isSelected = responses[currentQuestion._id]?.includes(option.optionLabel);
                return (
                  <button
                    key={option.optionLabel}
                    onClick={() => handleAnswerChange(option.optionLabel)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-500'
                      }`}>
                        {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
                      </div>
                      <span className="font-semibold text-blue-400">{option.optionLabel}.</span>
                      <span className="flex-1">{option.optionText}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-3">
                <button
                  onClick={handleMarkForReview}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    markedForReview.has(currentQuestion._id)
                      ? 'bg-yellow-600 hover:bg-yellow-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {markedForReview.has(currentQuestion._id) ? 'Unmark' : 'Mark for Review'}
                </button>

                <button
                  onClick={() => {
                    setResponses({ ...responses, [currentQuestion._id]: [] });
                  }}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                >
                  Clear Response
                </button>
              </div>

              <div className="flex gap-3">
                {currentQuestionIndex > 0 && (
                  <button
                    onClick={() => handleNavigation(currentQuestionIndex - 1)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
                  >
                    Previous
                  </button>
                )}

                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={() => handleNavigation(currentQuestionIndex + 1)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
                  >
                    Save & Next
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmitTest('manual')}
                    disabled={submitting}
                    className={`px-8 py-2 rounded-lg font-semibold transition-colors ${
                      submitting
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {submitting ? 'Submitting...' : 'Submit Test'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Question Palette Sidebar */}
        <div className="w-80 space-y-6">
          {/* Camera Preview */}
          {test.settings?.requireCamera && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Camera Preview</h3>
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full rounded-lg"
              />
            </div>
          )}

          {/* Question Palette */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Questions</h3>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {questions.map((q, index) => {
                const status = getQuestionStatus(q);
                return (
                  <button
                    key={q._id}
                    onClick={() => handleNavigation(index)}
                    className={`aspect-square rounded-lg font-semibold transition-all ${
                      index === currentQuestionIndex
                        ? 'ring-2 ring-white'
                        : ''
                    } ${
                      status === 'answered' ? 'bg-green-600 hover:bg-green-700' :
                      status === 'marked' ? 'bg-yellow-600 hover:bg-yellow-700' :
                      status === 'answered-marked' ? 'bg-purple-600 hover:bg-purple-700' :
                      'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {q.questionNumber}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-700 rounded" />
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-600 rounded" />
                <span>Marked for Review</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-600 rounded" />
                <span>Answered & Marked</span>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 pt-4 border-t border-gray-700 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Answered:</span>
                <span className="font-semibold">{Object.values(responses).filter(r => r && r.length > 0).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Not Answered:</span>
                <span className="font-semibold">{questions.length - Object.values(responses).filter(r => r && r.length > 0).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Marked:</span>
                <span className="font-semibold">{markedForReview.size}</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => handleSubmitTest('manual')}
            disabled={submitting}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              submitting
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TakeTest;
