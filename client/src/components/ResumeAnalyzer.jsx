import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
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
        'http://localhost:3001/api/resume-analysis/upload',
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
      case 'high': return 'bg-gradient-to-r from-red-500 to-pink-500 text-white';
      case 'medium': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
      case 'low': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">

        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="flex flex-col sm:flex-row items-center justify-center mb-4 sm:mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl mb-3 sm:mb-0 sm:mr-4">
              <FiCpu className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
              AI Resume Analyzer Pro
            </h1>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl mx-auto px-4">
            Advanced AI-powered resume analysis with industry-specific insights,
            sophisticated ATS scoring, and professional optimization recommendations.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 xl:gap-12">

          {/* Left Column - Upload & Job Description */}
          <div className="lg:col-span-4 space-y-6 sm:space-y-8">

            {/* File Upload Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 sm:p-6">
                <div className="flex items-center">
                  <FiUpload className="w-5 h-5 sm:w-6 sm:h-6 text-white mr-2 sm:mr-3" />
                  <h3 className="text-lg sm:text-xl font-semibold text-white">Upload Resume</h3>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div
                  className={`border-2 border-dashed rounded-xl p-4 sm:p-6 lg:p-8 text-center transition-all duration-300 ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {file ? (
                    <div className="space-y-4">
                      <div className="text-green-500">
                        <FiCheckCircle className="mx-auto w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm sm:text-base break-all">{file.name}</p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={removeFile}
                        className="px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm sm:text-base rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="text-gray-400">
                        <FiFileText className="mx-auto w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                      </div>
                      <div>
                        <p className="text-base sm:text-lg font-medium text-gray-800">
                          Drop your resume here
                        </p>
                        <p className="text-sm sm:text-base text-gray-500">PDF or DOCX format</p>
                      </div>
                      <label className="cursor-pointer">
                        <span className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm sm:text-base rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-105 inline-block">
                          Choose File
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
            </div>

            {/* Job Description Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4 sm:p-6">
                <div className="flex items-center">
                  <FiTarget className="w-5 h-5 sm:w-6 sm:h-6 text-white mr-2 sm:mr-3" />
                  <h3 className="text-lg sm:text-xl font-semibold text-white">Job Description</h3>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the complete job description here for accurate ATS analysis..."
                  className="w-full h-32 sm:h-40 lg:h-48 px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-xs sm:text-sm leading-relaxed"
                />
                <div className="mt-2 text-xs sm:text-sm text-gray-500">
                  {jobDescription.length} characters
                </div>
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={analyzeResume}
              disabled={!file || !jobDescription.trim() || isAnalyzing}
              className="w-full px-4 py-3 sm:px-6 sm:py-4 lg:px-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm sm:text-base rounded-xl hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:transform-none"
            >
              {isAnalyzing ? (
                <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Analyzing...</span>
                  <span className="sm:hidden">Analyzing</span>
                  <FiZap className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <FiCpu className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Analyze with AI</span>
                  <span className="sm:hidden">Analyze</span>
                </div>
              )}
            </button>
          </div>

          {/* Middle & Right Columns - Analysis Progress & Results */}
          <div className="lg:col-span-8 space-y-8 sm:space-y-10 lg:space-y-12">

            {/* Analysis Progress */}
            {isAnalyzing && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-6">
                    <CircularProgressbar
                      value={analysisProgress}
                      text={`${Math.round(analysisProgress)}%`}
                      styles={buildStyles({
                        pathColor: '#3B82F6',
                        textColor: '#1F2937',
                        trailColor: '#E5E7EB',
                        textSize: '16px'
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-800">AI Analysis in Progress</h3>
                    <p className="text-blue-600 font-medium">{currentAnalysisStep}</p>
                    <div className="flex justify-center space-x-2 mt-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Results */}
            {analysisResult && !isAnalyzing && (
              <div className="space-y-8">

                {/* Enhanced ATS Score Overview */}
                <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-6 sm:mb-8 lg:mb-10">
                  <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-4 sm:p-6 lg:p-8 text-white">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                      <div className="mb-3 sm:mb-0">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">ATS Compatibility Score</h2>
                        <p className="text-blue-100 text-sm sm:text-base lg:text-lg">Applicant Tracking System Analysis</p>
                      </div>
                      <FiAward className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white opacity-20 self-end sm:self-auto" />
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
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
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 mb-2">
                            {getScoreGrade(analysisResult.atsScore).desc}
                          </h3>
                          <p className="text-gray-600 text-sm sm:text-base lg:text-lg leading-relaxed">
                            Your resume has been analyzed against industry standards and ATS requirements.
                            {analysisResult.atsScore >= 85 ? 'Excellent work! Your resume is highly optimized for ATS systems and should pass most screening processes.' :
                             analysisResult.atsScore >= 70 ? 'Good foundation! Your resume meets most ATS requirements with room for minor improvements.' :
                             analysisResult.atsScore >= 55 ? 'Your resume needs some optimization to improve its chances with ATS systems.' :
                             'Significant improvements needed to make your resume ATS-friendly and increase job application success.'}
                          </p>
                        </div>

                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                          <h4 className="font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center text-sm sm:text-base">
                            <FiTarget className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                            Key Metrics
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="text-center bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
                              <div className="text-xl sm:text-2xl font-bold text-green-600">{analysisResult.matched_keywords?.length || 0}</div>
                              <div className="text-xs sm:text-sm text-gray-600">Keywords Matched</div>
                            </div>
                            <div className="text-center bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
                              <div className="text-xl sm:text-2xl font-bold text-red-600">{analysisResult.missing_keywords?.length || 0}</div>
                              <div className="text-xs sm:text-sm text-gray-600">Missing Keywords</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Industry Analysis Card */}
                <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 lg:mb-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 sm:mb-8">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl mr-0 sm:mr-4 lg:mr-6 mb-3 sm:mb-0">
                      <FiLayers className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Industry & Role Analysis</h3>
                      <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Detected classification and alignment</p>
                    </div>
                  </div>

                  <div className="text-center mb-6 sm:mb-8">
                    <div className="inline-block bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
                      <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-700 mb-1 sm:mb-2 capitalize">
                        {analysisResult.detected_industry?.replace(/_/g, ' ') || 'General'}
                      </div>
                      <p className="text-indigo-600 text-sm sm:text-base lg:text-lg">Primary Industry Classification</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-green-200">
                      <div className="flex items-center mb-3 sm:mb-4">
                        <FiCheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mr-2 sm:mr-3" />
                        <h4 className="font-semibold text-green-800 text-sm sm:text-base">Keywords Matched</h4>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">{analysisResult.matched_keywords?.length || 0}</div>
                      <p className="text-green-700 text-xs sm:text-sm">Successfully identified relevant terms</p>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-red-200">
                      <div className="flex items-center mb-3 sm:mb-4">
                        <FiAlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 mr-2 sm:mr-3" />
                        <h4 className="font-semibold text-red-800 text-sm sm:text-base">Missing Keywords</h4>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-red-600 mb-1 sm:mb-2">{analysisResult.missing_keywords?.length || 0}</div>
                      <p className="text-red-700 text-xs sm:text-sm">Keywords to consider adding</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-200 sm:col-span-2 lg:col-span-1">
                      <div className="flex items-center mb-3 sm:mb-4">
                        <FiTrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mr-2 sm:mr-3" />
                        <h4 className="font-semibold text-blue-800 text-sm sm:text-base">Match Rate</h4>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1 sm:mb-2">
                        {analysisResult.matched_keywords?.length && analysisResult.missing_keywords?.length ?
                          Math.round((analysisResult.matched_keywords.length / (analysisResult.matched_keywords.length + analysisResult.missing_keywords.length)) * 100) : 0}%
                      </div>
                      <p className="text-blue-700 text-xs sm:text-sm">Keyword coverage ratio</p>
                    </div>
                  </div>
                </div>

                {/* Score Breakdown Visualization */}
                {analysisResult.score_breakdown && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-xl mr-4">
                          <FiBarChart2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">Detailed Score Analysis</h3>
                          <p className="text-gray-600">Performance breakdown across key factors</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {showDetailedAnalysis ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Radar Chart */}
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-4">Performance Radar</h4>
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
                        <h4 className="font-semibold text-gray-800 mb-4">Score Breakdown</h4>
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
                          <div key={key} className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1 capitalize">
                              {key.replace(/_/g, ' ')}
                            </div>
                            <div className="text-2xl font-bold" style={{color: getScoreColor(value)}}>
                              {value.toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Enhanced AI Recommendations */}
                {analysisResult.suggestions?.length > 0 && (
                  <div className="bg-white rounded-3xl shadow-xl border border-orange-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 p-8 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold mb-2 flex items-center">
                            <FiTrendingUp className="w-8 h-8 mr-3" />
                            AI-Powered Optimization Recommendations
                          </h3>
                          <p className="text-orange-100 text-lg">
                            {analysisResult.suggestions.length} professional improvement strategies identified
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold">{analysisResult.suggestions.length}</div>
                          <div className="text-orange-200">Suggestions</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-10">
                      <div className="mb-8">
                        <h4 className="text-xl font-semibold text-gray-800 mb-3">Strategic Improvements for Maximum Impact:</h4>
                        <p className="text-gray-600 text-lg leading-relaxed">
                          Our AI has analyzed your resume and identified specific areas for enhancement.
                          Implementing these recommendations will significantly improve your ATS score and recruiter appeal.
                        </p>
                      </div>

                      <div className="space-y-8">
                        {analysisResult.suggestions.map((suggestion, index) => {
                          const priorityColors = {
                            high: 'from-red-50 to-pink-50 border-red-200',
                            medium: 'from-yellow-50 to-orange-50 border-orange-200',
                            low: 'from-green-50 to-emerald-50 border-green-200'
                          };
                          const priorityTextColors = {
                            high: 'text-red-800',
                            medium: 'text-orange-800',
                            low: 'text-green-800'
                          };
                          const priorityBadgeColors = {
                            high: 'bg-red-100 text-red-800',
                            medium: 'bg-orange-100 text-orange-800',
                            low: 'bg-green-100 text-green-800'
                          };

                          return (
                            <div key={index} className={`bg-gradient-to-br ${priorityColors[suggestion.priority] || priorityColors.low} border-2 rounded-2xl p-8 hover:shadow-lg transition-all duration-300`}>
                              <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center space-x-4">
                                  <div className={`p-3 rounded-xl ${getPriorityColor(suggestion.priority)}`}>
                                    {getPriorityIcon(suggestion.priority)}
                                  </div>
                                  <div>
                                    <h5 className={`text-xl font-bold ${priorityTextColors[suggestion.priority] || priorityTextColors.low}`}>
                                      {suggestion.title || `Improvement Suggestion ${index + 1}`}
                                    </h5>
                                    <div className="flex items-center mt-2">
                                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${priorityBadgeColors[suggestion.priority] || priorityBadgeColors.low}`}>
                                        {suggestion.priority?.toUpperCase() || 'LOW'} PRIORITY
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <p className="text-gray-800 text-lg leading-relaxed">{suggestion.suggestion}</p>

                                {suggestion.impact && (
                                  <div className="bg-white bg-opacity-70 rounded-xl p-4">
                                    <h6 className="font-semibold text-gray-800 mb-2 flex items-center">
                                      <FiTarget className="w-4 h-4 mr-2" />
                                      Expected Impact:
                                    </h6>
                                    <p className="text-blue-700 font-medium">{suggestion.impact}</p>
                                  </div>
                                )}

                                {suggestion.keywords && suggestion.keywords.length > 0 && (
                                  <div className="bg-white bg-opacity-70 rounded-xl p-4">
                                    <h6 className="font-semibold text-gray-800 mb-3 flex items-center">
                                      <FiStar className="w-4 h-4 mr-2" />
                                      Recommended Keywords:
                                    </h6>
                                    <div className="flex flex-wrap gap-2">
                                      {suggestion.keywords.map((keyword, idx) => (
                                        <span key={idx} className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium border border-blue-200">
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
                  </div>
                )}

                {/* Enhanced Keywords Analysis */}
                <div className="space-y-10">
                  {/* Missing Keywords - High Priority */}
                  {analysisResult.missing_keywords?.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-xl border border-red-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-red-500 to-pink-600 p-8 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-2xl font-bold mb-2 flex items-center">
                              <FiAlertCircle className="w-8 h-8 mr-3" />
                              Critical Missing Keywords
                            </h3>
                            <p className="text-red-100 text-lg">
                              {analysisResult.missing_keywords.length} important terms not found in your resume
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-4xl font-bold">{analysisResult.missing_keywords.length}</div>
                            <div className="text-red-200">Missing</div>
                          </div>
                        </div>
                      </div>

                      <div className="p-8">
                        <div className="mb-6">
                          <h4 className="text-xl font-semibold text-gray-800 mb-3">Priority Keywords to Add:</h4>
                          <p className="text-gray-600 text-lg leading-relaxed">
                            These keywords were frequently mentioned in the job description but are missing from your resume.
                            Adding them could significantly improve your ATS score and visibility to recruiters.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {analysisResult.missing_keywords.map((keyword, index) => (
                            <div
                              key={index}
                              className="group bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:border-red-300 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-red-800 text-lg">{keyword}</span>
                                <FiTrendingUp className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
                              </div>
                              <div className="mt-2">
                                <span className="text-sm text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                  High Impact
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {analysisResult.missing_keywords.length > 12 && (
                          <div className="mt-6 text-center">
                            <p className="text-gray-500">Showing top priority keywords. Focus on these first for maximum impact.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Matched Keywords - Success Section */}
                  {analysisResult.matched_keywords?.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-xl border border-green-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-2xl font-bold mb-2 flex items-center">
                              <FiCheckCircle className="w-8 h-8 mr-3" />
                              Successfully Matched Keywords
                            </h3>
                            <p className="text-green-100 text-lg">
                              {analysisResult.matched_keywords.length} relevant terms found in your resume
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-4xl font-bold">{analysisResult.matched_keywords.length}</div>
                            <div className="text-green-200">Matched</div>
                          </div>
                        </div>
                      </div>

                      <div className="p-8">
                        <div className="mb-6">
                          <h4 className="text-xl font-semibold text-gray-800 mb-3">Strong Keyword Alignment:</h4>
                          <p className="text-gray-600 text-lg leading-relaxed">
                            Excellent! These keywords from the job description are already present in your resume,
                            demonstrating strong alignment with the role requirements.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {analysisResult.matched_keywords.slice(0, 16).map((keyword, index) => (
                            <div
                              key={index}
                              className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-3 text-center hover:shadow-md transition-all duration-300"
                            >
                              <span className="font-semibold text-green-800">{keyword}</span>
                              <div className="mt-2">
                                <FiStar className="w-4 h-4 text-green-600 mx-auto" />
                              </div>
                            </div>
                          ))}
                        </div>

                        {analysisResult.matched_keywords.length > 16 && (
                          <div className="mt-6 text-center">
                            <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full">
                              +{analysisResult.matched_keywords.length - 16} more matched keywords
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>


                {/* Analysis Metadata */}
                {analysisResult.analysis_metadata && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center mb-4">
                      <FiActivity className="w-5 h-5 text-blue-600 mr-2" />
                      <h4 className="font-semibold text-gray-800">Analysis Summary</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-gray-800">Keywords Analyzed</div>
                        <div className="text-blue-600 text-lg">{analysisResult.analysis_metadata.total_keywords_analyzed}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-800">Resume Words</div>
                        <div className="text-purple-600 text-lg">{analysisResult.analysis_metadata.resume_word_count}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-800">Job Desc Words</div>
                        <div className="text-green-600 text-lg">{analysisResult.analysis_metadata.job_description_word_count}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-800">Processing Time</div>
                        <div className="text-orange-600 text-lg">{analysisResult.processingTime ? `${(analysisResult.processingTime / 1000).toFixed(1)}s` : 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Enhanced Empty State */}
            {!analysisResult && !isAnalyzing && (
              <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 rounded-3xl shadow-xl border border-gray-100 p-16 text-center">
                <div className="text-gray-400 mb-8">
                  <FiCpu className="mx-auto w-32 h-32" />
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-6">Ready for Advanced AI Analysis</h3>
                <p className="text-gray-600 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
                  Upload your resume and provide a detailed job description to receive
                  comprehensive ATS analysis with industry-specific insights and professional optimization recommendations.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                  <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FiCpu className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">AI-Powered Analysis</h4>
                    <p className="text-gray-600 leading-relaxed">Advanced machine learning algorithms analyze your resume against industry standards and job requirements.</p>
                  </div>
                  <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FiTarget className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Smart Industry Detection</h4>
                    <p className="text-gray-600 leading-relaxed">Automatically identifies your industry and provides tailored recommendations for maximum impact.</p>
                  </div>
                  <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FiStar className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Professional Optimization</h4>
                    <p className="text-gray-600 leading-relaxed">Get actionable suggestions to improve your ATS score and increase your chances of landing interviews.</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalyzer;