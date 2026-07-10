import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlassBackground from "../components/ui/GlassBackground";
import FadingVideo from "../components/ui/FadingVideo";
import LiquidGlass from "../components/ui/LiquidGlass";
import BlurText from "../components/ui/BlurText";
import Reveal from "../components/ui/Reveal";
import ParallaxOrbs from "../components/ui/ParallaxOrbs";
import ScrollProgress from "../components/ui/ScrollProgress";
import CountUp from "../components/ui/CountUp";
import { BRAND } from "../constants/brand";
import { BrandGlyph } from "../components/ui/BrandMark";
import {
  ArrowUpRight,
  ArrowRight,
  MaterialIcon,
  ICON_PATHS,
  Instagram,
  Twitter,
  LinkedIn,
  GlobeIcon,
} from "../components/ui/icons";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4";
const CAPABILITY_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_094631_d30ab262-45ee-4b7d-99f3-5d5848c8ef13.mp4";

const NAV_LINKS = [
  { label: "Platform", href: "#platform" },
  { label: "For You", href: "#audiences" },
  { label: "Outcomes", href: "#outcomes" },
  { label: "Journey", href: "#journey" },
  { label: "FAQ", href: "#faq" },
];

const RECRUITERS = ["Google", "Microsoft", "Amazon", "TCS", "Deloitte", "Infosys", "Accenture", "Wipro"];

const SOCIALS = [
  { Icon: Instagram, label: "Instagram", handle: "@nsecplacements", href: "https://instagram.com/nsecplacements" },
  { Icon: Twitter, label: "X (Twitter)", handle: "@nsecplacements", href: "https://x.com/nsecplacements" },
  { Icon: LinkedIn, label: "LinkedIn", handle: "NSEC Placement Cell", href: "https://www.linkedin.com/school/netaji-subhash-engineering-college/" },
  { Icon: GlobeIcon, label: "College Website", handle: "nsec.ac.in", href: "https://nsec.ac.in" },
];

const AUDIENCES = [
  {
    icon: ICON_PATHS.school,
    title: "For Students",
    body: "Build a standout profile, fix your resume with AI, rehearse interviews and clear aptitude rounds — then track every application in one place.",
    points: ["AI resume & interview prep", "Aptitude practice", "One-click NOC & applications"],
  },
  {
    icon: ICON_PATHS.work,
    title: "For Faculty & HOD",
    body: "Author tests, run drives, approve NOCs and broadcast notifications. Live analytics show exactly how each batch is performing.",
    points: ["Author & schedule tests", "Approve NOCs", "Batch-level analytics"],
  },
  {
    icon: ICON_PATHS.domain,
    title: "For Recruiters",
    body: "Discover screened, interview-ready talent with verified scores and resumes — and run campus drives without the spreadsheet chaos.",
    points: ["Verified candidate scores", "Faster shortlisting", "Seamless drives"],
  },
];

const CAPABILITIES = [
  {
    icon: ICON_PATHS.resume,
    title: "AI Resume Analyzer",
    body: "Upload a resume, get recruiter-grade feedback in seconds — ATS scoring, keyword gaps and section-by-section fixes tuned to your target role.",
    tags: ["ATS Score", "Keyword Match", "Instant Feedback", "Role-Aware"],
  },
  {
    icon: ICON_PATHS.interview,
    title: "AI Mock Interviews",
    body: "Practice realtime voice interviews with an AI panel. Get scored on clarity, content and confidence — with proctoring and full session playback.",
    tags: ["Realtime Voice", "Smart Scoring", "Proctored", "Playback"],
  },
  {
    icon: ICON_PATHS.test,
    title: "Aptitude Test Center",
    body: "Faculty-authored aptitude and coding rounds with timed batches, auto-grading and per-question analytics — exactly the way companies screen.",
    tags: ["Timed Batches", "Auto-Grade", "Analytics", "Anti-Cheat"],
  },
];

const FEATURES = [
  { icon: ICON_PATHS.resume, title: "Resume Intelligence", body: "ATS-aware scoring with actionable, role-specific suggestions." },
  { icon: ICON_PATHS.interview, title: "Realtime Interviews", body: "Voice-based AI mock panels with scoring and playback." },
  { icon: ICON_PATHS.test, title: "Aptitude & Coding", body: "Timed, auto-graded test batches with deep analytics." },
  { icon: ICON_PATHS.noc, title: "NOC Workflow", body: "Apply, approve and track No-Objection Certificates online." },
  { icon: ICON_PATHS.notify, title: "Smart Notifications", body: "Targeted announcements and deadline reminders that reach everyone." },
  { icon: ICON_PATHS.analytics, title: "Placement Analytics", body: "Live dashboards for students, faculty and the placement cell." },
];

