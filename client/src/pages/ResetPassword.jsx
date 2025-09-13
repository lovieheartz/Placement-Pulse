import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || !type) {
      setError('Invalid or missing reset link parameters.');
    }
  }, [token, type]);

  // React Query mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, password, type }) => {
      const response = await fetch('http://localhost:3001/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, type }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Reset failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setError('');
      alert(data.message);
      setTimeout(() => navigate('/login'), 2000);
    },
    onError: (err) => {
      setError(err.message || 'Something went wrong. Try again.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!password) {
      setError('Password is required.');
      return;
    }

    resetPasswordMutation.mutate({ token, password, type });
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h2>Reset Your Password</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      {!resetPasswordMutation.isSuccess && (
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Enter new password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
          />
          <button
            type="submit"
            style={{ padding: '10px', width: '100%' }}
            disabled={resetPasswordMutation.isLoading}
          >
            {resetPasswordMutation.isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ResetPassword;
