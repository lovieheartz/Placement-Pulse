

import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import axios from 'axios';
import './Dashboard.css';

const AddAdmin = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);

  const { mutate: createAdminMutation, isPending: isCreating } = useMutation({
    mutationFn: async (adminData) => {
      const token = sessionStorage.getItem('authToken');
      const { data } = await axios.post(
        'http://localhost:3001/admin/create-admin-by-admin',
        adminData,
        {
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success('Admin created successfully!');
      reset();
      queryClient.invalidateQueries(['admins']);
      setTimeout(() => {
        navigate('/admin/admins');
      }, 2000);
    },
    onError: (err) => {
      const errorMessage = err.response?.data?.message || 'Failed to create admin';
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data) => {
    createAdminMutation(data);
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
            <h2 className="form-heading">Create Admin</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="faculty-form">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Admin Name"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && <p className="error-text">{errors.name.message}</p>}
              </div>

              <div className="form-group">
                <input
                  type="email"
                  placeholder="Admin Email"
                  {...register('email', { required: 'Email is required' })}
                />
                {errors.email && <p className="error-text">{errors.email.message}</p>}
              </div>

              <div className="form-group">
                <input
                  type="password"
                  placeholder="Admin Password"
                  autoComplete="new-password"
                  {...register('password', { required: 'Password is required' })}
                />
                {errors.password && <p className="error-text">{errors.password.message}</p>}
              </div>

              <div className="form-group">
                <input
                  type="tel"
                  placeholder="Admin Phone (+1234567890)"
                  {...register('phone', { required: 'Phone is required' })}
                />
                {errors.phone && <p className="error-text">{errors.phone.message}</p>}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => navigate('/admin/admins')}
                  className="text-blue-600 hover:text-blue-800 px-4 py-2"
                  type="button"
                >
                  ← Back to Admin List
                </button>
                <button type="submit" className="submit-button" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Admin'}
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

export default AddAdmin;