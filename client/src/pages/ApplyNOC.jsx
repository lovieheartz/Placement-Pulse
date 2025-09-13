import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/StudentSidebar';
import Header from '../components/StudentHeader';
import Footer from '../components/StudentFooter';
import axios from 'axios';

const ApplyNOC = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const watchedCourse = watch('course');

  const courseOptions = {
    'BTech': ['CSE', 'CSE(AIML)', 'CSE-DS', 'CSE-IOT', 'BME', 'IT', 'CSBS', 'CE', 'EE', 'ME', 'ECE'],
    'MTech': ['CSE', 'CI', 'ECE&PS'],
    'Diploma': ['EE', 'EEEVT', 'CE', 'CSE'],
    'BCA': ['BCA'],
    'MCA': ['MCA'],
    'BBA': ['BBA'],
    'MBA': ['MBA']
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 6}, (_, i) => currentYear + i);

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const { mutate: submitNOC, isPending: isSubmitting } = useMutation({
    mutationFn: async (formData) => {
      const token = sessionStorage.getItem('authToken');
      const data = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key !== 'attachment') {
          data.append(key, formData[key]);
        }
      });
      
      if (selectedFile) {
        data.append('attachment', selectedFile);
      }

      const { data: response } = await axios.post('http://localhost:3001/noc/submit', data, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return response;
    },
    onSuccess: () => {
      toast.success('NOC request submitted successfully!');
      reset();
      setSelectedFile(null);
      queryClient.invalidateQueries(['nocRequests']);
      setTimeout(() => navigate('/student/track-noc'), 2000);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to submit NOC request');
    },
  });

  const onSubmit = (data) => {
    const nocData = {
      ...data,
      name: user.name,
      course: user.course,
      branch: user.branch,
      passoutYear: user.passoutYear
    };
    submitNOC(nocData);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        e.target.value = null;
        return;
      }
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        e.target.value = null;
        return;
      }
      setSelectedFile(file);
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
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100/50">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h1 className="text-xl font-bold text-white">Apply for NOC</h1>
                <p className="text-blue-100 text-sm">No Objection Certificate Request</p>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        University Roll <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('universityRoll', { required: 'University Roll is required' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your university roll"
                      />
                      {errors.universityRoll && <p className="text-red-500 text-xs mt-1">{errors.universityRoll.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Personal Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        {...register('personalEmail', { required: 'Personal email is required' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your personal email"
                      />
                      {errors.personalEmail && <p className="text-red-500 text-xs mt-1">{errors.personalEmail.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('subject', { required: 'Subject is required' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter subject for NOC request"
                    />
                    {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Application Text <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register('applicationText', { 
                        required: 'Application text is required',
                        maxLength: { value: 1000, message: 'Maximum 1000 characters allowed' }
                      })}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Write your NOC application here..."
                    />
                    {errors.applicationText && <p className="text-red-500 text-xs mt-1">{errors.applicationText.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attachment (PDF only) <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50 hover:bg-blue-100 transition-colors">
                      {!selectedFile ? (
                        <div className="text-center">
                          <svg className="mx-auto h-12 w-12 text-blue-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="mt-4">
                            <label htmlFor="file-upload" className="cursor-pointer">
                              <span className="mt-2 block text-sm font-medium text-blue-600">Click to upload PDF</span>
                              <span className="mt-1 block text-xs text-gray-500">or drag and drop</span>
                            </label>
                            <input
                              id="file-upload"
                              type="file"
                              onChange={handleFileChange}
                              accept=".pdf"
                              className="sr-only"
                              required
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            PDF files only (max 2MB)
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={() => window.open(URL.createObjectURL(selectedFile), '_blank')}
                              className="text-blue-600 hover:text-blue-800 font-medium underline"
                            >
                              {selectedFile.name}
                            </button>
                            <p className="text-xs text-gray-500 mt-1">Click filename to preview</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                            }}
                            className="mt-2 text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove file
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between space-x-4">
                    <button
                      type="button"
                      onClick={() => navigate('/student-dashboard')}
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting...' : 'Send Request'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
};

export default ApplyNOC;