// Richiede lz-string.min.js caricato prima di questo file.

const VSCM = (() => {

  const KEY = [0xde, 0xad, 0xbe, 0xef, 0x13, 0x37];
  const PBKDF2_ITER = 100000;

  function xor(bytes) {
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ KEY[i % KEY.length];
    return out;
  }

  function b64urlEncode(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(str) {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binaryStr = atob(b64);
    const out = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) out[i] = binaryStr.charCodeAt(i);
    return out;
  }

  function isLocked(token) {
    return !!token && token.startsWith('v2.');
  }

  function sessionKey(token) {
    return 'vscm_pw_' + token.slice(0, 48);
  }

  function rememberPassword(token, password) {
    try { sessionStorage.setItem(sessionKey(token), password); } catch (_) {}
  }

  function forgetPassword(token) {
    try { sessionStorage.removeItem(sessionKey(token)); } catch (_) {}
  }

  function getStoredPassword(token) {
    try { return sessionStorage.getItem(sessionKey(token)); } catch (_) { return null; }
  }

  function buildCompact(p) {
    const out = {};
    if (p.s)  out.s  = p.s;
    if (p.r)  out.r  = p.r;
    if (p.q)  out.q  = p.q;
    if (p.th && p.th !== 'violet') out.th = p.th;
    if (p.img) out.p = p.img;
    if (p.ft)  {
      const ft = {};
      if (p.ft.label) ft.l = p.ft.label;
      if (p.ft.msg)   ft.m = p.ft.msg;
      out.ft = ft;
    }
    out.o = (p.o || []).map(opt => {
      const o = {};
      if (opt.label) o.l = opt.label;
      if (opt.icon)  o.i = opt.icon;
      if (opt.msg)   o.m = opt.msg;
      if (opt.link)  o.k = opt.link;
      if (opt.img)   o.g = opt.img;
      return o;
    });
    return out;
  }

  function expandPayload(obj) {
    if (!obj || typeof obj !== 'object') return null;
    obj.s   = obj.s  || '';
    obj.r   = obj.r  || '';
    obj.q   = obj.q  || '';
    obj.th  = obj.th || 'violet';
    obj.img = obj.p  || obj.img || '';
    obj.o   = Array.isArray(obj.o) ? obj.o : [];
    obj.o   = obj.o.map(opt => ({
      label: (opt && (opt.l !== undefined ? opt.l : opt.label)) || '',
      icon:  (opt && (opt.i !== undefined ? opt.i : opt.icon))  || '',
      msg:   (opt && (opt.m !== undefined ? opt.m : opt.msg))   || '',
      link:  (opt && (opt.k !== undefined ? opt.k : opt.link))  || '',
      img:   (opt && (opt.g !== undefined ? opt.g : opt.img))   || ''
    }));
    const ft = obj.ft;
    obj.ft = (ft && typeof ft === 'object') ? {
      label: (ft.l !== undefined ? ft.l : ft.label) || '',
      msg:   (ft.m !== undefined ? ft.m : ft.msg)   || ''
    } : null;
    return obj;
  }

  function buildTeaserMeta(payloadObj) {
    const meta = {};
    if (payloadObj.s) meta.s = payloadObj.s;
    if (payloadObj.r) meta.r = payloadObj.r;
    return meta;
  }

  function parseV2Parts(token) {
    if (!isLocked(token)) return null;
    const rest = token.slice(3);
    const parts = rest.split('.');
    if (parts.length === 2) return { meta: null, salt: parts[0], combined: parts[1] };
    if (parts.length === 3) return { meta: parts[0], salt: parts[1], combined: parts[2] };
    return null;
  }

  function parseTeaserMeta(token) {
    const parts = parseV2Parts(token);
    if (!parts) return { s: '', r: '' };
    if (!parts.meta) return { s: '', r: '' };
    try {
      const json = new TextDecoder().decode(b64urlDecode(parts.meta));
      const obj = JSON.parse(json);
      return { s: obj.s || '', r: obj.r || '' };
    } catch (_) {
      return { s: '', r: '' };
    }
  }

  function encodeTeaserMeta(meta) {
    const json = JSON.stringify(meta);
    const bytes = new TextEncoder().encode(json);
    return b64urlEncode(bytes);
  }

  function encodeV1(json) {
    const compressed = LZString.compressToUint8Array(json);
    const scrambled = xor(compressed);
    return b64urlEncode(scrambled);
  }

  function decodeV1(token) {
    try {
      const scrambled = b64urlDecode(token);
      const compressed = xor(scrambled);
      const json = LZString.decompressFromUint8Array(compressed);
      if (!json) return null;
      return expandPayload(JSON.parse(json));
    } catch (_) {
      return null;
    }
  }

  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encode(payloadObj, password) {
    const json = JSON.stringify(buildCompact(payloadObj));
    const pw = (password || '').trim();
    if (!pw) return encodeV1(json);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pw, salt);
    const compressed = LZString.compressToUint8Array(json);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, compressed);
    const ct = new Uint8Array(ciphertext);
    const combined = new Uint8Array(iv.length + ct.length);
    combined.set(iv);
    combined.set(ct, iv.length);
    const meta = buildTeaserMeta(payloadObj);
    return `v2.${encodeTeaserMeta(meta)}.${b64urlEncode(salt)}.${b64urlEncode(combined)}`;
  }

  async function decode(token, password) {
    if (!token) return null;
    if (!isLocked(token)) {
      const payload = decodeV1(token);
      return payload ? { payload } : null;
    }

    const teaser = parseTeaserMeta(token);
    const pw = (password || getStoredPassword(token) || '').trim();
    if (!pw) return { locked: true, teaser };

    try {
      const parts = parseV2Parts(token);
      if (!parts) return { locked: true, wrongPassword: true, teaser };
      const salt = b64urlDecode(parts.salt);
      const combined = b64urlDecode(parts.combined);
      const iv = combined.slice(0, 12);
      const ct = combined.slice(12);
      const key = await deriveKey(pw, salt);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
      const json = LZString.decompressFromUint8Array(new Uint8Array(decrypted));
      if (!json) return { locked: true, wrongPassword: true, teaser };
      const payload = expandPayload(JSON.parse(json));
      if (!payload) return { locked: true, wrongPassword: true, teaser };
      return { payload };
    } catch (_) {
      return { locked: true, wrongPassword: true, teaser };
    }
  }

  function getParam(name) {
    const hash = window.location.hash.slice(1);
    return new URLSearchParams(hash).get(name);
  }

  function buildUrl(path, params) {
    const url = new URL(path, window.location.href);
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      sp.set(k, v);
    });
    url.hash = sp.toString();
    return url.toString();
  }

  async function estimateUrlLength(payloadObj, basePath, password) {
    const t = await encode(payloadObj, password);
    return buildUrl(basePath, { t }).length;
  }

  function teaserPasswordFormHtml(wrongPassword, hint) {
    const hintText = hint || 'Inserisci la password per vederlo';
    return `
      <p class="teaser-pw-hint">${hintText}</p>
      <input type="password" class="teaser-pw-input" id="teaser-pw" placeholder="Password" autocomplete="off">
      ${wrongPassword ? '<p class="teaser-pw-error">Password errata, riprova.</p>' : ''}
      <div class="teaser-btn-wrap">
        <button type="button" class="teaser-btn" id="teaser-unlock-btn">Sblocca</button>
      </div>
      <p class="privacy-note" style="margin-top:16px">La password protegge il contenuto, non chi scrive o riceve. Chiedila a chi te l'ha inviato — non è nel link.</p>`;
  }

  function teaserPasswordHtml(wrongPassword) {
    return `
      <p class="teaser-line teaser-msg">Messaggio protetto</p>
      ${teaserPasswordFormHtml(wrongPassword)}`;
  }

  function bindTeaserPassword(onUnlock) {
    const input = document.getElementById('teaser-pw');
    const btn = document.getElementById('teaser-unlock-btn');
    async function tryUnlock() {
      const pw = input.value;
      if (!pw) return;
      btn.disabled = true;
      const ok = await onUnlock(pw);
      btn.disabled = false;
      if (!ok && input) input.focus();
    }
    btn.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
    input.focus();
  }

  function resolveImg(raw) {
    if (!raw) return { url: '', type: 'img' };
    const s = raw.trim();

    let m = s.match(/giphy\.com\/gifs\/(?:.*-)?([A-Za-z0-9]+)\/?(?:[?#].*)?$/);
    if (m) return { url: `https://media.giphy.com/media/${m[1]}/giphy.gif`, type: 'img' };

    m = s.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
    if (m) return { url: `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`, type: 'youtube', ytId: m[1] };

    if (s.includes('tenor.com/view/') || s.includes('tenor.com/search/')) {
      return { url: '', type: 'unsupported', hint: 'Tenor: apri la GIF, tasto destro → "Copia indirizzo immagine" e usa quel link.' };
    }

    if (s.includes('instagram.com') || s.includes('tiktok.com')) {
      return { url: '', type: 'unsupported', hint: 'Instagram/TikTok: scarica la GIF/video e caricala su Giphy oppure usa un link diretto.' };
    }

    return { url: s, type: 'img' };
  }

  function buildReplyNavParams(token, answerIdx, freeMsg) {
    const params = { t: token, a: String(answerIdx) };
    if (freeMsg) params.m = freeMsg;
    return params;
  }

  return {
    encode, decode, getParam, buildUrl, estimateUrlLength, resolveImg,
    isLocked, parseTeaserMeta, buildReplyNavParams,
    rememberPassword, forgetPassword, getStoredPassword,
    teaserPasswordHtml, teaserPasswordFormHtml, bindTeaserPassword,
  };
})();
