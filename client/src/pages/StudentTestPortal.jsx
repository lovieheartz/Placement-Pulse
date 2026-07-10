import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config/api';
import {
  Clock,
  FileText,
  Award,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/app/DashboardCard';

const StudentTestPortal = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('available');

  useEffect(() => {
    fetchMyTests();
  }, []);

  const fetchMyTests = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE}/api/aptitude/my-tests`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setTests(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
      alert('Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (testId) => {
    try {
      const token = sessionStorage.getItem('authToken');

      // Check eligibility first
      const eligibilityResponse = await axios.post(
        `${API_BASE}/api/aptitude/tests/${testId}/check-eligibility`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!eligibilityResponse.data.data.eligible) {
        alert(eligibilityResponse.data.data.reason);
        return;
      }

      // Navigate to test instructions
      navigate(`/student/tests/${testId}/instructions`);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      alert(error.response?.data?.message || 'Failed to start test');
    }
  };

  const getTestStatus = (test) => {
    const now = new Date();
    const startDate = new Date(test.schedule.startDate);
    const endDate = new Date(test.schedule.endDate);

    // Check attemptStatus from backend
    if (test.attemptStatus === 'completed') {
      return {
        label: 'Completed',
        color: 'green',
        badge: 'success',
        icon: <CheckCircle className="size-3.5" />
      };
    }

    if (test.attemptStatus === 'in-progress') {
      return {
        label: 'In Progress',
        color: 'orange',
        badge: 'warning',
        icon: <Clock className="size-3.5" />
      };
    }

    if (endDate < now) {
      return {
        label: 'Expired',
        color: 'red',
        badge: 'destructive',
        icon: <AlertCircle className="size-3.5" />
      };
    }

    if (startDate > now) {
      return {
        label: 'Upcoming',
        color: 'blue',
        badge: 'default',
        icon: <Clock className="size-3.5" />
      };
    }

    return {
      label: 'Available',
      color: 'green',
      badge: 'success',
      icon: <FileText className="size-3.5" />
    };
  };

  const filteredTests = tests.filter(test => {
    const status = getTestStatus(test);

    if (filter === 'available') return status.label === 'Available';
    if (filter === 'upcoming') return status.label === 'Upcoming';
    if (filter === 'completed') return status.label === 'Completed';

    return true;
  });

  const filterTabs = [
    { key: 'all', label: 'All Tests' },
    { key: 'available', label: 'Available' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <PortalLayout role="student" title="Aptitude Tests">
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <GlassPanel>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  My Aptitude Tests
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  View and attempt your assigned tests
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Assigned"
              value={tests.length}
              icon={FileText}
              tone="blue"
            />
            <StatCard
              label="Available Now"
              value={tests.filter(t => getTestStatus(t).label === 'Available').length}
              icon={CheckCircle}
              tone="emerald"
            />
            <StatCard
              label="Completed"
              value={tests.filter(t => t.attemptStatus === 'completed').length}
              icon={Award}
              tone="violet"
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

          {/* Tests Grid */}
          {filteredTests.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No tests found in this category"
              description="Try switching filters to see other tests."
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTests.map((test) => {
                const status = getTestStatus(test);
                return (
                  <div
                    key={test._id}
                    className="group overflow-hidden rounded-2xl border border-white/60 bg-white/60 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className={`h-2 bg-gradient-to-r ${
                      status.color === 'green' ? 'from-green-400 to-green-600' :
                      status.color === 'blue' ? 'from-blue-400 to-blue-600' :
                      status.color === 'purple' ? 'from-purple-400 to-purple-600' :
                      status.color === 'orange' ? 'from-orange-400 to-red-500' :
                      'from-red-400 to-red-600'
                    }`} />

                    <div className="p-5">
                      <div className="mb-4 flex items-start justify-between gap-2">
                        <h3 className="flex-1 text-lg font-bold text-foreground">{test.title}</h3>
                        <Badge variant={status.badge} className="gap-1 shrink-0">
                          {status.icon}
                          <span>{status.label}</span>
                        </Badge>
                      </div>

                      {test.description && (
                        <p className="mb-4 text-sm text-muted-foreground">{test.description}</p>
                      )}

                      <div className="mb-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Clock className="size-4 text-primary" />
                          <span>Duration: {test.duration} minutes</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <FileText className="size-4 text-primary" />
                          <span>Questions: {test.totalQuestions}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Award className="size-4 text-primary" />
                          <span>Total Marks: {test.totalMarks}</span>
                        </div>
                      </div>

                      <div className="border-t border-white/60 pt-4">
                        <p className="mb-1 text-xs text-muted-foreground">Available From</p>
                        <p className="mb-3 text-sm font-medium text-foreground">
                          {new Date(test.schedule.startDate).toLocaleString()} to{' '}
                          {new Date(test.schedule.endDate).toLocaleString()}
                        </p>

                        {/* Show score if test is completed */}
                        {test.attemptStatus === 'completed' && test.score !== null && test.percentage !== null && (
                          <div className="mb-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">Your Score</p>
                                <p className="text-2xl font-bold text-blue-700">{test.score}/{test.totalMarks}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Percentage</p>
                                <p className="text-2xl font-bold text-purple-700">{test.percentage.toFixed(1)}%</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {test.attemptStatus === 'completed' ? (
                          <Button
                            variant="gradient"
                            className="w-full from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                            onClick={() => navigate(`/student/tests/${test._id}/result`)}
                          >
                            View Detailed Result
                          </Button>
                        ) : status.label === 'Available' ? (
                          <Button
                            variant="gradient"
                            className="w-full from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500"
                            onClick={() => handleStartTest(test._id)}
                          >
                            Start Test Now
                          </Button>
                        ) : test.attemptStatus === 'in-progress' ? (
                          <Button
                            variant="gradient"
                            className="w-full animate-pulse from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500"
                            onClick={() => navigate(`/student/tests/${test._id}/take`)}
                          >
                            Resume Test
                          </Button>
                        ) : (
                          <Button disabled variant="secondary" className="w-full">
                            {status.label}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
};

export default StudentTestPortal;
