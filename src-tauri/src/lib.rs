mod position;
mod deep_link;

#[cfg(target_os = "windows")]
mod desktop_attach;
#[cfg(target_os = "windows")]
mod autostart;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // ── Register Tauri commands ────────────────────────────────────────
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
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // Logging (debug only)
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let handle = app.handle().clone();

            // ── Setup OAuth deep link handler ──────────────────────────
            deep_link::setup_deep_link(app)?;

            // ── Restore saved window position ──────────────────────────
            position::restore_position(&handle);

            // ── Windows-only: desktop attachment + auto-start ──────────
            #[cfg(target_os = "windows")]
            {
                // Attach to desktop layer (behind icons, no taskbar/alt-tab)
                if let Some(window) = handle.get_webview_window("main") {
                    if let Ok(hwnd) = window.hwnd() {
                        desktop_attach::attach_to_desktop(hwnd.0 as isize);
                    }
                }

                // Enable auto-start on first run (idempotent)
                autostart::enable_autostart();
            }

            // ── Save position when window moves ────────────────────────
            if let Some(window) = handle.get_webview_window("main") {
                let app_handle = handle.clone();
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
