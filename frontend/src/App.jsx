import React, { useState } from 'react';
import DotField from './components/DotField';
import {
  Shield,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  Sparkles,
  GitBranch,
  FileText,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function App() {
  const [showDemo, setShowDemo] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeCandidate, setActiveCandidate] = useState(0);
  const [searchHandle, setSearchHandle] = useState('alex-dev-sec');
  const [isSearching, setIsSearching] = useState(false);

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
        { source: 'GitHub API', detail: 'Public profile, 42 repos, Zero-Trust Architecture contributor.' },
        { source: 'YouTube API', detail: 'Keynote Speaker at CyberSec Summit 2024.' },
        { source: 'GPG Keyring', detail: 'Public GPG key matches committer email domain.' },
      ],
      conflict: {
        item: 'Institutional Affiliation',
        claimA: 'GitHub: Staff Security Engineer @ Nexus Defense',
        claimB: 'Conference: Head of Research @ CyberShield Labs',
        resolution: 'Requires Investigator Verification'
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
        { source: 'ArXiv Index', detail: 'Co-author on adversarial prompt smuggling research.' }
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
        { source: 'Public Web', detail: 'iOS Swift utility developer. Dissimilar discipline.' }
      ],
      conflict: null
    }
  ];

  const handleStartInvestigation = (e) => {
    e?.preventDefault();
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setShowDemo(true);
    }, 600);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white font-sans selection:bg-white selection:text-black">
      {/* 1. FULL-SCREEN MONOCHROME DOTFIELD BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <DotField
          dotRadius={1.5}
          dotSpacing={14}
          cursorRadius={500}
          cursorForce={0.1}
          bulgeOnly={true}
          bulgeStrength={67}
          glowRadius={160}
          sparkle={false}
          waveAmplitude={0}
          gradientFrom="rgba(255, 255, 255, 0.45)"
          gradientTo="rgba(255, 255, 255, 0.15)"
          glowColor="#000000"
        />
      </div>

      {/* 2. FLOATING TOP NAVBAR */}
      <header className="relative z-20 w-full pt-6 px-4 sm:px-8 pointer-events-none">
        <div className="max-w-4xl mx-auto h-14 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-xl px-5 flex items-center justify-between pointer-events-auto shadow-2xl shadow-black/80">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black shadow-md">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-wide text-white">PRISM</span>
          </div>

          {/* Nav Items */}
          <nav className="hidden sm:flex items-center gap-8 text-xs font-medium text-neutral-400">
            <button
              onClick={() => { setActiveTab('overview'); setShowModal(true); }}
              className="hover:text-white transition-colors"
            >
              Workflow
            </button>
            <button
              onClick={() => { setActiveTab('evidence'); setShowModal(true); }}
              className="hover:text-white transition-colors"
            >
              Evidence Model
            </button>
            <button
              onClick={() => { setActiveTab('architecture'); setShowModal(true); }}
              className="hover:text-white transition-colors"
            >
              Architecture
            </button>
          </nav>

          {/* Action */}
          <button
            onClick={() => setShowDemo(!showDemo)}
            className="px-4 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-semibold transition-all shadow-md transform hover:scale-[1.02]"
          >
            {showDemo ? 'Close Demo' : 'Investigate'}
          </button>
        </div>
      </header>

      {/* 3. HERO CENTER CONTENT */}
      <main className="relative z-10 w-full h-[calc(100vh-140px)] flex flex-col items-center justify-center px-4 sm:px-6 text-center">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.12] backdrop-blur-md mb-8">
          <span className="px-2 py-0.5 rounded-full bg-white text-black text-[10px] font-extrabold uppercase tracking-wider">
            NEW
          </span>
          <span className="text-xs text-neutral-300 font-medium">
            Evidence-First Digital Identity Intelligence
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.08] mb-8">
          Verify digital footprints that speak truth
        </h1>

        {/* Action Buttons */}
        <div className="flex items-center gap-3.5 mb-10">
          <button
            onClick={handleStartInvestigation}
            className="px-6 py-3 rounded-xl bg-white text-black hover:bg-neutral-200 font-semibold text-sm transition-all shadow-xl shadow-white/5 transform hover:scale-[1.02]"
          >
            {isSearching ? 'Correlating...' : 'Get started'}
          </button>

          <button
            onClick={() => setShowDemo(true)}
            className="px-6 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.12] backdrop-blur-md font-medium text-sm transition-all"
          >
            Live dossier
          </button>
        </div>

        {/* Subtext Tagline */}
        <p className="text-xs text-neutral-500 font-mono tracking-widest uppercase">
          Discover • Correlate • Verify • Explain
        </p>
      </main>

      {/* 4. BOTTOM RIGHT TOGGLE (MATCHING SCREENSHOT) */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-md">
        <span className="text-xs text-neutral-400 font-medium select-none">Demo Content</span>
        <button
          onClick={() => setShowDemo(!showDemo)}
          className={`w-10 h-5 rounded-full transition-colors relative p-0.5 flex items-center ${
            showDemo ? 'bg-white' : 'bg-neutral-800'
          }`}
          aria-label="Toggle Demo Content"
        >
          <div
            className={`w-4 h-4 rounded-full transition-transform ${
              showDemo ? 'translate-x-5 bg-black' : 'translate-x-0 bg-neutral-400'
            }`}
          />
        </button>
      </div>

      {/* 5. BOTTOM LEFT BADGE */}
      <div className="absolute bottom-6 left-6 z-20 hidden sm:flex items-center gap-2 text-xs font-mono text-neutral-500">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
        <span>NEURAX 3.0 • Domain 3: AI in Cybersecurity</span>
      </div>

      {/* 6. DEMO DOSSIER OVERLAY (WHEN TOGGLE IS ACTIVE) */}
      {showDemo && (
        <div className="fixed inset-0 z-30 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 transition-all">
          <div className="relative w-full max-w-3xl rounded-2xl bg-neutral-950 border border-white/20 p-6 sm:p-8 shadow-2xl shadow-black overflow-y-auto max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-white text-black font-bold">
                    INVESTIGATION DOSSIER
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">INV-2026-0919</span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  Multi-Candidate Verification Matrix
                </h2>
              </div>
              <button
                onClick={() => setShowDemo(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Candidate Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
              {candidates.map((c, idx) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCandidate(idx)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activeCandidate === idx
                      ? 'bg-white text-black border-white'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span>{c.id}</span>
                    <span className="font-bold">{c.confidence}</span>
                  </div>
                  <div className="font-bold text-sm truncate">{c.name}</div>
                  <div className="text-[11px] opacity-70 truncate font-mono">@{c.handle}</div>
                </button>
              ))}
            </div>

            {/* Active Candidate Details */}
            {(() => {
              const current = candidates[activeCandidate];
              return (
                <div className="space-y-5">
                  {/* Candidate Overview Card */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-base text-white">{current.name}</h3>
                        <p className="text-xs font-mono text-neutral-400">@{current.handle}</p>
                      </div>
                      <span className="text-xs font-mono px-2.5 py-1 rounded bg-white/[0.08] border border-white/15 text-white">
                        {current.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-white/10 text-neutral-300">
                      <div>
                        <span className="text-neutral-500 block">Education</span>
                        {current.education}
                      </div>
                      <div>
                        <span className="text-neutral-500 block">Primary Org</span>
                        {current.org}
                      </div>
                    </div>
                  </div>

                  {/* Conflict Alert If Applicable */}
                  {current.conflict && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/30 text-left">
                      <div className="flex items-center gap-2 text-white font-bold text-xs mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>CONFLICT DETECTED: {current.conflict.item}</span>
                      </div>
                      <div className="space-y-1 text-xs font-mono bg-black/60 p-3 rounded-lg border border-white/10">
                        <div className="text-neutral-300">• {current.conflict.claimA}</div>
                        <div className="text-neutral-300">• {current.conflict.claimB}</div>
                      </div>
                      <div className="mt-2 text-[11px] text-neutral-400">
                        Status: {current.conflict.resolution}
                      </div>
                    </div>
                  )}

                  {/* Evidence Records */}
                  <div>
                    <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-2">
                      Authenticated Evidence Records ({current.evidence.length})
                    </div>
                    <div className="space-y-2">
                      {current.evidence.map((ev, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-start justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono text-white font-semibold">{ev.source}:</span>{' '}
                            <span className="text-neutral-300">{ev.detail}</span>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5 ml-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 7. QUICK MODAL FOR WORKFLOW / EVIDENCE / ARCHITECTURE */}
      {showModal && (
        <div className="fixed inset-0 z-30 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl rounded-2xl bg-neutral-950 border border-white/20 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <h3 className="font-bold text-base text-white uppercase tracking-wider font-mono">
                {activeTab === 'overview' && 'Core Investigation Workflow'}
                {activeTab === 'evidence' && 'Evidence & Provenance Model'}
                {activeTab === 'architecture' && 'System Architecture'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-300 leading-relaxed space-y-4">
              {activeTab === 'overview' && (
                <>
                  <p>
                    PRISM ingests an authorized reference portrait and seed context, then initiates authenticated discovery queries across public endpoints (GitHub, YouTube, conferences).
                  </p>
                  <div className="p-3 bg-black rounded-lg border border-white/10 font-mono text-[11px] space-y-1">
                    <div>1. Ingest Consented Portrait + Context</div>
                    <div>2. Parallel Discovery across Public APIs</div>
                    <div>3. Generate Multiple Identity Hypotheses</div>
                    <div>4. Triangulate Education, Repos & Talks</div>
                    <div>5. Surface Institutional Conflicts & Evidence</div>
                  </div>
                </>
              )}

              {activeTab === 'evidence' && (
                <>
                  <p>
                    PRISM treats every finding as an evidence assertion with an immutable cryptographic URI. It explicitly separates user-provided claims from independently verified public proof.
                  </p>
                  <div className="p-3 bg-black rounded-lg border border-white/10 font-mono text-[11px] space-y-2">
                    <div className="text-white">✓ CORROBORATED: Validated by ≥2 independent sources</div>
                    <div className="text-neutral-400">⚠ CONFLICT: Contradicting claims flagged for manual review</div>
                    <div className="text-neutral-500">✕ COLLISION: Common-name mismatch eliminated</div>
                  </div>
                </>
              )}

              {activeTab === 'architecture' && (
                <>
                  <p>
                    Built with a clean separation of concerns: React 18 + Vite interface, FastAPI asynchronous Python orchestration gateway, and Groq LPU sub-second semantic reasoning.
                  </p>
                  <div className="p-3 bg-black rounded-lg border border-white/10 font-mono text-[11px]">
                    FastAPI Gateway ──► GitHub REST API + YouTube API ──► Groq LPU ──► Provenance Engine
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
