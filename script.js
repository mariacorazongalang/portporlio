const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const EMAIL = 'galangmaria143@gmail.com';

// ---------- Mobile navigation ----------
const menuToggle = document.getElementById('menuToggle');
const navigation = document.getElementById('navigation');
menuToggle.addEventListener('click', () => {
  const open = navigation.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
function closeMenu() {
  navigation.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
// Tapping anywhere outside the open menu, or pressing Esc, closes it.
document.addEventListener('click', event => {
  if (navigation.classList.contains('open') && !navigation.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) {
    closeMenu();
    menuToggle.focus();
  }
});
document.getElementById('year').textContent = new Date().getFullYear();
if (isMac) document.querySelectorAll('.shortcut-key').forEach(key => { key.textContent = '⌘ K'; });

// Stop the page behind an open pop-up (viewer or command menu) from scrolling.
function updateScrollLock() {
  root.classList.toggle('modal-open', document.querySelector('dialog[open]') !== null);
}

// ---------- Toast messages ----------
const toast = document.getElementById('toast');
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ---------- Dark mode ----------
// The starting theme is set by the small script in <head>. Here we switch it and remember the choice.
const themeToggle = document.getElementById('themeToggle');
const themeColor = document.querySelector('meta[name="theme-color"]');
function updateThemeButton() {
  const dark = root.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  themeColor.content = dark ? '#0b1120' : '#ffffff'; // colors the phone's browser bar to match
}
function setTheme(theme, origin) {
  const apply = () => {
    root.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch (e) {}
    updateThemeButton();
  };
  if (reduceMotion) { apply(); return; }
  // Older browsers: fade the colors instead of the circle animation.
  if (!document.startViewTransition) {
    root.classList.add('theme-fade');
    apply();
    setTimeout(() => root.classList.remove('theme-fade'), 400);
    return;
  }
  // Modern browsers: reveal the new theme as a circle growing from the button.
  const x = origin ? origin.x : innerWidth / 2;
  const y = origin ? origin.y : innerHeight / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.startViewTransition(apply).ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 600, easing: 'cubic-bezier(.4, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' }
    );
  }).catch(() => {});
}
function toggleTheme(origin) {
  setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', origin);
}
themeToggle.addEventListener('click', () => {
  const box = themeToggle.getBoundingClientRect();
  toggleTheme({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
});
updateThemeButton();
// Follow the device setting until the visitor picks a theme themselves.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  if (!saved) {
    root.dataset.theme = event.matches ? 'dark' : 'light';
    updateThemeButton();
  }
});

// ---------- Scroll progress bar ----------
const progressBar = document.getElementById('scrollProgress');
let progressQueued = false;
function updateProgress() {
  const scrollable = root.scrollHeight - window.innerHeight;
  progressBar.style.transform = `scaleX(${scrollable > 0 ? window.scrollY / scrollable : 0})`;
  progressQueued = false;
}
window.addEventListener('scroll', () => {
  if (!progressQueued) {
    progressQueued = true;
    requestAnimationFrame(updateProgress);
  }
}, { passive: true });
updateProgress();

