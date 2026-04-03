<?php
/**
 * Plugin Name:  Appalix Forms
 * Plugin URI:   https://appalix.ai
 * Description:  Sends form submissions from Contact Form 7, Elementor Forms, WPForms, Gravity Forms, Ninja Forms, and Formidable Forms to your Appalix workspace automatically.
 * Version:      1.0.0
 * Author:       Appalix
 * Author URI:   https://appalix.ai
 * License:      GPL-2.0+
 * Text Domain:  appalix-forms
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'APPALIX_FORMS_VERSION', '1.0.0' );
define( 'APPALIX_FORMS_OPTION',  'appalix_forms_settings' );

// ── Settings ──────────────────────────────────────────────────────────────────

function appalix_forms_get_settings() {
    return get_option( APPALIX_FORMS_OPTION, [] );
}

function appalix_forms_get_webhook_url() {
    $s   = appalix_forms_get_settings();
    $key = trim( $s['connection_key'] ?? '' );
    if ( ! $key ) return '';

    // Connection key is either a full URL or just the workspace ID
    if ( str_starts_with( $key, 'http' ) ) return $key;
    return 'https://app.appalix.ai/api/webhooks/wordpress-forms/' . $key;
}

// ── Admin settings page ───────────────────────────────────────────────────────

add_action( 'admin_menu', function () {
    add_options_page(
        'Appalix Forms',
        'Appalix Forms',
        'manage_options',
        'appalix-forms',
        'appalix_forms_settings_page'
    );
} );

add_action( 'admin_init', function () {
    register_setting( 'appalix_forms', APPALIX_FORMS_OPTION, [
        'sanitize_callback' => function ( $input ) {
            return [
                'connection_key' => sanitize_text_field( $input['connection_key'] ?? '' ),
            ];
        },
    ] );
} );

function appalix_forms_settings_page() {
    $s       = appalix_forms_get_settings();
    $key     = $s['connection_key'] ?? '';
    $hookUrl = appalix_forms_get_webhook_url();
    $active  = (bool) $hookUrl;

    // Test connection if requested
    $testMsg = '';
    if ( isset( $_POST['appalix_test'] ) && $active ) {
        check_admin_referer( 'appalix_forms_test' );
        $result = appalix_forms_send( [
            'name'    => 'Test Lead',
            'email'   => 'test@appalix.ai',
            'message' => 'Test submission from Appalix Forms plugin',
        ], 'Connection Test' );
        $testMsg = $result ? '<p class="notice notice-success" style="padding:8px 12px">✅ Connected! Test submission received in Appalix.</p>'
                           : '<p class="notice notice-error"   style="padding:8px 12px">❌ Could not reach Appalix. Check your connection key.</p>';
    }
    ?>
    <div class="wrap">
        <h1>Appalix Forms</h1>
        <p>Sends every form submission on this site to your Appalix workspace for AI triage and lead management.</p>

        <?php if ( $testMsg ) echo $testMsg; ?>

        <form method="post" action="options.php">
            <?php settings_fields( 'appalix_forms' ); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="connection_key">Connection Key</label></th>
                    <td>
                        <input
                            type="text"
                            id="connection_key"
                            name="<?php echo APPALIX_FORMS_OPTION; ?>[connection_key]"
                            value="<?php echo esc_attr( $key ); ?>"
                            class="regular-text"
                            placeholder="Paste your connection key from Appalix"
                        />
                        <p class="description">
                            Find this in <strong>Appalix → Integrations → Form Lead Sources → WordPress Forms → Connect</strong>.
                        </p>
                    </td>
                </tr>
            </table>
            <?php submit_button( 'Save' ); ?>
        </form>

        <?php if ( $active ) : ?>
        <hr/>
        <h2>Test connection</h2>
        <p>Sends a sample submission to verify Appalix is receiving data.</p>
        <form method="post">
            <?php wp_nonce_field( 'appalix_forms_test' ); ?>
            <input type="hidden" name="appalix_test" value="1" />
            <?php submit_button( 'Send test submission', 'secondary' ); ?>
        </form>

        <hr/>
        <h2>Detected form plugins</h2>
        <ul style="list-style:disc;margin-left:20px">
            <?php
            $plugins = [
                'contact-form-7/wp-contact-form-7.php'          => 'Contact Form 7',
                'elementor/elementor.php'                        => 'Elementor',
                'elementor-pro/elementor-pro.php'                => 'Elementor Pro',
                'wpforms-lite/wpforms.php'                       => 'WPForms Lite',
                'wpforms/wpforms.php'                            => 'WPForms',
                'gravityforms/gravityforms.php'                  => 'Gravity Forms',
                'ninja-forms/ninja-forms.php'                    => 'Ninja Forms',
                'formidable/formidable.php'                      => 'Formidable Forms',
            ];
            $found = 0;
            foreach ( $plugins as $file => $name ) {
                if ( is_plugin_active( $file ) ) {
                    echo '<li>✅ ' . esc_html( $name ) . ' — hooked</li>';
                    $found++;
                }
            }
            if ( ! $found ) echo '<li>No supported form plugins detected. Install any of the plugins above and Appalix will hook in automatically.</li>';
            ?>
        </ul>
        <?php endif; ?>
    </div>
    <?php
}

// ── Core sender ───────────────────────────────────────────────────────────────

/**
 * Send a normalised field map to Appalix.
 *
 * @param array  $fields     Associative array of field name → value.
 * @param string $form_title Human-readable form name.
 * @return bool  True on HTTP 2xx, false otherwise.
 */
