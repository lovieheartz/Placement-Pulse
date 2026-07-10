import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE } from '../config/api';
import {
  FiClock,
  FiFileText,
  FiTrendingUp,
  FiRefreshCw,
  FiEye,
  FiTrash2,
  FiCalendar,
  FiAward,
  FiActivity,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { GlassPanel, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const ResumeAnalysisHistory = () => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  // Add custom scrollbar styles for modal
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .modal-scrollbar::-webkit-scrollbar {
        width: 10px;
      }
      .modal-scrollbar::-webkit-scrollbar-track {
        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
        border-radius: 10px;
      }
      .modal-scrollbar::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 10px;
      }
      .modal-scrollbar::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #5568d3 0%, #6a3f91 100%);
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    fetchAnalysisHistory();
  }, []);

  // Lock body scroll while the detail modal is open
  useEffect(() => {
    document.body.style.overflow = selectedAnalysis ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedAnalysis]);

  const fetchAnalysisHistory = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('authToken');

      const response = await axios.get(
        `${API_BASE}/api/resume-analysis/history`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setAnalyses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching analysis history:', error);
      toast.error('Failed to load analysis history');
    } finally {
      setLoading(false);
    }
  };

  const deleteAnalysis = async (analysisId) => {
    if (!window.confirm('Are you sure you want to delete this analysis?')) {
      return;
    }

    try {
      const token = sessionStorage.getItem('authToken');

      await axios.delete(
        `${API_BASE}/api/resume-analysis/${analysisId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      toast.success('Analysis deleted successfully');
      fetchAnalysisHistory();
      setSelectedAnalysis(null);
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast.error('Failed to delete analysis');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#10B981';
    if (score >= 70) return '#3B82F6';
    if (score >= 55) return '#F59E0B';
    return '#EF4444';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <EmptyState
        icon={FiClock}
        title="No Analysis History"
        description="You haven't analyzed any resumes yet. Upload a resume to get started!"
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <FiActivity className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-foreground">Analysis History</h2>
            <p className="text-sm text-muted-foreground">
              {analyses.length} report{analyses.length === 1 ? '' : 's'} · manage your past resume analyses
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalysisHistory} className="self-start sm:self-auto">
          <FiRefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {analyses.map((analysis, index) => (
          <GlassPanel
            key={analysis._id}
            className="group relative flex flex-col overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            style={{animationDelay: `${index * 50}ms`}}
          >
            {/* score-tinted accent */}
            <span
              className="pointer-events-none block h-1.5 w-full"
              style={{ background: getScoreColor(analysis.atsScore) }}
            />
            {/* soft score glow */}
            <span
              className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-10 blur-2xl"
              style={{ background: getScoreColor(analysis.atsScore) }}
            />

            {/* Header: ring + meta */}
            <div className="flex items-start gap-4 p-4 sm:p-5">
              <div className="size-20 shrink-0 sm:size-[88px]">
                <CircularProgressbar
                  value={analysis.atsScore}
                  text={`${analysis.atsScore}%`}
                  styles={buildStyles({
                    pathColor: getScoreColor(analysis.atsScore),
                    textColor: getScoreColor(analysis.atsScore),
                    trailColor: '#EEF2F7',
                    textSize: '18px',
                    strokeLinecap: 'round',
                  })}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FiFileText className="h-4 w-4" />
                  </span>
                  <p className="truncate text-sm font-semibold text-foreground" title={analysis.resumeFileName}>
                    {analysis.resumeFileName}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {analysis.detected_industry?.replace(/_/g, ' ').toLowerCase() || 'general'}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FiCalendar className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{formatDate(analysis.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Metric chips */}
            <div className="grid grid-cols-2 gap-3 px-4 sm:px-5">
              <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 px-3 py-2.5">
                <FiCheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                <div className="leading-tight">
                  <div className="text-lg font-bold text-emerald-600">
                    {analysis.matched_keywords?.length || 0}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Matched</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 px-3 py-2.5">
                <FiAlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <div className="leading-tight">
                  <div className="text-lg font-bold text-red-600">
                    {analysis.missing_keywords?.length || 0}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Missing</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2 border-t border-border/60 p-4 sm:px-5">
              <Button
                variant="default"
                size="sm"
                onClick={() => setSelectedAnalysis(selectedAnalysis?._id === analysis._id ? null : analysis)}
                className="flex-1"
              >
                <FiEye className="h-4 w-4" />
                {selectedAnalysis?._id === analysis._id ? 'Hide details' : 'View details'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteAnalysis(analysis._id)}
                className="text-red-600 hover:bg-red-500/10 hover:text-red-600"
              >
                <FiTrash2 className="h-4 w-4" />
              </Button>
            </div>
          </GlassPanel>
        ))}
      </div>

      {/* Detailed View Modal */}
      {selectedAnalysis && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setSelectedAnalysis(null)}
        >
          <div
            className="modal-scrollbar relative max-h-[90vh] w-full max-w-[1000px] overflow-y-auto rounded-2xl border border-white/60 bg-white/80 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedAnalysis(null)}
              className="absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              aria-label="Close"
            >×</button>

            {/* Gradient hero header */}
            <div
              className="relative overflow-hidden px-6 pb-8 pt-7 text-white sm:px-8"
              style={{
                background: `linear-gradient(135deg, ${getScoreColor(
                  selectedAnalysis.atsScore
                )} 0%, #4338ca 130%)`,
              }}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/15 blur-3xl" />
              <div className="relative flex flex-col items-center gap-5 sm:flex-row">
                <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-full bg-white shadow-lg sm:size-28">
                  <div
                    className="text-4xl font-black leading-none"
                    style={{ color: getScoreColor(selectedAnalysis.atsScore) }}
                  >
                    {selectedAnalysis.atsScore}
                  </div>
                  <span className="text-xs font-semibold text-slate-400">/ 100</span>
                </div>
                <div className="min-w-0 text-center sm:text-left">
                  <div className="flex items-center justify-center gap-2 text-2xl font-extrabold sm:justify-start">
                    <FiAward className="h-6 w-6 shrink-0" />
                    ATS Compatibility Score
                  </div>
                  <p className="mt-1 truncate text-sm text-white/85">
                    {selectedAnalysis.resumeFileName}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="space-y-6 p-6 sm:p-8">
              {/* Score Breakdown */}
              {selectedAnalysis.score_breakdown &&
                Object.keys(selectedAnalysis.score_breakdown).length > 0 && (
                <div className="rounded-2xl border border-border bg-muted/40 p-5 sm:p-6">
                  <h3 className="mb-4 flex items-center text-lg font-bold text-foreground">
                    <FiAward className="mr-2 h-5 w-5 text-primary" />
                    Score Breakdown
                  </h3>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
                    {Object.entries(selectedAnalysis.score_breakdown).map(([key, value]) => (
                      <div key={key} className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
                        <div className="mb-2 text-sm font-semibold capitalize text-muted-foreground">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="text-2xl font-extrabold" style={{ color: getScoreColor(value) }}>
                          {value.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Keywords */}
              {selectedAnalysis.matched_keywords?.length > 0 && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 sm:p-6">
                  <h3 className="mb-4 flex items-center text-lg font-bold text-emerald-700">
                    <FiCheckCircle className="mr-2 h-5 w-5" />
                    Matched Keywords ({selectedAnalysis.matched_keywords.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnalysis.matched_keywords.map((keyword, idx) => (
                      <span key={idx} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Keywords */}
              {selectedAnalysis.missing_keywords?.length > 0 && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
                  <h3 className="mb-4 flex items-center text-lg font-bold text-amber-700">
                    <FiAlertCircle className="mr-2 h-5 w-5" />
                    Missing Keywords ({selectedAnalysis.missing_keywords.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnalysis.missing_keywords.map((keyword, idx) => (
                      <span key={idx} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-700">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {selectedAnalysis.suggestions?.length > 0 && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
                  <h3 className="mb-4 flex items-center text-lg font-bold text-foreground">
                    <FiTrendingUp className="mr-2 h-5 w-5 text-primary" />
                    Recommendations
                  </h3>
                  <ul className="m-0 list-none space-y-2 p-0">
                    {selectedAnalysis.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="rounded-lg border border-border bg-card p-3 text-sm text-foreground">
                        <div className="flex items-start justify-between gap-4">
                          <span className="flex-1">
                            → {suggestion.suggestion || suggestion}
                          </span>
                          {suggestion.priority && (
                            <span
                              className="shrink-0 rounded-md px-2 py-1 text-[0.7rem] font-bold text-white"
                              style={{
                                background: suggestion.priority === 'high' ? '#ef4444' :
                                           suggestion.priority === 'medium' ? '#f59e0b' : '#10b981'
                              }}
                            >
                              {suggestion.priority.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeAnalysisHistory;
