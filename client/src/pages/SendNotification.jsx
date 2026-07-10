import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import API_CONFIG from '../config/api';
import { API_BASE } from '../config/api';
import './Dashboard.css';

const SendNotification = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'message', // Changed default to message (mail-style)
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
        courses: [],
        departments: []
      },
      hods: {
        all: false,
        courses: [],
        departments: []
      },
      admins: {
        all: false,
        names: []
      },
      emails: [] // Direct email addresses
    }
  });

  const [emailChips, setEmailChips] = useState([]); // Array of email chip objects
  const [emailInput, setEmailInput] = useState(''); // Current input value
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [allDatabaseEmails, setAllDatabaseEmails] = useState([]);

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
  const [facultyData, setFacultyData] = useState([]);
  const [adminNames, setAdminNames] = useState([]);

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

  // Generate passout years (current year + 5 years)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 6; i++) {
      years.push(currentYear + i);
    }
    setPassoutYears(years);
  }, []);

  // Fetch faculty, admins, students, and HODs data
  useEffect(() => {
    const fetchRecipientData = async () => {
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      let allEmails = [];

      // Fetch faculty
      try {
        const facultyResponse = await axios.get(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.FACULTY.ALL), {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (facultyResponse.data && facultyResponse.data.data) {
          setFacultyData(facultyResponse.data.data);
          allEmails = [...allEmails, ...facultyResponse.data.data.map(f => ({
            email: f.email,
            name: f.name,
            role: 'Faculty',
            course: f.course,
            department: f.department
          }))];
        }
      } catch (error) {
        console.error('Failed to fetch faculty:', error);
      }

      // Fetch admin names and emails
      try {
        const adminResponse = await axios.get(API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.ADMIN.ALL_ADMINS), {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (adminResponse.data && adminResponse.data.data) {
          setAdminNames(adminResponse.data.data.map(admin => admin.name));
          allEmails = [...allEmails, ...adminResponse.data.data.map(a => ({
            email: a.email,
            name: a.name,
            role: 'Admin'
          }))];
        }
      } catch (error) {
        console.error('Failed to fetch admin names:', error);
      }

      // Fetch students
      try {
        const studentsResponse = await axios.get(`${API_BASE}/admin/all-students`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (studentsResponse.data && studentsResponse.data.data) {
          allEmails = [...allEmails, ...studentsResponse.data.data.map(s => ({
            email: s.email,
            name: s.name,
            role: 'Student',
            course: s.course,
            branch: s.branch
          }))];
        }
      } catch (error) {
        console.error('Failed to fetch students:', error);
      }

      // Fetch HODs
      try {
        const hodsResponse = await axios.get(`${API_BASE}/admin/all-hods`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (hodsResponse.data && hodsResponse.data.data) {
          allEmails = [...allEmails, ...hodsResponse.data.data.map(h => ({
            email: h.email,
            name: h.name,
            role: 'HOD',
            course: h.course,
            department: h.department
          }))];
        }
      } catch (error) {
        console.error('Failed to fetch HODs:', error);
      }

      setAllDatabaseEmails(allEmails);
    };

    fetchRecipientData();
  }, []);

  // Fetch HODs
  const { data: hodsData = [] } = useQuery({
    queryKey: ['allHODs'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get(`${API_BASE}/admin/all-hods`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data.data || [];
    },
    enabled: !!user
  });

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

    // Update available branches when courses are selected (for students)
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

    // Reset departments when HOD courses change
    if (category === 'hods' && subcategory === 'courses') {
      handleRecipientChange('hods', 'departments', []);
    }

    // Reset departments when faculty courses change
    if (category === 'faculty' && subcategory === 'courses') {
      handleRecipientChange('faculty', 'departments', []);
    }
  };

  const handleEmailInputChange = (e) => {
    const value = e.target.value;
    setEmailInput(value);

    // Check for comma, space, or Enter to add email chip
    if (value.endsWith(',') || value.endsWith(' ') || value.endsWith('\n')) {
      const email = value.slice(0, -1).trim();
      if (email && email.includes('@') && !emailChips.find(chip => chip.email === email)) {
        setEmailChips([...emailChips, { email, name: null }]);
        setEmailInput('');
        setShowEmailSuggestions(false);
        return;
      }
      setEmailInput('');
      return;
    }

    const currentWord = value.trim().toLowerCase();

    if (currentWord.length > 0) {
      // Filter suggestions based on current input
      const filtered = allDatabaseEmails.filter(item =>
        item.email.toLowerCase().includes(currentWord) ||
        item.name.toLowerCase().includes(currentWord)
      ).slice(0, 10); // Limit to 10 suggestions

      setEmailSuggestions(filtered);
      setShowEmailSuggestions(filtered.length > 0);
    } else {
      setShowEmailSuggestions(false);
    }
  };

  const handleEmailSuggestionClick = (suggestionItem) => {
    // Add email chip from suggestion
    if (!emailChips.find(chip => chip.email === suggestionItem.email)) {
      setEmailChips([...emailChips, {
        email: suggestionItem.email,
        name: suggestionItem.name,
        role: suggestionItem.role
      }]);
    }
    setEmailInput('');
    setShowEmailSuggestions(false);
  };

  const removeEmailChip = (emailToRemove) => {
    setEmailChips(emailChips.filter(chip => chip.email !== emailToRemove));
  };

  const handleEmailInputKeyDown = (e) => {
    // Handle backspace to remove last chip when input is empty
    if (e.key === 'Backspace' && emailInput === '' && emailChips.length > 0) {
      setEmailChips(emailChips.slice(0, -1));
    }
    // Handle Enter to add email
    if (e.key === 'Enter') {
      e.preventDefault();
      const email = emailInput.trim();
      if (email && email.includes('@') && !emailChips.find(chip => chip.email === email)) {
        setEmailChips([...emailChips, { email, name: null }]);
        setEmailInput('');
        setShowEmailSuggestions(false);
      }
    }
  };

  const [showSuccess, setShowSuccess] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate deadline only for text and form types
    if ((formData.type === 'text' || formData.type === 'form') && !formData.deadline) {
      toast.error('Deadline is required for notifications and forms');
      setLoading(false);
      return;
    }

    // Validate form link is provided for form type notifications
    if (formData.type === 'form' && !formData.formLink) {
      toast.error('Form link is required for form notifications');
      setLoading(false);
      return;
    }

    // Get email addresses from chips
    const emailAddresses = emailChips.map(chip => chip.email);

    // Create a copy of formData with updated emails
    const updatedFormData = {
      ...formData,
      recipients: {
        ...formData.recipients,
        emails: emailAddresses.length > 0 ? emailAddresses : []
      }
    };

    try {
      const token = sessionStorage.getItem('authToken');

      // Create FormData object for file upload
      const formDataToSend = new FormData();

      // Add all form fields to FormData
      Object.keys(updatedFormData).forEach(key => {
        if (key === 'recipients') {
          formDataToSend.append(key, JSON.stringify(updatedFormData[key]));
        } else {
          formDataToSend.append(key, updatedFormData[key]);
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
        if (formData.recipients.faculty.all) count += facultyData.length;
        if (formData.recipients.admins.all) count += adminNames.length;
        if (formData.recipients.hods.all) count += (hodsData?.length || 0);

        if (!formData.recipients.students.all) {
          // Add rough estimate based on filters
          count += formData.recipients.students.courses.length * 10;
        }

        if (!formData.recipients.faculty.all) {
          count += formData.recipients.faculty.courses.length * 5; // Estimate 5 faculty per course
        }

        if (!formData.recipients.admins.all) {
          count += formData.recipients.admins.names.length;
        }

        if (!formData.recipients.hods.all) {
          count += formData.recipients.hods.departments.length;
        }

        // Add direct email count
        if (formData.recipients.emails && formData.recipients.emails.length > 0) {
          count += formData.recipients.emails.length;
        }

        setRecipientCount(count);
      }
      
      setShowSuccess(true);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'message',
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
            courses: [],
            departments: []
          },
          hods: {
            all: false,
            courses: [],
            departments: []
          },
          admins: {
            all: false,
            names: []
          },
          emails: []
        }
      });

      // Clear email chips
      setEmailChips([]);
      setEmailInput('');

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

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h1 className="text-3xl font-bold text-foreground mb-2">You are not logged in</h1>
        <p className="text-lg text-muted-foreground mb-6">Please login to access your dashboard.</p>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h1 className="text-3xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">Only admins can access this page.</p>
        <Button onClick={() => navigate('/home')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <PortalLayout role="admin" title="Send Notification" user={profileData || user}>
        <div className="w-full overflow-hidden">
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
          
          <GlassPanel className="w-full max-w-5xl mx-auto">
            <PageHeader title="Send Notification" icon={Send} />

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Notification Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Notification Type</label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md flex items-center gap-2 shadow-sm transition-all ${formData.type === 'message' ? 'bg-blue-600 text-white ring-1 ring-blue-300' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                    onClick={() => handleTypeChange('message')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Mail Message</span>
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md flex items-center gap-2 shadow-sm transition-all ${formData.type === 'text' ? 'bg-blue-600 text-white ring-1 ring-blue-300' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                    onClick={() => handleTypeChange('text')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span>Text Notification</span>
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
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <p><strong>Mail Message:</strong> Send an email-like notification without a deadline requirement.</p>
                  <p><strong>Text Notification:</strong> Send an alert notification with a deadline for important announcements.</p>
                  <p><strong>Form/Document:</strong> Share a form or document link with recipients (requires deadline).</p>
                </div>
              </div>
              
              {/* Message Content - Different layouts for different types */}
              {formData.type === 'message' ? (
                // MAIL MESSAGE - Beautiful email-style layout
                <div className="mb-4">
                  <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 shadow-md border-2 border-blue-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Mail Message Compose</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full ml-auto">No Deadline Required</span>
                    </h3>

                    {/* Subject */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email Subject</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 bg-white border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                          placeholder="Enter a clear and descriptive subject line..."
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1 ml-1">This will appear as the email subject and notification title</p>
                    </div>

                    {/* Message Body */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Message Body</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[180px] text-base"
                        placeholder="Compose your mail message here...&#10;&#10;Write a clear and detailed message. This will be sent as an email to all selected recipients.&#10;&#10;Tips:&#10;• Be clear and concise&#10;• Include all necessary information&#10;• Use professional language"
                        required
                      />
                    </div>

                    {/* Optional Attachment */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Attachment (Optional)</label>
                      <div className="flex items-center space-x-2">
                        <label className="flex-1">
                          <div className="relative flex items-center justify-center px-4 py-3 bg-white border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all">
                            <input
                              type="file"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={handleFileChange}
                              ref={fileInputRef}
                            />
                            <div className="flex items-center justify-center space-x-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">
                                {selectedFile ? selectedFile.name : 'Attach a file (max 5MB)'}
                              </span>
                            </div>
                          </div>
                        </label>
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={clearFileSelection}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {selectedFile && filePreview && (
                        <div className="mt-3 p-3 bg-white border-2 border-blue-200 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
                          <img src={filePreview} alt="Preview" className="max-h-40 max-w-full object-contain rounded" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : formData.type === 'text' ? (
                // TEXT NOTIFICATION - Alert-style layout with deadline
                <div className="mb-4">
                  <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 rounded-xl p-6 shadow-md border-2 border-amber-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span>Alert Notification</span>
                      <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full ml-auto">Deadline Required</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Title */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Notification Title</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            placeholder="Important announcement title"
                            required
                          />
                        </div>
                      </div>

                      {/* Deadline */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Deadline</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <input
                            type="datetime-local"
                            name="deadline"
                            value={formData.deadline}
                            onChange={handleInputChange}
                            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notification Message */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Notification Message</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border-2 border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[150px]"
                        placeholder="Write your notification message...&#10;&#10;This will appear as an alert notification with the deadline displayed prominently."
                        required
                      />
                    </div>

                    {/* Optional Attachment */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Attachment (Optional)</label>
                      <div className="flex items-center space-x-2">
                        <label className="flex-1">
                          <div className="relative flex items-center justify-center px-4 py-3 bg-white border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 transition-all">
                            <input
                              type="file"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={handleFileChange}
                              ref={fileInputRef}
                            />
                            <div className="flex items-center justify-center space-x-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">
                                {selectedFile ? selectedFile.name : 'Attach a file (max 5MB)'}
                              </span>
                            </div>
                          </div>
                        </label>
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={clearFileSelection}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {selectedFile && filePreview && (
                        <div className="mt-3 p-3 bg-white border-2 border-amber-200 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
                          <img src={filePreview} alt="Preview" className="max-h-40 max-w-full object-contain rounded" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // FORM/DOCUMENT - Beautiful professional form layout
                <div className="mb-4">
                  <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl p-6 shadow-md border-2 border-emerald-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Form/Document Sharing</span>
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full ml-auto">Deadline Required</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Title */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Form/Document Title</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="e.g., Placement Registration Form"
                            required
                          />
                        </div>
                      </div>

                      {/* Deadline */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Submission Deadline</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="datetime-local"
                            name="deadline"
                            value={formData.deadline}
                            onChange={handleInputChange}
                            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form Link */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Form/Document Link</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                        <input
                          type="url"
                          name="formLink"
                          value={formData.formLink}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 bg-white border-2 border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="https://forms.google.com/your-form-id or https://your-document-link.com"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1 ml-1">Enter the complete URL to your Google Form, Microsoft Form, or document link</p>
                    </div>

                    {/* Description/Instructions */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions & Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border-2 border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[150px]"
                        placeholder="Provide clear instructions for filling the form or accessing the document...&#10;&#10;Example:&#10;• What this form is about&#10;• Who should fill it&#10;• Important information to keep ready&#10;• Any specific requirements"
                        required
                      />
                    </div>

                    {/* Optional Attachment */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Attachment (Optional)</label>
                      <div className="flex items-center space-x-2">
                        <label className="flex-1">
                          <div className="relative flex items-center justify-center px-4 py-3 bg-white border-2 border-dashed border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-50 transition-all">
                            <input
                              type="file"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={handleFileChange}
                              ref={fileInputRef}
                            />
                            <div className="flex items-center justify-center space-x-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">
                                {selectedFile ? selectedFile.name : 'Attach supporting document (max 5MB)'}
                              </span>
                            </div>
                          </div>
                        </label>
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={clearFileSelection}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {selectedFile && filePreview && (
                        <div className="mt-3 p-3 bg-white border-2 border-emerald-200 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
                          <img src={filePreview} alt="Preview" className="max-h-40 max-w-full object-contain rounded" />
                        </div>
                      )}
                      <p className="text-xs text-gray-600 mt-1">Optional: Attach instructions PDF, sample format, or related document</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Direct Email Addresses Section - with email chips and database suggestions */}
              <div className="mb-4">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 shadow-sm border border-indigo-200">
                  <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Direct Email Addresses</span>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">Optional</span>
                  </h3>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter specific email addresses (with auto-suggestions from database)
                    </label>

                    {/* Email Chips Container with Input */}
                    <div className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 min-h-[120px] bg-white flex flex-wrap gap-2 items-start">
                      {/* Display email chips */}
                      {emailChips.map((chip, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium shadow-sm border border-indigo-200 hover:bg-indigo-200 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                            <div className="flex flex-col">
                              {chip.name && <span className="text-xs font-semibold">{chip.name}</span>}
                              <span className={chip.name ? 'text-xs' : ''}>{chip.email}</span>
                            </div>
                            {chip.role && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                chip.role === 'Student' ? 'bg-blue-200 text-blue-800' :
                                chip.role === 'Faculty' ? 'bg-green-200 text-green-800' :
                                chip.role === 'HOD' ? 'bg-orange-200 text-orange-800' :
                                'bg-purple-200 text-purple-800'
                              }`}>
                                {chip.role}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEmailChip(chip.email)}
                            className="flex-shrink-0 ml-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-300 rounded-full p-0.5 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}

                      {/* Input field for typing new emails */}
                      <input
                        type="text"
                        value={emailInput}
                        onChange={handleEmailInputChange}
                        onKeyDown={handleEmailInputKeyDown}
                        onBlur={() => {
                          // Delay hiding suggestions to allow click events
                          setTimeout(() => setShowEmailSuggestions(false), 200);
                        }}
                        className="flex-1 min-w-[200px] outline-none bg-transparent text-sm py-1"
                        placeholder={emailChips.length === 0 ? "Type email or name to see suggestions..." : "Add more emails..."}
                      />
                    </div>

                    {/* Email Suggestions Dropdown */}
                    {showEmailSuggestions && emailSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border-2 border-indigo-300 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                        <div className="p-2 bg-indigo-50 border-b border-indigo-200 sticky top-0">
                          <p className="text-xs font-medium text-indigo-900">Select from database:</p>
                        </div>
                        {emailSuggestions.map((item, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent input from losing focus
                              handleEmailSuggestionClick(item);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                <p className="text-xs text-gray-600">{item.email}</p>
                              </div>
                              <div className="ml-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  item.role === 'Student' ? 'bg-blue-100 text-blue-700' :
                                  item.role === 'Faculty' ? 'bg-green-100 text-green-700' :
                                  item.role === 'HOD' ? 'bg-orange-100 text-orange-700' :
                                  'bg-purple-100 text-purple-700'
                                }`}>
                                  {item.role}
                                </span>
                                {item.course && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    {item.course} {item.department || item.branch || ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex items-start gap-2 bg-white p-3 rounded-lg border border-indigo-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><strong className="text-indigo-700">How it works:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Type any name or email to see matching suggestions from the database</li>
                          <li>Click on a suggestion to add it automatically as a chip</li>
                          <li>Press Enter, Space, or Comma to add the typed email as a chip</li>
                          <li>Click the X button on any chip to remove it</li>
                          <li>Press Backspace when input is empty to remove the last chip</li>
                          <li>You can also type external emails not in the database</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recipients Section */}
              <div className="mb-4">
                <GlassPanel>
                  <h3 className="text-md font-medium text-foreground mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Recipients</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            <label className="block text-sm font-medium text-green-800 mb-1">By Course</label>
                            <div className="flex flex-wrap gap-1">
                              {courses.map(course => (
                                <label key={course} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-green-200 hover:bg-green-100 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={formData.recipients.faculty.courses.includes(course)}
                                    onChange={() => handleMultiSelectChange('faculty', 'courses', course)}
                                    className="form-checkbox h-4 w-4 text-green-600 rounded"
                                  />
                                  <span className="ml-1 text-sm">{course}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="mb-2">
                            <label className="block text-sm font-medium text-green-800 mb-1">By Department</label>
                            {formData.recipients.faculty.courses.length === 0 ? (
                              <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded border border-gray-200">
                                Please select at least one course to view available departments
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {formData.recipients.faculty.courses.map(course => (
                                  <div key={course} className="border border-green-100 rounded-md p-2 bg-green-50">
                                    <h6 className="text-sm font-medium text-green-700 mb-2">{course}</h6>
                                    <div className="flex flex-wrap gap-1">
                                      {allBranches[course]?.map(dept => (
                                        <label key={`${course}-${dept}`} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-green-200 hover:bg-green-100 transition-colors">
                                          <input
                                            type="checkbox"
                                            checked={formData.recipients.faculty.departments.includes(dept)}
                                            onChange={() => handleMultiSelectChange('faculty', 'departments', dept)}
                                            className="form-checkbox h-4 w-4 text-green-600 rounded"
                                          />
                                          <span className="ml-1 text-sm">{dept}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* HODs */}
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-100 shadow-sm">
                      <h5 className="font-medium mb-3 text-orange-800 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>HODs</span>
                      </h5>

                      <div className="mb-3">
                        <label className="inline-flex items-center p-2 rounded-md hover:bg-orange-100 transition-colors w-full">
                          <input
                            type="checkbox"
                            checked={formData.recipients.hods.all}
                            onChange={(e) => handleRecipientChange('hods', 'all', e.target.checked)}
                            className="form-checkbox h-5 w-5 text-orange-600 rounded"
                          />
                          <span className="ml-2 font-medium">All HODs ({hodsData.length})</span>
                        </label>
                      </div>

                      {!formData.recipients.hods.all && (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                          <div className="mb-2">
                            <label className="block text-sm font-medium text-orange-800 mb-1">By Course</label>
                            <div className="flex flex-wrap gap-1">
                              {courses.map(course => (
                                <label key={course} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-orange-200 hover:bg-orange-100 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={formData.recipients.hods.courses.includes(course)}
                                    onChange={() => handleMultiSelectChange('hods', 'courses', course)}
                                    className="form-checkbox h-4 w-4 text-orange-600 rounded"
                                  />
                                  <span className="ml-1 text-sm">{course}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="mb-2">
                            <label className="block text-sm font-medium text-orange-800 mb-1">By Department</label>
                            {formData.recipients.hods.courses.length === 0 ? (
                              <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded border border-gray-200">
                                Please select at least one course to view available departments
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {formData.recipients.hods.courses.map(course => (
                                  <div key={course} className="border border-orange-100 rounded-md p-2 bg-orange-50">
                                    <h6 className="text-sm font-medium text-orange-700 mb-2">{course}</h6>
                                    <div className="flex flex-wrap gap-1">
                                      {allBranches[course]?.map(dept => (
                                        <label key={`${course}-${dept}`} className="inline-flex items-center bg-white px-2 py-1 rounded-md border border-orange-200 hover:bg-orange-100 transition-colors">
                                          <input
                                            type="checkbox"
                                            checked={formData.recipients.hods.departments.includes(dept)}
                                            onChange={() => handleMultiSelectChange('hods', 'departments', dept)}
                                            className="form-checkbox h-4 w-4 text-orange-600 rounded"
                                          />
                                          <span className="ml-1 text-sm">{dept}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
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
                </GlassPanel>
              </div>


              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/home')}
                  className="min-w-[100px]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Cancel</span>
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                  className="min-w-[150px]"
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
                </Button>
              </div>
            </form>
          </GlassPanel>
        </div>
    </PortalLayout>
  );
};

export default SendNotification;