// ---------- Highlight the menu link of the section being read ----------
const navLinks = [...navigation.querySelectorAll('a')];
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => {
      const active = link.getAttribute('href') === `#${entry.target.id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main section[id]').forEach(section => sectionObserver.observe(section));

// ---------- Fade sections in while scrolling ----------
if (!reduceMotion) {
  const revealTargets = '.section-heading, .tile, .project-card, .timeline li, .certificate-grid, .resume-box, .contact-links > *';
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const finish = event => {
        if (event.target !== el) return;
        // Remove the helper classes so the normal hover animations work again.
        el.classList.remove('reveal', 'in');
        el.style.removeProperty('--delay');
        el.removeEventListener('transitionend', finish);
      };
      el.addEventListener('transitionend', finish);
      el.classList.add('in');
      observer.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll(revealTargets).forEach(el => {
    // Cards in the same row appear one after another.
    const position = [...el.parentElement.children].indexOf(el);
    el.style.setProperty('--delay', `${Math.min(position, 5) * 90}ms`);
    el.classList.add('reveal');
    revealObserver.observe(el);
  });
}

// ---------- Typing effect in the hero ----------
const typed = document.getElementById('typed');
const phrases = [
  'build web systems with PHP & MySQL',
  'write clear system documentation',
  'set up computer networks and servers',
  'keep learning something new every day'
];
if (!reduceMotion) {
  let phraseIndex = 0;
  let length = phrases[0].length;
  let deleting = false;
  const tick = () => {
    const phrase = phrases[phraseIndex];
    if (!deleting && length === phrase.length) {
      deleting = true;
      setTimeout(tick, 1900);
      return;
    }
    if (deleting && length === 0) {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      setTimeout(tick, 350);
      return;
    }
    length += deleting ? -1 : 1;
    typed.textContent = phrases[phraseIndex].slice(0, length);
    setTimeout(tick, deleting ? 28 : 62);
  };
  tick();
}

// ---------- Count-up numbers ----------
if (!reduceMotion) {
  const countObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const start = performance.now();
      const duration = 1400;
      const step = now => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // fast at first, then slows down
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      observer.unobserve(el);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(el => {
    el.textContent = '0';
    countObserver.observe(el);
  });
}

// ---------- Scrolling strip of skills and organizations ----------
document.querySelectorAll('.marquee-row').forEach(row => {
  const track = row.querySelector('.marquee-track');
  const items = [...track.children];
  // Repeat the items until one track is wider than the screen...
  const minWidth = Math.max(row.clientWidth, window.screen.width);
  for (let i = 0; i < 10 && track.scrollWidth < minWidth; i++) {
    items.forEach(item => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true'); // screen readers only need the list once
      track.append(clone);
    });
  }
  // ...then add an identical copy right after it, so the loop has no visible jump.
  const copy = track.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  row.append(copy);
  // Same speed (about 50px per second) no matter how long the list is.
  row.style.setProperty('--speed', `${Math.round(track.scrollWidth / 50)}s`);
});

// ---------- Hero dot grid lights up around the mouse ----------
const heroBg = document.querySelector('.hero-bg');
const hero = document.getElementById('home');
hero.addEventListener('pointermove', event => {
  const box = heroBg.getBoundingClientRect();
  heroBg.style.setProperty('--hx', `${event.clientX - box.left}px`);
  heroBg.style.setProperty('--hy', `${event.clientY - box.top}px`);
});
hero.addEventListener('pointerleave', () => {
  heroBg.style.removeProperty('--hx');
  heroBg.style.removeProperty('--hy');
});

// ---------- Spotlight that follows the mouse on cards ----------
document.querySelectorAll('.spotlight').forEach(card => {
  card.addEventListener('pointermove', event => {
    const box = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - box.left}px`);
    card.style.setProperty('--my', `${event.clientY - box.top}px`);
  });
});

// ---------- Certificate filters ----------
const certCards = [...document.querySelectorAll('.certificate-card')];
const filterButtons = [...document.querySelectorAll('.filter-btn')];
const filterStatus = document.getElementById('filterStatus');
const matchesFilter = (card, filter) => filter === 'all' || card.dataset.category === filter;

