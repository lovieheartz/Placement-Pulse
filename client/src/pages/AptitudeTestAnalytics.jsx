import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const AptitudeTestAnalytics = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [test, setTest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [id]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('authToken');

      const response = await axios.get(
        `http://localhost:3001/api/aptitude/tests/${id}/analytics`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setAnalytics(response.data.data);

      // Fetch test details separately
      const testResponse = await axios.get(
        `http://localhost:3001/api/aptitude/tests/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setTest(testResponse.data.data);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      alert('Failed to load analytics: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshAnalytics = async () => {
    setIsRefreshing(true);
    try {
      const token = sessionStorage.getItem('authToken');

      const response = await axios.post(
        `http://localhost:3001/api/aptitude/tests/${id}/analytics/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setAnalytics(response.data.data);
      alert('Analytics refreshed successfully!');

    } catch (error) {
      console.error('Error refreshing analytics:', error);
      alert('Failed to refresh analytics: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics || !test) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">Failed to load analytics</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { statistics } = analytics;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate(-1)}
                className="mb-2 text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h1 className="text-3xl font-bold text-gray-800">{test.title}</h1>
              <p className="text-gray-600 mt-1">Test Analytics & Performance Report</p>
            </div>
            <button
              onClick={handleRefreshAnalytics}
              disabled={isRefreshing}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
                isRefreshing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? 'Refreshing...' : 'Refresh Analytics'}
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Attempts */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Attempts</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{statistics?.totalAttempts || 0}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{statistics?.completedAttempts || 0}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Average Score</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {statistics?.averageScore ? statistics.averageScore.toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pass Rate */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pass Rate</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {statistics?.passRate ? `${statistics.passRate.toFixed(1)}%` : '0%'}
                </p>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Score Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Score Distribution</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Highest Score</span>
                  <span className="text-lg font-bold text-green-600">
                    {statistics?.highestScore || 0} / {test.totalMarks}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Lowest Score</span>
                  <span className="text-lg font-bold text-red-600">
                    {statistics?.lowestScore || 0} / {test.totalMarks}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Average Percentage</span>
                  <span className="text-lg font-bold text-blue-600">
                    {statistics?.averagePercentage ? `${statistics.averagePercentage.toFixed(2)}%` : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Attempt Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Attempt Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Completed</span>
                <span className="text-lg font-bold text-green-600">{statistics?.completedAttempts || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">In Progress</span>
                <span className="text-lg font-bold text-yellow-600">{statistics?.inProgressAttempts || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Abandoned</span>
                <span className="text-lg font-bold text-red-600">{statistics?.abandonedAttempts || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pass/Fail Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Pass/Fail Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <p className="text-sm text-gray-600 font-medium mb-2">Passed Students</p>
              <p className="text-4xl font-bold text-green-600">{statistics?.passedStudents || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                {statistics?.passRate ? `${statistics.passRate.toFixed(1)}% of total` : '0% of total'}
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
              <p className="text-sm text-gray-600 font-medium mb-2">Failed Students</p>
              <p className="text-4xl font-bold text-red-600">{statistics?.failedStudents || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                {statistics?.passRate ? `${(100 - statistics.passRate).toFixed(1)}% of total` : '0% of total'}
              </p>
            </div>
          </div>
        </div>

        {/* Time Statistics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Time Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 font-medium mb-2">Average Time Taken</p>
              <p className="text-2xl font-bold text-blue-600">
                {statistics?.averageTimeTaken
                  ? `${Math.floor(statistics.averageTimeTaken / 60)}m ${statistics.averageTimeTaken % 60}s`
                  : '0m 0s'}
              </p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 font-medium mb-2">Fastest Completion</p>
              <p className="text-2xl font-bold text-green-600">
                {statistics?.fastestCompletion
                  ? `${Math.floor(statistics.fastestCompletion / 60)}m ${statistics.fastestCompletion % 60}s`
                  : '0m 0s'}
              </p>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 font-medium mb-2">Slowest Completion</p>
              <p className="text-2xl font-bold text-orange-600">
                {statistics?.slowestCompletion
                  ? `${Math.floor(statistics.slowestCompletion / 60)}m ${statistics.slowestCompletion % 60}s`
                  : '0m 0s'}
              </p>
            </div>
          </div>
        </div>

        {/* Test Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Test Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Total Questions:</span>
              <span className="ml-2 text-gray-600">{test.totalQuestions}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Total Marks:</span>
              <span className="ml-2 text-gray-600">{test.totalMarks}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Duration:</span>
              <span className="ml-2 text-gray-600">{test.duration} minutes</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Pass Percentage:</span>
              <span className="ml-2 text-gray-600">{test.passPercentage}%</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                test.status === 'published'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {test.status}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span>
              <span className="ml-2 text-gray-600">
                {new Date(analytics.lastCalculated).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AptitudeTestAnalytics;
