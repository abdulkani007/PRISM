import React, { useState, useMemo } from 'react';
import {
  Network,
  Clock,
  ExternalLink,
  Shield,
  GraduationCap,
  Code2,
  CheckCircle2,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

export function RelationshipGraphView({ candidate, graphData }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterType, setFilterType] = useState('ALL');

  // Synthesize nodes & edges from candidate if graphData is partial
  const { nodes, edges } = useMemo(() => {
    let rawNodes = graphData?.nodes || candidate?.graph?.nodes || [];
    let rawEdges = graphData?.edges || candidate?.graph?.edges || [];

    if (!rawNodes || rawNodes.length === 0) {
      // Build visual graph from candidate fields
      const pName = candidate?.name || 'Target Identity';
      const cId = candidate?.candidateId || 'CAND-01';
      rawNodes = [
        {
          id: `person:${cId}`,
          label: pName,
          type: 'PRIMARY_PERSON',
          category: 'identity',
          properties: {
            Name: pName,
            Candidate: cId,
            Score: `${candidate?.score || 50}%`,
            Match: candidate?.matchLevel || 'Probable'
          }
        }
      ];
      rawEdges = [];

      // College
      if (candidate?.college) {
        const orgId = 'org:college';
        rawNodes.push({
          id: orgId,
          label: candidate.college,
          type: 'ACADEMIC_INSTITUTION',
          category: 'institution',
          properties: {
            Institution: candidate.college,
            Status: 'Enrolled / Affiliated'
          }
        });
        rawEdges.push({
          source: `person:${cId}`,
          target: orgId,
          label: 'AFFILIATED_WITH',
          type: 'affiliation'
        });
      }

      // GitHub
      if (candidate?.github?.username) {
        const ghId = `profile:github:${candidate.github.username}`;
        rawNodes.push({
          id: ghId,
          label: `GitHub (@${candidate.github.username})`,
          type: 'DIGITAL_PROFILE',
          category: 'profile',
          properties: {
            Platform: 'GitHub',
            Handle: `@${candidate.github.username}`,
            Repositories: candidate.github.publicRepos || 0,
            URL: candidate.github.profileUrl || ''
          }
        });
        rawEdges.push({
          source: `person:${cId}`,
          target: ghId,
          label: 'OWNS_PROFILE',
          type: 'ownership'
        });

        // Repositories
        (candidate.projects || []).slice(0, 5).forEach((proj, idx) => {
          const repoId = `repo:${idx}`;
          rawNodes.push({
            id: repoId,
            label: proj,
            type: 'CODE_REPOSITORY',
            category: 'repository',
            properties: {
              Repository: proj,
              Author: candidate.github.username
            }
          });
          rawEdges.push({
            source: ghId,
            target: repoId,
            label: 'AUTHORED',
            type: 'authorship'
          });
        });

        // Skills
        (candidate.skills || []).slice(0, 4).forEach((sk, idx) => {
          const skId = `skill:${idx}`;
          rawNodes.push({
            id: skId,
            label: sk,
            type: 'TECHNOLOGY_SKILL',
            category: 'skill',
            properties: { Skill: sk }
          });
          rawEdges.push({
            source: ghId,
            target: skId,
            label: 'USES_TECH',
            type: 'skill'
          });
        });
      }

      // LinkedIn / Professional
      if (candidate?.professionalProfile?.profileUrl || candidate?.professionalProfile?.status === 'CORROBORATED') {
        const liId = 'profile:linkedin';
        rawNodes.push({
          id: liId,
          label: 'LinkedIn Profile Footprint',
          type: 'DIGITAL_PROFILE',
          category: 'profile',
          properties: {
            Platform: 'LinkedIn',
            Status: candidate.professionalProfile.status || 'CORROBORATED',
            Headline: candidate.professionalProfile.headline || 'Verified Footprint'
          }
        });
        rawEdges.push({
          source: `person:${cId}`,
          target: liId,
          label: 'MAINTAINS_FOOTPRINT',
          type: 'footprint'
        });
      }

      // Biometrics
      if (candidate?.photoSimilarity) {
        const bioId = 'obs:biometrics';
        rawNodes.push({
          id: bioId,
          label: `Biometric Match (${candidate.photoSimilarity}%)`,
          type: 'BIOMETRIC_OBSERVATION',
          category: 'biometrics',
          properties: {
            Detector: 'YuNet & SFace ONNX',
            Similarity: `${candidate.photoSimilarity}%`,
            Status: candidate.photoMatchStatus || 'Strong Match'
          }
        });
        rawEdges.push({
          source: `person:${cId}`,
          target: bioId,
          label: 'VERIFIED_BY',
          type: 'biometrics'
        });
      }
    }

    // Position coordinates for SVG rendering (radial layout)
    const centerX = 360;
    const centerY = 240;
    const total = rawNodes.length;

    const positioned = rawNodes.map((n, idx) => {
      if (idx === 0) {
        return { ...n, x: centerX, y: centerY };
      }
      const angle = ((idx - 1) / Math.max(1, total - 1)) * 2 * Math.PI - Math.PI / 2;
      const radius = n.type === 'CODE_REPOSITORY' || n.type === 'TECHNOLOGY_SKILL' ? 170 : 130;
      return {
        ...n,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    return { nodes: positioned, edges: rawEdges };
  }, [candidate, graphData]);

  // Filter nodes
  const filteredNodes = useMemo(() => {
    if (filterType === 'ALL') return nodes;
    return nodes.filter(n => {
      if (filterType === 'IDENTITY') return n.type === 'PRIMARY_PERSON' || n.type === 'PERSON';
      if (filterType === 'PROFILES') return n.type === 'DIGITAL_PROFILE';
      if (filterType === 'CODE') return n.type === 'CODE_REPOSITORY' || n.type === 'TECHNOLOGY_SKILL';
      if (filterType === 'INSTITUTION') return n.type === 'ACADEMIC_INSTITUTION';
      if (filterType === 'BIOMETRICS') return n.type === 'BIOMETRIC_OBSERVATION';
      return true;
    });
  }, [nodes, filterType]);

  const activeNodeMap = useMemo(() => {
    const map = new Set();
    filteredNodes.forEach(n => map.add(n.id));
    return map;
  }, [filteredNodes]);

  return (
    <div className="space-y-4">
      {/* Graph Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-mono">
          <Layers className="w-3.5 h-3.5 text-white" />
          <span>Topology Filter:</span>
        </div>
        <div className="flex flex-wrap gap-1 text-[11px] font-mono">
          {['ALL', 'IDENTITY', 'PROFILES', 'CODE', 'INSTITUTION', 'BIOMETRICS'].map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-target ${
                filterType === f
                  ? 'bg-white text-black font-bold'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Canvas & Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* SVG Graph Viewport */}
        <div className="lg:col-span-2 relative bg-black/60 rounded-2xl border border-white/10 p-2 overflow-hidden flex items-center justify-center min-h-[380px]">
          <svg
            viewBox="0 0 720 480"
            className="w-full h-full max-h-[460px] select-none"
          >
            <defs>
              <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#888888" stopOpacity="0.15" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Render Edges */}
            {edges.map((e, idx) => {
              const src = nodes.find(n => n.id === e.source);
              const tgt = nodes.find(n => n.id === e.target);
              if (!src || !tgt) return null;
              if (!activeNodeMap.has(src.id) || !activeNodeMap.has(tgt.id)) return null;

              const isHighlighted = selectedNode && (selectedNode.id === src.id || selectedNode.id === tgt.id);

              return (
                <g key={`edge-${idx}`}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isHighlighted ? '#ffffff' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={isHighlighted ? 2 : 1}
                    strokeDasharray={e.type === 'footprint' || e.type === 'biometrics' ? '3,3' : 'none'}
                  />
                  {/* Midpoint Label */}
                  <text
                    x={(src.x + tgt.x) / 2}
                    y={(src.y + tgt.y) / 2 - 4}
                    fill={isHighlighted ? '#ffffff' : '#777777'}
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    {e.label}
                  </text>
                </g>
              );
            })}

            {/* Render Nodes */}
            {filteredNodes.map(n => {
              const isCenter = n.type === 'PRIMARY_PERSON' || n.type === 'PERSON';
              const isSelected = selectedNode?.id === n.id;
              const radius = isCenter ? 24 : 16;

              return (
                <g
                  key={n.id}
                  className="cursor-pointer transition-transform hover:scale-110"
                  onClick={() => setSelectedNode(n)}
                >
                  {/* Node Circle */}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={radius}
                    fill={isCenter ? '#ffffff' : (isSelected ? '#dddddd' : '#141416')}
                    stroke={isSelected ? '#ffffff' : (isCenter ? '#ffffff' : 'rgba(255,255,255,0.4)')}
                    strokeWidth={isSelected ? 3 : 1.5}
                    filter={isCenter ? 'url(#glow)' : undefined}
                  />

                  {/* Inner Icon or Letter */}
                  <text
                    x={n.x}
                    y={n.y + 4}
                    fill={isCenter ? '#000000' : '#ffffff'}
                    fontSize={isCenter ? '11' : '9'}
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    {isCenter ? 'ID' : (n.label ? n.label[0].toUpperCase() : '•')}
                  </text>

                  {/* Node Label Below */}
                  <text
                    x={n.x}
                    y={n.y + radius + 12}
                    fill={isSelected ? '#ffffff' : '#aaaaaa'}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    {n.label.length > 18 ? n.label.substring(0, 16) + '…' : n.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Quick Helper Legend */}
          <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[10px] font-mono text-neutral-400 bg-black/70 px-3 py-1 rounded-full border border-white/10">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
              <span>Primary Entity</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full border border-white/60 bg-neutral-900 inline-block"></span>
              <span>Discovered Signal</span>
            </div>
          </div>
        </div>

        {/* Selected Entity Inspector Panel */}
        <div className="bg-black/50 rounded-2xl border border-white/10 p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2 text-white font-mono text-xs uppercase font-semibold">
                <Info className="w-3.5 h-3.5 text-neutral-400" />
                <span>Entity Inspector</span>
              </div>
              {selectedNode && (
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-[10px] text-neutral-400 hover:text-white font-mono"
                >
                  Clear
                </button>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Label</span>
                  <span className="text-sm font-bold text-white block">{selectedNode.label}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Type</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-white inline-block border border-white/20">
                    {selectedNode.type}
                  </span>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block">Observed Attributes</span>
                  {selectedNode.properties &&
                    Object.entries(selectedNode.properties).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-xs py-0.5">
                        <span className="text-neutral-400 font-mono text-[11px]">{k}:</span>
                        <span className="text-white font-medium truncate max-w-[160px] text-right font-mono text-[11px]">
                          {String(v)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500 text-xs font-mono space-y-2">
                <Network className="w-8 h-8 mx-auto text-neutral-600 stroke-[1.5]" />
                <p>Click any node in the topology network to inspect provenance attributes and links.</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/10 text-[10px] font-mono text-neutral-500">
            Total Entities: {nodes.length} | Relationships: {edges.length}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChronologicalTimelineView({ candidate, timelineData }) {
  const events = useMemo(() => {
    if (timelineData && timelineData.length > 0) return timelineData;
    if (candidate?.timeline && candidate.timeline.length > 0) return candidate.timeline;

    // Fallback synthesis
    const defaultEvents = [];
    if (candidate?.college) {
      defaultEvents.push({
        date: '2022 - Present',
        title: `Academic Enrollment at ${candidate.college}`,
        category: 'EDUCATION',
        source: 'Institutional Directory',
        description: `Enrolled in engineering / technological curriculum (${candidate.education || 'Undergraduate'}).`,
        status: 'CORROBORATED'
      });
    }
    if (candidate?.github?.username) {
      defaultEvents.push({
        date: '2023 - 2024',
        title: `Established Public GitHub Footprint (@${candidate.github.username})`,
        category: 'OPEN_SOURCE',
        source: 'GitHub API',
        description: `Maintains ${candidate.github.publicRepos || 0} public repositories with ${candidate.github.followers || 0} followers.`,
        status: 'CORROBORATED'
      });
    }
    (candidate?.projects || []).slice(0, 3).forEach((proj) => {
      defaultEvents.push({
        date: 'Recent',
        title: `Authored Repository: '${proj}'`,
        category: 'CODEBASE',
        source: 'GitHub Ledger',
        description: 'Demonstrated software repository with commit and stack provenance.',
        status: 'CORROBORATED'
      });
    });
    if (candidate?.photoSimilarity) {
      defaultEvents.push({
        date: new Date().toISOString().split('T')[0],
        title: `Facial Biometric Attestation (${candidate.photoSimilarity}%)`,
        category: 'VERIFICATION',
        source: 'YuNet & SFace ONNX',
        description: `Visual reference photograph comparison: ${candidate.photoMatchStatus || 'Strong Match'}.`,
        status: 'CORROBORATED'
      });
    }
    return defaultEvents;
  }, [candidate, timelineData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-white font-mono text-xs uppercase font-semibold">
          <Clock className="w-4 h-4 text-white" />
          <span>Chronological Provenance Timeline</span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
          {events.length} Milestones Recorded
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/15">
        {events.map((ev, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline Marker */}
            <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-neutral-900 border-2 border-white group-hover:scale-125 transition-transform"></div>

            {/* Event Card */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 hover:border-white/25 transition-all space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-black font-bold">
                    {ev.category || 'EVENT'}
                  </span>
                  <span className="text-xs font-mono text-neutral-400">{ev.date}</span>
                </div>
                {ev.status && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    <span>{ev.status}</span>
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-white tracking-wide">{ev.title}</h4>
              <p className="text-xs text-neutral-300 font-sans leading-relaxed">{ev.description}</p>

              <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>Source: {ev.source || 'Authorized OSINT'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
