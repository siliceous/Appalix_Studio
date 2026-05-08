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

      // Pass parent viewport width so the form's mobile detection reflects
      // the actual device, not the (potentially narrow) iframe width.
      var sep = formUrl.indexOf('?') === -1 ? '?' : '&'
      var fullUrl = formUrl + sep + 'vw=' + (window.innerWidth || 1024)

      if (form.type === 'embedded') return mountInline(fullUrl)
      if (form.type === 'flyout')   return mountFlyout(fullUrl, form.behaviour)
      if (form.type === 'popup')    return mountPopup(fullUrl, form.behaviour)
      console.warn(TAG, 'no auto-render for type', form.type, '— share the link instead')
    })
    .catch(function (err) { console.warn(TAG, 'fetch error', err) })

  function mountInline(formUrl) {
    var iframe = document.createElement('iframe')
    iframe.src = formUrl
    iframe.loading = 'lazy'
    iframe.style.cssText = 'width:100%;border:none;border-radius:12px;min-height:600px;display:block'
    iframe.setAttribute('title', 'Form')
    if (parent) parent.insertBefore(iframe, anchor)
    else document.body.appendChild(iframe)
  }

  function mountPopup(formUrl, behaviour) {
    scheduleTrigger(behaviour, function () {
      var overlay = document.createElement('div')
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:16px;animation:appalix-fade-in .2s ease-out'
      var card = document.createElement('div')
      card.style.cssText = 'position:relative;width:100%;max-width:560px;height:80vh;max-height:720px;background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden'
      var iframe = document.createElement('iframe')
      iframe.src = formUrl
      iframe.style.cssText = 'width:100%;height:100%;border:none;display:block'
      iframe.setAttribute('title', 'Form')
      var close = makeCloseButton(function () { document.body.removeChild(overlay) })
      card.appendChild(iframe)
      card.appendChild(close)
      overlay.appendChild(card)
      overlay.addEventListener('click', function (e) { if (e.target === overlay) document.body.removeChild(overlay) })
      injectKeyframes()
      document.body.appendChild(overlay)
    })
  }

  function mountFlyout(formUrl, behaviour) {
    scheduleTrigger(behaviour, function () {
      var card = document.createElement('div')
      card.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483646;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 40px);background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;animation:appalix-slide-up .25s ease-out'
      var iframe = document.createElement('iframe')
      iframe.src = formUrl
      iframe.style.cssText = 'width:100%;height:100%;border:none;display:block'
      iframe.setAttribute('title', 'Form')
      var close = makeCloseButton(function () { document.body.removeChild(card) })
      card.appendChild(iframe)
      card.appendChild(close)
      injectKeyframes()
      document.body.appendChild(card)
    })
  }

  function makeCloseButton(onClick) {
    var btn = document.createElement('button')
    btn.setAttribute('aria-label', 'Close')
    btn.innerHTML = '&times;'
    btn.style.cssText = 'position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;border:none;background:rgba(255,255,255,.95);color:#333;font-size:18px;line-height:1;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.18);z-index:1'
    btn.onclick = onClick
    return btn
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
