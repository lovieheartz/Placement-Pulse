import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { UserPlus, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../config/api';
import './Dashboard.css';

const AddFacultyByHOD = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [avatarFile, setAvatarFile] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Fetch HOD profile to get course and department
  const { data: hodProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['hodProfile'],
    queryFn: async () => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.get(`${API_BASE}/hod/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return data.data;
    }
  });
  const { mutate: createFacultyMutation, isPending: isCreating } = useMutation({
    mutationFn: async (formData) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.post(
        `${API_BASE}/hod/create-faculty`,
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
      toast.success('Faculty created successfully!');
      reset();
      setAvatarFile(null);
      queryClient.invalidateQueries(['hodFaculties']);
      setTimeout(() => {
        navigate('/hod/faculties');
      }, 2000);
    },
    onError: (err) => {
      const errorMessage = err.response?.data?.message || 'Failed to create faculty';
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('phone', data.phone);

    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    createFacultyMutation(formData);
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

  return (
    <PortalLayout role="hod" title="Add Faculty" user={hodProfile || user}>
        <GlassPanel className="form-container mx-auto w-full max-w-2xl">
          <div className="form-wrapper">
            <PageHeader
              title="Add Faculty to Department"
              subtitle="Create a new faculty account for your department"
              icon={UserPlus}
            />

            <form onSubmit={handleSubmit(onSubmit)} className="faculty-form">
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
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                />
                {errors.password && <p className="error-text">{errors.password.message}</p>}
              </div>

              <div className="form-group">
                <input
                  type="tel"
                  placeholder="Faculty Phone (+1234567890)"
                  {...register('phone', {
                    required: 'Phone is required',
                    pattern: { value: /^\+\d{10,15}$/, message: 'Phone must be in format +1234567890' }
                  })}
                />
                {errors.phone && <p className="error-text">{errors.phone.message}</p>}
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Course (Auto-filled from your HOD profile)
                </label>
                <input
                  type="text"
                  value={hodProfile?.course || 'Loading...'}
                  disabled
                  className="w-full rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground shadow-sm cursor-not-allowed"
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Department (Auto-filled from your HOD profile)
                </label>
                <input
                  type="text"
                  value={hodProfile?.department || 'Loading...'}
                  disabled
                  className="w-full rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground shadow-sm cursor-not-allowed"
                />
              </div>

              <div className="form-group">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Avatar (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {avatarFile && (
                  <p className="text-sm text-success mt-1">Selected: {avatarFile.name}</p>
                )}
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => navigate('/hod/faculties')}
                  type="button"
                >
                  <ArrowLeft className="size-4" /> Back to Faculty List
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Faculty'}
                </Button>
              </div>
            </form>
          </div>
        </GlassPanel>
    </PortalLayout>
  );
};

export default AddFacultyByHOD;
