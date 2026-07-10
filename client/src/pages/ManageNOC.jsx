import React, { useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Filter } from 'lucide-react';
import axios from 'axios';
import { resolveFileUrl } from '../lib/api';
import { API_BASE } from '../config/api';

const ManageNOC = () => {
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const {
    data: profileData,
  } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/admin/profile`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
      });
      return data.data;
    },
    enabled: !!user,
  });

  const { data: nocRequests = [], isLoading } = useQuery({
    queryKey: ['adminNocRequests'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get(`${API_BASE}/noc/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data.data;
    },
    enabled: !!user,
  });

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, status, remarks }) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.put(`${API_BASE}/noc/admin/${id}/status`, {
        status,
        adminRemarks: remarks
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    onSuccess: () => {
      toast.success('NOC status updated successfully!');
      queryClient.invalidateQueries(['adminNocRequests']);
      setShowModal(false);
      setSelectedRequest(null);
      setNewStatus('');
      setAdminRemarks('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update NOC status');
    },
  });

  const handleStatusUpdate = (request) => {
    setSelectedRequest(request);
    setNewStatus(request.status);
    setAdminRemarks(request.adminRemarks || '');
    setShowModal(true);
  };

  const handleSubmitUpdate = () => {
    if (!newStatus) {
      toast.error('Please select a status');
      return;
    }
    updateStatus({
      id: selectedRequest._id,
      status: newStatus,
      remarks: adminRemarks
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'read': return 'bg-yellow-100 text-yellow-800';
      case 'reply_soon': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'sent': return 'default';
      case 'read': return 'warning';
      case 'reply_soon': return 'warning';
      case 'completed': return 'success';
      default: return 'default';
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

  const getStatusOrder = (status) => {
    switch (status) {
      case 'sent': return 0;
      case 'read': return 1;
      case 'reply_soon': return 2;
      case 'completed': return 3;
      default: return 0;
    }
  };

  const filteredRequests = nocRequests.filter(request => {
    if (statusFilter === 'all') return true;
    return request.status === statusFilter;
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">You are not logged in</h1>
        <p className="text-lg text-gray-600 mb-6">Please login to access your dashboard.</p>
      </div>
    );
  }

  return (
    <PortalLayout role="admin" title="NOC Requests" user={profileData || user}>
          <PageHeader
            title="Manage NOC Requests"
            subtitle="Review and update student NOC applications"
            icon={FileText}
            actions={
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All Status</option>
                  <option value="sent">Pending</option>
                  <option value="read">Read</option>
                  <option value="reply_soon">Reply Soon</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            }
          />
          <GlassPanel>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : filteredRequests.length > 0 ? (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div key={request._id} className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{request.name}</h3>
                            <Badge variant={getStatusVariant(request.status)}>
                              {getStatusText(request.status)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium text-foreground">Roll:</span> {request.universityRoll}
                            </div>
                            <div>
                              <span className="font-medium text-foreground">Course:</span> {request.course} - {request.branch}
                            </div>
                            <div>
                              <span className="font-medium text-foreground">College:</span> {request.collegeEmail}
                            </div>
                            <div>
                              <span className="font-medium text-foreground">Personal:</span> {request.personalEmail}
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="text-sm text-foreground font-medium">Subject: {request.subject}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleStatusUpdate(request)}
                          size="sm"
                          className="ml-4"
                        >
                          View Details
                        </Button>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                        <div className="text-xs text-muted-foreground">
                          Submitted: {new Date(request.createdAt).toLocaleDateString()}
                          {request.processedAt && (
                            <span className="ml-4">Updated: {new Date(request.processedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        {request.attachment && (
                          <div className="flex gap-2">
                            <a
                              href={resolveFileUrl(request.attachment.path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View PDF
                            </a>
                            <a
                              href={resolveFileUrl(request.attachment.path)}
                              download={request.attachment.filename}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No NOC requests found"
                description="No students have submitted NOC requests yet."
              />
            )}
          </GlassPanel>

      {/* Status Update Modal */}
      {showModal && selectedRequest && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-[9999]">
          <div className="flex items-center justify-center min-h-full p-4 md:pl-64">
            <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center border-b border-border p-6 bg-gradient-to-r from-blue-600 to-blue-700">
              <h3 className="text-xl font-semibold text-white">NOC Request Details</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="mb-4">
                <h4 className="font-medium text-foreground mb-2">{selectedRequest.name}</h4>
                <p className="text-sm text-muted-foreground">Roll: {selectedRequest.universityRoll}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.course} - {selectedRequest.branch}</p>
                <p className="text-sm text-muted-foreground">College: {selectedRequest.collegeEmail}</p>
                <p className="text-sm text-muted-foreground">Personal: {selectedRequest.personalEmail}</p>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-foreground mb-2">Subject:</h4>
                <p className="text-sm text-muted-foreground">{selectedRequest.subject}</p>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-foreground mb-2">Application:</h4>
                <div className="bg-muted/40 p-3 rounded text-sm text-foreground max-h-40 overflow-y-auto">
                  {selectedRequest.applicationText}
                </div>
              </div>

              {selectedRequest.attachment && (
                <div className="mb-4">
                  <h4 className="font-medium text-foreground mb-2">Attachment:</h4>
                  <p className="text-sm text-muted-foreground mb-2">{selectedRequest.attachment.filename}</p>
                  <div className="flex space-x-2">
                    <a
                      href={resolveFileUrl(selectedRequest.attachment.path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition"
                    >
                      View PDF
                    </a>
                    <a
                      href={resolveFileUrl(selectedRequest.attachment.path)}
                      download={selectedRequest.attachment.filename}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition"
                    >
                      Download
                    </a>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="read" disabled={getStatusOrder(selectedRequest.status) > 1}>Read</option>
                  <option value="reply_soon" disabled={getStatusOrder(selectedRequest.status) > 2}>Reply Soon</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Admin Remarks</label>
                <textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Add remarks for the student..."
                />
              </div>
            </div>

              <div className="flex justify-between items-center border-t border-border p-6 bg-muted/40">
                <Button
                  onClick={() => setShowModal(false)}
                  variant="outline"
                >
                  ← Back to List
                </Button>
                <Button
                  onClick={handleSubmitUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
};

export default ManageNOC;