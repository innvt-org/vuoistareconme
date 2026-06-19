/**
 * payload.js
 * Codifica/decodifica del payload condiviso tra /edit, /request e /reply.
 *
 * Il payload viaggia nel frammento URL (#t=…) e non nella query string,
 * così il browser non invia mai il dato al server e i log restano puliti.
 *
 * Struttura payload:
 * {
 *   s:  string,           // nome di chi manda (mittente)
 *   r:  string,           // nome di chi riceve (destinatario)
 *   q:  string,           // testo della domanda
 *   th: string,           // tema colore: "violet"|"rose"|"sky"|"forest"|"sunset"|"dark"
 *   o: [                  // opzioni di risposta, in ordine
 *     {
 *       label: string,    // testo bottone, es. "Sì"
 *       icon:  string,    // emoji, es. "❤️" — campo esplicito, non dedotto dal testo
 *       msg:   string,    // messaggio mostrato in /reply
 *       link:  string     // URL già costruito (wa.me/…, ecc.) — può essere ""
 *     },
 *     ...
 *   ]
 * }
 */

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

  function encode(payloadObj) {
    return toBase64Url(JSON.stringify(payloadObj));
  }

  function decode(token) {
    if (!token) return null;
    try {
      const obj = JSON.parse(fromBase64Url(token));
      if (!obj || typeof obj !== 'object') return null;
      obj.s  = obj.s  || '';
      obj.r  = obj.r  || '';
      obj.q  = obj.q  || '';
      obj.th = obj.th || 'violet';
      obj.o  = Array.isArray(obj.o) ? obj.o : [];
      obj.o  = obj.o.map(opt => ({
        label: (opt && opt.label) || '',
        icon:  (opt && opt.icon)  || '',
        msg:   (opt && opt.msg)   || '',
        link:  (opt && opt.link)  || ''
      }));
      return obj;
    } catch (e) {
      return null;
    }
  }

  /**
   * Legge un parametro dal frammento URL (#key=val&…).
   * Il frammento non viene mai inviato al server → i log restano puliti.
   */
  function getParam(name) {
    const hash = window.location.hash.slice(1); // rimuove il '#' iniziale
    return new URLSearchParams(hash).get(name);
  }

  /**
   * Costruisce un URL con i parametri nel frammento, non nella query string.
   * Es: request.html#t=BASE64
   */
  function buildUrl(path, params) {
    // Usa href (non solo origin) come base: risolve correttamente anche da sottodirectory
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
