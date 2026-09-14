import './styles.css';
import { mountChrome, footerHTML, initScroll, initReveals, runLoader, gsap, ScrollTrigger } from './layout.js';
import { nebulaScene, flowScene, scatterScene } from './scenes.js';
import { artHTML } from './projects.js';

document.querySelector('[data-footer]').outerHTML = footerHTML({ label: 'Our projects', href: '/projects.html' });

const crew = [
  { name: 'Inês Marlow', role: 'Founder · Creative Director', art: { a: '#ff4f1f', b: '#1b0d08', c: '#efebe3', shape: 'orb' } },
  { name: 'Theo Adebayo', role: 'Technical Director', art: { a: '#d6ff3f', b: '#101208', c: '#efebe3', shape: 'grid' } },
  { name: 'Sana Kuroda', role: '3D Lead', art: { a: '#7b61ff', b: '#0f0b24', c: '#ff9ad5', shape: 'rings' } },
  { name: 'Lukas Brenner', role: 'Motion Director', art: { a: '#efebe3', b: '#0d0d0f', c: '#ff4f1f', shape: 'wave' } },
];
document.querySelector('[data-team]').innerHTML = crew
  .map((p, i) => `<div class="person" data-reveal><div class="person__img">${artHTML(p.art, 'c' + i)}</div><div class="person__name">${p.name}</div><div class="person__role mono">${p.role}</div></div>`)
  .join('');

const glyphs = {
  S: '<path d="M18 4H8a4 4 0 000 8h8a4 4 0 010 8H6" fill="none" stroke="currentColor" stroke-width="4"/>',
  C: '<path d="M20 5H8v14h12" fill="none" stroke="currentColor" stroke-width="4"/>',
  T: '<path d="M3 5h18M12 5v16" fill="none" stroke="currentColor" stroke-width="4"/>',
  P: '<path d="M6 21V4h9a4 4 0 010 8H6" fill="none" stroke="currentColor" stroke-width="4"/>',
};
const cards = [
  { t: 'Strategy', g: 'S', items: ['Experience strategy', 'Creative technology', 'Concept development', 'Workshops', 'Research & insight'] },
  { t: 'Creative', g: 'C', items: ['Art direction', 'UX / UI design', 'Motion design', 'Interaction design', 'Illustration'] },
  { t: 'Tech', g: 'T', items: ['WebGL & WebGPU', 'Front-end engineering', 'Unity / Unreal', 'Physical installations', 'AR & VR'] },
  { t: 'Production', g: 'P', items: ['Procedural modelling', '3D asset creation', 'Real-time optimisation', 'Animation', 'Pipeline tooling'] },
];
document.querySelector('[data-cards]').innerHTML = cards
  .map((c) => {
    const g = `<svg class="xcard__glyph" viewBox="0 0 24 24">${glyphs[c.g]}</svg>`;
    return `<div class="xcard" data-xcard><div class="xcard__top">${c.t}${g}</div><ul>${c.items.map((i) => `<li>${i}</li>`).join('')}</ul><div class="xcard__bot">${c.t}${g}</div></div>`;
  })
  .join('');

mountChrome('about');

let heroP = 0;
nebulaScene(document.querySelector('[data-nebula]'), () => heroP);
flowScene(document.querySelector('[data-manifesto-canvas]'), { colors: ['#6b6760', '#0d0d0f', '#ff4f1f'] });
scatterScene(document.querySelector('[data-cta]'), { colors: ['#efebe3', '#ff4f1f', '#7b61ff', '#d6ff3f'] });

initScroll();

runLoader().then(() => {
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
