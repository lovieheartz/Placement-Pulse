import React, { useState, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { History, Inbox } from 'lucide-react';
import { API_BASE } from '../config/api';
import './Dashboard.css';

const NotificationHistory = () => {
  const { user } = useContext(AuthContext);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const {
    data: profileData,
  } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE}/admin/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: !!sessionStorage.getItem('authToken'),
  });

  // Fetch notification history
  const {
    data: historyData,
    isLoading
  } = useQuery({
    queryKey: ['notificationHistory', searchTerm, currentPage],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20
      });

      if (searchTerm) params.append('search', searchTerm);

      const response = await axios.get(`${API_BASE}/notifications/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!sessionStorage.getItem('authToken'),
  });

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

  const getTypeColor = (type) => {
    switch (type) {
      case 'message':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'text':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'form':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRecipientSummary = (recipients) => {
    const parts = [];

    if (recipients.students?.all) {
      parts.push('All Students');
    } else if (recipients.students?.courses?.length > 0 || recipients.students?.branches?.length > 0) {
      const studentDesc = [];
      if (recipients.students.courses?.length > 0) {
        studentDesc.push(recipients.students.courses.join(', '));
      }
      if (recipients.students.branches?.length > 0) {
        studentDesc.push(recipients.students.branches.join(', '));
      }
      parts.push(`Students (${studentDesc.join(' - ')})`);
    }

    if (recipients.faculty?.all) {
      parts.push('All Faculty');
    } else if (recipients.faculty?.departments?.length > 0) {
      parts.push(`Faculty (${recipients.faculty.departments.join(', ')})`);
    }

    if (recipients.admins?.all) {
      parts.push('All Admins');
    } else if (recipients.admins?.names?.length > 0) {
      parts.push(`Admins (${recipients.admins.names.join(', ')})`);
    }

    if (recipients.hods?.all) {
      parts.push('All HODs');
    }

    if (recipients.emails?.length > 0) {
      parts.push(`${recipients.emails.length} Direct Email${recipients.emails.length > 1 ? 's' : ''}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No recipients';
  };

  return (
    <PortalLayout role="admin" title="Notification History" user={profileData || user}>
          <div>
            {/* Header */}
            <PageHeader
              title="Notification History"
              subtitle="View and search all sent notifications"
              icon={History}
            />

            {/* Search Bar */}
            <GlassPanel className="mb-6">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search notifications..."
                  className="flex-1 px-4 py-2 border-0 focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                )}
              </div>
            </GlassPanel>

            {/* Results */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading notification history...</p>
              </div>
            ) : historyData?.data?.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No notifications found"
                description="Try adjusting your search criteria"
              />
            ) : (
              <>
                {/* Notification List - Gmail Style */}
                <GlassPanel className="overflow-hidden p-0">
                  {historyData?.data?.map((notification, index) => (
                    <div key={notification._id}>
                      <div
                        className="flex items-center px-6 py-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors"
                        onClick={() => setSelectedNotification(selectedNotification?._id === notification._id ? null : notification)}
                      >
                        {/* Left Section - Icon */}
                        <div className="flex-shrink-0 mr-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            notification.type === 'message' ? 'bg-blue-100' :
                            notification.type === 'form' ? 'bg-purple-100' : 'bg-green-100'
                          }`}>
                            {notification.type === 'message' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            ) : notification.type === 'form' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* Middle Section - Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">{notification.title}</h3>
                            {notification.attachment && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate mb-1">{notification.description}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {notification.recipientCount} recipient{notification.recipientCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Right Section - Date & Chevron */}
                        <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                          <span className="text-sm text-gray-500 whitespace-nowrap">
                            {formatDate(notification.createdAt)}
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transition-transform ${selectedNotification?._id === notification._id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedNotification?._id === notification._id && (
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Recipients */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Recipients</h4>
                              <p className="text-sm text-gray-600">{getRecipientSummary(notification.recipients)}</p>
                              {notification.recipients.emails && notification.recipients.emails.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Direct Emails:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {notification.recipients.emails.map((email, idx) => (
                                      <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                        {email}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Additional Info */}
                            <div className="space-y-3">
                              {notification.formLink && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Form Link</h4>
                                  <a href={notification.formLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                                    {notification.formLink}
                                  </a>
                                </div>
                              )}
                              {notification.deadline && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Deadline</h4>
                                  <p className="text-sm text-red-600">{formatDate(notification.deadline)}</p>
                                </div>
                              )}
                              {notification.attachment && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Attachment</h4>
                                  <p className="text-sm text-gray-600">{notification.attachment.filename}</p>
                                </div>
                              )}
                              {notification.extraInfo && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Additional Info</h4>
                                  <p className="text-sm text-gray-600">{notification.extraInfo}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </GlassPanel>

                {/* Pagination */}
                {historyData?.pagination && historyData.pagination.pages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-muted-foreground">
                      Page {currentPage} of {historyData.pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.min(historyData.pagination.pages, prev + 1))}
                      disabled={currentPage === historyData.pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
    </PortalLayout>
  );
};

export default NotificationHistory;
