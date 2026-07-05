

import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel, PageHeader } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { ShieldPlus } from 'lucide-react';
import axios from 'axios';
import './Dashboard.css';

const AddAdmin = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

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

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-5 text-center">
        <h1 className="mb-2 text-3xl font-bold text-foreground">You are not logged in</h1>
        <p className="text-lg text-muted-foreground">Please login to access your dashboard.</p>
      </div>
    );
  }

  return (
    <PortalLayout role="admin" title="Add Admin">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Create Admin"
          subtitle="Add a new administrator account"
          icon={ShieldPlus}
        />
        <GlassPanel>
        <div className="form-wrapper">
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
                <Button
                  onClick={() => navigate('/admin/admins')}
                  variant="outline"
                  type="button"
                >
                  ← Back to Admin List
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Admin'}
                </Button>
              </div>
            </form>
        </div>
        </GlassPanel>
      </div>
    </PortalLayout>
  );
};

export default AddAdmin;