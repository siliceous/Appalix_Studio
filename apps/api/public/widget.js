(function () {
  'use strict';

  // Config — read from window.AppalixConfig or from this script's own URL query params
  // (the query-param path is used by the Shopify ScriptTag auto-injection: widget.js?id=...)
  var cfg = window.AppalixConfig || {};
  var integrationId = cfg.integrationId;
  var apiBase = cfg.apiBase || '';

  // Try reading from this script's src URL
  try {
    var s = document.currentScript && document.currentScript.src;
    if (s) {
      var u = new URL(s);
      if (!integrationId) integrationId = u.searchParams.get('id') || '';
      if (!apiBase) apiBase = u.origin;
    }
  } catch (_) {}

  if (!integrationId) return;
  if (!apiBase) apiBase = 'https://api.appalix.ai';

  // Skin catalogue
  var SKINS = {
    appalix: {
      '--apx-header-bg':    '#1c1c1c',
      '--apx-header-text':  '#ffffff',
      '--apx-bg':           '#1e1e1e',
      '--apx-border':       '#2d2d2d',
      '--apx-user-bubble':  '#1a8c76',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#252525',
      '--apx-bot-text':     '#d1d5db',
      '--apx-input-bg':     '#1c1c1c',
      '--apx-input-border': '#2d2d2d',
      '--apx-input-text':   '#f3f4f6',
      '--apx-accent':       '#61c2ad',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#1a8c76',
    },
    appalix_lite: {
      '--apx-header-bg':    '#61c2ad',
      '--apx-header-text':  '#ffffff',
      '--apx-bg':           '#f3f4f6',
      '--apx-border':       '#e5e7eb',
      '--apx-user-bubble':  '#1a8c76',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#ffffff',
      '--apx-bot-text':     '#111827',
      '--apx-input-bg':     '#ffffff',
      '--apx-input-border': '#d1d5db',
      '--apx-input-text':   '#111827',
      '--apx-accent':       '#61c2ad',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#1a8c76',
    },
    dark: {
      '--apx-header-bg':    '#1a1a1a',
      '--apx-header-text':  '#f3f4f6',
      '--apx-bg':           '#242424',
      '--apx-border':       '#3a3a3a',
      '--apx-user-bubble':  '#884c29',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#2e2e2e',
      '--apx-bot-text':     '#e5e7eb',
      '--apx-input-bg':     '#1a1a1a',
      '--apx-input-border': '#3a3a3a',
      '--apx-input-text':   '#f3f4f6',
      '--apx-accent':       '#884c29',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#884c29',
    },
    forest: {
      '--apx-header-bg': '#1c3426',
      '--apx-header-text': '#d1fae5',
      '--apx-bg': '#f0faf5',
      '--apx-border': '#a7f3d0',
      '--apx-user-bubble': '#2d6a4f',
      '--apx-user-text': '#ffffff',
      '--apx-bot-bubble': '#e8f5ee',
      '--apx-bot-text': '#1c3426',
      '--apx-input-bg': '#ffffff',
      '--apx-input-border': '#a7f3d0',
      '--apx-input-text': '#1c3426',
      '--apx-accent': '#2d6a4f',
      '--apx-accent-text': '#ffffff',
      '--apx-launcher-bg': '#1c3426',
    },
    ocean: {
      '--apx-header-bg': '#0a2d4a',
      '--apx-header-text': '#bae6fd',
      '--apx-bg': '#f0f7ff',
      '--apx-border': '#bae6fd',
      '--apx-user-bubble': '#0077b6',
      '--apx-user-text': '#ffffff',
      '--apx-bot-bubble': '#deeeff',
      '--apx-bot-text': '#0a2d4a',
      '--apx-input-bg': '#ffffff',
      '--apx-input-border': '#bae6fd',
      '--apx-input-text': '#0a2d4a',
      '--apx-accent': '#0077b6',
      '--apx-accent-text': '#ffffff',
      '--apx-launcher-bg': '#0a2d4a',
    },
    minimal: {
      '--apx-header-bg': '#e8e8e8',
      '--apx-header-text': '#111111',
      '--apx-bg': '#ffffff',
      '--apx-border': '#e5e5e5',
      '--apx-user-bubble': '#333333',
      '--apx-user-text': '#ffffff',
      '--apx-bot-bubble': '#f5f5f5',
      '--apx-bot-text': '#111111',
      '--apx-input-bg': '#fafafa',
      '--apx-input-border': '#e5e5e5',
      '--apx-input-text': '#111111',
      '--apx-accent': '#333333',
      '--apx-accent-text': '#ffffff',
      '--apx-launcher-bg': '#333333',
    },
  };

  // State
  var state = 'closed';
  var messages = [];
  var pendingTyping = false;
  var welcomeMessage = 'Hi there! How can I help you today?';
  var botName = 'Chat Support';
  var skinVars = SKINS.appalix;
  var botAvatarUrl = '';
  var sessionId = '';
  var userWidth  = 0;
  var userHeight = 0;

  // Voice state
  var enableVoice          = false;
  var voiceMode            = 'voice_text';  // 'voice_text' | 'voice_only'
  var voiceGreetingText    = '';            // unused — server-side now triggers the opening greeting
  var voiceWs              = null;
  var voiceActive          = false;
  var voiceState           = 'idle';       // 'idle' | 'listening' | 'thinking' | 'speaking'
  var voiceAudioCtx        = null;
  var voiceAudioStream     = null;
  var voiceProcessor       = null;
  var voiceNextPlayTime    = 0;
  var voiceActiveSources   = [];           // tracked AudioBufferSource nodes — stopped on interrupt
  var voiceIdleTimer       = null;         // setTimeout handle — disconnects after 60s of no activity
  var VOICE_IDLE_TIMEOUT   = 30000;        // 30 seconds
  // shadow is hoisted here so updateVoiceState (defined at IIFE level) can access it
  var shadow               = null;
  var voiceVoiceSR         = null;  // SpeechRecognition instance for user transcript in voice_text mode
  var voicePassiveSR       = null;  // passive wake-up listener active after idle disconnect

  // Stop every queued/playing audio buffer immediately (called on interruption or session end)
  function stopAllAudio() {
    voiceActiveSources.forEach(function (src) { try { src.stop(); } catch (_) {} });
    voiceActiveSources = [];
    voiceNextPlayTime  = 0;
  }

  // Update the voice state and reflect it in the header subtitle without a full re-render
  function updateVoiceState(newState) {
    voiceState = newState;
    var el = shadow && shadow.getElementById('apx-ht-sub');
    if (el) {
      el.textContent = newState === 'listening' ? 'Listening\u2026'
                     : newState === 'thinking'  ? 'Thinking\u2026'
                     : newState === 'speaking'  ? 'Speaking\u2026'
                     : 'Online \u00b7 Replies instantly';
    }
    // Pause SpeechRecognition while the bot is speaking/thinking to avoid
    // transcribing bot audio as user speech; restart when listening.
    if (voiceVoiceSR) {
      if (newState === 'speaking' || newState === 'thinking') {
        try { voiceVoiceSR.abort(); } catch (_) {}
      } else if (newState === 'listening' && voiceActive) {
        try { voiceVoiceSR.start(); } catch (_) {}
      }
    }
  }

  // ── Audio helpers ──────────────────────────────────────────────────────────

  function downsampleBuffer(buffer, fromRate, toRate) {
    if (fromRate === toRate) return buffer;
    var ratio = fromRate / toRate;
    var newLen = Math.round(buffer.length / ratio);
    var out = new Float32Array(newLen);
    for (var i = 0; i < newLen; i++) {
      var s = Math.round(i * ratio), e = Math.round((i + 1) * ratio);
      var sum = 0, cnt = 0;
      for (var j = s; j < e && j < buffer.length; j++) { sum += buffer[j]; cnt++; }
      out[i] = cnt ? sum / cnt : 0;
    }
    return out;
  }

  function float32ToInt16(buf) {
    var out = new Int16Array(buf.length);
    for (var i = 0; i < buf.length; i++) {
      var s = Math.max(-1, Math.min(1, buf[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return out;
  }

  function bufToBase64(buf) {
    var bytes = new Uint8Array(buf), bin = '';
    for (var i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function playPcm(base64, mimeType) {
    if (!voiceAudioCtx) return;
    // Resume the context if it was suspended (Safari/iOS policy)
    if (voiceAudioCtx.state === 'suspended') voiceAudioCtx.resume();
    var sr = 24000;
    var m = mimeType && mimeType.match(/rate=(\d+)/);
    if (m) sr = parseInt(m[1]);
    var bin = atob(base64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var int16 = new Int16Array(bytes.buffer);
    var f32 = new Float32Array(int16.length);
    for (var j = 0; j < int16.length; j++) f32[j] = int16[j] / 0x8000;
    var abuf = voiceAudioCtx.createBuffer(1, f32.length, sr);
    abuf.copyToChannel(f32, 0);
    var src = voiceAudioCtx.createBufferSource();
    src.buffer = abuf;
    src.connect(voiceAudioCtx.destination);
    var when = Math.max(voiceAudioCtx.currentTime, voiceNextPlayTime);
    src.start(when);
    voiceNextPlayTime = when + abuf.duration;
    // Track the source so we can stop it immediately on interruption
    voiceActiveSources.push(src);
    src.onended = function () {
      var idx = voiceActiveSources.indexOf(src);
      if (idx !== -1) voiceActiveSources.splice(idx, 1);
      // When the last chunk finishes playing, go back to listening
      if (voiceActiveSources.length === 0 && voiceState === 'speaking') {
        updateVoiceState('listening');
      }
    };
    updateVoiceState('speaking');
  }

  try {
    var stored = localStorage.getItem('apx_session_' + integrationId);
    if (stored) sessionId = stored;
  } catch (_) {}
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem('apx_session_' + integrationId, sessionId); } catch (_) {}
  }

  function init() {
  // Shadow host
  var host = document.createElement('div');
  host.id = 'appalix-widget-host';
  document.body.appendChild(host);
  shadow = host.attachShadow({ mode: 'open' }); // assigns to IIFE-level var so updateVoiceState can see it

  // SVG icons
  var ICONS = {
    chat:     '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 9h8M8 13h5M5 3h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7l-4 3V5a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    expand:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    contract: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 14h6v6M14 4h6v6M4 14l7-7M14 10l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    minimise: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    send:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mic:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" stroke-width="2"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    file:     '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  // CSS
  var BASE_CSS = [
    '*{box-sizing:border-box;margin:0;padding:0}',
    '.launcher{',
    '  position:fixed;bottom:24px;right:24px;',
    '  width:56px;height:56px;border-radius:50%;',
    '  background:var(--apx-launcher-bg);border:none;cursor:pointer;',
    '  display:flex;align-items:center;justify-content:center;color:#fff;',
    '  box-shadow:0 4px 20px rgba(0,0,0,.25);transition:transform .2s,box-shadow .2s;',
    '  z-index:2147483647;font-family:system-ui,-apple-system,sans-serif;',
    '}',
    '.launcher:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(0,0,0,.3);}',
    '.window{',
    '  position:fixed;bottom:90px;right:24px;',
    '  width:380px;height:560px;',
    '  display:flex;flex-direction:column;',
    '  border-radius:16px;overflow:hidden;',
    '  background:var(--apx-bg);border:1px solid var(--apx-border);',
    '  box-shadow:0 8px 40px rgba(0,0,0,.18);',
    '  z-index:2147483647;font-family:system-ui,-apple-system,sans-serif;font-size:14px;',
    '  transition:width .25s ease,height .25s ease,right .25s ease;',
    '}',
    '.resize-grip{width:14px;height:14px;cursor:nw-resize;opacity:.3;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:opacity .15s;margin-right:-2px;}',
    '.resize-grip:hover{opacity:.7;}',
    '.header{',
    '  display:flex;align-items:center;padding:12px 14px;gap:10px;',
    '  background:var(--apx-header-bg);border-bottom:1px solid var(--apx-border);flex-shrink:0;',
    '}',
    '.av{width:38px;height:38px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;}',
    '.av img{width:100%;height:100%;object-fit:cover;border-radius:50%;}',
    '.av-init{width:100%;height:100%;border-radius:50%;background:var(--apx-accent);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:var(--apx-accent-text);text-transform:uppercase;letter-spacing:0;}',
    '.ht{flex:1;min-width:0;}',
    '.ht-name{font-size:14px;font-weight:600;color:var(--apx-header-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.ht-sub{font-size:11px;color:var(--apx-header-text);opacity:.6;}',
    '.hbtn{',
    '  background:none;border:none;cursor:pointer;padding:5px;border-radius:6px;',
    '  color:var(--apx-header-text);opacity:.7;display:flex;align-items:center;justify-content:center;',
    '  transition:opacity .15s,background .15s;',
    '}',
    '.hbtn:hover{opacity:1;background:rgba(128,128,128,.15);}',
    '.messages{',
    '  flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;',
    '  background:var(--apx-bg);scroll-behavior:smooth;',
    '}',
    '.messages::-webkit-scrollbar{width:4px;}',
    '.messages::-webkit-scrollbar-thumb{background:var(--apx-border);border-radius:4px;}',
    '.msg{display:flex;max-width:82%;}',
    '.msg.bot{align-self:flex-start;}.msg.user{align-self:flex-end;}',
    '.bubble{padding:9px 13px;border-radius:14px;line-height:1.5;word-break:break-word;}',
    '.msg.bot .bubble{background:var(--apx-bot-bubble);color:var(--apx-bot-text);border-bottom-left-radius:4px;}',
    '.msg.user .bubble{background:var(--apx-user-bubble);color:var(--apx-user-text);border-bottom-right-radius:4px;}',
    '.typing{display:flex;align-items:center;gap:4px;padding:10px 13px;}',
    '.typing span{width:7px;height:7px;border-radius:50%;background:var(--apx-bot-text);opacity:.35;animation:apxbounce .9s infinite;}',
    '.typing span:nth-child(2){animation-delay:.15s;}.typing span:nth-child(3){animation-delay:.3s;}',
    '@keyframes apxbounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}',
    '.inputbar{',
    '  display:flex;align-items:flex-end;gap:8px;padding:10px 12px;',
    '  border-top:1px solid var(--apx-border);background:var(--apx-input-bg);flex-shrink:0;',
    '}',
    '.input-wrap{position:relative;flex:1;display:flex;}',
    '.input-wrap textarea{',
    '  flex:1;border:1px solid var(--apx-input-border);border-radius:10px;',
    '  padding:8px 34px 8px 11px;font-size:14px;line-height:1.45;resize:none;outline:none;',
    '  background:var(--apx-bg);color:var(--apx-input-text);font-family:inherit;',
    '  max-height:100px;overflow-y:auto;transition:border-color .15s;',
    '}',
    '.input-wrap textarea:focus{border-color:var(--apx-accent);}',
    '.input-wrap textarea::placeholder{color:var(--apx-input-text);opacity:.4;}',
    '.pin-btn{position:absolute;right:6px;bottom:5px;width:24px;height:24px;',
    '  border:none;background:transparent;cursor:pointer;padding:0;',
    '  color:var(--apx-input-text);opacity:.4;display:flex;align-items:center;justify-content:center;',
    '  transition:opacity .15s;}',
    '.pin-btn:hover{opacity:.75;}',
    '.sbtn{',
    '  width:38px;height:38px;border-radius:10px;border:none;cursor:pointer;',
    '  background:var(--apx-accent);color:var(--apx-accent-text);',
    '  display:flex;align-items:center;justify-content:center;flex-shrink:0;',
    '  transition:opacity .15s,transform .15s;',
    '}',
    '.sbtn:hover:not(:disabled){opacity:.88;transform:scale(1.05);}',
    '.sbtn:disabled{opacity:.4;cursor:not-allowed;}',
    '.icon-btn{width:32px;height:32px;border:none;border-radius:8px;cursor:pointer;background:transparent;',
    '  color:var(--apx-input-text);opacity:.45;display:flex;align-items:center;justify-content:center;',
    '  flex-shrink:0;transition:opacity .15s,color .15s;padding:0;}',
    '.icon-btn:hover{opacity:.8;}',
    '.icon-btn.recording{color:#ef4444;opacity:1;animation:apxpulse 1s ease-in-out infinite;}',
    '@keyframes apxpulse{0%,100%{opacity:1;}50%{opacity:.5;}}',
    '.powered{font-size:10px;text-align:center;color:#ffffff;opacity:.6;padding:3px 0 5px;}',
    '.powered a{color:inherit;text-decoration:none;}.powered a:hover{text-decoration:underline;}',
  ].join('');

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  // Render message text: escape HTML, then convert markdown links and bare URLs to <a> tags
  function renderText(str) {
    var escaped = String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    // Markdown links: [label](url)
    escaped = escaped.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--apx-accent,#3b82f6);text-decoration:underline;font-weight:500;">$1</a>'
    );
    // Bare URLs not already inside an href
    escaped = escaped.replace(
      /(?<!href=")(https?:\/\/[^\s<"]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--apx-accent,#3b82f6);text-decoration:underline;font-weight:500;">$1</a>'
    );
    return escaped.replace(/\n/g, '<br>');
  }

  function applySkin(vars) {
    var el = shadow.querySelector('#apx-skin');
    if (!el) { el = document.createElement('style'); el.id = 'apx-skin'; shadow.prepend(el); }
    var css = ':host{';
    Object.keys(vars).forEach(function (k) { css += k + ':' + vars[k] + ';'; });
    css += '}';
    el.textContent = css;
  }

  function render() {
    var isOpen     = state !== 'closed';
    var isExpanded = state === 'expanded';

    var winStyle = 'display:' + (isOpen ? 'flex' : 'none');
    if (isExpanded) {
      // Grow upward from the bottom anchor — no position jump
      winStyle += ';width:' + Math.min(520, window.innerWidth - 48) + 'px'
               + ';height:' + (window.innerHeight - 106) + 'px';
    } else {
      if (userWidth)  winStyle += ';width:'  + userWidth  + 'px';
      if (userHeight) winStyle += ';height:' + userHeight + 'px';
    }

    var msgsHtml = messages.map(function (m) {
      return '<div class="msg ' + m.role + '"><div class="bubble">' + renderText(m.text) + '</div></div>';
    }).join('');

    if (pendingTyping) {
      msgsHtml += '<div class="msg bot"><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div></div>';
    }

    shadow.innerHTML = [
      '<style>', BASE_CSS, '</style>',
      '<button class="launcher" id="apx-launcher" aria-label="Open chat" style="display:', (isOpen ? 'none' : 'flex'), '">',
        ICONS.chat,
      '</button>',
      '<div id="apx-window" class="window' + (isExpanded ? ' expanded' : '') + '" style="' + winStyle + '">',
        '<div class="header">',
          '<div class="resize-grip" id="apx-resize"><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="2" cy="10" r="1.2"/><circle cx="10" cy="2" r="1.2"/></svg></div>',
          '<div class="av">',
            botAvatarUrl
              ? '<img src="' + esc(botAvatarUrl) + '" alt="' + esc(botName) + '">'
              : '<div class="av-init">' + esc(botName.charAt(0) || 'A') + '</div>',
          '</div>',
          '<div class="ht">',
            '<div class="ht-name">', esc(botName), '</div>',
            '<div class="ht-sub" id="apx-ht-sub">',
              voiceState === 'listening' ? 'Listening\u2026' :
              voiceState === 'thinking'  ? 'Thinking\u2026'  :
              voiceState === 'speaking'  ? 'Speaking\u2026'  :
              'Online &middot; Replies instantly',
            '</div>',
          '</div>',
          '<button class="hbtn" id="apx-expand" aria-label="', (isExpanded ? 'Contract' : 'Expand'), '">', ICONS[isExpanded ? 'contract' : 'expand'], '</button>',
          '<button class="hbtn" id="apx-min" aria-label="Minimise">', ICONS.minimise, '</button>',
          '<button class="hbtn" id="apx-close" aria-label="Close">', ICONS.close, '</button>',
        '</div>',
        '<div class="messages" id="apx-messages">', msgsHtml, '</div>',
        // voice_only: centre the mic, hide text input entirely
        (enableVoice && voiceMode === 'voice_only') ? [
          '<div class="inputbar" style="justify-content:center;padding:16px 12px;">',
            '<button class="icon-btn" id="apx-mic" title="', voiceActive ? 'Stop voice' : 'Start voice', '"',
              ' style="width:48px;height:48px;border-radius:50%;background:var(--apx-accent);color:var(--apx-accent-text);opacity:1;">',
              ICONS.mic,
            '</button>',
          '</div>',
        ].join('') : [
          '<div class="inputbar">',
            '<button class="icon-btn" id="apx-mic" title="Voice input">', ICONS.mic, '</button>',
            '<div class="input-wrap">',
              '<textarea id="apx-input" rows="1" placeholder="Ask anything\u2026"></textarea>',
              '<button class="pin-btn" id="apx-file" title="Attach file">', ICONS.file, '</button>',
              '<input type="file" id="apx-file-input" style="display:none">',
            '</div>',
            '<button class="sbtn" id="apx-send"', (pendingTyping ? ' disabled' : ''), '>', ICONS.send, '</button>',
          '</div>',
        ].join(''),
        '<div class="powered">Powered by <a href="https://appalix.ai/" target="_blank" rel="noopener">Appalix.ai</a></div>',
      '</div>',
    ].join('');

    applySkin(skinVars);
    bindEvents();
    scrollToBottom();
  }

  function scrollToBottom() {
    var el = shadow.getElementById('apx-messages');
    if (el) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.scrollTop = el.scrollHeight;
        });
      });
    }
  }

  function bindEvents() {
    var launcher = shadow.getElementById('apx-launcher');
    if (launcher) launcher.addEventListener('click', function () {
      state = 'open';
      if (messages.length === 0 && welcomeMessage) {
        messages.push({ role: 'bot', text: welcomeMessage });
      }
      render();
      if (enableVoice && !voiceActive) {
        startVoiceSession(true);
      } else {
        setTimeout(function () {
          var inp = shadow.getElementById('apx-input');
          if (inp) inp.focus();
        }, 50);
      }
    });

    var expandBtn = shadow.getElementById('apx-expand');
    if (expandBtn) expandBtn.addEventListener('click', function () {
      state = state === 'expanded' ? 'open' : 'expanded';
      userWidth  = 0;
      userHeight = 0;
      render();
    });

    var minBtn = shadow.getElementById('apx-min');
    if (minBtn) minBtn.addEventListener('click', function () {
      state = 'closed';
      stopVoiceSession();
      render();
    });

    var closeBtn = shadow.getElementById('apx-close');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      stopVoiceSession();
      host.remove();
    });

    var input   = shadow.getElementById('apx-input');
    var sendBtn = shadow.getElementById('apx-send');

    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
      });
      input.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
      });
    }
    if (sendBtn) sendBtn.addEventListener('click', doSend);

    // Mic — Gemini Live voice (when enable_voice) or Web Speech API fallback
    var micBtn = shadow.getElementById('apx-mic');
    if (micBtn) {
      if (enableVoice) {
        // Full Gemini Live real-time voice (no auto-greet on manual tap)
        micBtn.addEventListener('click', function () {
          startVoiceSession(false);
        });
      } else {
        // Fallback: speech-to-text via browser SpeechRecognition
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) {
          var recognition = new SR();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognition.onresult = function (e) {
            var transcript = '';
            for (var i = e.resultIndex; i < e.results.length; i++) {
              transcript += e.results[i][0].transcript;
            }
            var inp = shadow.getElementById('apx-input');
            if (inp) inp.value = transcript;
          };
          recognition.onend = function () {
            micBtn.classList.remove('recording');
          };
          recognition.onerror = function () {
            micBtn.classList.remove('recording');
          };
          micBtn.addEventListener('click', function () {
            if (micBtn.classList.contains('recording')) {
              recognition.stop();
            } else {
              recognition.start();
              micBtn.classList.add('recording');
            }
          });
        } else {
          micBtn.style.display = 'none';
        }
      }
    }

    // File upload
    var fileBtn   = shadow.getElementById('apx-file');
    var fileInput = shadow.getElementById('apx-file-input');
    if (fileBtn && fileInput) {
      fileBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        fileInput.value = '';
        if (file.size > 512000) {
          messages.push({ role: 'bot', text: 'That file is too large (max 500 KB). Please upload a smaller file.' });
          render();
          return;
        }
        var inp = shadow.getElementById('apx-input');
        if (inp) {
          inp.value = (inp.value ? inp.value + ' ' : '') + '[File: ' + file.name + ']';
          inp.dispatchEvent(new Event('input'));
        }
      });
    }

    // Resize grip — drag top-left to resize (window is anchored bottom-right)
    var resizeGrip = shadow.getElementById('apx-resize');
    if (resizeGrip) {
      resizeGrip.addEventListener('mousedown', function (e) {
        e.preventDefault();
        var winEl = shadow.getElementById('apx-window');
        if (!winEl) return;
        var startX = e.clientX, startY = e.clientY;
        var startW = winEl.offsetWidth, startH = winEl.offsetHeight;

        function onMove(e) {
          var newW = Math.max(300, Math.min(startW + (startX - e.clientX), window.innerWidth  - 40));
          var newH = Math.max(380, Math.min(startH + (startY - e.clientY), window.innerHeight - 40));
          winEl.style.width  = newW + 'px';
          winEl.style.height = newH + 'px';
          userWidth  = newW;
          userHeight = newH;
        }
        function onUp() {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup',   onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup',   onUp);
      });

      resizeGrip.addEventListener('touchstart', function (e) {
        e.preventDefault();
        var winEl = shadow.getElementById('apx-window');
        if (!winEl) return;
        var t0 = e.touches[0];
        var startX = t0.clientX, startY = t0.clientY;
        var startW = winEl.offsetWidth, startH = winEl.offsetHeight;

        function onMove(e) {
          var t = e.touches[0];
          var newW = Math.max(300, Math.min(startW + (startX - t.clientX), window.innerWidth  - 40));
          var newH = Math.max(380, Math.min(startH + (startY - t.clientY), window.innerHeight - 40));
          winEl.style.width  = newW + 'px';
          winEl.style.height = newH + 'px';
          userWidth  = newW;
          userHeight = newH;
        }
        function onEnd() {
          document.removeEventListener('touchmove', onMove);
          document.removeEventListener('touchend',  onEnd);
        }
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend',  onEnd);
      }, { passive: false });
    }
  }

  function doSend() {
    if (pendingTyping) return;
    var input = shadow.getElementById('apx-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    messages.push({ role: 'user', text: text });
    pendingTyping = true;
    render();
    // Re-focus input after render() rebuilds the shadow DOM
    var refocusInput = shadow.getElementById('apx-input');
    if (refocusInput) refocusInput.focus();

    fetch(apiBase + '/chat/' + integrationId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: sessionId, client_time: new Date().toISOString(), client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        pendingTyping = false;
        var reply = d.reply || d.message || d.text || 'Sorry, I could not process that.';
        messages.push({ role: 'bot', text: reply });
        render();
        var ri = shadow.getElementById('apx-input'); if (ri) ri.focus();
      })
      .catch(function () {
        pendingTyping = false;
        messages.push({ role: 'bot', text: 'Sorry, something went wrong. Please try again.' });
        render();
        var ri = shadow.getElementById('apx-input'); if (ri) ri.focus();
      });
  }

  // ── Voice session helpers ──────────────────────────────────────────────────

  // resetVoiceIdleTimer / clearVoiceIdleTimer must live inside init() so their
  // timeout callbacks can close over stopVoiceSession (which is also inside init()).
  function resetVoiceIdleTimer() {
    if (voiceIdleTimer) clearTimeout(voiceIdleTimer);
    voiceIdleTimer = setTimeout(function () {
      stopVoiceSession(); // quietly disconnect — no error message, just stop billing
      // Widget is still open — start passive listening so any speech auto-reconnects
      startPassiveListening();
    }, VOICE_IDLE_TIMEOUT);
  }

  function clearVoiceIdleTimer() {
    if (voiceIdleTimer) { clearTimeout(voiceIdleTimer); voiceIdleTimer = null; }
  }

  // ── Passive wake-up listener ───────────────────────────────────────────────
  // Runs via SpeechRecognition (free, browser-side) after an idle disconnect.
  // The moment any speech is detected the Gemini socket is reconnected silently
  // (no re-greeting — user is already mid-thought).

  function startPassiveListening() {
    if (!enableVoice) return;
    if (state !== 'open' && state !== 'expanded') return;
    if (voicePassiveSR) return; // already running
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    voicePassiveSR = new SR();
    voicePassiveSR.continuous    = false;
    voicePassiveSR.interimResults = true;
    voicePassiveSR.onresult = function () {
      // First word detected → wake the Gemini socket immediately
      stopPassiveListening();
      startVoiceSession(false); // reconnect silently; user is already speaking
    };
    voicePassiveSR.onend = function () {
      // Auto-restart the passive listener if nothing triggered a reconnect
      if (!voiceActive && voicePassiveSR === null &&
          (state === 'open' || state === 'expanded')) {
        startPassiveListening();
      }
    };
    voicePassiveSR.onerror = function (e) {
      if (e.error === 'not-allowed') { voicePassiveSR = null; return; }
      // 'no-speech' and other transient errors: onend will restart
    };
    try { voicePassiveSR.start(); } catch (_) {}
  }

  function stopPassiveListening() {
    if (voicePassiveSR) {
      try { voicePassiveSR.abort(); } catch (_) {}
      voicePassiveSR = null;
    }
  }

  function updateMicBtn(active) {
    var btn = shadow.getElementById('apx-mic');
    if (!btn) return;
    if (active) {
      btn.classList.add('recording');
      btn.setAttribute('title', 'Stop voice');
    } else {
      btn.classList.remove('recording');
      btn.setAttribute('title', 'Start voice');
    }
  }

  function stopVoiceSession() {
    stopPassiveListening(); // always kill passive listener when session stops
    voiceActive = false;
    clearVoiceIdleTimer();
    stopAllAudio();
    updateVoiceState('idle');
    updateMicBtn(false);
    if (voiceProcessor) {
      try { voiceProcessor.disconnect(); } catch (_) {}
      voiceProcessor = null;
    }
    if (voiceAudioStream) {
      voiceAudioStream.getTracks().forEach(function (t) { t.stop(); });
      voiceAudioStream = null;
    }
    if (voiceAudioCtx) {
      try { voiceAudioCtx.close(); } catch (_) {}
      voiceAudioCtx = null;
    }
    if (voiceWs) {
      try { voiceWs.close(); } catch (_) {}
      voiceWs = null;
    }
    if (voiceVoiceSR) {
      try { voiceVoiceSR.abort(); } catch (_) {}
      voiceVoiceSR = null;
    }
    voiceNextPlayTime = 0;
  }

  function startVoiceSession(autoGreet) {
    stopPassiveListening(); // kill passive listener before opening a real session
    if (voiceActive) { stopVoiceSession(); return; }

    // Snapshot the current text conversation so the voice session has context
    var historySnapshot = messages.slice(-10).map(function (m) {
      return { role: m.role === 'bot' ? 'assistant' : 'user', text: m.text };
    });

    fetch(apiBase + '/chat/voice-session/' + integrationId, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ history: historySnapshot, voice_mode: voiceMode }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.wsUrl) throw new Error('No wsUrl');

        // Server returns the greeting text derived from greeting_script (or 'Hello')
        voiceGreetingText = d.greetingText || 'Hello';

        voiceAudioCtx     = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
        voiceNextPlayTime = 0;
        voiceWs           = new WebSocket(d.wsUrl);

        voiceWs.onmessage = function (evt) {
          try {
            var msg = JSON.parse(evt.data);

            // ── Session ready ─────────────────────────────────────────────
            if (msg.type === 'ready') {
              if (autoGreet) {
                updateVoiceState('thinking');  // server already triggered Gemini's opening greeting
              }
              resetVoiceIdleTimer();

              // Open mic — iOS-friendly constraints
              navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true },
                video: false,
              })
                .then(function (stream) {
                  // Guard: session may have closed while waiting for mic permission
                  if (!voiceWs || voiceWs.readyState !== 1) {
                    stream.getTracks().forEach(function (t) { t.stop(); });
                    return;
                  }
                  voiceAudioStream = stream;
                  voiceActive      = true;
                  // Keep 'thinking' state if autoGreet is still waiting for bot reply
                  if (!autoGreet) updateVoiceState('listening');
                  updateMicBtn(true);

                  var nativeSr    = voiceAudioCtx.sampleRate;
                  var source      = voiceAudioCtx.createMediaStreamSource(stream);
                  voiceProcessor  = voiceAudioCtx.createScriptProcessor(4096, 1, 1);

                  var SPEECH_RMS_THRESHOLD = 0.01;
                  voiceProcessor.onaudioprocess = function (e) {
                    if (!voiceActive || !voiceWs || voiceWs.readyState !== 1) return;
                    // Mute mic to Gemini while bot is speaking — prevents the bot's own
                    // audio leaking back into the mic (echo), which triggers Gemini's VAD
                    // and causes the "interrupted" loop (break → repeat → break → repeat).
                    if (voiceState === 'speaking' || voiceState === 'thinking') return;
                    var f32 = e.inputBuffer.getChannelData(0);
                    var d16 = downsampleBuffer(f32, nativeSr, 16000);
                    var pcm = float32ToInt16(d16);
                    var b64 = bufToBase64(pcm.buffer);
                    voiceWs.send(JSON.stringify({ type: 'audio', data: b64 }));
                    // Only reset idle timer when user is actually speaking (not on silence)
                    var rms = 0;
                    for (var k = 0; k < f32.length; k++) rms += f32[k] * f32[k];
                    if (Math.sqrt(rms / f32.length) > SPEECH_RMS_THRESHOLD) {
                      resetVoiceIdleTimer();
                      updateVoiceState('listening');
                    }
                  };

                  source.connect(voiceProcessor);
                  voiceProcessor.connect(voiceAudioCtx.destination);

                  // SpeechRecognition for user transcript in voice_text mode.
                  // Runs alongside the Gemini audio stream; paused while bot speaks.
                  if (voiceMode === 'voice_text') {
                    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                    if (SR) {
                      voiceVoiceSR = new SR();
                      voiceVoiceSR.continuous    = true;
                      voiceVoiceSR.interimResults = false;
                      voiceVoiceSR.lang          = 'en-US';
                      voiceVoiceSR.onresult = function (e) {
                        for (var i = e.resultIndex; i < e.results.length; i++) {
                          if (e.results[i].isFinal) {
                            var text = e.results[i][0].transcript.trim();
                            if (text && voiceState !== 'speaking') {
                              messages.push({ role: 'user', text: text });
                              render();
                            }
                          }
                        }
                      };
                      voiceVoiceSR.onend = function () {
                        // Auto-restart unless bot is speaking or session ended
                        if (voiceActive && voiceState === 'listening') {
                          try { voiceVoiceSR.start(); } catch (_) {}
                        }
                      };
                      voiceVoiceSR.onerror = function () { /* ignore no-speech etc. */ };
                      try { voiceVoiceSR.start(); } catch (_) {}
                    }
                  }
                })
                .catch(function (err) {
                  if (voiceWs) {
                    var errName = (err && err.name) || '';
                    var errMsg;
                    if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
                      errMsg = 'Microphone access denied. Click the padlock icon in your browser address bar, allow microphone access, then try again.';
                    } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
                      errMsg = 'No microphone detected. Please connect a microphone and try again.';
                    } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
                      errMsg = 'Microphone is in use by another app or tab. Please close it and try again.';
                    } else {
                      errMsg = 'Could not access microphone' + (errName ? ' (' + errName + ')' : '') + '. Please check your browser\u2019s microphone permissions.';
                    }
                    messages.push({ role: 'bot', text: errMsg });
                    render();
                  }
                  stopVoiceSession();
                });

            // ── Bot audio ─────────────────────────────────────────────────
            } else if (msg.type === 'audio' && msg.data) {
              resetVoiceIdleTimer();
              playPcm(msg.data, msg.mimeType);  // sets voiceState='speaking' internally

            // ── Bot text transcript (voice_text mode only) ─────────────────
            } else if (msg.type === 'text' && msg.content) {
              resetVoiceIdleTimer();
              if (voiceMode === 'voice_text') {
                messages.push({ role: 'bot', text: msg.content });
                render();
              }

            // ── User speech transcript (voice_text mode, final only) ───────
            } else if (msg.type === 'input_transcript' && msg.finished && msg.text) {
              if (voiceMode === 'voice_text' && msg.text.trim()) {
                messages.push({ role: 'user', text: msg.text.trim() });
                updateVoiceState('thinking');  // user finished; bot is processing
                render();
              }

            // ── Bot finished its turn → back to listening ──────────────────
            } else if (msg.type === 'turn_complete') {
              updateVoiceState('listening');

            // ── Interruption: user spoke mid-reply → kill queued audio ─────
            } else if (msg.type === 'interrupted') {
              stopAllAudio();
              updateVoiceState('listening');

            // ── Error ─────────────────────────────────────────────────────
            } else if (msg.type === 'error') {
              messages.push({ role: 'bot', text: msg.message || 'Voice error — please try again.' });
              render();
              stopVoiceSession();
            }
          } catch (_) {}
        };

        voiceWs.onerror = function () { stopVoiceSession(); };
        voiceWs.onclose = function () { if (voiceActive) stopVoiceSession(); };
      })
      .catch(function () {
        messages.push({ role: 'bot', text: 'Could not start voice session. Please try again.' });
        render();
      });
  }

  // Boot
  fetch(apiBase + '/chat/config/' + integrationId)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.welcome_message) welcomeMessage = d.welcome_message;
      if (d.bot_name) botName = d.bot_name;
      if (d.bot_avatar_url) botAvatarUrl = d.bot_avatar_url;
      enableVoice = !!d.enable_voice;
      voiceMode   = d.voice_mode || 'voice_text';
      var skinId = d.skin || 'appalix_lite';
      if (skinId === 'custom') {
        skinVars = Object.assign({}, SKINS.appalix_lite);
        if (d.accent_color) {
          skinVars['--apx-accent']      = d.accent_color;
          skinVars['--apx-user-bubble'] = d.accent_color;
          skinVars['--apx-launcher-bg'] = d.accent_color;
        }
        if (d.header_color) skinVars['--apx-header-bg'] = d.header_color;
      } else {
        skinVars = SKINS[skinId] || SKINS.appalix_lite;
      }
      render();
    })
    .catch(function () { render(); });
  } // end init()

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
