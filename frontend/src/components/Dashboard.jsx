import React, { useState, useEffect } from 'react';
import logoImg from '../assets/logo.png';
import dashImg from '../assets/dash.png';
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  Bell,
  Target,
  Share2,
  LogOut,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Database,
  RefreshCw,
  X,
  User,
  Home
} from 'lucide-react';
import { fetchDashboardStats, runInvestigation } from '../lib/api';

export default function Dashboard({ currentUser, onSignOut, onBackToHome }) {
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [stats, setStats] = useState(null);
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [activeTabOverview, setActiveTabOverview] = useState('corroborated');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Investigation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [investigating, setInvestigating] = useState(false);
  const [investigationStep, setInvestigationStep] = useState(0);
  const [investigationResult, setInvestigationResult] = useState(null);
  const [formData, setFormData] = useState({
    seed_handle: 'alex-dev-sec',
    target_name: 'Alex Kumar',
    organization: 'Nexus Defense',
    school_college: 'Stanford Institute of Technology'
  });

  // Selected Target Detail Drawer
  const [selectedTarget, setSelectedTarget] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    const { data, isLive } = await fetchDashboardStats();
    setStats(data);
    setIsLiveApi(isLive);
    setIsLoading(false);
  };

  const handleLaunchInvestigation = async (e) => {
    e.preventDefault();
    setInvestigating(true);
    setInvestigationStep(1);

    const stepTimer1 = setTimeout(() => setInvestigationStep(2), 500);
    const stepTimer2 = setTimeout(() => setInvestigationStep(3), 1100);

    const { result, isLive } = await runInvestigation(formData);
    clearTimeout(stepTimer1);
    clearTimeout(stepTimer2);
    setInvestigationStep(4);
    setInvestigationResult(result);
    setInvestigating(false);

    if (stats) {
      const newTarget = {
        id: `TGT-${Math.floor(100 + Math.random() * 900)}`,
        name: formData.target_name || formData.seed_handle,
        seed: formData.seed_handle,
        matches: result.candidates?.length || 2,
        confidence: Math.round((result.candidates?.[0]?.confidence_score || 0.85) * 100),
        status: result.total_conflicts_detected > 0 ? 'Corroborated with Conflict' : 'Verified Ground Truth',
        org: formData.organization || 'Independent Researcher',
        evidence_count: result.candidates?.[0]?.evidence_trail?.length || 6,
        last_active: 'Just now'
      };
      setStats(prev => ({
        ...prev,
        target_investigations: [newTarget, ...(prev?.target_investigations ? prev.target_investigations.slice(0, 4) : [])]
      }));
    }
  };

  // SVG Wave path calculation
  const timelineData = stats?.overview?.timeline || [
    { month: 'Jan', value: 1600 },
    { month: 'Feb', value: 3200 },
    { month: 'Mar', value: 2700 },
    { month: 'Apr', value: 3800 },
    { month: 'May', value: 2600 },
    { month: 'Jun', value: 4300 },
    { month: 'Jul', value: 2900 },
    { month: 'Aug', value: 3900 },
    { month: 'Sep', value: 3100 },
    { month: 'Oct', value: 3500 },
    { month: 'Nov', value: 4200 },
    { month: 'Dec', value: 3600 }
  ];

  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 20;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;
  const maxValue = 5500;

  const points = timelineData.map((d, index) => {
    const x = paddingX + (index / (timelineData.length - 1)) * chartWidth;
    const y = svgHeight - paddingY - (d.value / maxValue) * chartHeight;
    return { x, y, ...d };
  });

  const generateSmoothPath = (pts) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePath = generateSmoothPath(points);
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
    : '';

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col md:flex-row antialiased selection:bg-white selection:text-black">
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-full md:w-64 shrink-0 bg-[#09090b] border-b md:border-b-0 md:border-r border-zinc-800/80 flex flex-col justify-between p-4 sm:p-5 z-20">
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-6 border-b border-zinc-800/60 mb-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={onBackToHome}>
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1 shadow-md shadow-white/5">
                <img src={logoImg} alt="PRISM Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-wider text-white block leading-none">PRISM</span>
                <span className="text-[10px] text-zinc-400 tracking-wider uppercase font-mono mt-1 block">Intelligence</span>
              </div>
            </div>

            <div className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${isLiveApi ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60' : 'bg-zinc-900 text-zinc-400 border-zinc-700'}`}>
              {isLiveApi ? 'LIVE API' : 'ENGINE'}
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1 text-sm font-medium">
            <button
              onClick={() => setActiveNav('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${activeNav === 'dashboard' ? 'bg-zinc-800/80 text-white font-semibold shadow-inner border border-zinc-700/60' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'}`}
            >
              <LayoutDashboard className="w-4 h-4 text-white" />
              <span>Dashboard</span>
            </button>

            {/* Reports Dropdown */}
            <div className="pt-3">
              <div className="flex items-center justify-between px-3.5 py-2 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Investigations</span>
                </div>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </div>

              <div className="pl-4 pr-1 space-y-0.5 mt-1 text-xs text-zinc-400">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-900/60 transition-colors flex items-center justify-between"
                >
                  <span>Target Resolution</span>
                  <span className="text-[10px] text-zinc-500">+New</span>
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('target-matrix-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-900/60 transition-colors"
                >
                  Candidate Matrix
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('provenance-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-900/60 transition-colors"
                >
                  Evidence Provenance
                </button>
                <button
                  onClick={() => {
                    if (stats?.target_investigations?.[0]) setSelectedTarget(stats.target_investigations[0]);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-900/60 transition-colors flex items-center justify-between"
                >
                  <span>Conflict Analysis</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 text-[9px] border border-amber-800/40">1 Flag</span>
                </button>
              </div>
            </div>

            {/* AI Insights */}
            <div className="pt-3">
              <div className="flex items-center justify-between px-3.5 py-2 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Insights</span>
                </div>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </div>

              <div className="pl-4 pr-1 space-y-0.5 mt-1 text-xs text-zinc-400">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-900/60 transition-colors flex items-center justify-between"
                >
                  <span>Ask PRISM AI</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Groq</span>
                </button>
                <button
                  onClick={() => {
                    if (stats?.target_investigations?.[0]) setSelectedTarget(stats.target_investigations[0]);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-900/60 transition-colors"
                >
                  Discrepancy Synthesis
                </button>
              </div>
            </div>

            {/* Alerts & Verification Goals */}
            <div className="pt-3 space-y-1">
              <button
                onClick={() => {
                  if (stats?.target_investigations?.[0]) setSelectedTarget(stats.target_investigations[0]);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4" />
                  <span>Alerts</span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-semibold">3</span>
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('overview-chart-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-colors"
              >
                <Target className="w-4 h-4" />
                <span>Verification Goals</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-6 border-t border-zinc-800/60 space-y-3">
          <button
            onClick={() => alert('API Integrations: GitHub API, YouTube Data API, Groq LPU, arXiv Open Science API.')}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>API Integrations</span>
          </button>

          <button
            onClick={onBackToHome}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>

          {currentUser && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-white/20" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-medium text-white truncate">{currentUser.displayName || currentUser.email?.split('@')[0]}</p>
                <p className="text-[10px] text-zinc-400 truncate">{currentUser.email}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 bg-black p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Bar: Title, Time Filter Pills, Add Investigation Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Dashboard</h1>
            <p className="text-xs text-zinc-400 mt-1">Evidence-First Digital Identity Intelligence & Provenance Verification</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl bg-[#0e0e11] border border-zinc-800 p-1 text-xs">
              {['Yesterday', 'Last 7 days', 'Last 30 days', 'Last 12 month'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTimeRange(tab)}
                  className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${timeRange === tab ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-white text-black hover:bg-neutral-200 font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-white/10"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Investigation</span>
            </button>
          </div>
        </div>

        {/* ROW 1: FOUR KEY METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-[#0d0d11] border border-zinc-800/80 p-5 hover:border-zinc-700/80 transition-all">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Targets Investigated</span>
              <Target className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {stats?.kpis?.targets?.value || '1,644'}
            </div>
            <p className="mt-1 text-xs text-zinc-400 flex items-center gap-1">
              <span className="text-emerald-400">+6.8%</span> vs. previous period
            </p>
          </div>

          <div className="rounded-2xl bg-[#0d0d11] border border-zinc-800/80 p-5 hover:border-zinc-700/80 transition-all">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Match Confidence %</span>
              <CheckCircle2 className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {stats?.kpis?.confidence?.value || '84.2%'}
            </div>
            <p className="mt-1 text-xs text-zinc-400 flex items-center gap-1">
              <span className="text-emerald-400">+2.8%</span> vs. previous period
            </p>
          </div>

          <div className="rounded-2xl bg-[#0d0d11] border border-zinc-800/80 p-5 hover:border-zinc-700/80 transition-all">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Verified Evidence</span>
              <Database className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {stats?.kpis?.evidence?.value || '29,511'}
            </div>
            <p className="mt-1 text-xs text-zinc-400 flex items-center gap-1">
              <span className="text-emerald-400">+3.8%</span> vs. previous period
            </p>
          </div>

          <div className="rounded-2xl bg-[#0d0d11] border border-zinc-800/80 p-5 hover:border-zinc-700/80 transition-all">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Flagged Discrepancies</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {stats?.kpis?.discrepancies?.value || '18'}
            </div>
            <p className="mt-1 text-xs text-zinc-400 flex items-center gap-1">
              <span className="text-zinc-400">-4.2%</span> vs. previous period
            </p>
          </div>
        </div>

        {/* ROW 2: DUAL GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div id="target-matrix-section" className="lg:col-span-2 rounded-2xl bg-[#0d0d11] border border-zinc-800/80 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Target Investigations</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Multi-candidate clustering with cross-platform identity resolution</p>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">Last Updated : 19 Sep, 2026</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-800/80 pb-2">
                    <th className="py-2.5 font-medium">Target / Handle</th>
                    <th className="py-2.5 font-medium">Matches</th>
                    <th className="py-2.5 font-medium">Confidence</th>
                    <th className="py-2.5 font-medium">Status & Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {(stats?.target_investigations || []).map((target) => (
                    <tr
                      key={target.id}
                      onClick={() => setSelectedTarget(target)}
                      className="group cursor-pointer hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-3.5 pr-3">
                        <div className="font-medium text-white group-hover:text-neutral-200">{target.name}</div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">@{target.seed}</div>
                      </td>
                      <td className="py-3.5 pr-3 font-mono text-zinc-300">
                        {target.matches} candidates
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-white">{target.confidence}%</span>
                          <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-white rounded-full"
                              style={{ width: `${target.confidence}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            target.status.includes('Conflict')
                              ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                              : target.status.includes('Collision')
                              ? 'bg-red-950/30 text-red-400 border-red-800/40'
                              : 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40'
                          }`}>
                            {target.status}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
                            {target.evidence_count} docs
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div id="provenance-section" className="rounded-2xl bg-[#0d0d11] border border-zinc-800/80 p-5 sm:p-6 flex flex-col justify-between space-y-5">
            <div>
              {/* Dash Graphic Banner */}
              <div className="h-24 w-full rounded-xl overflow-hidden mb-4 relative border border-white/10 group">
                <img src={dashImg} alt="Identity Verification" className="w-full h-full object-cover object-center opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d11] via-transparent to-black/30" />
                <div className="absolute bottom-2 left-3 text-[10px] font-mono text-emerald-400 font-semibold bg-black/80 px-2 py-0.5 rounded-md border border-emerald-500/30 backdrop-blur-sm">
                  PROOF OF ATTESTATION
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Evidence Provenance</h3>
                <Shield className="w-4 h-4 text-zinc-500" />
              </div>
              <p className="text-xs text-zinc-400 mt-1">Cryptographic source verification</p>

              <div className="mt-4 space-y-3">
                <div className="text-xs text-zinc-400 font-medium">Source Providers</div>
                {(stats?.provenance_breakdown?.sources || []).map((src) => (
                  <div key={src.name} className="flex items-center justify-between text-xs py-1">
                    <span className="text-zinc-300 truncate max-w-[170px]">{src.name.split(' ')[0]} {src.name.split(' ')[1] || ''}</span>
                    <span className="font-mono font-medium text-white">{src.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>SHA-256 Hashes Verified</span>
                <span className="font-mono font-medium text-white">29,511</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Uncorroborated Claims</span>
                <span className="font-mono text-zinc-400">42</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Tamper-Evident Status</span>
                <span className="font-mono text-emerald-400">100% OK</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between font-semibold text-white">
                <span>Integrity Score</span>
                <span className="font-mono text-white text-sm">99.8%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: OVERVIEW & MONOCHROME WAVE CHART */}
        <div id="overview-chart-section" className="rounded-2xl bg-[#0d0d11] border border-zinc-800/80 p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60">
            <h3 className="text-lg font-bold text-white tracking-tight">Overview</h3>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <button
                onClick={() => setActiveTabOverview('total')}
                className={`text-left p-3 rounded-xl border transition-all ${activeTabOverview === 'total' ? 'bg-zinc-800/80 border-zinc-700 shadow-md' : 'bg-transparent border-transparent hover:bg-zinc-900/40'}`}
              >
                <div className="text-[11px] text-zinc-400 font-medium">Evaluated</div>
                <div className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">25,568</div>
              </button>

              <button
                onClick={() => setActiveTabOverview('corroborated')}
                className={`text-left p-3 rounded-xl border transition-all ${activeTabOverview === 'corroborated' ? 'bg-zinc-800/90 border-zinc-600 shadow-lg' : 'bg-transparent border-transparent hover:bg-zinc-900/40'}`}
              >
                <div className="text-[11px] text-zinc-300 font-medium">Corroborated</div>
                <div className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">19,828</div>
              </button>

              <button
                onClick={() => setActiveTabOverview('discrepancies')}
                className={`text-left p-3 rounded-xl border transition-all ${activeTabOverview === 'discrepancies' ? 'bg-zinc-800/80 border-zinc-700 shadow-md' : 'bg-transparent border-transparent hover:bg-zinc-900/40'}`}
              >
                <div className="text-[11px] text-zinc-400 font-medium">Discrepancies</div>
                <div className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">6,253</div>
              </button>
            </div>
          </div>

          <div className="relative w-full overflow-hidden">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-zinc-600 font-mono py-2">
              <div className="border-b border-zinc-800/40 w-full flex justify-between"><span>6000</span></div>
              <div className="border-b border-zinc-800/40 w-full flex justify-between"><span>4500</span></div>
              <div className="border-b border-zinc-800/40 w-full flex justify-between"><span>3000</span></div>
              <div className="border-b border-zinc-800/40 w-full flex justify-between"><span>1500</span></div>
              <div className="border-b border-zinc-800/60 w-full flex justify-between"><span>0</span></div>
            </div>

            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-48 sm:h-64 relative z-10 overflow-visible"
            >
              <defs>
                <linearGradient id="areaWaveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#areaWaveGradient)"
                  className="transition-all duration-700"
                />
              )}

              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  filter="url(#glow)"
                  className="transition-all duration-700"
                />
              )}

              {points.map((pt, i) => (
                <g key={pt.month} className="cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint === i ? 6 : 3}
                    fill={hoveredPoint === i ? '#ffffff' : '#a1a1aa'}
                    stroke="#000000"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="transition-all duration-200"
                  />
                </g>
              ))}
            </svg>

            {hoveredPoint !== null && points[hoveredPoint] && (
              <div
                className="absolute z-20 -top-2 bg-zinc-900 border border-zinc-700 p-2 rounded-xl text-xs shadow-2xl pointer-events-none transform -translate-x-1/2"
                style={{ left: `${(points[hoveredPoint].x / svgWidth) * 100}%` }}
              >
                <div className="font-bold text-white">{points[hoveredPoint].month} 2026</div>
                <div className="text-zinc-400 mt-0.5">Evaluated: <span className="text-white font-mono font-medium">{points[hoveredPoint].value}</span></div>
                <div className="text-emerald-400 text-[10px]">Corroborated: {points[hoveredPoint].corroborated || Math.round(points[hoveredPoint].value * 0.8)}</div>
              </div>
            )}

            <div className="flex justify-between items-center text-[11px] text-zinc-500 font-mono mt-2 px-6">
              {timelineData.map((d, i) => (
                <span
                  key={d.month}
                  className={`cursor-pointer transition-colors ${hoveredPoint === i ? 'text-white font-bold' : 'hover:text-zinc-300'}`}
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {d.month}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* 3. NEW INVESTIGATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-element">
          <div className="bg-[#0d0d11] border border-zinc-800 rounded-3xl w-full max-w-lg p-6 sm:p-7 space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setInvestigationResult(null);
                setInvestigating(false);
              }}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-bold text-white">Launch Target Investigation</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Multi-candidate footprint resolution with cryptographic evidence provenance.
              </p>
            </div>

            {!investigationResult ? (
              <form onSubmit={handleLaunchInvestigation} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Target Handle / Seed Identifier *</label>
                  <input
                    type="text"
                    required
                    value={formData.seed_handle}
                    onChange={(e) => setFormData({ ...formData, seed_handle: e.target.value })}
                    placeholder="e.g. alex-dev-sec"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Known Legal or Display Name</label>
                  <input
                    type="text"
                    value={formData.target_name}
                    onChange={(e) => setFormData({ ...formData, target_name: e.target.value })}
                    placeholder="e.g. Alex Kumar"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">Organization</label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      placeholder="e.g. Nexus Defense"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">Academic / Affiliation</label>
                    <input
                      type="text"
                      value={formData.school_college}
                      onChange={(e) => setFormData({ ...formData, school_college: e.target.value })}
                      placeholder="e.g. Stanford SIT"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-[11px] text-zinc-400">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Mandatory Public Consent Attestation: I verify that this investigation evaluates only authorized public footprint and open telemetry.
                  </span>
                </div>

                {investigating && (
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {investigationStep === 1 && 'Querying GitHub API & public records...'}
                        {investigationStep === 2 && 'Clustering candidate profiles...'}
                        {investigationStep === 3 && 'Synthesizing evidence & conflicts via Groq...'}
                        {investigationStep === 4 && 'Analysis finalized!'}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={investigating}
                  className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  <span>{investigating ? 'Correlating Target Footprint...' : 'Execute PRISM Investigation'}</span>
                </button>
              </form>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-center justify-between">
                  <span>Investigation Completed: {investigationResult.investigation_id}</span>
                  <span className="font-mono text-[10px]">{investigationResult.candidates?.length} Candidates Evaluated</span>
                </div>

                <div className="space-y-3">
                  {(investigationResult.candidates || []).map((cand) => (
                    <div key={cand.candidate_id} className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white text-sm">{cand.canonical_name}</span>
                          <span className="text-zinc-400 font-mono ml-2">@{cand.primary_handle}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono text-[11px]">
                          {Math.round(cand.confidence_score * 100)}% Match
                        </span>
                      </div>

                      <p className="text-zinc-300 text-[11px]">
                        {cand.role || 'Researcher'} &bull; {cand.organization} &bull; {cand.education}
                      </p>

                      <div className="text-[11px] text-zinc-400 flex items-center gap-3 pt-1">
                        <span>Evidence Records: {cand.evidence_trail?.length || 0}</span>
                        <span>Profiles: {cand.profiles?.length || 0}</span>
                      </div>

                      {cand.conflicts?.length > 0 && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-300 text-[11px] space-y-1">
                          <div className="font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Conflict Flagged: {cand.conflicts[0].attribute_name}</span>
                          </div>
                          <p className="text-zinc-300">Claim A: {cand.conflicts[0].claim_a}</p>
                          <p className="text-zinc-300">Claim B: {cand.conflicts[0].claim_b}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setInvestigationResult(null)}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors"
                >
                  Start Another Query
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TARGET DETAIL MODAL */}
      {selectedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-element">
          <div className="bg-[#0d0d11] border border-zinc-800 rounded-3xl w-full max-w-lg p-6 sm:p-7 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedTarget(null)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono text-[10px] border border-white/20">
                {selectedTarget.id}
              </span>
              <h3 className="text-xl font-bold text-white mt-2">{selectedTarget.name}</h3>
              <p className="text-xs text-zinc-400 font-mono">Seed: @{selectedTarget.seed} &bull; {selectedTarget.org}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">Corroboration Confidence</span>
                <span className="text-lg font-bold text-white font-mono">{selectedTarget.confidence}%</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">Correlated Candidates</span>
                <span className="text-lg font-bold text-white font-mono">{selectedTarget.matches} Candidates</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-semibold text-white">Corroborated Public Evidence Artifacts</h4>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300 font-medium">GitHub Bio & Authenticated Commit Signatures</span>
                  <span className="text-emerald-400 font-mono">VERIFIED</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300 font-medium">Conference Speaker Program (CyberSec 2024)</span>
                  <span className="text-emerald-400 font-mono">VERIFIED</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300 font-medium">arXiv Academic Author Signature Index</span>
                  <span className="text-zinc-400 font-mono">PROBABLE</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Active Discrepancy Flag</span>
              </div>
              <p className="text-zinc-300 text-[11px]">
                Institutional tenure discrepancy observed between GitHub Profile bio and Keynote affiliation transcript.
              </p>
            </div>

            <button
              onClick={() => setSelectedTarget(null)}
              className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
