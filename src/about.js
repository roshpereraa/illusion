import './styles.css';
import { mountChrome, initScroll, initReveals, runLoader, lazyScene, gsap, ScrollTrigger } from './layout.js';
mountChrome('about');

let heroP = 0;
const nebulaCanvas = document.querySelector('[data-nebula]');
const heroReady = lazyScene(nebulaCanvas, (m) => m.nebulaScene(nebulaCanvas, () => heroP));
const manifestoCanvas = document.querySelector('[data-manifesto-canvas]');
lazyScene(manifestoCanvas, (m) => m.flowScene(manifestoCanvas, { colors: ['#6b6760', '#0d0d0f', '#ff4f1f'] }));
const ctaCanvas = document.querySelector('[data-cta]');
lazyScene(ctaCanvas, (m) => m.scatterScene(ctaCanvas, { colors: ['#efebe3', '#ff4f1f', '#7b61ff', '#d6ff3f'] }));

initScroll();

runLoader(heroReady).then(() => {
  const word = document.querySelector('[data-word]');
  word.innerHTML = [...word.textContent].map((ch) => `<span style="display:inline-block">${ch}</span>`).join('');
  gsap.from(word.children, { yPercent: 100, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.05 });
  initReveals();
});

ScrollTrigger.create({
  trigger: '.about-hero', start: 'top top', end: 'bottom top', scrub: true,
  onUpdate: (s) => (heroP = s.progress),
});
gsap.to('[data-word]', { yPercent: -40, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.about-hero', start: 'top top', end: 'bottom top', scrub: true } });

gsap.timeline({ scrollTrigger: { trigger: '[data-manifesto]', start: 'top top', end: 'bottom bottom', scrub: true } })
  .from('[data-m-l]', { xPercent: -30, opacity: 0, ease: 'none' }, 0)
  .from('[data-m-r]', { xPercent: 30, opacity: 0, ease: 'none' }, 0.1)
  .to({}, { duration: 0.6 });

gsap.from('[data-xcard]', {
  y: 200, rotate: (i) => (i - 1.5) * 8, opacity: 0, stagger: 0.1, duration: 1.4, ease: 'expo.out',
  scrollTrigger: { trigger: '[data-cards]', start: 'top 85%' },
});
const swoosh = document.querySelector('[data-swoosh]');
const len = swoosh.getTotalLength();
gsap.fromTo(swoosh, { strokeDasharray: len, strokeDashoffset: len }, {
  strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.expertise', start: 'top 70%', end: 'bottom 60%', scrub: true },
});
