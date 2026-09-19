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
  Eye
} from 'lucide-react';
import { sendChatInvestigation } from '../lib/api';

const SAMPLE_SUGGESTIONS = [
  {
    title: 'Biometric & Photo Provenance',
    prompt: 'Upload or drop a portrait photo to run 68-point facial landmark attestation and cross-platform reverse matching.',
    icon: '📸'
  },
  {
    title: 'Investigate Alex Kumar',
    prompt: 'Audit digital footprint for @alex-dev-sec across GitHub commit registries, academic preprints, and keynote records.',
    icon: '🔍'
  },
  {
    title: 'Detect Affiliation Discrepancies',
    prompt: 'Check for concurrent corporate tenure and namespace collisions between Nexus Defense and CyberShield Labs.',
    icon: '⚠️'
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
  const [investigationStep, setInvestigationStep] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [imageModalUrl, setImageModalUrl] = useState(null);

  // Investigation sessions list
  const [sessions, setSessions] = useState([
    {
      id: 'sess-1',
      title: 'Alex Kumar Footprint Resolution',
      date: 'Today',
      active: true
    },
    {
      id: 'sess-2',
      title: 'Dr. Elena Rostova Stanford Audit',
      date: 'Yesterday',
      active: false
    },
    {
      id: 'sess-3',
      title: 'Facial Biometric & pHash #104',
      date: '3 days ago',
      active: false
    }
  ]);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll to bottom on new messages or loading
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isInvestigating, investigationStep]);

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

  // Submit investigation query
  const handleSendMessage = async (textOverride) => {
    const promptToSend = (typeof textOverride === 'string' ? textOverride : inputPrompt).trim();
    if (!promptToSend && !attachedImage) return;

    const userMessageId = `usr-${Date.now()}`;
    const newUserMessage = {
      id: userMessageId,
      role: 'user',
      text: promptToSend || (attachedImage ? `Analyze uploaded biometric asset: ${attachedImage.name}` : ''),
      image: attachedImage ? { ...attachedImage } : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputPrompt('');
    const currentImage = attachedImage;
    setAttachedImage(null);
    setIsInvestigating(true);
    setInvestigationStep(1);

    // Phased loading steps for realistic intelligence feel
    const step1 = setTimeout(() => setInvestigationStep(2), 600);
    const step2 = setTimeout(() => setInvestigationStep(3), 1200);

    try {
      const response = await sendChatInvestigation({
        prompt: promptToSend,
        image: currentImage,
        history: messages
      });

      clearTimeout(step1);
      clearTimeout(step2);

      const assistantMessageId = `ai-${Date.now()}`;
      const newAssistantMessage = {
        id: assistantMessageId,
        role: 'assistant',
        data: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, newAssistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          error: 'An anomaly occurred during footprint attestation. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsInvestigating(false);
      setInvestigationStep(0);
    }
  };

  // Reset to new conversation
  const handleNewChat = () => {
    setMessages([]);
    setInputPrompt('');
    setAttachedImage(null);
    const newSessId = `sess-${Date.now()}`;
    setSessions((prev) => [
      { id: newSessId, title: 'New Investigation', date: 'Just now', active: true },
      ...prev.map((s) => ({ ...s, active: false }))
    ]);
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

      {/* MODAL FOR IMAGE INSPECTION */}
      {imageModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setImageModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-neutral-900 rounded-2xl border border-white/20 p-2 overflow-hidden shadow-2xl">
            <button
              onClick={() => setImageModalUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/80 hover:bg-black text-white/80 hover:text-white transition-colors cursor-target border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={imageModalUrl} alt="Inspection" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
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
              onClick={() => {
                setSessions((prev) => prev.map((s) => ({ ...s, active: s.id === sess.id })));
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

      {/* MAIN CHAT CONTENT AREA (MONOCHROME) */}
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
                PRISM Neural Engine Active
              </span>
              <span className="text-[10px] text-neutral-500 border-l border-white/10 pl-2">
                SHA-256 Tamper-Evident Attestation
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
            <div className="max-w-3xl mx-auto my-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/20 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.12)]">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>

              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-2">
                What digital footprint would you like to investigate?
              </h1>
              <p className="text-sm text-neutral-400 max-w-xl mb-8 leading-relaxed">
                Provide a name, social handle, corporate entity, or{' '}
                <span className="text-white font-medium underline underline-offset-4">drag & drop a photo</span> to run 68-point facial biometric
                clustering and cross-platform attestation.
              </p>

              {/* QUICK PROMPT SUGGESTIONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                {SAMPLE_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-4 rounded-2xl bg-neutral-950 hover:bg-neutral-900 border border-white/10 hover:border-white/40 text-left transition-all hover:scale-[1.01] group cursor-target"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg grayscale">{item.icon}</span>
                      <span className="text-xs font-semibold text-neutral-200 group-hover:text-white transition-colors">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* CONVERSATION MESSAGE LIST */
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {/* USER MESSAGE */}
                  {msg.role === 'user' ? (
                    <div className="flex justify-end items-start gap-3">
                      <div className="max-w-[85%] rounded-3xl rounded-tr-sm bg-neutral-900 border border-white/15 p-4 text-white shadow-lg space-y-3">
                        {/* Attached Image Thumbnail */}
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
                    /* ASSISTANT MESSAGE */
                    <div className="flex justify-start items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                        <Sparkles className="w-4 h-4 text-black" />
                      </div>

                      <div className="max-w-[90%] w-full rounded-3xl rounded-tl-sm bg-neutral-950 border border-white/15 p-5 text-neutral-100 shadow-xl space-y-5">
                        {/* Header & Title */}
                        {msg.data?.title && (
                          <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-white" />
                              <h4 className="text-sm font-semibold text-white tracking-wide">{msg.data.title}</h4>
                            </div>
                            <button
                              onClick={() => handleExportJson(msg.data)}
                              className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-target"
                              title="Export Investigation JSON"
                            >
                              <Download className="w-3 h-3" />
                              <span>Export</span>
                            </button>
                          </div>
                        )}

                        {/* Summary */}
                        {msg.data?.summary && (
                          <p className="text-xs text-neutral-300 leading-relaxed">{msg.data.summary}</p>
                        )}

                        {/* BIOMETRICS ANALYSIS CARD */}
                        {msg.data?.biometrics && (
                          <div className="p-4 rounded-2xl bg-neutral-900/90 border border-white/15 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" /> Biometric Signature Verification
                              </span>
                              <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-white/10 border border-white/20">
                                {msg.data.biometrics.matchConfidence}% Match
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                              <div className="p-2.5 rounded-xl bg-black border border-white/10">
                                <div className="text-neutral-400">Facial Mesh</div>
                                <div className="text-white font-mono font-medium mt-0.5">{msg.data.biometrics.landmarksCount} points</div>
                              </div>
                              <div className="p-2.5 rounded-xl bg-black border border-white/10">
                                <div className="text-neutral-400">Tamper Risk</div>
                                <div className="text-neutral-200 font-mono font-medium mt-0.5">{msg.data.biometrics.tamperRisk}</div>
                              </div>
                              <div className="p-2.5 rounded-xl bg-black border border-white/10">
                                <div className="text-neutral-400">Resolution</div>
                                <div className="text-white font-mono font-medium mt-0.5">{msg.data.biometrics.resolution}</div>
                              </div>
                              <div className="p-2.5 rounded-xl bg-black border border-white/10">
                                <div className="text-neutral-400">Perceptual Hash</div>
                                <div className="text-neutral-300 font-mono truncate mt-0.5">{msg.data.biometrics.perceptualHash}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* MATCHED CANDIDATES */}
                        {msg.data?.matchedCandidates?.map((cand, idx) => (
                          <div key={idx} className="p-4 rounded-2xl bg-neutral-900/60 border border-white/15 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="text-sm font-semibold text-white">{cand.name}</h5>
                                <p className="text-[11px] text-neutral-400">{cand.role}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-mono text-white font-bold">{cand.handle}</span>
                                <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">{cand.status}</div>
                              </div>
                            </div>

                            {/* Source links */}
                            <div className="space-y-1.5 pt-1">
                              <div className="text-[10px] font-mono text-neutral-400 uppercase">Cross-Platform Corroboration</div>
                              {cand.sources.map((src, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-black border border-white/10 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                                    <span className="font-medium text-neutral-200">{src.platform}</span>
                                    <span className="text-[11px] text-neutral-400">• {src.note}</span>
                                  </div>
                                  <span className="text-[10px] text-neutral-500 font-mono">Attested</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* TEXT QUERY CANDIDATE & EVIDENCE */}
                        {msg.data?.candidate && (
                          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/15 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="text-sm font-semibold text-white">{msg.data.candidate.name}</h5>
                                <p className="text-[11px] text-neutral-400">{msg.data.candidate.org}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-mono text-white font-bold">{msg.data.candidate.handle}</span>
                                <div className="text-[10px] text-neutral-400 font-mono">{msg.data.candidate.confidence}% Confidence</div>
                              </div>
                            </div>

                            {msg.data.evidence && (
                              <div className="space-y-1.5 pt-1">
                                <div className="text-[10px] font-mono text-neutral-400 uppercase">Verified Ground Truth Trail</div>
                                {msg.data.evidence.map((ev, eIdx) => (
                                  <div
                                    key={eIdx}
                                    className="p-2 rounded-lg bg-black border border-white/10 text-xs flex items-start gap-2"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-medium text-neutral-200">{ev.provider}: </span>
                                      <span className="text-neutral-400">{ev.fact}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* CONFLICTS WARNING */}
                        {msg.data?.conflicts && msg.data.conflicts.length > 0 && (
                          <div className="p-3.5 rounded-2xl bg-neutral-900 border border-white/25 text-xs space-y-1.5">
                            <div className="flex items-center gap-1.5 font-medium text-white">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-white" />
                              <span>{msg.data.conflicts[0].title || 'Flagged Discrepancy'}</span>
                            </div>
                            <p className="text-[11px] text-neutral-300 leading-relaxed">
                              {msg.data.conflicts[0].detail}
                            </p>
                          </div>
                        )}

                        {/* PROVENANCE LEDGER / SHA-256 */}
                        {msg.data?.sha256 && (
                          <div className="p-2.5 rounded-xl bg-black border border-white/10 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                            <div className="flex items-center gap-1.5 truncate mr-2">
                              <Hash className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span className="truncate">SHA-256: {msg.data.sha256}</span>
                            </div>
                            <button
                              onClick={() => handleCopyText(msg.data.sha256, msg.id)}
                              className="text-neutral-300 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shrink-0 flex items-center gap-1 cursor-target"
                            >
                              {copiedId === msg.id ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        )}

                        {/* FOLLOW-UP SUGGESTION CHIPS */}
                        {msg.data?.followUpQuestions && (
                          <div className="space-y-1.5 pt-2 border-t border-white/10">
                            <div className="text-[10px] font-mono text-neutral-400 uppercase">Suggested Inquiries</div>
                            <div className="flex flex-wrap gap-2">
                              {msg.data.followUpQuestions.map((q, qIdx) => (
                                <button
                                  key={qIdx}
                                  onClick={() => handleSendMessage(q)}
                                  className="text-xs text-left py-1.5 px-3 rounded-full bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 hover:border-white/30 transition-all cursor-target"
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-[10px] text-neutral-500 font-mono">{msg.timestamp}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* LIVE PROCESSING / INVESTIGATION ANIMATION */}
              {isInvestigating && (
                <div className="flex justify-start items-start gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white shrink-0">
                    <Sparkles className="w-4 h-4 animate-spin text-white" />
                  </div>
                  <div className="rounded-3xl rounded-tl-sm bg-neutral-950 border border-white/20 p-4 text-xs text-neutral-300 shadow-xl space-y-2 min-w-[280px]">
                    <div className="flex items-center gap-2 text-white font-mono font-medium">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>PRISM Neural Attestation in Progress...</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono pl-5">
                      {investigationStep === 1 && '• Triangulating 68-point facial mesh & perceptual hash...'}
                      {investigationStep === 2 && '• Cross-corroborating GitHub, arXiv, and registry footprints...'}
                      {investigationStep === 3 && '• Anchoring findings to tamper-evident SHA-256 proof ledger...'}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* BOTTOM PROMPT INPUT BAR (MONOCHROME GLOWING CAPSULE) */}
        <div className="w-full px-4 md:px-8 pb-6 pt-2 bg-gradient-to-t from-black via-black/90 to-transparent">
          <div className="max-w-3xl mx-auto flex flex-col items-center">
            {/* FLOATING IMAGE ATTACHMENT PREVIEW (IF ATTACHED) */}
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
                {/* LEFT SPARKLE BUTTON & PHOTO ATTACHMENT */}
                <div className="flex items-center gap-1.5 shrink-0 pl-1">
                  {/* Glowing Sparkle Icon Button */}
                  <div
                    className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all cursor-target shadow-inner"
                    title="PRISM Intelligence Enhancer"
                  >
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>

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
                        handleSendMessage();
                      }
                    }}
                    placeholder="Investigate digital identity, upload photo, or describe target..."
                    className="w-full bg-transparent text-white text-xs md:text-sm placeholder-neutral-500 focus:outline-none truncate"
                  />
                  {/* Small description inside the chatbox as requested */}
                  <span className="text-[9px] md:text-[10px] text-neutral-400 truncate tracking-tight font-mono select-none">
                    Press Enter to send • Drag & drop photo for facial & footprint analysis
                  </span>
                </div>

                {/* RIGHT CIRCULAR SUBMIT BUTTON WITH MONOCHROME ARROW */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isInvestigating || (!inputPrompt.trim() && !attachedImage)}
                  className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all cursor-target shrink-0 shadow-lg ${
                    isInvestigating || (!inputPrompt.trim() && !attachedImage)
                      ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed border border-white/5'
                      : 'bg-white text-black hover:bg-neutral-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] active:scale-95 border border-white'
                  }`}
                  title="Run Investigation"
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
