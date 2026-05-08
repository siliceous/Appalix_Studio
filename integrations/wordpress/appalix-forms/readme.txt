=== Appalix Forms ===
Contributors: appalix
Tags: forms, popup, lead capture, optin, email capture
Requires at least: 5.0
Tested up to: 6.6
Requires PHP: 7.2
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Embed Appalix forms — popups, fly-outs, and inline — anywhere on your WordPress site.

== Description ==

Adds a one-line embed for forms built in your Appalix dashboard. Works with every form type:

* **Inline / embedded** — drop the shortcode where you want the form to appear
* **Popup** — site-wide modal that fires on the trigger you set (immediate / delay / scroll / exit-intent / click)
* **Fly-out** — bottom-right corner card with the same trigger options
* **Landing page** — share the public URL directly

The plugin adds **one** dependency: a single `<script>` tag that pulls the latest config from your dashboard each visit, so behaviour changes propagate automatically — no need to re-paste anything.

== Installation ==

1. Upload the plugin zip via **Plugins → Add New → Upload Plugin**, or extract into `wp-content/plugins/appalix-forms`.
2. Activate it.
3. Go to **Settings → Appalix Forms** and:
   * Set the **Dashboard URL** if you self-host (otherwise leave the default).
   * Optional: paste a form's embed key into **Site-wide popup / fly-out form** to load it on every page.

== Usage ==

= Inline embed via shortcode =

In any post, page, widget, or block, paste:

`[appalix_form key="YOUR_EMBED_KEY"]`

The embed key is shown under the form's **Embed** tab in your dashboard.

= Site-wide popup / fly-out =

Set the embed key in **Settings → Appalix Forms → Site-wide popup / fly-out form**. The script loads in the footer of every page; the trigger you set under the form's Behaviour tab determines when it shows.

== Frequently Asked Questions ==

= Do I need to re-embed when I change form settings? =

No. The script fetches the latest configuration each visit, so behaviour and theme changes propagate automatically (cached for 60 seconds).

= Why is nothing appearing? =

* Make sure the form is **published** in the Appalix dashboard.
* Open DevTools → Console — script messages prefixed `[Appalix Forms]` will tell you what's happening.

== Changelog ==

= 1.0.0 =
* Initial release. Shortcode + site-wide injection.
