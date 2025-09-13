import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationFix, setShowVerificationFix] = useState(false);
  const [emailForFix, setEmailForFix] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const { mutate } = useMutation({
    mutationFn: async (formData) => {
      const response = await axios.post('http://localhost:3001/login', formData);
      return response.data;
    },
    onSuccess: (data) => {
      const { token, role, name } = data;
      sessionStorage.setItem('authToken', token);
      login({ email: data.email, token, role, name });

      toast.success('Login successful!');

      setTimeout(() => {
        if (role === 'student') navigate('/student-dashboard');
        else if (role === 'faculty') navigate('/faculty-dashboard');
        else if (role === 'admin') navigate('/home');
      }, 1500);
    },
    onError: (err) => {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.';
      toast.error(errorMessage);
      console.error('Login error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      // If verification error, show fix button
      if (errorMessage.includes('verify') || errorMessage.includes('verification') || err.response?.data?.needsVerification) {
        setShowVerificationFix(true);
        setEmailForFix(formData.email);
      }
    },
  });

  const onSubmit = (data) => {
    // Clean email if it has mailto: prefix
    const cleanData = {
      ...data,
      email: data.email.replace(/^mailto:/, '')
    };
    setFormData(cleanData);
    mutate(cleanData);
  };
  
  // Function to fix verification status
  const fixVerification = async () => {
    try {
      // Clean email if it has mailto: prefix
      const cleanEmail = emailForFix.replace(/^mailto:/, '');
      
      const response = await axios.post('http://localhost:3001/verify-account', { 
        email: cleanEmail 
      });
      
      if (response.data.success) {
        toast.success('Verification fixed! Please try logging in again.');
        setShowVerificationFix(false);
      } else {
        toast.error(response.data.message || 'Failed to fix verification');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error connecting to server');
      console.error('Fix verification error:', error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="logo-container">
          <h1 className="logo-text">NSEC</h1>
          <p className="logo-subtext">Placement Portal</p>
        </div>
        
        <h2 className="heading">Welcome Back!</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
          <div className="input-group">
            <FaUser className="input-icon" />
            <input
              className="form-input"
              type="email"
              placeholder="Email Address"
              autoComplete="username"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email address'
                }
              })}
            />
          </div>
          {errors.email && <p className="field-error">{errors.email.message}</p>}
          
          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              className="form-input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
            />
            <div 
              className="password-toggle" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </div>
          </div>
          {errors.password && <p className="field-error">{errors.password.message}</p>}
          
          <button 
            type="submit" 
            className="submit-button" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="links-container">
          <Link to="/forgot-password" className="link">Forgot Password?</Link>
          <Link to="/" className="link">Register here</Link>
        </div>
        
        {showVerificationFix && (
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <p style={{ color: '#e74c3c', marginBottom: '10px' }}>Email verification issue detected.</p>
            <button 
              type="button" 
              style={{
                padding: '8px 16px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={fixVerification}
            >
              Fix Verification for {emailForFix}
            </button>
          </div>
        )}

        <div className="footer">
          <p>© {new Date().getFullYear()} NSEC Placement Portal</p>
        </div>
      </div>
      <ToastContainer autoClose={2000} />
    </div>
  );
};

export default Login;