const OUTCOMES = [
  { value: "95%", label: "Placement rate" },
  { value: "12 LPA", label: "Highest package" },
  { value: "4.6 LPA", label: "Average package" },
  { value: "180+", label: "Drives per year" },
];

const JOURNEY = [
  { step: "01", title: "Create your account", body: "Sign up with your @nsec.ac.in email, verify with OTP, and build your placement profile in minutes." },
  { step: "02", title: "Sharpen your edge", body: "Polish your resume with AI, drill aptitude tests, and rehearse interviews until you're recruiter-ready." },
  { step: "03", title: "Apply & get hired", body: "Request NOCs, track applications and get notified the moment opportunities open — all in one portal." },
];

const TESTIMONIALS = [
  { quote: "The AI mock interviews felt scarily real. By my third TCS round I wasn't nervous at all — I just knew what to say.", name: "Anuska Saha", role: "B.Tech CSE-AIML · Placed" },
  { quote: "Our placement cell finally runs without a hundred spreadsheets. Authoring a test and seeing live analytics is a game-changer.", name: "Dr. R. Banerjee", role: "Faculty · Placement Coordinator" },
  { quote: "The resume analyzer caught gaps three seniors missed. My callback rate genuinely doubled.", name: "Aditya Verma", role: "B.Tech IT · Final Year" },
];

const FAQS = [
  { q: "Who can use the portal?", a: "Any NSEC student with an @nsec.ac.in email, plus faculty, HODs and the placement cell. Recruiters are onboarded by the placement office." },
  { q: "How does sign-up work?", a: "Register with your college email, verify the OTP we send you, complete your profile, and you're in — it takes about two minutes." },
  { q: "Is the AI interview really realtime?", a: "Yes. It's a live voice conversation with an AI panel that scores clarity, content and confidence, with proctoring and full playback afterwards." },
  { q: "How is my data handled?", a: "Your resume, scores and profile stay within the college placement system and are only shared with recruiters when you apply." },
];

/* ------------------------------ Navbar ------------------------------ */
const Navbar = ({ navigate }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`ds-nav ds-nav-in fixed top-0 inset-x-0 z-50 px-4 sm:px-8 lg:px-16 py-3.5 ${
        scrolled ? "is-scrolled" : ""
      }`}
    >
      <nav className="mx-auto max-w-7xl flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3" aria-label={`${BRAND.name} home`}>
          <BrandGlyph size={36} />
          <span className="flex flex-col leading-none">
            <span className="font-heading italic text-xl text-white">{BRAND.name}</span>
            <span className="hidden sm:block text-[10px] uppercase tracking-[0.18em] text-white/55 font-body mt-0.5">
              {BRAND.org}
            </span>
          </span>
        </Link>

        <div className="hidden lg:flex liquid-glass rounded-full p-1.5">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-4 py-2 text-sm font-medium text-white/85 font-body rounded-full transition-colors hover:bg-white/10 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-white/85 rounded-full hover:bg-white/10 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="ds-cta-dark inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black whitespace-nowrap transition-transform hover:scale-[1.03]"
          >
            Get Started
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden liquid-glass flex h-11 w-11 items-center justify-center rounded-full text-white"
            aria-label="Toggle menu"
          >
            <span className="text-lg leading-none">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="lg:hidden mt-3 liquid-glass rounded-3xl p-3 flex flex-col">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="px-4 py-3 text-sm font-medium text-white/90 rounded-2xl hover:bg-white/10"
            >
              {l.label}
            </a>
          ))}
          <Link to="/login" className="px-4 py-3 text-sm font-medium text-white/90 rounded-2xl hover:bg-white/10">
            Sign In
          </Link>
        </div>
      )}
    </header>
  );
};

