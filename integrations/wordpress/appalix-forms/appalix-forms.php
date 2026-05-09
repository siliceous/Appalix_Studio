<?php
/**
 * Plugin Name:       Appalix Forms
 * Plugin URI:        https://app.appalix.ai
 * Description:       Embed Appalix forms — popups, fly-outs and inline — anywhere on your WordPress site.
 * Version:           1.1.0
 * Requires at least: 5.0
 * Requires PHP:      7.2
 * Author:            Appalix
 * License:           GPL-2.0-or-later
 * Text Domain:       appalix-forms
 */

if (!defined('ABSPATH')) {
    exit;
}

define('APPALIX_FORMS_DEFAULT_ORIGIN', 'https://app.appalix.ai');

/* ------------------------------------------------------------------------- *
 *  Settings page
 * ------------------------------------------------------------------------- */

add_action('admin_menu', function () {
    add_options_page(
        __('Appalix Forms', 'appalix-forms'),
        __('Appalix Forms', 'appalix-forms'),
        'manage_options',
        'appalix-forms',
        'appalix_forms_render_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('appalix_forms', 'appalix_forms_origin', [
        'type'              => 'string',
        'sanitize_callback' => function ($v) { return esc_url_raw(rtrim((string) $v, '/')); },
        'default'           => APPALIX_FORMS_DEFAULT_ORIGIN,
    ]);
    register_setting('appalix_forms', 'appalix_forms_site_key', [
        'type'              => 'string',
        'sanitize_callback' => 'appalix_forms_sanitize_keys',
        'default'           => '',
    ]);
}

/**
 * Accept one key per line (or comma-separated). Strip whitespace and bad chars,
 * dedupe, and store back as newline-separated.
 */
function appalix_forms_sanitize_keys($value) {
    if (!is_string($value)) {
        return '';
    }
    $tokens = preg_split('/[\s,]+/', $value);
    $clean  = [];
    foreach ($tokens as $tok) {
        $tok = sanitize_text_field($tok);
        if ($tok && !in_array($tok, $clean, true)) {
            $clean[] = $tok;
        }
    }
    return implode("\n", $clean);
}

/**
 * Return the saved site-wide form keys as an array (filtered, deduped).
 */
function appalix_forms_get_site_keys() {
    $raw = (string) get_option('appalix_forms_site_key', '');
    $tokens = preg_split('/[\s,]+/', $raw);
    $out = [];
    foreach ($tokens as $tok) {
        $tok = trim($tok);
        if ($tok) $out[] = $tok;
    }
    return array_values(array_unique($out));
}

function appalix_forms_render_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    $origin    = get_option('appalix_forms_origin', APPALIX_FORMS_DEFAULT_ORIGIN);
    $site_keys = appalix_forms_get_site_keys();
    $site_keys_text = implode("\n", $site_keys);
    ?>
    <div class="wrap">
        <h1><?php echo esc_html__('Appalix Forms', 'appalix-forms'); ?></h1>
        <form method="post" action="options.php">
            <?php settings_fields('appalix_forms'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="appalix_forms_origin"><?php esc_html_e('Dashboard URL', 'appalix-forms'); ?></label></th>
                    <td>
                        <input id="appalix_forms_origin" name="appalix_forms_origin" type="url" value="<?php echo esc_attr($origin); ?>" class="regular-text" placeholder="https://app.appalix.ai" />
                        <p class="description"><?php esc_html_e('Where your Appalix dashboard is hosted. Default points to the public app.', 'appalix-forms'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="appalix_forms_site_key"><?php esc_html_e('Site-wide popups / fly-outs', 'appalix-forms'); ?></label></th>
                    <td>
                        <textarea id="appalix_forms_site_key" name="appalix_forms_site_key" rows="4" class="large-text code" placeholder="<?php esc_attr_e('embed_key_form_a&#10;embed_key_form_b', 'appalix-forms'); ?>"><?php echo esc_textarea($site_keys_text); ?></textarea>
                        <p class="description">
                            <?php esc_html_e('Optional — one embed key per line (or comma-separated). Each form loads on every page using its own Behaviour trigger. Leave blank to only render forms via shortcode.', 'appalix-forms'); ?>
                        </p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>

        <hr />
        <h2><?php esc_html_e('Embed a form in a page or post', 'appalix-forms'); ?></h2>
        <p><?php esc_html_e('Use this shortcode anywhere — replace the key with the embed key shown in the Embed tab of your form:', 'appalix-forms'); ?></p>
        <p><code>[appalix_form key="YOUR_EMBED_KEY"]</code></p>
        <p class="description">
            <?php esc_html_e('For inline / embedded forms, the form renders where the shortcode is placed. For popup / fly-out forms, the trigger from the form\'s Behaviour settings applies.', 'appalix-forms'); ?>
        </p>
    </div>
    <?php
}

/* ------------------------------------------------------------------------- *
 *  Shortcode  [appalix_form key="..."]
 * ------------------------------------------------------------------------- */

add_shortcode('appalix_form', function ($atts) {
    $atts = shortcode_atts(['key' => ''], $atts, 'appalix_form');
    $key  = sanitize_text_field($atts['key']);
    if (!$key) {
        return '';
    }
    $origin = esc_url(get_option('appalix_forms_origin', APPALIX_FORMS_DEFAULT_ORIGIN));
    return sprintf(
        '<script src="%s/embed.js" data-form-key="%s" async></script>',
        $origin,
        esc_attr($key)
    );
});

/* ------------------------------------------------------------------------- *
 *  Site-wide injection (popup / fly-out)
 * ------------------------------------------------------------------------- */

add_action('wp_footer', function () {
    $keys = appalix_forms_get_site_keys();
    if (empty($keys)) {
        return;
    }
    $origin = esc_url(get_option('appalix_forms_origin', APPALIX_FORMS_DEFAULT_ORIGIN));
    foreach ($keys as $key) {
        printf(
            '<script src="%s/embed.js" data-form-key="%s" async></script>' . "\n",
            $origin,
            esc_attr($key)
        );
    }
});

/* ------------------------------------------------------------------------- *
 *  Plugin row links
 * ------------------------------------------------------------------------- */

add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
    $settings = '<a href="' . esc_url(admin_url('options-general.php?page=appalix-forms')) . '">' . esc_html__('Settings', 'appalix-forms') . '</a>';
    array_unshift($links, $settings);
    return $links;
});