function applyFilter(filter) {
  filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  let shown = 0;
  certCards.forEach(card => {
    const match = matchesFilter(card, filter);
    card.hidden = !match;
    if (!match) return;
    if (!reduceMotion) {
      card.animate(
        [{ opacity: 0, transform: 'translateY(14px) scale(.98)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, delay: shown * 45, easing: 'cubic-bezier(.2, .7, .3, 1)', fill: 'backwards' }
      );
    }
    shown++;
  });
  filterStatus.textContent = `Showing ${shown} of ${certCards.length} certificates`;
}
filterButtons.forEach(button => {
  button.querySelector('.count').textContent = certCards.filter(card => matchesFilter(card, button.dataset.filter)).length;
  button.addEventListener('click', () => applyFilter(button.dataset.filter));
});
filterStatus.textContent = `Showing all ${certCards.length} certificates`;

// Timeline links jump to the certificates with the matching filter already selected.
document.querySelectorAll('[data-show-filter]').forEach(link => {
  link.addEventListener('click', () => applyFilter(link.dataset.showFilter));
});

// ---------- Document viewer (certificates and resume) ----------
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
const lbTitle = document.getElementById('lbTitle');
const lbMeta = document.getElementById('lbMeta');
const lbCount = document.getElementById('lbCount');
const lbOpen = document.getElementById('lbOpen');
const lbDownload = document.getElementById('lbDownload');
const lbPrev = document.getElementById('lbPrev');
const lbNext = document.getElementById('lbNext');
let viewerItems = [];
let viewerIndex = 0;

// Each item the viewer shows: { image, alt, title, meta, file, downloadLabel, isDocument }
const certificateItem = card => ({
  image: card.getAttribute('href'),
  alt: card.querySelector('img').alt,
  title: card.querySelector('h3').textContent,
  meta: card.querySelector('p').textContent,
  file: card.getAttribute('href'),
  downloadLabel: '↓ Download'
});
const resumeItem = {
  image: 'assets/resume/Galang_Resume-preview.png',
  alt: 'Resume of Ma.Corazon June L. Galang',
  title: 'Resume: Ma.Corazon June L. Galang',
  meta: 'BS Information Technology student · Northeastern College',
  file: 'assets/resume/Galang_Resume.pdf',
  downloadLabel: '↓ Download PDF',
  isDocument: true // tall page: let the visitor scroll it at a readable size
};

function showItem(index, direction = 0) {
  viewerIndex = (index + viewerItems.length) % viewerItems.length; // wraps around at both ends
  const item = viewerItems[viewerIndex];
  lbImg.src = item.image;
  lbImg.alt = item.alt;
  lbTitle.textContent = item.title;
  lbMeta.textContent = item.meta;
  lbCount.textContent = `${viewerIndex + 1} / ${viewerItems.length}`;
  lbOpen.href = item.file;
  lbDownload.href = item.file;
  lbDownload.setAttribute('download', item.file.split('/').pop());
  lbDownload.textContent = item.downloadLabel;
  lightbox.classList.toggle('is-document', Boolean(item.isDocument));
  if (direction && !reduceMotion) {
    lbImg.animate(
      [{ opacity: 0, transform: `translateX(${direction * 40}px)` }, { opacity: 1, transform: 'none' }],
      { duration: 280, easing: 'ease-out' }
    );
  }
}
function step(direction) {
  if (viewerItems.length > 1) showItem(viewerIndex + direction, direction);
}
function openViewer(items, index = 0) {
  viewerItems = items;
  const single = items.length < 2;
  [lbPrev, lbNext, lbCount].forEach(el => { el.hidden = single; });
  showItem(index);
  lightbox.showModal();
  lightbox.scrollTop = 0;
  updateScrollLock();
}
function openCertificate(card) {
  const visible = certCards.filter(c => !c.hidden); // only browse the certificates currently shown
  openViewer(visible.map(certificateItem), visible.indexOf(card));
}
const openResume = () => openViewer([resumeItem]);

const canUseDialog = typeof lightbox.showModal === 'function';
// Plain clicks open the viewer; Ctrl/Cmd/Shift-click still opens the file in a new tab.
const openInViewer = (link, open) => link.addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  open();
});
if (canUseDialog) {
  certCards.forEach(card => openInViewer(card, () => openCertificate(card)));
  openInViewer(document.getElementById('resumePreview'), openResume);
  openInViewer(document.getElementById('resumeView'), openResume);
}
lbPrev.addEventListener('click', () => step(-1));
lbNext.addEventListener('click', () => step(1));
document.getElementById('lbClose').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('close', updateScrollLock);
lightbox.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') step(1);
  if (event.key === 'ArrowLeft') step(-1);
});
// Clicking the dark background closes the viewer.
lightbox.addEventListener('click', event => {
  if (event.target === lightbox || event.target.classList.contains('lightbox-figure')) lightbox.close();
});
// Swipe left or right on phones.
let touchStartX = null;
lightbox.addEventListener('touchstart', event => { touchStartX = event.touches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', event => {
  if (touchStartX === null) return;
  const distance = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(distance) > 50) step(distance < 0 ? 1 : -1);
  touchStartX = null;
});

// ---------- Copy email ----------
async function copyEmail() {
  try {
    await navigator.clipboard.writeText(EMAIL);
    showToast('Email address copied to clipboard');
  } catch (e) {
    showToast(EMAIL); // clipboard blocked: at least show the address
  }
}
document.getElementById('copyEmail').addEventListener('click', copyEmail);

// ---------- Command palette (Ctrl + K) ----------
const palette = document.getElementById('palette');
const paletteInput = document.getElementById('paletteInput');
const paletteList = document.getElementById('paletteList');
const goTo = id => () => document.getElementById(id).scrollIntoView();
const openLink = url => () => window.open(url, '_blank', 'noopener');

