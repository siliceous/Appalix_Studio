# Appalix Forms — Shopify install

Shopify doesn't accept third-party plugin uploads the way WordPress does — every store installs custom code through the **theme editor**. Two options below: site-wide popups/fly-outs (recommended for most), or per-page inline forms via a theme app block.

## Option A — Site-wide popup / fly-out (5 minutes)

1. In your Shopify admin, go to **Online Store → Themes**.
2. On your live theme, click **⋯ → Edit code**.
3. In the left file list, open **`layout/theme.liquid`**.
4. Find the closing `</body>` tag near the bottom and paste this **just before** it:

   ```html
   <!-- Appalix Forms -->
   <script src="https://app.appalix.ai/embed.js" data-form-key="YOUR_EMBED_KEY" async></script>
   ```

5. Replace `YOUR_EMBED_KEY` with the key from the form's **Embed** tab in your Appalix dashboard.
6. Click **Save**.

That's it — the form will load on every page using the trigger you set under **Behaviour** in the dashboard (immediate, delay, scroll, exit-intent, click).

> If you're self-hosting Appalix, replace `https://app.appalix.ai` with your own dashboard origin.

## Option B — Inline embed on a specific page

Use this for **embedded** form types you want to render at a specific spot on a page.

1. **Online Store → Themes → ⋯ → Edit code**.
2. In **Snippets**, click **Add a new snippet**, name it `appalix-form`.
3. Paste this into the new file:

   ```liquid
   {% comment %}
     Usage: {% render 'appalix-form', key: 'YOUR_EMBED_KEY' %}
   {% endcomment %}
   {% if key %}
     <script src="https://app.appalix.ai/embed.js" data-form-key="{{ key | escape }}" async></script>
   {% endif %}
   ```

4. Save.
5. In any template (e.g. `templates/page.liquid` or a section file), drop:

   ```liquid
   {% render 'appalix-form', key: 'YOUR_EMBED_KEY' %}
   ```

   wherever you want the form to render.

## Option C — Theme app block (Online Store 2.0 themes only)

If your theme supports app blocks, you can let merchants drop the form into any section via the visual theme editor. That requires publishing a Shopify App; reach out to support@appalix.ai if you'd like that flow rather than copy-pasting code.

## Multiple forms?

Yes — paste as many `<script>` tags as you want. Each one loads its own form on the same page. Inline forms render at the script's location; popups and fly-outs honour their own trigger settings independently.

```html
<script src="https://app.appalix.ai/embed.js" data-form-key="KEY_FOR_NEWSLETTER" async></script>
<script src="https://app.appalix.ai/embed.js" data-form-key="KEY_FOR_EXIT_INTENT" async></script>
```

## Notes

- Behaviour and theme changes you make in the Appalix dashboard propagate automatically on the next page load (with up to 60 seconds of HTTP caching).
- The script is `async` and lazy — it doesn't block your page load.
- One snippet, one tag — covers inline, popup, and fly-out form types.