/* ------------------------------- Hero ------------------------------- */
const Hero = ({ navigate }) => {
  // Scroll parallax: background drifts slower than the page, foreground
  // content rises and gently fades as you scroll past the fold.
  const bgRef = useRef(null);
  const fgRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = Math.max(0, window.scrollY);
      if (bgRef.current) bgRef.current.style.transform = `translate3d(0, ${y * 0.32}px, 0)`;
      if (fgRef.current) {
        fgRef.current.style.transform = `translate3d(0, ${y * 0.14}px, 0)`;
        fgRef.current.style.opacity = String(Math.max(0, 1 - y / 620));
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section id="home" className="relative min-h-screen overflow-hidden bg-black">
      {/* Full-screen video biased to its lower content, with a cinematic
          slow zoom + scroll parallax on the wrapper. */}
      <div ref={bgRef} className="absolute inset-[-12%_0_-12%_0] z-0 overflow-hidden will-change-transform">
        <div className="absolute inset-0 ds-aurora" />
        <FadingVideo
          src={HERO_VIDEO}
          className="ds-kenburns absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "50% 78%" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,6,10,0.82) 0%, rgba(5,6,10,0.28) 30%, rgba(5,6,10,0.3) 58%, rgba(5,6,10,0.88) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar navigate={navigate} />

        {/* Top-aligned so nothing is clipped by the fixed nav */}
        <div ref={fgRef} className="flex-1 flex flex-col items-center px-6 text-center pt-32 md:pt-36 will-change-transform">
          <Reveal immediate delay={0.1}>
            <div className="liquid-glass inline-flex items-center gap-2 rounded-full pr-3 mb-8">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">New</span>
              <span className="text-sm text-white/90">2026 Placement Season is live</span>
            </div>
          </Reveal>

          <BlurText
            as="h1"
            center
            text="Built for the ambitious"
            className="text-5xl md:text-6xl lg:text-7xl font-heading italic text-white tracking-[-2px] leading-[0.95]"
          />

          <Reveal immediate delay={0.35}>
            <p className="mt-6 max-w-xl text-white/85 text-base md:text-lg leading-relaxed font-light">
              NSEC's all-in-one placement platform — AI resume reviews, realtime
              mock interviews and aptitude tests. Everything you need to go from
              student to hired.
            </p>
          </Reveal>

          {/* Primary CTAs */}
          <Reveal immediate delay={0.5}>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/signup"
                className="ds-cta-dark group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03]"
              >
                Create free account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
              </Link>
              <a
                href="#platform"
                className="ds-shimmer liquid-glass inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Explore the platform
              </a>
            </div>
          </Reveal>

          {/* Trust chips */}
          <Reveal immediate delay={0.65}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/65">
              {["Free for NSEC students", "2-minute setup", "Official placement cell portal"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <span className="text-emerald-300/90">✓</span> {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Scroll cue */}
        <Reveal immediate delay={0.85} className="flex justify-center pb-10">
          <a href="#platform" aria-label="Scroll down" className="ds-scrollcue flex flex-col items-center gap-1 text-white/60 hover:text-white">
            <span className="text-[10px] uppercase tracking-[0.24em]">Scroll</span>
            <span className="text-lg leading-none">↓</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
};

/* -------------------------- Recruiters strip ------------------------ */
const RecruitersStrip = () => (
  <section className="relative bg-[#05060a] overflow-hidden border-y border-white/10 py-10">
    <div className="ds-seam-glow" aria-hidden />
    <div className="relative flex flex-col items-center gap-5 px-4">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
        Trusted by recruiters hiring from our campus
      </span>
      <div className="ds-marquee-wrap w-full max-w-5xl overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
        <div className="ds-marquee gap-12 md:gap-16 pr-12 md:pr-16">
          {[...RECRUITERS, ...RECRUITERS].map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="font-heading italic text-2xl md:text-3xl text-white/60 whitespace-nowrap"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  </section>
);

/* ----------------------- Section background aura --------------------- */
/**
 * Layered premium backdrop for the dark sections: a colored gradient mesh,
 * a masked engineering grid (or dots) for texture, and a light seam at the
 * top edge so sections flow into each other instead of hard-cutting to black.
 * `variant` (1–3) staggers the light sources so neighbours differ.
 */
const SectionAura = ({ variant = 1, texture = "grid", seam = true }) => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className={`ds-mesh ds-mesh-${variant}`} />
    <div className={texture === "dots" ? "ds-dots" : "ds-grid"} />
    {seam && (
      <>
        <span className="ds-seam" />
        <span className="ds-seam-glow" />
      </>
    )}
  </div>
);

/* --------------------------- Section header -------------------------- */
const Kicker = ({ children }) => (
  <Reveal className="mb-5">
    <span className="inline-flex items-center gap-2.5">
      <span className="h-px w-8 bg-gradient-to-r from-brand-400 to-transparent" />
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-400 font-body">
        {children}
      </span>
    </span>
  </Reveal>
);

/* ---------------------------- Capabilities -------------------------- */
const Capabilities = () => (
  <section id="platform" className="relative min-h-screen overflow-hidden bg-[#05060a]">
    <GlassBackground video={CAPABILITY_VIDEO} overlay={0.55} />
    <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-12 lg:px-20 pt-24 pb-20 flex flex-col min-h-screen">
      <div className="mb-12">
        <Kicker>The Platform</Kicker>
        <BlurText
          as="h2"
          text="Placement prep, evolved"
          className="font-heading italic text-white text-5xl md:text-7xl lg:text-[5.5rem] leading-[0.9] tracking-[-3px] max-w-3xl"
        />
        <Reveal delay={0.2}>
          <p className="mt-5 max-w-xl text-base text-white/80 font-body font-light leading-relaxed">
            Every tool a student needs to get hired — and every tool faculty need
            to run drives — fused into one intelligent, beautiful workspace.
          </p>
        </Reveal>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        {CAPABILITIES.map((c, idx) => (
          <Reveal key={c.title} delay={0.15 * idx}>
            <LiquidGlass hover tilt className="h-full rounded-[1.25rem] p-6 min-h-[360px] flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <span className="liquid-glass flex h-11 w-11 items-center justify-center rounded-[0.75rem] text-white">
                  <MaterialIcon path={c.icon} className="h-6 w-6" />
                </span>
                <div className="flex flex-wrap justify-end gap-1.5 max-w-[72%]">
                  {c.tags.map((t) => (
                    <span key={t} className="liquid-glass rounded-full px-3 py-1 text-[11px] text-white/90 font-body whitespace-nowrap">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-1" />
              <div className="mt-6">
                <h3 className="font-heading italic text-white text-3xl md:text-4xl tracking-[-1px] leading-none">
                  {c.title}
                </h3>
                <p className="mt-3 text-sm text-white/90 font-body font-light leading-snug max-w-[34ch]">
                  {c.body}
                </p>
              </div>
            </LiquidGlass>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ----------------------------- Audiences --------------------------- */
const Audiences = () => (
  <section id="audiences" className="relative bg-[#05060a] overflow-hidden">
    <SectionAura variant={1} />
    <ParallaxOrbs variant={3} />
    <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12 lg:px-20 py-24">
      <div className="max-w-2xl">
        <Kicker>Built for the whole campus</Kicker>
        <BlurText
          as="h2"
          text="One platform, every placement role"
          className="font-heading italic text-white text-4xl md:text-6xl tracking-[-2px] leading-[0.95]"
        />
      </div>
      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
        {AUDIENCES.map((a, i) => (
          <Reveal key={a.title} delay={0.12 * i}>
            <LiquidGlass hover tilt className="h-full rounded-[1.25rem] p-7 flex flex-col">
              <span className="liquid-glass flex h-12 w-12 items-center justify-center rounded-[0.85rem] text-white">
                <MaterialIcon path={a.icon} className="h-6 w-6" />
              </span>
              <h3 className="mt-6 font-heading italic text-3xl text-white tracking-[-1px]">{a.title}</h3>
              <p className="mt-3 text-sm text-white/80 font-body font-light leading-snug">{a.body}</p>
              <ul className="mt-5 space-y-2">
                {a.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-white/85 font-body">
                    <span className="text-brand-400">✦</span> {p}
                  </li>
                ))}
              </ul>
            </LiquidGlass>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ---------------------------- Feature grid ------------------------- */
const Features = () => (
  <section className="relative bg-[#05060a] overflow-hidden">
    <SectionAura variant={2} texture="dots" />
    <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12 lg:px-20 py-24">
      <div className="text-center max-w-2xl mx-auto">
        <Kicker>Everything in one portal</Kicker>
        <BlurText
          as="h2"
          center
          text="Six tools. Zero spreadsheets."
          className="font-heading italic text-white text-4xl md:text-6xl tracking-[-2px] justify-center"
        />
      </div>
      <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={0.08 * i}>
            <LiquidGlass hover tilt className="h-full rounded-[1.25rem] p-6 flex items-start gap-4">
              <span className="liquid-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.75rem] text-white">
                <MaterialIcon path={f.icon} className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-heading italic text-2xl text-white tracking-[-0.5px] leading-none">{f.title}</h3>
                <p className="mt-2 text-sm text-white/75 font-body font-light leading-snug">{f.body}</p>
              </div>
            </LiquidGlass>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ----------------------------- Outcomes ---------------------------- */
const Outcomes = () => (
  <section id="outcomes" className="relative bg-[#05060a] overflow-hidden">
    <div className="absolute inset-0 ds-aurora opacity-60" />
    <SectionAura variant={3} seam={false} />
    <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12 lg:px-20 py-24">
      <div className="text-center">
        <Kicker>Outcomes</Kicker>
        <BlurText
          as="h2"
          center
          text="Numbers that change lives"
          className="font-heading italic text-white text-4xl md:text-6xl tracking-[-2px] justify-center"
        />
      </div>
      <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {OUTCOMES.map((o, i) => (
          <Reveal key={o.label} delay={0.1 * i}>
            <LiquidGlass hover tilt className="rounded-[1.25rem] p-6 text-center">
              <CountUp
                value={o.value}
                className="block font-heading italic text-4xl md:text-5xl text-white tracking-[-1px] leading-none"
              />
              <div className="mt-3 text-xs md:text-sm text-white/75 font-body font-light">{o.label}</div>
            </LiquidGlass>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ------------------------------ Journey ---------------------------- */
const Journey = () => (
  <section id="journey" className="relative bg-[#05060a] overflow-hidden">
    <SectionAura variant={2} />
    <ParallaxOrbs variant={2} />
    <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12 lg:px-20 py-24">
      <div className="max-w-2xl">
        <Kicker>The Journey</Kicker>
        <BlurText
          as="h2"
          text="From sign-up to hired in three steps"
          className="font-heading italic text-white text-4xl md:text-6xl tracking-[-2px] leading-[0.95]"
        />
      </div>
      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
        {JOURNEY.map((j, i) => (
          <Reveal key={j.step} delay={0.12 * i}>
            <LiquidGlass hover tilt className="rounded-[1.25rem] p-7 h-full">
              <div className="font-heading italic text-5xl text-white/40 leading-none">{j.step}</div>
              <h3 className="mt-6 font-heading italic text-2xl md:text-3xl text-white tracking-[-1px]">{j.title}</h3>
              <p className="mt-3 text-sm text-white/80 font-body font-light leading-snug">{j.body}</p>
            </LiquidGlass>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ---------------------------- Testimonials ------------------------- */
const Testimonials = () => (
  <section className="relative bg-[#05060a] overflow-hidden">
    <SectionAura variant={1} texture="dots" />
    <ParallaxOrbs variant={3} />
    <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12 lg:px-20 py-24">
      <div className="max-w-2xl">
        <Kicker>Loved on campus</Kicker>
        <BlurText
          as="h2"
          text="Real students. Real offers."
          className="font-heading italic text-white text-4xl md:text-6xl tracking-[-2px] leading-[0.95]"
        />
      </div>
      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={0.12 * i}>
            <LiquidGlass hover className="rounded-[1.25rem] p-7 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="font-heading italic text-5xl text-white/30 leading-none">“</div>
                <div className="flex gap-0.5 text-sm text-amber-300/90" aria-label="5 star rating">
                  {"★★★★★".split("").map((s, si) => (
                    <span key={si}>{s}</span>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-base text-white/90 font-body font-light leading-relaxed flex-1">{t.quote}</p>
              <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 font-body text-base font-semibold text-white ring-1 ring-white/25">
                  {t.name.charAt(0)}
                </span>
                <div>
                  <div className="font-heading italic text-xl text-white leading-tight">{t.name}</div>
                  <div className="text-xs text-white/60 font-body mt-0.5">{t.role}</div>
                </div>
              </div>
            </LiquidGlass>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* -------------------------------- FAQ ------------------------------ */
const FAQItem = ({ q, a, open, onToggle }) => (
  <LiquidGlass
    className={`rounded-2xl overflow-hidden glass-hover ${
      open ? "bg-white/[0.06]" : ""
    }`}
  >
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
    >
      <span className="font-body font-medium text-white text-sm md:text-base">{q}</span>
      <span
        className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full liquid-glass text-white/80 text-base transition-transform duration-300 ${
          open ? "rotate-45" : ""
        }`}
      >
        ＋
      </span>
    </button>
    <div
      className="grid transition-all duration-300 ease-out px-5"
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
    >
      <div className="overflow-hidden">
        <p className="pb-4 text-sm text-white/70 font-body font-light leading-relaxed max-w-2xl">{a}</p>
      </div>
    </div>
  </LiquidGlass>
);

const FAQ = () => {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section id="faq" className="relative bg-[#05060a] overflow-hidden">
      <SectionAura variant={3} />
      <ParallaxOrbs variant={2} />
      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12 lg:px-20 py-24">
        <div className="text-center max-w-2xl mx-auto">
          <Kicker>Questions</Kicker>
          <BlurText
            as="h2"
            center
            text="Everything you might ask"
            className="font-heading italic text-white text-4xl md:text-6xl tracking-[-2px] justify-center"
          />
        </div>
        <div className="mt-12 max-w-3xl mx-auto space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={0.06 * i}>
              <FAQItem q={f.q} a={f.a} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ----------------------------- Final CTA --------------------------- */
const FinalCTA = ({ navigate }) => (
  <section className="relative bg-[#05060a] overflow-hidden px-6 md:px-12 lg:px-20 pt-24 pb-10">
    <SectionAura variant={2} />
    <Reveal className="relative mx-auto max-w-6xl">
      <LiquidGlass strong className="relative overflow-hidden rounded-[2rem] px-8 md:px-16 py-20 text-center">
        <div className="absolute inset-0 ds-aurora opacity-70" />
        <div className="relative z-10 flex flex-col items-center">
          <h2 className="font-heading italic text-white text-4xl md:text-6xl lg:text-7xl tracking-[-2px] leading-[0.9] max-w-3xl">
            Your dream offer starts here
          </h2>
          <p className="mt-5 max-w-xl text-base md:text-lg text-white/85 font-body font-light">
            Join thousands of NSEC students turning preparation into placements.
            It takes two minutes to begin.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate("/signup")}
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition-transform hover:scale-[1.03]"
            >
              Create free account
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="ds-shimmer liquid-glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium text-white"
            >
              Sign In
            </button>
          </div>
        </div>
      </LiquidGlass>
    </Reveal>
  </section>
);

/* ------------------------------ Footer ----------------------------- */
const Footer = () => (
  <footer className="relative bg-[#05060a] px-6 md:px-12 lg:px-20 pt-16 pb-10 border-t border-white/10 overflow-hidden">
    <SectionAura variant={3} seam={false} />
    <div className="relative mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-10">
      <div className="col-span-2 md:col-span-1">
        <div className="flex items-center gap-3">
          <BrandGlyph size={36} />
          <span className="font-heading italic text-xl text-white">{BRAND.name}</span>
        </div>
        <p className="mt-4 text-sm text-white/60 font-body font-light max-w-xs">
          {BRAND.tagline} The official placement platform of Netaji Subhash
          Engineering College.
        </p>

        {/* Socials — with proper names */}
        <div className="mt-6 flex flex-col gap-2.5">
          {SOCIALS.map(({ Icon, label, handle, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="group inline-flex items-center gap-3 text-sm font-body text-white/60 transition-colors hover:text-white"
            >
              <span className="liquid-glass flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors group-hover:bg-white/10 group-hover:text-white">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                {label}
                <span className="text-white/35 transition-colors group-hover:text-white/60"> · {handle}</span>
              </span>
            </a>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-white/90 font-body mb-3">Platform</h4>
        <ul className="space-y-2 text-sm text-white/60 font-body">
          {NAV_LINKS.map((l) => (
            <li key={l.label}><a href={l.href} className="hover:text-white">{l.label}</a></li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-white/90 font-body mb-3">Account</h4>
        <ul className="space-y-2 text-sm text-white/60 font-body">
          <li><Link to="/login" className="hover:text-white">Sign In</Link></li>
          <li><Link to="/signup" className="hover:text-white">Create account</Link></li>
          <li><Link to="/forgot-password" className="hover:text-white">Forgot password</Link></li>
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-white/90 font-body mb-3">Contact</h4>
        <ul className="space-y-2 text-sm text-white/60 font-body">
          <li>Placement Cell, NSEC</li>
          <li>Garia, Kolkata 700152</li>
          <li>placement@nsec.ac.in</li>
        </ul>
      </div>
    </div>

    <div className="relative mx-auto max-w-7xl mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-xs text-white/40 font-body">
        © {new Date().getFullYear()} {BRAND.org}. All rights reserved.
      </p>
      <p className="text-xs text-white/40 font-body">{BRAND.kicker}</p>
    </div>
  </footer>
);

/* ------------------------------- Page ------------------------------ */
const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="ds-scope bg-[#05060a] font-body text-white antialiased">
      <ScrollProgress />
      <Hero navigate={navigate} />
      <RecruitersStrip />
      <Capabilities />
      <Audiences />
      <Features />
      <Outcomes />
      <Journey />
      <Testimonials />
      <FAQ />
      <FinalCTA navigate={navigate} />
      <Footer />
    </div>
  );
};

export default LandingPage;
