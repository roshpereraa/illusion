import './styles.css';
import { mountChrome, initScroll, initReveals, runLoader, lazyScene, gsap, ScrollTrigger } from './layout.js';
import { bindCardCursors } from './projects.js';

const list = document.querySelector('[data-list]');
mountChrome('projects');
bindCardCursors();
const ctaCanvas = document.querySelector('[data-cta]');
lazyScene(ctaCanvas, (m) => m.scatterScene(ctaCanvas));
initScroll();

document.querySelector('[data-filter]').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelectorAll('[data-filter] button').forEach((b) => {
    b.classList.toggle('is-active', b === btn);
    b.setAttribute('aria-pressed', b === btn);
  });
  const f = btn.dataset.f;
  let n = 0;
  list.querySelectorAll('.card').forEach((c) => {
    const show = f === 'all' || c.dataset.cat === f;
    c.classList.toggle('is-hidden', !show);
    if (show) { n++; gsap.fromTo(c, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', delay: n * 0.04 }); }
  });
  document.querySelector('[data-count]').textContent = String(n).padStart(2, '0');
  ScrollTrigger.refresh();
});

runLoader().then(() => {
  gsap.from('[data-title]', { yPercent: 60, opacity: 0, duration: 1.4, ease: 'expo.out' });
  initReveals();
});
