import React, { useState, useEffect } from 'react';
import DotField from './components/DotField';
import logoImg from './assets/logo.png';
import dashImg from './assets/dash.png';
import SignInPageDemo from './components/ui/demo';
import Dashboard from './components/Dashboard';
import { ContainerScroll } from './components/ui/container-scroll-animation';
import TargetCursor from './components/ui/TargetCursor';
import BlurText from './components/ui/BlurText';
import TextType from './components/ui/TextType';
import GlitchText from './components/ui/GlitchText';
import FoldText from './components/ui/FoldText';
import Shuffle from './components/ui/Shuffle';
import { auth, signOut, onAuthStateChanged } from './lib/firebase';
import {
  Shield,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  GitBranch,
  FileText,
  Activity,
  Layers,
  ChevronDown,
  Lock,
  ArrowUp,
  LogIn,
  LogOut,
  User,
  LayoutDashboard
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'login'
  const [activeCandidate, setActiveCandidate] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setCurrentView((prev) => (prev === 'login' ? 'dashboard' : prev));
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  const candidates = [
    {
      id: 'CAND-01',
      name: 'Alex Kumar',
      handle: 'alex-dev-sec',
      tag: 'Primary Match',
      confidence: '86%',
      status: 'Corroborated with Conflict',
      org: 'Nexus Defense / CyberShield Labs',
      education: 'Stanford Institute of Tech',
      evidence: [
        { source: 'Developer Registry', detail: '42 public repositories, Zero-Trust Architecture contributor.' },
        { source: 'Conference Recording', detail: 'Keynote Speaker at CyberSec Summit 2024.' },
        { source: 'Public GPG Keyring', detail: 'GPG Key matches committer corporate email domain.' },
      ],
      conflict: {
        item: 'Institutional Affiliation',
        claimA: 'Public Bio: Staff Security Engineer @ Nexus Defense',
        claimB: 'Conference Registry: Head of Research @ CyberShield Labs',
        resolution: 'Flagged for Human Investigator Verification'
      }
    },
    {
      id: 'CAND-02',
      name: 'Alex Kumar (Academic)',
      handle: 'alex-dev-sec_research',
      tag: 'Hypothesis',
      confidence: '62%',
      status: 'Unverified Hypothesis',
      org: 'Open Security Foundation',
      education: 'MIT CSAIL',
      evidence: [
        { source: 'Scholarly Index', detail: 'Co-author on adversarial prompt smuggling research.' }
      ],
      conflict: null
    },
    {
      id: 'CAND-03',
      name: 'Alex R. Kumar',
      handle: 'alex-dev-sec-dev',
      tag: 'Collision',
      confidence: '31%',
      status: 'Rejected Collision',
      org: 'FinTech Systems Inc',
      education: 'University of Waterloo',
      evidence: [
        { source: 'Public Web', detail: 'iOS Swift utility developer. Dissimilar technical discipline.' }
      ],
      conflict: null
    }
  ];

  const handleStartInvestigation = () => {
    if (!currentUser) {
      setCurrentView('login');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setCurrentView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id) => {
    if (currentView !== 'landing') {
      setCurrentView('landing');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // If user navigated to Dashboard view
  if (currentView === 'dashboard') {
    return (
      <>
        <TargetCursor spinDuration={2} hideDefaultCursor={true} parallaxOn={true} />
        <Dashboard
          currentUser={currentUser}
          onSignOut={() => {
            handleSignOut();
            setCurrentView('landing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBackToHome={() => {
            setCurrentView('landing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </>
    );
  }

  // If user navigated to Login view
  if (currentView === 'login') {
    return (
      <>
        <TargetCursor spinDuration={2} hideDefaultCursor={true} parallaxOn={true} />
        <SignInPageDemo
          onBackToHome={() => {
            setCurrentView('landing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            setCurrentView('dashboard');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      <TargetCursor spinDuration={2} hideDefaultCursor={true} parallaxOn={true} />
      {/* 1. FULL-PAGE FIXED MONOCHROME DOTFIELD BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-auto">
        <DotField
          dotRadius={1.5}
          dotSpacing={15}
          cursorRadius={500}
          cursorForce={0.1}
          bulgeOnly={true}
          bulgeStrength={65}
          glowRadius={160}
          sparkle={false}
          waveAmplitude={0}
          gradientFrom="rgba(255, 255, 255, 0.40)"
          gradientTo="rgba(255, 255, 255, 0.12)"
          glowColor="#000000"
        />
      </div>

      {/* 2. FLOATING TOP NAVBAR */}
      <header className="sticky top-0 z-40 w-full pt-5 px-4 sm:px-8 pointer-events-none">
        <div className="max-w-4xl mx-auto h-14 rounded-full bg-black/60 border border-white/10 backdrop-blur-xl px-5 flex items-center justify-between pointer-events-auto shadow-2xl shadow-black">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1 shadow-md transition-transform duration-300 hover:scale-105">
              <img src={logoImg} alt="PRISM Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm tracking-wider text-white">PRISM</span>
          </div>

          {/* Navigation Items */}
          <nav className="hidden sm:flex items-center gap-7 text-xs font-medium text-neutral-400">
            <button
              onClick={() => scrollToSection('workflow')}
              className="hover:text-white transition-colors duration-200"
            >
              Workflow
            </button>
            <button
              onClick={() => scrollToSection('evidence-model')}
              className="hover:text-white transition-colors duration-200"
            >
              Evidence Model
            </button>
            <button
              onClick={() => scrollToSection('architecture')}
              className="hover:text-white transition-colors duration-200"
            >
              Platform Architecture
            </button>
          </nav>

          {/* Auth State in Navbar */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCurrentView('dashboard');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-semibold transition-all duration-200 shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-7 h-7 rounded-full border border-white/20 object-cover cursor-pointer"
                    onClick={() => {
                      setCurrentView('dashboard');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                ) : (
                  <div
                    onClick={() => {
                      setCurrentView('dashboard');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
                <span className="text-xs font-medium text-neutral-300 hidden md:inline truncate max-w-[100px]">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setCurrentView('login');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-semibold transition-all duration-200 shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative z-10 min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 sm:px-6 text-center pt-8 pb-16">
        {/* Subtitle Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/15 backdrop-blur-md mb-8 transition-transform duration-300 hover:scale-105">
          <span className="px-2 py-0.5 rounded-full bg-white text-black text-[10px] font-extrabold uppercase tracking-wider">
            PLATFORM
          </span>
          <span className="text-xs text-neutral-300 font-medium">
            Evidence-First Digital Identity Intelligence
          </span>
        </div>

        {/* Main Headline */}
        <div className="max-w-4xl mb-8 flex justify-center text-center">
          <Shuffle
            text="Verify digital footprints that speak truth"
            tag="h1"
            shuffleDirection="right"
            duration={0.35}
            animationMode="evenodd"
            shuffleTimes={2}
            ease="power3.out"
            stagger={0.02}
            threshold={0.05}
            rootMargin="0px"
            triggerOnce={false}
            triggerOnHover={true}
            scrambleCharset="!@#$%0123456789ABCDEF"
            style={{
              fontSize: 'clamp(2.5rem, 5.5vw, 4.75rem)',
              lineHeight: 1.08,
              fontWeight: 800,
              letterSpacing: '-0.03em'
            }}
            className="font-extrabold tracking-tight text-white leading-[1.08]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-10">
          <button
            onClick={handleStartInvestigation}
            className="px-6 py-3 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold text-sm transition-all duration-300 shadow-xl shadow-white/5 hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span>{isSearching ? 'Correlating...' : currentUser ? 'Launch Investigation' : 'Get started'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => scrollToSection('demo-section')}
            className="px-6 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/15 backdrop-blur-md font-medium text-sm transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Live dossier
          </button>
        </div>

        {/* Tagline */}
        <p className="text-xs text-neutral-400 font-mono tracking-widest uppercase mb-12">
          Discover • Correlate • Verify • Explain
        </p>

        {/* Scroll Indicator */}
        <button
          onClick={() => scrollToSection('scroll-animation-section')}
          className="flex flex-col items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors duration-200 animate-bounce"
        >
          <span>Scroll to explore</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </section>

      {/* 3.5 CONTAINER SCROLL ANIMATION (using dash.png) */}
      <section id="scroll-animation-section" className="relative z-10 -mt-12 md:-mt-28 overflow-hidden px-4">
        <ContainerScroll
          titleComponent={
            <div className="space-y-4 mb-8">
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-white/10 text-neutral-300 border border-white/15 backdrop-blur-md">
                Cross-Platform Telemetry
              </span>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-tight min-h-[3.5rem] flex items-center justify-center">
                <TextType
                  text="Cryptographic Identity Attestation"
                  as="span"
                  typingSpeed={35}
                  loop={false}
                  showCursor={true}
                  cursorCharacter="|"
                  cursorClassName="text-white font-mono ml-1 opacity-80"
                  className="inline-block text-white font-extrabold tracking-tight"
                />
              </h2>
              <div className="pt-2 pb-1 flex items-center justify-center">
                <GlitchText
                  speed={0.8}
                  enableShadows={true}
                  enableOnHover={false}
                  className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-200"
                >
                  Proven Across Public Registries
                </GlitchText>
              </div>
            </div>
          }
        >
          <img
            src={dashImg}
            alt="PRISM Digital Identity Intelligence Dashboard"
            className="mx-auto rounded-2xl object-cover h-full w-full object-center shadow-2xl border border-white/10"
            draggable={false}
          />
        </ContainerScroll>
      </section>

      {/* 4. WORKFLOW SECTION */}
      <section id="workflow" className="relative z-10 py-24 px-4 sm:px-8 max-w-5xl mx-auto border-t border-white/10">
        <div className="mb-14 text-center sm:text-left">
          <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold block mb-1">
            01 / Investigation Pipeline
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            <FoldText
              text="Workflow"
              trigger="scroll"
              hinge="top"
              duration={0.6}
              stagger={0.035}
              ease="power3.out"
              fontSize="inherit"
              fontWeight={800}
              color="#ffffff"
            />
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xl">
            From consented image ingestion and public discovery to multi-candidate evaluation and conflict resolution.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/30">
            <div className="font-mono text-xs text-white/50 mb-2">STAGE 01</div>
            <h3 className="font-bold text-sm text-white mb-2">Consented Ingestion</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Ingests authorized reference portrait, user profile, and seed hints (School, College, Organization).
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/30">
            <div className="font-mono text-xs text-white/50 mb-2">STAGE 02</div>
            <h3 className="font-bold text-sm text-white mb-2">Multi-Discovery</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Dispatches authenticated discovery across code repositories, recorded technical presentations, and open registries.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/30">
            <div className="font-mono text-xs text-white/50 mb-2">STAGE 03</div>
            <h3 className="font-bold text-sm text-white mb-2">Candidate Evaluation</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Generates Candidates 1–4, evaluates context overlap, and triggers clarifying questions if uncertain.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/30">
            <div className="font-mono text-xs text-white/50 mb-2">STAGE 04</div>
            <h3 className="font-bold text-sm text-white mb-2">Verification Dossier</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Surfaces active institutional conflicts, builds relationship graphs, and exports immutable evidence.
            </p>
          </div>
        </div>
      </section>

      {/* 5. LIVE DOSSIER & MULTI-CANDIDATE SANDBOX */}
      <section id="demo-section" className="relative z-10 py-24 px-4 sm:px-8 max-w-5xl mx-auto border-t border-white/10">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold block mb-1">
              Interactive Platform Demonstration
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              <FoldText
                text="Multi-Candidate Dossier"
                trigger="scroll"
                hinge="top"
                duration={0.6}
                stagger={0.03}
                ease="power3.out"
                fontSize="inherit"
                fontWeight={800}
                color="#ffffff"
              />
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2">
              Select competing identity hypotheses to inspect evidence weights and conflict detection:
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 font-mono text-xs text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            Case: Alex Kumar
          </div>
        </div>

        {/* Candidate Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {candidates.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => setActiveCandidate(idx)}
              className={`p-4 rounded-xl border text-left transition-all duration-300 ${
                activeCandidate === idx
                  ? 'bg-white text-black border-white shadow-xl scale-[1.02]'
                  : 'glass-panel text-neutral-300 hover:border-white/25'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span>{c.id}</span>
                <span className="font-bold">{c.confidence}</span>
              </div>
              <div className="font-bold text-sm truncate">{c.name}</div>
              <div className="text-xs opacity-75 font-mono truncate">@{c.handle}</div>
            </button>
          ))}
        </div>

        {/* Active Candidate Detail Card */}
        {(() => {
          const current = candidates[activeCandidate];
          return (
            <div className="glass-panel-glow p-6 sm:p-8 rounded-2xl space-y-6 transition-all duration-300">
              {/* Snapshot Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-bold text-white">{current.name}</h3>
                  <p className="text-xs font-mono text-neutral-400">@{current.handle}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-medium">
                    {current.status}
                  </span>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-white text-black">
                    Match: {current.confidence}
                  </span>
                </div>
              </div>

              {/* Education & Org */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-neutral-300 pb-2">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-neutral-500 block mb-1">EDUCATION RECORD</span>
                  <span className="text-white font-medium">{current.education}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-neutral-500 block mb-1">PRIMARY AFFILIATION</span>
                  <span className="text-white font-medium">{current.org}</span>
                </div>
              </div>

              {/* Conflict Alert Callout */}
              {current.conflict && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/25 text-left">
                  <div className="flex items-center gap-2 text-white font-bold text-xs mb-2">
                    <AlertTriangle className="w-4 h-4 text-white" />
                    <span>CONFLICT DETECTED: {current.conflict.item}</span>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono bg-black/60 p-3 rounded-lg border border-white/10 text-neutral-300">
                    <div>• {current.conflict.claimA}</div>
                    <div>• {current.conflict.claimB}</div>
                  </div>
                  <div className="mt-2 text-[11px] text-neutral-400">
                    Resolution: {current.conflict.resolution}
                  </div>
                </div>
              )}

              {/* Evidence Records */}
              <div>
                <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-3">
                  Verified Public Evidence Records ({current.evidence.length})
                </span>
                <div className="space-y-2">
                  {current.evidence.map((ev, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-start justify-between text-xs transition-colors hover:border-white/20"
                    >
                      <div>
                        <span className="font-mono text-white font-semibold">{ev.source}:</span>{' '}
                        <span className="text-neutral-300">{ev.detail}</span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5 ml-3" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* 6. EVIDENCE MODEL SECTION */}
      <section id="evidence-model" className="relative z-10 py-24 px-4 sm:px-8 max-w-5xl mx-auto border-t border-white/10">
        <div className="mb-14 text-center sm:text-left">
          <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold block mb-1">
            02 / Grounded Epistemology
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            <FoldText
              text="Evidence Model"
              trigger="scroll"
              hinge="top"
              duration={0.6}
              stagger={0.035}
              ease="power3.out"
              fontSize="inherit"
              fontWeight={800}
              color="#ffffff"
            />
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xl">
            Claims are unverified hypotheses. Only multi-source authenticated endpoints elevate assertions to confirmed status.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Example 1 */}
          <div className="glass-panel p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-white">
                Multi-Source Corroboration
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-white text-black font-bold">
                VERIFIED
              </span>
            </div>
            <p className="text-sm font-semibold text-white mb-3">
              Finding: "Subject is lead contributor on zero-trust-proxy"
            </p>
            <div className="space-y-2 text-xs font-mono bg-black/60 p-3.5 rounded-xl border border-white/10 text-neutral-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                <span>Code Registry: Repository created and committed by @alex-dev-sec.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                <span>Conference Keynote: Presentation on zero-trust-proxy given at CyberSec 2024.</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-neutral-400">
              Status: Validated by 2 independent public endpoints. High confidence score assigned.
            </div>
          </div>

          {/* Example 2 */}
          <div className="glass-panel p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-wider font-bold text-neutral-300">
                Institutional Discrepancy
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded border border-white/40 text-white font-bold">
                CONFLICT
              </span>
            </div>
            <p className="text-sm font-semibold text-white mb-3">
              Finding: "Current Primary Corporate Employer"
            </p>
            <div className="space-y-2 text-xs font-mono bg-black/60 p-3.5 rounded-xl border border-white/10 text-neutral-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                <span>Source A (Public Bio): "Staff Security Engineer @ Nexus Defense"</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                <span>Source B (Conference Bio): "Head of Research @ CyberShield Labs"</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-neutral-400">
              Status: Mutually exclusive institutional affiliations. Confidence downgraded until analyst confirms.
            </div>
          </div>
        </div>
      </section>

      {/* 7. PLATFORM ARCHITECTURE SECTION */}
      <section id="architecture" className="relative z-10 py-24 px-4 sm:px-8 max-w-5xl mx-auto border-t border-white/10">
        <div className="mb-14 text-center sm:text-left">
          <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold block mb-1">
            03 / Platform Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            <FoldText
              text="Platform Capabilities"
              trigger="scroll"
              hinge="top"
              duration={0.6}
              stagger={0.03}
              ease="power3.out"
              fontSize="inherit"
              fontWeight={800}
              color="#ffffff"
            />
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-xl">
            Core functional intelligence layers designed for high-assurance entity resolution and zero private account intrusion.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="glass-panel p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/30">
            <div className="font-mono text-xs text-white/50 mb-2">LAYER 01</div>
            <h3 className="font-bold text-sm text-white mb-2">Ingestion & Discovery</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Dispatches authenticated queries across public developer footprints, recorded technical presentations, and academic registries based on consented seed input.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/30">
            <div className="font-mono text-xs text-white/50 mb-2">LAYER 02</div>
            <h3 className="font-bold text-sm text-white mb-2">Context Triangulation Core</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Correlates disparate usernames, educational backgrounds, and institutional affiliations into multi-candidate clusters rather than speculative single matches.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/30">
            <div className="font-mono text-xs text-white/50 mb-2">LAYER 03</div>
            <h3 className="font-bold text-sm text-white mb-2">Provenance & Conflict Engine</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Maintains cryptographic evidence hashes, calculates explainable confidence scores, and immediately alerts investigators to conflicting claims.
            </p>
          </div>
        </div>

        {/* Ethical Boundaries Card */}
        <div className="glass-panel p-6 rounded-2xl text-xs space-y-3">
          <div className="font-mono font-bold text-white uppercase flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Strict Operational Boundaries (Zero-Trust)</span>
          </div>
          <p className="text-neutral-400 leading-relaxed">
            PRISM operates strictly on organizer-consented seed imagery and authenticated, publicly indexed endpoints. The platform enforces an absolute zero-tolerance policy against private account intrusion, credential theft, password spraying, and leaked or dark-web databases.
          </p>
        </div>
      </section>

      {/* 8. MINIMAL FOOTER */}
      <footer className="relative z-10 py-12 border-t border-white/10 bg-black text-xs text-neutral-500">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center p-0.5 shadow-sm">
              <img src={logoImg} alt="PRISM Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-white font-bold tracking-wider">PRISM</span>
            <span>• Digital Identity Intelligence Platform</span>
          </div>

          <div className="flex items-center gap-6">
            {!currentUser ? (
              <button
                onClick={() => {
                  setCurrentView('login');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={handleSignOut}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            )}
            <a
              href="https://github.com/abdulkani007/PRISM"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
              title="Back to Top"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
