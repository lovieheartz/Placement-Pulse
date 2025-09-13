import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiBell, FiChevronDown } from 'react-icons/fi';
import API_CONFIG from '../config/api';

const Header = ({ user, toggleDropdown, isDropdownOpen, handleLogout, navigate }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationType, setNotificationType] = useState('text');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
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
      
      const { data } = await axios.get(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (data && typeof data.unreadCount === 'number') {
        setNotificationCount(data.unreadCount);
      }
    } catch (error) {
      // Don't show error to user, just log it
      console.error('Failed to fetch notification count:', error);
      // Set count to 0 to avoid showing incorrect badge
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
        
        const { data } = await axios.get(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.USER), {
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
      await axios.put(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId)), {}, {
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
  
  const openNotificationModal = () => {
    setShowNotificationModal(true);
    setShowNotifications(false);
  };
  // Defensive fallback
  const safeUser = user || {};

  // Compute profile letter
  const profileLetter =
    safeUser.name && safeUser.name.length > 0
      ? safeUser.name.charAt(0).toUpperCase()
      : safeUser.email && safeUser.email.length > 0
      ? safeUser.email.charAt(0).toUpperCase()
      : 'U';

  // Use avatar or profilePicture field
  const rawProfilePicture =
    safeUser.profilePicture || safeUser.avatar || null;

  // Compute the absolute URL safely
  const profilePictureUrl = rawProfilePicture
    ? rawProfilePicture.startsWith('http')
      ? rawProfilePicture
      : `http://localhost:3001${rawProfilePicture}`
    : null;

  return (
    <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white px-4 py-3 flex justify-between items-center relative z-10 shadow-md">
      <h1 className="text-xs sm:text-sm md:text-base font-medium truncate max-w-[60vw] sm:max-w-[70vw]">
        Welcome, {safeUser.name || safeUser.email || 'User'}
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
            {profilePictureUrl ? (
              <img
                src={profilePictureUrl}
                alt="Profile"
                className="w-full h-full object-cover"
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
              onClick={() => navigate('/profile')}
              className="px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-100"
            >
              Profile View
            </button>
            {/* Send Notification option removed */}
            <button
              onClick={handleLogout}
              className="px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}
        
        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute top-12 sm:top-14 md:top-16 right-0 bg-white shadow-lg rounded-lg w-80 flex flex-col z-50 max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-gray-200 font-medium text-gray-700 flex justify-between items-center">
              <span>Notifications</span>
              {notifications.length > 0 && (
                <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">{notifications.length}</span>
              )}
            </div>
            
            {notifications.length > 0 ? (
              notifications.map(notification => (
                <div 
                  key={notification._id} 
                  className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.isReadByUser ? 'bg-blue-50' : ''}`}
                  onClick={() => markAsRead(notification._id)}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <span className="text-xs text-gray-500">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.description}</p>
                  {notification.type === 'form' && (
                    <div className="mt-2">
                      <a 
                        href={notification.formLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open Form
                      </a>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                No notifications
              </div>
            )}
          </div>
        )}
        
        {/* Notification Modal */}
        {showNotificationModal && (
          <NotificationModal 
            onClose={() => setShowNotificationModal(false)} 
            notificationType={notificationType}
            setNotificationType={setNotificationType}
            user={user}
          />
        )}
      </div>
    </header>
  );
};

// Notification Modal Component
const NotificationModal = ({ onClose, notificationType, setNotificationType, user }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: notificationType,
    formLink: '',
    deadline: '',
    extraInfo: '',
    recipients: {
      students: {
        all: false,
        courses: [],
        branches: [],
        passoutYears: []
      },
      faculty: {
        all: false,
        specializations: [],
        emails: []
      },
      admins: {
        all: false,
        names: []
      }
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState(['BTech', 'MTech', 'BCA', 'MCA', 'BBA', 'MBA', 'Diploma']);
  const [branches, setBranches] = useState(['CSE', 'IT', 'ECE', 'EE', 'ME', 'CE']);
  const [passoutYears, setPassoutYears] = useState([]);
  const [specializations, setSpecializations] = useState(['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Management']);
  const [facultyEmails, setFacultyEmails] = useState([]);
  const [adminNames, setAdminNames] = useState([]);
  
  // Generate passout years (current year + 5 years)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 6; i++) {
      years.push(currentYear + i);
    }
    setPassoutYears(years);
  }, []);
  
  // Fetch faculty emails and admin names
  useEffect(() => {
    const fetchRecipientData = async () => {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      // Fetch faculty emails
      try {
        const facultyResponse = await axios.get(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.ADMIN.FACULTY), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (facultyResponse.data && facultyResponse.data.data) {
          setFacultyEmails(facultyResponse.data.data.map(faculty => faculty.email));
        }
      } catch (error) {
        console.error('Failed to fetch faculty emails:', error);
        // Continue with other requests even if this one fails
      }
      
      // Fetch admin names
      try {
        const adminResponse = await axios.get(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.ADMIN.ALL_ADMINS), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (adminResponse.data && adminResponse.data.data) {
          setAdminNames(adminResponse.data.data.map(admin => admin.name));
        }
      } catch (error) {
        console.error('Failed to fetch admin names:', error);
      }
    };
    
    fetchRecipientData();
  }, []);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleTypeChange = (type) => {
    setNotificationType(type);
    setFormData(prev => ({
      ...prev,
      type
    }));
  };
  
  const handleRecipientChange = (category, subcategory, value) => {
    setFormData(prev => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        [category]: {
          ...prev.recipients[category],
          [subcategory]: value
        }
      }
    }));
  };
  
  const handleMultiSelectChange = (category, subcategory, value) => {
    const currentValues = formData.recipients[category][subcategory];
    
    let newValues;
    if (currentValues.includes(value)) {
      newValues = currentValues.filter(item => item !== value);
    } else {
      newValues = [...currentValues, value];
    }
    
    handleRecipientChange(category, subcategory, newValues);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = sessionStorage.getItem('authToken');
      await axios.post(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.CREATE), formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Notification sent successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-xl font-semibold text-blue-600">Send Notification</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4">
          <form onSubmit={handleSubmit}>
            {/* Notification Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notification Type</label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-md ${notificationType === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                  onClick={() => handleTypeChange('text')}
                >
                  Text Only
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-md ${notificationType === 'form' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                  onClick={() => handleTypeChange('form')}
                >
                  Form/Document
                </button>
              </div>
            </div>
            
            {/* Basic Information */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                required
              />
            </div>
            
            {/* Form-specific fields */}
            {notificationType === 'form' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Form/Document Link</label>
                  <input
                    type="url"
                    name="formLink"
                    value={formData.formLink}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (Optional)</label>
                  <input
                    type="datetime-local"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Information (Optional)</label>
              <textarea
                name="extraInfo"
                value={formData.extraInfo}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Recipients Section */}
            <div className="mb-4">
              <h4 className="font-medium text-lg mb-2">Recipients</h4>
              
              {/* Students */}
              <div className="border rounded-md p-3 mb-3">
                <h5 className="font-medium mb-2">Students</h5>
                
                <div className="mb-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.recipients.students.all}
                      onChange={(e) => handleRecipientChange('students', 'all', e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm">All Students</span>
                  </label>
                </div>
                
                {!formData.recipients.students.all && (
                  <>
                    <div className="mb-2">
                      <label className="block text-sm mb-1">Courses</label>
                      <div className="flex flex-wrap gap-2">
                        {courses.map(course => (
                          <label key={course} className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.recipients.students.courses.includes(course)}
                              onChange={() => handleMultiSelectChange('students', 'courses', course)}
                              className="form-checkbox h-4 w-4 text-blue-600"
                            />
                            <span className="ml-1 text-sm">{course}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <label className="block text-sm mb-1">Branches</label>
                      <div className="flex flex-wrap gap-2">
                        {branches.map(branch => (
                          <label key={branch} className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.recipients.students.branches.includes(branch)}
                              onChange={() => handleMultiSelectChange('students', 'branches', branch)}
                              className="form-checkbox h-4 w-4 text-blue-600"
                            />
                            <span className="ml-1 text-sm">{branch}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <label className="block text-sm mb-1">Passout Years</label>
                      <div className="flex flex-wrap gap-2">
                        {passoutYears.map(year => (
                          <label key={year} className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.recipients.students.passoutYears.includes(year)}
                              onChange={() => handleMultiSelectChange('students', 'passoutYears', year)}
                              className="form-checkbox h-4 w-4 text-blue-600"
                            />
                            <span className="ml-1 text-sm">{year}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Faculty */}
              <div className="border rounded-md p-3 mb-3">
                <h5 className="font-medium mb-2">Faculty</h5>
                
                <div className="mb-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.recipients.faculty.all}
                      onChange={(e) => handleRecipientChange('faculty', 'all', e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm">All Faculty</span>
                  </label>
                </div>
                
                {!formData.recipients.faculty.all && (
                  <>
                    <div className="mb-2">
                      <label className="block text-sm mb-1">Specializations</label>
                      <div className="flex flex-wrap gap-2">
                        {specializations.map(spec => (
                          <label key={spec} className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.recipients.faculty.specializations.includes(spec)}
                              onChange={() => handleMultiSelectChange('faculty', 'specializations', spec)}
                              className="form-checkbox h-4 w-4 text-blue-600"
                            />
                            <span className="ml-1 text-sm">{spec}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <label className="block text-sm mb-1">Specific Faculty Emails</label>
                      <div className="flex flex-wrap gap-2">
                        {facultyEmails.map(email => (
                          <label key={email} className="inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.recipients.faculty.emails.includes(email)}
                              onChange={() => handleMultiSelectChange('faculty', 'emails', email)}
                              className="form-checkbox h-4 w-4 text-blue-600"
                            />
                            <span className="ml-1 text-sm">{email}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Admins */}
              <div className="border rounded-md p-3">
                <h5 className="font-medium mb-2">Admins</h5>
                
                <div className="mb-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.recipients.admins.all}
                      onChange={(e) => handleRecipientChange('admins', 'all', e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm">All Admins</span>
                  </label>
                </div>
                
                {!formData.recipients.admins.all && (
                  <div className="mb-2">
                    <label className="block text-sm mb-1">Specific Admins</label>
                    <div className="flex flex-wrap gap-2">
                      {adminNames.map(name => (
                        <label key={name} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.recipients.admins.names.includes(name)}
                            onChange={() => handleMultiSelectChange('admins', 'names', name)}
                            className="form-checkbox h-4 w-4 text-blue-600"
                          />
                          <span className="ml-1 text-sm">{name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Header;
