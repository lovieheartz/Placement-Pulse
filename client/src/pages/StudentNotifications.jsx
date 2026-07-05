import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiBell, FiCheck, FiExternalLink, FiClock } from 'react-icons/fi';
import { Bell } from 'lucide-react';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader, EmptyState } from '@/components/ui/surface';
import { Badge } from '@/components/ui/badge';

const StudentNotifications = () => {
  const { source } = useParams(); // 'tpo' or 'faculty' or undefined for all
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(source || 'all');
  const queryClient = useQueryClient();

  const token = sessionStorage.getItem('authToken');
  
  // Fetch user profile with avatar
  const { data: user } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:3001/student/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });
  
  // Fetch notifications with React Query
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', activeTab],
    queryFn: async () => {
      if (!token) {
        toast.error('Authentication error. Please log in again.');
        navigate('/login');
        throw new Error('No auth token');
      }
      
      const { data } = await axios.get('http://localhost:3001/notifications/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!data || !Array.isArray(data.data)) {
        return { notifications: [], tpoCount: 0, facultyCount: 0 };
      }
      
      // Properly identify notifications by createdByModel
      const tpoNotifications = data.data.filter(notif => notif.createdByModel === 'Admin');
      const facultyNotifications = data.data.filter(notif => notif.createdByModel === 'Faculty');
      
      // Count unread notifications by type
      const tpoUnread = tpoNotifications.filter(notif => !notif.isReadByUser).length;
      const facultyUnread = facultyNotifications.filter(notif => !notif.isReadByUser).length;
      
      // Filter notifications based on source if specified
      let filteredNotifications = data.data;
      if (activeTab === 'tpo') {
        filteredNotifications = tpoNotifications;
      } else if (activeTab === 'faculty') {
        filteredNotifications = facultyNotifications;
      }
      
      return { 
        notifications: filteredNotifications,
        tpoCount: tpoUnread,
        facultyCount: facultyUnread
      };
    },
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    }
  });
  
  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      try {
        const response = await axios.put(
          `http://localhost:3001/notifications/${notificationId}/read`, 
          {}, 
          { headers: { Authorization: `Bearer ${token}` }}
        );
        return { id: notificationId, data: response.data };
      } catch (error) {
        // Handle specific error cases
        if (error.response) {
          throw new Error(error.response.data.message || 'Server error');
        } else if (error.request) {
          throw new Error('No response from server. Please check your connection.');
        } else {
          throw new Error('Error setting up request: ' + error.message);
        }
      }
    },
    onSuccess: (result, notificationId) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification marked as read');
    },
    onError: (error) => {
      console.error('Failed to mark notification as read:', error);
      toast.error(error.message || 'Failed to update notification');
    }
  });
  
  const markAsRead = (notificationId) => {
    if (!token) {
      toast.error('Authentication error. Please log in again.');
      navigate('/login');
      return;
    }
    markAsReadMutation.mutate(notificationId);
  };
  
  // Extract data from query results
  const notifications = notificationsData?.notifications || [];
  const tpoNotificationCount = notificationsData?.tpoCount || 0;
  const facultyNotificationCount = notificationsData?.facultyCount || 0;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'all') {
      navigate('/student/notifications');
    } else {
      navigate(`/student/notifications/${tab}`);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-blue-50 p-5">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">You are not logged in</h1>
        <p className="text-base text-gray-600 mb-6">Please login to access your dashboard.</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <PortalLayout role="student" title="Notifications" user={user}>
          <div className="max-w-4xl mx-auto">
            <PageHeader
              title={activeTab === 'all' ? 'All Notifications' :
                     activeTab === 'tpo' ? 'TPO Notifications' : 'Faculty Notifications'}
              subtitle={activeTab === 'all' ? 'View all your notifications in one place' :
                        activeTab === 'tpo' ? 'Notifications from Training & Placement Office' :
                        'Notifications from Faculty'}
              icon={Bell}
            />
            <GlassPanel>
                {/* Tabs */}
                <div className="flex border-b border-border mb-4">
                  <button
                    className={`px-3 py-2 font-medium text-sm transition-all duration-200 ${activeTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                    onClick={() => handleTabChange('all')}
                  >
                    All Notifications
                  </button>
                  <button
                    className={`px-3 py-2 font-medium text-sm transition-all duration-200 ${activeTab === 'tpo' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                    onClick={() => handleTabChange('tpo')}
                  >
                    <div className="flex items-center">
                      <span>TPO Notifications</span>
                      {tpoNotificationCount > 0 && (
                        <span className="ml-2 bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                          {tpoNotificationCount}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    className={`px-3 py-2 font-medium text-sm transition-all duration-200 ${activeTab === 'faculty' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
                    onClick={() => handleTabChange('faculty')}
                  >
                    <div className="flex items-center">
                      <span>Faculty Notifications</span>
                      {facultyNotificationCount > 0 && (
                        <span className="ml-2 bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                          {facultyNotificationCount}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
                
                {/* Notifications List */}
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notification) => {
                      // Create a modified notification without the sender information
                      const modifiedNotification = {
                        ...notification,
                        sender: undefined
                      };

                      return (
                        <div
                          key={modifiedNotification._id}
                          className={`p-3 rounded-xl border transition-all duration-200 hover:shadow-sm ${!modifiedNotification.isReadByUser ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}
                          onClick={(e) => {
                            e.preventDefault();
                            markAsRead(modifiedNotification._id);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <Badge variant="default">
                                {notification.createdByModel === 'Admin' ? 'TPO' : 'Faculty'}
                              </Badge>
                              <h3 className="font-medium text-foreground text-base">{notification.title}</h3>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-muted-foreground">{notification.description}</p>

                          {notification.extraInfo && (
                            <div className="mt-2 p-2 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                              {notification.extraInfo}
                            </div>
                          )}
                          
                          <div className="mt-3 flex justify-between items-center">
                            <div className="flex space-x-2">
                              {notification.type === 'form' && (
                                <a 
                                  href={notification.formLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FiExternalLink className="w-3 h-3 mr-1" />
                                  Apply Now
                                </a>
                              )}
                              
                              {notification.deadline && (
                                <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                                  <FiClock className="w-3 h-3 mr-1" />
                                  Due: {new Date(notification.deadline).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            
                            {!notification.isReadByUser && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification._id);
                                }}
                                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                                disabled={markAsReadMutation.isLoading}
                              >
                                <FiCheck className="w-3 h-3 mr-1" />
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={Bell}
                    title="No notifications found"
                    description={
                      activeTab === 'all'
                        ? "You don't have any notifications yet."
                        : activeTab === 'tpo'
                        ? 'No notifications from TPO.'
                        : 'No notifications from Faculty.'}
                  />
                )}
            </GlassPanel>
          </div>
    </PortalLayout>
  );
};

export default StudentNotifications;