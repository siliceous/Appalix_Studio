;(function () {
  'use strict'

  // ─── Config ───────────────────────────────────────────────────────────────
  var cfg = window.AppalixConfig || {}
  var integrationId = cfg.integrationId
  if (!integrationId) return

  // Derive the API base from the script src (works on any domain)
  var scripts = document.getElementsByTagName('script')
  var scriptSrc = ''
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.indexOf('widget.js') !== -1) {
      scriptSrc = scripts[i].src
      break
    }
  }
  var apiBase = scriptSrc ? scriptSrc.replace(/\/widget\.js.*$/, '') : ''

  // ─── Skin Definitions ─────────────────────────────────────────────────────
  var SKINS = {
    light: {
      '--apx-header-bg':    '#f9fafb',
      '--apx-header-text':  '#111827',
      '--apx-bg':           '#ffffff',
      '--apx-border':       '#e5e7eb',
      '--apx-user-bubble':  '#ec732e',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#f3f4f6',
      '--apx-bot-text':     '#111827',
      '--apx-input-bg':     '#f9fafb',
      '--apx-input-border': '#d1d5db',
      '--apx-input-text':   '#111827',
      '--apx-accent':       '#ec732e',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#ec732e',
    },
    dark: {
      '--apx-header-bg':    '#1a1a1a',
      '--apx-header-text':  '#f3f4f6',
      '--apx-bg':           '#242424',
      '--apx-border':       '#3a3a3a',
      '--apx-user-bubble':  '#ec732e',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#2e2e2e',
      '--apx-bot-text':     '#e5e7eb',
      '--apx-input-bg':     '#1a1a1a',
      '--apx-input-border': '#3a3a3a',
      '--apx-input-text':   '#f3f4f6',
      '--apx-accent':       '#ec732e',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#ec732e',
    },
    forest: {
      '--apx-header-bg':    '#1c3426',
      '--apx-header-text':  '#d1fae5',
      '--apx-bg':           '#f0faf5',
      '--apx-border':       '#a7f3d0',
      '--apx-user-bubble':  '#2d6a4f',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#e8f5ee',
      '--apx-bot-text':     '#1c3426',
      '--apx-input-bg':     '#ffffff',
      '--apx-input-border': '#a7f3d0',
      '--apx-input-text':   '#1c3426',
      '--apx-accent':       '#2d6a4f',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#1c3426',
    },
    desert: {
      '--apx-header-bg':    '#6b3a2a',
      '--apx-header-text':  '#fef3c7',
      '--apx-bg':           '#fdf3e3',
      '--apx-border':       '#f5d0a9',
      '--apx-user-bubble':  '#d4722a',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#fae8cc',
      '--apx-bot-text':     '#4a2010',
      '--apx-input-bg':     '#fffbf0',
      '--apx-input-border': '#f5d0a9',
      '--apx-input-text':   '#4a2010',
      '--apx-accent':       '#d4722a',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#6b3a2a',
    },
    ocean: {
      '--apx-header-bg':    '#0a2d4a',
      '--apx-header-text':  '#bae6fd',
      '--apx-bg':           '#f0f7ff',
      '--apx-border':       '#bae6fd',
      '--apx-user-bubble':  '#0077b6',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#deeeff',
      '--apx-bot-text':     '#0a2d4a',
      '--apx-input-bg':     '#ffffff',
      '--apx-input-border': '#bae6fd',
      '--apx-input-text':   '#0a2d4a',
      '--apx-accent':       '#0077b6',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#0a2d4a',
    },
    midnight: {
      '--apx-header-bg':    '#1a0a2e',
      '--apx-header-text':  '#e9d5ff',
      '--apx-bg':           '#0d0819',
      '--apx-border':       '#3b1a6b',
      '--apx-user-bubble':  '#7c3aed',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#1e103a',
      '--apx-bot-text':     '#c4b5fd',
      '--apx-input-bg':     '#1a0a2e',
      '--apx-input-border': '#3b1a6b',
      '--apx-input-text':   '#e9d5ff',
      '--apx-accent':       '#a855f7',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#7c3aed',
    },
    rose: {
      '--apx-header-bg':    '#be185d',
      '--apx-header-text':  '#fce4ed',
      '--apx-bg':           '#fff0f5',
      '--apx-border':       '#fbcfe8',
      '--apx-user-bubble':  '#e11d48',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#fce4ed',
      '--apx-bot-text':     '#4a0520',
      '--apx-input-bg':     '#ffffff',
      '--apx-input-border': '#fbcfe8',
      '--apx-input-text':   '#4a0520',
      '--apx-accent':       '#e11d48',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#be185d',
    },
    minimal: {
      '--apx-header-bg':    '#ffffff',
      '--apx-header-text':  '#111111',
      '--apx-bg':           '#ffffff',
      '--apx-border':       '#e5e5e5',
      '--apx-user-bubble':  '#333333',
      '--apx-user-text':    '#ffffff',
      '--apx-bot-bubble':   '#f5f5f5',
      '--apx-bot-text':     '#111111',
      '--apx-input-bg':     '#fafafa',
      '--apx-input-border': '#e5e5e5',
      '--apx-input-text':   '#111111',
      '--apx-accent':       '#333333',
      '--apx-accent-text':  '#ffffff',
      '--apx-launcher-bg':  '#333333',
    },
  }

  // ─── Shadow DOM + CSS ─────────────────────────────────────────────────────
  var CSS = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      box-sizing: border-box;
    }
    *, *::before, *::after { box-sizing: inherit; }

    /* Launcher bubble */
    #apx-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--apx-launcher-bg, #ec732e);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      z-index: 2147483647;
    }
    #apx-launcher:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.3); }
    #apx-launcher svg { width: 26px; height: 26px; fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

    /* Widget window */
    #apx-widget {
      position: fixed;
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 48px rgba(0,0,0,0.22);
      border: 1px solid var(--apx-border, #e5e7eb);
      background: var(--apx-bg, #ffffff);
      transition: width 0.25s ease, height 0.25s ease, top 0.25s ease, right 0.25s ease, bottom 0.25s ease;
    }
    #apx-widget.state-standard {
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 560px;
    }
    #apx-widget.state-expanded {
      top: 16px;
      right: 16px;
      bottom: auto;
      width: 60vw;
      height: 70vh;
      border-radius: 16px;
    }
    #apx-widget.state-hidden { display: none; }

    /* Header */
    #apx-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      background: var(--apx-header-bg, #f9fafb);
      border-bottom: 1px solid var(--apx-border, #e5e7eb);
      flex-shrink: 0;
    }
    #apx-header-dot {
      width: 9px; height: 9px;
      border-radius: 50%;
      background: var(--apx-accent, #ec732e);
      animation: apx-pulse 2s infinite;
      flex-shrink: 0;
    }
    @keyframes apx-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    #apx-header-title {
      flex: 1;
      font-size: 13px;
      font-weight: 600;
      color: var(--apx-header-text, #111827);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #apx-controls { display: flex; gap: 4px; }
    .apx-ctrl {
      width: 28px; height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: var(--apx-header-text, #111827);
      opacity: 0.6;
      transition: opacity 0.15s, background 0.15s;
      font-size: 15px;
      line-height: 1;
    }
    .apx-ctrl:hover { opacity: 1; background: rgba(128,128,128,0.12); }

    /* Messages */
    #apx-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: var(--apx-bg, #ffffff);
      scroll-behavior: smooth;
    }
    #apx-messages::-webkit-scrollbar { width: 4px; }
    #apx-messages::-webkit-scrollbar-track { background: transparent; }
    #apx-messages::-webkit-scrollbar-thumb { background: var(--apx-border, #e5e7eb); border-radius: 2px; }

    .apx-row { display: flex; }
    .apx-row.user { justify-content: flex-end; }
    .apx-row.bot  { justify-content: flex-start; }

    .apx-bubble {
      max-width: 82%;
      padding: 10px 14px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.5;
      word-break: break-word;
    }
    .apx-row.user .apx-bubble {
      background: var(--apx-user-bubble, #ec732e);
      color: var(--apx-user-text, #ffffff);
      border-bottom-right-radius: 4px;
    }
    .apx-row.bot .apx-bubble {
      background: var(--apx-bot-bubble, #f3f4f6);
      color: var(--apx-bot-text, #111827);
      border-bottom-left-radius: 4px;
    }

    /* Typing dots */
    #apx-typing {
      display: flex;
      gap: 4px;
      padding: 12px 14px;
      background: var(--apx-bot-bubble, #f3f4f6);
      border-radius: 18px;
      border-bottom-left-radius: 4px;
      width: fit-content;
    }
    .apx-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--apx-accent, #ec732e);
      animation: apx-dot 1.4s infinite;
    }
    .apx-dot:nth-child(2) { animation-delay: 0.28s; }
    .apx-dot:nth-child(3) { animation-delay: 0.56s; }
    @keyframes apx-dot {
      0%, 60%, 100% { opacity: 0.2; transform: scale(0.85); }
      30% { opacity: 1; transform: scale(1); }
    }

    /* Input bar */
    #apx-input-bar {
      display: flex;
      gap: 8px;
      padding: 12px 14px;
      border-top: 1px solid var(--apx-border, #e5e7eb);
      background: var(--apx-bg, #ffffff);
      flex-shrink: 0;
    }
    #apx-input {
      flex: 1;
      padding: 9px 13px;
      border: 1px solid var(--apx-input-border, #d1d5db);
      border-radius: 10px;
      background: var(--apx-input-bg, #f9fafb);
      color: var(--apx-input-text, #111827);
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s;
    }
    #apx-input:focus { border-color: var(--apx-accent, #ec732e); }
    #apx-input::placeholder { color: var(--apx-input-text, #111827); opacity: 0.4; }
    #apx-send {
      width: 38px; height: 38px;
      border-radius: 10px;
      border: none;
      background: var(--apx-accent, #ec732e);
      color: var(--apx-accent-text, #ffffff);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: opacity 0.15s;
    }
    #apx-send:disabled { opacity: 0.4; cursor: default; }
    #apx-send:not(:disabled):hover { opacity: 0.88; }
    #apx-send svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

    /* Branding */
    #apx-branding {
      text-align: center;
      font-size: 11px;
      color: var(--apx-bot-text, #111827);
      opacity: 0.35;
      padding: 4px 0 8px;
      background: var(--apx-bg, #ffffff);
      flex-shrink: 0;
    }
  `

  // ─── State ────────────────────────────────────────────────────────────────
  var state = 'closed'   // 'closed' | 'standard' | 'expanded'
  var sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
  var isLoading = false
  var skinVars = SKINS.light

  // ─── DOM References ───────────────────────────────────────────────────────
  var host, shadow, launcher, widget, messagesEl, inputEl, sendBtn, typingEl

  // ─── Apply skin CSS variables ─────────────────────────────────────────────
  function applySkin(vars) {
    var styleEl = shadow.querySelector('#apx-skin-vars')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'apx-skin-vars'
      shadow.insertBefore(styleEl, shadow.firstChild)
    }
    var rules = ':host {'
    for (var k in vars) rules += k + ':' + vars[k] + ';'
    rules += '}'
    styleEl.textContent = rules
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────
  function setState(next) {
    state = next
    if (state === 'closed') {
      launcher.style.display = 'flex'
      widget.className = 'state-hidden'
    } else {
      launcher.style.display = 'none'
      widget.className = state === 'expanded' ? 'state-expanded' : 'state-standard'
    }
  }

  function addMessage(role, text) {
    var row = document.createElement('div')
    row.className = 'apx-row ' + role
    var bubble = document.createElement('div')
    bubble.className = 'apx-bubble'
    bubble.textContent = text
    row.appendChild(bubble)
    messagesEl.appendChild(row)
    scrollBottom()
    return row
  }

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight
  }

  function showTyping() {
    typingEl.style.display = 'flex'
    scrollBottom()
  }

  function hideTyping() {
    typingEl.style.display = 'none'
  }

  // ─── Chat ─────────────────────────────────────────────────────────────────
  async function sendMessage() {
    var text = inputEl.value.trim()
    if (!text || isLoading) return
    inputEl.value = ''
    sendBtn.disabled = true
    isLoading = true

    addMessage('user', text)
    showTyping()

    try {
      var res = await fetch(apiBase + '/chat/' + integrationId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      })
      var data = await res.json()
      hideTyping()
      addMessage('bot', data.reply || "Sorry, I couldn't reach the server. Please try again.")
    } catch (_) {
      hideTyping()
      addMessage('bot', "Sorry, I couldn't connect. Please try again.")
    } finally {
      isLoading = false
      sendBtn.disabled = false
      inputEl.focus()
    }
  }

  // ─── Build DOM ────────────────────────────────────────────────────────────
  function buildWidget(welcomeMessage) {
    host = document.createElement('div')
    host.id = 'apx-host'
    document.body.appendChild(host)

    shadow = host.attachShadow({ mode: 'open' })

    // Base styles
    var styleEl = document.createElement('style')
    styleEl.textContent = CSS
    shadow.appendChild(styleEl)

    // Apply initial skin
    applySkin(skinVars)

    // ── Launcher ──────────────────────────────────────────────────────────
    launcher = document.createElement('button')
    launcher.id = 'apx-launcher'
    launcher.setAttribute('aria-label', 'Open chat')
    launcher.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
    launcher.addEventListener('click', function () { setState('standard') })
    shadow.appendChild(launcher)

    // ── Widget window ─────────────────────────────────────────────────────
    widget = document.createElement('div')
    widget.id = 'apx-widget'
    widget.className = 'state-hidden'
    shadow.appendChild(widget)

    // Header
    var header = document.createElement('div')
    header.id = 'apx-header'

    var dot = document.createElement('div')
    dot.id = 'apx-header-dot'

    var title = document.createElement('div')
    title.id = 'apx-header-title'
    title.textContent = (cfg.botName || 'AI Assistant') + ' · Online'

    var controls = document.createElement('div')
    controls.id = 'apx-controls'

    // Expand / contract button (⧉)
    var expandBtn = document.createElement('button')
    expandBtn.className = 'apx-ctrl'
    expandBtn.setAttribute('aria-label', 'Expand')
    expandBtn.title = 'Expand / contract'
    expandBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`
    expandBtn.addEventListener('click', function () {
      setState(state === 'expanded' ? 'standard' : 'expanded')
    })

    // Minimise button (–)
    var minBtn = document.createElement('button')
    minBtn.className = 'apx-ctrl'
    minBtn.setAttribute('aria-label', 'Minimise')
    minBtn.title = 'Minimise'
    minBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`
    minBtn.addEventListener('click', function () { setState('closed') })

    // Close button (×)
    var closeBtn = document.createElement('button')
    closeBtn.className = 'apx-ctrl'
    closeBtn.setAttribute('aria-label', 'Close')
    closeBtn.title = 'Close'
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
    closeBtn.addEventListener('click', function () {
      host.style.display = 'none'   // hides everything including launcher
    })

    controls.appendChild(expandBtn)
    controls.appendChild(minBtn)
    controls.appendChild(closeBtn)

    header.appendChild(dot)
    header.appendChild(title)
    header.appendChild(controls)
    widget.appendChild(header)

    // Messages area
    messagesEl = document.createElement('div')
    messagesEl.id = 'apx-messages'
    widget.appendChild(messagesEl)

    // Typing indicator (always in DOM, toggled by display)
    typingEl = document.createElement('div')
    typingEl.id = 'apx-typing'
    typingEl.style.display = 'none'
    typingEl.innerHTML = '<div class="apx-dot"></div><div class="apx-dot"></div><div class="apx-dot"></div>'
    messagesEl.appendChild(typingEl)

    // Input bar
    var inputBar = document.createElement('div')
    inputBar.id = 'apx-input-bar'

    inputEl = document.createElement('input')
    inputEl.id = 'apx-input'
    inputEl.type = 'text'
    inputEl.placeholder = 'Ask anything…'
    inputEl.setAttribute('autocomplete', 'off')
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    })

    sendBtn = document.createElement('button')
    sendBtn.id = 'apx-send'
    sendBtn.setAttribute('aria-label', 'Send')
    sendBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`
    sendBtn.addEventListener('click', sendMessage)

    inputBar.appendChild(inputEl)
    inputBar.appendChild(sendBtn)
    widget.appendChild(inputBar)

    // Branding
    var branding = document.createElement('div')
    branding.id = 'apx-branding'
    branding.textContent = 'Powered by Appalix'
    widget.appendChild(branding)

    // Welcome message
    addMessage('bot', welcomeMessage)
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  function boot() {
    fetch(apiBase + '/chat/config/' + integrationId)
      .then(function (r) { return r.json() })
      .then(function (d) {
        var skinId = d.skin || 'light'
        if (skinId === 'custom') {
          skinVars = Object.assign({}, SKINS.light)
          if (d.accent_color) {
            skinVars['--apx-accent']       = d.accent_color
            skinVars['--apx-user-bubble']  = d.accent_color
            skinVars['--apx-launcher-bg']  = d.accent_color
          }
          if (d.header_color) {
            skinVars['--apx-header-bg'] = d.header_color
          }
        } else {
          skinVars = SKINS[skinId] || SKINS.light
        }
        var welcome = d.welcome_message || 'Hi there! How can I help you today?'
        buildWidget(welcome)
      })
      .catch(function () {
        buildWidget('Hi there! How can I help you today?')
      })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
