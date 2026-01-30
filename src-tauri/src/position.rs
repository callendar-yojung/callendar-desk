/// Window position persistence — save / restore (x, y) across launches.
///
/// The position is stored as a small JSON file in the Tauri app-config directory.
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const POSITION_FILE: &str = "window_position.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowPosition {
    pub x: f64,
    pub y: f64,
}

fn position_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join(POSITION_FILE))
}

/// Try to read the persisted position from disk.
pub fn load_position(app: &tauri::AppHandle) -> Option<WindowPosition> {
    let path = position_path(app)?;
    let data = fs::read_to_string(&path).ok()?;
    serde_json::from_str(&data).ok()
}

/// Persist the current position to disk.
pub fn save_position(app: &tauri::AppHandle, pos: &WindowPosition) {
    if let Some(path) = position_path(app) {
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string_pretty(pos) {
            let _ = fs::write(&path, json);
        }
    }
}

// ── Tauri commands exposed to the frontend ──────────────────────────────

#[tauri::command]
pub fn save_window_position(app: tauri::AppHandle, x: f64, y: f64) {
    let pos = WindowPosition { x, y };
    save_position(&app, &pos);
    log::info!("position: saved ({}, {})", x, y);
}

/// Called from setup to restore position on the main window.
pub fn restore_position(app: &tauri::AppHandle) {
    if let Some(pos) = load_position(app) {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.set_position(tauri::Position::Physical(
                tauri::PhysicalPosition {
                    x: pos.x as i32,
                    y: pos.y as i32,
                },
            ));
            log::info!("position: restored to ({}, {})", pos.x, pos.y);
        }
    }
}