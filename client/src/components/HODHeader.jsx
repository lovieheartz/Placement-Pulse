import { useState, useEffect } from "react";
import { FiBell, FiChevronDown } from 'react-icons/fi';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE } from '../config/api';

const HODHeader = ({
  user,
  toggleDropdown,
  isDropdownOpen,
  handleLogout,
  navigate,
}) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const safeUser = user || {};

  const profileLetter =
    safeUser.name?.charAt(0)?.toUpperCase() ||
    safeUser.email?.charAt(0)?.toUpperCase() ||
    "?";

  const rawImage = safeUser.profilePicture || safeUser.avatar || null;

  const profileImageUrl = rawImage
    ? rawImage.startsWith("http")
      ? rawImage
      : `${API_BASE}${rawImage}`
    : null;

  // Debug logging
  console.log('HOD Header - User data:', {
    name: safeUser.name,
    avatar: safeUser.avatar,
    profilePicture: safeUser.profilePicture,
    constructedURL: profileImageUrl
  });

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const { data } = await axios.get(`${API_BASE}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data && typeof data.unreadCount === 'number') {
        setNotificationCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
      setNotificationCount(0);
    }
  };

  const toggleNotifications = async () => {
    if (!showNotifications && user) {
      try {
        const token = sessionStorage.getItem('authToken');
        if (!token) {
          console.error('No auth token found');
          toast.error('Authentication error. Please log in again.');
          return;
        }

        const { data } = await axios.get(`${API_BASE}/notifications/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (data && Array.isArray(data.data)) {
          setNotifications(data.data);
        } else {
          setNotifications([]);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        toast.error('Failed to load notifications');
        setNotifications([]);
      }
    }
    setShowNotifications(!showNotifications);
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = sessionStorage.getItem('authToken');
      await axios.put(`${API_BASE}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, isReadByUser: true } : notif
        )
      );

      // Update count
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white px-4 py-3 flex justify-between items-center relative z-10 shadow-md">
      <h1 className="text-xs sm:text-sm md:text-base font-medium truncate max-w-[60vw] sm:max-w-[70vw]">
        Welcome, {safeUser.name || safeUser.email || "HOD"}
      </h1>

      <div className="relative z-20 flex items-center space-x-2 sm:space-x-4">
        {/* Notification Bell */}
        <div
          className="relative cursor-pointer p-2 hover:bg-blue-700 rounded-full transition-colors duration-200"
          onClick={toggleNotifications}
        >
          <FiBell className="h-5 w-5 text-white" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center border border-blue-800 animate-pulse">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </div>

        {/* Profile Picture */}
        <div
          className="flex items-center cursor-pointer group bg-blue-700/50 hover:bg-blue-700 px-2 py-1 rounded-full transition-colors duration-200"
          onClick={toggleDropdown}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-300 group-hover:border-white transition-all duration-200">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.log('HOD Image failed to load:', profileImageUrl);
                  e.target.onerror = null; // Prevent infinite loop
                  e.target.style.display = 'none'; // Hide broken image
                  // Show fallback letter instead
                  const parent = e.target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">${profileLetter}</div>`;
                  }
                }}
              />
            ) : (
              <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {profileLetter}
              </div>
            )}
          </div>
          <FiChevronDown className="ml-1 text-blue-200 w-4 h-4 group-hover:text-white" />
        </div>

        {isDropdownOpen && (
          <div className="absolute top-12 sm:top-14 md:top-16 right-0 bg-white shadow-lg rounded-lg w-40 flex flex-col z-50">
            <button
              onClick={() => navigate("/hod/profile")}
              className="px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-100"
            >
              Profile View
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}

        {/* Notifications Dropdown - Using createPortal to render outside the component hierarchy */}
        {showNotifications && createPortal(
          <div className="fixed inset-0 z-[9999] flex justify-end" onClick={(e) => {
            // Close when clicking outside the notification panel
            if (e.target === e.currentTarget) setShowNotifications(false);
          }}>
            {/* Semi-transparent overlay */}
            <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowNotifications(false)}></div>

            {/* Notification Panel */}
            <div
              className="relative mt-14 mr-4 bg-white shadow-xl rounded-lg w-80 max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with solid background */}
              <div className="sticky top-0 p-3 border-b border-gray-200 font-medium bg-white shadow-sm z-10 flex justify-between items-center">
                <span className="text-gray-800">Notifications</span>
                {notifications.length > 0 && (
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">{notifications.length}</span>
                )}
              </div>

              {/* Scrollable content with solid background */}
              <div className="flex-1 overflow-y-auto bg-white">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div
                      key={notification._id}
                      className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.isReadByUser ? 'bg-orange-50' : ''}`}
                      onClick={() => markAsRead(notification._id)}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm text-gray-800">{notification.title}</h4>
                        <span className="text-xs text-gray-500">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.content || notification.description}</p>

                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                          {notification.createdByModel === 'Admin' ? 'TPO' : notification.createdByModel === 'HOD' ? 'HOD' : 'Faculty'}
                        </span>

                        {notification.deadline && (
                          <span className="text-xs text-gray-500">
                            Due: {new Date(notification.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {notification.type === 'form' && (
                        <div className="mt-2">
                          <a
                            href={notification.formLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-orange-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Apply Now
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm bg-white">
                    No notifications
                  </div>
                )}
              </div>

              {/* Footer with mark all as read button */}
              {notifications.length > 0 && (
                <div className="sticky bottom-0 p-2 border-t border-gray-200 bg-white text-center">
                  <button
                    className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                    onClick={() => {
                      notifications.forEach(notification => {
                        if (!notification.isReadByUser) markAsRead(notification._id);
                      });
                    }}
                  >
                    Mark all as read
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </header>
  );
};

export default HODHeader;
