/* ============================================================
   Birthday Studio — shared data layer
   Works from file:// or any static host. No dependencies.
   ============================================================ */
(function (global) {
  'use strict';

  const DB_NAME = 'birthday_studio';
  const DB_VERSION = 1;
  const STORE_CONFIG = 'config';
  const STORE_MEDIA = 'media';
  const CONFIG_KEY = 'site';

  const AUTH_KEY = 'bd_admin_auth_v1';
  const HINT_KEY = 'bd_admin_hint_v1';
  const SESSION_KEY = 'bd_admin_session_v1';
  const SESSION_TTL = 12 * 60 * 60 * 1000;
  const CONFIG_FALLBACK = 'bd_config_fallback_v1';
  const VISITOR_GATE_KEY = 'bd_visitor_unlock_v1';
  const VISITOR_GATE_TTL = 12 * 60 * 60 * 1000;

  /*
    Built-in admin password: birthday2026
    It only applies until the editor sets a local password (Settings → Admin
    password); after that the local password replaces it in that browser.
    This is a convenience gate, not real security — publishing still requires
    a Supabase sign-in.
  */
  const DEFAULT_ADMIN_AUTH = {
    v: 1,
    salt: '4317ef9a43106fdd480dd33977492d8b',
    hash: 'b963ee19f2bd6e3e61bf50fdaf0b92f1503ae6318bd1305077748528bd150082'
  };

  /*
    Built-in visitor password: welcome2026
    This gate applies whenever the site has no custom visitor password, so a
    freshly deployed page asks for a password before the first cloud publish.
    The editor can replace it with a custom password, or turn the gate off
    completely (settings.visitorGate = false). Like the admin gate, this is a
    surprise gate, not real access control.
  */
  const DEFAULT_VISITOR_GATE = {
    v: 1,
    salt: 'f5b417a105d5bb179399d720bf380f8b',
    hash: '6b7f572681c7f870521141a38bcdf2ebdef6077e750f4ca37e52e39eac70765f'
  };
  const DEFAULT_VISITOR_PASSWORD = 'welcome2026';

  /* Optional cloud backend — configured in supabase-config.js */
  const SUPABASE_RAW = global.BD_SUPABASE && typeof global.BD_SUPABASE === 'object' ? global.BD_SUPABASE : {};
  const SUPABASE_URL = String(SUPABASE_RAW.url || '').replace(/\/+$/, '');
  const SUPABASE_ANON_KEY = String(SUPABASE_RAW.anonKey || '');
  const SUPABASE_BUCKET = String(SUPABASE_RAW.bucket || 'birthday-media');
  const SUPABASE_SITE_ID = String(SUPABASE_RAW.siteId || 'main');
  const SUPABASE_SESSION_KEY = 'bd_supabase_session_v1';

  /* ---------------------------------------------------------
     Scene catalogue (ids are used in config + markup)
     --------------------------------------------------------- */
  const SCENES = [
    { id: 'gift', label: 'The Gift', blurb: 'Opens the experience' },
    { id: 'hero', label: 'Happy Birthday', blurb: 'Big animated greeting' },
    { id: 'cake', label: 'Make a Wish', blurb: 'Blow-out-the-candles game' },
    { id: 'photos', label: 'Photo Memories', blurb: 'Flip-through polaroids' },
    { id: 'videos', label: 'Video Memories', blurb: 'Playable video cards' },
    { id: 'balloons', label: 'Balloon Pop', blurb: 'Hidden message mini-game' },
    { id: 'gifts', label: 'Pick a Gift', blurb: 'Fortunes + scratch card' },
    { id: 'letter', label: 'The Letter', blurb: 'Self-typing letter' },
    { id: 'finale', label: 'Finale', blurb: 'Fireworks + replay' }
  ];

  const FONTS = {
    rounded: "'Trebuchet MS', 'Segoe UI', system-ui, -apple-system, sans-serif",
    display: "'Arial Black', 'Arial Bold', Gadget, 'Trebuchet MS', sans-serif",
    serif: "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
    mono: "'Courier New', Courier, monospace"
  };

  const THEME_PRESETS = {
    playful: {
      label: 'Playful',
      accent: '#ff5f9e',
      accent2: '#8b5cf6',
      bg1: '#1b1035',
      bg2: '#3d1a5b',
      text: '#fff7ff'
    },
    elegant: {
      label: 'Elegant gold',
      accent: '#e8c47d',
      accent2: '#b48a3c',
      bg1: '#0d0d12',
      bg2: '#221d26',
      text: '#fbf5e8'
    },
    neon: {
      label: 'Neon',
      accent: '#00f5d4',
      accent2: '#f15bb5',
      bg1: '#050510',
      bg2: '#12123a',
      text: '#eafcff'
    },
    pastel: {
      label: 'Pastel dusk',
      accent: '#ff9ec4',
      accent2: '#a5b4fc',
      bg1: '#241b39',
      bg2: '#45345f',
      text: '#fff6fb'
    }
  };

  /* ---------------------------------------------------------
     Defaults — everything is editable from admin.html
     --------------------------------------------------------- */
  const DEFAULT_CONFIG = {
    version: 1,
    general: {
      name: 'Alex',
      giftKicker: 'A little something for you',
      giftPrompt: 'Today is all about you. Ready to see what is inside?',
      giftCta: 'Open your gift',
      giftOpened: 'Best. Day. Ever.',
      giftHint: 'Tap the box to open it',
      heroPrefix: 'Happy Birthday',
      heroKicker: 'Happy birthday',
      heroCta: 'Keep going →',
      heroSubtitle:
        'Another trip around the sun — and the world is softer, brighter and a lot more fun because you are in it.',
      heroHint: 'Tap the letters. They like the attention.',
      cakeKicker: 'The wish',
      cakeTitle: 'Make a wish',
      cakeSubtitle: 'Tap each flame to blow it out — or use your mic and give it a real puff.',
      wishGranted: 'Wish granted. May this year bring you every single thing you quietly hoped for.',
      photosKicker: 'Memory lane',
      photosTitle: 'Little moments, big love',
      photosSubtitle: 'A few snapshots from the story so far.',
      photosEmpty: 'The photo album is still being filled. A few favourite moments will appear here soon.',
      photoPlaceholder1: 'A memory worth keeping.',
      photoPlaceholder2: 'One for the highlight reel.',
      photoPlaceholder3: 'Another year, another adventure.',
      videosKicker: 'Now playing',
      videosTitle: 'Movie memories',
      videosSubtitle: 'Press play. This is your highlight reel.',
      videosEmpty: 'The highlight reel is still being cut. A little cinema is on its way.',
      balloonsKicker: 'Mini game',
      balloonsTitle: 'Pop the balloons',
      balloonsSubtitle: 'Every balloon holds one letter. Pop them all to reveal the message.',
      balloonsDone: 'You found it!',
      giftsKicker: 'A tiny bit of magic',
      giftsTitle: 'Pick a gift',
      giftsSubtitle: 'Three boxes. One little fortune inside each.',
      scratchKicker: 'One more secret',
      scratchTitle: 'Scratch to reveal',
      scratchSubtitle: 'Go on — it will not bite.',
      letterKicker: 'From me to you',
      letterTitle: 'A letter for you',
      letterBody:
        'Dear {name},\n\nSome days deserve more than a text message. Today is one of them.\n\nThank you for the laughter, the late-night talks, and the way you show up for the people you love. The world is softer, funnier, and a whole lot brighter because you are in it.\n\nSo here is to another year of adventures, questionable decisions, and memories worth keeping. I hope this one is your best one yet.\n\nHappy birthday. Truly.',
      signature: 'With all my love,\n— Your favourite person',
      finaleKicker: 'One last thing',
      finaleTitle: 'Happy Birthday, {name}!',
      finaleSubtitle: 'Here is to you — today, tomorrow, and every ridiculous adventure in between.',
      replayLabel: 'Replay the magic',
      copyLabel: 'Copy link',
      easterEggHint: 'Psst… press B for a balloon shower.',
      micStartLabel: 'Blow with mic',
      micStopLabel: 'Stop listening',
      micUnavailableLabel: 'Mic unavailable',
      relightLabel: 'Relight candles',
      balloonsReplayLabel: 'Play again',
      fortuneLabel: 'Your fortune',
      scratchCta: 'SCRATCH HERE',
      scratchResetLabel: 'Reset the card',
      letterSkipLabel: 'Skip typing',
      holdHeartLabel: 'Hold for love',
      loaderText: 'Warming up the confetti…'
    },
    theme: {
      preset: 'playful',
      accent: '#ff5f9e',
      accent2: '#8b5cf6',
      bg1: '#1b1035',
      bg2: '#3d1a5b',
      text: '#fff7ff',
      font: 'rounded'
    },
    scenes: {
      order: ['gift', 'hero', 'cake', 'photos', 'videos', 'balloons', 'gifts', 'letter', 'finale'],
      enabled: {
        gift: true,
        hero: true,
        cake: true,
        photos: true,
        videos: true,
        balloons: true,
        gifts: true,
        letter: true,
        finale: true
      },
      balloonsMessage: 'HAPPY BIRTHDAY, {name}!',
      scratchSecret: 'You are so deeply loved. Never forget it.',
      showScratch: true,
      easterEgg: true,
      fortunes: [
        'This year brings you the adventure you have been quietly hoping for.',
        'Someone is going to make you laugh until you cry very soon.',
        'A door you thought was closed is about to swing wide open.',
        'You will look back on this year and smile at how it all worked out.',
        'Good news is on its way — the kind you will want to share immediately.',
        'You are about to outgrow something that once felt too big for you.'
      ]
    },
    media: {
      photos: [],
      videos: [],
      songs: [],
      activeSongId: null
    },
    settings: {
      confetti: 'medium',
      cursorSparkles: true,
      music: true,
      autoAdvance: 0,
      visitorGate: null
    }
  };

  /* ---------------------------------------------------------
     Tiny utilities
     --------------------------------------------------------- */
  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return global.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
    } catch (err) {
      return JSON.parse(JSON.stringify(value));
    }
  }

  function deepMerge(base, extra) {
    if (Array.isArray(base)) {
      return Array.isArray(extra) ? clone(extra) : clone(base);
    }
    if (base && typeof base === 'object') {
      const out = {};
      for (const key of Object.keys(base)) out[key] = clone(base[key]);
      if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
        for (const key of Object.keys(extra)) {
          if (extra[key] === undefined) continue;
          out[key] = key in base ? deepMerge(base[key], extra[key]) : clone(extra[key]);
        }
      }
      return out;
    }
    return extra === undefined ? base : extra;
  }

  function getPath(obj, path) {
    return String(path)
      .split('.')
      .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  }

  function setPath(obj, path, value) {
    const keys = String(path).split('.');
    let cursor = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (typeof cursor[key] !== 'object' || cursor[key] === null) cursor[key] = {};
      cursor = cursor[key];
    }
    cursor[keys[keys.length - 1]] = value;
  }

  function fillName(text, name) {
    return String(text == null ? '' : text).replace(/\{name\}/g, name || 'you');
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function debounce(fn, wait) {
    let timer = null;
    function wrapped() {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(null, args), wait);
    }
    wrapped.cancel = () => clearTimeout(timer);
    return wrapped;
  }

  function randomHex(bytes) {
    const size = bytes || 16;
    const arr = new Uint8Array(size);
    if (global.crypto && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < size; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function uid() {
    try {
      if (global.crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    } catch (err) {
      /* ignore */
    }
    return randomHex(8);
  }

  function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return n + ' B';
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = n;
    let unit = -1;
    do {
      value /= 1024;
      unit++;
    } while (value >= 1024 && unit < units.length - 1);
    return (value >= 10 ? Math.round(value) : value.toFixed(1)) + ' ' + units[unit];
  }

  function fileExtension(mime, name) {
    const map = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/avif': 'avif',
      'image/svg+xml': 'svg',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
      'video/ogg': 'ogv',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/aac': 'aac',
      'audio/flac': 'flac'
    };
    const key = String(mime || '').toLowerCase();
    if (map[key]) return map[key];
    const match = /\.([a-z0-9]{2,5})$/i.exec(name || '');
    return match ? match[1].toLowerCase() : 'bin';
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.slice(result.indexOf(',') + 1));
      };
      reader.onerror = () => reject(reader.error || new Error('Could not read file'));
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(base64, type) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: type || 'application/octet-stream' });
  }

  /* safe localStorage / sessionStorage wrappers */
  function lsGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }
  function lsSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }
  function lsRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      /* ignore */
    }
  }

  /* ---------------------------------------------------------
     IndexedDB
     --------------------------------------------------------- */
  let dbPromise = null;
  let idbBroken = false;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        idbBroken = true;
        reject(new Error('IndexedDB is not available'));
        return;
      }
      let request;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (err) {
        idbBroken = true;
        reject(err);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_CONFIG)) db.createObjectStore(STORE_CONFIG);
        if (!db.objectStoreNames.contains(STORE_MEDIA)) db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        idbBroken = true;
        reject(request.error || new Error('Could not open the media database'));
      };
    });
    return dbPromise;
  }

  async function dbRequest(storeName, mode, makeRequest) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      let request;
      let transaction;
      try {
        transaction = db.transaction(storeName, mode);
        request = makeRequest(transaction.objectStore(storeName));
      } catch (err) {
        reject(err);
        return;
      }
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Storage request failed'));
      transaction.onabort = () => reject(transaction.error || new Error('Storage request aborted'));
    });
  }

  async function checkStorage() {
    try {
      await openDB();
      return true;
    } catch (err) {
      return false;
    }
  }

  /* ---------------------------------------------------------
     Config
     --------------------------------------------------------- */
  async function getConfig() {
    try {
      const saved = await dbRequest(STORE_CONFIG, 'readonly', (store) => store.get(CONFIG_KEY));
      if (saved && typeof saved === 'object') return deepMerge(DEFAULT_CONFIG, saved);
    } catch (err) {
      /* fall through to localStorage / defaults */
    }
    const raw = lsGet(CONFIG_FALLBACK);
    if (raw) {
      try {
        return deepMerge(DEFAULT_CONFIG, JSON.parse(raw));
      } catch (err) {
        /* ignore corrupt fallback */
      }
    }
    return clone(DEFAULT_CONFIG);
  }

  async function saveConfig(config) {
    const next = deepMerge(DEFAULT_CONFIG, config);
    try {
      await dbRequest(STORE_CONFIG, 'readwrite', (store) => store.put(next, CONFIG_KEY));
      lsRemove(CONFIG_FALLBACK);
      return { persisted: true };
    } catch (err) {
      lsSet(CONFIG_FALLBACK, JSON.stringify(next));
      return { persisted: false, error: err };
    }
  }

  /* ---------------------------------------------------------
     Media records
     --------------------------------------------------------- */
  const urlCache = new Map();

  async function putMedia(record) {
    await dbRequest(STORE_MEDIA, 'readwrite', (store) => store.put(record));
  }

  async function getMedia(id) {
    if (!id) return null;
    try {
      return (await dbRequest(STORE_MEDIA, 'readonly', (store) => store.get(id))) || null;
    } catch (err) {
      return null;
    }
  }

  async function removeMedia(id) {
    if (!id) return;
    revokeMediaURL(id);
    try {
      await dbRequest(STORE_MEDIA, 'readwrite', (store) => store.delete(id));
    } catch (err) {
      /* ignore */
    }
  }

  async function clearAll() {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CONFIG, STORE_MEDIA], 'readwrite');
      transaction.objectStore(STORE_CONFIG).clear();
      transaction.objectStore(STORE_MEDIA).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Could not clear storage'));
      transaction.onabort = () => reject(transaction.error || new Error('Could not clear storage'));
    });
    revokeMediaURLs();
  }

  async function mediaURL(id) {
    if (!id) return '';
    if (urlCache.has(id)) return urlCache.get(id);
    const record = await getMedia(id);
    if (!record || !record.blob) return '';
    const url = URL.createObjectURL(record.blob);
    urlCache.set(id, url);
    return url;
  }

  async function mediaEntryURL(entry, hostedBase) {
    if (!entry) return '';
    if (entry.mediaId) {
      const local = await mediaURL(entry.mediaId);
      if (local) return local;
    }
    if (entry.storagePath && isSupabaseConfigured()) return supabaseMediaURL(entry.storagePath);
    if (entry.url) return entry.url;
    if (hostedBase && entry.file) return hostedBase + entry.file;
    return '';
  }

  function revokeMediaURL(id) {
    const url = urlCache.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      urlCache.delete(id);
    }
  }

  function revokeMediaURLs() {
    urlCache.forEach((url) => URL.revokeObjectURL(url));
    urlCache.clear();
  }

  /* ---------------------------------------------------------
     Storage info
     --------------------------------------------------------- */
  async function storageInfo() {
    let usage = 0;
    let quota = 0;
    let persisted = false;
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        usage = estimate.usage || 0;
        quota = estimate.quota || 0;
      }
    } catch (err) {
      /* ignore */
    }
    try {
      if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted();
    } catch (err) {
      /* ignore */
    }
    return { usage, quota, persisted };
  }

  async function requestPersistence() {
    try {
      if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
    } catch (err) {
      /* ignore */
    }
    return false;
  }

  /* ---------------------------------------------------------
     Admin password (local-only soft gate)
     --------------------------------------------------------- */
  async function hashPassword(salt, password) {
    const input = salt + '::' + password;
    try {
      if (global.crypto && crypto.subtle) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
        return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (err) {
      /* fall through to lightweight hash */
    }
    let h1 = 2166136261;
    let h2 = 5381;
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ code, 16777619) >>> 0;
      h2 = (Math.imul(h2, 33) + code) >>> 0;
    }
    return 'f' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  }

  function readLocalAuth() {
    try {
      return JSON.parse(lsGet(AUTH_KEY) || 'null');
    } catch (err) {
      return null;
    }
  }

  function hasLocalPassword() {
    return !!readLocalAuth();
  }

  function hasPassword() {
    return hasLocalPassword() || !!DEFAULT_ADMIN_AUTH;
  }

  async function setPassword(password) {
    const salt = randomHex(16);
    const hash = await hashPassword(salt, password);
    return lsSet(AUTH_KEY, JSON.stringify({ v: 1, salt, hash }));
  }

  async function verifyPassword(password) {
    const auth = readLocalAuth() || DEFAULT_ADMIN_AUTH;
    if (!auth || !auth.salt) return false;
    const hash = await hashPassword(auth.salt, password);
    const expected = String(auth.hash || '');
    if (hash.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  }

  function clearPassword() {
    lsRemove(AUTH_KEY);
  }

  function getHint() {
    return lsGet(HINT_KEY) || '';
  }

  function setHint(hint) {
    if (hint) lsSet(HINT_KEY, hint);
    else lsRemove(HINT_KEY);
  }

  function isAuthed() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return !!(data && data.t && Date.now() - data.t < SESSION_TTL);
    } catch (err) {
      return false;
    }
  }

  function setAuthed(on) {
    try {
      if (on) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ t: Date.now() }));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  /* ---------------------------------------------------------
     Visitor password (soft gate, shipped with a default)
     --------------------------------------------------------- */
  function visitorGateSetting(config) {
    return config && config.settings ? config.settings.visitorGate : undefined;
  }

  function hasCustomVisitorGate(config) {
    const gate = visitorGateSetting(config);
    return !!(gate && gate.salt && gate.hash);
  }

  function getVisitorGate(config) {
    if (visitorGateSetting(config) === false) return null;
    if (hasCustomVisitorGate(config)) return visitorGateSetting(config);
    return DEFAULT_VISITOR_GATE;
  }

  function isDefaultVisitorGate(config) {
    return visitorGateSetting(config) !== false && !hasCustomVisitorGate(config);
  }

  async function makeVisitorGate(password) {
    const salt = randomHex(16);
    const hash = await hashPassword(salt, password);
    return { v: 1, salt, hash };
  }

  async function verifyVisitorPassword(config, password) {
    const gate = getVisitorGate(config);
    if (!gate) return true;
    const hash = await hashPassword(gate.salt, password);
    const expected = String(gate.hash || '');
    if (hash.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  }

  function isVisitorUnlocked(config) {
    const gate = getVisitorGate(config);
    if (!gate) return true;
    try {
      const raw = sessionStorage.getItem(VISITOR_GATE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return !!(data && data.hash === gate.hash && data.t && Date.now() - data.t < VISITOR_GATE_TTL);
    } catch (err) {
      return false;
    }
  }

  function unlockVisitor(config) {
    const gate = getVisitorGate(config);
    if (!gate) return;
    try {
      sessionStorage.setItem(VISITOR_GATE_KEY, JSON.stringify({ hash: gate.hash, t: Date.now() }));
    } catch (err) {
      /* ignore */
    }
  }

  function lockVisitor() {
    try {
      sessionStorage.removeItem(VISITOR_GATE_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  /* ---------------------------------------------------------
     Supabase (optional cloud publishing)
     --------------------------------------------------------- */
  function isSupabaseConfigured() {
    if (!/^https?:\/\//i.test(SUPABASE_URL)) return false;
    if (!SUPABASE_ANON_KEY) return false;
    if (/PASTE|YOUR[_-]?ANON|REPLACE/i.test(SUPABASE_ANON_KEY)) return false;
    return true;
  }

  function supabaseHeaders(token, extra) {
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + (token || SUPABASE_ANON_KEY)
    };
    if (extra) {
      Object.keys(extra).forEach((key) => {
        headers[key] = extra[key];
      });
    }
    return headers;
  }

  async function supabaseRequest(path, options) {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    let response;
    try {
      response = await fetch(SUPABASE_URL + path, options || {});
    } catch (err) {
      if (err && err.name === 'AbortError') throw new Error('Supabase did not respond in time');
      throw err;
    }
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (err) {
        payload = text;
      }
    }
    if (!response.ok) {
      const message = payload && typeof payload === 'object'
        ? payload.message || payload.error_description || payload.error || payload.msg
        : payload;
      const error = new Error(message || 'Supabase request failed (' + response.status + ')');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function supabaseMediaURL(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const clean = String(path).split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return SUPABASE_URL + '/storage/v1/object/public/' + encodeURIComponent(SUPABASE_BUCKET) + '/' + clean;
  }

  function readSupabaseSession() {
    try {
      const raw = lsGet(SUPABASE_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function supabaseSession() {
    const session = readSupabaseSession();
    if (!session || !session.access_token) return null;
    return session;
  }

  function writeSupabaseSession(session) {
    if (!session) {
      lsRemove(SUPABASE_SESSION_KEY);
      return;
    }
    lsSet(SUPABASE_SESSION_KEY, JSON.stringify(session));
  }

  async function supabaseSignIn(email, password) {
    const data = await supabaseRequest('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: supabaseHeaders(null, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email: email, password: password })
    });
    if (!data || !data.access_token) throw new Error('Supabase did not return a session');
    const session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || '',
      expires_at: Date.now() + (Number(data.expires_in) || 3600) * 1000 - 60000,
      email: data.user && data.user.email ? data.user.email : email
    };
    writeSupabaseSession(session);
    return session;
  }

  async function supabaseRefreshSession() {
    const current = readSupabaseSession();
    if (!current || !current.refresh_token) return null;
    try {
      const data = await supabaseRequest('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: supabaseHeaders(null, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ refresh_token: current.refresh_token })
      });
      if (!data || !data.access_token) throw new Error('No session returned');
      const session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || current.refresh_token,
        expires_at: Date.now() + (Number(data.expires_in) || 3600) * 1000 - 60000,
        email: (data.user && data.user.email) || current.email || ''
      };
      writeSupabaseSession(session);
      return session;
    } catch (err) {
      writeSupabaseSession(null);
      return null;
    }
  }

  async function supabaseAccessToken() {
    let session = readSupabaseSession();
    if (!session || !session.access_token) return null;
    if (!session.expires_at || Date.now() < session.expires_at) return session.access_token;
    session = await supabaseRefreshSession();
    return session ? session.access_token : null;
  }

  async function supabaseSignOut() {
    const session = readSupabaseSession();
    writeSupabaseSession(null);
    if (!session || !session.access_token) return;
    try {
      await supabaseRequest('/auth/v1/logout', {
        method: 'POST',
        headers: supabaseHeaders(session.access_token)
      });
    } catch (err) {
      /* local sign-out is enough */
    }
  }

  async function supabasePullConfig() {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 6000) : null;
    try {
      const rows = await supabaseRequest(
        '/rest/v1/bd_sites?id=eq.' + encodeURIComponent(SUPABASE_SITE_ID) + '&select=config,updated_at',
        { headers: supabaseHeaders(null), signal: controller ? controller.signal : undefined }
      );
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row || !row.config || !row.config.general) {
        throw new Error('No published site was found in Supabase');
      }
      return {
        config: deepMerge(DEFAULT_CONFIG, row.config),
        mediaBase: '',
        source: 'supabase',
        updatedAt: row.updated_at || null
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function loadSupabaseConfig() {
    if (location.protocol === 'file:') return null;
    try {
      return await supabasePullConfig();
    } catch (err) {
      return null;
    }
  }

  async function supabaseUpload(path, blob, contentType, token) {
    return supabaseRequest(
      '/storage/v1/object/' + encodeURIComponent(SUPABASE_BUCKET) + '/' +
        String(path).split('/').filter(Boolean).map(encodeURIComponent).join('/'),
      {
        method: 'POST',
        headers: supabaseHeaders(token, {
          'Content-Type': contentType || blob.type || 'application/octet-stream',
          'cache-control': '3600',
          'x-upsert': 'true'
        }),
        body: blob
      }
    );
  }

  async function supabasePublish(config, onProgress) {
    if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
    const token = await supabaseAccessToken();
    if (!token) throw new Error('Sign in to Supabase before publishing');

    const out = clone(config);
    const stats = { total: 0, uploaded: 0, skipped: 0 };
    const groups = [
      { key: 'photos', prefix: 'photo' },
      { key: 'videos', prefix: 'video' },
      { key: 'songs', prefix: 'song' }
    ];

    for (const group of groups) {
      const entries = (out.media && out.media[group.key]) || [];
      for (const entry of entries) {
        stats.total++;
        const record = entry.mediaId ? await getMedia(entry.mediaId) : null;
        if (record && record.blob) {
          const extension = fileExtension(record.type, record.name);
          const base = String(entry.id || record.id || uid()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || uid();
          const path = group.prefix + '/' + base + '.' + extension;
          if (onProgress) onProgress('Uploading ' + (record.name || path) + '…', stats);
          await supabaseUpload(path, record.blob, record.type, token);
          entry.storagePath = path;
          entry.url = supabaseMediaURL(path);
          stats.uploaded++;
        } else {
          stats.skipped++;
        }
      }
    }

    if (onProgress) onProgress('Saving the site configuration…', stats);
    await supabaseRequest('/rest/v1/bd_sites?on_conflict=id', {
      method: 'POST',
      headers: supabaseHeaders(token, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify([{
        id: SUPABASE_SITE_ID,
        config: out,
        updated_at: new Date().toISOString()
      }])
    });

    return { config: out, total: stats.total, uploaded: stats.uploaded, skipped: stats.skipped };
  }

  /* ---------------------------------------------------------
     Published (hosted) mode
     --------------------------------------------------------- */
  async function loadPublishedConfig() {
    if (location.protocol === 'file:') return null;

    const remote = await loadSupabaseConfig();
    if (remote) return remote;

    try {
      const response = await fetch('data/site.json', { cache: 'no-store' });
      if (!response.ok) return null;
      const published = await response.json();
      if (!published || !published.general) return null;
      return {
        config: deepMerge(DEFAULT_CONFIG, published),
        mediaBase: 'data/media/'
      };
    } catch (err) {
      return null;
    }
  }

  /* ---------------------------------------------------------
     Expose
     --------------------------------------------------------- */
  global.BD = {
    DEFAULT_CONFIG,
    SCENES,
    FONTS,
    THEME_PRESETS,
    clone,
    deepMerge,
    getPath,
    setPath,
    fillName,
    escapeHTML,
    debounce,
    uid,
    randomHex,
    formatBytes,
    fileExtension,
    downloadBlob,
    blobToBase64,
    base64ToBlob,
    getConfig,
    saveConfig,
    checkStorage,
    putMedia,
    getMedia,
    removeMedia,
    clearAll,
    mediaURL,
    mediaEntryURL,
    revokeMediaURL,
    revokeMediaURLs,
    storageInfo,
    requestPersistence,
    hasPassword,
    hasLocalPassword,
    setPassword,
    verifyPassword,
    clearPassword,
    getHint,
    setHint,
    isAuthed,
    setAuthed,
    DEFAULT_VISITOR_GATE,
    DEFAULT_VISITOR_PASSWORD,
    getVisitorGate,
    isDefaultVisitorGate,
    makeVisitorGate,
    verifyVisitorPassword,
    isVisitorUnlocked,
    unlockVisitor,
    lockVisitor,
    loadPublishedConfig,
    isSupabaseConfigured,
    supabaseSession,
    supabaseSignIn,
    supabaseSignOut,
    supabasePullConfig,
    supabasePublish,
    supabaseMediaURL,
    isFileProtocol: location.protocol === 'file:'
  };
})(window);
