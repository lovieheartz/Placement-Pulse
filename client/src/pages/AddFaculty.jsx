import React, { useContext, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useForm } from 'react-hook-form';
import './Dashboard.css';

const AddFaculty = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [avatar, setAvatar] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

  // Get queryClient for cache invalidation
  const queryClient = useQueryClient();

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

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleAvatarChange = (e) => {
    setAvatar(e.target.files[0]);
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <h1 style={styles.heading}>You are not logged in</h1>
        <p style={styles.subheading}>Please login to access your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <div className="main">
        <Header
          user={user}
          toggleDropdown={toggleDropdown}
          isDropdownOpen={isDropdownOpen}
          handleLogout={handleLogout}
          navigate={navigate}
        />

        <div className="form-container">
          <div className="form-wrapper">
            <h2 className="form-heading">Create Faculty</h2>

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
                <input
                  type="text"
                  placeholder="Specialization"
                  {...register('specialization', { required: 'Specialization is required' })}
                />
                {errors.specialization && <p className="error-text">{errors.specialization.message}</p>}
              </div>

              {/* Avatar Upload Field */}
              <div className="form-group">
                <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">
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
                <button
                  onClick={() => navigate('/admin/faculty')}
                  className="text-blue-600 hover:text-blue-800 px-4 py-2"
                  type="button"
                >
                  ← Back to Faculty List
                </button>
                <button type="submit" className="submit-button" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f0f4f8',
    padding: '20px',
  },
  heading: {
    fontSize: '32px',
    color: '#333',
    marginBottom: '10px',
    textAlign: 'center',
  },
  subheading: {
    fontSize: '18px',
    color: '#666',
    marginBottom: '30px',
    textAlign: 'center',
  },
};

export default AddFaculty;
