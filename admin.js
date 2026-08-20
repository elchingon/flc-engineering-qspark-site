const qs = (selector, scope = document) => scope.querySelector(selector);

document.querySelectorAll('[data-year]').forEach((slot) => { slot.textContent = String(new Date().getFullYear()); });

const form = qs('#videoForm');
const output = qs('#jsonOutput');
const downloadButton = qs('#downloadJson');
const resetButton = qs('#resetDraft');

const status = document.createElement('p');
status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');
status.style.cssText = 'margin-top:.9rem;font-weight:700;min-height:1.2em;';
form.after(status);

// Text of the draft as it was last loaded from data/videos.json, so reset can
// skip the confirm prompt when nothing has been edited yet.
let baseline = '';

function setStatus(message, tone = 'ok') {
  status.textContent = message;
  status.style.color = tone === 'error' ? '#b3261e' : '#0f6f3f';
}

function writeDraft(videos) {
  output.value = `${JSON.stringify(videos, null, 2)}\n`;
}

// The textarea is the source of truth, so hand edits made between additions
// survive instead of being overwritten by a stale in-memory copy.
function readDraft() {
  const raw = output.value.trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Draft JSON must be an array of videos.');
  return parsed;
}

function buildEntry(formData) {
  const value = (name) => String(formData.get(name) || '').trim();
  const type = value('type') || 'workshop';
  const audience = value('audience');
  const presenter = value('presenter');

  const entry = { title: value('title') };
  if (presenter) entry.presenter = presenter;
  entry.description = value('description');
  entry.url = value('url');
  entry.type = type;
  if (audience) entry.audience = audience;
  entry.tags = [type, audience].filter(Boolean);
  return entry;
}

async function loadVideos() {
  try {
    const response = await fetch('data/videos.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load data/videos.json (${response.status})`);
    const videos = await response.json();
    if (!Array.isArray(videos)) throw new Error('data/videos.json must contain an array.');
    return { videos, error: '' };
  } catch (error) {
    console.warn(error);
    return { videos: [], error: 'Could not read data/videos.json, so the draft started empty. Serve the site over HTTP rather than opening the file directly, or the download will drop existing videos.' };
  }
}

async function resetDraft() {
  const { videos, error } = await loadVideos();
  writeDraft(videos);
  baseline = output.value;
  if (error) setStatus(error, 'error');
  else setStatus(`Draft loaded from data/videos.json (${videos.length} ${videos.length === 1 ? 'video' : 'videos'}).`);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  let videos;
  try {
    videos = readDraft();
  } catch (error) {
    setStatus(`Draft JSON is not valid, so nothing was added: ${error.message}`, 'error');
    return;
  }

  const entry = buildEntry(new FormData(form));
  videos.push(entry);
  writeDraft(videos);
  form.reset();
  qs('input[name="title"]', form).focus();
  setStatus(`Added "${entry.title}". Draft now has ${videos.length} ${videos.length === 1 ? 'video' : 'videos'}.`);
});

downloadButton.addEventListener('click', () => {
  try {
    readDraft();
  } catch (error) {
    setStatus(`Draft JSON is not valid, so nothing was downloaded: ${error.message}`, 'error');
    return;
  }

  const blob = new Blob([output.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'videos.json';
  link.click();
  URL.revokeObjectURL(url);
  setStatus('Downloaded videos.json. Replace data/videos.json with it, then commit.');
});

resetButton.addEventListener('click', async () => {
  const isEdited = output.value !== baseline;
  if (isEdited && !confirm('Discard the current draft and reload from data/videos.json?')) return;
  await resetDraft();
});

resetDraft();
