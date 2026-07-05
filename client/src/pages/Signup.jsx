import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaEye,
  FaEyeSlash,
} from 'react-icons/fa';
import { apiUrl } from '../lib/api';
import { BRAND } from '../constants/brand';
import GlassBackground from '../components/ui/GlassBackground';
import { ArrowRight } from '../components/ui/icons';

const AUTH_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_094631_d30ab262-45ee-4b7d-99f3-5d5848c8ef13.mp4';

const courseOptions = {
  BTech: ['CSE', 'CSE(AIML)', 'CSE-DS', 'CSE-IOT', 'BME', 'IT', 'CSBS', 'CE', 'EE', 'ME', 'ECE'],
  MTech: ['CSE', 'CI', 'ECE&PS'],
  Diploma: ['EE', 'EEEVT', 'CE', 'CSE'],
  BCA: ['BCA'],
  MCA: ['MCA'],
  BBA: ['BBA'],
  MBA: ['MBA'],
};

const inputWrap =
  'ds-field liquid-glass flex items-center gap-3 rounded-2xl px-4';
const inputField =
  'w-full bg-transparent py-3.5 text-sm text-white placeholder-white/40 outline-none';
const selectWrap = 'ds-field liquid-glass rounded-2xl relative';
const selectField =
  'w-full appearance-none bg-transparent py-3.5 pl-4 pr-9 text-sm text-white outline-none [&>option]:bg-[#0b0d14] [&>option]:text-white';
const errText = 'mt-1.5 text-xs text-rose-300/90 pl-1';

const STRENGTH = [
  { label: 'Too weak', color: '#fb7185', width: '20%' },
  { label: 'Weak', color: '#fb923c', width: '40%' },
  { label: 'Fair', color: '#fbbf24', width: '60%' },
  { label: 'Good', color: '#a3e635', width: '80%' },
  { label: 'Strong', color: '#34d399', width: '100%' },
];
const scorePassword = (pw = '') => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.max(0, s - 1); // 0..4 index into STRENGTH
};

