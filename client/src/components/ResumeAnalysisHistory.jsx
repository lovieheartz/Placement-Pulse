import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiClock,
  FiFileText,
  FiTrendingUp,
  FiRefreshCw,
  FiEye,
  FiTrash2,
  FiCalendar,
  FiAward,
  FiActivity
} from 'react-icons/fi';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const ResumeAnalysisHistory = () => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  useEffect(() => {
    fetchAnalysisHistory();
  }, []);

  const fetchAnalysisHistory = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('authToken');

      const response = await axios.get(
        'http://localhost:3001/api/resume-analysis/history',
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
        `http://localhost:3001/api/resume-analysis/${analysisId}`,
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
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analysis history...</p>
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <FiClock className="w-24 h-24 text-gray-300 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-gray-800 mb-3">No Analysis History</h3>
        <p className="text-gray-600 text-lg">
          You haven't analyzed any resumes yet. Upload a resume to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl mr-4">
              <FiActivity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Analysis History</h2>
              <p className="text-gray-600">View and manage your past resume analyses</p>
            </div>
          </div>
          <button
            onClick={fetchAnalysisHistory}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {analyses.map((analysis) => (
          <div
            key={analysis._id}
            className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <FiFileText className="w-6 h-6" />
                <span className="text-sm font-medium">
                  {analysis.detected_industry?.replace(/_/g, ' ').toUpperCase() || 'GENERAL'}
                </span>
              </div>
              <p className="text-sm opacity-90 truncate">{analysis.resumeFileName}</p>
            </div>

            {/* Card Body */}
            <div className="p-6">
              {/* ATS Score */}
              <div className="flex items-center justify-center mb-6">
                <div className="w-32 h-32">
                  <CircularProgressbar
                    value={analysis.atsScore}
                    text={`${analysis.atsScore}%`}
                    styles={buildStyles({
                      pathColor: getScoreColor(analysis.atsScore),
                      textColor: getScoreColor(analysis.atsScore),
                      trailColor: '#F3F4F6',
                      textSize: '16px'
                    })}
                  />
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysis.matched_keywords?.length || 0}
                  </div>
                  <div className="text-xs text-green-700">Matched</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {analysis.missing_keywords?.length || 0}
                  </div>
                  <div className="text-xs text-red-700">Missing</div>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center text-gray-600 text-sm mb-4">
                <FiCalendar className="w-4 h-4 mr-2" />
                {formatDate(analysis.createdAt)}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedAnalysis(selectedAnalysis?._id === analysis._id ? null : analysis)}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <FiEye className="w-4 h-4 mr-2" />
                  {selectedAnalysis?._id === analysis._id ? 'Hide' : 'View'}
                </button>
                <button
                  onClick={() => deleteAnalysis(analysis._id)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed View Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white sticky top-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Analysis Details</h3>
                  <p className="text-blue-100">{selectedAnalysis.resumeFileName}</p>
                </div>
                <button
                  onClick={() => setSelectedAnalysis(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Score Overview */}
              <div className="text-center mb-6">
                <div className="inline-block">
                  <div className="w-40 h-40 mx-auto mb-4">
                    <CircularProgressbar
                      value={selectedAnalysis.atsScore}
                      text={`${selectedAnalysis.atsScore}%`}
                      styles={buildStyles({
                        pathColor: getScoreColor(selectedAnalysis.atsScore),
                        textColor: getScoreColor(selectedAnalysis.atsScore),
                        trailColor: '#F3F4F6',
                        textSize: '16px'
                      })}
                    />
                  </div>
                  <p className="text-lg font-semibold text-gray-800">ATS Compatibility Score</p>
                </div>
              </div>

              {/* Score Breakdown */}
              {selectedAnalysis.score_breakdown && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <FiAward className="w-5 h-5 mr-2 text-blue-600" />
                    Score Breakdown
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(selectedAnalysis.score_breakdown).map(([key, value]) => (
                      <div key={key} className="bg-white rounded-lg p-3">
                        <div className="text-sm text-gray-600 mb-1 capitalize">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="text-2xl font-bold" style={{ color: getScoreColor(value) }}>
                          {value.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Matched Keywords */}
                {selectedAnalysis.matched_keywords?.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-6">
                    <h4 className="font-semibold text-green-800 mb-4">
                      Matched Keywords ({selectedAnalysis.matched_keywords.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAnalysis.matched_keywords.slice(0, 10).map((keyword, idx) => (
                        <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm">
                          {keyword}
                        </span>
                      ))}
                      {selectedAnalysis.matched_keywords.length > 10 && (
                        <span className="px-3 py-1 bg-green-200 text-green-900 rounded-lg text-sm font-medium">
                          +{selectedAnalysis.matched_keywords.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Missing Keywords */}
                {selectedAnalysis.missing_keywords?.length > 0 && (
                  <div className="bg-red-50 rounded-xl p-6">
                    <h4 className="font-semibold text-red-800 mb-4">
                      Missing Keywords ({selectedAnalysis.missing_keywords.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAnalysis.missing_keywords.slice(0, 10).map((keyword, idx) => (
                        <span key={idx} className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm">
                          {keyword}
                        </span>
                      ))}
                      {selectedAnalysis.missing_keywords.length > 10 && (
                        <span className="px-3 py-1 bg-red-200 text-red-900 rounded-lg text-sm font-medium">
                          +{selectedAnalysis.missing_keywords.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions */}
              {selectedAnalysis.suggestions?.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-6">
                  <h4 className="font-semibold text-orange-800 mb-4 flex items-center">
                    <FiTrendingUp className="w-5 h-5 mr-2" />
                    Recommendations ({selectedAnalysis.suggestions.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedAnalysis.suggestions.slice(0, 5).map((suggestion, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-gray-800">
                            {suggestion.title || `Suggestion ${idx + 1}`}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                            suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {suggestion.priority?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">{suggestion.suggestion}</p>
                      </div>
                    ))}
                  </div>
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
