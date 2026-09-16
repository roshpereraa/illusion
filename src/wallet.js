// Browser-extension wallet connection for Ethereum (EIP-6963 multi-wallet discovery, with a legacy
// window.ethereum fallback) and Solana (Wallet Standard, with a legacy window.solana fallback).
// Scope is deliberately small: connect, show the address, disconnect. No transactions, no signing.
import { getWallets } from '@wallet-standard/app';

const STORE_KEY = 'illusion-wallet';

const EVM_CHAINS = {
  1: 'Ethereum', 10: 'Optimism', 56: 'BNB Chain', 137: 'Polygon', 324: 'zkSync', 8453: 'Base',
  42161: 'Arbitrum', 43114: 'Avalanche', 59144: 'Linea', 81457: 'Blast', 11155111: 'Sepolia',
};

const INSTALL = {
  evm: [
    ['MetaMask', 'https://metamask.io/download/'],
    ['Rabby', 'https://rabby.io/'],
    ['Phantom', 'https://phantom.com/download'],
    ['Coinbase Wallet', 'https://www.coinbase.com/wallet/downloads'],
  ],
  sol: [
    ['Phantom', 'https://phantom.com/download'],
    ['Solflare', 'https://www.solflare.com/download/'],
    ['Backpack', 'https://backpack.app/downloads'],
  ],
};

const GENERIC_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0d0d0f"/><rect x="7" y="10" width="18" height="13" rx="3" fill="none" stroke="#efebe3" stroke-width="2"/><circle cx="21" cy="16.5" r="1.6" fill="#ff4f1f"/></svg>');

// ---------- storage ----------
export const readStored = () => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; } catch { return null; }
};
const writeStored = (v) => {
  try { v ? localStorage.setItem(STORE_KEY, JSON.stringify(v)) : localStorage.removeItem(STORE_KEY); } catch {}
};

export const shortAddress = (a) => (a.length > 12 ? `${a.slice(0, a.startsWith('0x') ? 6 : 4)}…${a.slice(-4)}` : a);
const safeIcon = (src) => (typeof src === 'string' && /^data:image\/(svg\+xml|png|jpeg|webp|gif)[;,]/i.test(src) ? src : GENERIC_ICON);
const isTouch = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

// ---------- Ethereum discovery ----------
const evmWallets = new Map(); // key -> { key, name, icon, provider }

function legacyEvmName(p) {
  if (p.isRabby) return 'Rabby';
  if (p.isBraveWallet) return 'Brave Wallet';
  if (p.isCoinbaseWallet) return 'Coinbase Wallet';
  if (p.isPhantom) return 'Phantom';
  if (p.isMetaMask) return 'MetaMask';
  return 'Browser wallet';
}

