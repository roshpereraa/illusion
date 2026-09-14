import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function mountChrome() {
  const header = document.querySelector('.header');
  const toggle = header.querySelector('[data-menu-toggle]');
  const menu = header.querySelector('[data-menu]');
  const label = header.querySelector('[data-menu-label]');
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open);
    label.textContent = open ? 'Close' : 'Menu';
  };
  toggle.addEventListener('click', (e) => { e.stopPropagation(); setMenu(!menu.classList.contains('is-open')); });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  const sound = header.querySelector('[data-sound]');
  let on = false;
  sound.addEventListener('click', () => {
    on = !on;
    sound.setAttribute('aria-pressed', on);
    sound.querySelector('path').setAttribute('d', on ? 'M2 10l3-4 3 8 3-10 3 10 3-4' : 'M3 10h14');
  });

  document.querySelectorAll('form[data-news]').forEach((f) =>
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = f.querySelector('input');
      input.value = '';
      input.placeholder = 'You are on the list ✦';
      input.blur();
    })
  );

  // Social profiles aren't set up yet; keep the links inert rather than jumping to the top.
  document.querySelectorAll('a[data-soon]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

  // Header goes light-on-dark over dark sections
  document.querySelectorAll('[data-dark]').forEach((el) =>
    ScrollTrigger.create({
      trigger: el, start: 'top 60px', end: 'bottom 60px',
      onToggle: (self) => header.classList.toggle('is-dark', self.isActive),
    })
  );
}

export function initScroll() {
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('[data-top]').forEach((b) => b.addEventListener('click', () => lenis.scrollTo(0, { duration: 2 })));
  document.querySelectorAll('a[href^="/#"], a[href^="#"]:not([data-soon])').forEach((a) =>
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.startsWith('/#') && location.pathname !== '/' && location.pathname !== '/index.html') return;
      const el = document.getElementById(href.split('#')[1]);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { duration: 1.8, onComplete: () => el.focus?.({ preventScroll: true }) });
    })
  );
  return lenis;
}

export function initReveals() {
  gsap.utils.toArray('[data-reveal]').forEach((el) =>
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    })
  );
}

// Three.js lives in its own chunk, fetched once and only when a scene is about to be seen.
let scenesModule;
export const loadScenes = () => (scenesModule ??= import('./scenes.js'));

export function lazyScene(el, start, rootMargin = '100% 0px') {
  return new Promise((resolve) => {
    if (!el) return resolve();
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      loadScenes()
        .then((m) => start(m))
        .then(resolve)
        .catch((err) => { console.warn('Scene failed to start', err); resolve(); });
    }, { rootMargin });
    io.observe(el);
  });
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

// The loader only waits on real work (fonts + first WebGL frame), capped so it can never stall.
// Repeat visits in the same session skip it entirely.
export function runLoader(ready = Promise.resolve()) {
  let seen = false;
  try { seen = sessionStorage.getItem('illusion-loaded') === '1'; sessionStorage.setItem('illusion-loaded', '1'); } catch {}
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const work = withTimeout(Promise.all([ready, document.fonts?.ready]), seen ? 0 : 1400);
  if (seen || reduced) return work.then(() => { performance.mark('illusion:ready'); });

  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'loader';
    el.innerHTML = `<div class="loader__word">L O A D I N G</div><div class="loader__count">0</div><div class="loader__bar"></div>`;
    document.body.appendChild(el);
    document.body.classList.add('is-loading');
    const count = el.querySelector('.loader__count');
    const bar = el.querySelector('.loader__bar');
    const state = { v: 0 };
    const render = () => { count.textContent = Math.round(state.v); bar.style.width = state.v + '%'; };
    const creep = gsap.to(state, { v: 90, duration: 1.2, ease: 'power2.out', onUpdate: render });
    const minTime = new Promise((r) => setTimeout(r, 450));
    Promise.all([work, minTime]).then(() => {
      creep.kill();
      gsap.timeline({ onComplete: () => { el.remove(); document.body.classList.remove('is-loading'); } })
        .to(state, { v: 100, duration: 0.25, ease: 'power1.out', onUpdate: render })
        .to(el.querySelector('.loader__word'), { opacity: 0, duration: 0.15 }, '<')
        .add(() => { performance.mark('illusion:ready'); resolve(); })
        .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 0.7, ease: 'expo.inOut' });
    });
  });
}

export { gsap, ScrollTrigger };
