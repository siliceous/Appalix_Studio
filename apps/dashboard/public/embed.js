/* Appalix Forms — Universal Embed
 * One <script src="…/embed.js" data-form-key="…"> tag handles every form type:
 *   embedded     → injects an inline iframe at the script location
 *   popup        → loads a modal iframe; show timing follows form.behaviour.display.trigger
 *   flyout       → bottom-right corner card; same trigger logic
 *   landing_page → no auto-render; use the shareable link instead
 */
(function () {
  'use strict'
  var TAG = '[Appalix Forms]'

  var script = document.currentScript
  if (!script) {
    var all = document.getElementsByTagName('script')
    for (var i = all.length - 1; i >= 0; i--) {
      if ((all[i].src || '').indexOf('embed.js') !== -1) { script = all[i]; break }
    }
  }
  if (!script) { console.warn(TAG, 'script tag not found'); return }

  // Snapshot parent before any async work — async scripts may move/detach in some bundlers
  var anchor = script
  var parent = script.parentNode

  var key = script.getAttribute('data-form-key')
  if (!key) { console.warn(TAG, 'missing data-form-key on <script>'); return }

  var origin
  try { origin = new URL(script.src).origin } catch (_) {
    console.warn(TAG, 'cannot parse script src', script.src); return
  }

  // Prevent duplicate boot for the same key on the same page
  if (window.__APPALIX_FORM_KEYS__ && window.__APPALIX_FORM_KEYS__[key]) return
  window.__APPALIX_FORM_KEYS__ = window.__APPALIX_FORM_KEYS__ || {}
  window.__APPALIX_FORM_KEYS__[key] = true

  fetch(origin + '/api/embed/' + encodeURIComponent(key), { credentials: 'omit' })
    .then(function (r) {
      if (!r.ok) {
        console.warn(TAG, 'fetch failed', r.status, '— is the form published?')
        return null
      }
      return r.json()
    })
    .then(function (form) {
      if (!form || !form.slug) return
      var formUrl = origin + '/f/' + form.slug
      console.log(TAG, 'rendering', form.type, '·', form.name)

      // Pass parent viewport width (so the form's mobile detection reflects
      // the actual device, not the iframe) and the embed type (so the form
      // can render its own corner close button for popup/flyout).
      function withParams(url, embed) {
        var sep = url.indexOf('?') === -1 ? '?' : '&'
        return url + sep + 'vw=' + (window.innerWidth || 1024) + '&embed=' + embed
      }

      if (form.type === 'embedded') return mountInline(withParams(formUrl, 'inline'))
      if (form.type === 'flyout')   return mountFlyout(withParams(formUrl, 'flyout'), form.behaviour, form.modalWidth)
      if (form.type === 'popup')    return mountPopup(withParams(formUrl, 'popup'), form.behaviour, form.modalWidth)
      console.warn(TAG, 'no auto-render for type', form.type, '— share the link instead')
    })
    .catch(function (err) { console.warn(TAG, 'fetch error', err) })

  // The form page already renders its own card (background, shadow, radius from
  // theme) so the iframe and any wrappers should be transparent — otherwise we
  // get a white box around the themed card.
  var IFRAME_STYLE = 'width:100%;height:100%;border:none;display:block;background:transparent;color-scheme:light'

  function mountInline(formUrl) {
    var iframe = document.createElement('iframe')
    iframe.src = formUrl
    iframe.loading = 'lazy'
    iframe.allowTransparency = 'true'
    iframe.style.cssText = 'width:100%;border:none;min-height:600px;display:block;background:transparent;color-scheme:light'
    iframe.setAttribute('title', 'Form')
    if (parent) parent.insertBefore(iframe, anchor)
    else document.body.appendChild(iframe)
  }

  // Listen once for close requests posted by the form iframe — every
  // mount registers itself in this map keyed by iframe contentWindow.
  var dismissers = []
  function registerDismisser(iframe, close) {
    dismissers.push({ win: iframe.contentWindow, close: close })
  }
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'appalix-close') return
    for (var i = 0; i < dismissers.length; i++) {
      if (dismissers[i].win === e.source) { dismissers[i].close(); break }
    }
  })

  function mountPopup(formUrl, behaviour, modalWidth) {
    scheduleTrigger(behaviour, function () {
      var overlay = document.createElement('div')
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:16px;animation:appalix-fade-in .2s ease-out'
      // Wrapper is transparent — form card paints itself. Width follows the
      // form's own modal.width so 'Full' really does mean full viewport.
      var widthCss = modalWidth === '100%'
        ? 'width:calc(100vw - 32px);max-width:none'
        : 'width:100%;max-width:' + (modalWidth || '560px')
      var card = document.createElement('div')
      card.style.cssText = 'position:relative;' + widthCss + ';max-height:90vh;background:transparent;overflow:visible'
      var iframe = document.createElement('iframe')
      iframe.src = formUrl
      iframe.allowTransparency = 'true'
      iframe.style.cssText = IFRAME_STYLE + ';height:auto;min-height:400px;max-height:90vh'
      iframe.setAttribute('title', 'Form')
      function close() {
        if (overlay.parentNode) document.body.removeChild(overlay)
        document.removeEventListener('keydown', onKey)
      }
      function onKey(e) { if (e.key === 'Escape') close() }
      card.appendChild(iframe)
      overlay.appendChild(card)
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close() })
      document.addEventListener('keydown', onKey)
      injectKeyframes()
      document.body.appendChild(overlay)
      registerDismisser(iframe, close)
    })
  }

  function mountFlyout(formUrl, behaviour, modalWidth) {
    scheduleTrigger(behaviour, function () {
      var widthCss = modalWidth === '100%'
        ? 'width:calc(100vw - 40px);max-width:none'
        : 'width:' + (modalWidth || '380px') + ';max-width:calc(100vw - 40px)'
      var card = document.createElement('div')
      card.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483646;' + widthCss + ';max-height:calc(100vh - 40px);background:transparent;overflow:visible;animation:appalix-slide-up .25s ease-out'
      var iframe = document.createElement('iframe')
      iframe.src = formUrl
      iframe.allowTransparency = 'true'
      iframe.style.cssText = IFRAME_STYLE + ';height:auto;min-height:400px;max-height:calc(100vh - 40px)'
      iframe.setAttribute('title', 'Form')
      function close() {
        if (card.parentNode) document.body.removeChild(card)
        document.removeEventListener('keydown', onKey)
      }
      function onKey(e) { if (e.key === 'Escape') close() }
      card.appendChild(iframe)
      document.addEventListener('keydown', onKey)
      injectKeyframes()
      document.body.appendChild(card)
      registerDismisser(iframe, close)
    })
  }

  function scheduleTrigger(behaviour, fire) {
    var d = (behaviour && behaviour.display) || {}
    var trigger = d.trigger || 'immediate'
    var fired = false
    var run = function () { if (fired) return; fired = true; fire() }

    if (trigger === 'immediate')      return run()
    if (trigger === 'delay')          return setTimeout(run, Math.max(0, (d.delaySeconds || 3) * 1000))
    if (trigger === 'scroll') {
      var pct = Math.max(0, Math.min(100, d.scrollPercentage || 50))
      var onScroll = function () {
        var max = document.documentElement.scrollHeight - window.innerHeight
        if (max <= 0) return run()
        if ((window.scrollY / max) * 100 >= pct) {
          window.removeEventListener('scroll', onScroll)
          run()
        }
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      return
    }
    if (trigger === 'exit_intent') {
      var onLeave = function (e) { if (e.clientY <= 0) { document.removeEventListener('mouseleave', onLeave); run() } }
      document.addEventListener('mouseleave', onLeave)
      return
    }
    if (trigger === 'click') {
      var sel = d.selector
      if (!sel) return run()
      document.addEventListener('click', function (e) {
        var target = e.target.closest && e.target.closest(sel)
        if (target) { e.preventDefault(); run() }
      })
      return
    }
    run()
  }

  function injectKeyframes() {
    if (document.getElementById('appalix-embed-styles')) return
    var s = document.createElement('style')
    s.id = 'appalix-embed-styles'
    s.textContent = '@keyframes appalix-fade-in{from{opacity:0}to{opacity:1}}@keyframes appalix-slide-up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}'
    document.head.appendChild(s)
  }
})()
