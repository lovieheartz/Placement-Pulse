import { useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCircle, Pencil } from 'lucide-react';
import axios from 'axios';
import { resolveFileUrl } from '../lib/api';
import { API_BASE } from '../config/api';
import './Dashboard.css';

const HODProfile = () => {
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [avatarFile, setAvatarFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['hodProfile'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/hod/profile`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
      });
      return data.data;
    },
    enabled: !!user,
    onSuccess: (data) => {
      setValue('name', data.name);
      setValue('email', data.email);
      setValue('phone', data.phone);
    },
  });

  const { mutate: updateProfileMutation, isPending: isUpdating } = useMutation({
    mutationFn: async (formData) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.put(
        `${API_BASE}/hod/profile`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries(['hodProfile']);
      setIsEditing(false);
    },
    onError: (err) => {
      const errorMessage = err.response?.data?.message || 'Failed to update profile';
      toast.error(errorMessage);
    },
  });

  const { mutate: uploadAvatarMutation, isPending: isUploadingAvatar } = useMutation({
    mutationFn: async (formData) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.post(
        `${API_BASE}/hod/upload-avatar`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      toast.success('Avatar updated successfully!');
      queryClient.invalidateQueries(['hodProfile']);
      setAvatarFile(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to upload avatar');
    },
  });

  const onSubmit = (data) => {
    const payload = {
      name: data.name,
      email: data.email,
      phone: data.phone,
    };

    updateProfileMutation(payload);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
    }
  };

  const handleAvatarUpload = () => {
    if (avatarFile) {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      uploadAvatarMutation(formData);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-5">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">You are not logged in</h1>
        <p className="text-lg text-gray-600 mb-6">Please login to access your profile.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading profile data...</div>
      </div>
    );
  }

  return (
    <PortalLayout role="hod" title="My Profile" user={profileData || user}>
        <div className="w-full mx-auto max-w-4xl">
          <GlassPanel className="w-full">
            <PageHeader
              title="HOD Profile"
              subtitle="Manage your account details"
              icon={UserCircle}
              actions={
                !isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>
                    <Pencil className="size-4" /> Edit Profile
                  </Button>
                ) : null
              }
            />

            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-8">
              {profileData?.avatar ? (
                <img
                  src={resolveFileUrl(profileData.avatar)}
                  alt="Profile Avatar"
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary/20 shadow-md"
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center bg-primary/10 rounded-full text-4xl text-primary font-bold ring-1 ring-primary/15">
                  {profileData?.name?.charAt(0).toUpperCase() || 'H'}
                </div>
              )}

              <p className="mt-3 text-lg font-semibold text-foreground">{profileData?.name}</p>
              <Badge variant="default" className="mt-1">Head of Department</Badge>

              <div className="mt-4 w-full max-w-md">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Update Avatar
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {avatarFile && (
                  <div className="mt-2">
                    <p className="text-sm text-success mb-2">New file selected: {avatarFile.name}</p>
                    <Button
                      variant="success"
                      onClick={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Form */}
            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                  <input
                    type="text"
                    {...register('name', { required: 'Name is required' })}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {errors.name && <p className="error-text">{errors.name.message}</p>}
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <input
                    type="email"
                    {...register('email', { required: 'Email is required' })}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {errors.email && <p className="error-text">{errors.email.message}</p>}
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                  <input
                    type="tel"
                    {...register('phone', {
                      required: 'Phone is required',
                      pattern: { value: /^\+\d{10,15}$/, message: 'Phone must be in format +1234567890' }
                    })}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {errors.phone && <p className="error-text">{errors.phone.message}</p>}
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Course (Read-only - Contact Admin to change)
                  </label>
                  <input
                    type="text"
                    value={profileData?.course || ''}
                    disabled
                    className="w-full rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground shadow-sm cursor-not-allowed"
                  />
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Department (Read-only - Contact Admin to change)
                  </label>
                  <input
                    type="text"
                    value={profileData?.department || ''}
                    disabled
                    className="w-full rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground shadow-sm cursor-not-allowed"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? 'Updating...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="text-lg font-semibold text-foreground">{profileData?.name}</p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-lg font-semibold text-foreground">{profileData?.email}</p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-lg font-semibold text-foreground">{profileData?.phone}</p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Course</p>
                    <p className="text-lg font-semibold text-foreground">{profileData?.course || 'N/A'}</p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="text-lg font-semibold text-foreground">{profileData?.department || 'N/A'}</p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="text-lg font-semibold text-foreground">Head of Department</p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Account Created</p>
                    <p className="text-lg font-semibold text-foreground">
                      {new Date(profileData?.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </GlassPanel>
        </div>
    </PortalLayout>
  );
};

export default HODProfile;
