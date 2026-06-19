const VSCM = (() => {

  function toBase64Url(str) {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    utf8Bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  function fromBase64Url(b64url) {
    let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // Encode: omette campi vuoti/default e usa chiavi corte per le opzioni.
  // Chiavi opzione: l=label, i=icon, m=msg, k=link, g=img.
  // Chiave root immagine: p (picture).
  // th "violet" viene omesso (è il default).
  function encode(payloadObj) {
    const out = {};
    if (payloadObj.s) out.s = payloadObj.s;
    if (payloadObj.r) out.r = payloadObj.r;
    if (payloadObj.q) out.q = payloadObj.q;
    if (payloadObj.th && payloadObj.th !== 'violet') out.th = payloadObj.th;
    if (payloadObj.img) out.p = payloadObj.img;
    if (payloadObj.ft) {
      const ft = {};
      if (payloadObj.ft.label) ft.l = payloadObj.ft.label;
      if (payloadObj.ft.msg)   ft.m = payloadObj.ft.msg;
      out.ft = ft;
    }
    out.o = (payloadObj.o || []).map(opt => {
      const o = {};
      if (opt.label) o.l = opt.label;
      if (opt.icon)  o.i = opt.icon;
      if (opt.msg)   o.m = opt.msg;
      if (opt.link)  o.k = opt.link;
      if (opt.img)   o.g = opt.img;
      return o;
    });
    return toBase64Url(JSON.stringify(out));
  }

  // Decode: normalizza sia il formato compatto (chiavi corte) sia il vecchio
  // formato (chiavi lunghe) per backward-compat con link già condivisi.
  function decode(token) {
    if (!token) return null;
    try {
      const obj = JSON.parse(fromBase64Url(token));
      if (!obj || typeof obj !== 'object') return null;
      obj.s   = obj.s   || '';
      obj.r   = obj.r   || '';
      obj.q   = obj.q   || '';
      obj.th  = obj.th  || 'violet';
      obj.img = obj.p   || obj.img || '';   // 'p' nuovo, 'img' vecchio
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
    } catch (e) {
      return null;
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
      if (v !== undefined && v !== null && v !== '') sp.set(k, v);
    });
    url.hash = sp.toString();
    return url.toString();
  }

  function estimateUrlLength(payloadObj, basePath) {
    return buildUrl(basePath, { t: encode(payloadObj) }).length;
  }

  return { encode, decode, getParam, buildUrl, estimateUrlLength };
})();
