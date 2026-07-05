import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { UserCog } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { courseOptions, courseToDepartments } from '../constants/departments';
import './Dashboard.css';

const EditFaculty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [avatar, setAvatar] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm();

  const course = watch('course');

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

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const { data } = await axios.get(`http://localhost:3001/faculty/${id}`);
        if (data.success && data.data) {
          reset(data.data);
          // Set the selectedCourse state when data is loaded
          if (data.data.course) {
            setSelectedCourse(data.data.course);
          }
        } else {
          toast.error('Invalid faculty data');
        }
      } catch (err) {
        toast.error('❌ Failed to fetch faculty');
      }
    };
    fetchFaculty();
  }, [id, reset]);

  // Update selectedCourse when course changes
  useEffect(() => {
    if (course) {
      setSelectedCourse(course);
    }
  }, [course]);

  const handleAvatarChange = (e) => {
    setAvatar(e.target.files[0]);
  };

  const handleCourseChange = (e) => {
    setSelectedCourse(e.target.value);
    setValue('department', ''); // Reset department when course changes
  };

  const onSubmit = async (formData) => {
    try {
      const form = new FormData();
      for (const key in formData) {
        form.append(key, formData[key]);
      }
      if (avatar) {
        form.append('avatar', avatar);
      }

      await axios.put(`http://localhost:3001/faculty/update/${id}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('✅ Faculty updated successfully');
      navigate('/admin/faculty');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '❌ Failed to update faculty';
      toast.error(msg);
    }
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
    <PortalLayout role="admin" title="Edit Faculty" user={profileData || user}>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Edit Faculty"
          subtitle="Update this faculty member's details"
          icon={UserCog}
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
                  type="tel"
                  placeholder="Faculty Phone"
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
                  onChange={handleCourseChange}
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
                  disabled={!selectedCourse}
                >
                  <option value="">Select Department</option>
                  {selectedCourse && courseToDepartments[selectedCourse]?.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
                {errors.department && <p className="error-text">{errors.department.message}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="avatar" className="block text-sm font-medium text-foreground">
                  Upload New Profile Image (optional)
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Faculty'}
                </Button>
              </div>
            </form>
        </div>
        </GlassPanel>
      </div>
    </PortalLayout>
  );
};

export default EditFaculty;
