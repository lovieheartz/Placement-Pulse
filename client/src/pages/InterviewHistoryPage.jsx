import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Inbox, Mic, Eye, Trash2 } from 'lucide-react';
import './Dashboard.css';

const API_BASE = 'http://localhost:3001';

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
      const res = await axios.get('http://localhost:3001/student/profile', {
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

  const fetchInterviewHistory = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE}/api/interview/history`, {
        headers: { Authorization: `Bearer ${token}` }
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
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove from list
      setInterviews(interviews.filter(i => i._id !== interviewId));
      setShowDeleteConfirm(null);

      // Close modal if deleted interview was being viewed
      if (selectedInterview?._id === interviewId) {
        setSelectedInterview(null);
      }
    } catch (error) {
      console.error('Error deleting interview:', error);
      alert('Failed to delete interview');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getReadinessLabel = (level) => {
    const labels = {
      excellent: '🌟 Excellent',
      well_prepared: '✨ Well Prepared',
      ready: '👍 Ready',
      needs_improvement: '📈 Needs Improvement',
      not_ready: '🔄 Not Ready'
    };
    return labels[level] || level;
  };

  if (!user) {
    return null;
  }

  return (
    <PortalLayout role="student" title="Interview History" user={profileData}>
        <div>
          {/* Header */}
          <PageHeader
            title="Interview History"
            subtitle="View your past interviews and performance reports"
            icon={History}
          />

          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '400px'
            }}>
              <div style={{
                textAlign: 'center'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  border: '4px solid #e2e8f0',
                  borderTop: '4px solid #667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }}></div>
                <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Loading interview history...</p>
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1.5rem'
            }}>
              {interviews.map((interview) => (
                <div
                  key={interview._id}
                  style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '1.5rem',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    border: '2px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)';
                    e.currentTarget.style.borderColor = '#667eea';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                  onClick={() => setSelectedInterview(interview)}
                >
                  {/* Score Circle */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'white',
                      border: `4px solid ${getScoreColor(interview.overallScore || 0)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.8rem',
                      fontWeight: 800,
                      color: getScoreColor(interview.overallScore || 0)
                    }}>
                      {interview.overallScore || 'N/A'}
                    </div>
                    <Badge variant={interview.status === 'completed' ? 'success' : 'warning'}>
                      {interview.status === 'completed' ? 'Completed' : 'In Progress'}
                    </Badge>
                  </div>

                  {/* Interview Details */}
                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: '0.5rem'
                  }}>{interview.jobRole}</h3>

                  <p style={{
                    fontSize: '0.95rem',
                    color: '#64748b',
                    marginBottom: '1rem'
                  }}>
                    {interview.industry} • {interview.difficulty}
                  </p>

                  {/* Readiness Level */}
                  {interview.overallFeedback?.readinessLevel && (
                    <div style={{
                      padding: '0.5rem 1rem',
                      background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#334155',
                      textAlign: 'center'
                    }}>
                      {getReadinessLabel(interview.overallFeedback.readinessLevel)}
                    </div>
                  )}

                  {/* Date */}
                  <p style={{
                    fontSize: '0.85rem',
                    color: '#94a3b8',
                    marginBottom: '1rem'
                  }}>
                    📅 {new Date(interview.completedAt || interview.startedAt).toLocaleString()}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-3">
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
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowDeleteConfirm(null)}
          >
            <div
              className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-8 w-[90%] max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-foreground mb-4">Delete Interview?</h3>
              <p className="text-sm text-muted-foreground mb-8">
                This action cannot be undone. All interview data and analysis will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(null)}
                >
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
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem',
            overflowY: 'auto'
          }}
          onClick={() => setSelectedInterview(null)}
          >
            <div
              className="relative rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedInterview(null)}
                className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xl text-muted-foreground hover:bg-accent transition-colors"
              >×</button>

              {/* Header */}
              <div style={{
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '1.5rem',
                marginBottom: '2rem'
              }}>
                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#1e293b',
                  marginBottom: '0.5rem'
                }}>{selectedInterview.jobRole} Interview</h2>
                <p style={{
                  fontSize: '1.1rem',
                  color: '#64748b'
                }}>
                  {selectedInterview.industry} • {selectedInterview.difficulty} • {new Date(selectedInterview.completedAt || selectedInterview.startedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Score Summary */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3rem',
                marginBottom: '2rem',
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
                  justifyContent: 'center',
                  fontSize: '3rem',
                  fontWeight: 800,
                  color: getScoreColor(selectedInterview.overallScore || 0)
                }}>
                  {selectedInterview.overallScore || 'N/A'}
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ 100</span>
                </div>
                <div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem'
                  }}>
                    {selectedInterview.overallFeedback?.readinessLevel ?
                      getReadinessLabel(selectedInterview.overallFeedback.readinessLevel) :
                      'Overall Performance'
                    }
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    opacity: 0.9
                  }}>Interview Readiness Level</div>
                </div>
              </div>

              {/* Feedback Sections */}
              {selectedInterview.overallFeedback && (
                <>
                  {/* Strengths */}
                  {selectedInterview.overallFeedback.strengths && selectedInterview.overallFeedback.strengths.length > 0 && (
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
                      }}>💪 Your Strengths</h3>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0
                      }}>
                        {selectedInterview.overallFeedback.strengths.map((strength, idx) => (
                          <li key={idx} style={{
                            padding: '0.75rem',
                            marginBottom: '0.5rem',
                            background: 'white',
                            borderRadius: '8px',
                            color: '#064e3b',
                            fontSize: '0.95rem'
                          }}>
                            ✅ {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Areas for Improvement */}
                  {selectedInterview.overallFeedback.areasForImprovement && selectedInterview.overallFeedback.areasForImprovement.length > 0 && (
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
                      }}>📈 Areas to Improve</h3>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0
                      }}>
                        {selectedInterview.overallFeedback.areasForImprovement.map((area, idx) => (
                          <li key={idx} style={{
                            padding: '0.75rem',
                            marginBottom: '0.5rem',
                            background: 'white',
                            borderRadius: '8px',
                            color: '#78350f',
                            fontSize: '0.95rem'
                          }}>
                            🔸 {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {selectedInterview.overallFeedback.recommendations && selectedInterview.overallFeedback.recommendations.length > 0 && (
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
                        marginBottom: '1rem'
                      }}>💡 Recommendations</h3>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0
                      }}>
                        {selectedInterview.overallFeedback.recommendations.map((rec, idx) => (
                          <li key={idx} style={{
                            padding: '0.75rem',
                            marginBottom: '0.5rem',
                            background: 'white',
                            borderRadius: '8px',
                            color: '#312e81',
                            fontSize: '0.95rem'
                          }}>
                            → {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Closing Message */}
                  {selectedInterview.overallFeedback.closingMessage && (
                    <div style={{
                      padding: '1.5rem',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      borderRadius: '15px',
                      borderLeft: '4px solid #667eea'
                    }}>
                      <h3 style={{
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        marginBottom: '0.75rem'
                      }}>📝 Summary</h3>
                      <p style={{
                        fontSize: '1rem',
                        color: '#475569',
                        lineHeight: 1.7
                      }}>
                        {selectedInterview.overallFeedback.closingMessage}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
    </PortalLayout>
  );
};

export default InterviewHistoryPage;
