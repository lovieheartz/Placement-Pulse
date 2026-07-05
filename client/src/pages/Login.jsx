import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { apiUrl } from '../lib/api';
import { BRAND } from '../constants/brand';
import GlassBackground from '../components/ui/GlassBackground';
import { ArrowUpRight, ArrowRight } from '../components/ui/icons';

const AUTH_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4';

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
    formState: { errors },
  } = useForm();

  const { mutate, isPending } = useMutation({
    mutationFn: async (payload) => {
      const response = await axios.post(apiUrl('/login'), payload);
      return response.data;
    },
    onSuccess: (data) => {
      const { token, role, name } = data;
      sessionStorage.setItem('authToken', token);
      login({ email: data.email, token, role, name });
      toast.success('Welcome back!');
      setTimeout(() => {
        if (role === 'student') navigate('/student-dashboard');
        else if (role === 'faculty') navigate('/faculty-dashboard');
        else if (role === 'hod') navigate('/hod/dashboard');
        else if (role === 'admin') navigate('/home');
      }, 1200);
    },
    onError: (err) => {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.code === 'ERR_NETWORK'
          ? 'Cannot reach the server. Is the backend running on the API port?'
          : 'Login failed. Please try again.');
      toast.error(errorMessage);
      if (
        errorMessage.includes('verify') ||
        errorMessage.includes('verification') ||
        err.response?.data?.needsVerification
      ) {
        setShowVerificationFix(true);
        setEmailForFix(formData.email);
      }
    },
  });

  const onSubmit = (data) => {
    const cleanData = { ...data, email: data.email.replace(/^mailto:/, '') };
    setFormData(cleanData);
    mutate(cleanData);
  };

  const fixVerification = async () => {
    try {
      const cleanEmail = emailForFix.replace(/^mailto:/, '');
      const response = await axios.post(apiUrl('/verify-account'), { email: cleanEmail });
      if (response.data.success) {
        toast.success('Verification fixed! Try logging in again.');
        setShowVerificationFix(false);
      } else {
        toast.error(response.data.message || 'Failed to fix verification');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error connecting to server');
    }
  };

  return (
    <div className="ds-scope relative min-h-screen w-full overflow-hidden bg-[#05060a] font-body text-white flex items-center justify-center px-4 py-10">
      <GlassBackground video={AUTH_VIDEO} overlay={0.55} />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-7">
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
            Welcome back
          </h1>
          <p className="mt-3 text-sm text-white/70 font-light">
            Sign in to continue to your placement workspace.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
            <div>
              <div className="ds-field liquid-glass flex items-center gap-3 rounded-2xl px-4">
                <FaEnvelope className="text-white/50 shrink-0" />
                <input
                  className="w-full bg-transparent py-3.5 text-sm text-white placeholder-white/40 outline-none"
                  type="email"
                  placeholder="Email address"
                  autoFocus
                  autoComplete="username"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email address',
                    },
                  })}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-300/90 pl-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="ds-field liquid-glass flex items-center gap-3 rounded-2xl px-4">
                <FaLock className="text-white/50 shrink-0" />
                <input
                  className="w-full bg-transparent py-3.5 text-sm text-white placeholder-white/40 outline-none"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-white/50 hover:text-white shrink-0"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-300/90 pl-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-white/70 hover:text-white">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="ds-shimmer group flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
            >
              {isPending ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-black/25 border-t-black animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {showVerificationFix && (
            <div className="mt-5 liquid-glass rounded-2xl p-4 text-center">
              <p className="text-xs text-amber-200/90 mb-3">
                Email verification issue detected for {emailForFix}.
              </p>
              <button
                type="button"
                onClick={fixVerification}
                className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-black hover:bg-white"
              >
                Fix verification & retry
              </button>
            </div>
          )}

          <p className="mt-7 text-center text-sm text-white/70">
            New here?{' '}
            <Link to="/signup" className="inline-flex items-center gap-1 font-medium text-white hover:underline">
              Create an account
              <ArrowUpRight className="h-3.5 w-3.5" />
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

export default Login;
