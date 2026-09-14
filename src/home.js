import './styles.css';
import { mountChrome, initScroll, initReveals, runLoader, lazyScene, gsap, ScrollTrigger } from './layout.js';
import { bindCardCursors } from './projects.js';

mountChrome('home');
bindCardCursors();

const heroCanvas = document.querySelector('[data-hero]');
const heroReady = lazyScene(heroCanvas, (m) => m.heroScene(heroCanvas));
const reelCanvas = document.querySelector('[data-reel]');
lazyScene(reelCanvas, (m) => m.flowScene(reelCanvas));

const voyage = document.querySelector('[data-voyage]');
let voyageProgress = 0;
const voyageCanvas = document.querySelector('[data-voyage-canvas]');
lazyScene(voyage, (m) => m.voyageScene(voyageCanvas, () => voyageProgress));
const ctaCanvas = document.querySelector('[data-cta]');
lazyScene(ctaCanvas, (m) => m.scatterScene(ctaCanvas));

initScroll();

// Intro line split into words for the entrance
const intro = document.querySelector('[data-hero-intro]');
intro.innerHTML = intro.innerHTML
  .split(/(<em>.*?<\/em>|\s+)/)
  .filter((s) => s.trim())
  .map((w) => `<span class="split-line" style="display:inline-block"><span>${w}</span></span>`)
  .join(' ');

runLoader(heroReady).then(() => {
  gsap.from('[data-hero-intro] .split-line > span', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.025 });
  gsap.from('.hero__stage', { clipPath: 'inset(20% 10% 0 10% round 22px)', duration: 1.6, ease: 'expo.out' });
  gsap.from('.header > *', { y: -30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1 });
  initReveals();
});

// Reel frame grows to full-bleed while the words slide apart
gsap.timeline({ scrollTrigger: { trigger: '[data-reel-wrap]', start: 'top top', end: 'bottom bottom', scrub: true } })
  .to('[data-reel-frame]', { clipPath: 'inset(0% round 0px)', ease: 'none' }, 0)
  .to('[data-reel-l]', { xPercent: -60, ease: 'none' }, 0)
  .to('[data-reel-r]', { xPercent: 60, ease: 'none' }, 0);

// Voyage: pinned tunnel driven by scroll, lines appear word by word
const lines = gsap.utils.toArray('[data-line]');
gsap.set(lines, { opacity: 0 });
ScrollTrigger.create({
  trigger: voyage, start: 'top top', end: 'bottom bottom', scrub: true,
  onUpdate: (self) => {
    voyageProgress = self.progress;
    document.querySelector('[data-voyage-bar]').style.height = self.progress * 100 + '%';
  },
});
const vt = gsap.timeline({ scrollTrigger: { trigger: voyage, start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
lines.forEach((line, i) => {
  vt.to(line, { opacity: 1, duration: 0.01 }, 0.02 + i * 0.05)
    .from(line.children, { opacity: 0, y: 40, filter: 'blur(10px)', stagger: 0.03, duration: 0.08 }, 0.02 + i * 0.05);
});
vt.to('.voyage__copy', { scale: 3, opacity: 0, duration: 0.3, ease: 'power2.in' }, 0.35)
  .to('.voyage__hint', { opacity: 0, duration: 0.1 }, 0.3)
  .to({}, { duration: 0.35 });
