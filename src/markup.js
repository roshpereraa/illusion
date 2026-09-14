// Pure string templates with no browser dependencies, so they can be baked into the HTML at build time
// (see vite.config.js) and the page arrives complete instead of being filled in after first paint.
import { projects, cardHTML, artHTML } from './projects.js';

export const arrowSvg = `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5"/></svg>`;

const newsForm = (id) => `<form class="field" data-news>
  <label class="sr-only" for="${id}">Email address</label>
  <input id="${id}" type="email" name="email" autocomplete="email" placeholder="Your email" required />
  <button type="submit" aria-label="Subscribe">${arrowSvg}</button>
</form>`;

export function headerHTML(active) {
  const cur = (name) => (active === name ? ' class="is-active" aria-current="page"' : '');
  return `<header class="header">
    <a href="/" class="logo" aria-label="Illusion home"><span class="logo__mark" aria-hidden="true"></span>ILLUSION</a>
    <div class="header__actions">
      <button type="button" class="icon-btn" data-sound aria-label="Toggle sound" aria-pressed="false">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 10h14"/></svg>
      </button>
      <a href="/#contact" class="pill pill--dark">Let's talk <span class="dot" aria-hidden="true"></span></a>
      <button type="button" class="pill pill--light" data-menu-toggle aria-expanded="false" aria-controls="site-menu"><span data-menu-label>Menu</span> <span class="dots" aria-hidden="true"><span class="dot"></span><span class="dot"></span></span></button>
      <nav class="menu" id="site-menu" data-menu aria-label="Main">
        <div class="menu__card menu__links">
          <a href="/"${cur('home')}>Home <span class="dot" aria-hidden="true"></span></a>
          <a href="/about.html"${cur('about')}>About us <span class="dot" aria-hidden="true"></span></a>
          <a href="/projects.html"${cur('projects')}>Projects <span class="dot" aria-hidden="true"></span></a>
          <a href="/#contact">Contact <span class="dot" aria-hidden="true"></span></a>
        </div>
        <div class="menu__card">
          <p class="menu__title">Get the<br/>Illusion dispatch</p>
          ${newsForm('menu-email')}
        </div>
        <a class="menu__card menu__lab" href="/projects.html"><span><span class="logo__mark" style="width:14px;height:14px" aria-hidden="true"></span>Illusion Lab</span><span aria-hidden="true">↗</span></a>
      </nav>
    </div>
  </header>`;
}

export function footerHTML(next) {
  return `<footer class="footer" id="contact">
    <div class="footer__grid">
      <div class="footer__col">
        <address>Studio 4, The Glasshouse<br/>21 Lantern Row<br/>Lisbon 1200-195<br/>Portugal</address>
      </div>
      <div class="footer__col">
        <ul class="footer__social">
          <li><a href="#" data-soon>Instagram</a></li>
          <li><a href="#" data-soon>LinkedIn</a></li>
          <li><a href="#" data-soon>Are.na</a></li>
        </ul>
        <div><small>Say hello</small><a class="footer__mail" href="mailto:hello@illusion.studio">hello@illusion.studio</a></div>
        <div><small>Start a project</small><a class="footer__mail" href="mailto:work@illusion.studio">work@illusion.studio</a></div>
      </div>
      <div class="footer__col footer__news">
        <div>
          <h2 class="footer__title">Get the<br/>Illusion dispatch</h2>
          ${newsForm('footer-email')}
        </div>
      </div>
    </div>
    <div class="footer__bottom">
      <span>©2026 Illusion Studio</span>
      <span>Lab: lab.illusion.studio</span>
      <span class="end"><span>Made with wonder in Lisbon</span><button type="button" class="to-top" data-top aria-label="Back to top"><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M10 16V4M5 9l5-5 5 5"/></svg></button></span>
    </div>
    <div class="footer__big" aria-hidden="true">ILLUSION</div>
  </footer>
  <a class="next-page" href="${next.href}">
    <span class="mono next-page__eyebrow">Keep scrolling<br/>to learn more</span>
    <span class="next-page__row"><span class="next-page__label">${next.label}</span><span class="next-page__bar mono">Next page <i></i> →</span></span>
  </a>`;
}

const crew = [
  { name: 'Inês Marlow', role: 'Founder · Creative Director', art: { a: '#ff4f1f', b: '#1b0d08', c: '#efebe3', shape: 'orb' } },
  { name: 'Theo Adebayo', role: 'Technical Director', art: { a: '#d6ff3f', b: '#101208', c: '#efebe3', shape: 'grid' } },
  { name: 'Sana Kuroda', role: '3D Lead', art: { a: '#7b61ff', b: '#0f0b24', c: '#ff9ad5', shape: 'rings' } },
  { name: 'Lukas Brenner', role: 'Motion Director', art: { a: '#efebe3', b: '#0d0d0f', c: '#ff4f1f', shape: 'wave' } },
];

const glyphs = {
  S: '<path d="M18 4H8a4 4 0 000 8h8a4 4 0 010 8H6" fill="none" stroke="currentColor" stroke-width="4"/>',
  C: '<path d="M20 5H8v14h12" fill="none" stroke="currentColor" stroke-width="4"/>',
  T: '<path d="M3 5h18M12 5v16" fill="none" stroke="currentColor" stroke-width="4"/>',
  P: '<path d="M6 21V4h9a4 4 0 010 8H6" fill="none" stroke="currentColor" stroke-width="4"/>',
};
const expertise = [
  { t: 'Strategy', g: 'S', items: ['Experience strategy', 'Creative technology', 'Concept development', 'Workshops', 'Research & insight'] },
  { t: 'Creative', g: 'C', items: ['Art direction', 'UX / UI design', 'Motion design', 'Interaction design', 'Illustration'] },
  { t: 'Tech', g: 'T', items: ['WebGL & WebGPU', 'Front-end engineering', 'Unity / Unreal', 'Physical installations', 'AR & VR'] },
  { t: 'Production', g: 'P', items: ['Procedural modelling', '3D asset creation', 'Real-time optimisation', 'Animation', 'Pipeline tooling'] },
];

export const teamHTML = () =>
  crew
    .map((p, i) => `<div class="person" data-reveal><div class="person__img" aria-hidden="true">${artHTML(p.art, 'c' + i)}</div><h3 class="person__name">${p.name}</h3><p class="person__role mono">${p.role}</p></div>`)
    .join('');

export const expertiseHTML = () =>
  expertise
    .map((c) => {
      const g = `<svg class="xcard__glyph" viewBox="0 0 24 24" aria-hidden="true">${glyphs[c.g]}</svg>`;
      return `<div class="xcard" data-xcard><h3 class="xcard__top">${c.t}${g}</h3><ul>${c.items.map((i) => `<li>${i}</li>`).join('')}</ul><div class="xcard__bot" aria-hidden="true">${c.t}${g}</div></div>`;
    })
    .join('');

export const featuredHTML = () => projects.slice(0, 4).map(cardHTML).join('');
export const allProjectsHTML = () => projects.map(cardHTML).join('');

// Placeholders in the page HTML → markup. Used by the Vite plugin.
export const partials = {
  'header:home': () => headerHTML('home'),
  'header:about': () => headerHTML('about'),
  'header:projects': () => headerHTML('projects'),
  'footer:home': () => footerHTML({ label: 'About us', href: '/about.html' }),
  'footer:about': () => footerHTML({ label: 'Our projects', href: '/projects.html' }),
  'footer:projects': () => footerHTML({ label: 'Home', href: '/' }),
  featured: featuredHTML,
  projects: allProjectsHTML,
  team: teamHTML,
  expertise: expertiseHTML,
};
