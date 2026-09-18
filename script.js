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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PHOTO_DATE = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;

// Read the parts out of the string rather than through Date: new Date('2026-04-09')
// is UTC midnight, which renders as the 8th anywhere behind UTC. A month-only
// date ('2026-07') is allowed for photos where the day isn't known.
function formatPhotoDate(value = '') {
  const match = PHOTO_DATE.exec(String(value).trim());
  if (!match) return '';
  const month = MONTH_NAMES[Number(match[2]) - 1];
  if (!month) return '';
  return match[3] ? `${month} ${Number(match[3])}, ${match[1]}` : `${month} ${match[1]}`;
}

function photoSortKey(photo) {
  const match = PHOTO_DATE.exec(String(photo.date || '').trim());
  if (!match) return -Infinity;
  return Number(`${match[1]}${match[2]}${match[3] || '00'}`);
}

// Newest first. Undated photos sink to the bottom, and ties keep the order
// they were authored in, so data/photos.json stays the tie-breaker.
function sortPhotosNewestFirst(photos) {
  return photos
    .map((photo, index) => ({ photo, index }))
    .sort((a, b) => photoSortKey(b.photo) - photoSortKey(a.photo) || a.index - b.index)
    .map((entry) => entry.photo);
}

function photoCard(photo, index) {
  const date = formatPhotoDate(photo.date);
  return `
    <article class="photo-card">
      <button type="button" class="photo-open" data-photo-index="${index}" aria-label="View full screen: ${escapeHtml(photo.title || photo.alt || 'photo')}">
        <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" loading="lazy" decoding="async">
      </button>
      <div>
        ${date ? `<p class="photo-date">${escapeHtml(date)}</p>` : ''}
        <h3>${escapeHtml(photo.title)}</h3>
        <p>${escapeHtml(photo.caption)}</p>
      </div>
    </article>`;
}

const SLIDESHOW_MAX = 10;
const SLIDESHOW_INTERVAL = 6000;

// Fisher-Yates on a copy, so the source list keeps its authored order.
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function slideMarkup(photo, index) {
  return `
    <figure class="slide${index === 0 ? ' is-active' : ''}" role="group" aria-roledescription="slide" aria-hidden="${index === 0 ? 'false' : 'true'}">
      <span class="slide-backdrop" aria-hidden="true"></span>
      <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt || photo.title || '')}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async">
      <figcaption>
        <h3>${escapeHtml(photo.title || '')}</h3>
        <p>${escapeHtml(photo.caption || '')}</p>
      </figcaption>
    </figure>`;
}

function buildSlideshow(root, photos) {
  const dots = photos
    .map((photo, index) => `<button type="button" class="slide-dot${index === 0 ? ' is-active' : ''}" data-slide-to="${index}" aria-label="Show photo ${index + 1} of ${photos.length}: ${escapeHtml(photo.title || '')}"></button>`)
    .join('');

  root.innerHTML = `
    <div class="slideshow-frame" data-slides>
      ${photos.map(slideMarkup).join('')}
      <button type="button" class="slide-arrow prev" data-slide-step="-1" aria-label="Previous photo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5 8 12l7 7"></path></svg>
      </button>
      <button type="button" class="slide-arrow next" data-slide-step="1" aria-label="Next photo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
      </button>
    </div>
    <div class="slideshow-controls">
      <button type="button" class="slide-play" data-slide-play aria-label="Pause slideshow"><span aria-hidden="true">Pause</span></button>
      <div class="slide-dots">${dots}</div>
      <p class="slide-count" role="status" aria-live="polite">Photo 1 of ${photos.length}</p>
    </div>`;

  // Blurred fill behind letterboxed shots, so portrait and landscape photos can
  // share one frame without cropping faces out of the picture.
  qsa('.slide', root).forEach((slide) => {
    const src = qs('img', slide).getAttribute('src');
    qs('.slide-backdrop', slide).style.backgroundImage = `url("${src}")`;
  });
}

