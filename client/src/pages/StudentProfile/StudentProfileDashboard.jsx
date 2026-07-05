import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { UserCircle, Pencil } from 'lucide-react';
import axios from 'axios';
import { resolveFileUrl } from '../../lib/api';

const StudentProfileDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get('http://localhost:3001/student/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data.data;
    },
    enabled: !!user,
  });

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
    <PortalLayout role="student" title="My Profile" user={profileData}>
          <div className="max-w-4xl mx-auto">
            <PageHeader
              title="My Profile"
              subtitle="Overview of your placement profile"
              icon={UserCircle}
            />
            <GlassPanel>
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
                            {profileData?.avatar || profileData?.profilePicture ? (
                              <img
                                src={resolveFileUrl(profileData?.avatar || profileData?.profilePicture)}
                                alt="Profile"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  const parent = e.target.parentElement;
                                  if (parent) {
                                    const fallback = document.createElement('div');
                                    fallback.className = 'w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center';
                                    fallback.innerHTML = `<span class="text-2xl font-bold text-white">${
                                      profileData?.firstName && profileData?.lastName
                                        ? `${profileData.firstName.charAt(0)}${profileData.lastName.charAt(0)}`
                                        : profileData?.firstName?.charAt(0) || user.name?.charAt(0) || 'S'
                                    }</span>`;
                                    parent.appendChild(fallback);
                                  }
                                }}
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
                        <div className="flex-1">
                          <h1 className="text-2xl font-bold text-foreground">
                            {profileData?.firstName && profileData?.lastName
                              ? `${profileData.firstName} ${profileData.lastName}`
                              : profileData?.fullName || user.name
                            }
                          </h1>
                          <p className="text-muted-foreground text-lg mb-3">
                            {(profileData?.course || user.course)} - {(profileData?.branch || profileData?.stream || user.branch)}
                          </p>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-3">
                            <Button
                              variant="gradient"
                              size="sm"
                              onClick={() => navigate('/student/profile/edit')}
                            >
                              <Pencil className="size-4" />
                              Update Profile
                            </Button>
                            <div className="flex items-center gap-3 bg-muted/40 px-4 py-2 rounded-lg border border-border">
                              <div className="w-24 bg-gray-200 rounded-full h-2.5 shadow-inner">
                                <div
                                  className={`h-2.5 rounded-full transition-all duration-300 ${getProgressColor(profileData?.completionPercentage || 0)}`}
                                  style={{ width: `${profileData?.completionPercentage || 0}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm font-bold whitespace-nowrap ${getCompletionColor(profileData?.completionPercentage || 0)}`}>
                                {profileData?.completionPercentage || 0}% Complete
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Progress Section */}
                    <div className="mb-8 bg-muted/40 rounded-xl p-4 border border-border">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-foreground">Profile Completion Status</span>
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
                      <p className="text-xs text-muted-foreground mt-2">
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
                      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                        <p className="text-muted-foreground mb-3">
                          {profileData?.completionPercentage >= 80
                            ? '🎉 Great! Your profile is almost complete. Keep it updated for better placement opportunities.'
                            : profileData?.completionPercentage >= 50
                            ? '📝 You\'re halfway there! Complete your profile to increase your chances of getting placed.'
                            : '⚠️ Your profile needs attention. Complete it to unlock all placement opportunities.'
                          }
                        </p>
                        <Button
                          variant="gradient"
                          onClick={() => navigate('/student/profile/edit')}
                        >
                          {profileData?.completionPercentage >= 80 ? 'Review Profile' : 'Complete Your Profile'}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
            </GlassPanel>
          </div>
    </PortalLayout>
  );
};

export default StudentProfileDashboard;