function appalix_forms_send( array $fields, string $form_title = '' ): bool {
    $url = appalix_forms_get_webhook_url();
    if ( ! $url ) return false;

    $payload = array_merge( $fields, [ 'form_title' => $form_title ?: 'WordPress Form' ] );

    $response = wp_remote_post( $url, [
        'headers'     => [ 'Content-Type' => 'application/json' ],
        'body'        => wp_json_encode( $payload ),
        'timeout'     => 10,
        'blocking'    => false,  // fire-and-forget — don't slow down form submission
        'data_format' => 'body',
    ] );

    if ( is_wp_error( $response ) ) {
        // For test submissions (blocking), return false; non-blocking always returns true
        return false;
    }
    return true;
}

// ── Contact Form 7 ────────────────────────────────────────────────────────────
// Use wpcf7_submit (fires on every valid submission) instead of wpcf7_mail_sent
// (which only fires when CF7 successfully sends its confirmation email — fails
// silently on sites with broken SMTP/mail config).

add_action( 'wpcf7_submit', function ( $contact_form, $result ) {
    // Only proceed on valid submissions (not spam, not validation failures)
    if ( empty( $result['status'] ) || ! in_array( $result['status'], [ 'mail_sent', 'mail_failed', 'demo_mode' ], true ) ) return;

    $submission = WPCF7_Submission::get_instance();
    if ( ! $submission ) return;

    $data   = $submission->get_posted_data();
    $fields = [];
    foreach ( $data as $key => $value ) {
        if ( str_starts_with( $key, '_' ) ) continue;  // skip internal CF7 fields
        $fields[ $key ] = is_array( $value ) ? implode( ', ', $value ) : (string) $value;
    }
    appalix_forms_send( $fields, $contact_form->title() );
}, 10, 2 );

// ── Elementor Forms ───────────────────────────────────────────────────────────

add_action( 'elementor_pro/forms/new_record', function ( $record, $handler ) {
    $raw    = $record->get( 'fields' );
    $fields = [];
    foreach ( $raw as $field ) {
        $fields[ $field['title'] ?: $field['id'] ] = (string) $field['value'];
    }
    $form_name = $record->get_form_settings( 'form_name' ) ?: 'Elementor Form';
    appalix_forms_send( $fields, $form_name );
}, 10, 2 );

// ── WPForms ───────────────────────────────────────────────────────────────────

add_action( 'wpforms_process_complete', function ( $fields, $entry, $form_data, $entry_id ) {
    $flat = [];
    foreach ( $fields as $field ) {
        $label         = sanitize_text_field( $field['name'] ?? $field['id'] ?? 'field' );
        $flat[ $label ] = (string) ( $field['value'] ?? $field['value_raw'] ?? '' );
    }
    appalix_forms_send( $flat, $form_data['settings']['form_title'] ?? 'WPForms' );
}, 10, 4 );

// ── Gravity Forms ─────────────────────────────────────────────────────────────

add_action( 'gform_after_submission', function ( $entry, $form ) {
    $fields = [];
    foreach ( $form['fields'] as $field ) {
        $value = rgar( $entry, (string) $field->id );
        if ( $value === '' || $value === null ) continue;
        $fields[ $field->label ] = is_array( $value ) ? implode( ', ', $value ) : (string) $value;
    }
    appalix_forms_send( $fields, $form['title'] ?? 'Gravity Forms' );
}, 10, 2 );

// ── Ninja Forms ───────────────────────────────────────────────────────────────

add_action( 'ninja_forms_after_submission', function ( $form_data ) {
    $fields = [];
    foreach ( $form_data['fields'] as $field ) {
        $type = $field['type'] ?? '';
        if ( in_array( $type, [ 'submit', 'hr', 'html', 'recaptcha' ], true ) ) continue;
        $label          = $field['settings']['label'] ?? $field['key'] ?? 'field';
        $fields[ $label ] = (string) ( $field['value'] ?? '' );
    }
    $title = $form_data['settings']['title'] ?? 'Ninja Forms';
    appalix_forms_send( $fields, $title );
} );

// ── Formidable Forms ──────────────────────────────────────────────────────────

add_action( 'frm_after_create_entry', function ( $entry_id, $form_id ) {
    if ( ! class_exists( 'FrmEntry' ) || ! class_exists( 'FrmForm' ) ) return;

    $entry  = FrmEntry::getOne( $entry_id, true );
    $form   = FrmForm::getOne( $form_id );
    if ( ! $entry || ! $form ) return;

    $fields = [];
    foreach ( $entry->metas as $field_id => $value ) {
        $field = FrmField::getOne( $field_id );
        if ( ! $field ) continue;
        $label          = $field->name ?: "field_{$field_id}";
        $fields[ $label ] = is_array( $value ) ? implode( ', ', $value ) : (string) $value;
    }
    appalix_forms_send( $fields, $form->name ?? 'Formidable Forms' );
}, 10, 2 );
