import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/AuthContext';
import Sidebar from '../../components/StudentSidebar';
import Header from '../../components/StudentHeader';
import Footer from '../../components/StudentFooter';
import { FiCamera, FiUser } from 'react-icons/fi';
import axios from 'axios';

const StudentProfileEdit = () => {
  const { user, logout, updateUser, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Refresh user data on component mount to ensure we have latest avatar
  useEffect(() => {
    if (user && refreshUser) {
      refreshUser();
    }
  }, []);

  const { register, handleSubmit, reset, watch, setValue } = useForm();

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get('http://localhost:3001/student-profile/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data.data;
    },
    enabled: !!user,
    onSuccess: (data) => {
      reset(data);
    }
  });

  // Reset form when profileData changes
  useEffect(() => {
    if (profileData) {
      reset(profileData);
    }
  }, [profileData, reset]);

  const updateProfileMutation = useMutation({
    mutationFn: async (formData) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.put('http://localhost:3001/student-profile/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries(['studentProfile']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file) => {
      const token = sessionStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('avatar', file);
      
      const { data } = await axios.post('http://localhost:3001/auth/upload-avatar', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success('Profile picture updated successfully!');
      
      // Update user data in AuthContext
      updateUser({ avatar: data.avatar });
      
      queryClient.invalidateQueries(['studentProfile']);
      // Remove window.location.reload() as it's no longer needed
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload profile picture');
    }
  });

  const addSubjectMutation = useMutation({
    mutationFn: async ({ classType, subject }) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.post('http://localhost:3001/student-profile/profile/subject', 
        { classType, subject }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Subject added successfully!');
      queryClient.invalidateQueries(['studentProfile']);
    }
  });

  const [showSubjectForm, setShowSubjectForm] = useState({ classX: false, classXII: false });
  const [subjectForm, setSubjectForm] = useState({ name: '', marksScored: '', totalMarks: '' });

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const onSubmit = (data) => {
    updateProfileMutation.mutate(data);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size should be less than 5MB');
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPG, JPEG and PNG files are allowed');
        return;
      }
      
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAvatar = () => {
    if (profileImage) {
      uploadAvatarMutation.mutate(profileImage);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getProfilePicture = () => {
    if (imagePreview) return imagePreview;
    
    // Check user avatar first
    if (user?.avatar) {
      const avatarUrl = user.avatar.startsWith('http') ? user.avatar : `http://localhost:3001${user.avatar}`;
      console.log('Using user avatar:', avatarUrl);
      return avatarUrl;
    }
    
    // Check profile data avatar
    if (profileData?.avatar) {
      const avatarUrl = profileData.avatar.startsWith('http') ? profileData.avatar : `http://localhost:3001${profileData.avatar}`;
      console.log('Using profile data avatar:', avatarUrl);
      return avatarUrl;
    }
    
    console.log('No avatar found, user:', user, 'profileData:', profileData);
    return null;
  };

  const getInitials = () => {
    if (profileData?.firstName && profileData?.lastName) {
      return `${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}`;
    }
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return 'S';
  };

  const handleAddSubject = (classType) => {
    if (subjectForm.name && subjectForm.marksScored && subjectForm.totalMarks) {
      addSubjectMutation.mutate({
        classType,
        subject: {
          name: subjectForm.name,
          marksScored: parseInt(subjectForm.marksScored),
          totalMarks: parseInt(subjectForm.totalMarks)
        }
      });
      setSubjectForm({ name: '', marksScored: '', totalMarks: '' });
      setShowSubjectForm({ ...showSubjectForm, [classType]: false });
    }
  };

  const toggleSubjectForm = (classType) => {
    setShowSubjectForm({ ...showSubjectForm, [classType]: !showSubjectForm[classType] });
    setSubjectForm({ name: '', marksScored: '', totalMarks: '' });
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'academic', label: 'Academic' },
    { id: 'family', label: 'Family' },
    { id: 'address', label: 'Address' },
    { id: 'skills', label: 'Skills' }
  ];

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
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-blue-100/50">
              <div className="p-6">
                {/* Profile Header with Picture */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 -m-6 mb-6 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                          {getProfilePicture() ? (
                            <img
                              src={getProfilePicture()}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                              <span className="text-2xl font-bold text-white">
                                {getInitials()}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={triggerFileInput}
                          className="absolute bottom-0 right-0 bg-white text-blue-600 p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                        >
                          <FiCamera className="w-4 h-4" />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold">
                          {profileData?.firstName && profileData?.lastName 
                            ? `${profileData.firstName} ${profileData.lastName}`
                            : user?.name || 'Student Name'
                          }
                        </h1>
                        <p className="text-blue-100 text-lg">
                          {user?.course || 'Course'} - {user?.branch || 'Branch'}
                        </p>
                        <div className="flex items-center mt-2 space-x-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-full bg-blue-500 rounded-full h-2 min-w-[100px]">
                              <div
                                className="bg-white h-2 rounded-full transition-all duration-300"
                                style={{ width: `${profileData?.completionPercentage || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {profileData?.completionPercentage || 0}% Complete
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {profileImage && (
                      <button
                        type="button"
                        onClick={handleUploadAvatar}
                        disabled={uploadAvatarMutation.isPending}
                        className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                      >
                        {uploadAvatarMutation.isPending ? 'Uploading...' : 'Upload Photo'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-8">
                  <nav className="flex space-x-1 overflow-x-auto">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-3 px-6 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600 bg-blue-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Basic Info Tab */}
                  {activeTab === 'basic' && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                        <div className="flex items-center mb-4">
                          <FiUser className="w-5 h-5 text-blue-600 mr-2" />
                          <h3 className="text-lg font-semibold text-gray-800">Personal Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">First Name *</label>
                            <input
                              {...register('firstName')}
                              placeholder="Enter your first name"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                            <input
                              {...register('lastName')}
                              placeholder="Enter your last name"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Gender *</label>
                            <select
                              {...register('gender')}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                            <input
                              type="date"
                              {...register('dateOfBirth')}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Primary Mobile *</label>
                            <input
                              {...register('primaryMobile')}
                              placeholder="Enter your mobile number"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Blood Group</label>
                            <select
                              {...register('bloodGroup')}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                              <option value="">Select Blood Group</option>
                              <option value="A+">A+</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B-">B-</option>
                              <option value="AB+">AB+</option>
                              <option value="AB-">AB-</option>
                              <option value="O+">O+</option>
                              <option value="O-">O-</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Academic Tab */}
                  {activeTab === 'academic' && (
                    <div className="space-y-8">
                      {/* Class X */}
                      <div className="border border-gray-200 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-semibold text-gray-800">Class X Details</h3>
                          <button
                            type="button"
                            onClick={() => toggleSubjectForm('classX')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                          >
                            + Add Subject
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <input
                            {...register('classX.examName')}
                            placeholder="Exam Name (e.g., CBSE)"
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            {...register('classX.boardName')}
                            placeholder="Board Name"
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="number"
                            {...register('classX.yearOfPassing')}
                            placeholder="Year of Passing"
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Add Subject Form */}
                        {showSubjectForm.classX && (
                          <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                            <h4 className="font-medium text-blue-800 mb-3">Add New Subject</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <input
                                type="text"
                                placeholder="Subject Name"
                                value={subjectForm.name}
                                onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})}
                                className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                placeholder="Marks Scored"
                                value={subjectForm.marksScored}
                                onChange={(e) => setSubjectForm({...subjectForm, marksScored: e.target.value})}
                                className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                placeholder="Total Marks"
                                value={subjectForm.totalMarks}
                                onChange={(e) => setSubjectForm({...subjectForm, totalMarks: e.target.value})}
                                className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                type="button"
                                onClick={() => handleAddSubject('classX')}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                              >
                                Add Subject
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleSubjectForm('classX')}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Subjects Display */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-700 mb-2">Subjects:</h4>
                          {profileData?.classX?.subjects?.length > 0 ? (
                            profileData.classX.subjects.map((subject, index) => (
                              <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-medium text-gray-800">{subject.name}</span>
                                    <div className="text-sm text-gray-600 mt-1">
                                      Marks: {subject.marksScored}/{subject.totalMarks} 
                                      <span className="ml-2 text-blue-600 font-medium">
                                        ({((subject.marksScored / subject.totalMarks) * 100).toFixed(1)}%)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm italic">No subjects added yet</p>
                          )}
                        </div>
                      </div>

                      {/* Class XII */}
                      <div className="border border-gray-200 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-semibold text-gray-800">Class XII Details</h3>
                          <button
                            type="button"
                            onClick={() => toggleSubjectForm('classXII')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                          >
                            + Add Subject
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <input
                            {...register('classXII.examName')}
                            placeholder="Exam Name (e.g., CBSE)"
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            {...register('classXII.boardName')}
                            placeholder="Board Name"
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="number"
                            {...register('classXII.yearOfPassing')}
                            placeholder="Year of Passing"
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Add Subject Form */}
                        {showSubjectForm.classXII && (
                          <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                            <h4 className="font-medium text-blue-800 mb-3">Add New Subject</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <input
                                type="text"
                                placeholder="Subject Name"
                                value={subjectForm.name}
                                onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})}
                                className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                placeholder="Marks Scored"
                                value={subjectForm.marksScored}
                                onChange={(e) => setSubjectForm({...subjectForm, marksScored: e.target.value})}
                                className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                placeholder="Total Marks"
                                value={subjectForm.totalMarks}
                                onChange={(e) => setSubjectForm({...subjectForm, totalMarks: e.target.value})}
                                className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                type="button"
                                onClick={() => handleAddSubject('classXII')}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                              >
                                Add Subject
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleSubjectForm('classXII')}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Subjects Display */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-700 mb-2">Subjects:</h4>
                          {profileData?.classXII?.subjects?.length > 0 ? (
                            profileData.classXII.subjects.map((subject, index) => (
                              <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-medium text-gray-800">{subject.name}</span>
                                    <div className="text-sm text-gray-600 mt-1">
                                      Marks: {subject.marksScored}/{subject.totalMarks} 
                                      <span className="ml-2 text-blue-600 font-medium">
                                        ({((subject.marksScored / subject.totalMarks) * 100).toFixed(1)}%)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm italic">No subjects added yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Family Tab */}
                  {activeTab === 'family' && (
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-6">Family Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Father's Name *</label>
                          <input
                            {...register('father.name')}
                            placeholder="Enter father's full name"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Father's Occupation</label>
                          <input
                            {...register('father.occupation')}
                            placeholder="Enter father's occupation"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Mother's Name *</label>
                          <input
                            {...register('mother.name')}
                            placeholder="Enter mother's full name"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Mother's Occupation</label>
                          <input
                            {...register('mother.occupation')}
                            placeholder="Enter mother's occupation"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Address Tab */}
                  {activeTab === 'address' && (
                    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-6">Address Information</h3>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Full Address *</label>
                          <textarea
                            {...register('permanentAddress.address')}
                            placeholder="Enter your complete permanent address with house number, street, locality"
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">District *</label>
                            <input
                              {...register('permanentAddress.district')}
                              placeholder="Enter district"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">State *</label>
                            <input
                              {...register('permanentAddress.state')}
                              placeholder="Enter state"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">PIN Code</label>
                            <input
                              {...register('permanentAddress.pinCode')}
                              placeholder="Enter PIN code"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Skills Tab */}
                  {activeTab === 'skills' && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Programming Languages</h3>
                        <textarea
                          {...register('computerLanguages')}
                          placeholder="e.g., Java, Python, JavaScript, C++, HTML/CSS, React, Node.js"
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                        />
                        <p className="text-sm text-gray-500 mt-2">💡 List programming languages and technologies you know, separated by commas</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Technical Skills & Strengths</h3>
                        <textarea
                          {...register('technicalStrength')}
                          placeholder="e.g., Full Stack Web Development, Database Design & Management, Machine Learning & AI, Mobile App Development, Cloud Computing (AWS/Azure), DevOps, UI/UX Design"
                          rows={5}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                        />
                        <p className="text-sm text-gray-500 mt-2">🚀 Describe your technical skills, frameworks, tools, and areas of expertise in detail</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Certifications & Achievements</h3>
                        <textarea
                          {...register('academicCertifications')}
                          placeholder="e.g., AWS Certified Solutions Architect, Google Cloud Professional, Microsoft Azure Fundamentals, Oracle Java Certification, Coursera Machine Learning Certificate, Hackathon Winner - Smart India Hackathon 2023"
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all resize-none"
                        />
                        <p className="text-sm text-gray-500 mt-2">🏆 List any certifications, awards, competitions won, or notable achievements</p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Projects & Experience</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Project Title</label>
                            <input
                              {...register('projectTitle')}
                              placeholder="e.g., E-commerce Web Application, AI Chatbot, Mobile Banking App"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Work Experience</label>
                            <textarea
                              {...register('workExperience')}
                              placeholder="Describe any internships, part-time jobs, or professional experience you have"
                              rows={3}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex justify-between items-center pt-8 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => navigate('/student/profile')}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center space-x-2"
                    >
                      <span>← Back to Profile</span>
                    </button>
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => reset()}
                        className="px-6 py-3 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
                      >
                        Reset Form
                      </button>
                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all font-medium shadow-lg"
                      >
                        {updateProfileMutation.isPending ? (
                          <span className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            <span>Saving...</span>
                          </span>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
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

export default StudentProfileEdit;