import React, { useState, useRef, useEffect, useCallback } from 'react';
import logoImg from '../assets/logo.png';
import {
  Sparkles,
  ArrowRight,
  Image as ImageIcon,
  UploadCloud,
  X,
  Plus,
  MessageSquare,
  Shield,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Download,
  LogOut,
  Home,
  User,
  Menu,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Hash,
  Eye,
  SlidersHorizontal,
  GraduationCap,
  School,
  Briefcase,
  Code2,
  Award,
  Camera,
  Network,
  Clock
} from 'lucide-react';
import { executeInvestigationWorkflow, getInvestigationState } from '../lib/api';
import { RelationshipGraphView, ChronologicalTimelineView } from './InvestigationGraphAndTimeline';

const GithubIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const YoutubeIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const SAMPLE_SUGGESTIONS = [
  {
    title: 'Abdulkani B (Primary Test Case)',
    prompt: 'Name: Abdulkani B\nCollege: Sri Eshwar College Of Engineering\nGitHub Username: abdulkani007\nDescription: AI and Full Stack developer, student interested in technology.',
    icon: '🎯',
    params: {
      name: 'Abdulkani B',
      college: 'Sri Eshwar College Of Engineering',
      school: '',
      githubUsername: 'abdulkani007',
      description: 'AI and Full Stack developer, student interested in technology.'
    }
  },
  {
    title: 'Biometric & Photo Provenance',
    prompt: 'Upload or drop a portrait photo to run 68-point facial landmark attestation and cross-platform reverse matching.',
    icon: '📸'
  },
  {
    title: 'Investigate Alex Kumar',
    prompt: 'Name: Alex Kumar\nCollege: Stanford Institute of Technology\nGitHub Username: alex-dev-sec\nDescription: DevSecOps systems engineer',
    icon: '🔍',
    params: {
      name: 'Alex Kumar',
      college: 'Stanford Institute of Technology',
      githubUsername: 'alex-dev-sec',
      description: 'DevSecOps systems engineer'
    }
  },
  {
    title: 'Cryptographic Attestation',
    prompt: 'Verify SHA-256 tamper-evident provenance hashes and inspect C2PA content credential validity.',
    icon: '🛡️'
  }
];