const Signup = () => {
  const navigate = useNavigate();
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({});
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const t = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { email: prefillEmail } });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1999 + 10 }, (_, i) => 2020 + i);

  const passwordValue = watch('password') || '';
  const strengthIdx = scorePassword(passwordValue);

  const sendOTPMutation = useMutation({
    mutationFn: async (email) => {
      email = email.replace(/^mailto:/, '');
      const res = await fetch(apiUrl('/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to send OTP');
      return data;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload) => {
      const email = payload.email.replace(/^mailto:/, '');
      const res = await fetch(apiUrl('/register-student'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Registration failed');
      return data;
    },
    onSuccess: () => {
      toast.success('Registration successful! You can now sign in.');
      setTimeout(() => navigate('/login'), 1800);
    },
    onError: (err) => {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        toast.error('An account with this email already exists. Please sign in.');
        setTimeout(() => navigate('/login'), 1800);
      } else if (err.message.includes('Invalid or expired OTP')) {
        toast.error('OTP is incorrect. Please try again.');
      } else {
        toast.error(err.message || 'Registration failed. Please try again.');
      }
    },
  });

  const resendOTPMutation = useMutation({
    mutationFn: async (email) => {
      email = email.replace(/^mailto:/, '');
      const res = await fetch(apiUrl('/resend-otp'), {
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
      setResendCooldown(30);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data) => {
    if (!data.email.endsWith('@nsec.ac.in')) {
      toast.error('Please use your @nsec.ac.in email address');
      return;
    }
    const cleanEmail = data.email.replace(/^mailto:/, '');
    data.email = cleanEmail;
    setRegistrationEmail(cleanEmail);
    setFormData(data);
    setOtpSending(true);
    sendOTPMutation.mutate(cleanEmail, {
      onSuccess: () => {
        toast.success('OTP sent to your email!');
        setOtpSending(false);
        setShowOTPVerification(true);
        setResendCooldown(30);
      },
      onError: (err) => {
        toast.error(err.message);
        setOtpSending(false);
      },
    });
  };

  const onOTPSubmit = (data) => {
    const cleanEmail = formData.email.replace(/^mailto:/, '');
    registerMutation.mutate({ ...formData, email: cleanEmail, otp: data.otp });
  };

  const handleResendOTP = () => {
    if (resendCooldown > 0 || resendOTPMutation.isPending) return;
    resendOTPMutation.mutate(registrationEmail);
  };

  /* ----------------------------- OTP STEP ----------------------------- */
  if (showOTPVerification) {
    return (
      <div className="ds-scope relative min-h-screen w-full overflow-hidden bg-[#05060a] font-body text-white flex items-center justify-center px-4 py-10">
        <GlassBackground video={AUTH_VIDEO} overlay={0.55} />
        <div className="relative z-10 w-full max-w-md">
          <div className="liquid-glass-strong rounded-[1.75rem] p-8 sm:p-10 ds-reveal text-center">
            <span className="liquid-glass mx-auto flex h-14 w-14 items-center justify-center rounded-full">
              <FaEnvelope className="text-white text-xl" />
            </span>
            <h1 className="mt-6 font-heading italic text-4xl tracking-[-1.5px] leading-none">
              Verify your email
            </h1>
            <p className="mt-3 text-sm text-white/70 font-light">
              We sent a 6-digit code to<br />
              <strong className="text-white">{registrationEmail}</strong>
            </p>

            <form onSubmit={handleSubmit(onOTPSubmit)} noValidate className="mt-8">
              <input
                className="ds-field w-full liquid-glass rounded-2xl bg-transparent py-4 text-center text-2xl tracking-[0.5em] font-heading text-white placeholder-white/30 outline-none"
                type="text"
                placeholder="••••••"
                maxLength="6"
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                {...register('otp', {
                  required: 'OTP is required',
                  pattern: { value: /^[0-9]{6}$/, message: 'OTP must be 6 digits' },
                })}
              />
              {errors.otp && <p className={errText}>{errors.otp.message}</p>}

              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="ds-shimmer mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
              >
                {registerMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-black/25 border-t-black animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Verify & Create Account'
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/70">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendOTPMutation.isPending || resendCooldown > 0}
                className="hover:text-white disabled:opacity-50 disabled:hover:text-white/70"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : resendOTPMutation.isPending
                  ? 'Sending…'
                  : 'Resend OTP'}
              </button>
              <button type="button" onClick={() => setShowOTPVerification(false)} className="hover:text-white">
                Back to form
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --------------------------- REGISTER STEP -------------------------- */
  return (
    <div className="ds-scope relative min-h-screen w-full overflow-hidden bg-[#05060a] font-body text-white flex items-center justify-center px-4 py-12">
      <GlassBackground video={AUTH_VIDEO} overlay={0.6} />

      <div className="relative z-10 w-full max-w-xl">
        <Link to="/" className="flex items-center justify-center gap-3 mb-6">
          <span className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full">
            <span className="font-heading italic text-2xl text-white">{BRAND.monogram}</span>
          </span>
          <span className="flex flex-col items-start leading-none">
            <span className="font-heading italic text-xl text-white">{BRAND.name}</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/55 mt-0.5">{BRAND.org}</span>
          </span>
        </Link>

        <div className="liquid-glass-strong rounded-[1.75rem] p-8 sm:p-10 ds-reveal">
          <h1 className="font-heading italic text-4xl sm:text-5xl tracking-[-1.5px] leading-none">
            Create your account
          </h1>
          <p className="mt-3 text-sm text-white/70 font-light">
            Use your college email to join the placement portal.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
            <div>
              <div className={inputWrap}>
                <FaUser className="text-white/50 shrink-0" />
                <input
                  className={inputField}
                  type="text"
                  placeholder="Full name"
                  {...register('name', { required: 'Name is required' })}
                />
              </div>
              {errors.name && <p className={errText}>{errors.name.message}</p>}
            </div>

            <div>
              <div className={inputWrap}>
                <FaEnvelope className="text-white/50 shrink-0" />
                <input
                  className={inputField}
                  type="email"
                  placeholder="Email (@nsec.ac.in)"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /@nsec\.ac\.in$/,
                      message: 'Use your @nsec.ac.in email address',
                    },
                  })}
                />
              </div>
              {errors.email && <p className={errText}>{errors.email.message}</p>}
            </div>

            <div>
              <div className={inputWrap}>
                <FaPhone className="text-white/50 shrink-0" />
                <input
                  className={inputField}
                  type="tel"
                  placeholder="Phone (e.g. +91XXXXXXXXXX)"
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^\+\d{10,15}$/,
                      message: 'Include the country code',
                    },
                  })}
                />
              </div>
              {errors.phone && <p className={errText}>{errors.phone.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/60 mb-1.5 pl-1">Course</label>
                <div className={selectWrap}>
                  <select
                    className={selectField}
                    {...register('course', { required: 'Course is required' })}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                  >
                    <option value="">Select course</option>
                    {Object.keys(courseOptions).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/50">▾</span>
                </div>
                {errors.course && <p className={errText}>{errors.course.message}</p>}
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1.5 pl-1">Branch</label>
                <div className={selectWrap}>
                  <select
                    className={selectField}
                    disabled={!selectedCourse}
                    {...register('branch', { required: 'Branch is required' })}
                  >
                    <option value="">Select branch</option>
                    {selectedCourse &&
                      courseOptions[selectedCourse]?.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/50">▾</span>
                </div>
                {errors.branch && <p className={errText}>{errors.branch.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/60 mb-1.5 pl-1">Admission year</label>
                <div className={selectWrap}>
                  <select
                    className={selectField}
                    {...register('admissionYear', { required: 'Required' })}
                  >
                    <option value="">Select year</option>
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/50">▾</span>
                </div>
                {errors.admissionYear && <p className={errText}>{errors.admissionYear.message}</p>}
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1.5 pl-1">Passout year</label>
                <div className={selectWrap}>
                  <select
                    className={selectField}
                    {...register('passoutYear', { required: 'Required' })}
                  >
                    <option value="">Select year</option>
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/50">▾</span>
                </div>
                {errors.passoutYear && <p className={errText}>{errors.passoutYear.message}</p>}
              </div>
            </div>

            <div>
              <div className={inputWrap}>
                <FaLock className="text-white/50 shrink-0" />
                <input
                  className={inputField}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  autoComplete="new-password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-white/50 hover:text-white shrink-0"
                  aria-label="Toggle password"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && <p className={errText}>{errors.password.message}</p>}
              {passwordValue && (
                <div className="mt-2 flex items-center gap-3 pl-1">
                  <div className="ds-strength flex-1">
                    <span
                      style={{
                        width: STRENGTH[strengthIdx].width,
                        backgroundColor: STRENGTH[strengthIdx].color,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: STRENGTH[strengthIdx].color }}>
                    {STRENGTH[strengthIdx].label}
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className={inputWrap}>
                <FaLock className="text-white/50 shrink-0" />
                <input
                  className={inputField}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (v) => v === watch('password') || 'Passwords do not match',
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="text-white/50 hover:text-white shrink-0"
                  aria-label="Toggle confirm password"
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.confirmPassword && <p className={errText}>{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={otpSending || sendOTPMutation.isPending}
              className="ds-shimmer group flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
            >
              {otpSending || sendOTPMutation.isPending ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-black/25 border-t-black animate-spin" />
                  Sending OTP…
                </>
              ) : (
                <>
                  Send OTP &amp; Continue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-white/70">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-white hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} {BRAND.org}
        </p>
      </div>
    </div>
  );
};

export default Signup;
