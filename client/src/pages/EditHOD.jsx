import { useContext, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { UserCog } from 'lucide-react';
import axios from 'axios';
import { courseOptions, courseToDepartments } from '../constants/departments';
import { resolveFileUrl } from '../lib/api';
import './Dashboard.css';

const EditHOD = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [avatarFile, setAvatarFile] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
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

  const { data: hodData, isLoading } = useQuery({
    queryKey: ['hod', id],
    queryFn: async () => {
      const { data } = await axios.get(`http://localhost:3001/admin/hod/${id}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('authToken')}` },
      });
      return data.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (hodData) {
      setValue('name', hodData.name);
      setValue('email', hodData.email);
      setValue('phone', hodData.phone);
      setValue('course', hodData.course);
      setValue('department', hodData.department);
      // Set selectedCourse state when data is loaded
      if (hodData.course) {
        setSelectedCourse(hodData.course);
      }
    }
  }, [hodData, setValue]);

  // Update selectedCourse when course changes
  useEffect(() => {
    if (course) {
      setSelectedCourse(course);
    }
  }, [course]);

  const handleCourseChange = (e) => {
    setSelectedCourse(e.target.value);
    setValue('department', ''); // Reset department when course changes
  };

  const { mutate: updateHODMutation, isPending: isUpdating } = useMutation({
    mutationFn: async (formData) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.put(
        `http://localhost:3001/admin/hod/${id}`,
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
    onSuccess: (data) => {
      toast.success('HOD updated successfully!');
      queryClient.invalidateQueries(['hods']);
      queryClient.invalidateQueries(['hod', id]);
      setTimeout(() => {
        navigate('/admin/hods');
      }, 2000);
    },
    onError: (err) => {
      const errorMessage = err.response?.data?.message || 'Failed to update HOD';
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('phone', data.phone);
    formData.append('course', data.course);
    formData.append('department', data.department);

    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    updateHODMutation(formData);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading HOD data...</div>
      </div>
    );
  }

  return (
    <PortalLayout role="admin" title="Edit HOD" user={profileData || user}>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Edit HOD"
          subtitle="Update this Head of Department's details"
          icon={UserCog}
        />
        <GlassPanel>
        <div className="form-wrapper">
            <form onSubmit={handleSubmit(onSubmit)} className="faculty-form">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="HOD Name"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && <p className="error-text">{errors.name.message}</p>}
              </div>

              <div className="form-group">
                <input
                  type="email"
                  placeholder="HOD Email"
                  {...register('email', { required: 'Email is required' })}
                />
                {errors.email && <p className="error-text">{errors.email.message}</p>}
              </div>

              <div className="form-group">
                <input
                  type="tel"
                  placeholder="HOD Phone (+1234567890)"
                  {...register('phone', {
                    required: 'Phone is required',
                    pattern: { value: /^\+\d{10,15}$/, message: 'Phone must be in format +1234567890' }
                  })}
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  Update Avatar (Optional)
                </label>
                {hodData?.avatar && !avatarFile && (
                  <div className="mb-2">
                    <img
                      src={resolveFileUrl(hodData.avatar)}
                      alt="Current Avatar"
                      className="w-20 h-20 rounded-full object-cover border"
                    />
                    <p className="text-sm text-muted-foreground mt-1">Current Avatar</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {avatarFile && (
                  <p className="text-sm text-green-600 mt-1">New file selected: {avatarFile.name}</p>
                )}
              </div>

              <div className="flex justify-between">
                <Button
                  onClick={() => navigate('/admin/hods')}
                  variant="outline"
                  type="button"
                >
                  ← Back to HOD List
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update HOD'}
                </Button>
              </div>
            </form>
        </div>
        </GlassPanel>
      </div>
    </PortalLayout>
  );
};

export default EditHOD;
