import React, { useState } from 'react';
import DotField from './components/DotField';
import {
  Shield,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Cpu,
  Layers,
  GitBranch,
  Terminal,
  ArrowRight,
  Lock,
  Eye,
  HelpCircle,
  Activity,
  FileText,
  Sparkles,
  Database,
  Network,
  ChevronRight,
  Building,
  GraduationCap,
  Briefcase,
  Play,
  RotateCcw,
  Sliders
} from 'lucide-react';

export default function App() {
  const [activeCandidate, setActiveCandidate] = useState(0);
  const [searchHandle, setSearchHandle] = useState('alex-dev-sec');
  const [searchTarget, setSearchTarget] = useState('Alex Kumar');
  const [searchOrg, setSearchOrg] = useState('Nexus Defense');
  const [searchCollege, setSearchCollege] = useState('Stanford Institute of Technology');
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Mock candidates evaluated by PRISM multi-candidate engine
  const candidates = [
    {
      id: 'CAND-01',
      name: 'Alex Kumar',
      handle: 'alex-dev-sec',
      tag: 'Primary Match',
      confidence: 86,
      status: 'CORROBORATED WITH CONFLICTS',
      statusColor: 'amber',
      education: 'Stanford Institute of Technology',
      organization: 'Nexus Defense / CyberShield Labs',
      role: 'Staff Security Engineer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      evidenceCount: 6,
      conflictsCount: 1,
      evidence: [
        {
          id: 'EV-01',
          source: 'GitHub API (Verified Profile)',
          type: 'authenticated_rest_api',
          url: 'https://api.github.com/users/alex-dev-sec',
          observed: '2026-09-19T12:00Z',
          fact: "Bio states: 'DevSecOps & Zero-Trust Architecture Researcher'. 42 public repositories.",
          weight: '0.92',
          verified: true
        },
        {
          id: 'EV-02',
          source: 'YouTube Data API (Talk Recording)',
          type: 'conference_stream',
          url: 'https://youtube.com/watch?v=ref-talk-2024',
          observed: '2026-09-19T12:05Z',
          fact: "Speaker at Global CyberSec Summit 2024: 'Autonomous Zero-Trust Pipelines'.",
          weight: '0.88',
          verified: true
        },
        {
          id: 'EV-03',
          source: 'Public GPG Keyring',
          type: 'cryptographic_key',
          url: 'https://keys.openpgp.org/search?q=alex-dev-sec',
          observed: '2026-09-19T12:06Z',
          fact: "GPG Key 0x48A2BF matches committer email 'alex@nexusdefense.io'.",
          weight: '0.95',
          verified: true
        }
      ],
      conflict: {
        id: 'CONF-8821',
        attribute: 'Current Primary Institutional Affiliation',
        claimA: 'Staff Security Engineer @ Nexus Defense',
        sourceA: 'GitHub Profile Bio & Git Commits',
        claimB: 'Head of Security Research @ CyberShield Labs',
        sourceB: 'Conference Keynote Speaker Registry',
        severity: 'MEDIUM',
        action: 'Flagged for Human Investigator Verification'
      },
      clarificationQuestions: [
        'Does the subject maintain dual employment with Nexus Defense and CyberShield Labs?',
        'Was the transition from Nexus Defense completed in Q2 2025?'
      ]
    },
    {
      id: 'CAND-02',
      name: 'Alex Kumar (Academic)',
      handle: 'alex-dev-sec_research',
      tag: 'Hypothesis',
      confidence: 62,
      status: 'UNVERIFIED HYPOTHESIS',
      statusColor: 'cyan',
      education: 'MIT Computer Science & AI Lab',
      organization: 'Open Security Foundation',
      role: 'Postdoctoral Fellow',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
      evidenceCount: 3,
      conflictsCount: 0,
      evidence: [
        {
          id: 'EV-04',
          source: 'ArXiv Public Scholarly Index',
          type: 'academic_index',
          url: 'https://arxiv.org/abs/2401.0921',
          observed: '2026-09-19T12:08Z',
          fact: "Co-authored 'Evaluating LLM Resilience to Adversarial Prompt Smuggling'.",
          weight: '0.65',
          verified: true
        },
        {
          id: 'EV-05',
          source: 'GitHub API (Secondary Account)',
          type: 'authenticated_rest_api',
          url: 'https://github.com/alex-dev-sec_research',
          observed: '2026-09-19T12:09Z',
          fact: "Forked academic repos in differential privacy. Handle created 2023.",
          weight: '0.58',
          verified: true
        }
      ],
      conflict: null,
      clarificationQuestions: [
        'Is the academic handle an alias managed by the primary subject or a distinct research collaborator?'
      ]
    },
    {
      id: 'CAND-03',
      name: 'Alex R. Kumar',
      handle: 'alex-dev-sec-dev',
      tag: 'Distant Collision',
      confidence: 31,
      status: 'REJECTED - COLLISION DETECTED',
      statusColor: 'rose',
      education: 'University of Waterloo',
      organization: 'FinTech Systems Inc',
      role: 'Mobile Application Engineer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
      evidenceCount: 1,
      conflictsCount: 2,
      evidence: [
        {
          id: 'EV-06',
          source: 'Public Web Registry',
          type: 'open_profile',
          url: 'https://github.com/alex-dev-sec-dev',
          observed: '2026-09-19T12:11Z',
          fact: 'Repositories consist entirely of iOS Swift utility apps. No security or zero-trust projects.',
          weight: '0.25',
          verified: false
        }
      ],
      conflict: {
        id: 'CONF-9014',
        attribute: 'Domain & Technical Discipline Disconnect',
        claimA: 'Mobile Swift UI Developer (FinTech)',
        sourceA: 'GitHub Repository Topics',
        claimB: 'DevSecOps & Zero-Trust Infrastructure Researcher',
        sourceB: 'Investigation Seed Specification',
        severity: 'HIGH',
        action: 'Eliminated from Primary Candidate Cluster'
      },
      clarificationQuestions: [
        'Confirmed namespace collision. Recommend discarding candidate.'
      ]
    }
  ];

  const handleSimulate = (e) => {
    e.preventDefault();
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setHasSearched(true);
    }, 800);
  };

  const candidate = candidates[activeCandidate];

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* 1. TOP NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#06080d]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 p-[1px] shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-[#090c15] rounded-[11px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-wider text-white">PRISM</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Digital Identity Intelligence</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a href="#overview" className="hover:text-purple-400 transition-colors">Overview</a>
            <a href="#workflow" className="hover:text-purple-400 transition-colors">Multi-Candidate Flow</a>
            <a href="#demo" className="hover:text-purple-400 transition-colors">Live Dossier</a>
            <a href="#evidence-model" className="hover:text-purple-400 transition-colors">Evidence Model</a>
            <a href="#architecture" className="hover:text-purple-400 transition-colors">Architecture</a>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              NEURAX 3.0 • Domain 3
            </div>
            <a
              href="#demo"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-lg shadow-purple-600/20 transition-all transform hover:scale-[1.02]"
            >
              Test Live Sandbox
            </a>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION WITH REACT BITS <DotField /> CANVAS */}
      <section className="relative min-h-[640px] flex items-center justify-center overflow-hidden border-b border-white/10">
        {/* The <DotField /> Component from React Bits */}
        <div className="absolute inset-0 z-0">
          <DotField
            dotRadius={1.6}
            dotSpacing={16}
            cursorRadius={450}
            cursorForce={0.15}
            bulgeOnly={true}
            bulgeStrength={75}
            glowRadius={180}
            sparkle={true}
            waveAmplitude={0}
            gradientFrom="rgba(168, 85, 247, 0.40)"
            gradientTo="rgba(6, 182, 212, 0.30)"
            glowColor="#181226"
          />
        </div>

        {/* Ambient Dark Tech Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-purple-600/20 via-indigo-600/15 to-cyan-500/20 rounded-full blur-3xl pointer-events-none -z-0"></div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center">
          {/* Tagline Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border border-purple-500/30 text-xs font-medium text-purple-300 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI in Cybersecurity • Evidence-First Digital Identity Intelligence</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
            Digital Identity Intelligence,{' '}
            <span className="cyber-gradient-text">Grounded in Verifiable Evidence.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mb-8 leading-relaxed">
            Instead of returning a single guessed identity, <span className="text-purple-400 font-semibold">PRISM</span> generates multiple candidates, correlates cross-platform evidence, flags institutional conflicts, and provides an explainable verification audit trail.
          </p>

          {/* Tagline Ribbon */}
          <div className="flex items-center gap-4 text-xs sm:text-sm font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-500/20 px-4 py-2 rounded-xl mb-10">
            <span>DISCOVER</span>
            <span className="text-slate-500">•</span>
            <span>CORRELATE</span>
            <span className="text-slate-500">•</span>
            <span>VERIFY</span>
            <span className="text-slate-500">•</span>
            <span>EXPLAIN</span>
          </div>

          {/* Interactive Search Console Input Preview */}
          <div className="w-full max-w-3xl glass-panel-glow p-3 sm:p-4 rounded-2xl text-left border border-purple-500/30 shadow-2xl">
            <form onSubmit={handleSimulate} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchHandle}
                  onChange={(e) => setSearchHandle(e.target.value)}
                  placeholder="Target Handle (e.g. alex-dev-sec)..."
                  className="w-full bg-[#080b12] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                />
              </div>
              <div className="sm:w-1/3 relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchOrg}
                  onChange={(e) => setSearchOrg(e.target.value)}
                  placeholder="Org / College Context..."
                  className="w-full bg-[#080b12] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isSimulating}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all shrink-0"
              >
                {isSimulating ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Correlating...</span>
                  </>
                ) : (
                  <>
                    <span>Investigate</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Authorized Scope: Consented Image + Limited Context Ingestion</span>
              </div>
              <span className="font-mono text-slate-500 hidden sm:inline">Zero Private Intrusion • Zero Scraped Credentials</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. VALUE PILLARS & PROBLEM OVERVIEW */}
      <section id="overview" className="py-20 border-b border-white/10 bg-[#080b12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <span className="text-xs uppercase tracking-widest font-mono text-purple-400 font-bold">The Core Challenge</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4 leading-tight">
                Finding profiles is trivial. Proving they belong to the same person is the real problem.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                Digital footprints are fragmented across GitHub, YouTube, conferences, technical publications, and corporate records. When individuals share common names or divergent handles, naive scrapers trigger disastrous false associations.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Multi-Candidate Engine:</strong> Evaluates competing identity hypotheses side-by-side rather than single-guessing.</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Conflict Surfacing:</strong> Alerts investigators when institutions, locations, or timeline claims contradict.</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Provenance-Backed Dossier:</strong> Every claim links to an authenticated source URI with raw cryptographic hash.</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-purple-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
                  <GitBranch className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Cross-Source Correlation</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Triangulates GitHub commit metadata, YouTube keynote speaker listings, public GPG keys, and academic authorship records.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-cyan-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 text-cyan-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">First-Class Conflict Detection</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Surfaces discrepancies—such as dual employment claims or divergent education—instead of silently averaging contradictory records.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-indigo-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Interactive Clarification</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  When evidence is ambiguous, PRISM's reasoning layer generates clarifying questions for the investigator to refine candidate scoring.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Strict Consent Boundaries</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Operates strictly on open, indexed, or authorized platform APIs. Zero credential harvesting, zero private account intrusion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE WORKFLOW DIAGRAM */}
      <section id="workflow" className="py-20 border-b border-white/10 bg-[#06080d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest font-mono text-cyan-400 font-bold">Investigation Lifecycle</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
              How PRISM Evaluates Identity Candidates
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              From user context and consented target portrait to multi-candidate clustering, interactive clarification, and verified dossiers.
            </p>
          </div>

          {/* Visual Step-by-Step Flow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 relative">
              <div className="text-xs font-mono text-purple-400 font-bold mb-2">01 / INGESTION</div>
              <h3 className="text-base font-bold text-white mb-2">Consented Input</h3>
              <p className="text-xs text-slate-400 mb-4">
                Analyst inputs target image, short description, and known context (College, Company).
              </p>
              <div className="bg-[#090c15] p-2.5 rounded-lg border border-white/5 text-[11px] font-mono text-slate-300">
                User Profile + Target Image + Context Hints
              </div>
            </div>

            {/* Step 2 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 relative">
              <div className="text-xs font-mono text-cyan-400 font-bold mb-2">02 / DISCOVERY</div>
              <h3 className="text-base font-bold text-white mb-2">Multi-Source Retrieval</h3>
              <p className="text-xs text-slate-400 mb-4">
                Parallel queries to GitHub API, YouTube Data API, and public conference/paper registries.
              </p>
              <div className="bg-[#090c15] p-2.5 rounded-lg border border-white/5 text-[11px] font-mono text-slate-300">
                GitHub • YouTube • Public Search
              </div>
            </div>

            {/* Step 3 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 relative">
              <div className="text-xs font-mono text-amber-400 font-bold mb-2">03 / CORRELATION</div>
              <h3 className="text-base font-bold text-white mb-2">Candidate Evaluation</h3>
              <p className="text-xs text-slate-400 mb-4">
                Generates Candidates 1–4, compares education, repos, and talks, and prompts clarifying questions if uncertain.
              </p>
              <div className="bg-[#090c15] p-2.5 rounded-lg border border-white/5 text-[11px] font-mono text-slate-300">
                Context Matching + Clarification Loop
              </div>
            </div>

            {/* Step 4 */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 relative">
              <div className="text-xs font-mono text-emerald-400 font-bold mb-2">04 / DOSSIER</div>
              <h3 className="text-base font-bold text-white mb-2">Verified Synthesis</h3>
              <p className="text-xs text-slate-400 mb-4">
                Synthesizes explainable confidence score, surfaces active conflict alerts, and builds evidence graph.
              </p>
              <div className="bg-[#090c15] p-2.5 rounded-lg border border-white/5 text-[11px] font-mono text-slate-300">
                Evidence Provenance + Conflict Matrix
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. LIVE DOSSIER & MULTI-CANDIDATE SANDBOX */}
      <section id="demo" className="py-20 border-b border-white/10 bg-[#080b12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs uppercase tracking-widest font-mono text-purple-400 font-bold">Interactive Sandbox</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                Live Multi-Candidate Investigation Dossier
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Select between competing identity clusters generated for target: <span className="text-white font-mono">{candidate.handle}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Simulated Case:</span>
              <span className="text-xs px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                Alex Kumar (DevSecOps)
              </span>
            </div>
          </div>

          {/* Candidate Switcher Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {candidates.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => setActiveCandidate(idx)}
                className={`p-4 rounded-xl text-left transition-all border ${
                  activeCandidate === idx
                    ? 'bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-900/20'
                    : 'glass-panel border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-slate-400">{c.id}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      c.statusColor === 'amber'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : c.statusColor === 'cyan'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {c.tag}
                  </span>
                </div>
                <div className="font-bold text-sm text-white">{c.name}</div>
                <div className="text-xs font-mono text-slate-400 mb-2">@{c.handle}</div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                  <span className="text-slate-400">Confidence</span>
                  <span className="font-bold text-purple-400">{c.confidence}%</span>
                </div>
              </button>
            ))}
          </div>

          {/* Candidate Detailed View Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Identity Snapshot & Conflicts */}
            <div className="lg:col-span-5 space-y-6">
              {/* Profile Card */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10">
                <div className="flex items-center gap-4 mb-6">
                  <img
                    src={candidate.avatar}
                    alt={candidate.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/40 shadow-md"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-white">{candidate.name}</h3>
                    <p className="text-xs font-mono text-purple-400">@{candidate.handle}</p>
                    <p className="text-xs text-slate-400 mt-1">{candidate.role}</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-slate-500" /> Education
                    </span>
                    <span className="text-white font-medium text-right">{candidate.education}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-slate-500" /> Primary Org
                    </span>
                    <span className="text-white font-medium text-right">{candidate.organization}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-slate-500" /> Resolution Status
                    </span>
                    <span className="font-mono text-purple-300 font-bold">{candidate.status}</span>
                  </div>
                </div>
              </div>

              {/* Conflict Alert Box if present */}
              {candidate.conflict && (
                <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-left">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    <span>INSTITUTIONAL CONFLICT DETECTED</span>
                  </div>
                  <p className="text-xs font-semibold text-white mb-2">{candidate.conflict.attribute}</p>
                  <div className="space-y-2 text-[11px] bg-black/40 p-3 rounded-lg border border-amber-500/20 font-mono">
                    <div className="text-slate-300">
                      <span className="text-amber-400">[Source A]:</span> {candidate.conflict.claimA}
                    </div>
                    <div className="text-slate-400 text-[10px] pl-2 border-l border-amber-500/30">
                      Via: {candidate.conflict.sourceA}
                    </div>
                    <div className="text-slate-300 mt-2">
                      <span className="text-cyan-400">[Source B]:</span> {candidate.conflict.claimB}
                    </div>
                    <div className="text-slate-400 text-[10px] pl-2 border-l border-cyan-500/30">
                      Via: {candidate.conflict.sourceB}
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-amber-300 flex items-center justify-between">
                    <span>Action: {candidate.conflict.action}</span>
                    <span className="px-2 py-0.5 bg-amber-500/20 rounded font-bold">{candidate.conflict.severity}</span>
                  </div>
                </div>
              )}

              {/* Interactive Clarification Questions */}
              {candidate.clarificationQuestions.length > 0 && (
                <div className="p-5 rounded-2xl glass-panel border border-cyan-500/30">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-2">
                    <HelpCircle className="w-4 h-4" />
                    <span>AI CLARIFYING QUESTIONS FOR INVESTIGATOR</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    When evidence is uncertain, PRISM prompts human analysts to break ambiguity:
                  </p>
                  <ul className="space-y-2 text-xs text-slate-200">
                    {candidate.clarificationQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-[#080b12] p-2.5 rounded-lg border border-white/5">
                        <span className="text-cyan-400 font-mono font-bold">Q{idx + 1}:</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right: Authenticated Evidence Trail */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Authenticated Evidence Trail ({candidate.evidence.length} Records)
                </h3>
                <span className="text-xs text-slate-400 font-mono">Immutable Provenance</span>
              </div>

              {candidate.evidence.map((ev) => (
                <div key={ev.id} className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-purple-400 font-bold">{ev.id} • {ev.source}</span>
                    <span className="font-mono text-slate-500">{ev.observed}</span>
                  </div>
                  <p className="text-sm text-slate-200 font-medium mb-3">{ev.fact}</p>
                  <div className="flex flex-wrap items-center justify-between text-[11px] bg-[#080b12] p-2.5 rounded-lg border border-white/5 text-slate-400">
                    <div className="flex items-center gap-2 truncate max-w-[340px]">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate font-mono">{ev.url}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 mt-1 sm:mt-0 font-mono">
                      <span>Weight: <strong className="text-white">{ev.weight}</strong></span>
                      <span className="text-emerald-400 font-semibold">VERIFIED</span>
                    </div>
                  </div>
                </div>
              ))}

              {candidate.evidence.length === 0 && (
                <div className="glass-panel p-8 rounded-2xl text-center text-slate-400 text-sm">
                  No corroborated evidence found for this candidate. Marked for collision discard.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6. EVIDENCE MODEL & ZERO-TRUST PRINCIPLES */}
      <section id="evidence-model" className="py-20 border-b border-white/10 bg-[#06080d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest font-mono text-cyan-400 font-bold">Epistemology</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
              The PRISM Evidence & Provenance Model
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Distinguishing seed claims from public evidence and AI correlation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Model A: Corroboration */}
            <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Case 1: Multi-Source Corroboration</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">CONFIDENCE: HIGH</span>
              </div>
              <p className="text-sm font-semibold text-white mb-3">
                Assertion: "Subject is Lead Researcher on Zero-Trust Architecture"
              </p>
              <div className="space-y-2 text-xs font-mono bg-[#090c15] p-3.5 rounded-xl border border-white/5 text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>[Source 1: GitHub API]: Repository 'zero-trust-proxy' created & committed by handle.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>[Source 2: YouTube API]: Keynote talk matching handle and repository name at CyberSec 2024.</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Result: Both independent public sources validate the claim. Elevated to <strong>CORROBORATED</strong> status.
              </p>
            </div>

            {/* Model B: Conflict */}
            <div className="glass-panel p-6 rounded-2xl border border-amber-500/30">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">Case 2: Institutional Discrepancy</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">STATUS: CONFLICT ALERT</span>
              </div>
              <p className="text-sm font-semibold text-white mb-3">
                Assertion: "Current Primary Corporate Employer"
              </p>
              <div className="space-y-2 text-xs font-mono bg-[#090c15] p-3.5 rounded-xl border border-white/5 text-slate-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>[Source A: GitHub Bio]: Lists 'Staff Security Engineer @ Nexus Defense'.</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>[Source B: Conference Schedule]: Lists 'Head of Research @ CyberShield Labs'.</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Result: Mutually exclusive institutional affiliations. Flagged as <strong>CONFLICT DETECTED</strong> with score penalty.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ARCHITECTURE & TECH STACK */}
      <section id="architecture" className="py-20 border-b border-white/10 bg-[#080b12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest font-mono text-purple-400 font-bold">System Engineering</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
              Checkpoint 1 Architecture & Tech Stack
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Built on modular, high-assurance frameworks for concurrent intelligence retrieval and low-latency inference.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="glass-panel p-6 rounded-2xl border border-white/10">
              <div className="text-xs font-mono text-purple-400 font-bold mb-2">INTERFACE LAYER</div>
              <h3 className="text-base font-bold text-white mb-2">React 18 + Vite + Tailwind</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Ultra-responsive analyst UI featuring live React Bits canvas background, candidate switcher, and conflict banners.
              </p>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Implemented & Interactive
              </span>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/10">
              <div className="text-xs font-mono text-cyan-400 font-bold mb-2">ORCHESTRATION GATEWAY</div>
              <h3 className="text-base font-bold text-white mb-2">FastAPI (Python 3.11)</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Async REST gateway orchestrating GitHub REST API v3, YouTube Data API, Pydantic schemas, and provenance hashes.
              </p>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Implemented in /backend
              </span>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/10">
              <div className="text-xs font-mono text-amber-400 font-bold mb-2">AI REASONING LAYER</div>
              <h3 className="text-base font-bold text-white mb-2">Groq LPU (Llama-3-70B)</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Sub-second semantic correlation, entity structuring, and clarifying question formulation anchored to source evidence.
              </p>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Configured with Rule-Based Fallback
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="py-12 border-t border-white/10 bg-[#05070b] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="text-white font-bold tracking-wider">PRISM</span>
            <span className="text-slate-600">|</span>
            <span>NEURAX HACKATHON 3.0 • Domain 3: AI in Cybersecurity</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="font-mono text-slate-400">"Discover. Correlate. Verify. Explain."</span>
            <a
              href="https://github.com/abdulkani007/PRISM"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-semibold transition-colors"
            >
              <span>GitHub Repository</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
