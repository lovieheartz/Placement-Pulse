import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Send, X } from 'lucide-react';
import { API_BASE } from '../config/api';

const HODSendNotification = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'message', // Changed to 'message' for mail-style (no expiry)
    formLink: '',
    deadline: '', // Optional for mail-style
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
        departments: []
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

  const [passoutYears, setPassoutYears] = useState([]);

  // Fetch HOD profile to get their course and department
  const {
    data: profileData,
  } = useQuery({
    queryKey: ['hodProfile'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/hod/profile`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
      });
      return data.data;
    },
    enabled: !!user,
  });

  // Fetch faculty in HOD's department
  const { data: facultyData = [] } = useQuery({
    queryKey: ['hodFaculty', profileData?.course, profileData?.department],
    queryFn: async () => {
      const { data} = await axios.get(`${API_BASE}/hod/faculties`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
      });
      return data.data || [];
    },
    enabled: !!profileData && !!user,
  });

  // Fetch all emails for autocomplete
  useEffect(() => {
    const fetchAllEmails = async () => {
      const token = sessionStorage.getItem('authToken');
      if (!token || !profileData) return;

      let allEmails = [];

      // Fetch students
      try {
        const studentsResponse = await axios.get(`${API_BASE}/admin/all-students`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (studentsResponse.data && studentsResponse.data.data) {
          const hodStudents = studentsResponse.data.data.filter(s =>
            s.course === profileData.course && s.branch === profileData.department
          );
          allEmails = [...allEmails, ...hodStudents.map(s => ({
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

      // Add faculty from HOD's department
      if (facultyData && facultyData.length > 0) {
        allEmails = [...allEmails, ...facultyData.map(f => ({
          email: f.email,
          name: f.name,
          role: 'Faculty',
          course: f.course,
          department: f.department
        }))];
      }

      // Fetch admins
      try {
        const adminsResponse = await axios.get(`${API_BASE}/admin/all-admins`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (adminsResponse.data && adminsResponse.data.data) {
          allEmails = [...allEmails, ...adminsResponse.data.data.map(a => ({
            email: a.email,
            name: a.name,
            role: 'Admin/TPO'
          }))];
        }
      } catch (error) {
        console.error('Failed to fetch admins:', error);
      }

      setAllDatabaseEmails(allEmails);
    };

    if (profileData && user) {
      fetchAllEmails();
    }
  }, [profileData, user, facultyData]);

  // Generate passout years (current year + 5 years)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 6; i++) {
      years.push(currentYear + i);
    }
    setPassoutYears(years);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
  };

  const [showSuccess, setShowSuccess] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // For mail-style messages, deadline is optional
    if (formData.type === 'form' && !formData.formLink) {
      toast.error('Form link is required for form notifications');
      setLoading(false);
      return;
    }

    try {
      const token = sessionStorage.getItem('authToken');

      // Get email addresses from chips
      const emailAddresses = emailChips.map(chip => chip.email);

      console.log('📧 Email chips:', emailChips);
      console.log('📧 Email addresses to send:', emailAddresses);

      // Create a copy of formData with updated emails
      const updatedFormData = {
        ...formData,
        recipients: {
          ...formData.recipients,
          emails: emailAddresses.length > 0 ? emailAddresses : []
        }
      };

      console.log('📧 Updated form data recipients:', updatedFormData.recipients);

      // Create FormData object for file upload
      const formDataToSend = new FormData();

      // Add all form fields to FormData
      Object.keys(updatedFormData).forEach(key => {
        if (key === 'recipients') {
          const recipientsJSON = JSON.stringify(updatedFormData[key]);
          console.log('📧 Recipients JSON being sent:', recipientsJSON);
          formDataToSend.append(key, recipientsJSON);
        } else {
          formDataToSend.append(key, updatedFormData[key]);
        }
      });

      // Add file if selected
      if (selectedFile) {
        formDataToSend.append('attachment', selectedFile);
      }

      const response = await axios.post(`${API_BASE}/notifications/create`, formDataToSend, {
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
            departments: []
          },
          emails: []
        }
      });

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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">You are not logged in</h1>
        <p className="text-lg text-gray-600 mb-6">Please login to access your dashboard.</p>
      </div>
    );
  }

  return (
    <PortalLayout role="hod" title="Send Notification" user={profileData || user}>
        <div className="w-full overflow-hidden">
          {showSuccess && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6 flex items-start">
              <div className="flex-shrink-0 mr-3">
                <svg className="h-6 w-6 text-success" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-success font-medium">Notification sent successfully!</h3>
                <p className="text-success/90 mt-1">Your notification has been sent to approximately {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}.</p>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="ml-auto flex-shrink-0 text-success hover:text-success/80"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <GlassPanel className="w-full max-w-5xl mx-auto">
            <PageHeader
              title="Send Notification"
              subtitle="Send messages to students, faculty, and admin in your department"
              icon={Send}
            />

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Notification Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Message Type</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.type === 'message'
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 shadow-md'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => handleTypeChange('message')}
                  >
                    <div className="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 flex-shrink-0 ${formData.type === 'message' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-gray-900">Mail Message</p>
                        <p className="text-xs text-gray-600 mt-1">Send email-style messages without deadline restrictions</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.type === 'text'
                        ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 shadow-md'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => handleTypeChange('text')}
                  >
                    <div className="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 flex-shrink-0 ${formData.type === 'text' ? 'text-amber-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <div>
                        <p className="font-semibold text-gray-900">Text Notification</p>
                        <p className="text-xs text-gray-600 mt-1">Send urgent alerts with deadlines</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.type === 'form'
                        ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 shadow-md'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => handleTypeChange('form')}
                  >
                    <div className="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 flex-shrink-0 ${formData.type === 'form' ? 'text-emerald-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-gray-900">Form/Document</p>
                        <p className="text-xs text-gray-600 mt-1">Share forms or documents with submission deadlines</p>
                      </div>
                    </div>
                  </button>
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
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <span>Students in Your Department</span>
                      </h5>

                      <div className="mb-3">
                        <label className="inline-flex items-center p-2 rounded-md hover:bg-blue-100 transition-colors w-full">
                          <input
                            type="checkbox"
                            checked={formData.recipients.students.all}
                            onChange={(e) => {
                              handleRecipientChange('students', 'all', e.target.checked);
                              if (e.target.checked && profileData) {
                                // Auto-select HOD's course and department
                                handleRecipientChange('students', 'courses', [profileData.course]);
                                handleRecipientChange('students', 'branches', [profileData.department]);
                              }
                            }}
                            className="form-checkbox h-5 w-5 text-blue-600 rounded"
                          />
                          <span className="ml-2 font-medium">All Students ({profileData?.course} - {profileData?.department})</span>
                        </label>
                      </div>

                      {!formData.recipients.students.all && (
                        <div className="space-y-3">
                          <div className="mb-2">
                            <label className="block text-sm font-medium text-blue-800 mb-1">Filter by Passout Year</label>
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
                        <span>Faculty in Your Department</span>
                      </h5>

                      <div className="mb-3">
                        <label className="inline-flex items-center p-2 rounded-md hover:bg-green-100 transition-colors w-full">
                          <input
                            type="checkbox"
                            checked={formData.recipients.faculty.all}
                            onChange={(e) => handleRecipientChange('faculty', 'all', e.target.checked)}
                            className="form-checkbox h-5 w-5 text-green-600 rounded"
                          />
                          <span className="ml-2 font-medium">All Faculty ({facultyData.length} members)</span>
                        </label>
                      </div>

                      <p className="text-xs text-gray-600 mt-2">
                        Your notifications will be sent to faculty in <strong>{profileData?.course} - {profileData?.department}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => navigate('/hod/dashboard')}
                  className="min-w-[100px]"
                >
                  <X className="size-4" />
                  <span>Cancel</span>
                </Button>
                <Button
                  type="submit"
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
                      <Send className="size-4" />
                      <span>Send {formData.type === 'message' ? 'Message' : 'Notification'}</span>
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

export default HODSendNotification;
