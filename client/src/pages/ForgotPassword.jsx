import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async (email) => {
      const response = await axios.post('http://localhost:3001/forgot-password', { email });
      return response.data;
    },
    onSuccess: (data) => {
      setLocalError('');
      setTimeout(() => navigate('/login'), 3000);
    },
    onError: (error) => {
      setLocalError(error.response?.data?.message || 'Failed to send reset instructions. Please try again.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email) {
      setLocalError('Please enter your email address');
      return;
    }

    mutation.mutate(email);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Forgot Password</h2>
      <p style={styles.subHeading}>Enter your email to receive reset instructions</p>

      {localError && <div style={styles.error}>{localError}</div>}
      {mutation.isSuccess && (
        <div style={styles.success}>{mutation.data.message}</div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label htmlFor="email" style={styles.label}>Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={styles.input}
            required
          />
        </div>

        <button
          type="submit"
          style={styles.submitButton}
          disabled={mutation.isLoading}
        >
          {mutation.isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p style={styles.backToLogin}>
        Remember your password? <Link to="/login" style={styles.link}>Login here</Link>
      </p>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '400px',
    margin: '50px auto',
    padding: '30px',
    borderRadius: '12px',
    backgroundColor: '#f7f9fc',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
    fontFamily: 'Arial, sans-serif',
  },
  heading: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '8px',
    fontSize: '24px',
  },
  subHeading: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '24px',
    fontSize: '14px',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#555',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  submitButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4a90e2',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  error: {
    color: '#ff4d4f',
    backgroundColor: '#fff2f0',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '20px',
    border: '1px solid #ffccc7',
    textAlign: 'center',
  },
  success: {
    color: '#52c41a',
    backgroundColor: '#f6ffed',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '20px',
    border: '1px solid #b7eb8f',
    textAlign: 'center',
  },
  backToLogin: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666',
  },
  link: {
    color: '#4a90e2',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
};

export default ForgotPassword;
