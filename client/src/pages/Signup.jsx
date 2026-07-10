import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaGraduationCap,
  FaCodeBranch,
  FaCalendarAlt,
  FaChevronDown,
  FaCheck,
} from 'react-icons/fa';
import { apiUrl } from '../lib/api';
import { BRAND } from '../constants/brand';
import { BrandGlyph } from '../components/ui/BrandMark';
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
// Selects share the exact same wrapper as inputs so heights + left icons align.
const selectWrap =
  'ds-field liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3.5';
const labelText = 'block text-xs font-medium text-white/60 mb-1.5 pl-1';
const errText = 'mt-1.5 text-xs text-rose-300/90 pl-1';

/**
 * Fully custom dark dropdown (replaces the un-themeable native <select>).
 * The trigger matches the glass input fields; the menu is rendered in a portal
 * on document.body with fixed positioning, so it is never clipped by the auth
 * panel's `overflow:hidden` and always floats above everything. Keyboard-
 * accessible (Enter/Space/Arrows/Esc) and closes on outside click / scroll.
 * `options` is an array of { value, label }.
 */
const GlassSelect = ({ value, onChange, options, placeholder, icon: Icon, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [rect, setRect] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find((o) => o.value === value);

  const openMenu = () => {
    if (disabled) return;
    setRect(btnRef.current?.getBoundingClientRect());
    setActive(options.findIndex((o) => o.value === value));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const update = () => setRect(btnRef.current?.getBoundingClientRect());
    const onScroll = () => setOpen(false);
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('mousedown', onDoc);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open]);

  const choose = (v) => { onChange(v); setOpen(false); btnRef.current?.focus(); };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); return; }
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (active >= 0) choose(options[active].value); }
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${selectWrap} w-full text-left ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        {Icon && <Icon className="shrink-0 text-white/50" />}
        <span className={`flex-1 truncate ${selected ? 'text-white' : 'text-white/40'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <FaChevronDown
          className={`shrink-0 text-[11px] text-white/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && rect &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: rect.bottom + 6,
              left: rect.left,
              width: rect.width,
              maxHeight: Math.min(300, window.innerHeight - rect.bottom - 16),
            }}
            className="z-[999] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#0b0f1c]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-white/25"
          >
            {options.length === 0 && (
              <li className="px-3 py-2 text-sm text-white/40">No options</li>
            )}
            {options.map((o, i) => {
              const isSel = o.value === value;
              const isActive = i === active;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o.value)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                    isSel
                      ? 'bg-sky-500/25 text-white'
                      : isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/75'
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSel && <FaCheck className="ml-2 shrink-0 text-[11px] text-sky-300" />}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
};

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
    setValue,
    control,
    formState: { errors },
  } = useForm({ defaultValues: { email: prefillEmail } });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1999 + 10 }, (_, i) => 2020 + i);
  const yearOpts = years.map((y) => ({ value: String(y), label: String(y) }));
  const courseOpts = Object.keys(courseOptions).map((c) => ({ value: c, label: c }));

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
          <BrandGlyph size={40} />
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
                <label className={labelText}>Course</label>
                <Controller
                  name="course"
                  control={control}
                  rules={{ required: 'Course is required' }}
                  render={({ field }) => (
                    <GlassSelect
                      icon={FaGraduationCap}
                      placeholder="Select course"
                      value={field.value || ''}
                      options={courseOpts}
                      onChange={(v) => {
                        field.onChange(v);
                        setSelectedCourse(v);
                        // Reset branch so a stale value from a previous course can't be submitted.
                        setValue('branch', '', { shouldValidate: false });
                      }}
                    />
                  )}
                />
                {errors.course && <p className={errText}>{errors.course.message}</p>}
              </div>

              <div>
                <label className={labelText}>Branch</label>
                <Controller
                  name="branch"
                  control={control}
                  rules={{ required: 'Branch is required' }}
                  render={({ field }) => (
                    <GlassSelect
                      icon={FaCodeBranch}
                      disabled={!selectedCourse}
                      placeholder={selectedCourse ? 'Select branch' : 'Select course first'}
                      value={field.value || ''}
                      options={(selectedCourse ? courseOptions[selectedCourse] : []).map((b) => ({ value: b, label: b }))}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.branch && <p className={errText}>{errors.branch.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelText}>Admission year</label>
                <Controller
                  name="admissionYear"
                  control={control}
                  rules={{ required: 'Required' }}
                  render={({ field }) => (
                    <GlassSelect
                      icon={FaCalendarAlt}
                      placeholder="Select year"
                      value={field.value || ''}
                      options={yearOpts}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.admissionYear && <p className={errText}>{errors.admissionYear.message}</p>}
              </div>

              <div>
                <label className={labelText}>Passout year</label>
                <Controller
                  name="passoutYear"
                  control={control}
                  rules={{ required: 'Required' }}
                  render={({ field }) => (
                    <GlassSelect
                      icon={FaCalendarAlt}
                      placeholder="Select year"
                      value={field.value || ''}
                      options={yearOpts}
                      onChange={field.onChange}
                    />
                  )}
                />
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
