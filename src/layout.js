import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const arrow = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 10h12M11 5l5 5-5 5"/></svg>`;
export const arrowSvg = arrow;

export function mountChrome(active) {
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <a href="/" class="logo" aria-label="Illusion home"><span class="logo__mark"></span>ILLUSION</a>
    <div class="header__actions">
      <button class="icon-btn" data-sound aria-label="Toggle sound">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 10h14"/></svg>
      </button>
      <a href="/#contact" class="pill pill--dark">Let's talk <span class="dot"></span></a>
      <button class="pill pill--light" data-menu-toggle aria-expanded="false"><span data-menu-label>Menu</span> <span class="dots"><span class="dot"></span><span class="dot"></span></span></button>
      <nav class="menu" data-menu>
        <div class="menu__card menu__links">
          <a href="/" class="${active === 'home' ? 'is-active' : ''}">Home <span class="dot"></span></a>
          <a href="/about.html" class="${active === 'about' ? 'is-active' : ''}">About us <span class="dot"></span></a>
          <a href="/projects.html" class="${active === 'projects' ? 'is-active' : ''}">Projects <span class="dot"></span></a>
          <a href="/#contact">Contact <span class="dot"></span></a>
        </div>
        <div class="menu__card">
          <p class="menu__title">Get the<br/>Illusion dispatch</p>
          <form class="field" data-news><input type="email" placeholder="Your email" required /><button aria-label="Subscribe">${arrow}</button></form>
        </div>
        <a class="menu__card menu__lab" href="/projects.html"><span><span class="logo__mark" style="width:14px;height:14px"></span>Illusion Lab</span>↗</a>
      </nav>
    </div>`;
  document.body.prepend(header);

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

  const sound = header.querySelector('[data-sound]');
  let on = false;
  sound.addEventListener('click', () => {
    on = !on;
    sound.querySelector('path').setAttribute('d', on ? 'M2 10l3-4 3 8 3-10 3 10 3-4' : 'M3 10h14');
  });

  document.querySelectorAll('form[data-news]').forEach((f) =>
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = f.querySelector('input');
      input.value = '';
      input.placeholder = 'You are on the list ✦';
    })
  );

  // Header goes light-on-dark over dark sections
  document.querySelectorAll('[data-dark]').forEach((el) =>
    ScrollTrigger.create({
      trigger: el, start: 'top 60px', end: 'bottom 60px',
      onToggle: (self) => header.classList.toggle('is-dark', self.isActive),
    })
  );
}

export function footerHTML(next = { label: 'About us', href: '/about.html' }) {
  return `
  <footer class="footer" id="contact">
    <div class="footer__grid">
      <div class="footer__col">
        <div>Studio 4, The Glasshouse<br/>21 Lantern Row<br/>Lisbon 1200-195<br/>Portugal</div>
      </div>
      <div class="footer__col">
        <div><a href="#">Instagram</a><br/><a href="#">LinkedIn</a><br/><a href="#">Are.na</a></div>
        <div><small>Say hello</small><a href="mailto:hello@illusion.studio">hello@illusion.studio</a></div>
        <div><small>Start a project</small><a href="mailto:work@illusion.studio">work@illusion.studio</a></div>
      </div>
      <div class="footer__col footer__news">
        <div>
          <h3>Get the<br/>Illusion dispatch</h3>
          <form class="field" data-news><input type="email" placeholder="Your email" required /><button aria-label="Subscribe">${arrow}</button></form>
        </div>
      </div>
    </div>
    <div class="footer__bottom">
      <span>©2026 Illusion Studio</span>
      <span>Lab: lab.illusion.studio</span>
      <span class="end"><span>Made with wonder in Lisbon</span><button class="to-top" data-top aria-label="Back to top"><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 16V4M5 9l5-5 5 5"/></svg></button></span>
    </div>
    <div class="footer__big" aria-hidden="true">ILLUSION</div>
  </footer>
  <a class="next-page" href="${next.href}">
    <div class="mono" style="opacity:.6">Keep scrolling<br/>to learn more</div>
    <div class="next-page__row"><h4>${next.label}</h4><span class="next-page__bar mono">Next page <i></i> →</span></div>
  </a>`;
}

export function initScroll() {
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('[data-top]').forEach((b) => b.addEventListener('click', () => lenis.scrollTo(0, { duration: 2 })));
  document.querySelectorAll('a[href^="/#"], a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').split('#')[1];
      const el = id && document.getElementById(id);
      if (el) { e.preventDefault(); lenis.scrollTo(el, { duration: 1.8 }); }
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

export function runLoader() {
  return new Promise((resolve) => {
    const seen = sessionStorage.getItem('illusion-loaded');
    const el = document.createElement('div');
    el.className = 'loader';
    el.innerHTML = `<div class="loader__word">L O A D I N G</div><div class="loader__count">0</div><div class="loader__bar"></div>`;
    document.body.appendChild(el);
    document.body.classList.add('is-loading');
    const count = el.querySelector('.loader__count');
    const bar = el.querySelector('.loader__bar');
    const state = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => { el.remove(); document.body.classList.remove('is-loading'); resolve(); },
    });
    tl.to(state, {
      v: 100, duration: seen ? 0.6 : 2.2, ease: 'power2.inOut',
      onUpdate: () => { count.textContent = Math.round(state.v); bar.style.width = state.v + '%'; },
    })
      .to(el.querySelector('.loader__word'), { opacity: 0, duration: 0.3 })
      .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '+=0.05');
    try { sessionStorage.setItem('illusion-loaded', '1'); } catch {}
  });
}

export { gsap, ScrollTrigger };
