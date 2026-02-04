mod position;

#[cfg(target_os = "windows")]
mod desktop_attach;
#[cfg(target_os = "windows")]
mod autostart;

use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // ── Tauri commands ──────────────────────────────────────────────
    #[cfg(target_os = "windows")]
    {
        builder = builder.invoke_handler(tauri::generate_handler![
            position::save_window_position,
            autostart::set_autostart,
            autostart::get_autostart,
        ]);
    }

    #[cfg(not(target_os = "windows"))]
    {
        builder = builder.invoke_handler(tauri::generate_handler![
            position::save_window_position,
        ]);
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            // Logging
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Debug)
                    .build(),
            )?;

            let handle = app.handle().clone();

            // ── Deep Link handler ──────────────────────────────────────
            app.deep_link().on_open_url(move |event| {
                if let Some(url) = event.urls().first() {
                    let url_str = url.to_string();
                    println!("🔗 Deep link received: {}", url_str);
                    let _ = handle.emit("tauri://deep-link", url_str);
                }
            });

            // ── Restore window position ────────────────────────────────
            position::restore_position(app.handle());

            // ── Windows-only: desktop attach + autostart ───────────────
            #[cfg(target_os = "windows")]
            {
                if let Some(window) = app.handle().get_webview_window("main") {
                    if let Ok(hwnd) = window.hwnd() {
                        desktop_attach::attach_to_desktop(hwnd.0 as isize);
                    }
                }
                autostart::enable_autostart();
            }

            // ── Save position on window move ───────────────────────────
            if let Some(window) = app.handle().get_webview_window("main") {
                let app_handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Moved(pos) = event {
                        let wp = position::WindowPosition {
                            x: pos.x as f64,
                            y: pos.y as f64,
                        };
                        position::save_position(&app_handle, &wp);
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
