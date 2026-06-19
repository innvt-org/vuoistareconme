// Richiede lz-string.min.js caricato prima di questo file.

const VSCM = (() => {

  const KEY = [0xde, 0xad, 0xbe, 0xef, 0x13, 0x37];

  function xor(bytes) {
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ KEY[i % KEY.length];
    return out;
  }

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

  // JSON → LZ compress (Uint8Array) → XOR → base64url.
  function encode(payloadObj) {
    const json = JSON.stringify(buildCompact(payloadObj));
    const compressed = LZString.compressToUint8Array(json);
    const scrambled = xor(compressed);
    let binary = '';
    for (let i = 0; i < scrambled.length; i++) binary += String.fromCharCode(scrambled[i]);
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // base64url → Uint8Array → XOR → LZ decompress → JSON.parse.
  function decode(token) {
    if (!token) return null;
    try {
      let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const binaryStr = atob(b64);
      const scrambled = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) scrambled[i] = binaryStr.charCodeAt(i);
      const compressed = xor(scrambled);
      const json = LZString.decompressFromUint8Array(compressed);
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

  // Converte URL di piattaforme note in URL diretto dell'immagine/thumbnail.
  // Restituisce { url, type } dove type è 'img' | 'youtube' | 'unsupported' | 'unknown'.
  function resolveImg(raw) {
    if (!raw) return { url: '', type: 'img' };
    const s = raw.trim();

    // Giphy pagina → GIF diretta
    // es. https://giphy.com/gifs/title-GIPHYID
    let m = s.match(/giphy\.com\/gifs\/(?:.*-)?([A-Za-z0-9]+)\/?(?:[?#].*)?$/);
    if (m) return { url: `https://media.giphy.com/media/${m[1]}/giphy.gif`, type: 'img' };

    // YouTube watch / short → thumbnail
    m = s.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
    if (m) return { url: `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`, type: 'youtube', ytId: m[1] };

    // Tenor pagina → non convertibile senza API
    if (s.includes('tenor.com/view/') || s.includes('tenor.com/search/')) {
      return { url: '', type: 'unsupported', hint: 'Tenor: apri la GIF, tasto destro → "Copia indirizzo immagine" e usa quel link.' };
    }

    // Instagram / TikTok → non embeddabili client-side
    if (s.includes('instagram.com') || s.includes('tiktok.com')) {
      return { url: '', type: 'unsupported', hint: 'Instagram/TikTok: scarica la GIF/video e caricala su Giphy oppure usa un link diretto.' };
    }

    return { url: s, type: 'img' };
  }

  return { encode, decode, getParam, buildUrl, estimateUrlLength, resolveImg };
})();
