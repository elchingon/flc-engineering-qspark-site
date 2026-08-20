const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const navToggle = qs('[data-nav-toggle]');
const nav = qs('[data-nav]');
if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  qsa('a', nav).forEach((link) => link.addEventListener('click', () => nav.classList.remove('open')));
}

qsa('[data-year]').forEach((slot) => { slot.textContent = String(new Date().getFullYear()); });

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function getYoutubeId(url = '') {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.replace('/', '').split('/')[0];
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/watch')) return parsed.searchParams.get('v');
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/embed/')[1]?.split('/')[0];
      if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/shorts/')[1]?.split('/')[0];
    }
  } catch (error) {
    return '';
  }
  return '';
}

function getVimeoId(url = '') {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('vimeo.com')) return '';
    return parsed.pathname.split('/').filter(Boolean).pop() || '';
  } catch (error) {
    return '';
  }
}

function embedUrl(url = '') {
  const youtubeId = getYoutubeId(url);
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}`;
  const vimeoId = getVimeoId(url);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;
  return url;
}

function isEmbeddable(url = '') {
  return Boolean(getYoutubeId(url) || getVimeoId(url));
}

function renderVideoFrame(video) {
  const url = video.url || '';
  if (isEmbeddable(url)) {
    return `<iframe src="${escapeHtml(embedUrl(url))}" title="${escapeHtml(video.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  }
  if (/\.mp4($|\?)/i.test(url)) {
    return `<video controls preload="metadata"><source src="${escapeHtml(url)}" type="video/mp4">Your browser does not support the video tag.</video>`;
  }
  return `<div class="video-placeholder">Add video link<br><small>${escapeHtml(url || 'No URL yet')}</small></div>`;
}

function videoCard(video, options = {}) {
  const tags = (video.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  const featuredClass = options.featured ? ' featured-video-card' : '';
  return `
    <article class="video-card${featuredClass}" data-type="${escapeHtml(video.type || 'workshop')}">
      <div class="video-frame">${renderVideoFrame(video)}</div>
      <div class="video-body">
        <div class="video-meta">${escapeHtml(video.audience || video.type || 'Q-SPARK')}</div>
        <h3>${escapeHtml(video.title)}</h3>
        ${video.presenter ? `<p><strong>${escapeHtml(video.presenter)}</strong></p>` : ''}
        <p>${escapeHtml(video.description || '')}</p>
        <div class="video-tags">${tags}</div>
      </div>
    </article>`;
}

function eventCard(event) {
  return `
    <article class="event-card">
      <div class="event-date">${escapeHtml(event.date)}</div>
      <h3>${escapeHtml(event.title)}</h3>
      <p>${escapeHtml(event.description)}</p>
      <p><strong>${escapeHtml(event.location || '')}</strong></p>
    </article>`;
}

function photoCard(photo) {
  return `
    <article class="photo-card">
      <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}">
      <div><h3>${escapeHtml(photo.title)}</h3><p>${escapeHtml(photo.caption)}</p></div>
    </article>`;
}

async function loadJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return await response.json();
  } catch (error) {
    console.warn(error);
    return fallback;
  }
}

function renderEmptyState(container, message) {
  container.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

async function init() {
  const [videos, events, photos, site] = await Promise.all([
    loadJson('data/videos.json', []),
    loadJson('data/events.json', []),
    loadJson('data/photos.json', []),
    loadJson('data/site.json', {})
  ]);

  const featuredVideo = qs('#featuredVideo');
  if (featuredVideo) {
    const selected = videos.find((video) => video.featured) || videos[0];
    if (selected) featuredVideo.innerHTML = videoCard(selected, { featured: true });
    else renderEmptyState(featuredVideo, 'Add a featured video in data/videos.json.');
  }

  const videoGrid = qs('#videoGrid');
  if (videoGrid) {
    if (videos.length) videoGrid.innerHTML = videos.map((video) => videoCard(video)).join('');
    else renderEmptyState(videoGrid, 'No videos found. Check data/videos.json and make sure the site is served over HTTP, not opened directly as a file.');
  }

  const eventList = qs('#eventList');
  if (eventList) {
    if (events.length) eventList.innerHTML = events.map(eventCard).join('');
    else renderEmptyState(eventList, 'Add events in data/events.json or use the workshop request button.');
  }

  const photoGrid = qs('#photoGrid');
  if (photoGrid) {
    if (photos.length) photoGrid.innerHTML = photos.map(photoCard).join('');
    else photoGrid.closest('section')?.classList.add('is-empty');
  }

  const signup = qs('#signupLink');
  if (signup && site.signupUrl) signup.href = site.signupUrl;

  qsa('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      qsa('[data-filter]').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      const filter = button.dataset.filter;
      qsa('.video-card').forEach((card) => {
        card.hidden = filter !== 'all' && card.dataset.type !== filter;
      });
    });
  });
}

init();
