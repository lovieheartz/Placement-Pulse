import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { API_BASE } from '../config/api';
import 'react-circular-progressbar/dist/styles.css';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiUpload,
  FiFileText,
  FiTrendingUp,
  FiTarget,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiDownload,
  FiLayers,
  FiZap,
  FiBarChart2,
  FiActivity,
  FiAward,
  FiStar,
  FiCpu,
  FiPieChart,
  FiTrendingDown
} from 'react-icons/fi';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { GlassPanel } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';

const ResumeAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState('');
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const progressInterval = useRef(null);

  // Simulate analysis progress
  const simulateAnalysisProgress = () => {
    const steps = [
      'Extracting text from resume...',
      'Analyzing keyword density...',
      'Calculating semantic similarity...',
      'Detecting industry alignment...',
      'Evaluating skill matching...',
      'Assessing experience relevance...',
      'Generating optimization suggestions...',
      'Finalizing ATS score...'
    ];

    let stepIndex = 0;
    setAnalysisProgress(0);
    setCurrentAnalysisStep(steps[0]);

    progressInterval.current = setInterval(() => {
      setAnalysisProgress(prev => {
        const newProgress = prev + Math.random() * 15;

        if (newProgress > (stepIndex + 1) * 12.5 && stepIndex < steps.length - 1) {
          stepIndex++;
          setCurrentAnalysisStep(steps[stepIndex]);
        }

        return Math.min(newProgress, 95);
      });
    }, 500);
  };

  // File drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  }, []);

  const validateAndSetFile = (file) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload only PDF or DOCX files');
      return;
    }

    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setFile(file);
    toast.success('Resume uploaded successfully!');
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    setAnalysisResult(null);
  };

  const analyzeResume = async () => {
    if (!file) {
      toast.error('Please upload a resume first');
      return;
    }

    if (!jobDescription.trim()) {
      toast.error('Please provide a job description');
      return;
    }

    setIsAnalyzing(true);
    simulateAnalysisProgress();

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobDescription', jobDescription.trim());

      const token = sessionStorage.getItem('authToken');

      const response = await axios.post(
        `${API_BASE}/api/resume-analysis/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000
        }
      );

      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }

      setAnalysisProgress(100);
      setCurrentAnalysisStep('Analysis complete!');

      if (response.data.success) {
        setTimeout(() => {
          setAnalysisResult(response.data.data);
          toast.success('🎉 Resume analysis completed!');
        }, 500);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }

      let errorMessage = 'Failed to analyze resume';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Only students can use this feature.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };


  const getScoreColor = (score) => {
    if (score >= 85) return '#10B981'; // Emerald
    if (score >= 70) return '#3B82F6'; // Blue
    if (score >= 55) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const getScoreGrade = (score) => {
    if (score >= 85) return { grade: 'A+', desc: 'Excellent ATS Compatibility' };
    if (score >= 70) return { grade: 'B+', desc: 'Good ATS Performance' };
    if (score >= 55) return { grade: 'C', desc: 'Average ATS Score' };
    return { grade: 'D', desc: 'Needs Significant Improvement' };
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600';
      case 'medium': return 'bg-amber-500/10 text-amber-600';
      case 'low': return 'bg-emerald-500/10 text-emerald-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <FiAlertCircle className="w-4 h-4" />;
      case 'medium': return <FiTarget className="w-4 h-4" />;
      case 'low': return <FiCheckCircle className="w-4 h-4" />;
      default: return <FiActivity className="w-4 h-4" />;
    }
  };

  // Prepare chart data for score breakdown
  const prepareRadarData = () => {
    if (!analysisResult?.score_breakdown) return [];

    const breakdown = analysisResult.score_breakdown;
    return [
      {
        subject: 'Keywords',
        score: breakdown.keyword_matching || 0,
        fullMark: 100
      },
      {
        subject: 'Skills',
        score: breakdown.skill_alignment || 0,
        fullMark: 100
      },
      {
        subject: 'Experience',
        score: breakdown.experience_relevance || 0,
        fullMark: 100
      },
      {
        subject: 'Format',
        score: breakdown.format_compatibility || 0,
        fullMark: 100
      },
      {
        subject: 'Industry',
        score: breakdown.industry_alignment || 0,
        fullMark: 100
      },
      {
        subject: 'Semantic',
        score: breakdown.semantic_relevance || 0,
        fullMark: 100
      }
    ];
  };

  const prepareBarData = () => {
    if (!analysisResult?.score_breakdown) return [];

    const breakdown = analysisResult.score_breakdown;
    return Object.entries(breakdown).map(([key, value]) => ({
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      score: value,
      color: getScoreColor(value)
    }));
  };

  return (
    <div className="w-full space-y-6 md:space-y-8">

      {/* Top Section - Upload & Job Description */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 md:gap-6">

          {/* Upload Resume Card */}
          <GlassPanel className="group relative flex flex-col overflow-hidden p-0">
            <span className="pointer-events-none block h-1.5 w-full bg-gradient-to-r from-blue-600 to-indigo-600" />
            <div className="pointer-events-none absolute -right-12 -top-8 size-40 rounded-full bg-blue-500/[0.07] blur-3xl" />
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/15 dark:text-blue-400">
                  <FiUpload className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">Upload Resume</h3>
                  <p className="text-xs text-muted-foreground">PDF or DOCX, up to 10MB</p>
                </div>
              </div>

              <div
                className={`flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                  dragActive
                    ? 'scale-[1.01] border-primary bg-primary/5'
                    : file
                    ? 'border-emerald-500/40 bg-emerald-500/[0.04]'
                    : 'border-border hover:border-primary/60 hover:bg-primary/[0.03]'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
                      <FiCheckCircle className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="break-all px-2 text-sm font-semibold text-foreground md:text-base">{file.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                        {(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={removeFile}>
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform duration-300 group-hover:scale-105">
                      <FiFileText className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground md:text-lg">
                        Drop your resume here
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">or browse — PDF / DOCX, max 10MB</p>
                    </div>
                    <label className="inline-block cursor-pointer">
                      <span className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110">
                        <FiUpload className="h-4 w-4" /> Choose File
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </GlassPanel>

          {/* Job Description Card */}
          <GlassPanel className="relative flex flex-col overflow-hidden p-0">
            <span className="pointer-events-none block h-1.5 w-full bg-gradient-to-r from-indigo-600 to-violet-600" />
            <div className="pointer-events-none absolute -right-12 -top-8 size-40 rounded-full bg-violet-500/[0.07] blur-3xl" />
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/15 dark:text-violet-400">
                  <FiTarget className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">Job Description</h3>
                  <p className="text-xs text-muted-foreground">Paste the role you're targeting</p>
                </div>
              </div>

              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the complete job description here for accurate ATS analysis…"
                className="min-h-[168px] w-full flex-1 resize-none rounded-2xl border border-input bg-background/60 p-4 text-sm leading-relaxed text-foreground shadow-inner transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              <div className="mt-3 flex items-center justify-between text-xs sm:text-sm">
                <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                  {jobDescription.length} characters
                </span>
                {jobDescription.trim().length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                    {jobDescription.trim().split(/\s+/).length} words
                  </span>
                )}
              </div>
            </div>
          </GlassPanel>
      </div>

      {/* Analyze Button — full width, prominent */}
      <Button
        variant="gradient"
        size="xl"
        onClick={analyzeResume}
        disabled={!file || !jobDescription.trim() || isAnalyzing}
        className="w-full shadow-lg shadow-indigo-500/20"
      >
        {isAnalyzing ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            <span>Analyzing Resume…</span>
            <FiZap className="h-5 w-5 animate-pulse" />
          </>
        ) : (
          <>
            <FiCpu className="h-5 w-5" />
            <span>Analyze with AI</span>
          </>
        )}
      </Button>

      {/* Analysis Progress & Results Section - Full Width */}
      <div className="w-full">

            {/* Analysis Progress */}
            {isAnalyzing && (
              <GlassPanel className="p-4 sm:p-6 md:p-8">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-24 w-24 sm:mb-6 sm:h-32 sm:w-32 md:h-40 md:w-40">
                    <CircularProgressbar
                      value={analysisProgress}
                      text={`${Math.round(analysisProgress)}%`}
                      styles={buildStyles({
                        pathColor: '#3B82F6',
                        textColor: '#1F2937',
                        trailColor: '#E5E7EB',
                        textSize: '16px',
                        pathTransition: 'stroke-dashoffset 0.5s ease 0s'
                      })}
                    />
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <h3 className="text-lg font-bold text-foreground sm:text-xl md:text-2xl">AI Analysis in Progress</h3>
                    <p className="px-2 text-sm font-medium text-primary sm:text-base">{currentAnalysisStep}</p>
                    <div className="mt-3 flex justify-center space-x-2 sm:mt-4">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-primary sm:h-2.5 sm:w-2.5" style={{animationDelay: '0ms'}}></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-primary sm:h-2.5 sm:w-2.5" style={{animationDelay: '150ms'}}></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-primary sm:h-2.5 sm:w-2.5" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            )}

            {/* Analysis Results */}
            {analysisResult && !isAnalyzing && (
              <div className="space-y-8">

                {/* Enhanced ATS Score Overview */}
                <GlassPanel className="mb-6 overflow-hidden p-0 sm:mb-8 lg:mb-10">
                  <span className="pointer-events-none block h-1 w-full bg-gradient-to-r from-blue-600 to-indigo-600" />
                  <div className="flex items-center justify-between p-4 sm:p-6 lg:p-8">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FiAward className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-foreground sm:text-xl lg:text-2xl">ATS Compatibility Score</h2>
                        <p className="text-sm text-muted-foreground">Applicant Tracking System Analysis</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 sm:p-6 sm:pt-0 lg:p-8 lg:pt-0 xl:p-10 xl:pt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 items-center">
                      <div className="text-center lg:text-left order-2 lg:order-1">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 mx-auto lg:mx-0 mb-4 sm:mb-6 lg:mb-8">
                          <CircularProgressbar
                            value={analysisResult.atsScore}
                            text={`${analysisResult.atsScore}%`}
                            styles={buildStyles({
                              pathColor: getScoreColor(analysisResult.atsScore),
                              textColor: getScoreColor(analysisResult.atsScore),
                              trailColor: '#F3F4F6',
                              textSize: '16px',
                              pathTransition: 'stroke-dasharray 2s ease-in-out',
                              strokeLinecap: 'round'
                            })}
                          />
                        </div>
                      </div>

                      <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
                        <div className="text-center lg:text-left">
                          <div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3" style={{color: getScoreColor(analysisResult.atsScore)}}>
                            {getScoreGrade(analysisResult.atsScore).grade}
                          </div>
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground mb-2">
                            {getScoreGrade(analysisResult.atsScore).desc}
                          </h3>
                          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg leading-relaxed">
                            Your resume has been analyzed against industry standards and ATS requirements.
                            {analysisResult.atsScore >= 85 ? 'Excellent work! Your resume is highly optimized for ATS systems and should pass most screening processes.' :
                             analysisResult.atsScore >= 70 ? 'Good foundation! Your resume meets most ATS requirements with room for minor improvements.' :
                             analysisResult.atsScore >= 55 ? 'Your resume needs some optimization to improve its chances with ATS systems.' :
                             'Significant improvements needed to make your resume ATS-friendly and increase job application success.'}
                          </p>
                        </div>

                        <div className="rounded-xl border border-border bg-muted/40 p-4 sm:rounded-2xl sm:p-6">
                          <h4 className="mb-3 flex items-center text-sm font-semibold text-foreground sm:mb-4 sm:text-base">
                            <FiTarget className="mr-2 h-4 w-4 text-primary sm:h-5 sm:w-5" />
                            Key Metrics
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="rounded-lg bg-emerald-500/10 p-3 text-center sm:rounded-xl sm:p-4">
                              <div className="text-xl font-bold text-emerald-600 sm:text-2xl">{analysisResult.matched_keywords?.length || 0}</div>
                              <div className="text-xs text-muted-foreground sm:text-sm">Keywords Matched</div>
                            </div>
                            <div className="rounded-lg bg-red-500/10 p-3 text-center sm:rounded-xl sm:p-4">
                              <div className="text-xl font-bold text-red-600 sm:text-2xl">{analysisResult.missing_keywords?.length || 0}</div>
                              <div className="text-xs text-muted-foreground sm:text-sm">Missing Keywords</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassPanel>

                {/* Industry Analysis Card */}
                <GlassPanel className="mb-6 p-4 sm:mb-8 sm:p-6 lg:mb-10 lg:p-8">
                  <div className="mb-6 flex items-center gap-3 sm:mb-8">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FiLayers className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-foreground sm:text-xl lg:text-2xl">Industry &amp; Role Analysis</h3>
                      <p className="text-sm text-muted-foreground">Detected classification and alignment</p>
                    </div>
                  </div>

                  <div className="mb-6 text-center sm:mb-8">
                    <div className="inline-flex flex-col items-center rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 sm:rounded-2xl sm:px-6 sm:py-4 lg:px-8">
                      <div className="mb-1 text-xl font-bold capitalize text-primary sm:mb-2 sm:text-2xl lg:text-3xl">
                        {analysisResult.detected_industry?.replace(/_/g, ' ') || 'General'}
                      </div>
                      <p className="text-sm text-muted-foreground">Primary Industry Classification</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 sm:rounded-2xl sm:p-6">
                      <div className="mb-3 flex items-center sm:mb-4">
                        <FiCheckCircle className="mr-2 h-5 w-5 text-emerald-600 sm:mr-3 sm:h-6 sm:w-6" />
                        <h4 className="text-sm font-semibold text-emerald-700 sm:text-base">Keywords Matched</h4>
                      </div>
                      <div className="mb-1 text-2xl font-bold text-emerald-600 sm:mb-2 sm:text-3xl">{analysisResult.matched_keywords?.length || 0}</div>
                      <p className="text-xs text-muted-foreground sm:text-sm">Successfully identified relevant terms</p>
                    </div>

                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 sm:rounded-2xl sm:p-6">
                      <div className="mb-3 flex items-center sm:mb-4">
                        <FiAlertCircle className="mr-2 h-5 w-5 text-red-600 sm:mr-3 sm:h-6 sm:w-6" />
                        <h4 className="text-sm font-semibold text-red-700 sm:text-base">Missing Keywords</h4>
                      </div>
                      <div className="mb-1 text-2xl font-bold text-red-600 sm:mb-2 sm:text-3xl">{analysisResult.missing_keywords?.length || 0}</div>
                      <p className="text-xs text-muted-foreground sm:text-sm">Keywords to consider adding</p>
                    </div>

                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 sm:col-span-2 sm:rounded-2xl sm:p-6 lg:col-span-1">
                      <div className="mb-3 flex items-center sm:mb-4">
                        <FiTrendingUp className="mr-2 h-5 w-5 text-primary sm:mr-3 sm:h-6 sm:w-6" />
                        <h4 className="text-sm font-semibold text-primary sm:text-base">Match Rate</h4>
                      </div>
                      <div className="mb-1 text-2xl font-bold text-primary sm:mb-2 sm:text-3xl">
                        {analysisResult.matched_keywords?.length && analysisResult.missing_keywords?.length ?
                          Math.round((analysisResult.matched_keywords.length / (analysisResult.matched_keywords.length + analysisResult.missing_keywords.length)) * 100) : 0}%
                      </div>
                      <p className="text-xs text-muted-foreground sm:text-sm">Keyword coverage ratio</p>
                    </div>
                  </div>
                </GlassPanel>

                {/* Score Breakdown Visualization */}
                {analysisResult.score_breakdown && (
                  <GlassPanel className="p-6 sm:p-8">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <FiBarChart2 className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground sm:text-xl">Detailed Score Analysis</h3>
                          <p className="text-sm text-muted-foreground">Performance breakdown across key factors</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
                      >
                        {showDetailedAnalysis ? 'Hide Details' : 'Show Details'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Radar Chart */}
                      <div>
                        <h4 className="mb-4 font-semibold text-foreground">Performance Radar</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={prepareRadarData()}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} />
                            <Radar
                              name="Score"
                              dataKey="score"
                              stroke="#8884d8"
                              fill="#8884d8"
                              fillOpacity={0.3}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Bar Chart */}
                      <div>
                        <h4 className="mb-4 font-semibold text-foreground">Score Breakdown</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={prepareBarData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="score" fill="#8884d8">
                              {prepareBarData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Detailed Metrics */}
                    {showDetailedAnalysis && (
                      <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(analysisResult.score_breakdown).map(([key, value]) => (
                          <div key={key} className="rounded-lg border border-border bg-muted/40 p-4">
                            <div className="mb-1 text-sm font-medium capitalize text-muted-foreground">
                              {key.replace(/_/g, ' ')}
                            </div>
                            <div className="text-2xl font-bold" style={{color: getScoreColor(value)}}>
                              {value.toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassPanel>
                )}

                {/* Enhanced AI Recommendations */}
                {analysisResult.suggestions?.length > 0 && (
                  <GlassPanel className="overflow-hidden p-0">
                    <span className="pointer-events-none block h-1 w-full bg-gradient-to-r from-blue-600 to-indigo-600" />
                    <div className="flex items-center justify-between p-6 sm:p-8">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <FiTrendingUp className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="text-lg font-bold text-foreground sm:text-xl">AI-Powered Optimization Recommendations</h3>
                          <p className="text-sm text-muted-foreground">
                            {analysisResult.suggestions.length} professional improvement strategies identified
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-foreground">{analysisResult.suggestions.length}</div>
                        <div className="text-xs text-muted-foreground">Suggestions</div>
                      </div>
                    </div>

                    <div className="p-6 pt-0 sm:p-8 sm:pt-0 lg:p-10 lg:pt-0">
                      <div className="mb-8">
                        <h4 className="mb-3 text-lg font-semibold text-foreground sm:text-xl">Strategic Improvements for Maximum Impact:</h4>
                        <p className="leading-relaxed text-muted-foreground">
                          Our AI has analyzed your resume and identified specific areas for enhancement.
                          Implementing these recommendations will significantly improve your ATS score and recruiter appeal.
                        </p>
                      </div>

                      <div className="space-y-6">
                        {analysisResult.suggestions.map((suggestion, index) => {
                          const priorityColors = {
                            high: 'border-red-500/20 bg-red-500/5',
                            medium: 'border-amber-500/20 bg-amber-500/5',
                            low: 'border-emerald-500/20 bg-emerald-500/5'
                          };
                          const priorityTextColors = {
                            high: 'text-red-700',
                            medium: 'text-amber-700',
                            low: 'text-emerald-700'
                          };
                          const priorityBadgeColors = {
                            high: 'bg-red-500/10 text-red-600',
                            medium: 'bg-amber-500/10 text-amber-600',
                            low: 'bg-emerald-500/10 text-emerald-600'
                          };

                          return (
                            <div key={index} className={`rounded-2xl border ${priorityColors[suggestion.priority] || priorityColors.low} p-6 transition-all duration-300 hover:shadow-md sm:p-8`}>
                              <div className="mb-6 flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                  <div className={`rounded-xl p-3 ${getPriorityColor(suggestion.priority)}`}>
                                    {getPriorityIcon(suggestion.priority)}
                                  </div>
                                  <div>
                                    <h5 className={`text-lg font-bold sm:text-xl ${priorityTextColors[suggestion.priority] || priorityTextColors.low}`}>
                                      {suggestion.title || `Improvement Suggestion ${index + 1}`}
                                    </h5>
                                    <div className="mt-2 flex items-center">
                                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityBadgeColors[suggestion.priority] || priorityBadgeColors.low}`}>
                                        {suggestion.priority?.toUpperCase() || 'LOW'} PRIORITY
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <p className="leading-relaxed text-foreground">{suggestion.suggestion}</p>

                                {suggestion.impact && (
                                  <div className="rounded-xl border border-border bg-card/70 p-4">
                                    <h6 className="mb-2 flex items-center font-semibold text-foreground">
                                      <FiTarget className="mr-2 h-4 w-4" />
                                      Expected Impact:
                                    </h6>
                                    <p className="font-medium text-primary">{suggestion.impact}</p>
                                  </div>
                                )}

                                {suggestion.keywords && suggestion.keywords.length > 0 && (
                                  <div className="rounded-xl border border-border bg-card/70 p-4">
                                    <h6 className="mb-3 flex items-center font-semibold text-foreground">
                                      <FiStar className="mr-2 h-4 w-4" />
                                      Recommended Keywords:
                                    </h6>
                                    <div className="flex flex-wrap gap-2">
                                      {suggestion.keywords.map((keyword, idx) => (
                                        <span key={idx} className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                                          {keyword}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </GlassPanel>
                )}

                {/* Enhanced Keywords Analysis */}
                <div className="space-y-10">
                  {/* Missing Keywords - High Priority */}
                  {analysisResult.missing_keywords?.length > 0 && (
                    <GlassPanel className="overflow-hidden p-0">
                      <span className="pointer-events-none block h-1 w-full bg-gradient-to-r from-red-500 to-rose-600" />
                      <div className="flex items-center justify-between p-6 sm:p-8">
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                            <FiAlertCircle className="h-5 w-5" />
                          </span>
                          <div>
                            <h3 className="text-lg font-bold text-foreground sm:text-xl">Critical Missing Keywords</h3>
                            <p className="text-sm text-muted-foreground">
                              {analysisResult.missing_keywords.length} important terms not found in your resume
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-red-600">{analysisResult.missing_keywords.length}</div>
                          <div className="text-xs text-muted-foreground">Missing</div>
                        </div>
                      </div>

                      <div className="p-6 pt-0 sm:p-8 sm:pt-0">
                        <div className="mb-6">
                          <h4 className="mb-3 text-lg font-semibold text-foreground sm:text-xl">Priority Keywords to Add:</h4>
                          <p className="leading-relaxed text-muted-foreground">
                            These keywords were frequently mentioned in the job description but are missing from your resume.
                            Adding them could significantly improve your ATS score and visibility to recruiters.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {analysisResult.missing_keywords.map((keyword, index) => (
                            <div
                              key={index}
                              className="group cursor-pointer rounded-xl border border-red-500/20 bg-red-500/5 p-4 transition-all duration-300 hover:border-red-500/40 hover:shadow-md"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-semibold text-red-700">{keyword}</span>
                                <FiTrendingUp className="h-5 w-5 text-red-600 transition-transform group-hover:scale-110" />
                              </div>
                              <div className="mt-2">
                                <span className="rounded-full bg-red-500/10 px-2 py-1 text-sm text-red-600">
                                  High Impact
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {analysisResult.missing_keywords.length > 12 && (
                          <div className="mt-6 text-center">
                            <p className="text-muted-foreground">Showing top priority keywords. Focus on these first for maximum impact.</p>
                          </div>
                        )}
                      </div>
                    </GlassPanel>
                  )}

                  {/* Matched Keywords - Success Section */}
                  {analysisResult.matched_keywords?.length > 0 && (
                    <GlassPanel className="overflow-hidden p-0">
                      <span className="pointer-events-none block h-1 w-full bg-gradient-to-r from-emerald-500 to-green-600" />
                      <div className="flex items-center justify-between p-6 sm:p-8">
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                            <FiCheckCircle className="h-5 w-5" />
                          </span>
                          <div>
                            <h3 className="text-lg font-bold text-foreground sm:text-xl">Successfully Matched Keywords</h3>
                            <p className="text-sm text-muted-foreground">
                              {analysisResult.matched_keywords.length} relevant terms found in your resume
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-emerald-600">{analysisResult.matched_keywords.length}</div>
                          <div className="text-xs text-muted-foreground">Matched</div>
                        </div>
                      </div>

                      <div className="p-6 pt-0 sm:p-8 sm:pt-0">
                        <div className="mb-6">
                          <h4 className="mb-3 text-lg font-semibold text-foreground sm:text-xl">Strong Keyword Alignment:</h4>
                          <p className="leading-relaxed text-muted-foreground">
                            Excellent! These keywords from the job description are already present in your resume,
                            demonstrating strong alignment with the role requirements.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {analysisResult.matched_keywords.slice(0, 16).map((keyword, index) => (
                            <div
                              key={index}
                              className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center transition-all duration-300 hover:shadow-md"
                            >
                              <span className="font-semibold text-emerald-700">{keyword}</span>
                              <div className="mt-2">
                                <FiStar className="mx-auto h-4 w-4 text-emerald-600" />
                              </div>
                            </div>
                          ))}
                        </div>

                        {analysisResult.matched_keywords.length > 16 && (
                          <div className="mt-6 text-center">
                            <div className="inline-block rounded-full bg-emerald-500/10 px-4 py-2 text-emerald-600">
                              +{analysisResult.matched_keywords.length - 16} more matched keywords
                            </div>
                          </div>
                        )}
                      </div>
                    </GlassPanel>
                  )}
                </div>


                {/* Analysis Metadata */}
                {analysisResult.analysis_metadata && (
                  <GlassPanel className="p-6">
                    <div className="mb-4 flex items-center">
                      <FiActivity className="mr-2 h-5 w-5 text-primary" />
                      <h4 className="font-semibold text-foreground">Analysis Summary</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-foreground">Keywords Analyzed</div>
                        <div className="text-lg text-primary">{analysisResult.analysis_metadata.total_keywords_analyzed}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-foreground">Resume Words</div>
                        <div className="text-lg text-primary">{analysisResult.analysis_metadata.resume_word_count}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-foreground">Job Desc Words</div>
                        <div className="text-lg text-emerald-600">{analysisResult.analysis_metadata.job_description_word_count}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-foreground">Processing Time</div>
                        <div className="text-lg text-amber-600">{analysisResult.processingTime ? `${(analysisResult.processingTime / 1000).toFixed(1)}s` : 'N/A'}</div>
                      </div>
                    </div>
                  </GlassPanel>
                )}

              </div>
            )}

            {/* Empty State — compact, professional "how it works" */}
            {!analysisResult && !isAnalyzing && (
              <GlassPanel className="p-5 sm:p-6 lg:p-7">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <FiActivity className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">How it works</h3>
                    <p className="text-sm text-muted-foreground">
                      Get a comprehensive ATS report in three quick steps
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { n: 1, icon: FiUpload, chip: 'bg-blue-500/10 text-blue-600', title: 'Upload your resume', desc: 'Drop a PDF or DOCX file — up to 10MB.' },
                    { n: 2, icon: FiTarget, chip: 'bg-violet-500/10 text-violet-600', title: 'Add the job description', desc: 'Paste the role you are targeting.' },
                    { n: 3, icon: FiCpu, chip: 'bg-emerald-500/10 text-emerald-600', title: 'Get AI insights', desc: 'ATS score, keyword gaps & fixes.' },
                  ].map((s) => (
                    <div
                      key={s.n}
                      className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                    >
                      <span className="absolute right-4 top-2 select-none text-5xl font-black leading-none text-foreground/[0.06]">
                        {s.n}
                      </span>
                      <span className={`mb-4 flex size-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${s.chip}`}>
                        <s.icon className="h-5 w-5" />
                      </span>
                      <h4 className="text-[15px] font-semibold text-foreground">{s.title}</h4>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-4">
                  {[
                    { k: '100%', v: 'AI-Powered', c: 'text-primary' },
                    { k: 'ATS', v: 'Compatible', c: 'text-violet-600' },
                    { k: 'Fast', v: 'Analysis', c: 'text-emerald-600' },
                    { k: 'Smart', v: 'Insights', c: 'text-amber-600' },
                  ].map((f) => (
                    <div key={f.v} className="rounded-xl bg-muted/40 p-3 text-center">
                      <div className={`text-xl font-bold md:text-2xl ${f.c}`}>{f.k}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{f.v}</div>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            )}

      </div>
    </div>
  );
};

export default ResumeAnalyzer;