/* =========================================================
   Rishit's Stereo — library.js
   Reads the files in your GitHub releases and turns them into songs,
   so new uploads appear in the player without editing any code.

   How files are understood (names are matched ignoring capitals,
   spaces, dots and punctuation):

   Song        Hindi - KGF Monster.mp3        (category prefix is optional)
   Cover       KGF Monster.jpg  (or .png / .webp) – same name as the song

   Category prefix: Phonk, English, Spanish, Hindi, Gujarati,
   Instrumental, Devotional or Other, followed by " - " (or "__").
   Without a prefix, a new song goes to "Other" (shown in
   "English & Other"), unless the release itself is titled with a
   category name (e.g. a release called "Hindi").

   GitHub turns spaces in file names into dots – that is handled.
   ========================================================= */
(function (root) {
  'use strict';

  var CATS = ['Phonk', 'English', 'Spanish', 'Hindi', 'Gujarati', 'Instrumental', 'Devotional', 'Other'];
  var AUDIO = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba)$/i;
  var IMAGE = /\.(jpe?g|png|webp|gif|avif)$/i;
  var EXT = /\.[A-Za-z0-9]{2,5}$/;
  var COVER_WORDS = /(cover|artwork|art|image|img|thumbnail|thumb|poster)$/;
  var CACHE_KEY = 'rs.releases.v1';
  var PREFIX = new RegExp('^(' + CATS.join('|') + ')\\s*(?:-+|_{1,2}|:|\\|)\\s*(.+)$', 'i');

  function normKey(s) {
    return String(s).toLowerCase().normalize('NFKD')
      .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
  }
  function canonCat(s) {
    var low = String(s).toLowerCase();
    for (var i = 0; i < CATS.length; i++) if (CATS[i].toLowerCase() === low) return CATS[i];
    return null;
  }
  function titleCase(s) {
    return s.toLowerCase().replace(/(^|[\s(\[+\-])([a-zà-ɏ])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }

  // "Hindi.-.KGF.Monster.mp3" -> { category: 'Hindi', title: 'KGF Monster' }
  function parseName(file) {
    var text = String(file).replace(EXT, '').replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
    var category = null;
    var m = text.match(PREFIX);
    if (m) { category = canonCat(m[1]); text = m[2]; }
    text = text.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
    return { category: category, title: text };
  }
  function keyOf(file) { return normKey(parseName(file).title); }

  function displayTitle(raw, cfg) {
    var fixes = (cfg && cfg.titles) || {}, k = normKey(raw);
    for (var f in fixes) {
      if (Object.prototype.hasOwnProperty.call(fixes, f) && normKey(f) === k) return fixes[f];
    }
    return /[a-z]/.test(raw) ? raw : titleCase(raw);   // ALL CAPS -> Title Case
  }

  /* Combine the built-in list (tracks.js) with what the releases contain.
     - known songs get their audio link and cover from the release
     - audio files that are not in the built-in list are added as new songs */
  function merge(base, assets, cfg) {
    base = base || [];
    assets = (assets || []).slice().sort(function (a, b) {
      return String(a.at).localeCompare(String(b.at)) || String(a.name).localeCompare(String(b.name));
    });

    var audio = Object.create(null), order = [], images = [];
    assets.forEach(function (a) {
      if (AUDIO.test(a.name)) {
        var k = keyOf(a.name);
        if (!audio[k]) order.push(k);
        audio[k] = a;
      } else if (IMAGE.test(a.name)) {
        images.push(a);
      }
    });

    // covers whose file names don't match a song (from PLAYER_CONFIG.coverMap)
    var map = Object.create(null), cm = (cfg && cfg.coverMap) || {};
    Object.keys(cm).forEach(function (f) { map[normKey(f.replace(EXT, ''))] = normKey(cm[f]); });

    var covers = Object.create(null);
    images.forEach(function (a) {
      var key = map[normKey(a.name.replace(EXT, ''))];
      if (!key) {
        key = keyOf(a.name);
        if (!audio[key]) {
          var short = key.replace(COVER_WORDS, '');
          if (short && audio[short]) key = short;
        }
      }
      covers[key] = a.url;
    });

    var used = Object.create(null);
    var out = base.map(function (t) {
      var keys = [normKey(t.title)];
      if (t.file) keys.unshift(normKey(t.file));
      keys.forEach(function (k) { used[k] = true; });
      var n = {};
      for (var p in t) n[p] = t[p];
      var ak = keys.filter(function (k) { return audio[k]; })[0];
      var ck = keys.filter(function (k) { return covers[k]; })[0];
      if (ak) n.src = audio[ak].url;
      if (ck) n.cover = covers[ck];
      return n;
    });

    order.forEach(function (k) {
      if (used[k]) return;
      var a = audio[k], p = parseName(a.name);
      out.push({
        title: displayTitle(p.title, cfg),
        category: p.category || canonCat(a.rel) || 'Other',
        src: a.url,
        cover: covers[k] || ''
      });
    });
    return out;
  }

  /* ---------- reading the releases ---------- */
  function readCache() {
    try {
      var c = JSON.parse(root.localStorage.getItem(CACHE_KEY));
      return c && Array.isArray(c.assets) ? c.assets : [];
    } catch (e) { return []; }
  }
  function writeCache(assets, t) {
    try { root.localStorage.setItem(CACHE_KEY, JSON.stringify({ t: t, assets: assets })); } catch (e) { /* storage blocked */ }
  }

  function fetchAssets(g) {
    var wanted = g.releases || [];
    var all = [];
    function page(n) {
      var url = 'https://api.github.com/repos/' + encodeURIComponent(g.owner) + '/' + encodeURIComponent(g.repo) +
        '/releases?per_page=100&page=' + n;
      return root.fetch(url, { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) {
        if (!r.ok) throw new Error('GitHub answered ' + r.status);
        return r.json();
      }).then(function (list) {
        list.forEach(function (rel) {
          if (rel.draft) return;
          if (wanted.length && wanted.indexOf(rel.tag_name) === -1 && wanted.indexOf(rel.name) === -1) return;
          (rel.assets || []).forEach(function (a) {
            all.push({ name: a.name, url: a.browser_download_url, rel: rel.name || rel.tag_name, at: a.created_at || rel.published_at || '' });
          });
        });
        return list.length === 100 && n < 5 ? page(n + 1) : all;
      });
    }
    return page(1);
  }

  /* Resolves with the new asset list when something changed, otherwise null.
     The answer is remembered for a few minutes (GitHub allows only 60 free
     requests per hour per visitor) and used instantly on the next visit. */
  function refresh(cfg) {
    var g = cfg && cfg.github;
    if (!g || !g.owner || !g.repo || typeof root.fetch !== 'function') return Promise.resolve(null);

    var cached = null;
    try { cached = JSON.parse(root.localStorage.getItem(CACHE_KEY)); } catch (e) { cached = null; }
    var ttl = (g.cacheMinutes == null ? 10 : +g.cacheMinutes) * 60000;
    if (cached && cached.t && Date.now() - cached.t < ttl) return Promise.resolve(null);

    var old = cached && Array.isArray(cached.assets) ? cached.assets : [];
    return fetchAssets(g).then(function (assets) {
      writeCache(assets, Date.now());
      return JSON.stringify(old) === JSON.stringify(assets) ? null : assets;
    }, function () {
      writeCache(old, Date.now() - ttl + 120000);   // try again in about 2 minutes
      return null;
    });
  }

  root.Library = { merge: merge, refresh: refresh, readCache: readCache, parseName: parseName, keyOf: keyOf, CATEGORIES: CATS };
})(typeof window !== 'undefined' ? window : globalThis);
