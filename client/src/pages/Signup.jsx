import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaUser, FaEnvelope, FaPhone, FaLock, FaEye, FaEyeSlash, FaGraduationCap, FaCalendarAlt } from 'react-icons/fa';
import './Signup.css';

const Signup = () => {
  const navigate = useNavigate();
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const courseOptions = {
    'BTech': ['CSE', 'CSE(AIML)', 'CSE-DS', 'CSE-IOT', 'BME', 'IT', 'CSBS', 'CE', 'EE', 'ME', 'ECE'],
    'MTech': ['CSE', 'CI', 'ECE&PS'],
    'Diploma': ['EE', 'EEEVT', 'CE', 'CSE'],
    'BCA': ['BCA'],
    'MCA': ['MCA'],
    'BBA': ['BBA'],
    'MBA': ['MBA']
  };
  
  // Generate years from 2000 to current year + 10
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: currentYear - 1999 + 10}, (_, i) => 2020 + i);

  const sendOTPMutation = useMutation({
    mutationFn: async (email) => {
      // Clean email if it has mailto: prefix
      email = email.replace(/^mailto:/, '');
      console.log('Sending OTP to:', email);
      const res = await fetch('http://localhost:3001/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to send OTP');
      return data;
    },
    onSuccess: () => {
      toast.success('OTP sent successfully!');
      setOtpSending(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setOtpSending(false);
      setShowOTPVerification(false);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ name, email, phone, password, course, branch, admissionYear, passoutYear, otp }) => {
      // Clean email if it has mailto: prefix
      email = email.replace(/^mailto:/, '');
      console.log('Verifying OTP for student:', email);
      
      try {
        // Register the student directly with OTP
        const registerRes = await fetch('http://localhost:3001/register-student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name, 
            email, 
            phone, 
            password, 
            course, 
            branch, 
            admissionYear, 
            passoutYear,
            otp // Include OTP in registration request
          }),
        });
        
        const registerData = await registerRes.json();
        if (!registerRes.ok) throw new Error(registerData.error || registerData.message || 'Registration failed');
        
        return registerData;
      } catch (error) {
        console.error('Registration error details:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast.success('Registration successful! You can now login.');
      setTimeout(() => navigate('/login'), 2000);
    },
    onError: (err) => {
      console.error('Registration error:', err);
      if (err.message.includes('Invalid or expired OTP')) {
        toast.error('OTP wrong! Please try again.');
      } else if (err.message.includes('Student not found')) {
        toast.error('Registration failed. Please try again.');
        // If student not found during verification, go back to registration
        setShowOTPVerification(false);
      } else if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        toast.error('An account with this email already exists. Please login instead.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast.error(err.message || 'Registration failed. Please try again.');
      }
    },
  });

  const resendOTPMutation = useMutation({
    mutationFn: async (email) => {
      // Clean email if it has mailto: prefix
      email = email.replace(/^mailto:/, '');
      console.log('Resending OTP to:', email);
      const res = await fetch('http://localhost:3001/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to resend OTP');
      return data;
    },
    onSuccess: () => {
      toast.success('OTP resent successfully!');
    },
    onError: (err) => {
      console.error('Resend OTP error:', err);
      toast.error(err.message);
    },
  });

  const onSubmit = (data) => {
    if (!data.email.endsWith('@nsec.ac.in')) {
      toast.error('Please use your @nsec.ac.in email address');
      return;
    }
    // Remove mailto: prefix if present
    const cleanEmail = data.email.replace(/^mailto:/, '');
    data.email = cleanEmail;
    
    setRegistrationEmail(cleanEmail);
    setFormData(data);
    setOtpSending(true);
    
    // Show loading animation
    setIsLoading(true);
    
    // Send OTP
    sendOTPMutation.mutate(cleanEmail, {
      onSuccess: () => {
        setIsLoading(false);
        setShowOTPVerification(true);
      },
      onError: () => {
        setIsLoading(false);
        setOtpSending(false);
      }
    });
  };

  const onOTPSubmit = (data) => {
    // Clean email if it has mailto: prefix
    const cleanEmail = formData.email.replace(/^mailto:/, '');
    console.log('Submitting OTP verification with:', { 
      email: cleanEmail, 
      otp: data.otp 
    });
    setIsLoading(true);
    registerMutation.mutate({ 
      ...formData, 
      email: cleanEmail, 
      otp: data.otp 
    }, {
      onSettled: () => setIsLoading(false)
    });
  };

  const handleResendOTP = () => {
    resendOTPMutation.mutate(registrationEmail);
  };

  const handleCourseChange = (e) => {
    setSelectedCourse(e.target.value);
  };

  if (showOTPVerification) {
    return (
      <div className="signup-page">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p className="loading-text">Verifying and registering...</p>
          </div>
        )}
        <div className="signup-container fade-in">
          <div className="logo-container">
            <h1 className="logo-text">NSEC</h1>
            <p className="logo-subtext">Placement Portal</p>
          </div>
          
          <h2 className="heading">Verify Your Email</h2>
          <p className="otp-text">A 6-digit verification code has been sent to <strong>{registrationEmail}</strong></p>
          <p className="otp-subtext">Please check your inbox and enter the code below</p>
          
          <form onSubmit={handleSubmit(onOTPSubmit)} className="signup-form">
            <div className="otp-input-container">
              <input
                className="otp-input"
                type="text"
                placeholder="Enter 6-digit OTP"
                maxLength="6"
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                {...register('otp', { 
                  required: 'OTP is required', 
                  minLength: {
                    value: 6,
                    message: 'OTP must be 6 digits'
                  },
                  pattern: {
                    value: /^[0-9]{6}$/,
                    message: 'OTP must contain only numbers'
                  }
                })}
              />
            </div>
            {errors.otp && <p className="field-error">{errors.otp.message}</p>}
            {registerMutation.isError && (
              <p className="field-error">{registerMutation.error.message}</p>
            )}
            
            <button 
              type="submit" 
              className="submit-button"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
          
          <div className="otp-actions">
            <button 
              className="text-button" 
              onClick={handleResendOTP}
              disabled={resendOTPMutation.isPending}
            >
              {resendOTPMutation.isPending ? 'Sending...' : 'Resend OTP'}
            </button>
            <button className="text-button" onClick={() => setShowOTPVerification(false)}>
              Back to Registration
            </button>
          </div>
          
          <div className="footer">
            <p>© {new Date().getFullYear()} NSEC Placement Portal</p>
          </div>
        </div>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="signup-page">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p className="loading-text">Sending verification code...</p>
        </div>
      )}
      <div className="signup-container">
        <div className="logo-container">
          <h1 className="logo-text">NSEC</h1>
          <p className="logo-subtext">Placement Portal</p>
        </div>
        
        <div className="header-container">
          <h2 className="heading">Student Registration</h2>
          <p className="subheading">Create your account to access the placement portal</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="signup-form">
          <div className="input-group">
            <FaUser className="input-icon" />
            <input
              className="form-input"
              type="text"
              placeholder="Full Name"
              {...register('name', { required: 'Name is required' })}
            />
          </div>
          {errors.name && <p className="field-error">{errors.name.message}</p>}

          <div className="input-group">
            <FaEnvelope className="input-icon" />
            <input
              className="form-input"
              type="email"
              placeholder="Email Address (@nsec.ac.in)"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /@nsec\.ac\.in$/,
                  message: 'Please use your @nsec.ac.in email address'
                }
              })}
            />
          </div>
          {errors.email && <p className="field-error">{errors.email.message}</p>}

          <div className="input-group">
            <FaPhone className="input-icon" />
            <input
              className="form-input"
              type="tel"
              placeholder="Phone Number (e.g., +91XXXXXXXXXX)"
              {...register('phone', {
                required: 'Phone number is required',
                pattern: {
                  value: /^\+\d{10,15}$/,
                  message: 'Phone number must include country code',
                },
              })}
            />
          </div>
          {errors.phone && <p className="field-error">{errors.phone.message}</p>}

          <div className="form-row">
            <div className="form-column">
              <label className="select-label">
                <FaGraduationCap className="select-icon" />
                <span>Course</span>
              </label>
              <div className="select-container">
                <select
                  className="form-select"
                  {...register('course', { required: 'Course is required' })}
                  onChange={(e) => {
                    handleCourseChange(e);
                  }}
                >
                  <option value="">Select Course</option>
                  {Object.keys(courseOptions).map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
                <div className="select-arrow"></div>
              </div>
              {errors.course && <p className="field-error">{errors.course.message}</p>}
            </div>
            
            <div className="form-column">
              <label className="select-label">
                <FaGraduationCap className="select-icon" />
                <span>Branch</span>
              </label>
              <div className="select-container">
                <select
                  className="form-select"
                  {...register('branch', { required: 'Branch is required' })}
                  disabled={!selectedCourse || courseOptions[selectedCourse]?.length === 0}
                >
                  <option value="">Select Branch</option>
                  {selectedCourse && courseOptions[selectedCourse]?.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
                <div className="select-arrow"></div>
              </div>
              {errors.branch && <p className="field-error">{errors.branch.message}</p>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-column">
              <label className="select-label">
                <FaCalendarAlt className="select-icon" />
                <span>Admission Year</span>
              </label>
              <div className="select-container">
                <select
                  className="form-select"
                  {...register('admissionYear', { required: 'Admission year is required' })}
                >
                  <option value="">Select Year</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <div className="select-arrow"></div>
              </div>
              {errors.admissionYear && <p className="field-error">{errors.admissionYear.message}</p>}
            </div>
            
            <div className="form-column">
              <label className="select-label">
                <FaCalendarAlt className="select-icon" />
                <span>Passout Year</span>
              </label>
              <div className="select-container">
                <select
                  className="form-select"
                  {...register('passoutYear', { required: 'Passout year is required' })}
                >
                  <option value="">Select Year</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <div className="select-arrow"></div>
              </div>
              {errors.passoutYear && <p className="field-error">{errors.passoutYear.message}</p>}
            </div>
          </div>

          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              className="form-input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="new-password"
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters'
                }
              })}
            />
            <div 
              className="password-toggle" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </div>
          </div>
          {errors.password && <p className="field-error">{errors.password.message}</p>}

          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              className="form-input"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              autoComplete="new-password"
              {...register('confirmPassword', {
                required: 'Confirm Password is required',
                validate: (value) => value === watch('password') || 'Passwords do not match',
              })}
            />
            <div 
              className="password-toggle" 
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </div>
          </div>
          {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}

          <button 
            type="submit" 
            className={otpSending ? "green-button" : "submit-button"}
            disabled={otpSending}
          >
            {otpSending ? 'Email Verification OTP sent' : 'Send OTP & Verify Email'}
          </button>
        </form>

        <div className="login-link">
          Already have an account? <Link to="/login" className="link">Login here</Link>
        </div>
        
        <div className="footer">
          <p>© {new Date().getFullYear()} NSEC Placement Portal</p>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default Signup;