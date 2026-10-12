/* =========================================================
   Rishit's Stereo — script.js
   Views, playback, likes, recently played, sleep timer.
   Song list lives in tracks.js
   ========================================================= */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad2 = n => String(n).padStart(2, '0');
  const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-');

  const store = {
    get(k, d) { try { const v = localStorage.getItem('rs.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('rs.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? h + ':' + pad2(m) + ':' + pad2(s) : m + ':' + pad2(s);
  }

  /* ---------- data ---------- */
  const cfg = Object.assign({ coverBase: '', coverExt: '.jpg' }, window.PLAYER_CONFIG);
  const TRACKS = (window.TRACKS || []).map(t => {
    const id = slug(t.title);
    return Object.assign({}, t, {
      id,
      src: t.src || '',
      cover: t.cover || (cfg.coverBase ? cfg.coverBase + slug(t.title) + cfg.coverExt : '')
    });
  });
  const byId = new Map(TRACKS.map(t => [t.id, t]));

  const MAIN_CATS = ['Phonk', 'Hindi', 'Gujarati', 'Instrumental', 'Devotional'];
  const VIEWS = {
    all:          { title: 'All Tracks' },
    phonk:        { title: 'Phonk',            test: t => t.category === 'Phonk' },
    english:      { title: 'English & Other',  test: t => MAIN_CATS.indexOf(t.category) === -1 },
    hindi:        { title: 'Hindi/Gujarati',   test: t => t.category === 'Hindi' || t.category === 'Gujarati' },
    instrumental: { title: 'Instrumental',     test: t => t.category === 'Instrumental' },
    devotional:   { title: 'Devotional',       test: t => t.category === 'Devotional' },
    recent:       { title: 'Recently Played' },
    liked:        { title: 'Liked Songs' }
  };

  /* ---------- state ---------- */
  let liked = store.get('liked', []).filter(id => byId.has(id));
  let recent = store.get('recent', []).filter(id => byId.has(id));
  let likedSet = new Set(liked);

  const state = {
    view: 'all', prevView: 'all', query: '',
    currentId: null, queue: [], playing: false, userPlay: false
  };
  let rows = new Map();
  let visibleIds = [];
  let dragging = false;
  let lastSec = -1;

  /* ---------- elements ---------- */
  const app = $('#app'), scrollEl = $('#scroll');
  const listView = $('#listView'), nowView = $('#nowView');
  const listEl = $('#trackList'), searchEl = $('#searchInput');
  const audio = $('#audio');
  const toastEl = $('#toast');
  const progs = $$('.js-progress');
  const vols = $$('.js-volume');

  const cur = () => byId.get(state.currentId);

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  /* ---------- covers ---------- */
  function coverInner(t) {
    return t.cover ? '<img src="' + esc(t.cover) + '" alt="" decoding="async">' : '';
  }
  function setCover(el, t) {
    el.dataset.letter = (t.title.trim()[0] || '♪').toUpperCase();
    el.innerHTML = coverInner(t);
  }
  // a cover picture that fails to load simply falls back to the letter tile
  document.addEventListener('error', e => {
    const el = e.target;
    if (el && el.tagName === 'IMG' && el.parentElement && el.parentElement.classList.contains('cover')) el.remove();
  }, true);

  /* =========================================================
     VIEWS
     ========================================================= */
  function listForView() {
    if (state.query) {
      const q = state.query.toLowerCase();
      return {
        title: 'Search Results', eyebrow: 'Search',
        list: TRACKS.filter(t => t.title.toLowerCase().indexOf(q) > -1 || t.category.toLowerCase().indexOf(q) > -1)
      };
    }
    const v = VIEWS[state.view] || VIEWS.all;
    let list;
    if (state.view === 'recent') list = recent.map(id => byId.get(id));
    else if (state.view === 'liked') list = liked.map(id => byId.get(id));
    else list = TRACKS.filter(v.test || (() => true));
    return { title: v.title, eyebrow: 'Collection', list };
  }

  function rowHTML(t, i) {
    const letter = esc((t.title.trim()[0] || '♪').toUpperCase());
    return (
      '<li class="track" data-id="' + esc(t.id) + '" role="button" tabindex="0" style="--i:' + Math.min(i, 14) + '" aria-label="Play ' + esc(t.title) + '">' +
        '<span class="t-num">' + pad2(i + 1) + '</span>' +
        '<span class="cover t-cover" data-letter="' + letter + '">' + coverInner(t) + '</span>' +
        '<span class="t-title">' + esc(t.title) + '</span>' +
        '<span class="t-cat">' + esc(t.category) + '</span>' +
        '<button class="t-like" aria-label="Like ' + esc(t.title) + '" aria-pressed="false"><svg class="ic"><use href="#i-heart"/></svg></button>' +
        '<button class="t-play" aria-label="Play"><svg class="ic solid"><use href="#i-play"/></svg></button>' +
      '</li>'
    );
  }

  function renderList(animate) {
    const { title, eyebrow, list } = listForView();
    const clean = list.filter(Boolean);
    $('#viewTitle').textContent = title;
    $('#viewEyebrow').textContent = eyebrow;

    listEl.innerHTML = clean.map(rowHTML).join('');
    visibleIds = clean.map(t => t.id);
    rows = new Map();
    $$('.track', listEl).forEach(li => rows.set(li.dataset.id, li));

    if (animate) {
      listEl.classList.remove('animate');
      void listEl.offsetWidth;
      listEl.classList.add('animate');
    }

    const empty = $('#emptyState');
    if (!clean.length) {
      let h = 'No songs here yet', p = 'Songs added to this category will show up here.';
      if (state.query) { h = 'No results for “' + state.query + '”'; p = 'Try a different name or category.'; }
      else if (state.view === 'liked') { h = 'No liked songs yet'; p = 'Tap the heart beside any song to save it here.'; }
      else if (state.view === 'recent') { h = 'Nothing played yet'; p = 'Songs you play will show up here.'; }
      $('#emptyTitle').textContent = h;
      $('#emptyText').textContent = p;
      empty.hidden = false;
    } else {
      empty.hidden = true;
    }
    syncRows();
  }

  function render(animate) {
    const mode = (state.view === 'now' && !state.query) ? 'now' : 'list';
    app.dataset.mode = mode;
    listView.hidden = mode !== 'list';
    nowView.hidden = mode !== 'now';
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
    if (mode === 'list') renderList(animate);
    scrollEl.scrollTop = 0;
  }

  function go(view) {
    if (state.query) { state.query = ''; searchEl.value = ''; }
    if (view === 'now' && state.view !== 'now') state.prevView = state.view;
    state.view = view;
    render(true);
  }

  /* ---------- keep rows / buttons in sync ---------- */
  function syncRows() {
    rows.forEach((li, id) => {
      const isCur = id === state.currentId;
      li.classList.toggle('is-current', isCur);
      li.classList.toggle('is-playing', isCur && state.playing);
      const use = $('.t-play use', li);
      if (use) use.setAttribute('href', isCur && state.playing ? '#i-pause' : '#i-play');
      const playBtn = $('.t-play', li);
      if (playBtn) playBtn.setAttribute('aria-label', isCur && state.playing ? 'Pause' : 'Play');
      const isLiked = likedSet.has(id);
      li.classList.toggle('is-liked', isLiked);
      const lb = $('.t-like', li);
      if (lb) lb.setAttribute('aria-pressed', String(isLiked));
    });
  }

  function syncLike() {
    const isLiked = likedSet.has(state.currentId);
    $$('[data-act="like"]').forEach(b => b.setAttribute('aria-pressed', String(isLiked)));
  }

  function paintTrack() {
    const t = cur();
    if (!t) return;
    $$('.js-title').forEach(el => { el.textContent = t.title; });
    $$('.js-cat').forEach(el => { el.textContent = t.category; });
    $$('.js-cover').forEach(el => setCover(el, t));
    $$('.js-cur').forEach(el => { el.textContent = '0:00'; });
    $$('.js-dur').forEach(el => { el.textContent = '0:00'; });
    setProgressUI(0);
    lastSec = -1;
    syncLike();
    paintState();
    setMedia(t);
  }

  function paintState() {
    const t = cur();
    $$('[data-act="toggle"] use').forEach(u => u.setAttribute('href', state.playing ? '#i-pause' : '#i-play'));
    $$('[data-act="toggle"]').forEach(b => b.setAttribute('aria-label', state.playing ? 'Pause' : 'Play'));
    document.title = (state.playing && t ? '▶ ' + t.title + ' · ' : '') + "Rishit's Stereo";
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused';
    syncRows();
  }

  function setLoading(on) {
    $$('.play-big').forEach(b => b.classList.toggle('loading', on));
  }

  /* =========================================================
     PLAYBACK
     ========================================================= */
  function select(t) {
    state.currentId = t.id;
    store.set('last', t.id);
    if (t.src) {
      if (audio.getAttribute('src') !== t.src) audio.src = t.src;
    } else {
      audio.removeAttribute('src');
      audio.load();
    }
    paintTrack();
  }

  function onPlayFail(err) {
    if (err && err.name === 'AbortError') return; // a newer load interrupted this one
    state.playing = false;
    setLoading(false);
    paintState();
    const t = cur();
    toast('Couldn’t play “' + (t ? t.title : 'this song') + '”');
  }

  function startPlay() {
    state.userPlay = true;
    const p = audio.play();
    if (p && p.catch) p.catch(onPlayFail);
  }

  function playTrack(id, queueIds) {
    const t = byId.get(id);
    if (!t) return;
    if (!t.src) { toast('“' + t.title + '” doesn’t have an audio link yet'); return; }
    if (queueIds) state.queue = queueIds.slice();
    else if (state.queue.indexOf(id) === -1) state.queue = TRACKS.map(x => x.id);
    if (state.currentId === id) audio.currentTime = 0;
    else select(t);
    startPlay();
  }

  function toggle() {
    const t = cur();
    if (!t) return;
    if (!t.src) { toast('“' + t.title + '” doesn’t have an audio link yet'); return; }
    if (audio.paused) startPlay(); else audio.pause();
  }

  function step(dir) {
    const q = state.queue.length ? state.queue : TRACKS.map(t => t.id);
    let i = q.indexOf(state.currentId);
    for (let n = 0; n < q.length; n++) {
      i = (i + dir + q.length) % q.length;
      const t = byId.get(q[i]);
      if (t && t.src) { playTrack(t.id); return; }
    }
  }
  function next() { step(1); }
  function prev() {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    step(-1);
  }
  function seekBy(sec) {
    if (!isFinite(audio.duration)) return;
    audio.currentTime = clamp(audio.currentTime + sec, 0, audio.duration);
  }

  function activateRow(li) {
    const id = li.dataset.id;
    if (id === state.currentId) toggle();
    else playTrack(id, visibleIds);
  }

  /* ---------- progress ---------- */
  function setProgressUI(val) {
    progs.forEach(p => { p.value = val; p.style.setProperty('--p', (val / 10) + '%'); });
  }
  function updateProgress() {
    const d = audio.duration, c = audio.currentTime;
    const has = isFinite(d) && d > 0;
    if (!dragging) setProgressUI(has ? (c / d) * 1000 : 0);
    const sec = Math.floor(c);
    if (sec !== lastSec && !dragging) {
      lastSec = sec;
      $$('.js-cur').forEach(el => { el.textContent = fmt(c); });
    }
  }
  function updateDuration() {
    const d = audio.duration;
    $$('.js-dur').forEach(el => { el.textContent = isFinite(d) ? fmt(d) : '0:00'; });
  }

  let raf = 0;
  function loop() { updateProgress(); raf = requestAnimationFrame(loop); }
  function startLoop() { cancelAnimationFrame(raf); loop(); }
  function stopLoop() { cancelAnimationFrame(raf); updateProgress(); }

  progs.forEach(p => {
    p.addEventListener('pointerdown', () => { dragging = true; });
    p.addEventListener('input', () => {
      const v = +p.value;
      setProgressUI(v);
      const d = audio.duration;
      if (isFinite(d)) {
        const t = (v / 1000) * d;
        $$('.js-cur').forEach(el => { el.textContent = fmt(t); });
        if (!dragging) audio.currentTime = t; // keyboard
      }
    });
    p.addEventListener('change', () => {
      const d = audio.duration;
      if (isFinite(d)) audio.currentTime = (+p.value / 1000) * d;
      dragging = false;
    });
  });
  window.addEventListener('pointerup', () => setTimeout(() => { dragging = false; }, 80));
  window.addEventListener('pointercancel', () => { dragging = false; });

  /* ---------- volume ---------- */
  let vol = clamp(+store.get('vol', 80), 0, 100);
  let lastVol = vol || 80;
  function setVolume(v, save) {
    vol = clamp(Math.round(v), 0, 100);
    audio.volume = vol / 100;
    vols.forEach(r => { r.value = vol; r.style.setProperty('--p', vol + '%'); });
    $$('[data-act="mute"] use').forEach(u => u.setAttribute('href', vol === 0 ? '#i-volume-x' : '#i-volume'));
    if (save !== false) store.set('vol', vol);
  }
  vols.forEach(r => r.addEventListener('input', () => { setVolume(+r.value); if (vol > 0) lastVol = vol; }));

  /* ---------- audio events ---------- */
  audio.addEventListener('play', () => { state.playing = true; paintState(); startLoop(); });
  audio.addEventListener('pause', () => { state.playing = false; setLoading(false); paintState(); stopLoop(); });
  audio.addEventListener('playing', () => {
    setLoading(false);
    const id = state.currentId;
    if (id && recent[0] !== id) {
      recent = [id].concat(recent.filter(x => x !== id)).slice(0, 30);
      store.set('recent', recent);
      if (state.view === 'recent' && !state.query && app.dataset.mode === 'list') { /* keep list stable while viewing */ }
    }
  });
  audio.addEventListener('waiting', () => { if (state.userPlay) setLoading(true); });
  audio.addEventListener('canplay', () => setLoading(false));
  audio.addEventListener('loadedmetadata', updateDuration);
  audio.addEventListener('durationchange', updateDuration);
  audio.addEventListener('timeupdate', () => { updateProgress(); checkSleep(); });
  audio.addEventListener('seeked', updateProgress);
  audio.addEventListener('ended', () => { if (!audio.loop) next(); });
  audio.addEventListener('error', () => {
    setLoading(false);
    if (!state.userPlay) return; // ignore failures of the silent first load
    state.playing = false;
    paintState();
    const t = cur();
    toast('Couldn’t load “' + (t ? t.title : 'this song') + '”. Check its link in tracks.js');
  });

  /* ---------- preload the next song so it starts instantly ---------- */
  const preloader = new Audio();
  preloader.preload = 'auto';
  let preloadedId = null;
  function preloadNext() {
    const conn = navigator.connection;
    if (conn && conn.saveData) return;
    const q = state.queue.length ? state.queue : TRACKS.map(t => t.id);
    let i = q.indexOf(state.currentId);
    for (let n = 0; n < q.length; n++) {
      i = (i + 1) % q.length;
      const t = byId.get(q[i]);
      if (t && t.src) {
        if (preloadedId !== t.id) { preloadedId = t.id; preloader.src = t.src; }
        return;
      }
    }
  }
  audio.addEventListener('canplaythrough', preloadNext);

  /* ---------- lock-screen / media keys ---------- */
  function setMedia(t) {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title, artist: t.category, album: "Rishit's Stereo",
        artwork: t.cover ? [{ src: new URL(t.cover, location.href).href }] : []
      });
    } catch (e) { /* ignore */ }
  }
  if ('mediaSession' in navigator) {
    const set = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, fn); } catch (e) { /* unsupported */ } };
    set('play', () => { if (audio.paused) toggle(); });
    set('pause', () => audio.pause());
    set('previoustrack', prev);
    set('nexttrack', next);
    set('seekbackward', () => seekBy(-10));
    set('seekforward', () => seekBy(10));
    set('seekto', d => { if (d && isFinite(d.seekTime)) audio.currentTime = d.seekTime; });
  }

  /* =========================================================
     LIKES
     ========================================================= */
  function toggleLike(id, btn) {
    const was = likedSet.has(id);
    if (was) { likedSet.delete(id); liked = liked.filter(x => x !== id); }
    else { likedSet.add(id); liked.unshift(id); }
    store.set('liked', liked);
    syncLike();
    syncRows();
    const heart = btn || (rows.get(id) && $('.t-like', rows.get(id)));
    if (heart && !was) { heart.classList.remove('pop'); void heart.offsetWidth; heart.classList.add('pop'); setTimeout(() => heart.classList.remove('pop'), 500); }
    if (was && state.view === 'liked' && !state.query && rows.get(id)) {
      const li = rows.get(id);
      li.classList.add('removing');
      setTimeout(() => { if (state.view === 'liked' && !state.query && app.dataset.mode === 'list') renderList(false); }, 260);
    }
  }

  /* =========================================================
     SLEEP TIMER
     ========================================================= */
  const modal = $('#sleepModal');
  let sleepEnd = null, sleepTick = null, sleepPreset = null, lastFocus = null;

  function human(mins) {
    if (mins < 60) return mins + ' min';
    const h = Math.floor(mins / 60), m = mins % 60;
    return h + ' hr' + (m ? ' ' + m + ' min' : '');
  }
  function remainText(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 3600) + ':' + pad2(Math.floor((s % 3600) / 60)) + ':' + pad2(s % 60);
  }

  function updateSleepUI() {
    const on = sleepEnd !== null;
    $('#sleepStatus').hidden = !on;
    $$('.sleep-opt').forEach(b => b.classList.toggle('selected', on && sleepPreset === +b.dataset.min));
    $$('[data-act="sleep"]').forEach(b => {
      b.classList.toggle('has-timer', on);
      b.setAttribute('title', on ? 'Sleep timer: ' + remainText(sleepEnd - Date.now()) + ' left' : 'Sleep timer');
    });
    if (on) $('#sleepRemain').textContent = remainText(sleepEnd - Date.now());
  }

  function checkSleep() {
    if (sleepEnd === null) return;
    if (Date.now() >= sleepEnd) finishSleep();
  }

  function startSleep(mins, preset) {
    clearInterval(sleepTick);
    sleepEnd = Date.now() + mins * 60000;
    sleepPreset = preset || null;
    sleepTick = setInterval(() => { checkSleep(); updateSleepUI(); }, 1000);
    updateSleepUI();
    toast('Sleep timer set · music stops in ' + human(mins));
    closeSleep();
  }

  function cancelSleep(silent) {
    clearInterval(sleepTick);
    sleepEnd = null; sleepPreset = null;
    updateSleepUI();
    if (!silent) toast('Sleep timer cancelled');
  }

  function finishSleep() {
    cancelSleep(true);
    if (!audio.paused) {
      const start = audio.volume, t0 = Date.now(), dur = 4000;
      const fade = setInterval(() => {
        const k = Math.min(1, (Date.now() - t0) / dur);
        audio.volume = start * (1 - k);
        if (k >= 1) { clearInterval(fade); audio.pause(); audio.volume = vol / 100; }
      }, 150);
    }
    toast('Sleep timer ended · good night');
  }

  function openSleep() {
    lastFocus = document.activeElement;
    $('#sleepError').textContent = '';
    updateSleepUI();
    modal.hidden = false;
    void modal.offsetWidth;
    modal.classList.add('open');
    const first = $('.sleep-opt', modal);
    if (first) first.focus({ preventScroll: true });
  }
  function closeSleep() {
    modal.classList.remove('open');
    setTimeout(() => { if (!modal.classList.contains('open')) modal.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  $$('.sleep-opt').forEach(b => b.addEventListener('click', () => startSleep(+b.dataset.min, +b.dataset.min)));
  $('#sleepCancel').addEventListener('click', () => cancelSleep());
  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSleep(); });

  function submitCustom() {
    const hRaw = $('#cHours').value.trim(), mRaw = $('#cMins').value.trim();
    const h = hRaw === '' ? 0 : Number(hRaw), m = mRaw === '' ? 0 : Number(mRaw);
    const err = $('#sleepError');
    if (!isFinite(h) || !isFinite(m) || h < 0 || m < 0) { err.textContent = 'Please enter valid numbers.'; return; }
    const total = Math.round(h * 60 + m);
    if (total < 1) { err.textContent = 'Enter at least 1 minute.'; return; }
    if (total > 1440) { err.textContent = 'The maximum is 24 hours.'; return; }
    err.textContent = '';
    startSleep(total, null);
  }
  $('#sleepSet').addEventListener('click', submitCustom);
  [$('#cHours'), $('#cMins')].forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') submitCustom(); }));

  /* =========================================================
     SHARE
     ========================================================= */
  async function share() {
    const t = cur();
    const data = { title: (t ? t.title + ' · ' : '') + "Rishit's Stereo", text: t ? 'Listen to ' + t.title : '', url: location.href.split('#')[0] };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(data.url); toast('Link copied'); }
    catch (e) { toast('Copy the page address to share'); }
  }

  /* =========================================================
     EVENTS
     ========================================================= */
  // track list
  listEl.addEventListener('click', e => {
    const li = e.target.closest('.track');
    if (!li) return;
    const lb = e.target.closest('.t-like');
    if (lb) { toggleLike(li.dataset.id, lb); return; }
    activateRow(li);
  });
  listEl.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('track')) {
      e.preventDefault();
      activateRow(e.target);
    }
  });

  // sidebar
  $('#nav').addEventListener('click', e => {
    const b = e.target.closest('.nav-item');
    if (b) go(b.dataset.view);
  });

  // buttons with data-act
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    switch (b.dataset.act) {
      case 'toggle': toggle(); break;
      case 'prev': prev(); break;
      case 'next': next(); break;
      case 'rew': seekBy(-10); break;
      case 'ff': seekBy(10); break;
      case 'mute':
        if (vol > 0) { lastVol = vol; setVolume(0); } else setVolume(lastVol || 80);
        break;
      case 'repeat': {
        audio.loop = !audio.loop;
        $$('[data-act="repeat"]').forEach(r => { r.classList.toggle('on', audio.loop); r.setAttribute('aria-pressed', String(audio.loop)); });
        toast(audio.loop ? 'Repeating this song' : 'Repeat off');
        break;
      }
      case 'sleep': openSleep(); break;
      case 'expand': go('now'); break;
      case 'back': go(state.prevView && state.prevView !== 'now' ? state.prevView : 'all'); break;
      case 'like': if (state.currentId) toggleLike(state.currentId); break;
      case 'share': share(); break;
    }
  });

  // search
  let searchTimer;
  searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = searchEl.value.trim();
      render(false);
    }, 120);
  });

  // keyboard
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();

    if (!modal.hidden) {
      if (e.key === 'Escape') { closeSleep(); return; }
      if (e.key === 'Tab') { // keep focus inside the dialog
        const f = $$('button, input', modal).filter(x => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      return;
    }

    if (e.key === 'Escape' && e.target === searchEl) {
      searchEl.value = ''; state.query = ''; render(false); searchEl.blur(); return;
    }
    if (tag === 'input' || tag === 'textarea') return;

    if (e.key === '/') { e.preventDefault(); searchEl.focus(); return; }
    if (e.code === 'Space') {
      if (tag === 'button' || (e.target.classList && e.target.classList.contains('track'))) return;
      e.preventDefault(); toggle(); return;
    }
    if (e.key === 'ArrowRight') seekBy(10);
    else if (e.key === 'ArrowLeft') seekBy(-10);
  });

  /* =========================================================
     INIT
     ========================================================= */
  setVolume(vol, false);
  const lastId = store.get('last', null);
  const startTrack = (lastId && byId.get(lastId)) || TRACKS.find(t => t.src) || TRACKS[0];
  if (startTrack) select(startTrack);
  state.queue = TRACKS.map(t => t.id);
  render(true);
})();
