(function () {
  'use strict';

  // Config
  var cfg = window.AppalixConfig || {};
  var integrationId = cfg.integrationId;
  if (!integrationId) return;

  // API base: prefer explicit value from AppalixConfig (set by the embedding script),
  // then fall back to this script's own origin (works for non-async loads),
  // then fall back to the default production URL.
  var apiBase = cfg.apiBase || '';
  if (!apiBase) {
    try {
      var s = document.currentScript && document.currentScript.src;
      if (s) { var u = new URL(s); apiBase = u.origin; }
    } catch (_) {}
  }
  if (!apiBase) apiBase = 'https://api.appalix.ai';

  // Skin catalogue
  var SKINS = {
    light: {
      '--apx-header-bg': '#f9fafb',
      '--apx-header-text': '#111827',
      '--apx-bg': '#ffffff',
      '--apx-border': '#e5e7eb',
      '--apx-user-bubble': '#ec732e',
      '--apx-user-text': '#ffffff',
      '--apx-bot-bubble': '#f3f4f6',
      '--apx-bot-text': '#111827',
      '--apx-input-bg': '#f9fafb',
      '--apx-input-border': '#d1d5db',
      '--apx-input-text': '#111827',
      '--apx-accent': '#ec732e',
      '--apx-accent-text': '#ffffff',
      '--apx-launcher-bg': '#ec732e',
    },
    dark: {
      '--apx-header-bg': '#1a1a1a',
      '--apx-header-text': '#f3f4f6',
      '--apx-bg': '#242424',
      '--apx-border': '#3a3a3a',
      '--apx-user-bubble': '#ec732e',
      '--apx-user-text': '#ffffff',
      '--apx-bot-bubble': '#2e2e2e',
      '--apx-bot-text': '#e5e7eb',
      '--apx-input-bg': '#1a1a1a',
      '--apx-input-border': '#3a3a3a',
      '--apx-input-text': '#f3f4f6',
      '--apx-accent': '#ec732e',
      '--apx-accent-text': '#ffffff',
      '--apx-launcher-bg': '#ec732e',
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
    desert: {
      '--apx-header-bg': '#6b3a2a',
      '--apx-header-text': '#fef3c7',
      '--apx-bg': '#fdf3e3',
      '--apx-border': '#f5d0a9',
      '--apx-user-bubble': '#d4722a',
      '--apx-user-text': '#ffffff',
      '--apx-bot-bubble': '#fae8cc',
      '--apx-bot-text': '#4a2010',
      '--apx-input-bg': '#fffbf0',
      '--apx-input-border': '#f5d0a9',
      '--apx-input-text': '#4a2010',
      '--apx-accent': '#d4722a',
      '--apx-accent-text': '#ffffff',
      '--apx-launcher-bg': '#6b3a2a',
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
    midnight: {
      '--apx-header-bg': '#1a0a2e',
      '--apx-header-text': '#e9d5ff',
      '--apx-bg': '#0d0819',
      '--apx-border': '#3b1a6b',
      '--apx-user-bubble': '#7c3aed',
      '--apx-user-text': '#ffffff',
      '--apx-bot-bubble': '#1e103a',
      '--apx-bot-text': '#c4b5fd',
      '--apx-input-bg': '#1a0a2e',
      '--apx-input-border': '#3b1a6b',
      '--apx-input-text': '#e9d5ff',
      '--apx-accent': '#a855f7',
      '--apx-accent-text': '#ffffff',
      '--apx-launcher-bg': '#7c3aed',
    },
    rose: {
      '--apx-header-bg': '#be185d',
      '--apx-header-text': '#fce4ed',
      '--apx-bg': '#fff0f5',
      '--apx-border': '#fbcfe8',
      '--apx-user-bubble': '#e11d48',
      '--apx-user-text': '#ffffff',
      '--apx-bot-bubble': '#fce4ed',
      '--apx-bot-text': '#4a0520',
      '--apx-input-bg': '#ffffff',
      '--apx-input-border': '#fbcfe8',
      '--apx-input-text': '#4a0520',
      '--apx-accent': '#e11d48',
      '--apx-accent-text': '#ffffff',
      '--apx-launcher-bg': '#be185d',
    },
    minimal: {
      '--apx-header-bg': '#ffffff',
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
  var skinVars = SKINS.light;
  var sessionId = '';

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
  var shadow = host.attachShadow({ mode: 'open' });

  // SVG icons
  var ICONS = {
    chat:     '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 9h8M8 13h5M5 3h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7l-4 3V5a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    expand:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    contract: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 14h6v6M14 4h6v6M4 14l7-7M14 10l7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    minimise: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    send:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
    '  transition:width .25s ease,height .25s ease,top .25s ease,right .25s ease,bottom .25s ease;',
    '}',
    '.window.expanded{width:60vw;height:70vh;top:16px;right:16px;bottom:auto;}',
    '.header{',
    '  display:flex;align-items:center;padding:12px 14px;gap:10px;',
    '  background:var(--apx-header-bg);border-bottom:1px solid var(--apx-border);flex-shrink:0;',
    '}',
    '.hd{width:10px;height:10px;border-radius:50%;background:var(--apx-accent);flex-shrink:0;}',
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
    '.inputbar textarea{',
    '  flex:1;border:1px solid var(--apx-input-border);border-radius:10px;',
    '  padding:8px 11px;font-size:14px;line-height:1.45;resize:none;outline:none;',
    '  background:var(--apx-bg);color:var(--apx-input-text);font-family:inherit;',
    '  max-height:100px;overflow-y:auto;transition:border-color .15s;',
    '}',
    '.inputbar textarea:focus{border-color:var(--apx-accent);}',
    '.inputbar textarea::placeholder{color:var(--apx-input-text);opacity:.4;}',
    '.sbtn{',
    '  width:38px;height:38px;border-radius:10px;border:none;cursor:pointer;',
    '  background:var(--apx-accent);color:var(--apx-accent-text);',
    '  display:flex;align-items:center;justify-content:center;flex-shrink:0;',
    '  transition:opacity .15s,transform .15s;',
    '}',
    '.sbtn:hover:not(:disabled){opacity:.88;transform:scale(1.05);}',
    '.sbtn:disabled{opacity:.4;cursor:not-allowed;}',
    '.powered{font-size:10px;text-align:center;color:var(--apx-bot-text);opacity:.3;padding:3px 0 5px;}',
  ].join('');

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
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

    var msgsHtml = messages.map(function (m) {
      return '<div class="msg ' + m.role + '"><div class="bubble">' + esc(m.text) + '</div></div>';
    }).join('');

    if (pendingTyping) {
      msgsHtml += '<div class="msg bot"><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div></div>';
    }

    shadow.innerHTML = [
      '<style>', BASE_CSS, '</style>',
      '<button class="launcher" id="apx-launcher" aria-label="Open chat" style="display:', (isOpen ? 'none' : 'flex'), '">',
        ICONS.chat,
      '</button>',
      '<div class="window', (isExpanded ? ' expanded' : ''), '" style="display:', (isOpen ? 'flex' : 'none'), '">',
        '<div class="header">',
          '<div class="hd"></div>',
          '<div class="ht">',
            '<div class="ht-name">Chat support</div>',
            '<div class="ht-sub">Online &middot; Replies instantly</div>',
          '</div>',
          '<button class="hbtn" id="apx-expand" aria-label="', (isExpanded ? 'Contract' : 'Expand'), '">', ICONS[isExpanded ? 'contract' : 'expand'], '</button>',
          '<button class="hbtn" id="apx-min" aria-label="Minimise">', ICONS.minimise, '</button>',
          '<button class="hbtn" id="apx-close" aria-label="Close">', ICONS.close, '</button>',
        '</div>',
        '<div class="messages" id="apx-messages">', msgsHtml, '</div>',
        '<div class="inputbar">',
          '<textarea id="apx-input" rows="1" placeholder="Ask anything\u2026"></textarea>',
          '<button class="sbtn" id="apx-send"', (pendingTyping ? ' disabled' : ''), '>', ICONS.send, '</button>',
        '</div>',
        '<div class="powered">Powered by Appalix</div>',
      '</div>',
    ].join('');

    applySkin(skinVars);
    bindEvents();
    scrollToBottom();
  }

  function scrollToBottom() {
    var el = shadow.getElementById('apx-messages');
    if (el) { setTimeout(function () { el.scrollTop = el.scrollHeight; }, 10); }
  }

  function bindEvents() {
    var launcher = shadow.getElementById('apx-launcher');
    if (launcher) launcher.addEventListener('click', function () {
      state = 'open';
      if (messages.length === 0 && welcomeMessage) {
        messages.push({ role: 'bot', text: welcomeMessage });
      }
      render();
      setTimeout(function () {
        var inp = shadow.getElementById('apx-input');
        if (inp) inp.focus();
      }, 50);
    });

    var expandBtn = shadow.getElementById('apx-expand');
    if (expandBtn) expandBtn.addEventListener('click', function () {
      state = state === 'expanded' ? 'open' : 'expanded';
      render();
    });

    var minBtn = shadow.getElementById('apx-min');
    if (minBtn) minBtn.addEventListener('click', function () {
      state = 'closed';
      render();
    });

    var closeBtn = shadow.getElementById('apx-close');
    if (closeBtn) closeBtn.addEventListener('click', function () {
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

    fetch(apiBase + '/chat/' + integrationId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: sessionId }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        pendingTyping = false;
        var reply = d.reply || d.message || d.text || 'Sorry, I could not process that.';
        messages.push({ role: 'bot', text: reply });
        render();
      })
      .catch(function () {
        pendingTyping = false;
        messages.push({ role: 'bot', text: 'Sorry, something went wrong. Please try again.' });
        render();
      });
  }

  // Boot
  fetch(apiBase + '/chat/config/' + integrationId)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.welcome_message) welcomeMessage = d.welcome_message;
      var skinId = d.skin || 'light';
      if (skinId === 'custom') {
        skinVars = Object.assign({}, SKINS.light);
        if (d.accent_color) {
          skinVars['--apx-accent']      = d.accent_color;
          skinVars['--apx-user-bubble'] = d.accent_color;
          skinVars['--apx-launcher-bg'] = d.accent_color;
        }
        if (d.header_color) skinVars['--apx-header-bg'] = d.header_color;
      } else {
        skinVars = SKINS[skinId] || SKINS.light;
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
