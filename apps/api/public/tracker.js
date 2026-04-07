;(function () {
  'use strict'

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  // TrackerBootstrap is embedded at page/form generation time:
  //   <script>window.__APPALIX_TRACKER__ = { workspaceId, entityType, entityId }</script>
  //   <script src="/tracker.js" async></script>

  var bootstrap = window.__APPALIX_TRACKER__
  if (!bootstrap || !bootstrap.workspaceId || !bootstrap.entityType || !bootstrap.entityId) {
    return // not a tracked page — exit silently
  }

  var TRACK_URL = '/internal/track'

  // ── Session management ─────────────────────────────────────────────────────
  // Session = 30 minutes inactivity.
  // visitorId stored in sessionStorage (not localStorage — no cross-session persistence).
  // GDPR: visitorId is NOT set on page load — only on first form interaction.

  var SESSION_TIMEOUT_MS = 30 * 60 * 1000

  function getSessionId() {
    var key = 'apx_session'
    var stored = sessionStorage.getItem(key)
    if (stored) {
      try {
        var obj = JSON.parse(stored)
        if (Date.now() - obj.ts < SESSION_TIMEOUT_MS) {
          // Refresh timestamp on activity
          obj.ts = Date.now()
          sessionStorage.setItem(key, JSON.stringify(obj))
          return obj.id
        }
      } catch (e) { /* stale/corrupt — fall through to create new */ }
    }
    var id = crypto.randomUUID()
    sessionStorage.setItem(key, JSON.stringify({ id: id, ts: Date.now() }))
    return id
  }

  function getVisitorId() {
    return sessionStorage.getItem('apx_vid') || null
  }

  function setVisitorId(id) {
    if (id) sessionStorage.setItem('apx_vid', id)
  }

  // ── Core send function ─────────────────────────────────────────────────────

  function send(eventType, metadata) {
    var payload = {
      visitorId:   getVisitorId(),
      sessionId:   getSessionId(),
      eventType:   eventType,
      entityType:  bootstrap.entityType,
      entityId:    bootstrap.entityId,
      workspaceId: bootstrap.workspaceId,
      metadata:    metadata || {},
    }

    // Use sendBeacon for unload events; fetch for interactive events
    var body = JSON.stringify(payload)

    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(TRACK_URL, blob)
    } else {
      fetch(TRACK_URL, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        body:        body,
        keepalive:   true,
      })
        .then(function (res) { return res.json() })
        .then(function (data) {
          if (data && data.visitorId) setVisitorId(data.visitorId)
        })
        .catch(function () { /* silent — tracking must never break the page */ })
    }
  }

  // sendBeacon doesn't return response, so for form events use fetch to capture visitorId
  function sendWithResponse(eventType, metadata) {
    var payload = {
      visitorId:   getVisitorId(),
      sessionId:   getSessionId(),
      eventType:   eventType,
      entityType:  bootstrap.entityType,
      entityId:    bootstrap.entityId,
      workspaceId: bootstrap.workspaceId,
      metadata:    metadata || {},
    }

    fetch(TRACK_URL, {
      method:    'POST',
      headers:   { 'Content-Type': 'application/json' },
      body:      JSON.stringify(payload),
      keepalive: true,
    })
      .then(function (res) { return res.json() })
      .then(function (data) {
        if (data && data.visitorId) setVisitorId(data.visitorId)
      })
      .catch(function () { /* silent */ })
  }

  // ── page_view ──────────────────────────────────────────────────────────────

  send('page_view', {
    url:        window.location.href,
    referrer:   document.referrer || '',
    utm_source: new URLSearchParams(window.location.search).get('utm_source') || '',
    utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || '',
  })

  // ── scroll ─────────────────────────────────────────────────────────────────
  // Fire once per 25% depth threshold, not on every scroll event.

  var scrollFired = {}
  var SCROLL_THRESHOLDS = [25, 50, 75, 100]

  window.addEventListener('scroll', function () {
    var scrolled   = window.scrollY + window.innerHeight
    var totalHeight = document.documentElement.scrollHeight
    var pct         = Math.round((scrolled / totalHeight) * 100)

    SCROLL_THRESHOLDS.forEach(function (threshold) {
      if (pct >= threshold && !scrollFired[threshold]) {
        scrollFired[threshold] = true
        send('scroll', { depth_pct: threshold })
      }
    })
  }, { passive: true })

  // ── click ──────────────────────────────────────────────────────────────────
  // Track clicks on links and buttons only.

  document.addEventListener('click', function (e) {
    var target = e.target
    // Walk up to find an anchor or button
    while (target && target !== document.body) {
      if (target.tagName === 'A' || target.tagName === 'BUTTON') {
        send('click', {
          element: target.tagName.toLowerCase(),
          label:   (target.textContent || '').trim().slice(0, 100),
          href:    target.href || '',
        })
        break
      }
      target = target.parentElement
    }
  }, { passive: true })

  // ── form_start / form_submit ───────────────────────────────────────────────
  // form_start fires on first interaction with any form field.
  // form_submit fires on form submit.
  // Both use sendWithResponse to capture the server-minted visitorId.
  // GDPR: visitorId is created server-side on these events only.

  var formStartFired = {}

  document.addEventListener('focusin', function (e) {
    var form = e.target && e.target.closest && e.target.closest('form')
    if (!form) return
    var formId = form.id || form.dataset.formId || bootstrap.entityId
    if (formStartFired[formId]) return
    formStartFired[formId] = true

    sendWithResponse('form_start', { form_id: formId })
  }, { passive: true })

  document.addEventListener('submit', function (e) {
    var form = e.target
    if (!form || form.tagName !== 'FORM') return

    var formId     = form.id || form.dataset.formId || bootstrap.entityId
    var fieldCount = form.querySelectorAll('input, select, textarea').length

    // Attempt to read email/phone from form fields for visitor identity enrichment.
    // Only reads values that are already in the DOM — no keylogging.
    var emailField = form.querySelector('input[type="email"], input[name="email"]')
    var phoneField = form.querySelector('input[type="tel"], input[name="phone"]')

    var meta = {
      form_id:     formId,
      field_count: fieldCount,
    }
    if (emailField && emailField.value) meta.email = emailField.value.trim()
    if (phoneField && phoneField.value) meta.phone = phoneField.value.trim()

    sendWithResponse('form_submit', meta)
  }, { passive: true })

})()
