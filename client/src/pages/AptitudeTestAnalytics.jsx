import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../lib/api';
import LiquidGlass from '../components/ui/LiquidGlass';

const AptitudeTestAnalytics = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [analytics, setAnalytics] = useState(null);
  const [test, setTest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Role-aware base path so navigation works for admin, hod and faculty
  // (they all share this page).
  const basePath = useMemo(() => {
    if (location.pathname.startsWith('/hod')) return '/hod';
    if (location.pathname.startsWith('/faculty')) return '/faculty';
    return '/admin';
  }, [location.pathname]);

  useEffect(() => {
    fetchAnalytics();
  }, [id]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('authToken');

      const response = await axios.get(
        `${API_BASE}/api/aptitude/tests/${id}/analytics`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setAnalytics(response.data.data);

      // Fetch test details separately
      const testResponse = await axios.get(
        `${API_BASE}/api/aptitude/tests/${id}`,
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
        `${API_BASE}/api/aptitude/tests/${id}/analytics/refresh`,
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
      <div className="relative flex min-h-screen items-center justify-center text-white">
        <div className="pointer-events-none fixed inset-0 -z-10 ds-aurora" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(120%_120%_at_50%_-10%,transparent,rgba(5,6,10,0.55))]" />
        <div className="text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-2 border-white/20 border-b-sky-300" />
          <p className="mt-4 font-medium text-white/60">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics || !test) {
    return (
      <div className="relative flex min-h-screen items-center justify-center text-white">
        <div className="pointer-events-none fixed inset-0 -z-10 ds-aurora" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(120%_120%_at_50%_-10%,transparent,rgba(5,6,10,0.55))]" />
        <div className="text-center">
          <p className="font-medium text-rose-300">Failed to load analytics</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur-md transition-all hover:bg-white/10"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { statistics } = analytics;

  return (
    <div className="relative min-h-screen text-white">
      {/* Animated liquid aurora background */}
      <div className="pointer-events-none fixed inset-0 -z-10 ds-aurora" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(120%_120%_at_50%_-10%,transparent,rgba(5,6,10,0.55))]" />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <LiquidGlass strong className="rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button
                onClick={() => navigate(`${basePath}/aptitude-tests`)}
                className="mb-3 inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur-md transition-all hover:bg-white/10"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h1 className="bg-gradient-to-r from-white via-white to-sky-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
                {test.title}
              </h1>
              <p className="mt-1.5 text-sm text-white/60">Test Analytics &amp; Performance Report</p>
            </div>
            <button
              onClick={handleRefreshAnalytics}
              disabled={isRefreshing}
              className="ds-shimmer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(59,99,255,0.6)] ring-1 ring-white/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? 'Refreshing...' : 'Refresh Analytics'}
            </button>
          </div>
        </LiquidGlass>

        {/* Overview Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Attempts */}
          <LiquidGlass hover tilt className="rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/55">Total Attempts</p>
                <p className="mt-1 text-4xl font-bold tracking-tight text-white">{statistics?.totalAttempts || 0}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/30 to-indigo-500/10 text-sky-200 ring-1 ring-sky-300/30">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </LiquidGlass>

          {/* Completed */}
          <LiquidGlass hover tilt className="rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/55">Completed</p>
                <p className="mt-1 text-4xl font-bold tracking-tight text-white">{statistics?.completedAttempts || 0}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/30 to-teal-500/10 text-emerald-200 ring-1 ring-emerald-300/30">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </LiquidGlass>

          {/* Average Score */}
          <LiquidGlass hover tilt className="rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/55">Average Score</p>
                <p className="mt-1 text-4xl font-bold tracking-tight text-white">
                  {statistics?.averageScore ? statistics.averageScore.toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-400/30 to-purple-500/10 text-fuchsia-200 ring-1 ring-fuchsia-300/30">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </LiquidGlass>

          {/* Pass Rate */}
          <LiquidGlass hover tilt className="rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/55">Pass Rate</p>
                <p className="mt-1 text-4xl font-bold tracking-tight text-white">
                  {statistics?.passRate ? `${statistics.passRate.toFixed(1)}%` : '0%'}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/30 to-orange-500/10 text-amber-200 ring-1 ring-amber-300/30">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </LiquidGlass>
        </div>

        {/* Detailed Statistics */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Score Distribution */}
          <LiquidGlass className="rounded-2xl p-6">
            <h3 className="mb-4 text-xl font-bold text-white">Score Distribution</h3>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-white/70">Highest Score</span>
                  <span className="text-lg font-bold text-emerald-300">
                    {statistics?.highestScore || 0} / {test.totalMarks}
                  </span>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-white/70">Lowest Score</span>
                  <span className="text-lg font-bold text-rose-300">
                    {statistics?.lowestScore || 0} / {test.totalMarks}
                  </span>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-white/70">Average Percentage</span>
                  <span className="text-lg font-bold text-sky-300">
                    {statistics?.averagePercentage ? `${statistics.averagePercentage.toFixed(2)}%` : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </LiquidGlass>

          {/* Attempt Status */}
          <LiquidGlass className="rounded-2xl p-6">
            <h3 className="mb-4 text-xl font-bold text-white">Attempt Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-300/20">
                <span className="text-sm font-medium text-white/70">Completed</span>
                <span className="text-lg font-bold text-emerald-300">{statistics?.completedAttempts || 0}</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-amber-500/10 p-3 ring-1 ring-amber-300/20">
                <span className="text-sm font-medium text-white/70">In Progress</span>
                <span className="text-lg font-bold text-amber-300">{statistics?.inProgressAttempts || 0}</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-rose-500/10 p-3 ring-1 ring-rose-300/20">
                <span className="text-sm font-medium text-white/70">Abandoned</span>
                <span className="text-lg font-bold text-rose-300">{statistics?.abandonedAttempts || 0}</span>
              </div>
            </div>
          </LiquidGlass>
        </div>

        {/* Pass/Fail Breakdown */}
        <LiquidGlass className="mt-6 rounded-2xl p-6">
          <h3 className="mb-4 text-xl font-bold text-white">Pass/Fail Breakdown</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-300/25">
              <p className="mb-2 text-sm font-medium text-white/55">Passed Students</p>
              <p className="text-4xl font-bold text-emerald-300">{statistics?.passedStudents || 0}</p>
              <p className="mt-1 text-sm text-white/55">
                {statistics?.passRate ? `${statistics.passRate.toFixed(1)}% of total` : '0% of total'}
              </p>
            </div>

            <div className="rounded-2xl bg-rose-500/10 p-4 ring-1 ring-rose-300/25">
              <p className="mb-2 text-sm font-medium text-white/55">Failed Students</p>
              <p className="text-4xl font-bold text-rose-300">{statistics?.failedStudents || 0}</p>
              <p className="mt-1 text-sm text-white/55">
                {statistics?.passRate ? `${(100 - statistics.passRate).toFixed(1)}% of total` : '0% of total'}
              </p>
            </div>
          </div>
        </LiquidGlass>

        {/* Time Statistics */}
        <LiquidGlass className="mt-6 rounded-2xl p-6">
          <h3 className="mb-4 text-xl font-bold text-white">Time Statistics</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-sky-500/10 p-4 text-center ring-1 ring-sky-300/20">
              <p className="mb-2 text-sm font-medium text-white/55">Average Time Taken</p>
              <p className="text-2xl font-bold text-sky-300">
                {statistics?.averageTimeTaken
                  ? `${Math.floor(statistics.averageTimeTaken / 60)}m ${statistics.averageTimeTaken % 60}s`
                  : '0m 0s'}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-500/10 p-4 text-center ring-1 ring-emerald-300/20">
              <p className="mb-2 text-sm font-medium text-white/55">Fastest Completion</p>
              <p className="text-2xl font-bold text-emerald-300">
                {statistics?.fastestCompletion
                  ? `${Math.floor(statistics.fastestCompletion / 60)}m ${statistics.fastestCompletion % 60}s`
                  : '0m 0s'}
              </p>
            </div>

            <div className="rounded-2xl bg-amber-500/10 p-4 text-center ring-1 ring-amber-300/20">
              <p className="mb-2 text-sm font-medium text-white/55">Slowest Completion</p>
              <p className="text-2xl font-bold text-amber-300">
                {statistics?.slowestCompletion
                  ? `${Math.floor(statistics.slowestCompletion / 60)}m ${statistics.slowestCompletion % 60}s`
                  : '0m 0s'}
              </p>
            </div>
          </div>
        </LiquidGlass>

        {/* Test Info */}
        <LiquidGlass className="mt-6 rounded-2xl p-6">
          <h3 className="mb-4 text-xl font-bold text-white">Test Information</h3>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <span className="font-medium text-white/70">Total Questions:</span>
              <span className="ml-2 text-white/55">{test.totalQuestions}</span>
            </div>
            <div>
              <span className="font-medium text-white/70">Total Marks:</span>
              <span className="ml-2 text-white/55">{test.totalMarks}</span>
            </div>
            <div>
              <span className="font-medium text-white/70">Duration:</span>
              <span className="ml-2 text-white/55">{test.duration} minutes</span>
            </div>
            <div>
              <span className="font-medium text-white/70">Pass Percentage:</span>
              <span className="ml-2 text-white/55">{test.passPercentage}%</span>
            </div>
            <div>
              <span className="font-medium text-white/70">Status:</span>
              <span className={`ml-2 rounded px-2 py-1 text-xs font-medium ring-1 ${
                test.status === 'published'
                  ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-300/25'
                  : 'bg-white/10 text-white/70 ring-white/15'
              }`}>
                {test.status}
              </span>
            </div>
            <div>
              <span className="font-medium text-white/70">Last Updated:</span>
              <span className="ml-2 text-white/55">
                {new Date(analytics.lastCalculated).toLocaleString()}
              </span>
            </div>
          </div>
        </LiquidGlass>
      </div>
    </div>
  );
};

export default AptitudeTestAnalytics;