const commands = [
  { group: 'Go to', label: 'Home', icon: '⌂', run: goTo('home') },
  { group: 'Go to', label: 'About me', icon: '☺', run: goTo('about') },
  { group: 'Go to', label: 'Skills & tools', icon: '⌘', run: goTo('skills') },
  { group: 'Go to', label: 'Projects', icon: '▦', run: goTo('projects') },
  { group: 'Go to', label: 'Professional development timeline', icon: '↧', keywords: 'journey growth', run: goTo('journey') },
  { group: 'Go to', label: 'Certificates', icon: '✧', keywords: 'achievements', run: goTo('certificates') },
  { group: 'Go to', label: 'Resume', icon: '▤', keywords: 'cv', run: goTo('resume') },
  { group: 'Go to', label: 'Contact', icon: '✉', run: goTo('contact') },
  { group: 'Actions', label: 'Toggle dark mode', icon: '◐', keywords: 'theme light night', run: () => toggleTheme() },
  { group: 'Actions', label: 'Preview resume', icon: '⤢', keywords: 'cv view', run: () => (canUseDialog ? openResume() : goTo('resume')()) },
  { group: 'Actions', label: 'Download resume (PDF)', icon: '↓', keywords: 'cv', run: () => document.getElementById('resumeDownload').click() },
  { group: 'Actions', label: 'Copy email address', icon: '⧉', keywords: 'contact mail', run: copyEmail },
  { group: 'Links', label: 'Open GitHub profile', icon: '↗', run: openLink('https://github.com/mariacorazongalang') },
  { group: 'Links', label: 'Open LinkedIn profile', icon: '↗', run: openLink('https://www.linkedin.com/in/ma-corazon-galang/') },
  // Every certificate is searchable too; choosing one opens it in the viewer.
  ...certCards.map(card => ({
    group: 'Certificates',
    label: card.querySelector('h3').textContent,
    meta: card.querySelector('small').textContent,
    icon: '✧',
    keywords: card.querySelector('p').textContent,
    hideUntilSearch: true,
    run: () => {
      applyFilter('all');
      card.scrollIntoView({ block: 'center' });
      if (canUseDialog) openCertificate(card);
    }
  }))
];

let results = [];
let activeIndex = 0;

function renderPalette() {
  const words = paletteInput.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  results = commands.filter(command => {
    if (!words.length) return !command.hideUntilSearch;
    const text = `${command.label} ${command.group} ${command.keywords || ''} ${command.meta || ''}`.toLowerCase();
    return words.every(word => text.includes(word));
  });
  activeIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));
  paletteList.innerHTML = '';

  if (!results.length) {
    const empty = document.createElement('li');
    empty.className = 'palette-empty';
    empty.textContent = `No results for "${paletteInput.value}"`;
    paletteList.append(empty);
    paletteInput.removeAttribute('aria-activedescendant');
    return;
  }
  let currentGroup = '';
  results.forEach((command, index) => {
    if (command.group !== currentGroup) {
      currentGroup = command.group;
      const heading = document.createElement('li');
      heading.className = 'palette-group';
      heading.setAttribute('role', 'presentation');
      heading.textContent = currentGroup;
      paletteList.append(heading);
    }
    const item = document.createElement('li');
    item.className = 'palette-item';
    item.id = `command-${index}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(index === activeIndex));
    item.innerHTML = '<span class="palette-icon" aria-hidden="true"></span><span class="palette-label"></span>';
    item.querySelector('.palette-icon').textContent = command.icon;
    item.querySelector('.palette-label').textContent = command.label;
    if (command.meta) {
      const meta = document.createElement('span');
      meta.className = 'palette-meta';
      meta.textContent = command.meta;
      item.append(meta);
    }
    item.addEventListener('mousemove', () => { if (activeIndex !== index) setActive(index); });
    item.addEventListener('click', () => runCommand(index));
    paletteList.append(item);
  });
  if (!words.length) {
    const tip = document.createElement('li');
    tip.className = 'palette-tip';
    tip.setAttribute('role', 'presentation');
    tip.textContent = `Tip: type to search all ${certCards.length} certificates`;
    paletteList.append(tip);
  }
  paletteInput.setAttribute('aria-activedescendant', `command-${activeIndex}`);
}
function setActive(index) {
  activeIndex = (index + results.length) % results.length;
  paletteList.querySelectorAll('.palette-item').forEach(item => {
    item.setAttribute('aria-selected', String(item.id === `command-${activeIndex}`));
  });
  paletteInput.setAttribute('aria-activedescendant', `command-${activeIndex}`);
  document.getElementById(`command-${activeIndex}`).scrollIntoView({ block: 'nearest' });
}
function runCommand(index) {
  const command = results[index];
  if (!command) return;
  palette.close();
  updateScrollLock(); // unlock right away so "Go to" commands can scroll
  command.run();
}
function openPalette() {
  if (!canUseDialog || lightbox.open) return;
  paletteInput.value = '';
  activeIndex = 0;
  renderPalette();
  palette.showModal();
  updateScrollLock();
  paletteInput.focus();
}
palette.addEventListener('close', updateScrollLock);
palette.addEventListener('click', event => { if (event.target === palette) palette.close(); });
paletteInput.addEventListener('input', () => { activeIndex = 0; renderPalette(); });
paletteInput.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') { event.preventDefault(); setActive(activeIndex + 1); }
  if (event.key === 'ArrowUp') { event.preventDefault(); setActive(activeIndex - 1); }
  if (event.key === 'Enter') { event.preventDefault(); runCommand(activeIndex); }
});
document.getElementById('paletteOpen').addEventListener('click', openPalette);
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (palette.open) palette.close();
    else openPalette();
  } else if (event.key === '/' && !palette.open && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
    event.preventDefault();
    openPalette();
  }
});
