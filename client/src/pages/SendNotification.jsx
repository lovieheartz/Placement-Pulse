import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import API_CONFIG from '../config/api';
import './Dashboard.css';

const SendNotification = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'text',
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
        specializations: []
      },
      admins: {
        all: false,
        names: []
      }
    }
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [courses, setCourses] = useState(['BTech', 'MTech', 'BCA', 'MCA', 'BBA', 'MBA', 'Diploma']);
  const [allBranches, setAllBranches] = useState({
    'BTech': ['CSE', 'CSE(AIML)', 'CSE-DS', 'CSE-IOT', 'BME', 'IT', 'CSBS', 'CE', 'EE', 'ME', 'ECE'],
    'MTech': ['CSE', 'CI', 'ECE&PS'],
    'Diploma': ['EE', 'EEEVT', 'CE', 'CSE'],
    'BCA': ['BCA'],
    'MCA': ['MCA'],
    'BBA': ['BBA'],
    'MBA': ['MBA']
  });
  const [branches, setBranches] = useState([]);
  const [passoutYears, setPassoutYears] = useState([]);
  const [specializations, setSpecializations] = useState(['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Management']);
  const [facultyEmails, setFacultyEmails] = useState([]);
  const [adminNames, setAdminNames] = useState([]);

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

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
        // Using the correct faculty endpoint
        const facultyResponse = await axios.get(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.FACULTY.ALL), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (facultyResponse.data && facultyResponse.data.data) {
          setFacultyEmails(facultyResponse.data.data.map(faculty => faculty.email));
        }
      } catch (error) {
        console.error('Failed to fetch faculty emails:', error);
        // Set some default faculty emails for testing
        setFacultyEmails(['faculty1@example.com', 'faculty2@example.com']);
      }
      
      // Fetch admin names
      try {
        // Using the correct admin endpoint
        const adminResponse = await axios.get(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.ADMIN.ALL_ADMINS), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (adminResponse.data && adminResponse.data.data) {
          setAdminNames(adminResponse.data.data.map(admin => admin.name));
        }
      } catch (error) {
        console.error('Failed to fetch admin names:', error);
        // Set some default admin names for testing
        setAdminNames(['Admin 1', 'Admin 2']);
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
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setFilePreview(null);
      return;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      e.target.value = null;
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      // For non-image files, just show the file name
      setFilePreview(null);
    }
  };
  
  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const handleTypeChange = (type) => {
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
    
    // Update available branches when courses are selected
    if (category === 'students' && subcategory === 'courses') {
      // Reset branches when courses change
      handleRecipientChange('students', 'branches', []);
      
      // Update available branches based on selected courses
      if (newValues.length > 0) {
        const availableBranches = [];
        newValues.forEach(course => {
          if (allBranches[course]) {
            allBranches[course].forEach(branch => {
              if (!availableBranches.includes(branch)) {
                availableBranches.push(branch);
              }
            });
          }
        });
        setBranches(availableBranches);
      } else {
        setBranches([]);
      }
    }
  };

  const [showSuccess, setShowSuccess] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate deadline is provided
    if (!formData.deadline) {
      toast.error('Deadline is required for all notifications');
      setLoading(false);
      return;
    }
    
    // Validate form link is provided for form type notifications
    if (formData.type === 'form' && !formData.formLink) {
      toast.error('Form link is required for form notifications');
      setLoading(false);
      return;
    }
    
    try {
      const token = sessionStorage.getItem('authToken');
      
      // Create FormData object for file upload
      const formDataToSend = new FormData();
      
      // Add all form fields to FormData
      Object.keys(formData).forEach(key => {
        if (key === 'recipients') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // Add file if selected
      if (selectedFile) {
        formDataToSend.append('attachment', selectedFile);
      }
      
      const response = await axios.post(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.CREATE), formDataToSend, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.emailError) {
        toast.warning('Notification created but emails could not be sent: ' + response.data.emailError);
      } else {
        toast.success('Notification sent successfully!');
      }
      
      console.log('Notification created successfully:', response.data);
      
      // Show success message with recipient count
      if (response.data && response.data.recipientCount) {
        setRecipientCount(response.data.recipientCount);
      } else {
        // Estimate recipient count based on selections
        let count = 0;
        if (formData.recipients.students.all) count += 100; // Estimate
        if (formData.recipients.faculty.all) count += facultyEmails.length;
        if (formData.recipients.admins.all) count += adminNames.length;
        
        if (!formData.recipients.students.all) {
          // Add rough estimate based on filters
          count += formData.recipients.students.courses.length * 10;
        }
        
        if (!formData.recipients.faculty.all) {
          count += formData.recipients.faculty.specializations.length * 5; // Estimate 5 faculty per specialization
        }
        
        if (!formData.recipients.admins.all) {
          count += formData.recipients.admins.names.length;
        }
        
        setRecipientCount(count);
      }
      
      setShowSuccess(true);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'text',
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
            specializations: []
          },
          admins: {
            all: false,
            names: []
          }
        }
      });
      
      // Clear file selection
      clearFileSelection();
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
      
    } catch (error) {
      console.error('Failed to send notification:', error);
      
      if (error.code === 'ERR_NETWORK') {
        toast.error('Cannot connect to server. Please make sure the server is running.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to send notification');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">You are not logged in</h1>
        <p className="text-lg text-gray-600 mb-6">Please login to access your dashboard.</p>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-lg text-gray-600 mb-6">Only admins can access this page.</p>
        <button
          onClick={() => navigate('/home')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Dashboard
        </button>
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

        <div className="content-container px-3 sm:px-6 py-4 sm:py-6 w-full mx-auto max-w-full overflow-hidden">
          {showSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start">
              <div className="flex-shrink-0 mr-3">
                <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-green-800 font-medium">Notification sent successfully!</h3>
                <p className="text-green-700 mt-1">Your notification has been sent to approximately {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}.</p>
              </div>
              <button 
                onClick={() => setShowSuccess(false)} 
                className="ml-auto flex-shrink-0 text-green-500 hover:text-green-700"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          <div className="bg-white rounded-xl shadow-sm px-4 py-4 w-full max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
              <h1 className="text-xl font-semibold text-gray-800">Send Notification</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Notification Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notification Type</label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md flex items-center gap-2 shadow-sm transition-all ${formData.type === 'text' ? 'bg-blue-600 text-white ring-1 ring-blue-300' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                    onClick={() => handleTypeChange('text')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Text Only</span>
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md flex items-center gap-2 shadow-sm transition-all ${formData.type === 'form' ? 'bg-blue-600 text-white ring-1 ring-blue-300' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                    onClick={() => handleTypeChange('form')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Form/Document</span>
                  </button>
                </div>
              </div>
              
              {/* Basic Information */}
              <div className="mb-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Basic Information</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          className="w-full pl-9 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter notification title"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input
                          type="datetime-local"
                          name="deadline"
                          value={formData.deadline}
                          onChange={handleInputChange}
                          className="w-full pl-9 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                      placeholder="Enter notification details"
                      required
                    />
                  </div>
                </div>
              </div>
              
              {/* Content Section */}
              <div className="mb-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Content Details</span>
                  </h3>
                  
                  {formData.type === 'text' ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* File Upload */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (Optional)</label>
                          <div className="flex items-center space-x-2">
                            <label className="flex-1">
                              <div className="relative flex items-center justify-center px-4 py-2 border border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50">
                                <input 
                                  type="file" 
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                  onChange={handleFileChange}
                                  ref={fileInputRef}
                                />
                                <div className="flex items-center justify-center space-x-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                  <span className="text-sm text-gray-500 truncate">
                                    {selectedFile ? selectedFile.name : 'Upload file (max 5MB)'}
                                  </span>
                                </div>
                              </div>
                            </label>
                            {selectedFile && (
                              <button 
                                type="button" 
                                onClick={clearFileSelection}
                                className="p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Supported formats: Images, PDF, Word, Excel, PowerPoint</p>
                        </div>
                      </div>
                      
                      {/* File Preview */}
                      {selectedFile && filePreview && (
                        <div className="mb-4 p-2 border border-gray-200 rounded-md">
                          <p className="text-xs font-medium text-gray-700 mb-1">File Preview:</p>
                          <img src={filePreview} alt="Preview" className="max-h-32 max-w-full object-contain" />
                        </div>
                      )}
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message Content</label>
                        <textarea
                          name="extraInfo"
                          value={formData.extraInfo}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[150px]"
                          placeholder="Enter your detailed message here..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Form/Document Link</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                            </div>
                            <input
                              type="url"
                              name="formLink"
                              value={formData.formLink}
                              onChange={handleInputChange}
                              className="w-full pl-9 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="https://forms.example.com/your-form"
                              required
                            />
                          </div>
                        </div>
                        
                        {/* File Upload */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (Optional)</label>
                          <div className="flex items-center space-x-2">
                            <label className="flex-1">
                              <div className="relative flex items-center justify-center px-4 py-2 border border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50">
                                <input 
                                  type="file" 
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                  onChange={handleFileChange}
                                  ref={fileInputRef}
                                />
                                <div className="flex items-center justify-center space-x-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                  <span className="text-sm text-gray-500 truncate">
                                    {selectedFile ? selectedFile.name : 'Upload file (max 5MB)'}
                                  </span>
                                </div>
                              </div>
                            </label>
                            {selectedFile && (
                              <button 
                                type="button" 
                                onClick={clearFileSelection}
                                className="p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Supported formats: Images, PDF, Word, Excel, PowerPoint</p>
                        </div>
                      </div>
                      
                      {/* File Preview */}
                      {selectedFile && filePreview && (
                        <div className="mb-4 p-2 border border-gray-200 rounded-md">
                          <p className="text-xs font-medium text-gray-700 mb-1">File Preview:</p>
                          <img src={filePreview} alt="Preview" className="max-h-32 max-w-full object-contain" />
                        </div>
                      )}
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Instructions</label>
                        <textarea
                          name="extraInfo"
                          value={formData.extraInfo}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                          placeholder="Enter any additional instructions or information about the form..."
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Recipients Section */}
              <div className="mb-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Recipients</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Students */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 shadow-sm">
                      <h5 className="font-medium mb-3 text-blue-800 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998a12.078 12.078 0 01.665-6.479L12 14z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998a12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                        </svg>
                        <span>Students</span>
                      </h5>
                      
                      <div className="mb-3">
                        <label className="inline-flex items-center p-2 rounded-md hover:bg-blue-100 transition-colors w-full">
                          <input
                            type="checkbox"
                            checked={formData.recipients.students.all}
                            onChange={(e) => handleRecipientChange('students', 'all', e.target.checked)}
                            className="form-checkbox h-5 w-5 text-blue-600 rounded"
                          />
                          <span className="ml-2 font-medium">All Students</span>
                        </label>
                      </div>
                      
                      {!formData.recipients.students.all && (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                          <div className="mb-2">
                            <label className="block text-sm font-medium text-blue-800 mb-1">Courses</label>
                            <div className="flex flex-wrap gap-1">
                              {courses.map(course => (
                                <label key={course} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={formData.recipients.students.courses.includes(course)}
                                    onChange={() => handleMultiSelectChange('students', 'courses', course)}
                                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                                  />
                                  <span className="ml-1 text-sm">{course}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          <div className="mb-2">
                            <label className="block text-sm font-medium text-blue-800 mb-1">Branches</label>
                            {formData.recipients.students.courses.length === 0 ? (
                              <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded border border-gray-200">
                                Please select at least one course to view available branches
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {formData.recipients.students.courses.map(course => (
                                  <div key={course} className="border border-blue-100 rounded-md p-2 bg-blue-50">
                                    <h6 className="text-sm font-medium text-blue-700 mb-2">{course}</h6>
                                    <div className="flex flex-wrap gap-1">
                                      {allBranches[course]?.map(branch => (
                                        <label key={`${course}-${branch}`} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors">
                                          <input
                                            type="checkbox"
                                            checked={formData.recipients.students.branches.includes(branch)}
                                            onChange={() => handleMultiSelectChange('students', 'branches', branch)}
                                            className="form-checkbox h-4 w-4 text-blue-600 rounded"
                                          />
                                          <span className="ml-1 text-sm">{branch}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="mb-2">
                            <label className="block text-sm font-medium text-blue-800 mb-1">Passout Years</label>
                            <div className="flex flex-wrap gap-1">
                              {passoutYears.map(year => (
                                <label key={year} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={formData.recipients.students.passoutYears.includes(year)}
                                    onChange={() => handleMultiSelectChange('students', 'passoutYears', year)}
                                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                                  />
                                  <span className="ml-1 text-sm">{year}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Faculty */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100 shadow-sm">
                      <h5 className="font-medium mb-3 text-green-800 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Faculty</span>
                      </h5>
                      
                      <div className="mb-3">
                        <label className="inline-flex items-center p-2 rounded-md hover:bg-green-100 transition-colors w-full">
                          <input
                            type="checkbox"
                            checked={formData.recipients.faculty.all}
                            onChange={(e) => handleRecipientChange('faculty', 'all', e.target.checked)}
                            className="form-checkbox h-5 w-5 text-green-600 rounded"
                          />
                          <span className="ml-2 font-medium">All Faculty</span>
                        </label>
                      </div>
                      
                      {!formData.recipients.faculty.all && (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                          <div className="mb-2">
                            <label className="block text-sm font-medium text-green-800 mb-1">Specializations</label>
                            <div className="flex flex-wrap gap-1">
                              {specializations.map(spec => (
                                <label key={spec} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-green-200 hover:bg-green-100 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={formData.recipients.faculty.specializations.includes(spec)}
                                    onChange={() => handleMultiSelectChange('faculty', 'specializations', spec)}
                                    className="form-checkbox h-4 w-4 text-green-600 rounded"
                                  />
                                  <span className="ml-1 text-sm">{spec}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          

                        </div>
                      )}
                    </div>
                    
                    {/* Admins */}
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100 shadow-sm">
                      <h5 className="font-medium mb-3 text-purple-800 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Admins</span>
                      </h5>
                      
                      <div className="mb-3">
                        <label className="inline-flex items-center p-2 rounded-md hover:bg-purple-100 transition-colors w-full">
                          <input
                            type="checkbox"
                            checked={formData.recipients.admins.all}
                            onChange={(e) => handleRecipientChange('admins', 'all', e.target.checked)}
                            className="form-checkbox h-5 w-5 text-purple-600 rounded"
                          />
                          <span className="ml-2 font-medium">All Admins</span>
                        </label>
                      </div>
                      
                      {!formData.recipients.admins.all && (
                        <div className="mb-2">
                          <label className="block text-sm font-medium text-purple-800 mb-1">Specific Admins</label>
                          <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                            {adminNames.map(name => (
                              <label key={name} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-purple-200 hover:bg-purple-100 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={formData.recipients.admins.names.includes(name)}
                                  onChange={() => handleMultiSelectChange('admins', 'names', name)}
                                  className="form-checkbox h-4 w-4 text-purple-600 rounded"
                                />
                                <span className="ml-1 text-sm">{name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => navigate('/home')}
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-sm min-w-[100px]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm min-w-[150px]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>Send Notification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default SendNotification;