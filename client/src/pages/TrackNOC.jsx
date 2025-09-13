import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/StudentSidebar';
import Header from '../components/StudentHeader';
import Footer from '../components/StudentFooter';
import axios from 'axios';

const TrackNOC = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const { data: nocRequests = [], isLoading } = useQuery({
    queryKey: ['nocRequests'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get('http://localhost:3001/noc/student', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data.data;
    },
    enabled: !!user,
  });

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
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          user={user}
          toggleDropdown={toggleDropdown}
          isDropdownOpen={isDropdownOpen}
          handleLogout={handleLogout}
          navigate={navigate}
        />
        
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100/50">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h1 className="text-xl font-bold text-white">Track NOC Requests</h1>
                <p className="text-blue-100 text-sm">Monitor your NOC application status</p>
              </div>
              
              <div className="p-6">
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                  </div>
                ) : nocRequests.length > 0 ? (
                  <div className="space-y-6">
                    {nocRequests.map((request) => (
                      <div key={request._id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{request.name}</h3>
                            <p className="text-sm text-gray-600">Roll: {request.universityRoll} | {request.course} - {request.branch}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Submitted: {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusText(request.status)}
                          </span>
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

                        <div className="bg-white rounded p-4 mb-4">
                          <h4 className="font-medium text-gray-800 mb-2">Subject:</h4>
                          <p className="text-sm text-gray-600 mb-3">{request.subject}</p>
                          <h4 className="font-medium text-gray-800 mb-2">Application:</h4>
                          <p className="text-sm text-gray-600">{request.applicationText}</p>
                        </div>

                        <div className="bg-white rounded p-4 mb-4">
                          <h4 className="font-medium text-gray-800 mb-2">Contact Details:</h4>
                          <p className="text-sm text-gray-600">College Email: {request.collegeEmail}</p>
                          <p className="text-sm text-gray-600">Personal Email: {request.personalEmail}</p>
                          <p className="text-sm text-gray-600">Course: {request.course} - {request.branch}</p>
                        </div>

                        {request.attachment && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Attachment:</span> {request.attachment.filename}
                            </p>
                            <div className="flex space-x-2">
                              <a
                                href={`http://localhost:3001/uploads/noc/${request.attachment.path.split('/').pop()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition"
                              >
                                View PDF
                              </a>
                              <a
                                href={`http://localhost:3001/uploads/noc/${request.attachment.path.split('/').pop()}`}
                                download={request.attachment.filename}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition"
                              >
                                Download PDF
                              </a>
                            </div>
                          </div>
                        )}

                        {request.adminRemarks && (
                          <div className="bg-blue-50 rounded p-4">
                            <h4 className="font-medium text-blue-800 mb-2">Admin Remarks:</h4>
                            <p className="text-sm text-blue-700">{request.adminRemarks}</p>
                            {request.processedAt && (
                              <p className="text-xs text-blue-600 mt-2">
                                Updated: {new Date(request.processedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}
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
                    <p className="text-gray-600 mb-4">You haven't submitted any NOC requests yet.</p>
                    <button
                      onClick={() => navigate('/student/apply-noc')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Apply for NOC
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
};

export default TrackNOC;