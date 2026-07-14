import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import PortalLayout from '@/components/app/PortalLayout';
import { GlassPanel } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { API_BASE } from '../config/api';
import useInterviewSession from '../hooks/useInterviewSession';
import InterviewerAvatar from '../components/interview/InterviewerAvatar';
import {
  Building2,
  Briefcase,
  Factory,
  Upload,
  CheckCircle2,
  X as XIcon,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Captions,
  CaptionsOff,
  Maximize2,
  Flag,
  MessageSquare,
  MessageSquareQuote,
  BarChart3,
  Home,
  RotateCcw,
  Users,
  Code2,
  Target,
  Sparkles,
  Info,
  Loader2,
  TrendingUp,
  Headphones,
  AlertTriangle,
} from 'lucide-react';
import './Dashboard.css';
import './RealtimeInterview.css';

const COMPANIES = [
  { value: 'faang', label: '🏢 FAANG (Facebook, Apple, Amazon, Netflix, Google)' },
  { value: 'microsoft', label: '💻 Microsoft' },
  { value: 'tcs', label: '🏭 TCS (Tata Consultancy Services)' },
  { value: 'infosys', label: '💼 Infosys' },
  { value: 'wipro', label: '🏢 Wipro' },
  { value: 'capgemini', label: '🌐 Capgemini' },
  { value: 'cognizant', label: '💡 Cognizant' },
  { value: 'accenture', label: '⚡ Accenture' },
  { value: 'deloitte', label: '📊 Deloitte' },
  { value: 'ibm', label: '🔵 IBM' },
  { value: 'oracle', label: '🔴 Oracle' },
  { value: 'adobe', label: '🎨 Adobe' },
  { value: 'salesforce', label: '☁️ Salesforce' },
  { value: 'uber', label: '🚗 Uber' },
  { value: 'airbnb', label: '🏠 Airbnb' },
  { value: 'other', label: '✏️ Other (Type below)' },
];

const INDUSTRIES = [
  { value: 'technology', label: '💻 Technology & Software' },
  { value: 'finance', label: '💰 Finance & Banking' },
  { value: 'healthcare', label: '🏥 Healthcare & Pharmaceuticals' },
  { value: 'ecommerce', label: '🛒 E-commerce & Retail' },
  { value: 'consulting', label: '📊 Consulting & Professional Services' },
  { value: 'education', label: '🎓 Education & EdTech' },
  { value: 'manufacturing', label: '🏭 Manufacturing & Industrial' },
  { value: 'telecommunications', label: '📡 Telecommunications' },
  { value: 'media', label: '📺 Media & Entertainment' },
  { value: 'automotive', label: '🚗 Automotive' },
  { value: 'aerospace', label: '✈️ Aerospace & Defense' },
  { value: 'energy', label: '⚡ Energy & Utilities' },
  { value: 'realestate', label: '🏢 Real Estate & Construction' },
  { value: 'hospitality', label: '🏨 Hospitality & Tourism' },
  { value: 'logistics', label: '🚚 Logistics & Supply Chain' },
  { value: 'agriculture', label: '🌾 Agriculture & Food' },
  { value: 'gaming', label: '🎮 Gaming & Entertainment' },
  { value: 'cybersecurity', label: '🔒 Cybersecurity' },
  { value: 'ai', label: '🤖 Artificial Intelligence & Machine Learning' },
  { value: 'blockchain', label: '⛓️ Blockchain & Cryptocurrency' },
  { value: 'other', label: '✏️ Other (Type below)' },
];

const INTERVIEW_TYPES = [
  { id: 'hr', icon: Users, title: 'HR Round', desc: 'Behavioral, soft skills, culture fit' },
  { id: 'technical', icon: Code2, title: 'Technical', desc: 'Domain knowledge & problem-solving' },
  { id: 'mixed', icon: Target, title: 'Mixed', desc: 'HR + Technical combined', badge: 'Recommended' },
];

const DIFFICULTIES = [
  { id: 'easy', dot: 'bg-emerald-500', title: 'Easy', desc: '10–12 questions' },
  { id: 'medium', dot: 'bg-amber-500', title: 'Medium', desc: '12–20 questions' },
  { id: 'hard', dot: 'bg-rose-500', title: 'Hard', desc: '20–25 questions' },
];

