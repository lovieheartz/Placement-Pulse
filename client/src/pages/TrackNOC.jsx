import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import axios from 'axios';
import { resolveFileUrl } from '../lib/api';

const TrackNOC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

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

  const { data: nocRequests = [], isLoading } = useQuery({
    queryKey: ['nocRequests'],
    queryFn: async () => {
      const { data } = await axios.get('http://localhost:3001/noc/student', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data.data;
    },
    enabled: !!user,
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'read': return 'bg-yellow-100 text-yellow-800';
      case 'reply_soon': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'sent': return 'Pending';
      case 'read': return 'Read';
      case 'reply_soon': return 'Reply Soon';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'sent': return 'warning';
      case 'read': return 'default';
      case 'reply_soon': return 'warning';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getTimelineSteps = (status) => {
    const steps = [
      { key: 'sent', label: 'Pending', completed: true },
      { key: 'read', label: 'Read', completed: ['read', 'reply_soon', 'completed'].includes(status) },
      { key: 'reply_soon', label: 'Reply Soon', completed: ['reply_soon', 'completed'].includes(status) },
      { key: 'completed', label: 'Completed', completed: status === 'completed' }
    ];
    return steps;
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">You are not logged in</h1>
        <p className="text-lg text-gray-600 mb-6">Please login to access your dashboard.</p>
      </div>
    );
  }

  return (
    <PortalLayout role="student" title="Track NOC" user={profileData}>
          <div className="max-w-4xl mx-auto">
            <PageHeader
              title="Track NOC Requests"
              subtitle="Monitor your NOC application status"
              icon={FileText}
            />
            <GlassPanel>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                  </div>
                ) : nocRequests.length > 0 ? (
                  <div className="space-y-6">
                    {nocRequests.map((request) => (
                      <div key={request._id} className="bg-muted/40 rounded-xl p-6 border border-border">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{request.name}</h3>
                            <p className="text-sm text-muted-foreground">Roll: {request.universityRoll} | {request.course} - {request.branch}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Submitted: {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={getStatusVariant(request.status)}>
                            {getStatusText(request.status)}
                          </Badge>
                        </div>

                        {/* Timeline */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between">
                            {getTimelineSteps(request.status).map((step, index) => (
                              <div key={step.key} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                  step.completed ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                                }`}>
                                  {step.completed ? '✓' : index + 1}
                                </div>
                                <div className="ml-2 text-xs text-gray-600">{step.label}</div>
                                {index < getTimelineSteps(request.status).length - 1 && (
                                  <div className={`w-16 h-0.5 mx-4 ${
                                    step.completed ? 'bg-blue-600' : 'bg-gray-300'
                                  }`}></div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-card rounded-lg border border-border p-4 mb-4">
                          <h4 className="font-medium text-foreground mb-2">Subject:</h4>
                          <p className="text-sm text-muted-foreground mb-3">{request.subject}</p>
                          <h4 className="font-medium text-foreground mb-2">Application:</h4>
                          <p className="text-sm text-muted-foreground">{request.applicationText}</p>
                        </div>

                        <div className="bg-card rounded-lg border border-border p-4 mb-4">
                          <h4 className="font-medium text-foreground mb-2">Contact Details:</h4>
                          <p className="text-sm text-muted-foreground">College Email: {request.collegeEmail}</p>
                          <p className="text-sm text-muted-foreground">Personal Email: {request.personalEmail}</p>
                          <p className="text-sm text-muted-foreground">Course: {request.course} - {request.branch}</p>
                        </div>

                        {request.attachment && (
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground mb-2">
                              <span className="font-medium">Attachment:</span> {request.attachment.filename}
                            </p>
                            <div className="flex space-x-2">
                              <a
                                href={resolveFileUrl(request.attachment.path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition"
                              >
                                View PDF
                              </a>
                              <a
                                href={resolveFileUrl(request.attachment.path)}
                                download={request.attachment.filename}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition"
                              >
                                Download PDF
                              </a>
                            </div>
                          </div>
                        )}

                        {request.adminRemarks && (
                          <div className="bg-primary/5 rounded-lg border border-primary/15 p-4">
                            <h4 className="font-medium text-foreground mb-2">Admin Remarks:</h4>
                            <p className="text-sm text-muted-foreground">{request.adminRemarks}</p>
                            {request.processedAt && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Updated: {new Date(request.processedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="No NOC requests found"
                    description="You haven't submitted any NOC requests yet."
                    action={
                      <Button onClick={() => navigate('/student/apply-noc')}>
                        Apply for NOC
                      </Button>
                    }
                  />
                )}
            </GlassPanel>
          </div>
    </PortalLayout>
  );
};

export default TrackNOC;