function discoverEvm(onChange) {
  window.addEventListener('eip6963:announceProvider', (e) => {
    const { info, provider } = e.detail || {};
    if (!info || !provider) return;
    const key = info.rdns || info.uuid;
    // A real announcement replaces the legacy guess for the same wallet.
    for (const [k, w] of evmWallets) if (w.legacy && w.provider === provider) evmWallets.delete(k);
    evmWallets.set(key, { key, name: info.name, icon: safeIcon(info.icon), provider });
    onChange();
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  // Older wallets that only inject window.ethereum.
  setTimeout(() => {
    const injected = window.ethereum;
    if (!injected) return;
    const list = Array.isArray(injected.providers) && injected.providers.length ? injected.providers : [injected];
    for (const p of list) {
      if ([...evmWallets.values()].some((w) => w.provider === p)) continue;
      const name = legacyEvmName(p);
      if ([...evmWallets.values()].some((w) => w.name === name)) continue;
      evmWallets.set(`legacy:${name}`, { key: `legacy:${name}`, name, icon: GENERIC_ICON, provider: p, legacy: true });
    }
    onChange();
  }, 350);
}

// ---------- Solana discovery ----------
const solWallets = new Map(); // name -> { key, name, icon, wallet?, legacy? }
const isSolanaStandard = (w) => w.chains?.some((c) => c.startsWith('solana:')) && w.features?.['standard:connect'];

function discoverSol(onChange) {
  const { get, on } = getWallets();
  const add = (list) => {
    for (const w of list) {
      if (!isSolanaStandard(w)) continue;
      solWallets.set(w.name, { key: w.name, name: w.name, icon: safeIcon(w.icon), wallet: w });
    }
    onChange();
  };
  add(get());
  on('register', (...ws) => add(ws));
  setTimeout(() => {
    const legacy = window.phantom?.solana || window.solana;
    if (!legacy?.connect) return;
    const name = legacy.isPhantom ? 'Phantom' : legacy.isSolflare ? 'Solflare' : 'Solana wallet';
    if (solWallets.has(name)) return;
    solWallets.set(name, { key: name, name, icon: GENERIC_ICON, legacySol: legacy });
    onChange();
  }, 350);
}

// ---------- connection state ----------
let session = null; // { ns, key, name, icon, address, chain, cleanup }
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(session));
export const onSessionChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

function setSession(next) {
  session?.cleanup?.();
  session = next;
  writeStored(next ? { ns: next.ns, key: next.key, name: next.name, address: next.address } : null);
  emit();
}

function friendlyError(err) {
  const code = err?.code;
  if (code === 4001 || /reject|denied|cancel/i.test(err?.message || '')) return 'Request cancelled in your wallet.';
  if (code === -32002) return 'A request is already open. Check your wallet extension.';
  return err?.message ? `Couldn't connect: ${err.message}` : "Couldn't connect. Try again.";
}

const chainLabel = (hex) => {
  const id = parseInt(hex, 16);
  return EVM_CHAINS[id] || (Number.isFinite(id) ? `Chain ${id}` : 'Ethereum');
};

async function connectEvm(w, { silent = false } = {}) {
  const p = w.provider;
  const accounts = await p.request({ method: silent ? 'eth_accounts' : 'eth_requestAccounts' });
  if (!accounts?.length) { if (silent) return false; throw new Error('No account was shared.'); }
  let chain = 'Ethereum';
  try { chain = chainLabel(await p.request({ method: 'eth_chainId' })); } catch {}

  const onAccounts = (accs) => {
    if (!accs?.length) return setSession(null);
    session = { ...session, address: accs[0] };
    writeStored({ ns: 'evm', key: w.key, name: w.name, address: accs[0] });
    emit();
  };
  const onChain = (hex) => { session = { ...session, chain: chainLabel(hex) }; emit(); };
  const onDisconnect = () => setSession(null);
  p.on?.('accountsChanged', onAccounts);
  p.on?.('chainChanged', onChain);
  p.on?.('disconnect', onDisconnect);

  setSession({
    ns: 'evm', key: w.key, name: w.name, icon: w.icon, address: accounts[0], chain,
    disconnect: async () => {
      // Not every wallet supports revoking; clearing our session is what matters for the site.
      try { await p.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] }); } catch {}
    },
    cleanup: () => {
      p.removeListener?.('accountsChanged', onAccounts);
      p.removeListener?.('chainChanged', onChain);
      p.removeListener?.('disconnect', onDisconnect);
    },
  });
  return true;
}

async function connectSol(w, { silent = false } = {}) {
  if (w.legacySol) {
    const res = await w.legacySol.connect(silent ? { onlyIfTrusted: true } : undefined);
    const address = (res?.publicKey || w.legacySol.publicKey)?.toString();
    if (!address) { if (silent) return false; throw new Error('No account was shared.'); }
    const onAcct = (pk) => (pk ? (session = { ...session, address: pk.toString() }, emit()) : setSession(null));
    w.legacySol.on?.('accountChanged', onAcct);
    setSession({
      ns: 'sol', key: w.key, name: w.name, icon: w.icon, address, chain: 'Solana',
      disconnect: async () => { try { await w.legacySol.disconnect(); } catch {} },
      cleanup: () => w.legacySol.off?.('accountChanged', onAcct),
    });
    return true;
  }

  const wallet = w.wallet;
  const { accounts } = await wallet.features['standard:connect'].connect(silent ? { silent: true } : undefined);
  const pick = (list) => list.find((a) => a.chains?.some((c) => c.startsWith('solana:'))) || list[0];
  const account = accounts?.length ? pick(accounts) : null;
  if (!account) { if (silent) return false; throw new Error('No account was shared.'); }

  const off = wallet.features['standard:events']?.on('change', ({ accounts: next }) => {
    if (!next) return;
    if (!next.length) return setSession(null);
    session = { ...session, address: pick(next).address };
    writeStored({ ns: 'sol', key: w.key, name: w.name, address: session.address });
    emit();
  });
  setSession({
    ns: 'sol', key: w.key, name: w.name, icon: w.icon, address: account.address, chain: 'Solana',
    disconnect: async () => { try { await wallet.features['standard:disconnect']?.disconnect(); } catch {} },
    cleanup: () => off?.(),
  });
  return true;
}

