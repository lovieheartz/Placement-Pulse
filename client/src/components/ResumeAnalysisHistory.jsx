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
      <div className="flex justify-center items-center min-h-[300px] sm:min-h-[400px]">
        <div className="text-center px-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-3 sm:border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Loading analysis history...</p>
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 text-center animate-fade-in">
        <FiClock className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-gray-300 mx-auto mb-4 sm:mb-6 animate-float" />
        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2 sm:mb-3">No Analysis History</h3>
        <p className="text-gray-600 text-sm sm:text-base md:text-lg px-4">
          You haven't analyzed any resumes yet. Upload a resume to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 sm:p-3 rounded-lg sm:rounded-xl mr-3 sm:mr-4 flex-shrink-0">
              <FiActivity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Analysis History</h2>
              <p className="text-gray-600 text-xs sm:text-sm md:text-base">View and manage your past resume analyses</p>
            </div>
          </div>
          <button
            onClick={fetchAnalysisHistory}
            className="flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all hover:shadow-lg text-sm sm:text-base self-end sm:self-auto"
          >
            <FiRefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {analyses.map((analysis, index) => (
          <div
            key={analysis._id}
            className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] animate-fade-in"
            style={{animationDelay: `${index * 50}ms`}}
          >
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 sm:p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <FiFileText className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">
                  {analysis.detected_industry?.replace(/_/g, ' ').toUpperCase() || 'GENERAL'}
                </span>
              </div>
              <p className="text-xs sm:text-sm opacity-90 truncate" title={analysis.resumeFileName}>
                {analysis.resumeFileName}
              </p>
            </div>

            {/* Card Body */}
            <div className="p-4 sm:p-5 md:p-6">
              {/* ATS Score */}
              <div className="flex items-center justify-center mb-4 sm:mb-6">
                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32">
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
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-green-50 rounded-lg p-2.5 sm:p-3 text-center transition-transform hover:scale-105">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {analysis.matched_keywords?.length || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-green-700">Matched</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2.5 sm:p-3 text-center transition-transform hover:scale-105">
                  <div className="text-xl sm:text-2xl font-bold text-red-600">
                    {analysis.missing_keywords?.length || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-red-700">Missing</div>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">
                <FiCalendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{formatDate(analysis.createdAt)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedAnalysis(selectedAnalysis?._id === analysis._id ? null : analysis)}
                  className="flex-1 flex items-center justify-center px-2 py-2 sm:px-3 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all hover:shadow-lg text-xs sm:text-sm"
                >
                  <FiEye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  {selectedAnalysis?._id === analysis._id ? 'Hide' : 'View'}
                </button>
                <button
                  onClick={() => deleteAnalysis(analysis._id)}
                  className="px-2 py-2 sm:px-3 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all hover:shadow-lg"
                >
                  <FiTrash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed View Modal */}
      {selectedAnalysis && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '2rem'
        }}
        onClick={() => setSelectedAnalysis(null)}
        >
          <div style={{
            background: 'white',
            borderRadius: '20px',
            maxWidth: '1000px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedAnalysis(null)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                background: 'rgba(255,255,255,0.9)',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                fontSize: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontWeight: 'bold',
                zIndex: 10,
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
                e.currentTarget.style.color = '#64748b';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >×</button>

            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '2rem 2.5rem',
              borderRadius: '20px 20px 0 0'
            }}>
              <h2 style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: 'white',
                marginBottom: '0.5rem',
                textShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}>📄 Resume Analysis Report</h2>
              <p style={{
                fontSize: '1.1rem',
                color: 'rgba(255,255,255,0.95)',
                fontWeight: 500
              }}>{selectedAnalysis.resumeFileName}</p>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '2.5rem',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              {/* Score Summary */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3rem',
                marginBottom: '2.5rem',
                padding: '2rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '15px',
                color: 'white'
              }}>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    fontSize: '3rem',
                    fontWeight: 800,
                    color: getScoreColor(selectedAnalysis.atsScore)
                  }}>{selectedAnalysis.atsScore}</div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ 100</span>
                </div>
                <div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem'
                  }}>ATS Compatibility Score</div>
                  <div style={{
                    fontSize: '1rem',
                    opacity: 0.9
                  }}>Resume Analysis Results</div>
                </div>
              </div>

              {/* Score Breakdown */}
              {selectedAnalysis.score_breakdown && (
                <div style={{
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                  borderRadius: '15px'
                }}>
                  <h3 style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: '#3730a3',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <FiAward style={{ marginRight: '0.5rem' }} />
                    📊 Score Breakdown
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '1rem'
                  }}>
                    {Object.entries(selectedAnalysis.score_breakdown).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '1rem',
                        background: 'white',
                        borderRadius: '10px',
                        textAlign: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{
                          fontSize: '0.85rem',
                          color: '#64748b',
                          marginBottom: '0.5rem',
                          textTransform: 'capitalize',
                          fontWeight: 600
                        }}>
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div style={{
                          fontSize: '2rem',
                          fontWeight: 800,
                          color: getScoreColor(value)
                        }}>
                          {value.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Keywords */}
              {selectedAnalysis.matched_keywords?.length > 0 && (
                <div style={{
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                  borderRadius: '15px'
                }}>
                  <h3 style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: '#065f46',
                    marginBottom: '1rem'
                  }}>✅ Matched Keywords ({selectedAnalysis.matched_keywords.length})</h3>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    {selectedAnalysis.matched_keywords.map((keyword, idx) => (
                      <span key={idx} style={{
                        padding: '0.5rem 1rem',
                        background: 'white',
                        borderRadius: '8px',
                        color: '#064e3b',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Keywords */}
              {selectedAnalysis.missing_keywords?.length > 0 && (
                <div style={{
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '15px'
                }}>
                  <h3 style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: '#92400e',
                    marginBottom: '1rem'
                  }}>⚠️ Missing Keywords ({selectedAnalysis.missing_keywords.length})</h3>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    {selectedAnalysis.missing_keywords.map((keyword, idx) => (
                      <span key={idx} style={{
                        padding: '0.5rem 1rem',
                        background: 'white',
                        borderRadius: '8px',
                        color: '#78350f',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {selectedAnalysis.suggestions?.length > 0 && (
                <div style={{
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                  borderRadius: '15px'
                }}>
                  <h3 style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: '#3730a3',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <FiTrendingUp style={{ marginRight: '0.5rem' }} />
                    💡 Recommendations
                  </h3>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    {selectedAnalysis.suggestions.map((suggestion, idx) => (
                      <li key={idx} style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        background: 'white',
                        borderRadius: '8px',
                        color: '#312e81',
                        fontSize: '0.95rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '1rem'
                        }}>
                          <span style={{ flex: 1 }}>
                            → {suggestion.suggestion || suggestion}
                          </span>
                          {suggestion.priority && (
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              flexShrink: 0,
                              background: suggestion.priority === 'high' ? '#ef4444' :
                                         suggestion.priority === 'medium' ? '#f59e0b' : '#10b981',
                              color: 'white'
                            }}>
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
