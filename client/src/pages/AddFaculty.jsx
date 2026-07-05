import React, { useContext, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import './Dashboard.css';
import { courseOptions, courseToDepartments } from '../constants/departments';

const AddFaculty = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
  } = useForm();

  const course = watch('course');
  const availableDepartments = course ? courseToDepartments[course] || [] : [];

  // Get queryClient for cache invalidation
  const queryClient = useQueryClient();

  const {
    data: profileData,
  } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: async () => {
      const { data } = await axios.get('http://localhost:3001/admin/profile', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
      });
      return data.data;
    },
    enabled: !!user,
  });

  const { mutate, isPending: isCreating } = useMutation({
    mutationFn: async (facultyData) => {
      const token = sessionStorage.getItem('authToken');
      
      // First get the admin profile to get the ID
      const adminProfile = await axios.get('http://localhost:3001/admin/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const adminId = adminProfile.data.data._id;
      
      const formData = new FormData();
      for (const key in facultyData) {
        formData.append(key, facultyData[key]);
      }
      formData.append('role', 'faculty');
      formData.append('createdBy', adminId);
      
      if (avatar) {
        formData.append('avatar', avatar);
      }

      const res = await axios.post(
        'http://localhost:3001/faculty/create-faculty',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
    onSuccess: (data) => {
      // Show success toast with email notification info
      toast.success(
        <div>
          <p>{data.message || 'Faculty created successfully!'}</p>
          <p style={{ fontSize: '0.9em', marginTop: '5px' }}>
            A welcome email has been sent to the faculty with login credentials.
          </p>
        </div>,
        { autoClose: 3000 }
      );
      
      // Reset form
      reset();
      setAvatar(null);
      
      // Invalidate and refetch faculties query to update the list
      queryClient.invalidateQueries(['faculties']);
      
      // Navigate to faculty list after short delay
      setTimeout(() => {
        navigate('/admin/faculty');
      }, 3000);
    },
    onError: (err) => {
      const errorMessage = err.response?.data?.message || 'Failed to create faculty';
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data) => {
    mutate(data);
  };

  const handleAvatarChange = (e) => {
    setAvatar(e.target.files[0]);
  };

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-5 text-center">
        <h1 className="mb-2 text-3xl font-bold text-foreground">You are not logged in</h1>
        <p className="text-lg text-muted-foreground">Please login to access your dashboard.</p>
      </div>
    );
  }

  return (
    <PortalLayout role="admin" title="Add Faculty" user={profileData || user}>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Create Faculty"
          subtitle="Add a new faculty member to the placement portal"
          icon={UserPlus}
        />
        <GlassPanel>
        <div className="form-wrapper">
            <form onSubmit={handleSubmit(onSubmit)} className="faculty-form" encType="multipart/form-data">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Faculty Name"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && <p className="error-text">{errors.name.message}</p>}
              </div>

              <div className="form-group">
                <input
                  type="email"
                  placeholder="Faculty Email"
                  {...register('email', { required: 'Email is required' })}
                />
                {errors.email && <p className="error-text">{errors.email.message}</p>}
              </div>

              <div className="form-group">
                <input
                  type="password"
                  placeholder="Faculty Password"
                  autoComplete="new-password"
                  {...register('password', { required: 'Password is required' })}
                />
                {errors.password && <p className="error-text">{errors.password.message}</p>}
              </div>

              <div className="form-group">
                <input
                  type="tel"
                  placeholder="Faculty Phone (+1234567890)"
                  {...register('phone', { required: 'Phone is required' })}
                />
                {errors.phone && <p className="error-text">{errors.phone.message}</p>}
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Course *
                </label>
                <select
                  {...register('course', { required: 'Course is required' })}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(e) => setValue('department', '')}
                >
                  <option value="">Select Course</option>
                  {Object.keys(courseOptions).map((courseKey) => (
                    <option key={courseKey} value={courseKey}>
                      {courseKey}
                    </option>
                  ))}
                </select>
                {errors.course && <p className="error-text">{errors.course.message}</p>}
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Department *
                </label>
                <select
                  {...register('department', { required: 'Department is required' })}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!course}
                >
                  <option value="">Select Department</option>
                  {availableDepartments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                {errors.department && <p className="error-text">{errors.department.message}</p>}
              </div>

              {/* Avatar Upload Field */}
              <div className="form-group">
                <label htmlFor="avatar" className="block text-sm font-medium text-foreground">
                  Upload Profile Image
                </label>
                <input
                  type="file"
                  id="avatar"
                  name="avatar"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-between">
                <Button
                  onClick={() => navigate('/admin/faculty')}
                  variant="outline"
                  type="button"
                >
                  ← Back to Faculty List
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Faculty'}
                </Button>
              </div>
            </form>
        </div>
        </GlassPanel>
      </div>
    </PortalLayout>
  );
};

export default AddFaculty;
