import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import axios from 'axios';

const ManageNOC = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const { data: nocRequests = [], isLoading } = useQuery({
    queryKey: ['adminNocRequests'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get('http://localhost:3001/noc/admin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data.data;
    },
    enabled: !!user,
  });

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, status, remarks }) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.put(`http://localhost:3001/noc/admin/${id}/status`, {
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

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
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
    <div className="dashboard">
      <Sidebar />
      <div className="main">
        <Header 
          user={user} 
          toggleDropdown={toggleDropdown} 
          isDropdownOpen={isDropdownOpen} 
          handleLogout={handleLogout} 
          navigate={navigate} 
        />

        <div className="content-container px-3 py-4 w-full mx-auto max-w-full">
          <div className="bg-white rounded-xl shadow-sm px-4 py-4 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
              <h1 className="text-xl font-semibold text-gray-800">Manage NOC Requests</h1>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="sent">Pending</option>
                  <option value="read">Read</option>
                  <option value="reply_soon">Reply Soon</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredRequests.length > 0 ? (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div key={request._id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{request.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                              {getStatusText(request.status)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Roll:</span> {request.universityRoll}
                            </div>
                            <div>
                              <span className="font-medium">Course:</span> {request.course} - {request.branch}
                            </div>
                            <div>
                              <span className="font-medium">College:</span> {request.collegeEmail}
                            </div>
                            <div>
                              <span className="font-medium">Personal:</span> {request.personalEmail}
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="text-sm text-gray-700 font-medium">Subject: {request.subject}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleStatusUpdate(request)}
                          className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          Submitted: {new Date(request.createdAt).toLocaleDateString()}
                          {request.processedAt && (
                            <span className="ml-4">Updated: {new Date(request.processedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        {request.attachment && (
                          <div className="flex gap-2">
                            <a
                              href={`http://localhost:3001/uploads/noc/${request.attachment.path.split('/').pop()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View PDF
                            </a>
                            <a
                              href={`http://localhost:3001/uploads/noc/${request.attachment.path.split('/').pop()}`}
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
              <div className="text-center py-8">
                <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">No NOC requests found</h3>
                <p className="text-gray-600">No students have submitted NOC requests yet.</p>
              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>

      {/* Status Update Modal */}
      {showModal && selectedRequest && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-[9999]">
          <div className="flex items-center justify-center min-h-full p-4 md:pl-64">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center border-b p-6 bg-gradient-to-r from-blue-600 to-blue-700">
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
                <h4 className="font-medium text-gray-800 mb-2">{selectedRequest.name}</h4>
                <p className="text-sm text-gray-600">Roll: {selectedRequest.universityRoll}</p>
                <p className="text-sm text-gray-600">{selectedRequest.course} - {selectedRequest.branch}</p>
                <p className="text-sm text-gray-600">College: {selectedRequest.collegeEmail}</p>
                <p className="text-sm text-gray-600">Personal: {selectedRequest.personalEmail}</p>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-800 mb-2">Subject:</h4>
                <p className="text-sm text-gray-600">{selectedRequest.subject}</p>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-800 mb-2">Application:</h4>
                <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-40 overflow-y-auto">
                  {selectedRequest.applicationText}
                </div>
              </div>

              {selectedRequest.attachment && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">Attachment:</h4>
                  <p className="text-sm text-gray-600 mb-2">{selectedRequest.attachment.filename}</p>
                  <div className="flex space-x-2">
                    <a
                      href={`http://localhost:3001/uploads/noc/${selectedRequest.attachment.path.split('/').pop()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition"
                    >
                      View PDF
                    </a>
                    <a
                      href={`http://localhost:3001/uploads/noc/${selectedRequest.attachment.path.split('/').pop()}`}
                      download={selectedRequest.attachment.filename}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition"
                    >
                      Download
                    </a>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="read" disabled={getStatusOrder(selectedRequest.status) > 1}>Read</option>
                  <option value="reply_soon" disabled={getStatusOrder(selectedRequest.status) > 2}>Reply Soon</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Remarks</label>
                <textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add remarks for the student..."
                />
              </div>
            </div>
            
              <div className="flex justify-between items-center border-t p-6 bg-gray-50">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  ← Back to List
                </button>
                <button
                  onClick={handleSubmitUpdate}
                  disabled={isUpdating}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageNOC;