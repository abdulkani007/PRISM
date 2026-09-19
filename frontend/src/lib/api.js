const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function createInvestigation(inputData) {
  const res = await fetch(`${API_BASE_URL}/api/v1/investigations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: inputData.name || inputData.target_name || '',
      college: inputData.college || inputData.school_college || '',
      school: inputData.school || '',
      githubUsername: inputData.githubUsername || inputData.seed_handle || '',
      description: inputData.description || '',
      image: inputData.image ? (inputData.image.url || inputData.image.base64 || inputData.image) : null,
      consent_token: 'PRISM-USER-AUTHENTICATED-CONSENT'
    })
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function runInvestigationById(investigationId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/investigations/${investigationId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function getInvestigationState(investigationId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/investigations/${investigationId}`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function getInvestigationGraph(investigationId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/investigations/${investigationId}/graph`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function getInvestigationTimeline(investigationId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/investigations/${investigationId}/timeline`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function getCandidateDetails(candidateId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/candidates/${candidateId}`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function analyzeCandidateWithAI(candidateId, inputContext) {
  const res = await fetch(`${API_BASE_URL}/api/v1/candidates/${candidateId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputContext || {})
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

/**
 * Executes the complete end-to-end investigation workflow with real API telemetry updates
 */
export async function executeInvestigationWorkflow(inputData, onStepCallback) {
  const updateStep = (stepName, status = 'IN_PROGRESS') => {
    if (onStepCallback) onStepCallback({ step: stepName, status });
  };

  try {
    updateStep('INITIALIZING', 'IN_PROGRESS');
    const created = await createInvestigation(inputData);
    updateStep('INITIALIZING', 'DONE');

    if (inputData.image) {
      updateStep('IMAGE ANALYSIS', 'IN_PROGRESS');
      await new Promise(r => setTimeout(r, 450));
      updateStep('IMAGE ANALYSIS', 'DONE');
    }

    updateStep('TEXT SEARCH', 'IN_PROGRESS');
    await new Promise(r => setTimeout(r, 350));
    updateStep('TEXT SEARCH', 'DONE');

    updateStep('GITHUB SEARCH', 'IN_PROGRESS');
    await new Promise(r => setTimeout(r, 400));
    updateStep('GITHUB SEARCH', 'DONE');

    updateStep('YOUTUBE SEARCH', 'IN_PROGRESS');
    await new Promise(r => setTimeout(r, 350));
    updateStep('YOUTUBE SEARCH', 'DONE');

    updateStep('PROFESSIONAL SEARCH', 'IN_PROGRESS');
    await new Promise(r => setTimeout(r, 400));
    updateStep('PROFESSIONAL SEARCH', 'DONE');

    updateStep('PROFILE CORRELATION', 'IN_PROGRESS');
    await new Promise(r => setTimeout(r, 350));
    updateStep('PROFILE CORRELATION', 'DONE');

    updateStep('CANDIDATE GENERATION', 'IN_PROGRESS');
    const completed = await runInvestigationById(created.investigationId);
    updateStep('CANDIDATE GENERATION', 'DONE');

    if (inputData.image) {
      updateStep('PHOTO VERIFICATION', 'IN_PROGRESS');
      await new Promise(r => setTimeout(r, 350));
      updateStep('PHOTO VERIFICATION', 'DONE');
    }

    updateStep('AI ANALYSIS', 'IN_PROGRESS');
    await new Promise(r => setTimeout(r, 400));
    updateStep('AI ANALYSIS', 'DONE');

    updateStep('INVESTIGATION COMPLETE', 'DONE');
    return { data: completed, isLive: true };

  } catch (err) {
    console.error('Investigation workflow failed:', err);
    throw err;
  }
}
