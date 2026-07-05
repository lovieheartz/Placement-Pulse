import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle,
  XCircle,
  Clock,
  Award,
  TrendingUp,
  Calendar,
  BarChart2,
  Eye,
  ArrowLeft,
} from 'lucide-react';

import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/app/DashboardCard';

const StudentTestHistory = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    totalTests: 0,
    passedTests: 0,
    averageScore: 0,
    averagePercentage: 0
  });

  useEffect(() => {
    fetchTestHistory();
  }, []);

  const fetchTestHistory = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.get(
        'http://localhost:3001/api/attempts/my-history',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const historyData = response.data.data;
        setAttempts(historyData);

        // Calculate stats
        const totalTests = historyData.length;
        const passedTests = historyData.filter(a => a.passed).length;
        const totalScore = historyData.reduce((sum, a) => sum + a.score, 0);
        const totalPercentage = historyData.reduce((sum, a) => sum + a.percentage, 0);

        setStats({
          totalTests,
          passedTests,
          averageScore: totalTests > 0 ? (totalScore / totalTests).toFixed(1) : 0,
          averagePercentage: totalTests > 0 ? (totalPercentage / totalTests).toFixed(1) : 0
        });
      }
    } catch (error) {
      console.error('Error fetching test history:', error);
      alert('Failed to fetch test history');
    } finally {
      setLoading(false);
    }
  };

  const filteredAttempts = attempts.filter(attempt => {
    if (filter === 'all') return true;
    if (filter === 'passed') return attempt.passed;
    if (filter === 'failed') return !attempt.passed;
    return true;
  });

  const filterTabs = [
    { key: 'all', label: 'All Tests' },
    { key: 'passed', label: 'Passed' },
    { key: 'failed', label: 'Failed' },
  ];

  return (
    <PortalLayout role="student" title="Test History">
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <GlassPanel>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Test History
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  View all your test attempts and performance analytics
                </p>
              </div>
              <Button
                variant="gradient"
                onClick={() => navigate('/student/dashboard')}
              >
                <ArrowLeft className="size-4" />
                Back to Dashboard
              </Button>
            </div>
          </GlassPanel>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Tests"
              value={stats.totalTests}
              icon={BarChart2}
              tone="blue"
            />
            <StatCard
              label="Tests Passed"
              value={stats.passedTests}
              icon={CheckCircle}
              tone="emerald"
            />
            <StatCard
              label="Avg. Score"
              value={stats.averageScore}
              icon={Award}
              tone="violet"
            />
            <StatCard
              label="Avg. Percentage"
              value={`${stats.averagePercentage}%`}
              icon={TrendingUp}
              tone="amber"
            />
          </div>

          {/* Filter Buttons */}
          <GlassPanel className="p-3 sm:p-3">
            <div className="flex flex-wrap gap-2">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    filter === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </GlassPanel>

          {/* Test History Table */}
          {filteredAttempts.length === 0 ? (
            <EmptyState
              icon={BarChart2}
              title="No test history found"
              description="Your completed test attempts will appear here."
            />
          ) : (
            <GlassPanel className="overflow-hidden p-0 sm:p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/60 bg-white/40">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Test Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Score
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Percentage
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Result
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Time Taken
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/50">
                    {filteredAttempts.map((attempt) => (
                      <tr key={attempt._id} className="transition-colors hover:bg-white/40">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            <div className="ml-0">
                              <div className="text-sm font-medium text-foreground">
                                {attempt.testId?.title || 'Test'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {attempt.testId?.totalQuestions || 0} questions
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Calendar className="size-4 text-muted-foreground" />
                            {new Date(attempt.submittedAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(attempt.submittedAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-semibold text-foreground">
                            {attempt.score} / {attempt.testId?.totalMarks || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {attempt.totalCorrect} correct
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 max-w-[100px] flex-1 rounded-full bg-muted">
                              <div
                                className={`h-2 rounded-full ${
                                  attempt.passed ? 'bg-green-600' : 'bg-red-600'
                                }`}
                                style={{ width: `${Math.min(attempt.percentage, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              {attempt.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {attempt.passed ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="size-3.5" />
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="size-3.5" />
                              Failed
                            </Badge>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Clock className="size-4 text-muted-foreground" />
                            {attempt.timeTaken} min
                          </div>
                          <div className="text-xs text-muted-foreground">
                            of {attempt.testId?.duration || 0} min
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/student/tests/${attempt.testId._id}/result`)}
                          >
                            <Eye className="size-4" />
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          )}

          {/* Performance Insights */}
          {attempts.length > 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <GlassPanel>
                <h3 className="mb-4 text-lg font-bold text-foreground">Performance Trend</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="text-lg font-bold text-green-600">
                      {stats.totalTests > 0
                        ? ((stats.passedTests / stats.totalTests) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Best Score</span>
                    <span className="text-lg font-bold text-blue-600">
                      {Math.max(...attempts.map(a => a.percentage)).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Latest Score</span>
                    <span className="text-lg font-bold text-purple-600">
                      {attempts[0]?.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </GlassPanel>

              <GlassPanel>
                <h3 className="mb-4 text-lg font-bold text-foreground">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Questions Attempted</span>
                    <span className="text-lg font-bold text-foreground">
                      {attempts.reduce((sum, a) => sum + a.totalAttempted, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Correct Answers</span>
                    <span className="text-lg font-bold text-green-600">
                      {attempts.reduce((sum, a) => sum + a.totalCorrect, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Overall Accuracy</span>
                    <span className="text-lg font-bold text-blue-600">
                      {attempts.reduce((sum, a) => sum + a.totalAttempted, 0) > 0
                        ? ((attempts.reduce((sum, a) => sum + a.totalCorrect, 0) /
                           attempts.reduce((sum, a) => sum + a.totalAttempted, 0)) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </GlassPanel>
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
};

export default StudentTestHistory;