export async function disconnect() {
  const s = session;
  setSession(null);
  await s?.disconnect?.();
}

// ---------- boot ----------
let booted = false;
let renderPanel = () => {};
function boot() {
  if (booted) return;
  booted = true;
  discoverEvm(() => renderPanel());
  discoverSol(() => renderPanel());
}

const waitFor = (fn, ms) => new Promise((resolve) => {
  const t0 = performance.now();
  (function check() {
    const v = fn();
    if (v || performance.now() - t0 > ms) return resolve(v);
    setTimeout(check, 50);
  })();
});

/** Re-attach to the wallet used last time, without any prompt. Clears the stored session if it's gone. */
export async function restore() {
  const stored = readStored();
  if (!stored) return;
  boot();
  const registry = stored.ns === 'evm' ? evmWallets : solWallets;
  const w = await waitFor(() => registry.get(stored.key) || [...registry.values()].find((x) => x.name === stored.name), 1500);
  try {
    const ok = w && (stored.ns === 'evm' ? await connectEvm(w, { silent: true }) : await connectSol(w, { silent: true }));
    if (!ok) setSession(null);
  } catch {
    setSession(null);
  }
}

// ---------- UI ----------
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
};

let dialog, body, statusEl, lastTrigger, closeToken = null, busyKey = null;

function walletButton(ns, w) {
  const busy = busyKey === `${ns}:${w.key}`;
  return el('button', {
    type: 'button', class: 'wallet__option', 'aria-busy': busy ? 'true' : 'false', disabled: !!busyKey,
    onclick: async () => {
      busyKey = `${ns}:${w.key}`;
      status('Approve the request in your wallet…');
      renderPanel();
      try {
        await (ns === 'evm' ? connectEvm(w) : connectSol(w));
        status('');
      } catch (err) {
        status(friendlyError(err), true);
      } finally {
        busyKey = null;
        renderPanel();
      }
    },
  },
  el('img', { src: w.icon, alt: '', width: 32, height: 32 }),
  el('span', { class: 'wallet__option-name' }, w.name),
  el('span', { class: 'wallet__option-tag mono' }, busy ? 'Connecting…' : 'Detected'));
}

