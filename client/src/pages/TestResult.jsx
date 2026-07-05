import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FiCheckCircle, FiXCircle, FiClock, FiAward, FiTrendingUp, FiAlertTriangle } from 'react-icons/fi';

const TestResult = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [testId]);

  const fetchResult = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      console.log('Fetching result for testId:', testId);

      const response = await axios.get(
        `http://localhost:3001/api/attempts/${testId}/my-result`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Result response:', response.data);

      if (response.data.success) {
        setResult(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch result');
      }
    } catch (error) {
      console.error('Error fetching result:', error);
      console.error('Error response:', error.response?.data);

      const errorMessage = error.response?.data?.message || error.message || 'Failed to load result';
      alert(errorMessage);
      navigate('/student/tests');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading result...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const { attempt, test } = result;
  const accuracy = attempt.totalAttempted > 0
    ? ((attempt.totalCorrect / attempt.totalAttempted) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Test Result</h1>
          <p className="text-gray-600">{test.title}</p>
        </div>

        {/* Result Banner */}
        <div className={`rounded-lg shadow-lg p-8 mb-6 ${
          attempt.passed
            ? 'bg-gradient-to-r from-green-500 to-green-600'
            : 'bg-gradient-to-r from-red-500 to-red-600'
        }`}>
          <div className="text-center text-white">
            {attempt.passed ? (
              <>
                <FiCheckCircle size={64} className="mx-auto mb-4" />
                <h2 className="text-4xl font-bold mb-2">Congratulations!</h2>
                <p className="text-xl">You have passed the test</p>
              </>
            ) : (
              <>
                <FiXCircle size={64} className="mx-auto mb-4" />
                <h2 className="text-4xl font-bold mb-2">Test Not Passed</h2>
                <p className="text-xl">Better luck next time</p>
              </>
            )}
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Your Score</span>
              <FiAward className="text-blue-600" size={24} />
            </div>
            <p className="text-4xl font-bold text-blue-600">{attempt.score}</p>
            <p className="text-gray-500 text-sm mt-1">Out of {test.totalMarks}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Percentage</span>
              <FiTrendingUp className="text-green-600" size={24} />
            </div>
            <p className="text-4xl font-bold text-green-600">{attempt.percentage.toFixed(1)}%</p>
            <p className="text-gray-500 text-sm mt-1">Pass: {test.passPercentage}%</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Accuracy</span>
              <FiCheckCircle className="text-purple-600" size={24} />
            </div>
            <p className="text-4xl font-bold text-purple-600">{accuracy}%</p>
            <p className="text-gray-500 text-sm mt-1">{attempt.totalCorrect}/{attempt.totalAttempted}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Time Taken</span>
              <FiClock className="text-orange-600" size={24} />
            </div>
            <p className="text-4xl font-bold text-orange-600">{attempt.timeTaken}</p>
            <p className="text-gray-500 text-sm mt-1">Minutes</p>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Performance Breakdown */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Performance Breakdown</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <FiCheckCircle className="text-white" size={20} />
                  </div>
                  <span className="font-medium text-gray-700">Correct Answers</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{attempt.totalCorrect}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                    <FiXCircle className="text-white" size={20} />
                  </div>
                  <span className="font-medium text-gray-700">Wrong Answers</span>
                </div>
                <span className="text-2xl font-bold text-red-600">{attempt.totalWrong}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
                    <FiXCircle className="text-white" size={20} />
                  </div>
                  <span className="font-medium text-gray-700">Unattempted</span>
                </div>
                <span className="text-2xl font-bold text-gray-600">{attempt.totalSkipped}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <FiCheckCircle className="text-white" size={20} />
                  </div>
                  <span className="font-medium text-gray-700">Total Questions</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">{test.totalQuestions}</span>
              </div>
            </div>
          </div>

          {/* Rank and Proctoring */}
          <div className="space-y-6">
            {/* Rank Card */}
            {attempt.rank && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Your Rank</h3>
                <div className="text-center">
                  <div className="inline-block p-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-3">
                    <FiAward size={48} className="text-white" />
                  </div>
                  <p className="text-5xl font-bold text-gray-800">{attempt.rank}</p>
                  <p className="text-gray-600 mt-2">In your batch</p>
                </div>
              </div>
            )}

            {/* Proctoring Info */}
            {attempt.proctoring?.hasViolations && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <FiAlertTriangle size={24} className="text-yellow-600" />
                  <h3 className="text-lg font-bold text-yellow-800">Proctoring Violations</h3>
                </div>
                <div className="space-y-2 text-sm text-yellow-800">
                  {attempt.proctoring.tabSwitchCount > 0 && (
                    <p>Tab Switches: {attempt.proctoring.tabSwitchCount}</p>
                  )}
                  {attempt.proctoring.fullscreenExitCount > 0 && (
                    <p>Fullscreen Exits: {attempt.proctoring.fullscreenExitCount}</p>
                  )}
                  {attempt.proctoring.autoSubmittedDueToViolation && (
                    <p className="font-semibold">Test was auto-submitted due to violations</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submission Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Submission Details</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Submission Type</p>
              <p className="font-semibold text-gray-800">
                {attempt.submissionType === 'manual' ? 'Manual Submit' :
                 attempt.submissionType === 'auto-time' ? 'Auto-Submit (Time Up)' :
                 attempt.submissionType === 'auto-violation' ? 'Auto-Submit (Violation)' :
                 'Force Submit'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Started At</p>
              <p className="font-semibold text-gray-800">
                {new Date(attempt.startedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Submitted At</p>
              <p className="font-semibold text-gray-800">
                {new Date(attempt.submittedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate('/student/tests')}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Tests
          </button>

          {test.settings?.allowAnswerReview && (
            <button
              onClick={() => navigate(`/student/tests/${testId}/review`)}
              className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
            >
              Review Answers
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestResult;