function initSlideshow(root, allPhotos) {
  const photos = shuffle(allPhotos).slice(0, SLIDESHOW_MAX);
  buildSlideshow(root, photos);

  const slides = qsa('.slide', root);
  const dots = qsa('.slide-dot', root);
  const count = qs('.slide-count', root);
  const playButton = qs('[data-slide-play]', root);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let timer = null;
  let paused = reduceMotion.matches;

  function show(next) {
    current = (next + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      slide.classList.toggle('is-active', index === current);
      slide.setAttribute('aria-hidden', String(index !== current));
    });
    dots.forEach((dot, index) => dot.classList.toggle('is-active', index === current));
    count.textContent = `Photo ${current + 1} of ${slides.length}`;
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function start() {
    stop();
    if (paused || slides.length < 2) return;
    timer = setInterval(() => show(current + 1), SLIDESHOW_INTERVAL);
  }

  function setPaused(value) {
    paused = value;
    playButton.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    qs('span', playButton).textContent = paused ? 'Play' : 'Pause';
    start();
  }

  root.addEventListener('click', (event) => {
    const step = event.target.closest('[data-slide-step]');
    if (step) {
      show(current + Number(step.dataset.slideStep));
      start();
      return;
    }
    const dot = event.target.closest('[data-slide-to]');
    if (dot) {
      show(Number(dot.dataset.slideTo));
      start();
      return;
    }
    if (event.target.closest('[data-slide-play]')) setPaused(!paused);
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(current - 1);
    else if (event.key === 'ArrowRight') show(current + 1);
    else return;
    event.preventDefault();
    start();
  });

  // Hold the current photo while someone is reading or tabbing through it.
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', start);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reduceMotion.addEventListener('change', (event) => setPaused(event.matches));

  setPaused(paused);
}

// A <dialog> rather than a hand-rolled overlay: showModal() gives us the focus
// trap, Esc-to-close, and stacking above the sticky header for free.
function initLightbox(grid, photos) {
  if (!photos.length) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.innerHTML = `
    <div class="lightbox-inner">
      <button type="button" class="lightbox-close" data-lightbox-close aria-label="Close photo viewer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
      </button>
      <div class="lightbox-stage">
        <img class="lightbox-image" src="" alt="" decoding="async">
        <button type="button" class="slide-arrow prev" data-lightbox-step="-1" aria-label="Previous photo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5 8 12l7 7"></path></svg>
        </button>
        <button type="button" class="slide-arrow next" data-lightbox-step="1" aria-label="Next photo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
        </button>
      </div>
      <div class="lightbox-meta">
        <p class="lightbox-date"></p>
        <h2 class="lightbox-title"></h2>
        <p class="lightbox-caption"></p>
        <p class="lightbox-count" role="status" aria-live="polite"></p>
      </div>
    </div>`;
  document.body.appendChild(dialog);

  const image = qs('.lightbox-image', dialog);
  const dateSlot = qs('.lightbox-date', dialog);
  const titleSlot = qs('.lightbox-title', dialog);
  const captionSlot = qs('.lightbox-caption', dialog);
  const countSlot = qs('.lightbox-count', dialog);
  let current = 0;
  let opener = null;

  // textContent, not innerHTML: the photo fields land in the DOM as text.
  function show(next) {
    current = (next + photos.length) % photos.length;
    const photo = photos[current];
    const date = formatPhotoDate(photo.date);
    image.src = photo.src;
    image.alt = photo.alt || photo.title || '';
    dateSlot.textContent = date;
    dateSlot.hidden = !date;
    titleSlot.textContent = photo.title || '';
    captionSlot.textContent = photo.caption || '';
    countSlot.textContent = `Photo ${current + 1} of ${photos.length}`;
  }

  grid.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-photo-index]');
    if (!trigger) return;
    opener = trigger;
    show(Number(trigger.dataset.photoIndex));
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
  });

  dialog.addEventListener('click', (event) => {
    const step = event.target.closest('[data-lightbox-step]');
    if (step) {
      show(current + Number(step.dataset.lightboxStep));
      return;
    }
    // The dialog fills the viewport, so a click on the dark surround lands here.
    if (event.target.closest('[data-lightbox-close]') || event.target === dialog) dialog.close();
  });

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(current - 1);
    else if (event.key === 'ArrowRight') show(current + 1);
    else return;
    event.preventDefault();
  });

  let touchX = 0;
  let touchY = 0;
  dialog.addEventListener('touchstart', (event) => {
    touchX = event.changedTouches[0].clientX;
    touchY = event.changedTouches[0].clientY;
  }, { passive: true });

  dialog.addEventListener('touchend', (event) => {
    const dx = event.changedTouches[0].clientX - touchX;
    const dy = event.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // Fires for the close button, Esc, and the backdrop alike.
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    if (opener) opener.focus();
  });
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
    const ordered = sortPhotosNewestFirst(photos);
    if (ordered.length) {
      photoGrid.innerHTML = ordered.map(photoCard).join('');
      initLightbox(photoGrid, ordered);
    } else {
      renderEmptyState(photoGrid, 'No photos found. Check data/photos.json and make sure the site is served over HTTP, not opened directly as a file.');
    }
  }

  const photoSlideshow = qs('#photoSlideshow');
  if (photoSlideshow) {
    if (photos.length) initSlideshow(photoSlideshow, photos);
    else photoSlideshow.closest('section')?.classList.add('is-empty');
  }

  if (site.signupUrl) {
    qsa('[data-signup-link]').forEach((link) => {
      link.href = site.signupUrl;
    });
  }

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
