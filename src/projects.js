// Fictional portfolio. Every thumbnail is generated in code (no third-party imagery).
export const projects = [
  { title: 'Halcyon Audio', tags: ['Concept', 'Web', '3D', 'Sound'], cat: 'web', art: { a: '#ff4f1f', b: '#1b0d08', c: '#ffb37a', shape: 'rings' } },
  { title: 'Northwind Air', tags: ['WebGL', 'Motion', 'Development'], cat: 'webgl', art: { a: '#9fc3ff', b: '#0c1424', c: '#efebe3', shape: 'wave' } },
  { title: 'Moth & Moon', tags: ['Brand world', '3D', 'Illustration'], cat: '3d', art: { a: '#d6ff3f', b: '#101208', c: '#5a6b14', shape: 'orb' } },
  { title: 'Parallax Bank', tags: ['Product', 'Design', 'Interactive'], cat: 'web', art: { a: '#efebe3', b: '#0d0d0f', c: '#ff4f1f', shape: 'grid' } },
  { title: 'Kiln Ceramics', tags: ['E-commerce', '3D', 'Art direction'], cat: '3d', art: { a: '#e8a37c', b: '#2a140c', c: '#f7f4ee', shape: 'blob' } },
  { title: 'Orbit Kids Museum', tags: ['Installation', 'Game', 'AR'], cat: 'xr', art: { a: '#7b61ff', b: '#0f0b24', c: '#ff9ad5', shape: 'stars' } },
  { title: 'Tidewater Festival', tags: ['Campaign', 'WebGL', 'Video'], cat: 'webgl', art: { a: '#3fe0c5', b: '#04201c', c: '#d6ff3f', shape: 'wave' } },
  { title: 'Vanta Watches', tags: ['Product viz', '3D', 'Launch'], cat: '3d', art: { a: '#c9c4ba', b: '#0a0a0a', c: '#ff4f1f', shape: 'rings' } },
  { title: 'Fieldnote AI', tags: ['Product', 'Web', 'Motion'], cat: 'web', art: { a: '#ffcf3f', b: '#1d1606', c: '#efebe3', shape: 'grid' } },
  { title: 'Aurora Opera', tags: ['Trailer', 'XR', 'Direction'], cat: 'xr', art: { a: '#ff4f9a', b: '#1a0612', c: '#7b61ff', shape: 'orb' } },
];

function shapeSVG({ a, c, shape }, id) {
  switch (shape) {
    case 'rings':
      return Array.from({ length: 9 }, (_, i) =>
        `<circle cx="${62 + i * 1.5}" cy="${50 - i}" r="${8 + i * 5}" fill="none" stroke="${i % 3 ? a : c}" stroke-width="${i % 2 ? 0.6 : 1.8}" opacity="${1 - i * 0.07}"><animate attributeName="r" values="${8 + i * 5};${10 + i * 5};${8 + i * 5}" dur="${5 + i * 0.4}s" repeatCount="indefinite"/></circle>`
      ).join('');
    case 'wave':
      return Array.from({ length: 14 }, (_, i) =>
        `<path d="M-10 ${30 + i * 4} C 25 ${10 + i * 6}, 60 ${60 - i * 2}, 110 ${25 + i * 5}" fill="none" stroke="${i % 4 ? a : c}" stroke-width="${0.5 + (i % 3) * 0.4}" opacity="${0.3 + i * 0.05}"><animateTransform attributeName="transform" type="translate" values="0 0;0 ${i % 2 ? 3 : -3};0 0" dur="${4 + i * 0.3}s" repeatCount="indefinite"/></path>`
      ).join('');
    case 'orb':
      return `<defs><radialGradient id="o${id}" cx="35%" cy="30%"><stop offset="0" stop-color="${c}"/><stop offset=".45" stop-color="${a}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient></defs>
        <circle cx="50" cy="40" r="26" fill="url(#o${id})"><animate attributeName="cy" values="40;36;40" dur="6s" repeatCount="indefinite"/></circle>
        <ellipse cx="50" cy="40" rx="42" ry="7" fill="none" stroke="${a}" stroke-width=".6" opacity=".7" transform="rotate(-14 50 40)"/>`;
    case 'grid':
      return Array.from({ length: 36 }, (_, i) => {
        const x = 8 + (i % 9) * 10.5, y = 8 + Math.floor(i / 9) * 17;
        const on = (i * 7) % 5 === 0;
        return `<rect x="${x}" y="${y}" width="8" height="14" rx="2" fill="${on ? c : 'none'}" stroke="${a}" stroke-width=".5" opacity="${on ? 1 : 0.5}"><animate attributeName="opacity" values="${on ? '1;.3;1' : '.5;.9;.5'}" dur="${2 + (i % 5)}s" repeatCount="indefinite"/></rect>`;
      }).join('');
    case 'blob':
      return `<path fill="${a}" opacity=".9"><animate attributeName="d" dur="9s" repeatCount="indefinite" values="M50 12C70 12 86 26 84 44S66 72 48 70 14 58 16 40 30 12 50 12Z;M52 10C74 16 90 30 82 50S60 74 42 68 10 52 20 34 34 6 52 10Z;M50 12C70 12 86 26 84 44S66 72 48 70 14 58 16 40 30 12 50 12Z"/></path>
        <circle cx="40" cy="32" r="6" fill="${c}" opacity=".85"/>`;
    case 'stars':
      return Array.from({ length: 40 }, (_, i) => {
        const x = (i * 37) % 100, y = (i * 53) % 75, r = 0.4 + ((i * 13) % 10) / 8;
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 5 ? c : a}"><animate attributeName="opacity" values="1;.2;1" dur="${1.5 + (i % 6) * 0.5}s" repeatCount="indefinite"/></circle>`;
      }).join('') + `<path d="M20 60 Q50 -10 85 55" fill="none" stroke="${a}" stroke-width="1.5"/>`;
  }
  return '';
}

export function artHTML(art, id) {
  return `<div class="card__art" style="background:
      radial-gradient(120% 90% at 20% 110%, ${art.a}55, transparent 60%),
      radial-gradient(80% 70% at 90% 0%, ${art.c}33, transparent 60%), ${art.b}">
    <svg viewBox="0 0 100 75" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%">${shapeSVG(art, id)}</svg>
  </div>`;
}

export function cardHTML(p, i) {
  return `<a class="card" href="/projects.html" data-cat="${p.cat}" data-reveal>
    <div class="card__media">${artHTML(p.art, i)}<span class="card__cursor mono">View case ↗</span></div>
    <div class="card__meta">
      <span class="mono" style="opacity:.6">${p.tags.join(' • ')}</span>
      <span class="card__title"><span class="arrow">→</span>${p.title}</span>
    </div>
  </a>`;
}

export function bindCardCursors(root = document) {
  root.querySelectorAll('.card__media').forEach((m) => {
    const c = m.querySelector('.card__cursor');
    if (!c) return;
    m.addEventListener('pointermove', (e) => {
      const r = m.getBoundingClientRect();
      c.style.left = e.clientX - r.left + 'px';
      c.style.top = e.clientY - r.top + 'px';
    });
  });
}
