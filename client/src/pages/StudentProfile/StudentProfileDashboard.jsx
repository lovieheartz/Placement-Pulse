import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../../context/AuthContext';
import Sidebar from '../../components/StudentSidebar';
import Header from '../../components/StudentHeader';
import Footer from '../../components/StudentFooter';
import axios from 'axios';

const StudentProfileDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
  });

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getCompletionColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
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
              <div className="p-6">
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Profile Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg">
                            {user?.avatar ? (
                              <img
                                src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:3001${user.avatar}`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">
                                  {profileData?.firstName && profileData?.lastName 
                                    ? `${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}`
                                    : profileData?.firstName?.charAt(0) || user.name?.charAt(0) || 'S'
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Progress Ring */}
                          <div className="absolute -bottom-1 -right-1">
                            <div className="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-gray-100">
                              <span className={`text-xs font-bold ${getCompletionColor(profileData?.completionPercentage || 0)}`}>
                                {profileData?.completionPercentage || 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold text-gray-800">
                            {profileData?.firstName && profileData?.lastName 
                              ? `${profileData.firstName} ${profileData.lastName}`
                              : profileData?.fullName || user.name
                            }
                          </h1>
                          <p className="text-gray-600 text-lg">
                            {(profileData?.course || user.course)} - {(profileData?.stream || user.branch)}
                          </p>
                          <div className="flex items-center space-x-4 mt-3">
                            <button
                              onClick={() => navigate('/student/profile/edit')}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                            >
                              Update Profile
                            </button>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(profileData?.completionPercentage || 0)}`}
                                  style={{ width: `${profileData?.completionPercentage || 0}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm font-medium ${getCompletionColor(profileData?.completionPercentage || 0)}`}>
                                {profileData?.completionPercentage || 0}% Complete
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Progress Section */}
                    <div className="mb-8 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-gray-700">Profile Completion Status</span>
                        <span className={`text-lg font-bold ${getCompletionColor(profileData?.completionPercentage || 0)}`}>
                          {profileData?.completionPercentage || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(profileData?.completionPercentage || 0)} shadow-sm`}
                          style={{ width: `${profileData?.completionPercentage || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        {profileData?.completionPercentage >= 80 
                          ? 'Excellent! Your profile is ready for placements.'
                          : profileData?.completionPercentage >= 50
                          ? 'Good progress! Complete remaining sections.'
                          : 'Get started by filling out your basic information.'
                        }
                      </p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                      <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                        <h3 className="font-semibold text-blue-800 mb-2">Basic Info</h3>
                        <p className="text-sm text-blue-600">
                          {profileData?.firstName && profileData?.lastName ? 'Complete' : 'Incomplete'}
                        </p>
                      </div>
                      <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                        <h3 className="font-semibold text-green-800 mb-2">Academic</h3>
                        <p className="text-sm text-green-600">
                          {profileData?.classX?.examName && profileData?.classXII?.examName ? 'Complete' : 'Incomplete'}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
                        <h3 className="font-semibold text-purple-800 mb-2">Family</h3>
                        <p className="text-sm text-purple-600">
                          {profileData?.father?.name && profileData?.mother?.name ? 'Complete' : 'Incomplete'}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-6 rounded-lg border border-orange-100">
                        <h3 className="font-semibold text-orange-800 mb-2">Address</h3>
                        <p className="text-sm text-orange-600">
                          {profileData?.permanentAddress?.address ? 'Complete' : 'Incomplete'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="text-center space-y-4">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-gray-700 mb-3">
                          {profileData?.completionPercentage >= 80 
                            ? '🎉 Great! Your profile is almost complete. Keep it updated for better placement opportunities.'
                            : profileData?.completionPercentage >= 50
                            ? '📝 You\'re halfway there! Complete your profile to increase your chances of getting placed.'
                            : '⚠️ Your profile needs attention. Complete it to unlock all placement opportunities.'
                          }
                        </p>
                        <button
                          onClick={() => navigate('/student/profile/edit')}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-lg"
                        >
                          {profileData?.completionPercentage >= 80 ? 'Review Profile' : 'Complete Your Profile'}
                        </button>
                      </div>
                    </div>
                  </>
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

export default StudentProfileDashboard;