export default function GptChatInterface({ currentUser, onSignOut, onBackToHome }) {
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [currentProgressStep, setCurrentProgressStep] = useState('INITIALIZING');
  const [completedSteps, setCompletedSteps] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [imageModalUrl, setImageModalUrl] = useState(null);
  const [selectedCandidateModal, setSelectedCandidateModal] = useState(null);
  const [candidateModalTab, setCandidateModalTab] = useState('dossier');
  const [showParamsDrawer, setShowParamsDrawer] = useState(false);

  // Discrete parameter fields state
  const [targetParams, setTargetParams] = useState({
    name: '',
    college: '',
    school: '',
    githubUsername: '',
    description: ''
  });

  // Investigation sessions list
  const [sessions, setSessions] = useState([]);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll to bottom on new messages or loading
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isInvestigating, currentProgressStep]);

  // Handle image file selection & read
  const processImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;

    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setAttachedImage({
          file,
          name: file.name,
          url: e.target.result,
          sizeFormatted,
          width: img.width,
          height: img.height
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  }, []);

  // Paste handler for Ctrl+V images
  useEffect(() => {
    const handlePaste = (e) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          processImageFile(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Parse prompt text into structured target input
  const parsePromptToParams = (rawText, explicitParams = null) => {
    if (explicitParams && (explicitParams.name || explicitParams.githubUsername)) {
      return { ...explicitParams, image: attachedImage };
    }

    const res = {
      name: targetParams.name || '',
      college: targetParams.college || '',
      school: targetParams.school || '',
      githubUsername: targetParams.githubUsername || '',
      description: targetParams.description || rawText,
      image: attachedImage
    };

    const lines = (rawText || '').split('\n');
    for (const line of lines) {
      const l = line.trim();
      if (/^name\s*:/i.test(l)) res.name = l.replace(/^name\s*:/i, '').trim();
      else if (/^(college|university)\s*:/i.test(l)) res.college = l.replace(/^(college|university)\s*:/i, '').trim();
      else if (/^school\s*:/i.test(l)) res.school = l.replace(/^school\s*:/i, '').trim();
      else if (/^github(\s*username)?\s*:/i.test(l)) res.githubUsername = l.replace(/^github(\s*username)?\s*:/i, '').trim();
      else if (/^description\s*:/i.test(l)) res.description = l.replace(/^description\s*:/i, '').trim();
    }

    if (!res.name) {
      res.name = rawText.slice(0, 40);
    }

    return res;
  };

  // Submit investigation query
  const handleLaunchInvestigation = async (overrideText = null, overrideParams = null) => {
    const rawText = (typeof overrideText === 'string' ? overrideText : inputPrompt).trim();
    const finalInput = parsePromptToParams(rawText, overrideParams);

    if (!finalInput.name && !finalInput.githubUsername && !attachedImage) return;

    const userMessageId = `usr-${Date.now()}`;
    const newUserMessage = {
      id: userMessageId,
      role: 'user',
      text: rawText || `Investigate Target: ${finalInput.name || finalInput.githubUsername}`,
      inputParams: finalInput,
      image: attachedImage ? { ...attachedImage } : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputPrompt('');
    setTargetParams({ name: '', college: '', school: '', githubUsername: '', description: '' });
    setShowParamsDrawer(false);
    const currentImage = attachedImage;
    setAttachedImage(null);

    setIsInvestigating(true);
    setCurrentProgressStep('INITIALIZING');
    setCompletedSteps([]);

    const workflowSteps = [
      'INITIALIZING',
      'IMAGE ANALYSIS',
      'TEXT SEARCH',
      'GITHUB SEARCH',
      'YOUTUBE SEARCH',
      'PROFESSIONAL SEARCH',
      'PROFILE CORRELATION',
      'CANDIDATE GENERATION',
      'PHOTO VERIFICATION',
      'AI ANALYSIS',
      'INVESTIGATION COMPLETE'
    ];

    try {
      const { data, isLive } = await executeInvestigationWorkflow(finalInput, ({ step, status }) => {
        setCurrentProgressStep(step);
        if (status === 'DONE') {
          setCompletedSteps((prev) => [...new Set([...prev, step])]);
        }
      });

      const assistantMessageId = `ai-${Date.now()}`;
      const newAssistantMessage = {
        id: assistantMessageId,
        role: 'assistant',
        data,
        isLive,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, newAssistantMessage]);

      // Add to session history
      const newTitle = `${finalInput.name || finalInput.githubUsername || 'Target'} — ${finalInput.college || 'Footprint Audit'}`;
      setSessions((prev) => [
        {
          id: data.investigationId || `sess-${Date.now()}`,
          investigationId: data.investigationId,
          title: newTitle,
          date: 'Just now',
          active: true,
          data: data,
          isLive: isLive,
          userMessage: newUserMessage
        },
        ...prev.map((s) => ({ ...s, active: false }))
      ]);

    } catch (err) {
      console.error('Investigation workflow failure:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          error: `Investigation error: ${err.message || 'An unexpected error occurred during the investigation workflow.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsInvestigating(false);
      setCurrentProgressStep('');
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputPrompt('');
    setAttachedImage(null);
    setTargetParams({ name: '', college: '', school: '', githubUsername: '', description: '' });
    setShowParamsDrawer(false);
    setSelectedCandidateModal(null);
    setCandidateModalTab('dossier');
    setCurrentProgressStep('');
    setCompletedSteps([]);
    setIsInvestigating(false);
    setSessions((prev) => prev.map((s) => ({ ...s, active: false })));
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = (data) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `PRISM-Investigation-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      className="relative flex h-screen w-full bg-black text-white font-sans overflow-hidden select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* FULL-SCREEN DRAG OVERLAY */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md border-2 border-dashed border-white/60 pointer-events-none transition-all">
          <div className="p-6 rounded-full bg-white/10 border border-white/20 text-white mb-4 animate-bounce shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <UploadCloud className="w-12 h-12" />
          </div>
          <h3 className="text-xl font-medium tracking-wide text-white">
            Drop photo to analyze with PRISM Vision Intelligence
          </h3>
          <p className="text-xs text-neutral-400 mt-2">
            Supports PNG, JPG, JPEG, WEBP • 68-point facial landmark and reverse provenance search
          </p>
        </div>
      )}

      {/* FULL-VIEW CANDIDATE DETAILS MODAL (Section 15) */}
      {selectedCandidateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 md:p-6 backdrop-blur-md overflow-y-auto"
          onClick={() => setSelectedCandidateModal(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c0c0e] rounded-3xl border border-white/20 p-6 overflow-y-auto shadow-2xl space-y-6 text-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-4">
                {selectedCandidateModal.avatar ? (
                  <img
                    src={selectedCandidateModal.avatar}
                    alt={selectedCandidateModal.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-lg text-white">
                    {selectedCandidateModal.name[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white tracking-wide">{selectedCandidateModal.name}</h3>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                      {selectedCandidateModal.candidateId}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">{selectedCandidateModal.possibleRole}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-mono text-neutral-400 uppercase">Evidence Consistency</div>
                  <div className="text-lg font-bold font-mono text-white">{selectedCandidateModal.score}%</div>
                  <div className="text-[10px] text-neutral-400">{selectedCandidateModal.matchLevel}</div>
                </div>
                <button
                  onClick={() => setSelectedCandidateModal(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-target ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MODAL TABS */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <button
                onClick={() => setCandidateModalTab('dossier')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-target ${
                  candidateModalTab === 'dossier'
                    ? 'bg-white text-black font-bold shadow-lg'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                Dossier & Signals
              </button>
              <button
                onClick={() => setCandidateModalTab('graph')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-target flex items-center gap-1.5 ${
                  candidateModalTab === 'graph'
                    ? 'bg-white text-black font-bold shadow-lg'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Relationship Graph</span>
              </button>
              <button
                onClick={() => setCandidateModalTab('timeline')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-target flex items-center gap-1.5 ${
                  candidateModalTab === 'timeline'
                    ? 'bg-white text-black font-bold shadow-lg'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Chronological Timeline</span>
              </button>
            </div>

            {candidateModalTab === 'dossier' && (
              <div className="space-y-6">
                {/* SECTIONS: EDUCATION & GITHUB */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* EDUCATION & SCHOOL */}
              <div className="p-4 rounded-2xl bg-black border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold uppercase font-mono text-[11px]">
                  <GraduationCap className="w-4 h-4" />
                  <span>Education & Institutional Anchor</span>
                </div>
                <div className="pt-1">
                  <span className="text-neutral-400 block text-[10px]">College / University</span>
                  <span className="text-white font-medium text-sm">{selectedCandidateModal.college || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">School</span>
                  <span className="text-neutral-300">{selectedCandidateModal.school || 'Not verified'}</span>
                </div>
              </div>

              {/* GITHUB OVERVIEW */}
              <div className="p-4 rounded-2xl bg-black border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-semibold uppercase font-mono text-[11px]">
                    <GithubIcon className="w-4 h-4" />
                    <span>GitHub Code Footprint</span>
                  </div>
                  {selectedCandidateModal.github?.profileUrl && (
                    <a
                      href={selectedCandidateModal.github.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono text-white underline flex items-center gap-1 cursor-target"
                    >
                      <span>Open Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Username</span>
                    <span className="text-white font-mono">{selectedCandidateModal.github?.username || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Public Repos</span>
                    <span className="text-white font-mono font-bold">{selectedCandidateModal.github?.publicRepos || 0} Repositories</span>
                  </div>
                </div>
                <div className="text-[11px] text-neutral-400 italic">
                  {selectedCandidateModal.github?.bio || 'No public bio provided'}
                </div>
              </div>
            </div>

            {/* PROJECTS & SKILLS */}
            <div className="p-4 rounded-2xl bg-black border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold uppercase font-mono text-[11px]">
                <Code2 className="w-4 h-4" />
                <span>Verified Public Projects & Technology Stack</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCandidateModal.projects?.map((proj, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-xs text-white font-mono">
                    {proj}
                  </span>
                ))}
              </div>
              <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                {selectedCandidateModal.skills?.map((skill, idx) => (
                  <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-neutral-900 border border-white/10 text-[11px] text-neutral-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* YOUTUBE & PROFESSIONAL SOURCES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-black border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-semibold uppercase font-mono text-[11px]">
                    <YoutubeIcon className="w-4 h-4" />
                    <span>YouTube Presence</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-neutral-300 border border-white/10 font-mono">
                    {selectedCandidateModal.youtube?.status}
                  </span>
                </div>
                <p className="text-neutral-300">{selectedCandidateModal.youtube?.channel || 'No channel linked'}</p>
                {selectedCandidateModal.youtube?.url && (
                  <a
                    href={selectedCandidateModal.youtube.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-white underline cursor-target"
                  >
                    <span>View Public YouTube Results</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-black border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-semibold uppercase font-mono text-[11px]">
                    <Briefcase className="w-4 h-4" />
                    <span>Professional / LinkedIn</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                    selectedCandidateModal.professionalProfile?.status === 'CORROBORATED'
                      ? 'bg-white/15 text-white border-white/30 font-bold'
                      : 'bg-white/5 text-neutral-400 border-white/10'
                  }`}>
                    {selectedCandidateModal.professionalProfile?.status || 'NOT VERIFIED'}
                  </span>
                </div>
                {selectedCandidateModal.professionalProfile?.profileUrl && (
                  <a
                    href={selectedCandidateModal.professionalProfile.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-white underline cursor-target"
                  >
                    <span>Open Public LinkedIn Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <p className="text-neutral-300 text-[11px]">
                  {selectedCandidateModal.professionalProfile?.headline || selectedCandidateModal.professionalProfile?.note || 'Source unindexed or requires explicit authorization.'}
                </p>
                {selectedCandidateModal.professionalProfile?.evidence?.map((evItem, evIdx) => (
                  <div key={evIdx} className="text-[10px] text-neutral-400 flex items-start gap-1">
                    <span className="text-white">✓</span>
                    <span>{evItem}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PHOTO VERIFICATION & VISUAL SIMILARITY (Section 7) */}
            <div className="p-4 rounded-2xl bg-black border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold uppercase font-mono text-[11px]">
                  <Camera className="w-4 h-4" />
                  <span>Photo Verification & Visual Similarity</span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-white font-mono border border-white/20">
                  {selectedCandidateModal.photoMatchStatus || 'No photo evaluated'}
                </span>
              </div>
              <div className="flex items-center justify-between bg-neutral-950 p-3 rounded-xl border border-white/5">
                <div>
                  <span className="text-neutral-400 block text-[10px]">Photo Similarity</span>
                  <span className="text-xl font-bold font-mono text-white">
                    {selectedCandidateModal.photoSimilarity !== null && selectedCandidateModal.photoSimilarity !== undefined
                      ? `${selectedCandidateModal.photoSimilarity}%`
                      : 'N/A'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 max-w-sm text-right italic">
                  Evaluated as one weighted signal in overall evidence consistency. Not an absolute identity probability.
                </p>
              </div>
            </div>

            {/* EVIDENCE AUDIT TRAIL TABLE (Section 16) */}
            <div className="space-y-2">
              <div className="text-white font-semibold uppercase font-mono text-xs">Evidence Corroboration Trail</div>
              <div className="rounded-2xl border border-white/10 overflow-hidden bg-black">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900 border-b border-white/10 text-neutral-400 text-[10px] font-mono uppercase">
                    <tr>
                      <th className="p-3">Claim</th>
                      <th className="p-3">Source Provider</th>
                      <th className="p-3">Extracted Fact / Evidence</th>
                      <th className="p-3">Attestation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedCandidateModal.evidence?.map((ev, eIdx) => (
                      <tr key={eIdx} className="hover:bg-white/5">
                        <td className="p-3 font-medium text-white">{ev.claim}</td>
                        <td className="p-3 text-neutral-400 font-mono text-[11px]">{ev.evidenceSource}</td>
                        <td className="p-3 text-neutral-300">{ev.evidenceDetail}</td>
                        <td className="p-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-mono border border-white/20">
                            {ev.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SOURCES WITH [ OPEN SOURCE ] BUTTONS */}
            {selectedCandidateModal.sources?.length > 0 && (
              <div className="space-y-2">
                <div className="text-white font-semibold uppercase font-mono text-xs">Public Source Anchors</div>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidateModal.sources.map((src, sIdx) => (
                    <a
                      key={sIdx}
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/15 text-xs text-white transition-all cursor-target"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{src.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-black font-semibold font-mono uppercase">
                        OPEN SOURCE
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* AI INVESTIGATION ANALYSIS */}
            <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/15 space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold uppercase font-mono text-xs">
                <Sparkles className="w-4 h-4 text-white" />
                <span>AI Evidence Analysis (Strict Anti-Hallucination)</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                {selectedCandidateModal.aiAnalysis}
              </p>
            </div>
          </div>
        )}

        {candidateModalTab === 'graph' && (
          <RelationshipGraphView
            candidate={selectedCandidateModal}
            graphData={selectedCandidateModal.graph}
          />
        )}

        {candidateModalTab === 'timeline' && (
          <ChronologicalTimelineView
            candidate={selectedCandidateModal}
            timelineData={selectedCandidateModal.timeline}
          />
        )}
      </div>
    </div>
  )}

      {/* LEFT SIDEBAR (MONOCHROME) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-72 bg-neutral-950 border-r border-white/10 transition-transform duration-300 ease-in-out md:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-72'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onBackToHome}>
            <img src={logoImg} alt="PRISM" className="w-7 h-7 object-contain grayscale" />
            <div>
              <div className="font-semibold text-sm tracking-wider text-white flex items-center gap-1.5">
                PRISM <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white border border-white/20 font-mono">AI</span>
              </div>
              <p className="text-[10px] text-neutral-400">Intelligence Assistant</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 cursor-target"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Investigation Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white text-black hover:bg-neutral-200 border border-white text-sm font-medium transition-all shadow-sm cursor-target group"
          >
            <Plus className="w-4 h-4 text-black group-hover:rotate-90 transition-transform duration-200" />
            <span className="font-semibold">New Investigation</span>
          </button>
        </div>

        {/* Recent Investigations List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-mono tracking-wider text-neutral-500 uppercase">
            Investigation History
          </div>
          {sessions.map((sess) => (
            <button
              key={sess.id}
              onClick={async () => {
                setSessions((prev) => prev.map((s) => ({ ...s, active: s.id === sess.id })));
                setSelectedCandidateModal(null);
                setCandidateModalTab('dossier');
                setInputPrompt('');
                setAttachedImage(null);

                // Fetch full investigation state from backend if investigationId is present
                if (sess.investigationId) {
                  try {
                    const freshData = await getInvestigationState(sess.investigationId);
                    setMessages([
                      sess.userMessage || {
                        id: `usr-${sess.id}`,
                        role: 'user',
                        text: `Investigate Target: ${freshData.input?.name || sess.title}`,
                        inputParams: freshData.input,
                        image: freshData.input?.image ? { url: freshData.input.image } : null,
                        timestamp: 'Archive'
                      },
                      {
                        id: `ai-${sess.id}`,
                        role: 'assistant',
                        data: freshData,
                        isLive: true,
                        timestamp: 'Archive'
                      }
                    ]);
                    return;
                  } catch (e) {
                    console.warn('Failed to load investigation from server:', e);
                  }
                }

                if (sess.data) {
                  setMessages([
                    sess.userMessage || {
                      id: `usr-${sess.id}`,
                      role: 'user',
                      text: sess.title,
                      timestamp: sess.date
                    },
                    {
                      id: `ai-${sess.id}`,
                      role: 'assistant',
                      data: sess.data,
                      isLive: sess.isLive,
                      timestamp: sess.date
                    }
                  ]);
                }
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all cursor-target ${
                sess.active
                  ? 'bg-white/15 text-white border border-white/30 font-medium'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span className="truncate flex-1">{sess.title}</span>
              <span className="text-[10px] text-neutral-500 shrink-0">{sess.date}</span>
            </button>
          ))}
        </div>

        {/* User Info & Actions Footer */}
        <div className="p-3 border-t border-white/10 bg-black space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-xs text-black shrink-0">
              {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">
                {currentUser?.displayName || 'Investigator Console'}
              </div>
              <div className="text-[10px] text-neutral-400 truncate">
                {currentUser?.email || 'authenticated-agent@prism.id'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={onBackToHome}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all cursor-target"
              title="Return to PRISM Homepage"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <button
              onClick={onSignOut}
              className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10 transition-all cursor-target"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full bg-black overflow-hidden relative">
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-black/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 cursor-target"
              title="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-200">
                PRISM Multi-Platform Intelligence Active
              </span>
              <span className="text-[10px] text-neutral-500 border-l border-white/10 pl-2">
                Live GitHub & YouTube Corroborator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-target"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Clear Investigation</span>
              </button>
            )}
          </div>
        </header>

        {/* Chat Thread */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          {messages.length === 0 ? (
            /* EMPTY STATE HERO */
            <div className="max-w-4xl mx-auto my-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/20 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.12)]">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>

              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-2">
                Digital Identity Intelligence & Footprint Corroboration
              </h1>
              <p className="text-sm text-neutral-400 max-w-xl mb-8 leading-relaxed">
                Enter a target name, college, and GitHub username below or{' '}
                <span className="text-white font-medium underline underline-offset-4">drag & drop a photo</span> to generate 3–4 correlated candidate profiles across verified public repositories.
              </p>

              {/* QUICK PROMPT SUGGESTIONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                {SAMPLE_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleLaunchInvestigation(item.prompt, item.params)}
                    className="p-4 rounded-2xl bg-neutral-950 hover:bg-neutral-900 border border-white/10 hover:border-white/40 text-left transition-all hover:scale-[1.01] group cursor-target"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-xs font-semibold text-neutral-200 group-hover:text-white transition-colors">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed whitespace-pre-line">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* CONVERSATION MESSAGE LIST */
            <div className="max-w-4xl mx-auto space-y-8">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-4">
                  {/* USER MESSAGE */}
                  {msg.role === 'user' ? (
                    <div className="flex justify-end items-start gap-3">
                      <div className="max-w-[85%] rounded-3xl rounded-tr-sm bg-neutral-900 border border-white/15 p-4 text-white shadow-lg space-y-3">
                        {msg.image && (
                          <div className="relative group rounded-xl overflow-hidden border border-white/20 bg-black/40">
                            <img
                              src={msg.image.url}
                              alt={msg.image.name}
                              className="max-h-60 w-auto object-cover rounded-lg cursor-pointer"
                              onClick={() => setImageModalUrl(msg.image.url)}
                            />
                            <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono text-white border border-white/30 flex items-center gap-1.5">
                              <Eye className="w-3 h-3" />
                              <span>{msg.image.name}</span>
                              <span className="text-neutral-400">({msg.image.sizeFormatted})</span>
                            </div>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <div className="text-[10px] text-neutral-500 text-right font-mono">{msg.timestamp}</div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                        {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                      </div>
                    </div>
                  ) : (
                    /* ASSISTANT MESSAGE WITH 3-4 CANDIDATE CARDS */
                    <div className="flex justify-start items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                        <Sparkles className="w-4 h-4 text-black" />
                      </div>

                      <div className="w-full space-y-6">
                        {/* Investigation Completion Banner */}
                        <div className="p-4 rounded-2xl bg-neutral-950 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-white" />
                              <span className="text-sm font-semibold text-white tracking-wide">INVESTIGATION COMPLETE</span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/10">
                                {msg.data?.candidates?.length ?? 0} RELATED PROFILES FOUND
                              </span>
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">
                              Multi-vector public evidence synthesized across GitHub, YouTube, and Open Web repositories.
                            </p>
                          </div>

                          <button
                            onClick={() => handleExportJson(msg.data)}
                            className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 transition-all cursor-target shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export JSON</span>
                          </button>
                        </div>

                        {/* SECTION 13 & 24: CANDIDATE RESULT CARDS */}
                        {(!msg.data?.candidates || msg.data.candidates.length === 0) ? (
                          <div className="p-8 rounded-3xl bg-[#0a0a0c] border border-white/15 text-center space-y-3">
                            <Shield className="w-8 h-8 text-neutral-400 mx-auto opacity-70" />
                            <h4 className="text-base font-semibold text-white">No Public Candidate Profiles Identified</h4>
                            <p className="text-xs text-neutral-400 max-w-md mx-auto">
                              PRISM multi-vector search found insufficient public digital footprint or verified identity anchors for this target. In accordance with zero-fabrication standards, no uncorroborated mock candidates are generated.
                            </p>
                          </div>
                        ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {msg.data?.candidates?.map((cand, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-5 rounded-3xl bg-[#0a0a0c] border border-white/15 hover:border-white/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group cursor-target"
                            >
                              {/* Header: Name, Role, and Consistency Score */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  {cand.avatar ? (
                                    <img src={cand.avatar} alt={cand.name} className="w-11 h-11 rounded-xl object-cover border border-white/20" />
                                  ) : (
                                    <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-white text-sm">
                                      {cand.name[0]}
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="text-sm font-bold text-white tracking-wide">{cand.name}</h4>
                                    <p className="text-[11px] text-neutral-400 leading-tight">{cand.possibleRole}</p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="text-base font-bold font-mono text-white">{cand.score}%</span>
                                  <div className="text-[9px] text-neutral-400 font-mono uppercase">{cand.matchLevel}</div>
                                </div>
                              </div>

                              {/* Candidate Info Grid */}
                              <div className="space-y-2 text-xs">
                                {/* College & School */}
                                <div className="p-2.5 rounded-xl bg-black border border-white/5 space-y-1">
                                  <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                                    <GraduationCap className="w-3.5 h-3.5 text-white shrink-0" />
                                    <span className="truncate">{cand.college || 'Educational affiliation unverified'}</span>
                                  </div>
                                  {cand.school && (
                                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                                      <School className="w-3 h-3 text-neutral-400 shrink-0" />
                                      <span className="truncate">School: {cand.school}</span>
                                    </div>
                                  )}
                                </div>

                                {/* GitHub Details */}
                                <div className="p-2.5 rounded-xl bg-black border border-white/5 flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-1.5">
                                    <GithubIcon className="w-3.5 h-3.5 text-white shrink-0" />
                                    <span className="font-mono text-white font-medium">
                                      {cand.github?.username || 'Unlinked'}
                                    </span>
                                  </div>
                                  <span className="text-neutral-400 font-mono">
                                    {cand.github?.publicRepos !== undefined ? `${cand.github.publicRepos} public repos` : 'No code index'}
                                  </span>
                                </div>

                                {/* YouTube & Professional Profile */}
                                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                                  <div className="p-2 rounded-xl bg-black border border-white/5 truncate">
                                    <span className="text-neutral-500 block">YouTube</span>
                                    <span className="text-neutral-300 truncate">{cand.youtube?.status || 'Not Verified'}</span>
                                  </div>
                                  <div className="p-2 rounded-xl bg-black border border-white/5 truncate">
                                    <span className="text-neutral-500 block">LinkedIn</span>
                                    <span className={`truncate ${cand.professionalProfile?.status === 'CORROBORATED' ? 'text-white font-bold' : 'text-neutral-300'}`}>
                                      {cand.professionalProfile?.status || 'NOT VERIFIED'}
                                    </span>
                                  </div>
                                </div>

                                {/* Photo Similarity (Section 10) */}
                                <div className="p-2.5 rounded-xl bg-black border border-white/5 flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-1.5">
                                    <Camera className="w-3.5 h-3.5 text-white shrink-0" />
                                    <span className="font-mono text-white font-medium">Photo Similarity</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-white font-mono font-bold">
                                      {cand.photoSimilarity !== null && cand.photoSimilarity !== undefined ? `${cand.photoSimilarity}%` : 'N/A'}
                                    </span>
                                    {cand.photoMatchStatus && (
                                      <span className="block text-[9px] text-neutral-400 font-mono">{cand.photoMatchStatus}</span>
                                    )}
                                  </div>
                                </div>

                                {/* Projects Snippet */}
                                {cand.projects?.length > 0 && (
                                  <div className="p-2 rounded-xl bg-black border border-white/5">
                                    <span className="text-[10px] text-neutral-500 font-mono uppercase block mb-1">Projects</span>
                                    <div className="flex flex-wrap gap-1">
                                      {cand.projects.slice(0, 3).map((proj, pIdx) => (
                                        <span key={pIdx} className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">
                                          {proj}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Evidence Consistency Bar */}
                                <div className="space-y-1 pt-1">
                                  <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-neutral-400">Evidence Consistency</span>
                                    <span className="text-white font-bold">{cand.score}%</span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                                    <div className="h-full bg-white transition-all duration-500" style={{ width: `${cand.score}%` }} />
                                  </div>
                                </div>

                                {/* Signal indicators */}
                                <div className="flex flex-wrap gap-1.5 text-[10px] font-mono pt-1">
                                  {cand.matchedSignals?.includes('name') && <span className="text-white">✓ Name</span>}
                                  {cand.matchedSignals?.includes('college') && <span className="text-white">✓ College</span>}
                                  {cand.matchedSignals?.includes('github_username') && <span className="text-white">✓ GitHub</span>}
                                  {cand.matchedSignals?.includes('projects') && <span className="text-white">✓ Projects</span>}
                                  {cand.photoSimilarity !== null && cand.photoSimilarity !== undefined && cand.photoSimilarity >= 65 ? (
                                    <span className="text-white">✓ Photo</span>
                                  ) : cand.photoSimilarity ? (
                                    <span className="text-neutral-400">◐ Photo</span>
                                  ) : null}
                                  {cand.professionalProfile?.status === 'CORROBORATED' && <span className="text-white">✓ LinkedIn</span>}
                                  {cand.matchedSignals?.includes('youtube') ? <span className="text-white">✓ YouTube</span> : <span className="text-neutral-500">◐ YouTube</span>}
                                </div>

                                {/* AI Analysis Snippet */}
                                {cand.aiAnalysis && (
                                  <div className="text-[11px] text-neutral-300 line-clamp-2 italic pt-1 border-t border-white/10">
                                    "{cand.aiAnalysis}"
                                  </div>
                                )}
                              </div>

                              {/* VIEW FULL DETAILS BUTTON */}
                              <button
                                onClick={() => {
                                  setSelectedCandidateModal(cand);
                                  setCandidateModalTab('dossier');
                                }}
                                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-target"
                              >
                                <span>VIEW FULL DETAILS</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        )}

                        {/* EVIDENCE OVERVIEW & AI INVESTIGATION ANALYSIS (Section 24) */}
                        <div className="p-5 rounded-3xl bg-neutral-950 border border-white/15 space-y-4">
                          <div>
                            <h4 className="text-xs font-mono uppercase text-white font-semibold tracking-wider">
                              EVIDENCE OVERVIEW
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs font-mono">
                              <div className="p-2.5 rounded-xl bg-black border border-white/10 flex items-center justify-between">
                                <span className="text-neutral-400">GitHub</span>
                                <span className="text-white font-bold">
                                  {msg.data?.evidenceOverview?.github?.status === 'AVAILABLE' ? '✓ VERIFIED' : 'UNAVAILABLE'}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-black border border-white/10 flex items-center justify-between">
                                <span className="text-neutral-400">YouTube</span>
                                <span className="text-white font-bold">
                                  {msg.data?.evidenceOverview?.youtube?.status === 'AVAILABLE' ? '✓ POSSIBLE' : 'UNAVAILABLE'}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-black border border-white/10 flex items-center justify-between">
                                <span className="text-neutral-400">Professional</span>
                                <span className="text-neutral-400">NOT VERIFIED</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-black border border-white/10 flex items-center justify-between">
                                <span className="text-neutral-400">Public Web</span>
                                <span className="text-white font-bold">✓ CORROBORATED</span>
                              </div>
                            </div>
                          </div>

                          {/* AI INVESTIGATION ANALYSIS */}
                          {msg.data?.aiSummary && (
                            <div className="pt-3 border-t border-white/10">
                              <div className="flex items-center gap-2 text-xs font-mono uppercase text-white font-semibold tracking-wider mb-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-white" />
                                <span>AI INVESTIGATION ANALYSIS</span>
                              </div>
                              <p className="text-xs text-neutral-300 leading-relaxed">
                                {msg.data.aiSummary}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* LIVE STEP-BY-STEP PROGRESS UI (Section 19) */}
              {isInvestigating && (
                <div className="flex justify-start items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white shrink-0">
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  </div>
                  <div className="rounded-3xl rounded-tl-sm bg-neutral-950 border border-white/25 p-5 text-xs text-neutral-300 shadow-xl space-y-3 min-w-[320px]">
                    <div className="flex items-center justify-between text-white font-mono font-semibold">
                      <span>PRISM Neural Investigation Active</span>
                      <span className="text-[10px] text-neutral-400 animate-pulse">{currentProgressStep}...</span>
                    </div>

                    {/* Step list */}
                    <div className="space-y-1.5 font-mono text-[11px] pt-1">
                      {[
                        { key: 'INITIALIZING', label: 'INITIALIZING' },
                        { key: 'GITHUB SEARCH', label: 'GITHUB SEARCH' },
                        { key: 'YOUTUBE SEARCH', label: 'YOUTUBE SEARCH' },
                        { key: 'PUBLIC WEB SEARCH', label: 'PUBLIC WEB SEARCH' },
                        { key: 'PROFILE CORRELATION', label: 'PROFILE CORRELATION' },
                        { key: 'CANDIDATE GENERATION', label: 'CANDIDATE GENERATION' },
                        { key: 'AI ANALYSIS', label: 'AI ANALYSIS' },
                        { key: 'INVESTIGATION COMPLETE', label: 'INVESTIGATION COMPLETE' }
                      ].map((st, sIdx) => {
                        const isDone = completedSteps.includes(st.key);
                        const isCurrent = currentProgressStep === st.key;
                        return (
                          <div key={sIdx} className="flex items-center justify-between">
                            <span className={isDone ? 'text-white' : isCurrent ? 'text-neutral-200 font-bold' : 'text-neutral-500'}>
                              {st.label}
                            </span>
                            <span className="font-bold">
                              {isDone ? '✓' : isCurrent ? '⟳' : '○'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* BOTTOM PROMPT INPUT BAR WITH OPTIONAL PARAMETERS DRAWER */}
        <div className="w-full px-4 md:px-8 pb-6 pt-2 bg-gradient-to-t from-black via-black/90 to-transparent">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            {/* PARAMETERS DRAWER (Section 1: Name, College, School, GitHub, Description) */}
            {showParamsDrawer && (
              <div className="w-full mb-3 p-4 rounded-3xl bg-[#0d0d10] border border-white/20 shadow-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-mono font-semibold uppercase text-white flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Investigation Target Parameters
                  </span>
                  <button
                    onClick={() => setShowParamsDrawer(false)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">Target Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Abdulkani B"
                      value={targetParams.name}
                      onChange={(e) => setTargetParams((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-white/40"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">College / University</label>
                    <input
                      type="text"
                      placeholder="e.g. Sri Eshwar College Of Engineering"
                      value={targetParams.college}
                      onChange={(e) => setTargetParams((p) => ({ ...p, college: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-white/40"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">GitHub Username</label>
                    <input
                      type="text"
                      placeholder="e.g. abdulkani007"
                      value={targetParams.githubUsername}
                      onChange={(e) => setTargetParams((p) => ({ ...p, githubUsername: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-white/40"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 block mb-1">School (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Higher Secondary School"
                      value={targetParams.school}
                      onChange={(e) => setTargetParams((p) => ({ ...p, school: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-white/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-neutral-400 block mb-1">Short Description</label>
                  <input
                    type="text"
                    placeholder="e.g. AI and Full Stack developer, student interested in technology."
                    value={targetParams.description}
                    onChange={(e) => setTargetParams((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 text-xs"
                  />
                </div>
              </div>
            )}

            {/* FLOATING IMAGE ATTACHMENT PREVIEW */}
            {attachedImage && (
              <div className="w-full mb-3 flex items-center gap-3 p-2.5 rounded-2xl bg-neutral-950 border border-white/25 shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black border border-white/15 shrink-0">
                  <img src={attachedImage.url} alt="Attached" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-white shrink-0" />
                    <span>{attachedImage.name}</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    {attachedImage.sizeFormatted} • {attachedImage.width}x{attachedImage.height} px
                  </div>
                </div>
                <button
                  onClick={() => setAttachedImage(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-target"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* HIDDEN FILE INPUT */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processImageFile(e.target.files[0]);
                }
              }}
            />

            {/* GLOWING CAPSULE / PILL INPUT BAR (MONOCHROME) */}
            <div className="relative w-full group">
              {/* AMBIENT WHITE HALO GLOW */}
              <div className="absolute -inset-1 rounded-full bg-white/10 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* MAIN PILL CONTAINER */}
              <div className="relative flex items-center justify-between w-full h-14 md:h-16 px-3 md:px-4 rounded-full bg-neutral-950 border border-white/25 shadow-[0_0_35px_rgba(255,255,255,0.08)] backdrop-blur-xl">
                {/* LEFT BUTTONS: SPARKLE, PARAMETERS, PHOTO UPLOAD */}
                <div className="flex items-center gap-1.5 shrink-0 pl-1">
                  {/* Glowing Sparkle Icon Button */}
                  <div
                    className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all cursor-target shadow-inner"
                    title="PRISM Intelligence Enhancer"
                  >
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>

                  {/* Target Parameters Drawer Button */}
                  <button
                    onClick={() => setShowParamsDrawer((p) => !p)}
                    className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors cursor-target border ${
                      showParamsDrawer ? 'bg-white text-black border-white' : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border-white/10'
                    }`}
                    title="Target Parameters Form (Name, College, School, GitHub)"
                  >
                    <SlidersHorizontal className="w-4 h-4 md:w-5 md:h-5" />
                  </button>

                  {/* Photo Upload Icon Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-target border border-white/10"
                    title="Upload target photo or drop image"
                  >
                    <ImageIcon className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>

                {/* MIDDLE INPUT AREA WITH INTEGRATED DESCRIPTION */}
                <div className="flex-1 flex flex-col justify-center px-3 md:px-4 min-w-0">
                  <input
                    ref={textareaRef}
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleLaunchInvestigation();
                      }
                    }}
                    placeholder="Enter name, college, or GitHub handle to run investigation..."
                    className="w-full bg-transparent text-white text-xs md:text-sm placeholder-neutral-500 focus:outline-none truncate"
                  />
                  {/* Small description inside the chatbox as requested */}
                  <span className="text-[9px] md:text-[10px] text-neutral-400 truncate tracking-tight font-mono select-none">
                    Press Enter or click Search • Accepts Name, College, GitHub, or Photo
                  </span>
                </div>

                {/* RIGHT CIRCULAR SUBMIT BUTTON WITH MONOCHROME ARROW */}
                <button
                  onClick={() => handleLaunchInvestigation()}
                  disabled={isInvestigating || (!inputPrompt.trim() && !targetParams.name && !targetParams.githubUsername && !attachedImage)}
                  className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all cursor-target shrink-0 shadow-lg ${
                    isInvestigating || (!inputPrompt.trim() && !targetParams.name && !targetParams.githubUsername && !attachedImage)
                      ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed border border-white/5'
                      : 'bg-white text-black hover:bg-neutral-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] active:scale-95 border border-white'
                  }`}
                  title="Run Real Investigation"
                >
                  {isInvestigating ? (
                    <RefreshCw className="w-4 h-4 md:w-5 md:h-5 animate-spin text-black" />
                  ) : (
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