const DIFFICULTY_STYLE = {
  easy: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
  medium: 'bg-amber-500/15 text-amber-300 ring-amber-400/30',
  hard: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
};

const STATUS_COPY = {
  connecting: { label: 'Connecting…', tone: 'bg-slate-500' },
  listening: { label: 'Listening', tone: 'bg-emerald-500' },
  thinking: { label: 'Thinking', tone: 'bg-amber-500' },
  speaking: { label: 'Alex is speaking', tone: 'bg-blue-500' },
  reconnecting: { label: 'Reconnecting…', tone: 'bg-amber-500' },
  ended: { label: 'Ended', tone: 'bg-slate-500' },
  idle: { label: 'Idle', tone: 'bg-slate-500' },
};

const ChevronDownIcon = () => (
  <svg
    className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const formatClock = (ms) => {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const formatTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

/**
 * One line of the conversation. Both speakers render through here, so the
 * candidate's words get exactly the same weight on screen as the interviewer's
 * — you should be able to read back your own answers, not just Alex's questions.
 *
 * `live` marks speech that is still being transcribed: it pulses and shows a
 * caret, so it reads as "being heard right now" rather than as a finished turn.
 */
const TranscriptTurn = ({ role, text, timestamp, live = false, studentName }) => {
  const isAI = role === 'assistant';
  const name = isAI ? 'Alex' : (studentName?.split(' ')[0] || 'You');

  return (
    <div className={`flex gap-2.5 ${isAI ? '' : 'flex-row-reverse'}`}>
      <span
        className={`mt-5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${
          isAI
            ? 'bg-indigo-500/20 text-indigo-200 ring-indigo-400/30'
            : 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/30'
        }`}
      >
        {isAI ? '🧑‍💼' : name.charAt(0).toUpperCase()}
      </span>

      <div className={`flex min-w-0 flex-col ${isAI ? 'items-start' : 'items-end'}`}>
        <span className="mb-1 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold text-white/45">
          {name}
          {live ? (
            <span className={isAI ? 'text-indigo-300' : 'text-emerald-300'}>· speaking…</span>
          ) : (
            <span className="font-normal text-white/25">{formatTime(timestamp)}</span>
          )}
        </span>

        <div
          className={`max-w-[92%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed transition-opacity ${
            isAI
              ? 'rounded-tl-sm bg-white/[0.07] text-white/90 ring-1 ring-white/10'
              : 'rounded-tr-sm bg-gradient-to-br from-emerald-600 to-teal-600 text-white'
          } ${live ? 'opacity-80' : 'opacity-100'}`}
        >
          {text}
          {live && <span className="ml-0.5 inline-block animate-pulse">▍</span>}
        </div>
      </div>
    </div>
  );
};

const RealtimeInterviewPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const token = sessionStorage.getItem('authToken');

  const { data: profileData } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/student/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
    enabled: !!token,
  });

  const [step, setStep] = useState('setup');
  const [config, setConfig] = useState({
    company: 'faang',
    customCompany: '',
    jobRole: '',
    industry: 'technology',
    customIndustry: '',
    interviewType: 'mixed',
    difficulty: 'medium',
    resumeFile: null,
  });

  const [sessionId, setSessionId] = useState(null);
  const [interviewId, setInterviewId] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showTranscript, setShowTranscript] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [setupError, setSetupError] = useState(null);

  const session = useInterviewSession();
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const videoStreamRef = useRef(null);
  const messagesEndRef = useRef(null);
  const endingRef = useRef(false);

  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      videoStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Interview clock
  useEffect(() => {
    if (step !== 'interview' || !startedAt) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [step, startedAt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [session.transcript, session.liveAi, session.liveUser]);

  // Track the browser's fullscreen state (the user can always press Esc).
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enterFullscreen = useCallback(async () => {
    const el = stageRef.current;
    if (!el || document.fullscreenElement) return;
    try {
      await el.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      // Fullscreen can be blocked by policy — the stage still fills the viewport.
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /* Camera (local self-view only — nothing is sent to the AI)         */
  /* ---------------------------------------------------------------- */

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      videoStreamRef.current = stream;
      setIsCameraOn(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setIsCameraOn(false); // camera is optional; the interview is voice-first
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (isCameraOn) {
      videoStreamRef.current?.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
      setIsCameraOn(false);
    } else {
      startCamera();
    }
  }, [isCameraOn, startCamera]);

  // Re-attach the stream whenever the <video> remounts (e.g. fullscreen toggle).
  useEffect(() => {
    if (isCameraOn && videoRef.current && videoStreamRef.current) {
      videoRef.current.srcObject = videoStreamRef.current;
    }
  }, [isCameraOn, isFullscreen]);

  /* ---------------------------------------------------------------- */
  /* Lifecycle                                                         */
  /* ---------------------------------------------------------------- */

  const getCompanyName = () => {
    if (config.company === 'other') return config.customCompany || 'Startup';
    const c = COMPANIES.find((x) => x.value === config.company);
    return c ? c.label.split(' ').slice(1).join(' ') : config.company;
  };

  const getIndustryName = () => {
    if (config.industry === 'other') return config.customIndustry;
    const i = INDUSTRIES.find((x) => x.value === config.industry);
    return i ? i.label.split(' ').slice(1).join(' ') : config.industry;
  };

  const startInterview = async () => {
    setIsPreparing(true);
    setSetupError(null);

    try {
      const authToken = sessionStorage.getItem('authToken');
      if (!authToken) {
        navigate('/login');
        return;
      }

      const form = new FormData();
      form.append('company', getCompanyName());
      form.append('jobRole', config.jobRole);
      form.append('industry', getIndustryName());
      form.append('interviewType', config.interviewType);
      form.append('difficulty', config.difficulty);
      if (config.resumeFile) form.append('resume', config.resumeFile);

      const { data } = await axios.post(`${API_BASE}/api/interview/start`, form, {
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'multipart/form-data' },
      });

      setSessionId(data.sessionId);
      setInterviewId(data.interviewId);

      // Mic + audio playback must be armed from inside this click for autoplay.
      await session.start(data.sessionId, authToken);
      await startCamera();

      setStartedAt(Date.now());
      setStep('interview');
      setIsPreparing(false);

      // The stage has to exist before we can make it fullscreen.
      requestAnimationFrame(() => enterFullscreen());
    } catch (error) {
      console.error('❌ Error starting interview:', error);
      setSetupError(
        error.response?.data?.error ||
          error.message ||
          'Could not start the interview. Please try again.'
      );
      setIsPreparing(false);
    }
  };

  const endInterview = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;

    setIsAnalyzing(true);
    setStep('completed');

    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    videoStreamRef.current?.getTracks().forEach((t) => t.stop());
    videoStreamRef.current = null;
    setIsCameraOn(false);
    session.stop();

    try {
      const authToken = sessionStorage.getItem('authToken');
      const { data } = await axios.post(
        `${API_BASE}/api/interview/end`,
        { sessionId, interviewId },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setAnalysis(data.analysis);
    } catch (error) {
      console.error('❌ Error ending interview:', error);
      setSetupError(error.response?.data?.error || 'We could not analyze this interview.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [session, sessionId, interviewId]);

  // Alex called conclude_interview: let his closing line finish, then wrap up.
  useEffect(() => {
    if (!session.isComplete || step !== 'interview') return;
    let cancelled = false;
    (async () => {
      await session.waitForPlaybackDrain();
      if (!cancelled) endInterview();
    })();
    return () => { cancelled = true; };
  }, [session.isComplete, step, session, endInterview]);

  /* ---------------------------------------------------------------- */
  /* Setup screen                                                      */
  /* ---------------------------------------------------------------- */

  const selectCls =
    'w-full appearance-none rounded-xl border border-input bg-background/70 px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';
  const inputCls =
    'w-full rounded-xl border border-input bg-background/70 px-4 py-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';
  const labelCls = 'mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground';

  const startDisabled =
    isPreparing ||
    !config.jobRole ||
    !config.industry ||
    (config.company === 'other' && !config.customCompany.trim()) ||
    (config.industry === 'other' && !config.customIndustry.trim());

  const renderSetup = () => (
    <div className="mx-auto max-w-3xl">
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-7 text-white shadow-xl sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 size-56 rounded-full bg-black/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Mic className="size-7" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">AI Mock Interview</h1>
            <p className="mt-1 max-w-lg text-sm text-white/85 sm:text-base">
              A real spoken interview with Alex. Just talk — he listens, follows up, and gives you a
              detailed report at the end.
            </p>
          </div>
        </div>
      </div>

      {setupError && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/[0.07] p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Couldn't start the interview</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{setupError}</p>
          </div>
        </div>
      )}

      <GlassPanel className="space-y-6 p-5 sm:p-7">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls}>
              <Building2 className="size-4 text-primary" /> Target Company <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                className={selectCls}
                value={config.company}
                onChange={(e) => setConfig({ ...config, company: e.target.value, customCompany: '' })}
              >
                {COMPANIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              <Briefcase className="size-4 text-primary" /> Job Role <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g., Software Engineer, Data Analyst"
              value={config.jobRole}
              onChange={(e) => setConfig({ ...config, jobRole: e.target.value })}
            />
          </div>
        </div>

        {config.company === 'other' && (
          <div>
            <label className={labelCls}>Company Name <span className="text-rose-500">*</span></label>
            <input
              type="text"
              className={inputCls}
              placeholder="Enter company name"
              value={config.customCompany}
              onChange={(e) => setConfig({ ...config, customCompany: e.target.value })}
            />
          </div>
        )}

        <div>
          <label className={labelCls}>
            <Factory className="size-4 text-primary" /> Industry <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              className={selectCls}
              value={config.industry}
              onChange={(e) => setConfig({ ...config, industry: e.target.value, customIndustry: '' })}
            >
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
            <ChevronDownIcon />
          </div>
        </div>

        {config.industry === 'other' && (
          <div>
            <label className={labelCls}>Industry Name <span className="text-rose-500">*</span></label>
            <input
              type="text"
              className={inputCls}
              placeholder="Enter industry name"
              value={config.customIndustry}
              onChange={(e) => setConfig({ ...config, customIndustry: e.target.value })}
            />
          </div>
        )}

        <div>
          <label className={labelCls}>Interview Type</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {INTERVIEW_TYPES.map((t) => {
              const active = config.interviewType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setConfig({ ...config, interviewType: t.id })}
                  className={`group relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                    active
                      ? 'border-primary bg-primary/[0.06] shadow-md'
                      : 'border-border bg-card/60 hover:border-primary/40 hover:bg-primary/[0.03]'
                  }`}
                >
                  {t.badge && (
                    <span className="absolute right-2 top-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                      {t.badge}
                    </span>
                  )}
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <t.icon className="size-5" />
                  </span>
                  <span className="text-sm font-bold text-foreground">{t.title}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={labelCls}>Difficulty Level</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {DIFFICULTIES.map((d) => {
              const active = config.difficulty === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setConfig({ ...config, difficulty: d.id })}
                  className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all duration-200 ${
                    active ? 'border-primary bg-primary/[0.06] shadow-md' : 'border-border bg-card/60 hover:border-primary/40'
                  }`}
                >
                  <span className={`size-3 shrink-0 rounded-full ${d.dot}`} />
                  <span className="text-left">
                    <span className="block text-sm font-bold text-foreground">{d.title}</span>
                    <span className="block text-xs text-muted-foreground">{d.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={labelCls}>
            <Upload className="size-4 text-primary" /> Upload Resume
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Optional
            </span>
          </label>
          <div
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 ${
              config.resumeFile
                ? 'border-emerald-500/40 bg-emerald-500/[0.05]'
                : 'cursor-pointer border-border hover:border-primary/50 hover:bg-primary/[0.03]'
            }`}
            onClick={() => !config.resumeFile && document.getElementById('resumeUpload').click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file?.type === 'application/pdf') setConfig({ ...config, resumeFile: file });
            }}
          >
            <input
              id="resumeUpload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setConfig({ ...config, resumeFile: file });
              }}
            />
            {config.resumeFile ? (
              <>
                <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="size-6" />
                </div>
                <div className="text-sm font-semibold text-foreground">{config.resumeFile.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {(config.resumeFile.size / 1024).toFixed(2)} KB
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfig({ ...config, resumeFile: null });
                    const el = document.getElementById('resumeUpload');
                    if (el) el.value = '';
                  }}
                >
                  <XIcon className="size-4" /> Remove
                </Button>
              </>
            ) : (
              <>
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Upload className="size-6" />
                </div>
                <div className="text-sm font-semibold text-foreground">Click to upload or drag & drop</div>
                <div className="mt-1 max-w-xs text-xs text-muted-foreground">
                  PDF only (Max 5MB) — Alex will ask about your actual projects & experience
                </div>
              </>
            )}
          </div>
        </div>

        <Button
          variant="gradient"
          size="xl"
          className="w-full shadow-lg shadow-indigo-500/20"
          onClick={startInterview}
          disabled={startDisabled}
        >
          {isPreparing ? (
            <><Loader2 className="size-5 animate-spin" /> Connecting to Alex…</>
          ) : (
            <><Mic className="size-5" /> Start Interview</>
          )}
        </Button>
      </GlassPanel>

      <div className="mt-5 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Info className="size-4 text-blue-600 dark:text-blue-400" /> Before you start
        </h3>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            'Wear headphones — it stops Alex from hearing himself',
            'Allow microphone access when your browser asks',
            'Just talk naturally; Alex replies when you stop',
            'You can interrupt him mid-sentence, like a real call',
            'The interview goes fullscreen and ends on its own',
            'Press Esc any time to leave fullscreen',
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Interview stage (fullscreen)                                      */
  /* ---------------------------------------------------------------- */

  const renderInterview = () => {
    const s = STATUS_COPY[session.status] || STATUS_COPY.idle;
    const isSpeaking = session.status === 'speaking';
    const isListening = session.status === 'listening' && !session.isMuted;
    const level = Math.min(1, session.micLevel * 3);

    // Rough completion against the top of the difficulty's question range.
    const targetQuestions = { easy: 12, medium: 20, hard: 25 }[config.difficulty] || 20;
    const progressPct = Math.min(100, Math.round((session.questionNumber / targetQuestions) * 100));

    return (
      <div
        ref={stageRef}
        className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0a0d1a] text-white"
      >
        {/* Ambient light */}
        <div className="pointer-events-none absolute -left-40 -top-40 size-[32rem] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 size-[32rem] rounded-full bg-blue-500/15 blur-[120px]" />

        {/* Header */}
        <header className="relative z-10 flex items-center gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className={`size-2.5 rounded-full ${s.tone} ${session.status !== 'ended' ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-semibold">{s.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1 ${DIFFICULTY_STYLE[config.difficulty]}`}>
              {config.difficulty}
            </span>
            <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold tabular-nums ring-1 ring-white/10 sm:text-sm">
              {formatClock(elapsed)}
            </span>

            {/* A progress bar, not "Question 4 of 20" — a real interview doesn't
                announce a question number, and neither should the UI. */}
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 transition-[width] duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs font-medium text-white/50">{progressPct}%</span>
            </div>

            {!isFullscreen && (
              <button
                onClick={enterFullscreen}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold ring-1 ring-white/10 transition hover:bg-white/20"
              >
                <Maximize2 className="size-3.5" /> Fullscreen
              </button>
            )}
          </div>
        </header>

        {/* The mic is open but nothing is reaching us — from the candidate's
            side this is indistinguishable from "the AI is ignoring me". */}
        {session.micDead && !session.isMuted && (
          <div className="relative z-10 mx-5 flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/15 px-4 py-2.5 text-sm sm:mx-8">
            <MicOff className="mt-0.5 size-4 shrink-0 text-amber-300" />
            <span>
              <strong>We can't hear your microphone.</strong> Check it isn't muted in Windows, and that
              the right input device is selected in your browser's site settings — then just keep talking.
            </span>
          </div>
        )}

        {session.error && (
          <div className="relative z-10 mx-5 flex items-center gap-2.5 rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2.5 text-sm sm:mx-8">
            <AlertTriangle className="size-4 shrink-0 text-rose-300" />
            {session.error}
          </div>
        )}

        {/* Main */}
        <main className="relative z-10 flex min-h-0 flex-1 flex-col gap-6 px-5 pb-4 sm:px-8 lg:flex-row lg:gap-8">
          {/* Alex */}
          <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
            <InterviewerAvatar
              speaking={isSpeaking}
              listening={isListening}
              thinking={session.status === 'thinking'}
              level={session.micLevel}
            />

            <div className="text-center">
              <p className="text-xl font-bold tracking-tight">Alex</p>
              <p className="text-sm text-white/50">Senior Interviewer · {getCompanyName()}</p>

              {/* Once Gemini has actually transcribed us, say so — it kills the
                  "is this thing even on?" doubt for good. */}
              {session.heardYou && (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/20">
                  <CheckCircle2 className="size-3" /> Alex can hear you
                </span>
              )}
            </div>

            {/* Live captions */}
            {showCaptions && (
              <div className="min-h-[4.5rem] w-full max-w-2xl px-2">
                {session.liveAi ? (
                  <p className="rounded-2xl bg-white/[0.07] px-5 py-3.5 text-center text-base leading-relaxed ring-1 ring-white/10 sm:text-lg">
                    {session.liveAi}
                  </p>
                ) : session.liveUser ? (
                  <p className="rounded-2xl bg-emerald-500/10 px-5 py-3.5 text-center text-base leading-relaxed text-emerald-100 ring-1 ring-emerald-400/20 sm:text-lg">
                    {session.liveUser}
                  </p>
                ) : session.status === 'thinking' ? (
                  <p className="text-center text-sm text-white/35">Alex is thinking…</p>
                ) : session.isMuted ? (
                  <p className="text-center text-sm text-white/35">You're muted — unmute to answer</p>
                ) : (
                  // A live meter, so "is it even hearing me?" is answerable at a glance.
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-center text-sm text-white/35">Listening… just start speaking</p>
                    <span className="flex h-4 items-end gap-[3px]" aria-hidden>
                      {[0.15, 0.35, 0.55, 0.75, 0.95, 0.75, 0.55, 0.35, 0.15].map((t, i) => (
                        <span
                          key={i}
                          className={`w-[3px] rounded-full transition-all duration-75 ${
                            level > t ? 'bg-emerald-400' : 'bg-white/15'
                          }`}
                          style={{ height: `${4 + t * 12}px` }}
                        />
                      ))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Transcript */}
          {showTranscript && (
            <aside className="flex min-h-0 w-full flex-col rounded-2xl bg-white/[0.04] ring-1 ring-white/10 lg:w-[24rem] xl:w-[28rem]">
              <h2 className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5 text-sm font-bold">
                <MessageSquare className="size-4 text-blue-400" /> Transcript
              </h2>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {session.transcript.length === 0 && !session.liveAi && !session.liveUser && (
                  <p className="py-10 text-center text-sm text-white/35">
                    Every word — yours and Alex's — appears here as it's spoken.
                  </p>
                )}

                {session.transcript.map((m, i) => (
                  <TranscriptTurn
                    key={i}
                    role={m.role}
                    text={m.content}
                    timestamp={m.timestamp}
                    studentName={profileData?.name}
                  />
                ))}

                {/* In-flight speech, so you can watch your own words land */}
                {session.liveUser && (
                  <TranscriptTurn role="user" text={session.liveUser} live studentName={profileData?.name} />
                )}
                {session.liveAi && <TranscriptTurn role="assistant" text={session.liveAi} live />}

                <div ref={messagesEndRef} />
              </div>
            </aside>
          )}
        </main>

        {/* Self-view */}
        {isCameraOn && (
          <div className="absolute bottom-24 right-5 z-20 h-[7.5rem] w-[10rem] overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/15 sm:bottom-28 sm:right-8 sm:h-[9rem] sm:w-[12rem]">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            <span className="absolute bottom-1.5 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium">
              You
            </span>
          </div>
        )}

        {/* Control dock */}
        <footer className="relative z-30 flex items-center justify-center gap-2.5 border-t border-white/10 bg-black/30 px-5 py-4 backdrop-blur-xl sm:gap-3">
          <button
            onClick={session.toggleMute}
            title={session.isMuted ? 'Unmute' : 'Mute'}
            className={`relative flex items-center justify-center rounded-full p-3.5 transition-all ${
              session.isMuted
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20'
            }`}
          >
            {session.isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            {!session.isMuted && (
              <span
                className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-emerald-400 transition-opacity duration-100"
                style={{ opacity: level }}
              />
            )}
          </button>

          <button
            onClick={toggleCamera}
            title={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
            className={`flex items-center justify-center rounded-full p-3.5 transition-all ${
              isCameraOn
                ? 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20'
                : 'bg-white/5 text-white/50 ring-1 ring-white/10 hover:bg-white/10'
            }`}
          >
            {isCameraOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </button>

          <button
            onClick={() => setShowCaptions((v) => !v)}
            title={showCaptions ? 'Hide captions' : 'Show captions'}
            className={`flex items-center justify-center rounded-full p-3.5 transition-all ${
              showCaptions
                ? 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20'
                : 'bg-white/5 text-white/50 ring-1 ring-white/10 hover:bg-white/10'
            }`}
          >
            {showCaptions ? <Captions className="size-5" /> : <CaptionsOff className="size-5" />}
          </button>

          <button
            onClick={() => setShowTranscript((v) => !v)}
            title={showTranscript ? 'Hide transcript' : 'Show transcript'}
            className={`hidden items-center justify-center rounded-full p-3.5 transition-all lg:flex ${
              showTranscript
                ? 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20'
                : 'bg-white/5 text-white/50 ring-1 ring-white/10 hover:bg-white/10'
            }`}
          >
            <MessageSquare className="size-5" />
          </button>

          <button
            onClick={endInterview}
            className="ml-2 flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-900/40 transition hover:bg-rose-700"
          >
            <Flag className="size-4" /> End Interview
          </button>
        </footer>

        <p className="relative z-10 flex items-center justify-center gap-1.5 pb-3 text-[11px] text-white/30">
          <Headphones className="size-3.5" /> Headphones recommended · you can interrupt Alex any time
        </p>
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /* Results                                                           */
  /* ---------------------------------------------------------------- */

  const readinessLabel = (level) =>
    ({
      excellent: '🌟 Excellent',
      well_prepared: '✨ Well Prepared',
      ready: '👍 Ready',
      needs_improvement: '📈 Needs Improvement',
      not_ready: '🔄 Not Ready',
    }[level] || 'Overall Performance');

  const scoreHex = (s) => (s >= 75 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444');
  const scoreGrad = (s) =>
    s >= 75 ? 'from-emerald-500 to-teal-600' : s >= 60 ? 'from-amber-500 to-orange-600' : 'from-rose-500 to-red-600';

  const renderResults = () => (
    <div className="mx-auto max-w-4xl">
      {isAnalyzing ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
          <Loader2 className="mb-6 size-16 animate-spin text-primary" />
          <h2 className="mb-2 text-2xl font-extrabold text-foreground">Analyzing your interview…</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Reading back every answer you gave and scoring them against a {config.difficulty} bar.
          </p>
          <div className="mt-6 flex gap-1.5">
            {[0, 150, 300].map((d) => (
              <span key={d} className="size-2.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
      ) : setupError && !analysis ? (
        <div className="flex min-h-[380px] flex-col items-center justify-center rounded-3xl border border-rose-500/20 bg-rose-500/[0.05] p-10 text-center">
          <AlertTriangle className="mb-5 size-14 text-rose-500" />
          <h2 className="mb-2 text-2xl font-extrabold text-foreground">We couldn't analyze that interview</h2>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">{setupError}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/student-dashboard')}>
              <Home className="size-4" /> Dashboard
            </Button>
            <Button variant="gradient" onClick={() => window.location.reload()}>
              <RotateCcw className="size-4" /> Try Again
            </Button>
          </div>
        </div>
      ) : (
        analysis && (
          <div className="space-y-6">
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${scoreGrad(analysis.overallScore)} p-7 text-white shadow-xl sm:p-9`}>
              <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-10 size-56 rounded-full bg-black/10 blur-3xl" />
              <div className="relative">
                <h1 className="mb-6 flex items-center justify-center gap-2 text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
                  <BarChart3 className="size-7" /> Your Interview Results
                </h1>
                <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
                  <div className="flex size-40 shrink-0 flex-col items-center justify-center rounded-full bg-white shadow-2xl">
                    <span className="text-6xl font-black leading-none" style={{ color: scoreHex(analysis.overallScore) }}>
                      {analysis.overallScore}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">/ 100</span>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="inline-block rounded-full bg-white/20 px-6 py-3 text-xl font-bold capitalize backdrop-blur-md sm:text-2xl">
                      {readinessLabel(analysis.readinessLevel)}
                    </div>
                    <p className="mt-2 text-sm font-medium text-white/85">Interview Readiness Level</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 sm:p-6">
                <h3 className="mb-4 flex items-center gap-2.5 text-base font-bold text-emerald-700 dark:text-emerald-300">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15">
                    <TrendingUp className="size-4" />
                  </span>
                  Your Strengths
                </h3>
                <ul className="space-y-2.5">
                  {(analysis.strengthAreas || []).map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card p-3.5 text-sm text-foreground shadow-sm">
                      <span className="shrink-0">✅</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5 sm:p-6">
                <h3 className="mb-4 flex items-center gap-2.5 text-base font-bold text-amber-700 dark:text-amber-300">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15">
                    <TrendingUp className="size-4" />
                  </span>
                  Areas to Improve
                </h3>
                <ul className="space-y-2.5">
                  {(analysis.improvementAreas || []).map((a, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card p-3.5 text-sm text-foreground shadow-sm">
                      <span className="shrink-0">🔸</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {analysis.detailedScores && Object.keys(analysis.detailedScores).length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
                  <BarChart3 className="size-5 text-primary" /> Detailed Performance Breakdown
                </h3>
                <div className="space-y-4">
                  {Object.entries(analysis.detailedScores).map(([category, score]) => {
                    const val = Math.round(score);
                    const barHex = val >= 8 ? '#10b981' : val >= 6 ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={category} className="rounded-xl border border-border bg-muted/40 p-4">
                        <div className="mb-2.5 flex items-center justify-between">
                          <span className="text-sm font-semibold capitalize text-foreground">
                            {String(category).replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="rounded-lg bg-card px-2.5 py-1 text-sm font-bold shadow-sm" style={{ color: barHex }}>
                            {val}/10
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-[width] duration-1000 ease-out"
                            style={{ width: `${val * 10}%`, background: barHex }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {analysis.questionAnalysis?.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
                  <MessageSquare className="size-5 text-primary" /> Question-by-Question Analysis
                </h3>
                <div className="space-y-4">
                  {analysis.questionAnalysis.map((qa, idx) => (
                    <div key={idx} className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                          Q{qa.questionNumber}
                        </span>
                        <span className="text-sm font-bold" style={{ color: scoreHex((qa.score || 0) * 10) }}>
                          Score: {qa.score}/10
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-foreground">
                          <span className="font-semibold text-muted-foreground">Question: </span>{qa.question}
                        </p>
                        <p className="text-foreground">
                          <span className="font-semibold text-muted-foreground">Your Answer: </span>{qa.answer}
                        </p>
                        <p className="rounded-lg bg-card p-3 text-foreground">
                          <span className="font-semibold text-primary">Feedback: </span>{qa.feedback}
                        </p>
                      </div>
                      {qa.strengths?.length > 0 && (
                        <div className="mt-3 text-sm">
                          <span className="font-semibold text-emerald-600">✅ Strengths</span>
                          <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                            {qa.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {qa.improvements?.length > 0 && (
                        <div className="mt-3 text-sm">
                          <span className="font-semibold text-amber-600">📈 Improvements</span>
                          <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                            {qa.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.recommendations?.length > 0 && (
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-5 sm:p-6">
                <h3 className="mb-4 flex items-center gap-2.5 text-base font-bold text-indigo-700 dark:text-indigo-300">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/15">
                    <Sparkles className="size-4" />
                  </span>
                  Personalized Recommendations
                </h3>
                <ul className="space-y-2.5">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card p-3.5 text-sm text-foreground shadow-sm">
                      <span className="shrink-0 text-indigo-500">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.summaryFeedback && (
              <div className="rounded-2xl border border-border bg-muted/40 p-5 sm:p-6">
                <h3 className="mb-2.5 flex items-center gap-2 text-base font-bold text-foreground">
                  <MessageSquareQuote className="size-5 text-primary" /> Overall Summary
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{analysis.summaryFeedback}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/student-dashboard')}>
                <Home className="size-4" /> Back to Dashboard
              </Button>
              <Button variant="gradient" className="flex-1" onClick={() => window.location.reload()}>
                <RotateCcw className="size-4" /> Take Another Interview
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );

  if (!user) return null;

  // The interview stage owns the whole viewport, so it renders outside the portal chrome.
  if (step === 'interview') return renderInterview();

  return (
    <PortalLayout role="student" title="AI Mock Interview" user={profileData}>
      {step === 'setup' && renderSetup()}
      {step === 'completed' && renderResults()}
    </PortalLayout>
  );
};

export default RealtimeInterviewPage;
