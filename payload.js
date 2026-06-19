// Richiede lz-string.min.js caricato prima di questo file.

const VSCM = (() => {

  // Costruisce il JSON compatto (campi vuoti/default omessi, chiavi corte).
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

  // LZString.compressToBase64 → base64url (sostituisce +/=/).
  function encode(payloadObj) {
    const json = JSON.stringify(buildCompact(payloadObj));
    return LZString.compressToBase64(json)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // base64url → base64 standard → LZString.decompressFromBase64 → JSON.parse.
  function decode(token) {
    if (!token) return null;
    try {
      let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const json = LZString.decompressFromBase64(b64);
      if (!json) return null;
      const obj = JSON.parse(json);
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