function emptyState(ns) {
  const here = location.href;
  const wrap = el('div', { class: 'wallet__empty' });
  if (isTouch()) {
    wrap.append(
      el('p', {}, 'Wallet extensions are desktop-only. Open this page inside your wallet app:'),
      el('div', { class: 'wallet__links' },
        ns === 'evm'
          ? [
              el('a', { href: `https://metamask.app.link/dapp/${location.host}${location.pathname}`, rel: 'noopener' }, 'MetaMask'),
              el('a', { href: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(here)}`, rel: 'noopener' }, 'Coinbase Wallet'),
              el('a', { href: `https://phantom.app/ul/browse/${encodeURIComponent(here)}?ref=${encodeURIComponent(location.origin)}`, rel: 'noopener' }, 'Phantom'),
            ]
          : [
              el('a', { href: `https://phantom.app/ul/browse/${encodeURIComponent(here)}?ref=${encodeURIComponent(location.origin)}`, rel: 'noopener' }, 'Phantom'),
              el('a', { href: `https://solflare.com/ul/v1/browse/${encodeURIComponent(here)}?ref=${encodeURIComponent(location.origin)}`, rel: 'noopener' }, 'Solflare'),
            ])
    );
  } else {
    wrap.append(
      el('p', {}, ns === 'evm' ? 'No Ethereum wallet extension found in this browser.' : 'No Solana wallet extension found in this browser.'),
      el('div', { class: 'wallet__links' }, INSTALL[ns].map(([name, href]) => el('a', { href, target: '_blank', rel: 'noopener' }, `Get ${name} ↗`)))
    );
  }
  return wrap;
}

function status(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.classList.toggle('is-error', isError);
}

function connectedView() {
  const s = session;
  const copyBtn = el('button', {
    type: 'button', class: 'pill pill--light wallet__action',
    onclick: async () => {
      try { await navigator.clipboard.writeText(s.address); copyBtn.textContent = 'Copied ✓'; }
      catch { copyBtn.textContent = 'Copy failed'; }
      setTimeout(() => (copyBtn.textContent = 'Copy address'), 1600);
    },
  }, 'Copy address');
  return el('div', { class: 'wallet__connected' },
    el('div', { class: 'wallet__who' },
      el('img', { src: s.icon || GENERIC_ICON, alt: '', width: 40, height: 40 }),
      el('div', {},
        el('div', { class: 'wallet__who-name' }, s.name),
        el('div', { class: 'mono wallet__chain' }, el('span', { class: 'dot', 'aria-hidden': 'true' }), `Connected · ${s.chain}`))),
    el('div', { class: 'wallet__label mono' }, 'Address'),
    el('output', { class: 'wallet__address', 'data-wallet-address': true }, s.address),
    el('div', { class: 'wallet__actions' },
      copyBtn,
      el('button', { type: 'button', class: 'pill pill--dark wallet__action', 'data-wallet-disconnect': true, onclick: () => disconnect() }, 'Disconnect')));
}

function section(ns, title, registry) {
  const list = [...registry.values()].sort((a, b) => Number(!!a.legacy) - Number(!!b.legacy) || a.name.localeCompare(b.name));
  return el('section', { class: 'wallet__section', 'aria-label': `${title} wallets` },
    el('h3', { class: 'wallet__section-title mono' }, title),
    list.length ? el('div', { class: 'wallet__list' }, list.map((w) => walletButton(ns, w))) : emptyState(ns));
}

renderPanel = () => {
  if (!body) return;
  const scroll = body.scrollTop;
  body.replaceChildren(
    session
      ? connectedView()
      : el('div', {}, section('evm', 'Ethereum', evmWallets), section('sol', 'Solana', solWallets))
  );
  body.scrollTop = scroll;
  dialog.querySelector('[data-wallet-title]').textContent = session ? 'Your wallet' : 'Connect a wallet';
  // Re-rendering removes the focused button; keep keyboard focus inside the open dialog.
  if (!dialog.hidden && !dialog.contains(document.activeElement)) {
    dialog.querySelector('.wallet__body button:not([disabled]), .wallet__close')?.focus();
  }
};

function ensureDialog() {
  if (dialog) return;
  statusEl = el('p', { class: 'wallet__status', role: 'status', 'aria-live': 'polite' });
  body = el('div', { class: 'wallet__body' });
  dialog = el('div', { class: 'wallet', hidden: true },
    el('div', { class: 'wallet__backdrop', onclick: closeWallet }),
    el('div', { class: 'wallet__panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'wallet-title' },
      el('div', { class: 'wallet__head' },
        el('h2', { id: 'wallet-title', 'data-wallet-title': true }, 'Connect a wallet'),
        el('button', { type: 'button', class: 'icon-btn wallet__close', 'aria-label': 'Close', onclick: closeWallet }, '✕')),
      body,
      statusEl,
      el('p', { class: 'wallet__fine mono' }, 'Connecting only shares your public address. Nothing is signed or sent.')));
  document.body.append(dialog);
  document.addEventListener('keydown', (e) => {
    if (dialog.hidden) return;
    if (e.key === 'Escape') { e.stopPropagation(); closeWallet(); return; }
    if (e.key !== 'Tab') return;
    const focusables = [...dialog.querySelectorAll('button:not([disabled]), a[href]')];
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  onSessionChange(() => renderPanel());
}

export function openWallet(trigger) {
  boot();
  ensureDialog();
  closeToken = null;
  lastTrigger = trigger;
  status('');
  renderPanel();
  dialog.hidden = false;
  document.documentElement.classList.add('wallet-open');
  requestAnimationFrame(() => {
    dialog.classList.add('is-open');
    dialog.querySelector('.wallet__body button, .wallet__close')?.focus();
  });
}

export function closeWallet() {
  if (!dialog || dialog.hidden) return;
  dialog.classList.remove('is-open');
  document.documentElement.classList.remove('wallet-open');
  const token = (closeToken = {});
  setTimeout(() => { if (closeToken === token) dialog.hidden = true; }, 250);
  lastTrigger?.focus();
}
