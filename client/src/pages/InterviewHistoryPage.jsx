import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import PortalLayout from '@/components/app/PortalLayout';
import { PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { API_BASE } from '../config/api';
import {
  History,
  Inbox,
  Mic,
  Eye,
  Trash2,
  Calendar,
  Sparkles,
  TrendingUp,
  Lightbulb,
  MessageSquareQuote,
  Briefcase,
  X,
} from 'lucide-react';
import './Dashboard.css';


const InterviewHistoryPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const token = sessionStorage.getItem('authToken');

  // Fetch profile with avatar
  const { data: profileData } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/student/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchInterviewHistory();
  }, [user, navigate]);

  // Lock body scroll while a modal is open
  useEffect(() => {
    const open = selectedInterview || showDeleteConfirm;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedInterview, showDeleteConfirm]);

  const fetchInterviewHistory = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE}/api/interview/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setInterviews(response.data.interviews || []);
    } catch (error) {
      console.error('Error fetching interview history:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteInterview = async (interviewId) => {
    try {
      const token = sessionStorage.getItem('authToken');
      await axios.delete(`${API_BASE}/api/interview/${interviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setInterviews(interviews.filter((i) => i._id !== interviewId));
      setShowDeleteConfirm(null);

      if (selectedInterview?._id === interviewId) {
        setSelectedInterview(null);
      }
    } catch (error) {
      console.error('Error deleting interview:', error);
      alert('Failed to delete interview');
    }
  };

  // Returns tailwind-friendly token set per score band
  const getScoreTheme = (score) => {
    if (score >= 75)
      return {
        hex: '#10b981',
        ring: 'text-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
        soft: 'bg-emerald-500/10',
        grad: 'from-emerald-500 to-teal-600',
      };
    if (score >= 60)
      return {
        hex: '#f59e0b',
        ring: 'text-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
        soft: 'bg-amber-500/10',
        grad: 'from-amber-500 to-orange-600',
      };
    return {
      hex: '#ef4444',
      ring: 'text-rose-500',
      text: 'text-rose-600 dark:text-rose-400',
      soft: 'bg-rose-500/10',
      grad: 'from-rose-500 to-red-600',
    };
  };

  const getReadinessLabel = (level) => {
    const labels = {
      excellent: '🌟 Excellent',
      well_prepared: '✨ Well Prepared',
      ready: '👍 Ready',
      needs_improvement: '📈 Needs Improvement',
      not_ready: '🔄 Not Ready',
    };
    return labels[level] || level;
  };

  // Circular score ring using conic-gradient
  const ScoreRing = ({ score, size = 80 }) => {
    const theme = getScoreTheme(score || 0);
    const pct = Math.max(0, Math.min(100, score || 0));
    return (
      <div
        className="relative shrink-0 rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${theme.hex} ${pct * 3.6}deg, rgba(148,163,184,0.18) 0deg)`,
        }}
      >
        <div className="absolute inset-[6px] flex flex-col items-center justify-center rounded-full bg-card">
          <span className="text-xl font-extrabold leading-none" style={{ color: theme.hex }}>
            {score ?? 'N/A'}
          </span>
          <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            / 100
          </span>
        </div>
      </div>
    );
  };

  if (!user) {
    return null;
  }

  return (
    <PortalLayout role="student" title="Interview History" user={profileData}>
      <div>
        <PageHeader
          title="Interview History"
          subtitle="View your past interviews and performance reports"
          icon={History}
        />

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 size-14 animate-spin rounded-full border-4 border-muted border-t-primary" />
              <p className="text-base text-muted-foreground">Loading interview history…</p>
            </div>
          </div>
        ) : interviews.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No Interviews Yet"
            description="Start your first AI mock interview to see your history here"
            action={
              <Button variant="gradient" onClick={() => navigate('/realtime-mock-interview')}>
                <Mic className="size-4" /> Start First Interview
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {interviews.map((interview) => {
              const theme = getScoreTheme(interview.overallScore || 0);
              return (
                <div
                  key={interview._id}
                  onClick={() => setSelectedInterview(interview)}
                  className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
                >
                  <span
                    className={`pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-[0.12] blur-2xl`}
                    style={{ background: theme.hex }}
                  />

                  <div className="mb-4 flex items-start justify-between">
                    <ScoreRing score={interview.overallScore} size={76} />
                    <Badge variant={interview.status === 'completed' ? 'success' : 'warning'}>
                      {interview.status === 'completed' ? 'Completed' : 'In Progress'}
                    </Badge>
                  </div>

                  <h3 className="mb-1 line-clamp-1 text-lg font-bold text-foreground">
                    {interview.jobRole}
                  </h3>
                  <p className="mb-3 flex items-center gap-1.5 text-sm capitalize text-muted-foreground">
                    <Briefcase className="size-3.5 shrink-0" />
                    {interview.industry} • {interview.difficulty}
                  </p>

                  {interview.overallFeedback?.readinessLevel && (
                    <div
                      className={`mb-3 rounded-lg px-3 py-2 text-center text-sm font-semibold ${theme.soft} ${theme.text}`}
                    >
                      {getReadinessLabel(interview.overallFeedback.readinessLevel)}
                    </div>
                  )}

                  <p className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5 shrink-0" />
                    {new Date(interview.completedAt || interview.startedAt).toLocaleString()}
                  </p>

                  <div className="mt-auto flex gap-2">
                    <Button
                      variant="gradient"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInterview(interview);
                      }}
                    >
                      <Eye className="size-4" /> View Report
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(interview._id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="size-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-foreground">Delete Interview?</h3>
            <p className="mb-8 text-sm text-muted-foreground">
              This action cannot be undone. All interview data and analysis will be permanently
              deleted.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => deleteInterview(showDeleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Interview Details Modal */}
      {selectedInterview && (
        <div
          className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm animate-in fade-in sm:p-6"
          onClick={() => setSelectedInterview(null)}
        >
          <div
            className="relative my-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedInterview(null)}
              className="absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>

            {/* Gradient hero header */}
            <div
              className={`relative overflow-hidden bg-gradient-to-br ${getScoreTheme(
                selectedInterview.overallScore || 0
              ).grad} px-6 pb-8 pt-7 text-white sm:px-9`}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-10 size-56 rounded-full bg-black/10 blur-3xl" />

              <div className="relative">
                <h2 className="pr-10 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {selectedInterview.jobRole} Interview
                </h2>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-white/85">
                  <span className="capitalize">{selectedInterview.industry}</span>
                  <span className="opacity-60">•</span>
                  <span className="capitalize">{selectedInterview.difficulty}</span>
                  <span className="opacity-60">•</span>
                  <span>
                    {new Date(
                      selectedInterview.completedAt || selectedInterview.startedAt
                    ).toLocaleDateString()}
                  </span>
                </p>

                <div className="mt-6 flex items-center gap-5 rounded-2xl bg-white/15 p-4 backdrop-blur-md ring-1 ring-white/20">
                  <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-full bg-white shadow-lg sm:size-28">
                    <span
                      className="text-4xl font-black leading-none sm:text-5xl"
                      style={{ color: getScoreTheme(selectedInterview.overallScore || 0).hex }}
                    >
                      {selectedInterview.overallScore ?? 'N/A'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">/ 100</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
                      <Sparkles className="size-5 shrink-0" />
                      <span className="truncate">
                        {selectedInterview.overallFeedback?.readinessLevel
                          ? getReadinessLabel(selectedInterview.overallFeedback.readinessLevel)
                          : 'Overall Performance'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/80">Interview Readiness Level</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[calc(100vh-22rem)] space-y-5 overflow-y-auto p-6 sm:p-8">
              {selectedInterview.overallFeedback ? (
                <>
                  {/* Strengths */}
                  {selectedInterview.overallFeedback.strengths?.length > 0 && (
                    <FeedbackSection
                      icon={TrendingUp}
                      title="Your Strengths"
                      accent="emerald"
                      items={selectedInterview.overallFeedback.strengths}
                      bullet="✅"
                    />
                  )}

                  {/* Areas for improvement */}
                  {selectedInterview.overallFeedback.areasForImprovement?.length > 0 && (
                    <FeedbackSection
                      icon={TrendingUp}
                      title="Areas to Improve"
                      accent="amber"
                      items={selectedInterview.overallFeedback.areasForImprovement}
                      bullet="🔸"
                    />
                  )}

                  {/* Recommendations */}
                  {selectedInterview.overallFeedback.recommendations?.length > 0 && (
                    <FeedbackSection
                      icon={Lightbulb}
                      title="Recommendations"
                      accent="indigo"
                      items={selectedInterview.overallFeedback.recommendations}
                      bullet="→"
                    />
                  )}

                  {/* Closing summary */}
                  {selectedInterview.overallFeedback.closingMessage && (
                    <div className="rounded-2xl border border-border bg-muted/40 p-5 sm:p-6">
                      <h3 className="mb-2.5 flex items-center gap-2 text-base font-bold text-foreground">
                        <MessageSquareQuote className="size-5 text-primary" />
                        Summary
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {selectedInterview.overallFeedback.closingMessage}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  icon={Inbox}
                  title="No detailed feedback"
                  description="This interview doesn't have a saved feedback report."
                />
              )}
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
};

// Reusable colored feedback section for the details modal
const ACCENTS = {
  emerald: {
    wrap: 'border-emerald-500/20 bg-emerald-500/[0.06]',
    icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-700 dark:text-emerald-300',
  },
  amber: {
    wrap: 'border-amber-500/20 bg-amber-500/[0.06]',
    icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    title: 'text-amber-700 dark:text-amber-300',
  },
  indigo: {
    wrap: 'border-indigo-500/20 bg-indigo-500/[0.06]',
    icon: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
    title: 'text-indigo-700 dark:text-indigo-300',
  },
};

const FeedbackSection = ({ icon: Icon, title, accent, items, bullet }) => {
  const a = ACCENTS[accent] || ACCENTS.indigo;
  return (
    <div className={`rounded-2xl border p-5 sm:p-6 ${a.wrap}`}>
      <h3 className={`mb-4 flex items-center gap-2.5 text-base font-bold ${a.title}`}>
        <span className={`flex size-8 items-center justify-center rounded-lg ${a.icon}`}>
          <Icon className="size-4" />
        </span>
        {title}
      </h3>
      <ul className="space-y-2.5">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card p-3.5 text-sm leading-relaxed text-foreground shadow-sm"
          >
            <span className="shrink-0 select-none">{bullet}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InterviewHistoryPage;
